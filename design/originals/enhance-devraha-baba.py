import sys, cv2, numpy as np
src, out = sys.argv[1], sys.argv[2]
img = cv2.imread(src).astype(np.float32)

# 1) Faded-print restoration: stretch each channel between its 0.5th and 99.5th percentile.
#    Faded prints lose different amounts of each dye; per-channel levels undo that
#    without pushing the whole picture toward a new colour.
def levels(x, lo_p=0.5, hi_p=99.5):
    out = np.empty_like(x)
    for c in range(3):
        lo, hi = np.percentile(x[:, :, c], (lo_p, hi_p))
        out[:, :, c] = (x[:, :, c] - lo) * (255.0 / max(hi - lo, 1))
    return np.clip(out, 0, 255)

x = levels(img)
# 2) Tame the remaining magenta: pull only the LAB 'a' (green–magenta) axis partly back to neutral.
lab = cv2.cvtColor(x.astype(np.uint8), cv2.COLOR_BGR2LAB).astype(np.float32)
lab[:, :, 1] -= (lab[:, :, 1].mean() - 128) * 0.6
excess = np.clip(lab[:, :, 1] - 132, 0, None)  # how magenta each pixel still is
lab[:, :, 1] -= excess * 0.55
lab[:, :, 2] += excess * 0.25               # nudge those tones slightly warmer (skin)
x = cv2.cvtColor(np.clip(lab, 0, 255).astype(np.uint8), cv2.COLOR_LAB2BGR)
# 3) Very light denoise (removes film specks; keeps beard and skin texture).
x = cv2.fastNlMeansDenoisingColored(x, None, 2, 2, 5, 15)
# 4) Gentle local contrast.
lab = cv2.cvtColor(x, cv2.COLOR_BGR2LAB); l, a, b = cv2.split(lab)
l = cv2.createCLAHE(clipLimit=1.15, tileGridSize=(8, 8)).apply(l)
x = cv2.cvtColor(cv2.merge((l, a, b)), cv2.COLOR_LAB2BGR)
# 5) 2x Lanczos upscale, then a single mild unsharp mask.
x = cv2.resize(x, None, fx=2, fy=2, interpolation=cv2.INTER_LANCZOS4)
blur = cv2.GaussianBlur(x, (0, 0), 1.6)
x = cv2.addWeighted(x, 1.45, blur, -0.45, 0)
cv2.imwrite(out, x, [cv2.IMWRITE_JPEG_QUALITY, 93])
