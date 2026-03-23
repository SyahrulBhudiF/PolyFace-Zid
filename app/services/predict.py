"""
OCEAN Personality Prediction Service

Hybrid TensorFlow / PyTorch inference engine for OCEAN personality traits.

Model types (selected at runtime via ``model_key``):
    checkpoint      TensorFlow checkpoint (.t5) loaded into a Keras model.
    h5              TensorFlow H5 / Keras saved model (.h5 / .keras).
    pytorch         PyTorch model (.pth) with PolyFace (256-dim) feature extraction.
    pytorch_dummy   PyTorch model trained with Linear(37632→5) dummy extractor (1124_171024).
    auto            Tries checkpoint first, then H5 fallback.
"""

from __future__ import annotations

import logging
import os
import re
from collections import OrderedDict
from typing import Any, Optional, Union

import numpy as np
import tensorflow as tf
import torch
from keras import layers, models
from tensorflow import keras

from .polyfacemodels2 import create_model_polyface3, wrap_polyface_tf

__all__ = [
    "OCEAN_TRAITS",
    "MODEL_REGISTRY",
    "predict_ocean",
    "get_model",
    "get_available_models",
    "get_model_display_name",
    "get_feature_extractor",
    "save_feature_extractor",
    "clear_model_cache",
    "preprocess",
]

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

BASE_DIR = os.path.dirname(os.path.realpath(__file__))

OCEAN_TRAITS: tuple[str, ...] = (
    "Openness",
    "Conscientiousness",
    "Extraversion",
    "Agreeableness",
    "Neuroticism",
)

NUM_FRAMES = 10
FRAME_SIZE = 112
NUM_CHANNELS = 3
POLYFACE_FEATURE_DIM = 256
NUM_TRAITS = len(OCEAN_TRAITS)

# Fixed seed so PolyFace backbone weights are identical between training and
# inference.  Without this, every ``create_model_polyface3()`` call produces a
# different random backbone and trained LSTM/Dense weights become useless.
POLYFACE_SEED = 42
BACKBONE_WEIGHTS_FILE = os.path.join(BASE_DIR, "models", "polyface_backbone.pth")

MODEL_REGISTRY: dict[str, dict[str, str]] = {
    "auto": {
        "type": "auto",
        "display_name": "Auto (Checkpoint → H5)",
    },
    "ckpt_1127_145313": {
        "type": "checkpoint",
        "dir": "1127_145313",
        "display_name": "Checkpoint - Adagrad (ALL)",
    },
    "ckpt_1208_153234": {
        "type": "checkpoint",
        "dir": "1208_153234",
        "display_name": "Checkpoint - SGD (ALL)",
    },
    "ckpt_1214_094941": {
        "type": "checkpoint",
        "dir": "1214_094941",
        "display_name": "Checkpoint - Adagrad (10k)",
    },
    "ckpt_1216_124129": {
        "type": "checkpoint",
        "dir": "1216_124129",
        "display_name": "Checkpoint - 1216_124129",
    },
    "ckpt_1226_093721": {
        "type": "checkpoint",
        "dir": "1226_093721",
        "display_name": "Checkpoint - 1226_093721",
    },
    "ckpt_1228_011726": {
        "type": "checkpoint",
        "dir": "1228_011726",
        "display_name": "Checkpoint - RMSprop (ALL)",
    },
    "ckpt_1228_163427": {
        "type": "checkpoint",
        "dir": "1228_163427",
        "display_name": "Checkpoint - Adam (ALL)",
    },
    "ckpt_1229_024515": {
        "type": "checkpoint",
        "dir": "1229_024515",
        "display_name": "Checkpoint - 1229_024515",
    },
    "ckpt_1229_161540": {
        "type": "checkpoint",
        "dir": "1229_161540",
        "display_name": "Checkpoint - NoOptimizer (10k)",
    },
    "ckpt_1230_222717": {
        "type": "checkpoint",
        "dir": "1230_222717",
        "display_name": "Checkpoint - NoOptimizer (ALL)",
    },
    "ckpt_1124_171024": {
        "type": "pytorch_dummy",
        "dir": "1124_171024",
        "display_name": "PyTorch - Adagrad (10k)",
    },
    "ckpt_final": {
        "type": "pytorch_dummy",
        "dir": "final",
        "display_name": "PyTorch - Final Model",
    },
    "ckpt_final_mobile": {
        "type": "pytorch_mobile",
        "dir": "final_mobile",
        "display_name": "PyTorch - Final (MobileNet backbone)",
    },
    "ckpt_final_2": {
        "type": "pytorch_mobile_v2",
        "dir": "final_2",
        "display_name": "PyTorch - Final v2 (MobileNet)",
    },
}
DEFAULT_MODEL_KEY = "auto"

