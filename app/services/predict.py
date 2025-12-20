import os
import tensorflow as tf
from tensorflow import keras
from keras import layers, models
import numpy as np
import torch
from .polyfacemodel import create_model_polyface3
from .polyfacemodels2 import wrap_polyface_tf

BASE_DIR = os.path.dirname(os.path.realpath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "1127_145313", "polyface.t5")
MODEL_PATH_H5 = os.path.join(BASE_DIR, "models", "keras", "polyface_adagrad.h5")

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

def build_model():
    """Build the model architecture (same as app.py)"""
    polyface_model_tf = wrap_polyface_tf(create_model_polyface3())
    polyface_tflayer = polyface_model_tf.layers[-1]  # ambil layer-nya
    polyface_tflayer.trainable = False  # freeze weights

    inputs = layers.Input(shape=(10, 112, 112, 3), name='input_video')
    x = layers.TimeDistributed(polyface_tflayer, name='polyface112')(inputs)
    x = layers.LSTM(units=128, return_sequences=True)(x)
    x = layers.LSTM(units=64)(x)
    x = layers.Dropout(0.2)(x)
    x = layers.Dense(units=1024)(x)
    x = layers.Dense(units=512, activation='relu')(x)
    x = layers.Dense(256, activation='relu')(x)
    x = layers.Dropout(0.5)(x)
    outputs = layers.Dense(5, activation='sigmoid', name='OCEAN')(x)
    return models.Model(inputs, outputs)

