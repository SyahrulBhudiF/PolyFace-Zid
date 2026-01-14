"""
OCEAN Personality Prediction Service

Provides model loading and prediction functions for OCEAN personality traits.
Refactored for cleaner code structure and reduced verbosity.
"""

import os
import logging
from typing import Optional

import numpy as np
import tensorflow as tf
from tensorflow import keras
from keras import layers, models
import torch

from .polyfacemodels2 import create_model_polyface3, wrap_polyface_tf

# =============================================================================
# Configuration
# =============================================================================

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.realpath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "1127_145313", "polyface.t5")
MODEL_PATH_H5 = os.path.join(BASE_DIR, "models", "keras", "polyface_adagrad.h5")

OCEAN_TRAITS = ["Openness", "Conscientiousness", "Extraversion", "Agreeableness", "Neuroticism"]

# Global model cache
_model_instance: Optional[keras.Model] = None
_feature_extractor_instance = None
_device = torch.device("cuda" if torch.cuda.is_available() else "cpu")


# =============================================================================
# Model Building
# =============================================================================

def build_model() -> keras.Model:
    """
    Build the OCEAN prediction model architecture.

    Returns:
        Compiled Keras model for OCEAN personality prediction.
    """
    polyface_model_tf = wrap_polyface_tf(create_model_polyface3())
    polyface_tflayer = polyface_model_tf.layers[-1]
    polyface_tflayer.trainable = False

    inputs = layers.Input(shape=(10, 112, 112, 3), name="input_video")
    x = layers.TimeDistributed(polyface_tflayer, name="polyface112")(inputs)
    x = layers.LSTM(units=128, return_sequences=True)(x)
    x = layers.LSTM(units=64)(x)
    x = layers.Dropout(0.2)(x)
    x = layers.Dense(units=1024)(x)
    x = layers.Dense(units=512, activation="relu")(x)
    x = layers.Dense(256, activation="relu")(x)
    x = layers.Dropout(0.5)(x)
    outputs = layers.Dense(5, activation="sigmoid", name="OCEAN")(x)

    return models.Model(inputs, outputs)


def _resolve_checkpoint_path(checkpoint_path: str) -> str:
    """
    Resolve the actual checkpoint path from the checkpoint directory.

    Args:
        checkpoint_path: Base checkpoint path.

    Returns:
        Resolved checkpoint path.
    """
    checkpoint_dir = os.path.dirname(checkpoint_path)
    checkpoint_name = os.path.basename(checkpoint_path)

    # Check for checkpoint meta file
    checkpoint_meta_file = os.path.join(checkpoint_dir, "checkpoint")
    if os.path.exists(checkpoint_meta_file):
        import re
        with open(checkpoint_meta_file, "r") as f:
            content = f.read()
            match = re.search(r'model_checkpoint_path:\s*"([^"]+)"', content)
            if match:
                checkpoint_name = match.group(1)

    # Verify checkpoint files exist
    data_file = os.path.join(checkpoint_dir, checkpoint_name + ".data-00000-of-00001")
    if not os.path.exists(data_file):
        raise FileNotFoundError(
            f"Checkpoint data file not found: {data_file}. "
            f"Available files: {os.listdir(checkpoint_dir)}"
        )

    return os.path.join(checkpoint_dir, checkpoint_name)


def _load_weights_from_checkpoint(model: keras.Model, checkpoint_path: str) -> bool:
    """
    Attempt to load weights from checkpoint using multiple methods.

    Args:
        model: Keras model to load weights into.
        checkpoint_path: Path to the checkpoint.

    Returns:
        True if weights were loaded successfully.
    """
    # Method 1: Direct load_weights
    try:
        model.load_weights(checkpoint_path)
        logger.info("Weights loaded using direct load_weights()")
        return True
    except Exception as e:
        logger.debug(f"Direct load failed: {e}")

    # Method 2: load_weights with by_name
    try:
        model.load_weights(checkpoint_path, by_name=True, skip_mismatch=True)
        logger.info("Weights loaded using load_weights(by_name=True)")
        return True
    except Exception as e:
        logger.debug(f"Load by name failed: {e}")

    # Method 3: tf.train.Checkpoint
    try:
        checkpoint = tf.train.Checkpoint(model=model)
        status = checkpoint.restore(checkpoint_path)
        status.expect_partial()
        logger.info("Weights loaded using tf.train.Checkpoint")
        return True
    except Exception as e:
        logger.debug(f"Checkpoint restore failed: {e}")

    return False


def _load_from_h5(model_path: str) -> Optional[keras.Model]:
    """
    Load model from H5 file as fallback.

    Args:
        model_path: Path to H5 model file.

    Returns:
        Loaded Keras model or None if loading failed.
    """
    if not os.path.exists(model_path):
        logger.warning(f"H5 file not found: {model_path}")
        return None

    try:
        from tensorflow.keras.layers import Rescaling, LSTM

        class CompatibleLSTM(LSTM):
            def __init__(self, *args, **kwargs):
                kwargs.pop("time_major", None)
                super().__init__(*args, **kwargs)

            @classmethod
            def from_config(cls, config):
                if isinstance(config, dict):
                    config = config.copy()
                    config.pop("time_major", None)
                return super().from_config(config)

        model = tf.keras.models.load_model(
            model_path,
            custom_objects={
                "Rescaling": Rescaling,
                "LSTM": CompatibleLSTM,
            },
            compile=False,
        )
        logger.info(f"Model loaded from H5 file: {model_path}")
        return model
    except Exception as e:
        logger.error(f"Failed to load H5 model: {e}")
        return None


