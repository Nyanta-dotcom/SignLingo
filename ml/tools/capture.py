"""Temporary webcam capture tool for P1-21 (same output format as the future /collect page).

    python ml/tools/capture.py --signer S01              # all 24 letters, 40 frames each
    python ml/tools/capture.py --signer S02 --letters A B C --frames 30

Needs: pip install opencv-python mediapipe, and the MediaPipe hand model at
ml/data/models/hand_landmarker.task. Only landmark coordinates are saved (no images, no video) to
ml/data/raw/webcam/landmarks_<signer>_<time>.json. The signer code is anonymous (S01, S02...).
Keys: SPACE start a letter (3 s countdown) | S skip | Q save what you have and quit.
The frame given to MediaPipe is NOT mirrored (like the web app); only the preview is mirrored.
"""

import argparse
import time
import uuid
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

from signlingo_ml.config import LABELS, ROOT
from signlingo_ml.landmarks.capture_io import build_document, sample_from_frames, write_document

MODEL = ROOT / "data" / "models" / "hand_landmarker.task"
OUT = ROOT / "data" / "raw" / "webcam"


def _detect(detector, frame_bgr):
    img = mp.Image(
        image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
    )
    res = detector.detect(img)
    if not res.hand_landmarks:
        return None, None
    pts = np.array([[p.x, p.y, p.z] for p in res.hand_landmarks[0]])
    return pts, res.handedness[0][0].category_name


def _read(cap):
    ok, frame = cap.read()
    if not ok:
        raise SystemExit("cannot read from the camera (wrong --camera index or camera in use?)")
    return frame


def _show(frame, lines):
    view = cv2.flip(frame, 1)
    for i, t in enumerate(lines):
        cv2.putText(view, t, (10, 30 + 30 * i), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
    cv2.imshow("SignLingo capture", view)
    return cv2.waitKey(1) & 0xFF


def main(argv=None) -> None:
    ap = argparse.ArgumentParser(description="Capture hand landmarks for the signer holdout.")
    ap.add_argument("--signer", required=True, help="anonymous code, e.g. S01")
    ap.add_argument("--letters", nargs="+", default=LABELS, choices=LABELS)
    ap.add_argument("--frames", type=int, default=40, help="frames kept per letter")
    ap.add_argument("--camera", type=int, default=0)
    ap.add_argument("--out", default=str(OUT))
    args = ap.parse_args(argv)
    build_document(args.signer, "check", [], {})  # fail early on a bad signer code
    opts = vision.HandLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=str(MODEL)), num_hands=1
    )
    cap, samples, quit_all = cv2.VideoCapture(args.camera), [], False
    with vision.HandLandmarker.create_from_options(opts) as detector:
        for letter in args.letters:
            if quit_all:
                break
            while True:  # wait for SPACE / S / Q
                frame = _read(cap)
                key = _show(frame, [f"Letter {letter}", "SPACE = start, S = skip, Q = save+quit"])
                if key in (ord(" "), ord("s"), ord("q")):
                    break
            if key == ord("q"):
                break
            if key == ord("s"):
                continue
            t0 = time.time()
            while time.time() - t0 < 3:
                frame = _read(cap)
                _show(frame, [f"Letter {letter}", f"Get ready... {3 - int(time.time() - t0)}"])
            kept, hand = [], "Right"
            while len(kept) < args.frames:
                frame = _read(cap)
                pts, hand_seen = _detect(detector, frame)
                if pts is not None:
                    kept.append(pts)
                    hand = hand_seen
                if _show(
                    frame, [f"Letter {letter}", f"Recording {len(kept)}/{args.frames}"]
                ) == ord("q"):
                    quit_all = True
                    break
            if kept:
                samples.append(sample_from_frames(letter, kept, hand))
    cap.release()
    cv2.destroyAllWindows()
    if not samples:
        raise SystemExit("nothing captured, no file written")
    w, h = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    doc = build_document(
        args.signer, str(uuid.uuid4()), samples, {"camera": {"width": w, "height": h}}
    )
    print("saved", write_document(doc, Path(args.out)), f"({len(samples)} letters)")


if __name__ == "__main__":
    main()
