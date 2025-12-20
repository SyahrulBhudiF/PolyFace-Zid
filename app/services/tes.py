import numpy as np
import torch
from .polyfacemodel import create_model_polyface3

device = torch.device("cpu")

def random_input(H=112, W=112, C=3, N=8):
    # random float in [0, 1]
    img = np.random.rand(N, H, W, C).astype('float32')
    # normalize seperti ImageNet
    mean = np.array([0.485, 0.456, 0.406], dtype=np.float32)
    std = np.array([0.229, 0.224, 0.225], dtype=np.float32)
    return ((img - mean) / std).astype('float32')


model = create_model_polyface3().to(device).eval()

for i in range(3):
    inp = random_input(N=8)
    x = torch.from_numpy(inp).permute(0,3,1,2).float().to(device)

    print("input mean:", x.mean().item(), "std:", x.std().item())

    with torch.no_grad():
        out = model(x)
    print(f"run {i} -> out shape: {out.shape}, mean/std: {out.mean().item():.6f}/{out.std().item():.6f}")
