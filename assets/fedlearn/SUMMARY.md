# FedAvg, live: federated learning playground

**Pitch:** eight clients each keep a private slice of handwritten digits and train one shared model by exchanging only weights (Federated Averaging). A slider adds label skew so you can watch non-IID data hurt.

**Stack:** static HTML/JS/SVG, no dependencies. A 64→32→10 MLP with backprop and mini-batch SGD, written from scratch. FedAvg weights each update by client sample count. Each round also trains a centralized baseline (same epochs, pooled data) and per-client local-only models. Data is the UCI optical digits set (sklearn): 1,297 training images split across 8 clients, with 500 held out for testing.

**Measured** (30 rounds, 2 local epochs, 8 of 8 clients, from `bench()` in headless Chromium):
- IID (skew 0.0): **FedAvg 95.0%** vs centralized 97.8%; the mean local-only model reached 90.0%.
- Fully skewed (skew 1.0, each client holds 2 digits): **FedAvg 90.8%** vs centralized 97.6%; local-only models collapse to **33.0%**.
- At skew 0.9, FedAvg needed about 25 rounds to reach 87.8%; at skew 0.0 it took about 15 rounds.
- Communication: 2,410 params (9.4 KB per model), so **4,519 KB** is exchanged over 30 rounds vs **81 KB** of raw pixels kept on-device.

**Lessons**
- Federated learning protects privacy, not bandwidth. On a small dataset, the weights sent back and forth are about 55× larger than the raw data. That trade-off is worth saying out loud.
- Non-IID is the real story. FedAvg still recovers a decent global model from clients that alone are 33% accurate, but it trails centralized training by about 7 points.

**Limits:** a simulation in one browser tab, with no secure aggregation and no differential privacy. A tiny model on 8×8 digits. The bars and packets are a visualization of the real computation, not of network traffic.

**Inspired by:** `temirlanzzz/IML` and `temirlanzzz/strokeML` (ML on sensitive medical/tabular data), plus his interest in federated ML.

Run it: `cd /workspace/portfolio-demos && python3 serve.py 8000`, then open `/fedlearn/`.
