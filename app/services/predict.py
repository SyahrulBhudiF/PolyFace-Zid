import os
import tensorflow as tf
import numpy as np
import torch
from .polyfacemodel import create_model_polyface3

BASE_DIR = os.path.dirname(os.path.realpath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "keras", "polyface_adagrad.keras")

_model_instance = None
_feature_extractor_instance = None
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

def torch_forward_frames(frames_nhwc, model, device, chunk=64):
    N = frames_nhwc.shape[0]
    feats_out = []
    with torch.no_grad():
        for i in range(0, N, chunk):
            sub = frames_nhwc[i:i+chunk]
            x = torch.from_numpy(sub).permute(0, 3, 1, 2).float().to(device)

            f = model(x)
            feats_out.append(f.detach().cpu().numpy())
    return np.concatenate(feats_out, axis=0)

def clear_model_cache():
    global _model_instance, _feature_extractor_instance
    _model_instance = None
    _feature_extractor_instance = None
    if torch.cuda.is_available():
        torch.cuda.empty_cache()

def get_model():
    global _model_instance
    if _model_instance is None:
        _model_instance = tf.keras.models.load_model(MODEL_PATH)
    return _model_instance

def get_feature_extractor():
    global _feature_extractor_instance
    if _feature_extractor_instance is None:
        polyface_model = create_model_polyface3().to(device).eval()
        _feature_extractor_instance = polyface_model
    return _feature_extractor_instance

def preprocess(frames: np.ndarray):
    frames = frames.astype(np.float32)
    feature_extractor = get_feature_extractor()

    if frames.ndim == 5:
        B, T, H, W, C = frames.shape
        flat = frames.reshape(B * T, H, W, C)
        frames_features_flat = torch_forward_frames(flat, feature_extractor, device)
        frames_features = frames_features_flat.reshape(B, T, 256)
    else:
        frames_features = torch_forward_frames(frames, feature_extractor, device)
        frames_features = np.expand_dims(frames_features, axis=0)

    return frames_features

def predict_ocean(frames: np.ndarray):
    model = get_model()
    frames_tensor = preprocess(frames)
    preds = model.predict(frames_tensor)
    preds = preds[0]

    result = {
        "O": float(preds[0]),
        "C": float(preds[1]),
        "E": float(preds[2]),
        "A": float(preds[3]),
        "N": float(preds[4]),
    }

    clear_model_cache()

    return result