def get_model():
    global _model_instance
    if _model_instance is None:
        checkpoint_path = MODEL_PATH
        checkpoint_dir = os.path.dirname(checkpoint_path)
        checkpoint_name = os.path.basename(checkpoint_path)
        
        checkpoint_meta_file = os.path.join(checkpoint_dir, "checkpoint")
        if os.path.exists(checkpoint_meta_file):
            with open(checkpoint_meta_file, 'r') as f:
                content = f.read()
                if 'model_checkpoint_path:' in content:
                    import re
                    match = re.search(r'model_checkpoint_path:\s*"([^"]+)"', content)
                    if match:
                        checkpoint_name = match.group(1)
        data_file = os.path.join(checkpoint_dir, checkpoint_name + ".data-00000-of-00001")
        index_file = os.path.join(checkpoint_dir, checkpoint_name + ".index")
        if not os.path.exists(data_file):
            raise FileNotFoundError(
                f"Checkpoint data file not found: {data_file}. "
                f"Available files in {checkpoint_dir}: {os.listdir(checkpoint_dir)}"
            )
        else:
            checkpoint_path = os.path.join(checkpoint_dir, checkpoint_name)
        try:
            _model_instance = build_model()
            try:
                _model_instance.load_weights(checkpoint_path)
                ocean_layer = _model_instance.get_layer('OCEAN')
                ocean_weights = ocean_layer.get_weights()
            except Exception as e1:
                try:
                    _model_instance.load_weights(checkpoint_path, by_name=True, skip_mismatch=True)
                except Exception as e2:
                    print(f"[METHOD 2] ❌ FAILED: {e2}")
                    try:
                        checkpoint = tf.train.Checkpoint(model=_model_instance)
                        status = checkpoint.restore(checkpoint_path)
                        status.expect_partial()
                    except Exception as e3:
                        print(f"[METHOD 3] ❌ FAILED: {e3}")
                        try:
                            reader = tf.train.load_checkpoint(checkpoint_path)
                            var_names_in_checkpoint = []
                            try:
                                from tensorflow.python.training import checkpoint_utils
                                var_list = checkpoint_utils.list_variables(checkpoint_path)
                                var_names_in_checkpoint = [name for name, _ in var_list]
                            except Exception as list_err:
                                print(f"Could not list variables: {list_err}")
                            for var in _model_instance.trainable_variables + _model_instance.non_trainable_variables:
                                var_name = var.name.replace(':0', '').replace('model/', '')
                                name_variations = [
                                    var_name,
                                    var_name.replace('/kernel', '/weights'),
                                    var_name.replace('/bias', '/biases'),
                                    'model/' + var_name,
                                    var_name.replace('layer_with_weights-', ''),
                                ]
                                
                                loaded = False
                                for name_var in name_variations:
                                    try:
                                        value = reader.get_tensor(name_var)
                                        if value.shape == var.shape:
                                            var.assign(value)
                                            print(f"[METHOD 4] ✅ Loaded: {name_var} -> {var_name} (shape: {var.shape})")
                                            loaded_count += 1
                                            loaded = True
                                            break
                                    except Exception:
                                        continue
                                
                                if not loaded:
                                    print(f"[METHOD 4] ⚠️  Could not load: {var_name} (shape: {var.shape})")
                                    skipped_count += 1
                            
                            print(f"[METHOD 4] Summary: Loaded {loaded_count} variables, skipped {skipped_count} variables")
                            if loaded_count > 0:
                                print("[METHOD 4] ✅ SUCCESS: Weights loaded using explicit checkpoint reader")
                            else:
                                raise RuntimeError("No variables were loaded from checkpoint")
                        except Exception as e4:
                            print(f"[METHOD 4] ❌ FAILED: {e4}")
                            # Method 5: Try loading from H5 file as fallback
                            print("\n" + "=" * 80)
                            print("[FALLBACK] All checkpoint loading methods failed!")
                            print("[FALLBACK] Attempting to load from H5 file as fallback...")
                            print("=" * 80)
                            if os.path.exists(MODEL_PATH_H5):
                                h5_size = os.path.getsize(MODEL_PATH_H5) / (1024 * 1024)  # MB
                                print(f"[FALLBACK] ✅ H5 file found: {MODEL_PATH_H5}")
                                print(f"[FALLBACK] H5 file size: {h5_size:.2f} MB")
                                try:
                                    print(f"[METHOD 5] Loading from H5 file: {MODEL_PATH_H5}")
                                    from tensorflow.keras.layers import Rescaling, LSTM
                                    
                                    # Create compatible LSTM for H5 format
                                    class CompatibleLSTM(LSTM):
                                        def __init__(self, *args, **kwargs):
                                            kwargs.pop('time_major', None)
                                            super().__init__(*args, **kwargs)
                                        
                                        @classmethod
                                        def from_config(cls, config):
                                            if isinstance(config, dict):
                                                config = config.copy()
                                                config.pop('time_major', None)
                                            return super().from_config(config)
                                    
                                    _model_instance = tf.keras.models.load_model(
                                        MODEL_PATH_H5,
                                        custom_objects={
                                            "Rescaling": Rescaling,
                                            "LSTM": CompatibleLSTM,
                                        },
                                        compile=False
                                    )
                                except Exception as e5:
                                    raise RuntimeError(
                                        f"❌ ALL LOADING METHODS FAILED:\n"
                                        f"1. load_weights(): {e1}\n"
                                        f"2. load_weights(by_name=True): {e2}\n"
                                        f"3. tf.train.Checkpoint: {e3}\n"
                                        f"4. Explicit checkpoint reader: {e4}\n"
                                        f"5. H5 fallback: {e5}\n"
                                        f"\nCheckpoint path: {checkpoint_path}\n"
                                        f"H5 path: {MODEL_PATH_H5}\n"
                                        f"Files in checkpoint dir: {os.listdir(checkpoint_dir)}"
                                    ) from e5
                            else:
                                print(f"[FALLBACK] ❌ H5 file not found: {MODEL_PATH_H5}")
                                raise RuntimeError(
                                    f"❌ ALL LOADING METHODS FAILED AND H5 FALLBACK NOT FOUND:\n"
                                    f"1. load_weights(): {e1}\n"
                                    f"2. load_weights(by_name=True): {e2}\n"
                                    f"3. tf.train.Checkpoint: {e3}\n"
                                    f"4. Explicit checkpoint reader: {e4}\n"
                                    f"\nCheckpoint path: {checkpoint_path}\n"
                                    f"H5 path: {MODEL_PATH_H5} (NOT FOUND)\n"
                                    f"Files in checkpoint dir: {os.listdir(checkpoint_dir)}"
                                ) from e4
            
            # Verify weights are loaded (not random)
            print("\n" + "=" * 80)
            print("[WEIGHTS VERIFICATION] Verifying loaded weights...")
            print("=" * 80)
            
            # Check all trainable layers
            try:
                print("[WEIGHTS VERIFICATION] Checking all trainable layers...")
                trainable_layers = [layer for layer in _model_instance.layers if layer.trainable]
                print(f"[WEIGHTS VERIFICATION] Found {len(trainable_layers)} trainable layers")
                
                layers_with_weights = 0
                layers_without_weights = 0
                layers_with_zero_bias = []
                
                for layer in trainable_layers:
                    weights = layer.get_weights()
                    if len(weights) > 0:
                        layers_with_weights += 1
                        # Check if layer has bias
                        if len(weights) >= 2:
                            bias = weights[1]
                            if np.allclose(bias, 0, atol=1e-6):
                                layers_with_zero_bias.append(layer.name)
                    else:
                        layers_without_weights += 1
                        print(f"[WEIGHTS VERIFICATION] ⚠️  Layer '{layer.name}' has NO weights!")
                
                ocean_layer = _model_instance.get_layer('OCEAN')
                ocean_weights = ocean_layer.get_weights()
                if len(ocean_weights) > 0:
                    kernel = ocean_weights[0]
                    bias = ocean_weights[1] if len(ocean_weights) > 1 else None
                    print(f"\n[WEIGHTS VERIFICATION] OCEAN layer (output):")
                    print(f"[WEIGHTS VERIFICATION]   Kernel shape: {kernel.shape}")
                    print(f"[WEIGHTS VERIFICATION]   Kernel sample (first 5 values): {kernel.flatten()[:5]}")
                    print(f"[WEIGHTS VERIFICATION]   Kernel mean: {kernel.mean():.6f}, std: {kernel.std():.6f}")
                    print(f"[WEIGHTS VERIFICATION]   Kernel min: {kernel.min():.6f}, max: {kernel.max():.6f}")
                    if bias is not None:
                        print(f"[WEIGHTS VERIFICATION]   Bias: {bias}")
                        print(f"[WEIGHTS VERIFICATION]   Bias mean: {bias.mean():.6f}, std: {bias.std():.6f}")
                        print(f"[WEIGHTS VERIFICATION]   Bias min: {bias.min():.6f}, max: {bias.max():.6f}")
                        bias_mean = np.abs(bias).mean()
                        if bias_mean < 0.001:
                            print("[WEIGHTS VERIFICATION] ⚠️  WARNING: OCEAN bias is all zeros or near-zero!")
                            print("[WEIGHTS VERIFICATION] ⚠️  This might indicate:")
                            print("[WEIGHTS VERIFICATION] ⚠️    1. Model was trained with bias_constraint or bias_initializer='zeros'")
                            print("[WEIGHTS VERIFICATION] ⚠️    2. Checkpoint might be from early training stage")
                            print("[WEIGHTS VERIFICATION] ⚠️    3. Weights not loaded correctly for bias")
                        else:
                            print("[WEIGHTS VERIFICATION] ✅ OCEAN bias has non-zero values")
                    
                    # Check if weights look random (very small std or all zeros)
                    if kernel.std() < 0.001:
                        print("[WEIGHTS VERIFICATION] ⚠️  WARNING: Kernel weights have very low std!")
                    if np.allclose(kernel, 0):
                        print("[WEIGHTS VERIFICATION] ⚠️  WARNING: Kernel weights are all zeros!")
                    else:
                        print("[WEIGHTS VERIFICATION] ✅ OCEAN kernel has non-zero values")
                else:
                    print("[WEIGHTS VERIFICATION] ❌ OCEAN layer has NO weights!")
                
                # Check LSTM layers
                lstm_layers = [layer for layer in _model_instance.layers if 'lstm' in layer.name.lower()]
                if lstm_layers:
                    print(f"\n[WEIGHTS VERIFICATION] LSTM layers found: {len(lstm_layers)}")
                    for i, lstm in enumerate(lstm_layers):
                        lstm_weights = lstm.get_weights()
                        if len(lstm_weights) > 0:
                            print(f"[WEIGHTS VERIFICATION] LSTM {i+1} ({lstm.name}):")
                            print(f"[WEIGHTS VERIFICATION]   Has {len(lstm_weights)} weight arrays")
                            kernel = lstm_weights[0]
                            print(f"[WEIGHTS VERIFICATION]   Kernel shape: {kernel.shape}")
                            print(f"[WEIGHTS VERIFICATION]   Kernel mean: {kernel.mean():.6f}, std: {kernel.std():.6f}")
                        else:
                            print(f"[WEIGHTS VERIFICATION] ⚠️  LSTM {i+1} ({lstm.name}) has NO weights!")
                
                # Check Dense layers
                dense_layers = [layer for layer in _model_instance.layers if 'dense' in layer.name.lower() and layer.name != 'OCEAN']
                if dense_layers:
                    print(f"\n[WEIGHTS VERIFICATION] Dense layers found: {len(dense_layers)}")
                    for i, dense in enumerate(dense_layers):
                        dense_weights = dense.get_weights()
                        if len(dense_weights) > 0:
                            kernel = dense_weights[0]
                            print(f"[WEIGHTS VERIFICATION] Dense {i+1} ({dense.name}): kernel shape {kernel.shape}, mean {kernel.mean():.6f}")
                        else:
                            print(f"[WEIGHTS VERIFICATION] ⚠️  Dense {i+1} ({dense.name}) has NO weights!")
                
                print("\n[WEIGHTS VERIFICATION] ✅ Weight verification completed")
            except Exception as e:
                print(f"[WEIGHTS VERIFICATION] ⚠️  Could not verify weights: {e}")
                import traceback
                print(f"[WEIGHTS VERIFICATION] Traceback: {traceback.format_exc()}")
            
            print("\n" + "=" * 80)
            print("[MODEL LOADING] ✅ Model loading completed successfully!")
            print(f"[MODEL LOADING] Final model type: {type(_model_instance)}")
            print("=" * 80)
        except Exception as e:
            print(f"[ERROR] Failed to load model: {e}")
            _model_instance = None
            raise RuntimeError(f"Failed to load model from checkpoint {checkpoint_path}: {e}") from e
    else:
        print("[MODEL LOADING] Model instance already exists (cached), reusing...")
        print(f"[MODEL LOADING] Model type: {type(_model_instance)}")
        # Still verify weights even if cached
        try:
            ocean_layer = _model_instance.get_layer('OCEAN')
            ocean_weights = ocean_layer.get_weights()
            if len(ocean_weights) > 0:
                kernel = ocean_weights[0]
                bias = ocean_weights[1] if len(ocean_weights) > 1 else None
                print(f"[MODEL LOADING] Cached model - OCEAN kernel std: {kernel.std():.6f}")
                if bias is not None:
                    bias_mean = np.abs(bias).mean()
                    print(f"[MODEL LOADING] Cached model - OCEAN bias mean: {bias_mean:.6f}")
        except Exception as e:
            raise RuntimeError(f"Failed to load model from cache: {e}") from e
    # Final check to ensure model is not None
    if _model_instance is None:
        raise RuntimeError("Model instance is None. Failed to load model.")
    
    return _model_instance