# ---------------------------------------------------------------------------
# Runtime state
# ---------------------------------------------------------------------------

_device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
_model_cache: dict[str, Any] = {}
_feature_extractor: Optional[torch.nn.Module] = None


# ===================================================================
# TensorFlow / Keras helpers
# ===================================================================


def _build_keras_model() -> keras.Model:
    """Build the Keras OCEAN model: PolyFace (TF-wrapped) → LSTM → Dense.

    Uses the shared seeded PolyFace extractor so that the backbone weights are
    identical to those used during training.
    """
    polyface_tf = wrap_polyface_tf(get_feature_extractor())
    polyface_layer = polyface_tf.layers[-1]
    polyface_layer.trainable = False

    inp = layers.Input(
        shape=(NUM_FRAMES, FRAME_SIZE, FRAME_SIZE, NUM_CHANNELS),
        name="input_video",
    )
    x = layers.TimeDistributed(polyface_layer, name="polyface112")(inp)
    x = layers.LSTM(units=128, return_sequences=True)(x)
    x = layers.LSTM(units=64)(x)
    x = layers.Dropout(0.2)(x)
    x = layers.Dense(1024)(x)
    x = layers.Dense(512, activation="relu")(x)
    x = layers.Dense(256, activation="relu")(x)
    x = layers.Dropout(0.5)(x)
    out = layers.Dense(NUM_TRAITS, activation="sigmoid", name="OCEAN")(x)

    return models.Model(inp, out)


def _resolve_checkpoint_path(base_path: str) -> str:
    """Read the ``checkpoint`` meta-file (if present) and return the actual
    checkpoint prefix with verified data files."""
    ckpt_dir = os.path.dirname(base_path)
    ckpt_name = os.path.basename(base_path)

    meta = os.path.join(ckpt_dir, "checkpoint")
    if os.path.exists(meta):
        with open(meta) as fh:
            match = re.search(r'model_checkpoint_path:\s*"([^"]+)"', fh.read())
            if match:
                ckpt_name = match.group(1)

    data_file = os.path.join(ckpt_dir, f"{ckpt_name}.data-00000-of-00001")
    if not os.path.exists(data_file):
        raise FileNotFoundError(
            f"Checkpoint data not found: {data_file}. "
            f"Available: {os.listdir(ckpt_dir)}"
        )
    return os.path.join(ckpt_dir, ckpt_name)


def _load_checkpoint_weights(model: keras.Model, path: str) -> bool:
    """Try multiple strategies to load TF checkpoint weights."""
    strategies: list[tuple[str, Any]] = [
        ("direct load_weights", lambda: model.load_weights(path)),
        (
            "load_weights(by_name)",
            lambda: model.load_weights(path, by_name=True, skip_mismatch=True),
        ),
        (
            "tf.train.Checkpoint",
            lambda: tf.train.Checkpoint(model=model).restore(path).expect_partial(),
        ),
    ]
    for label, loader in strategies:
        try:
            loader()
            logger.info("Checkpoint weights loaded via %s", label)
            return True
        except Exception as exc:  # noqa: BLE001
            logger.debug("Strategy '%s' failed: %s", label, exc)
    return False


