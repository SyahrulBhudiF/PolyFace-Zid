import os
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"

import types, sys

from tensorflow.keras.utils import get_file

from tensorflow.keras.utils import get_source_inputs

from app.services.polyfacemodel import create_model_polyface1, wrap_polyface_tf
sys.modules["keras.utils.layer_utils"] = types.SimpleNamespace(
    get_source_inputs=get_source_inputs,
    convert_all_kernels_in_model=lambda model: model
)

sys.modules['keras.engine.topology'] = types.SimpleNamespace(
    get_source_inputs=get_source_inputs
)

sys.modules["keras.utils.data_utils"] = types.SimpleNamespace(get_file=get_file)

import tensorflow as tf
from tensorflow import keras
from keras import layers, models, regularizers
from keras_vggface.vggface import VGGFace
import numpy as np

BASE_DIR = os.path.dirname(os.path.realpath(__file__))

MODEL_WEIGHTS = os.path.join(BASE_DIR, "models/polyface.t5")
print(f"[DEBUG] Final absolute path to model: {MODEL_WEIGHTS}")
model = None

def build_model():
    vgg_face_extractor = VGGFace(include_top=False, input_shape=(224, 224, 3), pooling='avg', weights='vggface')
    vgg_face_extractor.trainable = False

    video_input = layers.Input(shape=(10, 112, 112, 3), name='video_input')
    resized_sequence = layers.TimeDistributed(layers.Resizing(224, 224))(video_input)
    feature_sequence = layers.TimeDistributed(vgg_face_extractor)(resized_sequence)

    x = layers.LSTM(units=128, return_sequences=True, name='lstm1')(feature_sequence)
    x = layers.LSTM(units=64, name='lstm2')(x)

    x = layers.Dense(1024, activation='relu', kernel_regularizer=regularizers.l2(0.01), name='dense1')(x)
    x = layers.Dropout(0.3, name='dropout1')(x)

    x = layers.Dense(512, activation='relu', kernel_regularizer=regularizers.l2(0.01), name='dense2')(x)
    x = layers.Dropout(0.3, name='dropout2')(x)

    x = layers.Dense(256, activation='relu', kernel_regularizer=regularizers.l2(0.01), name='dense3')(x)
    x = layers.Dropout(0.5, name='dropout3')(x)

    final_output = layers.Dense(5, activation='sigmoid', name='OCEAN')(x)

    final_model = models.Model(inputs=video_input, outputs=final_output)

    ckpt = tf.train.Checkpoint(model=final_model)

    ckpt.restore(MODEL_WEIGHTS)

    print("[INFO] Weights restored.")
    return final_model

def load_model():
    global model
    if model is None:
        model = build_model()
    return model

def predict_ocean(frames):
    mdl = load_model()
    frames = np.expand_dims(frames, axis=0)
    preds = mdl.predict(frames)[0]

    return {
        "O": float(preds[0]) * 100,
        "C": float(preds[1]) * 100,
        "E": float(preds[2]) * 100,
        "A": float(preds[3]) * 100,
        "N": float(preds[4]) * 100,
    }