# =============================================================================
# Public API
# =============================================================================

def get_model() -> keras.Model:
    """
    Get or load the OCEAN prediction model.

    Uses caching to avoid reloading the model on each call.

    Returns:
        Loaded and ready-to-use Keras model.

    Raises:
        RuntimeError: If model cannot be loaded.
    """
    global _model_instance

    if _model_instance is not None:
        return _model_instance

    logger.info("Loading OCEAN prediction model...")

    # Try loading from checkpoint first
    try:
        checkpoint_path = _resolve_checkpoint_path(MODEL_PATH)
        _model_instance = build_model()

        if _load_weights_from_checkpoint(_model_instance, checkpoint_path):
            logger.info("Model loaded successfully from checkpoint")
            return _model_instance
    except FileNotFoundError as e:
        logger.warning(f"Checkpoint not found: {e}")
    except Exception as e:
        logger.warning(f"Failed to load from checkpoint: {e}")

    # Fallback to H5 file
    _model_instance = _load_from_h5(MODEL_PATH_H5)
    if _model_instance is not None:
        return _model_instance

    raise RuntimeError(
        "Failed to load model. Ensure checkpoint or H5 file exists at:\n"
        f"  - Checkpoint: {MODEL_PATH}\n"
        f"  - H5: {MODEL_PATH_H5}"
    )


def get_feature_extractor():
    """
    Get or load the PolyFace feature extractor.

    Returns:
        PyTorch PolyFace model for feature extraction.
    """
    global _feature_extractor_instance

    if _feature_extractor_instance is None:
        _feature_extractor_instance = create_model_polyface3().to(_device).eval()

    return _feature_extractor_instance


def clear_model_cache() -> None:
    """Clear the model cache to free memory."""
    global _model_instance, _feature_extractor_instance

    _model_instance = None
    _feature_extractor_instance = None

    if torch.cuda.is_available():
        torch.cuda.empty_cache()

    logger.info("Model cache cleared")


def preprocess(frames: np.ndarray) -> np.ndarray:
    """
    Preprocess video frames for OCEAN prediction.

    Args:
        frames: Input frames with shape (10, 112, 112, 3) or (batch, 10, 112, 112, 3).
                Values can be in range [0, 255] or [0, 1].

    Returns:
        Preprocessed frames with shape (batch, 10, 112, 112, 3) and values in [0, 1].

    Raises:
        ValueError: If frame shape is invalid.
    """
    frames = frames.astype(np.float32)

    # Normalize to [0, 1] if needed
    if frames.max() > 1.0:
        frames = frames / 255.0

    # Add batch dimension if needed
    if frames.ndim == 4:
        frames = np.expand_dims(frames, axis=0)
    elif frames.ndim != 5:
        raise ValueError(
            f"Expected frames shape (10, 112, 112, 3) or (batch, 10, 112, 112, 3), "
            f"got {frames.shape}"
        )

    # Ensure exactly 10 frames
    if frames.shape[1] != 10:
        if frames.shape[1] > 10:
            frames = frames[:, :10, :, :, :]
        else:
            raise ValueError(f"Expected 10 frames, got {frames.shape[1]}")

    return frames


def predict_ocean(frames: np.ndarray) -> dict[str, float]:
    """
    Predict OCEAN personality traits from video frames.

    Args:
        frames: Video frames with shape (10, 112, 112, 3) or (batch, 10, 112, 112, 3).

    Returns:
        Dictionary mapping trait names to percentage scores (0-100).

    Raises:
        RuntimeError: If prediction fails.
    """
    model = get_model()

    if model is None:
        raise RuntimeError("Model is not loaded")

    # Preprocess frames
    frames_tensor = preprocess(frames)

    # Run prediction
    try:
        predictions = model.predict(frames_tensor, verbose=0)
    except Exception as e:
        raise RuntimeError(f"Prediction failed: {e}") from e

    if predictions is None or len(predictions) == 0:
        raise RuntimeError("Model returned empty predictions")

    # Extract first batch result
    scores = predictions[0]

    # Build result dictionary with percentage scores
    result = {
        trait: round(score * 100, 2)
        for trait, score in zip(OCEAN_TRAITS, scores)
    }

    logger.debug(f"OCEAN predictions: {result}")

    # Clean up to free memory (optional - uncomment if memory is an issue)
    # clear_model_cache()

    return result


def torch_forward_frames(
    frames_nhwc: np.ndarray,
    model: torch.nn.Module,
    device: torch.device,
    chunk_size: int = 64,
) -> np.ndarray:
    """
    Forward frames through a PyTorch model in chunks.

    Args:
        frames_nhwc: Frames in NHWC format.
        model: PyTorch model.
        device: Device to run on.
        chunk_size: Number of frames per batch.

    Returns:
        Model outputs as numpy array.
    """
    n_frames = frames_nhwc.shape[0]
    outputs = []

    with torch.no_grad():
        for i in range(0, n_frames, chunk_size):
            chunk = frames_nhwc[i : i + chunk_size]
            x = torch.from_numpy(chunk).permute(0, 3, 1, 2).float().to(device)
            out = model(x)
            outputs.append(out.detach().cpu().numpy())

    return np.concatenate(outputs, axis=0)
