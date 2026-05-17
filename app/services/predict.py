"""OCEAN Personality Prediction Service."""

from __future__ import annotations

import logging
import os
from typing import Any

import numpy as np
import torch
import torchvision.models as tv_models

from app.services.polyfacemodels2 import create_model_polyface3

__all__ = ["OCEAN_TRAITS", "predict_ocean", "clear_model_cache"]

logger = logging.getLogger(__name__)

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

MODEL_PATH = os.path.join(BASE_DIR, "models", "final", "polyface_backboned_final_adagrad.pth")

_device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
_model_cache: dict[str, Any] = {}


class PolyFaceOceanModel(torch.nn.Module):
    """Training-compatible PolyFace -> LSTM -> FC OCEAN model.

    Mirrors the architecture provided from training code so state_dict keys
    line up (`polyface.*`, `lstm1.*`, `lstm2.*`, `fc1.*`, ...).
    """

    def __init__(
        self,
        polyface_pytorch_layer: torch.nn.Module,
        polyface_out_features: int,
        freeze_polyface: bool = False,
    ) -> None:
        super().__init__()
        self.polyface = polyface_pytorch_layer
        self.freeze_polyface = freeze_polyface
        self.lstm1 = torch.nn.LSTM(
            input_size=polyface_out_features, hidden_size=128, batch_first=True
        )
        self.lstm2 = torch.nn.LSTM(input_size=128, hidden_size=64, batch_first=True)
        self.dropout1 = torch.nn.Dropout(0.2)
        self.fc1 = torch.nn.Linear(64, 1024)
        self.fc2 = torch.nn.Linear(1024, 512)
        self.fc3 = torch.nn.Linear(512, 256)
        self.dropout2 = torch.nn.Dropout(0.5)
        self.output_layer = torch.nn.Linear(256, NUM_TRAITS)

    def _polyface_forward(self, x: torch.Tensor) -> torch.Tensor:
        if self.freeze_polyface:
            self.polyface.eval()
            with torch.no_grad():
                out = self.polyface(x)
        else:
            out = self.polyface(x)

        # Some PolyFace implementations return dicts, use feature vector.
        if isinstance(out, dict):
            if "feature" in out:
                return out["feature"]
            first_tensor = next((v for v in out.values() if torch.is_tensor(v)), None)
            if first_tensor is not None:
                return first_tensor
            raise RuntimeError("PolyFace output dict has no tensor values")
        return out

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # Accept both (B,T,C,H,W) and (B,T,H,W,C)
        if x.ndim != 5:
            raise ValueError(f"Expected 5D tensor, got shape {tuple(x.shape)}")
        if x.shape[-1] == NUM_CHANNELS:
            x = x.permute(0, 1, 4, 2, 3).contiguous()

        batch_size, seq_len, c, h, w = x.size()
        x = x.reshape(batch_size * seq_len, c, h, w)

        if isinstance(self.polyface, torch.nn.Linear):
            x = x.reshape(batch_size * seq_len, -1)
        else:
            if torch.is_floating_point(x) and torch.max(x) <= 1.0:
                x = x * 255.0
            x = torch.clamp(x, 0.0, 255.0)
        x = self._polyface_forward(x)
        x = x.reshape(batch_size, seq_len, -1)

        x, _ = self.lstm1(x)
        x, _ = self.lstm2(x)
        x = x[:, -1, :]
        x = self.dropout1(x)
        x = self.fc1(x)
        x = torch.relu(self.fc2(x))
        x = torch.relu(self.fc3(x))
        x = self.dropout2(x)
        x = self.output_layer(x)
        return torch.sigmoid(x)


def apolynetmodel() -> torch.nn.Module:
    """Build the PyTorch architecture used by final PolyFace state_dict weights."""
    return PolyFaceOceanModel(
        polyface_pytorch_layer=create_model_polyface3(),
        polyface_out_features=POLYFACE_FEATURE_DIM,
        freeze_polyface=False,
    )


def _get_model() -> torch.nn.Module:
    if "model" in _model_cache:
        return _model_cache["model"]

    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model not found: {MODEL_PATH}")

    model = apolynetmodel()
    state = torch.load(MODEL_PATH, map_location=_device, weights_only=True)
    model.load_state_dict(state)
    model = model.to(_device).eval()
    _model_cache["model"] = model
    logger.info("Model loaded from %s", MODEL_PATH)
    return model


def clear_model_cache() -> None:
    _model_cache.clear()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    logger.info("Model cache cleared")


def _preprocess(frames: np.ndarray) -> np.ndarray:
    frames = frames.astype(np.float32)
    if frames.max() > 1.0:
        frames /= 255.0

    if frames.ndim == 4:
        frames = np.expand_dims(frames, axis=0)
    elif frames.ndim != 5:
        raise ValueError(f"Expected 4-D or 5-D frame array, got shape {frames.shape}")

    n = frames.shape[1]
    if n > NUM_FRAMES:
        frames = frames[:, :NUM_FRAMES]
    elif n < NUM_FRAMES:
        raise ValueError(f"Need at least {NUM_FRAMES} frames, got {n}")

    return frames


def predict_ocean(frames: np.ndarray) -> dict[str, float]:
    model = _get_model()
    preprocessed = _preprocess(frames)

    model.eval()
    with torch.no_grad():
        tensor = torch.from_numpy(preprocessed).float().to(_device)
        raw = model(tensor).detach().cpu().numpy()

    if raw is None or len(raw) == 0:
        raise RuntimeError("Model returned empty predictions")

    scores = raw[0]
    return {
        trait: round(float(score) * 100, 2)
        for trait, score in zip(OCEAN_TRAITS, scores)
    }