def _load_h5_model(path: str) -> Optional[keras.Model]:
    """Load a Keras model from an ``.h5`` or ``.keras`` file."""
    if not os.path.exists(path):
        logger.warning("H5 file not found: %s", path)
        return None

    try:
        from tensorflow.keras.layers import LSTM, Rescaling

        class _CompatLSTM(LSTM):
            """Drop ``time_major`` that older saves may include."""

            def __init__(self, *args: Any, **kwargs: Any) -> None:
                kwargs.pop("time_major", None)
                super().__init__(*args, **kwargs)

            @classmethod
            def from_config(cls, config: dict) -> _CompatLSTM:
                cfg = dict(config)
                cfg.pop("time_major", None)
                return super().from_config(cfg)

        model = tf.keras.models.load_model(
            path,
            custom_objects={"Rescaling": Rescaling, "LSTM": _CompatLSTM},
            compile=False,
        )
        logger.info("H5 model loaded: %s", path)
        return model
    except Exception:
        logger.exception("Failed to load H5 model from %s", path)
        return None


def _checkpoint_base_path(dir_name: str) -> str:
    """Return ``models/<dir>/polyface.t5`` if the directory exists."""
    return os.path.join(BASE_DIR, "models", dir_name, "polyface.t5")


# ===================================================================
# PyTorch model
# ===================================================================


class TorchOceanHead(torch.nn.Module):
    """LSTM + FC head that mirrors the Keras architecture.

    Expects PolyFace features of shape ``(batch, num_frames, 256)``
    and produces ``(batch, 5)`` sigmoid-activated OCEAN scores.
    """

    def __init__(self) -> None:
        super().__init__()
        self.lstm1 = torch.nn.LSTM(
            input_size=POLYFACE_FEATURE_DIM, hidden_size=128, batch_first=True,
        )
        self.lstm2 = torch.nn.LSTM(
            input_size=128, hidden_size=64, batch_first=True,
        )
        self.dropout1 = torch.nn.Dropout(0.2)
        self.fc1 = torch.nn.Linear(64, 1024)
        self.fc2 = torch.nn.Linear(1024, 512)
        self.fc3 = torch.nn.Linear(512, 256)
        self.dropout2 = torch.nn.Dropout(0.5)
        self.output_layer = torch.nn.Linear(256, NUM_TRAITS)

    def forward(self, features: torch.Tensor) -> torch.Tensor:
        x, _ = self.lstm1(features)
        x, _ = self.lstm2(x)
        x = x[:, -1, :]
        x = self.dropout1(x)
        x = self.fc1(x)
        x = torch.relu(self.fc2(x))
        x = torch.relu(self.fc3(x))
        x = self.dropout2(x)
        return torch.sigmoid(self.output_layer(x))


_FRAME_FLAT_DIM = FRAME_SIZE * FRAME_SIZE * NUM_CHANNELS  # 37632


