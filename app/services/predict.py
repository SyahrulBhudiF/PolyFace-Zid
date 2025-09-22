import os
import tensorflow as tf
import numpy as np

# os.environ["CUDA_VISIBLE_DEVICES"] = "-1"

BASE_DIR = os.path.dirname(os.path.realpath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "weight_adagrad")

_model_instance = None


def get_model():
    global _model_instance

    if _model_instance is None:
        loaded = tf.saved_model.load(MODEL_PATH)
        _model_instance = loaded.signatures["serving_default"]
        print("[DEBUG] Model loaded with serving_default signature")

    return _model_instance


def predict_ocean(frames: np.ndarray):
    model_fn = get_model()
    frames_tensor = np.expand_dims(frames, axis=0).astype(np.float32)

    outputs = model_fn(tf.constant(frames_tensor))
    print("[DEBUG] Output keys:", list(outputs.keys()))

    preds = list(outputs.values())[0].numpy()[0]
    print("[DEBUG] Raw preds:", preds)

    return {
        "O": float(preds[0]),
        "C": float(preds[1]),
        "E": float(preds[2]),
        "A": float(preds[3]),
        "N": float(preds[4]),
    }
