# Generate pixel-art sprites with Pixellab. Reads PIXELLAB_API_KEY from the environment.
# Usage: python3 art/gen.py <out.png> <width> <height> "<description>" [seed]   (BG=1 for a background)
import base64, json, os, sys, urllib.request
out, w, h, desc = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
seed = int(sys.argv[5]) if len(sys.argv) > 5 else 0
# BG=1 in the environment makes a full background picture instead of a reel symbol.
BG = os.environ.get("BG") == "1"
STYLE = "" if BG else ", fruit machine reel symbol, bold outline, bright saturated colours, 1980s arcade pixel art"
body = {"description": desc + STYLE, "image_size": {"width": w, "height": h}, "no_background": not BG,
        "outline": "single color black outline", "shading": "basic shading", "detail": "medium detail"}
if seed: body["seed"] = seed
req = urllib.request.Request("https://api.pixellab.ai/v1/generate-image-pixflux", data=json.dumps(body).encode(),
    headers={"Authorization": "Bearer " + os.environ["PIXELLAB_API_KEY"], "Content-Type": "application/json"})
d = json.load(urllib.request.urlopen(req, timeout=180))
open(out, "wb").write(base64.b64decode(d["image"]["base64"]))
with open(os.path.join(os.path.dirname(__file__), "prompts", "log.jsonl"), "a") as f:
    f.write(json.dumps({"file": os.path.basename(out), "size": [w, h], "description": desc, "seed": seed}) + "\n")
print("ok", out)