class TorchDummyOceanModel(torch.nn.Module):
    """PyTorch OCEAN model matching the ``1124_171024`` training architecture.

    Exactly mirrors ``PolyFaceOceanModel(dummy_polyface=Linear(37632, 5), ...)``
    from the training notebook (``[PYTORCH] PolyFace_AdaGrad.ipynb``).

    Architecture:
        raw pixels (batch, 10, 112, 112, 3)
        → flatten per frame → Linear(37632 → 5)   [self.polyface]
        → LSTM(hidden=128) → LSTM(hidden=64)
        → FC(1024) → FC(512) → FC(256)
        → Linear(256 → 5) → sigmoid
    """

    def __init__(self) -> None:
        super().__init__()
        self.polyface = torch.nn.Linear(_FRAME_FLAT_DIM, 5)
        self.lstm1 = torch.nn.LSTM(input_size=5, hidden_size=128, batch_first=True)
        self.lstm2 = torch.nn.LSTM(input_size=128, hidden_size=64, batch_first=True)
        self.dropout1 = torch.nn.Dropout(0.2)
        self.fc1 = torch.nn.Linear(64, 1024)
        self.fc2 = torch.nn.Linear(1024, 512)
        self.fc3 = torch.nn.Linear(512, 256)
        self.dropout2 = torch.nn.Dropout(0.5)
        self.output_layer = torch.nn.Linear(256, NUM_TRAITS)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (batch, 10, 112, 112, 3) in [0, 1]
        batch, seq_len, h, w, c = x.shape
        x = x.reshape(batch * seq_len, h * w * c)   # flatten each frame
        x = self.polyface(x)                          # (batch*seq, 5)
        x = x.reshape(batch, seq_len, -1)             # (batch, 10, 5)
        x, _ = self.lstm1(x)
        x, _ = self.lstm2(x)
        x = x[:, -1, :]
        x = self.dropout1(x)
        x = self.fc1(x)
        x = torch.relu(self.fc2(x))
        x = torch.relu(self.fc3(x))
        x = self.dropout2(x)
        return torch.sigmoid(self.output_layer(x))


