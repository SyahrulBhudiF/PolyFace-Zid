import torch
import torch.nn as nn
from .EfficientPolyFace import apolynet_stodepth, apolynet_stodepth_deep, apolynet_stodepth_deeper

class PolyFaceBase(nn.Module):
    """Base class for PolyFace models"""
    def __init__(self, feature_dim=256):
        super().__init__()
        # Preprocessing parameters (sesuai EfficientPolyFace)
        self.register_buffer('scale', torch.tensor(3.2/255.0))
        self.register_buffer('shift', torch.tensor(-1.6))

    def preprocess(self, x):
        """Normalize input to [-1.6, 1.6] range"""
        return x * self.scale + self.shift

def create_model_polyface1(feature_dim=256, input_shape=(112, 112, 3)):
    """Shallow version (apolynet_stodepth)"""
    class PolyFace1(PolyFaceBase):
        def __init__(self, feature_dim):
            super().__init__(feature_dim)
            self.backbone = apolynet_stodepth(feature_dim)

        def forward(self, x):
            # x: (B,H,W,C) -> (B,C,H,W)
            x = self.preprocess(x)
            features = self.backbone(x)['feature']
            return nn.functional.normalize(features, p=2, dim=1)

    return PolyFace1(feature_dim)

def create_model_polyface2(feature_dim=256, input_shape=(112, 112, 3)):
    """Deeper version (apolynet_stodepth_deep)"""
    class PolyFace2(PolyFaceBase):
        def __init__(self, feature_dim):
            super().__init__(feature_dim)
            self.backbone = apolynet_stodepth_deep(feature_dim)

        def forward(self, x):
            x = self.preprocess(x)
            features = self.backbone(x)['feature']
            return nn.functional.normalize(features, p=2, dim=1)

    return PolyFace2(feature_dim)

def create_model_polyface3(feature_dim=256, input_shape=(112, 112, 3)):
    """Deepest version (apolynet_stodepth_deeper)"""
    class PolyFace3(PolyFaceBase):
        def __init__(self, feature_dim):
            super().__init__(feature_dim)
            self.backbone = apolynet_stodepth_deeper(feature_dim)

        def forward(self, x):
            x = self.preprocess(x)
            features = self.backbone(x)['feature']
            return nn.functional.normalize(features, p=2, dim=1)

    return PolyFace3(feature_dim)



# --------------------------------------------------
# Versi untuk TensorFlow/Keras (jika diperlukan)
# --------------------------------------------------
def wrap_polyface_tf(polyface_model, input_shape=(112, 112, 3)):
    import tensorflow as tf
    import torch
    import numpy as np

    class PolyFaceTF(tf.keras.layers.Layer):
        def __init__(self, polyface_model):
            super().__init__()
            self.polyface = polyface_model.eval()

        def call(self, inputs):
            def tf_to_torch(x):
                # pastikan input sudah numpy
                if isinstance(x, tf.Tensor):
                    x = x.numpy()

                # Cetak bentuk untuk debugging
                #print("Sebelum transpose:", x.shape)

                # Jika input sudah (B,112,112,3), transpose jadi (B,3,112,112)
                x = x.transpose(0, 3, 1, 2)

               # print("Setelah transpose:", x.shape)

                x_torch = torch.from_numpy(x).float()

                with torch.no_grad():
                    features = polyface_model(x_torch)

                return features.cpu().numpy().astype(np.float32)

            features = tf.py_function(func=tf_to_torch, inp=[inputs], Tout=tf.float32)
            features.set_shape([None, 256])  # harus ditentukan untuk Keras
            return features

    inputs = tf.keras.Input(shape=input_shape)
    outputs = PolyFaceTF(polyface_model)(inputs)
    return tf.keras.Model(inputs=inputs, outputs=outputs)

# Contoh penggunaan:
if __name__ == "__main__":
    # Versi PyTorch
    model1 = create_model_polyface1()  # Shallow
    model2 = create_model_polyface2()  # Deep
    model3 = create_model_polyface3()  # Deeper

    # Versi TensorFlow (opsional)
    tf_model1 = wrap_polyface_tf(model1)
    print(tf_model1.summary())
