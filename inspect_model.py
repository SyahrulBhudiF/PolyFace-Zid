import torch
import sys

def main(path):
    state = torch.load(path, map_location="cpu", weights_only=True)
    for k, v in state.items():
        print(f"{k}: {v.shape}")

if __name__ == "__main__":
    main(sys.argv[1])
