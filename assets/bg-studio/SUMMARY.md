# Cutout: on-device background studio

**Pitch:** drop a photo and a 44 MB segmentation network cuts out the subject inside your browser. You then swap the background (colour, gradient or portrait blur) and drag a before/after divider. Nothing is uploaded.

**Stack:** static HTML/JS, transformers.js v3 with ONNX Runtime Web (WASM, multithreaded when cross-origin isolated). The model is `onnx-community/ormbg-ONNX` (open RMBG, ISNet architecture, Apache-2.0), int8-quantized, with weights vendored in `models/` so there are no network calls after load. Canvas compositing uses the soft alpha mask.

**Measured** (headless Chromium, 8-core box, WASM multithreaded, served by `serve.py` with COOP/COEP; CC0 sample photos at 1280 px):
- Model load from local files: **1.1–1.3 s**.
- Inference per image at 1024×1024 model input: **2.6–4.2 s** across separate runs on the same box (portrait, watch, dog). Times vary from run to run; I did not isolate the cause.
- Without cross-origin isolation (single-thread WASM), an earlier 1024×1280 portrait took **10.1 s**, about 3× slower.
- Foreground share of the mask: portrait 26%, watch 10%, dog 45%.

**Lessons**
- Serving headers mattered more than the model. A plain `http.server` cannot run threaded WASM, and adding COOP/COEP headers (`serve.py`) cut inference from 10.1 s to 3.4 s.
- transformers.js's web build disables local models by default, and the ISNet export expects `pixel_values` rather than `input`. Both failed silently until I captured page errors in Playwright.

**Limits:** no WebGPU path, so it is CPU only. Fine hair and soft edges are good but not studio-grade. The watch cutout keeps part of the table reflection. The sample photos are CC0 from Wikimedia Commons (see `photos/LICENSES.md`).

**Inspired by:** `temirlanzzz/scrapperbackgroundchanger` (scrape images, change the background colour from a mask).

Run it: `cd /workspace/portfolio-demos && python3 serve.py 8000`, then open `/bg-studio/`. Use `serve.py`, not a plain static server, to get the threaded speed.