def get_feature_extractor():
    global _feature_extractor_instance
    if _feature_extractor_instance is None:
        polyface_model = create_model_polyface3().to(device).eval()
        _feature_extractor_instance = polyface_model
    return _feature_extractor_instance

def preprocess(frames: np.ndarray):
    """
    Preprocess frames for the OCEAN model.
    Model expects input shape: (batch, 10, 112, 112, 3)
    """
    frames = frames.astype(np.float32)
    
    # Normalize to [0, 1] range (if not already)
    if frames.max() > 1.0:
        frames = frames / 255.0
    
    # Ensure correct shape: (batch, 10, 112, 112, 3)
    if frames.ndim == 4:
        # Shape: (10, 112, 112, 3) -> add batch dimension
        frames = np.expand_dims(frames, axis=0)
    elif frames.ndim == 3:
        # Shape: (H, W, C) -> should not happen, but handle it
        raise ValueError(f"Unexpected frame shape: {frames.shape}. Expected (10, 112, 112, 3) or (batch, 10, 112, 112, 3)")
    
    # Ensure we have exactly 10 frames
    if frames.shape[1] != 10:
        if frames.shape[1] > 10:
            frames = frames[:, :10, :, :, :]
        else:
            raise ValueError(f"Expected 10 frames, got {frames.shape[1]}")
    
    return frames

