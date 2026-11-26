#!/usr/bin/env python3
"""Download the three ONNX models and verify each against a pinned SHA-256.

Usage: python scripts/fetch_models.py [directory]   (default: models/)

Standard library only, so it runs before any dependency is installed.
"""

import hashlib
import sys
import urllib.request
from pathlib import Path

MODELS = {
    "face_detection_yunet_2023mar.onnx": (
        "https://github.com/opencv/opencv_zoo/raw/48b10fa505aeb51fbd127fc60a5c660040e823b7"
        "/models/face_detection_yunet/face_detection_yunet_2023mar.onnx",
        "8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4",
    ),
    "fairface.onnx": (
        "https://github.com/yakhyo/fairface-onnx/releases/download/weights/fairface.onnx",
        "9c8c47d437cd310538d233f2465f9ed0524cb7fb51882a37f74e8bc22437fdbf",
    ),
    "enet_b2_8.onnx": (
        "https://github.com/av-savchenko/face-emotion-recognition/raw"
        "/520a051c64cd191521e5934655314e769a319684"
        "/models/affectnet_emotions/onnx/enet_b2_8.onnx",
        "180a9d4845b59393de4511598a0d1d34b705034691ea32959ce5009db7cf52b7",
    ),
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        while chunk := file.read(1 << 20):
            digest.update(chunk)
    return digest.hexdigest()


def fetch(name: str, url: str, expected: str, directory: Path) -> None:
    target = directory / name
    if target.exists() and sha256(target) == expected:
        print(f"ok       {name}")
        return
    print(f"fetching {name}")
    partial = target.with_suffix(".part")
    urllib.request.urlretrieve(url, partial)  # noqa: S310 (fixed https URLs above)
    actual = sha256(partial)
    if actual != expected:
        partial.unlink()
        sys.exit(f"checksum mismatch for {name}: expected {expected}, got {actual}")
    partial.replace(target)


def main() -> None:
    directory = Path(sys.argv[1] if len(sys.argv) > 1 else "models")
    directory.mkdir(parents=True, exist_ok=True)
    for name, (url, expected) in MODELS.items():
        fetch(name, url, expected, directory)


if __name__ == "__main__":
    main()
