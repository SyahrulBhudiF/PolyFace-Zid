"""OCEAN Personality Prediction Service."""

from __future__ import annotations

import logging
import os
from typing import Any

import numpy as np
import torch
import torchvision.models as tv_models

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


class TorchMobileOceanModelV2(torch.nn.Module):
    def __init__(self) -> None:
        super().__init__()
        base = tv_models.mobilenet_v2(weights=tv_models.MobileNet_V2_Weights.IMAGENET1K_V1)
        base.classifier = torch.nn.Linear(1280, POLYFACE_FEATURE_DIM)
        self.polyface = base

        self.lstm1 = torch.nn.LSTM(input_size=POLYFACE_FEATURE_DIM, hidden_size=128, batch_first=True)
        self.lstm2 = torch.nn.LSTM(input_size=128, hidden_size=64, batch_first=True)
        self.dropout1 = torch.nn.Dropout(0.2)
        self.fc1 = torch.nn.Linear(64, 1024)
        self.fc2 = torch.nn.Linear(1024, 512)
        self.fc3 = torch.nn.Linear(512, 256)
        self.dropout2 = torch.nn.Dropout(0.5)
        self.output_layer = torch.nn.Linear(256, NUM_TRAITS)

    def _extract_features(self, frames: torch.Tensor) -> torch.Tensor:
        batch, n_frames, h, w, c = frames.shape
        flat = frames.reshape(batch * n_frames, h, w, c).permute(0, 3, 1, 2)
        mean = torch.tensor([0.485, 0.456, 0.406], device=flat.device).view(1, 3, 1, 1)
        std = torch.tensor([0.229, 0.224, 0.225], device=flat.device).view(1, 3, 1, 1)
        flat = (flat - mean) / std

        feats = self.polyface.features(flat)
        feats = torch.nn.functional.adaptive_avg_pool2d(feats, 1)
        feats = feats.flatten(1)
        feats = torch.relu(self.polyface.classifier(feats))
        return feats.reshape(batch, n_frames, POLYFACE_FEATURE_DIM)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        features = self._extract_features(x)
        x, _ = self.lstm1(features)
        x, _ = self.lstm2(x)
        x = x[:, -1, :]
        x = self.dropout1(x)
        x = self.fc1(x)
        x = torch.relu(self.fc2(x))
        x = torch.relu(self.fc3(x))
        x = self.dropout2(x)
        return torch.sigmoid(self.output_layer(x))


def _get_model() -> torch.nn.Module:
    if "model" in _model_cache:
        return _model_cache["model"]

    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model not found: {MODEL_PATH}")

    model = TorchMobileOceanModelV2()
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