def predict_ocean(frames: np.ndarray):    
    model = get_model()
    
    if model is None:
        raise RuntimeError("Model is None. Cannot perform prediction.")
    
    if not hasattr(model, 'predict'):
        raise AttributeError(f"Model object (type: {type(model)}) does not have 'predict' method.")
    
    frames_tensor = preprocess(frames)
    
    try:
        preds = model.predict(frames_tensor, verbose=0)
        print(f"[PREDICTION] ✅ Prediction completed")
        print(f"[PREDICTION] Raw predictions shape: {preds.shape}")
        print(f"[PREDICTION] Raw predictions: {preds}")
    except Exception as e:
        print(f"[PREDICTION] ❌ Error during prediction: {e}")
        raise RuntimeError(f"Prediction failed: {e}") from e
    
    if preds is None or len(preds) == 0:
        raise RuntimeError("Model prediction returned empty result.")
    
    preds = preds[0]

    # Format output seperti di app.py: nama trait lengkap dan nilai dalam persen
    traits = ["Openness", "Conscientiousness", "Extraversion", "Agreeableness", "Neuroticism"]
    result = {trait: round(score * 100, 2) for trait, score in zip(traits, preds)}
    
    print(f"[PREDICTION] Final OCEAN scores:")
    for trait, score in result.items():
        print(f"[PREDICTION]   {trait}: {score}%")
    
    # Check if predictions are suspicious (all close to 0.5)
    scores_list = list(result.values())
    mean_score = np.mean(scores_list)
    std_score = np.std(scores_list)

    clear_model_cache()

    return result