class TorchOceanModel(torch.nn.Module):
    """Full PyTorch pipeline: PolyFace feature extraction → OCEAN head.

    This mirrors the Keras ``build_model`` architecture so that
    different face inputs produce meaningfully different predictions.
    """

    def __init__(
        self,
        feature_extractor: torch.nn.Module,
        device: torch.device,
    ) -> None:
        super().__init__()
        self.feature_extractor = feature_extractor
        self._device = device
        self.head = TorchOceanHead()

    def _extract_features(self, frames: torch.Tensor) -> torch.Tensor:
        """Run PolyFace on each frame.

        Args:
            frames: ``(batch, 10, 112, 112, 3)`` in ``[0, 1]``.

        Returns:
            ``(batch, 10, 256)`` PolyFace feature vectors.
        """
        batch, n_frames, h, w, c = frames.shape

        # PolyFace expects (N, C, H, W) with uint8-range values
        flat = frames.reshape(batch * n_frames, h, w, c)
        flat = flat.permute(0, 3, 1, 2) * 255.0

        with torch.no_grad():
            feats = self.feature_extractor(flat.to(self._device))

        return feats.reshape(batch, n_frames, -1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        features = self._extract_features(x)
        return self.head(features)


class TorchMobileOceanModel(torch.nn.Module):
    """PyTorch OCEAN model using pretrained MobileNetV2 as backbone.

    Architecture:
        MobileNetV2 (ImageNet pretrained, frozen) → Linear(1280 → 256)
        → LSTM(256, 128) → LSTM(128, 64) → FC → sigmoid

    Use this when retraining with a proper pretrained backbone.
    The backbone produces discriminative per-frame features so that
    different faces yield genuinely different OCEAN predictions.
    """

    def __init__(self) -> None:
        super().__init__()
        import torchvision.models as tv_models

        base = tv_models.mobilenet_v2(
            weights=tv_models.MobileNet_V2_Weights.IMAGENET1K_V1
        )
        # Keep the convolutional feature extractor, discard the classifier
        self.backbone = base.features          # outputs (B, 1280, 4, 4) for 112×112 input
        self.pool = torch.nn.AdaptiveAvgPool2d(1)
        self.proj = torch.nn.Linear(1280, POLYFACE_FEATURE_DIM)

        # Freeze backbone — only the projection + head train
        for p in self.backbone.parameters():
            p.requires_grad = False

        self.head = TorchOceanHead()          # expects (B, T, 256)

    def _extract_features(self, frames: torch.Tensor) -> torch.Tensor:
        """Run MobileNetV2 on every frame.

        Args:
            frames: ``(batch, 10, 112, 112, 3)`` in ``[0, 1]``.

        Returns:
            ``(batch, 10, 256)`` feature vectors.
        """
        batch, n_frames, h, w, c = frames.shape
        # MobileNetV2 expects (N, 3, H, W) normalized to ImageNet stats
        flat = frames.reshape(batch * n_frames, h, w, c).permute(0, 3, 1, 2)
        mean = torch.tensor([0.485, 0.456, 0.406], device=flat.device).view(1, 3, 1, 1)
        std  = torch.tensor([0.229, 0.224, 0.225], device=flat.device).view(1, 3, 1, 1)
        flat = (flat - mean) / std

        with torch.no_grad():
            feats = self.backbone(flat)       # (B*T, 1280, H', W')
        feats = self.pool(feats).flatten(1)   # (B*T, 1280)
        feats = torch.relu(self.proj(feats))  # (B*T, 256)
        return feats.reshape(batch, n_frames, POLYFACE_FEATURE_DIM)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.head(self._extract_features(x))


class TorchMobileOceanModelV2(torch.nn.Module):
    """PyTorch OCEAN model whose state_dict matches the ``final_2`` checkpoint.

    Mirrors the exact ``PolyFaceOceanModel`` structure used in the training
    notebook where ``self.polyface`` is a MobileNetV2 with its default
    classifier replaced by ``Linear(1280 → 256)``, and all LSTM / FC layers
    live directly on the model (not nested in a ``head`` sub-module).

    State-dict key layout::

        polyface.features.*          MobileNetV2 convolutional layers
        polyface.classifier.{weight,bias}   Linear(1280 → 256) projection
        lstm1.*                      LSTM(input=256, hidden=128)
        lstm2.*                      LSTM(input=128, hidden=64)
        fc1.* / fc2.* / fc3.*        Dense(64→1024→512→256)
        output_layer.*               Linear(256 → 5) + sigmoid
    """

    def __init__(self) -> None:
        super().__init__()
        import torchvision.models as tv_models

        base = tv_models.mobilenet_v2(
            weights=tv_models.MobileNet_V2_Weights.IMAGENET1K_V1
        )
        base.classifier = torch.nn.Linear(1280, POLYFACE_FEATURE_DIM)
        self.polyface = base

        self.lstm1 = torch.nn.LSTM(
            input_size=POLYFACE_FEATURE_DIM, hidden_size=128, batch_first=True,
        )
        self.lstm2 = torch.nn.LSTM(
            input_size=128, hidden_size=64, batch_first=True,
        )
        self.dropout1    = torch.nn.Dropout(0.2)
        self.fc1         = torch.nn.Linear(64, 1024)
        self.fc2         = torch.nn.Linear(1024, 512)
        self.fc3         = torch.nn.Linear(512, 256)
        self.dropout2    = torch.nn.Dropout(0.5)
        self.output_layer = torch.nn.Linear(256, NUM_TRAITS)

    def _extract_features(self, frames: torch.Tensor) -> torch.Tensor:
        """Run ``self.polyface`` (MobileNetV2) on every frame.

        Args:
            frames: ``(batch, 10, 112, 112, 3)`` in ``[0, 1]``.

        Returns:
            ``(batch, 10, 256)`` feature vectors.
        """
        batch, n_frames, h, w, c = frames.shape
        flat = frames.reshape(batch * n_frames, h, w, c).permute(0, 3, 1, 2)
        mean = torch.tensor([0.485, 0.456, 0.406], device=flat.device).view(1, 3, 1, 1)
        std  = torch.tensor([0.229, 0.224, 0.225], device=flat.device).view(1, 3, 1, 1)
        flat = (flat - mean) / std

        # polyface.features → AdaptiveAvgPool2d(1) → polyface.classifier
        feats = self.polyface.features(flat)                           # (B*T, 1280, H', W')
        feats = torch.nn.functional.adaptive_avg_pool2d(feats, 1)
        feats = feats.flatten(1)                                       # (B*T, 1280)
        feats = torch.relu(self.polyface.classifier(feats))            # (B*T, 256)
        return feats.reshape(batch, n_frames, POLYFACE_FEATURE_DIM)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        features = self._extract_features(x)          # (B, 10, 256)
        x, _ = self.lstm1(features)
        x, _ = self.lstm2(x)
        x = x[:, -1, :]
        x = self.dropout1(x)
        x = self.fc1(x)
        x = torch.relu(self.fc2(x))
        x = torch.relu(self.fc3(x))
        x = self.dropout2(x)
        return torch.sigmoid(self.output_layer(x))


def _load_mobile_v2_pytorch_model(dir_name: str) -> TorchMobileOceanModelV2:
    """Load ``TorchMobileOceanModelV2`` (final_2 architecture) with strict=True."""
    pth_path = _resolve_pth_path(dir_name)
    saved = torch.load(pth_path, map_location=_device, weights_only=True)
    if not isinstance(saved, (dict, OrderedDict)):
        raise RuntimeError(f"Invalid weights format in '{pth_path}'")
    model = TorchMobileOceanModelV2()
    model.load_state_dict(saved, strict=True)
    model.eval()
    logger.info("MobileNetV2 OCEAN model loaded from: %s", pth_path)
    return model.to(_device)


def _load_mobile_pytorch_model(dir_name: str) -> TorchMobileOceanModel:
    """Load ``TorchMobileOceanModel`` weights from a ``.pth`` file.

    Only the projection layer and LSTM/Dense head are loaded from the
    checkpoint; backbone weights are always the pretrained ImageNet ones.
    """
    pth_path = _resolve_pth_path(dir_name)
    saved: dict[str, torch.Tensor] = torch.load(
        pth_path, map_location=_device, weights_only=True,
    )
    model = TorchMobileOceanModel()

    # Load compatible weights (proj + head), skip backbone keys
    own_params = {k: v for k, v in model.named_parameters()}
    compatible = {
        k: v for k, v in saved.items()
        if k in own_params and v.shape == own_params[k].shape
    }
    skipped = [k for k in saved if k not in compatible]
    model.load_state_dict(compatible, strict=False)
    logger.info(
        "Mobile model: loaded %d/%d keys from %s (skipped: %s)",
        len(compatible), len(saved), pth_path, skipped,
    )
    return model.to(_device).eval()


def _resolve_pth_path(dir_name: str) -> str:
    """Find the ``.pth`` weights file inside a model directory."""
    model_dir = os.path.join(BASE_DIR, "models", dir_name)
    for name in ("polyface_final_2.pth", "polyface_final.pth", "polyface_part2.pth", "polyface.pth"):
        path = os.path.join(model_dir, name)
        if os.path.exists(path):
            return path
    raise FileNotFoundError(
        f"No .pth file found in '{model_dir}'. "
        f"Expected one of: polyface_final.pth, polyface_part2.pth, polyface.pth, polyface_final_2.pth"
    )


def _load_dummy_pytorch_model(dir_name: str) -> TorchDummyOceanModel:
    """Load ``TorchDummyOceanModel`` (1124_171024 architecture) from ``.pth``."""
    pth_path = _resolve_pth_path(dir_name)
    saved = torch.load(pth_path, map_location=_device, weights_only=True)
    if not isinstance(saved, (dict, OrderedDict)):
        raise RuntimeError(f"Invalid weights format in '{pth_path}'")

    model = TorchDummyOceanModel()
    model.load_state_dict(saved, strict=True)
    model.eval()
    logger.info("PyTorch dummy model loaded from: %s", pth_path)
    return model.to(_device)


# ===================================================================
# Public API
# ===================================================================


def _create_seeded_polyface() -> torch.nn.Module:
    """Create a PolyFace model with deterministic weights.

    If ``BACKBONE_WEIGHTS_FILE`` exists it is loaded directly; otherwise the
    backbone is initialised from ``POLYFACE_SEED`` so that the weights are
    reproducible across restarts.

    **Important for training**: call ``save_feature_extractor()`` after
    training so that inference uses the exact same backbone.
    """
    if os.path.exists(BACKBONE_WEIGHTS_FILE):
        model = create_model_polyface3()
        state = torch.load(BACKBONE_WEIGHTS_FILE, map_location=_device, weights_only=True)
        model.load_state_dict(state)
        logger.info("PolyFace backbone loaded from %s", BACKBONE_WEIGHTS_FILE)
    else:
        rng_state = torch.random.get_rng_state()
        torch.manual_seed(POLYFACE_SEED)
        model = create_model_polyface3()
        torch.random.set_rng_state(rng_state)
        logger.info(
            "PolyFace backbone created with seed=%d (no saved weights at %s)",
            POLYFACE_SEED, BACKBONE_WEIGHTS_FILE,
        )
    return model.to(_device).eval()


def get_feature_extractor() -> torch.nn.Module:
    """Return the cached PolyFace feature extractor (PyTorch)."""
    global _feature_extractor
    if _feature_extractor is None:
        _feature_extractor = _create_seeded_polyface()
    return _feature_extractor


def save_feature_extractor(path: Optional[str] = None) -> str:
    """Persist the current PolyFace backbone weights.

    Call this after training so that the LSTM/Dense weights and the
    backbone stay in sync at inference time.

    Returns:
        Path the weights were saved to.
    """
    path = path or BACKBONE_WEIGHTS_FILE
    extractor = get_feature_extractor()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    torch.save(extractor.state_dict(), path)
    logger.info("PolyFace backbone saved to %s", path)
    return path


def get_model(
    model_key: str = DEFAULT_MODEL_KEY,
) -> Union[keras.Model, TorchOceanModel]:
    """Load (or return cached) the OCEAN prediction model for *model_key*.

    Raises:
        RuntimeError: If the model cannot be loaded.
    """
    if model_key not in MODEL_REGISTRY:
        logger.warning("Unknown model_key '%s', falling back to '%s'", model_key, DEFAULT_MODEL_KEY)
        model_key = DEFAULT_MODEL_KEY

    if model_key in _model_cache:
        logger.info("Cache hit for model_key='%s'", model_key)
        return _model_cache[model_key]

    spec = MODEL_REGISTRY[model_key]
    spec_type = spec["type"]
    logger.info("Loading model_key='%s' (type='%s')", model_key, spec_type)

    model: Optional[Union[keras.Model, TorchOceanModel]] = None

    if spec_type == "checkpoint":
        base = _checkpoint_base_path(spec["dir"])
        path = _resolve_checkpoint_path(base)
        model = _build_keras_model()
        if not _load_checkpoint_weights(model, path):
            raise RuntimeError(
                f"Failed to load checkpoint for '{model_key}' from {path}"
            )

    elif spec_type == "h5":
        model = _load_h5_model(spec["path"])
        if model is None:
            raise RuntimeError(
                f"Failed to load H5 model for '{model_key}' from {spec['path']}"
            )

    elif spec_type == "pytorch":
        model = _load_pytorch_model(spec["dir"])

    elif spec_type == "pytorch_dummy":
        model = _load_dummy_pytorch_model(spec["dir"])

    elif spec_type == "pytorch_mobile":
        model = _load_mobile_pytorch_model(spec["dir"])

    elif spec_type == "pytorch_mobile_v2":
        model = _load_mobile_v2_pytorch_model(spec["dir"])

    elif spec_type == "auto":
        model = _try_auto_load()

    else:
        raise RuntimeError(f"Unknown model type '{spec_type}' for '{model_key}'")

    if model is None:
        raise RuntimeError(f"Model loading returned None for '{model_key}'")

    _model_cache[model_key] = model
    logger.info("Model '%s' ready", model_key)
    return model


def _try_auto_load() -> Union[keras.Model, TorchOceanModel]:
    """Auto selection: checkpoint → H5 fallback."""
    # 1) checkpoint
    try:
        ckpt_dir = MODEL_REGISTRY["ckpt_1127_145313"]["dir"]
        base = _checkpoint_base_path(ckpt_dir)
        path = _resolve_checkpoint_path(base)
        model = _build_keras_model()
        if _load_checkpoint_weights(model, path):
            logger.info("Auto → checkpoint: %s", path)
            return model
    except Exception as exc:  # noqa: BLE001
        logger.warning("Auto checkpoint failed: %s", exc)

    # 2) H5
    if "h5_adagrad" in MODEL_REGISTRY:
        h5_path = MODEL_REGISTRY["h5_adagrad"]["path"]
        model = _load_h5_model(h5_path)
        if model is not None:
            logger.info("Auto → H5: %s", h5_path)
            return model

    raise RuntimeError("Auto model selection exhausted all options")


def get_model_display_name(model_key: str) -> str:
    """Human-readable display name for *model_key*."""
    spec = MODEL_REGISTRY.get(model_key)
    if spec and "display_name" in spec:
        return spec["display_name"]
    return model_key


def get_available_models() -> dict[str, str]:
    """Map of ``model_key → display_name`` for every registered model."""
    return {k: v.get("display_name", k) for k, v in MODEL_REGISTRY.items()}


def clear_model_cache() -> None:
    """Free all cached models and GPU memory."""
    global _model_cache, _feature_extractor
    _model_cache = {}
    _feature_extractor = None
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    logger.info("Model cache cleared")


# ===================================================================
# Preprocessing & prediction
# ===================================================================


def preprocess(frames: np.ndarray) -> np.ndarray:
    """Normalise video frames to ``(1, 10, 112, 112, 3)`` float32 in ``[0, 1]``.

    Accepts shapes ``(10, H, W, 3)`` or ``(B, 10, H, W, 3)`` with values in
    either ``[0, 255]`` or ``[0, 1]``.

    Raises:
        ValueError: On unexpected shape or insufficient frames.
    """
    frames = frames.astype(np.float32)

    if frames.max() > 1.0:
        frames /= 255.0

    if frames.ndim == 4:
        frames = np.expand_dims(frames, axis=0)
    elif frames.ndim != 5:
        raise ValueError(
            f"Expected 4-D or 5-D frame array, got shape {frames.shape}"
        )

    n = frames.shape[1]
    if n > NUM_FRAMES:
        frames = frames[:, :NUM_FRAMES]
    elif n < NUM_FRAMES:
        raise ValueError(f"Need at least {NUM_FRAMES} frames, got {n}")

    return frames


def predict_ocean(
    frames: np.ndarray,
    model_key: str = DEFAULT_MODEL_KEY,
) -> dict[str, float]:
    """Predict OCEAN personality traits from video frames.

    Args:
        frames: ``(10, 112, 112, 3)`` or ``(B, 10, 112, 112, 3)``.
        model_key: Key in ``MODEL_REGISTRY``.

    Returns:
        ``{trait_name: score_0_to_100}`` rounded to two decimals.

    Raises:
        RuntimeError: On prediction failure.
    """
    model = get_model(model_key=model_key)
    preprocessed = preprocess(frames)

    logger.info(
        "Predicting: model_key='%s', input_shape=%s, input_hash=%d",
        model_key,
        preprocessed.shape,
        hash(preprocessed.tobytes()[:1024]),
    )

    try:
        if isinstance(model, torch.nn.Module):
            model.eval()
            with torch.no_grad():
                tensor = torch.from_numpy(preprocessed).float().to(_device)
                raw = model(tensor).detach().cpu().numpy()
        else:
            raw = model.predict(preprocessed, verbose=0)
    except Exception as exc:
        raise RuntimeError(f"Prediction failed: {exc}") from exc

    if raw is None or len(raw) == 0:
        raise RuntimeError("Model returned empty predictions")

    scores = raw[0]
    result = {
        trait: round(float(score) * 100, 2)
        for trait, score in zip(OCEAN_TRAITS, scores)
    }
    logger.debug("OCEAN predictions: %s", result)
    return result
