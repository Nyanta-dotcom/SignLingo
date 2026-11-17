"""Image augmentation for the CNN: rotation, shift, zoom, brightness/contrast. NO horizontal flip.

A flip turns a right-hand sign into a left-hand sign and can change the meaning of a letter
(docs/02 §4.1). The default ranges are design hypotheses to be justified on validation,
not verified facts.
"""

import numpy as np
from scipy.ndimage import affine_transform

from signlingo_ml.config import SEED


def augment_batch(
    X: np.ndarray,
    seed: int = SEED,
    p: float = 0.7,
    rotation: float = 10.0,
    shift: float = 2.0,
    zoom: tuple[float, float] = (0.9, 1.1),
    brightness: float = 0.15,
    contrast: float = 0.15,
) -> np.ndarray:
    """Randomly augment each (28, 28) image in [0, 1] with probability `p`.

    rotation in degrees (+/-), shift in pixels (+/-), zoom factor range, brightness as an
    additive offset (+/-) and contrast as a multiplicative factor around 0.5 (1 +/- contrast).
    """
    rng = np.random.default_rng(seed)
    out = np.empty_like(X, dtype=np.float32)
    c = (np.array(X.shape[1:]) - 1) / 2.0
    for i, img in enumerate(X):
        # draw every parameter for every image so the stream does not depend on `p`
        take = rng.random() < p
        ang = np.deg2rad(rng.uniform(-rotation, rotation))
        z = rng.uniform(*zoom)
        dy, dx = rng.uniform(-shift, shift, size=2)
        b = rng.uniform(-brightness, brightness)
        k = 1.0 + rng.uniform(-contrast, contrast)
        if not take:
            out[i] = img
            continue
        cos, sin = np.cos(ang), np.sin(ang)
        # output->input mapping: rotate and scale about the centre, then translate
        m = np.array([[cos, -sin], [sin, cos]]) / z
        offset = c - m @ c + np.array([dy, dx])
        warped = affine_transform(img, m, offset=offset, order=1, mode="constant", cval=0.0)
        out[i] = np.clip((warped - 0.5) * k + 0.5 + b, 0.0, 1.0)
    return out
