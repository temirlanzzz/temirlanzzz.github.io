# Label Less: active learning, live

**Pitch:** two identical classifiers start from the same 10 labels. One is fed random images, and the other asks for the images it is least sure about. A live curve shows the active learner reaching 90% accuracy with about half the labels.

**Stack:** static HTML/CSS/JS, no dependencies. Softmax regression and three uncertainty strategies (entropy, margin, least-confident) are written from scratch and run in the browser. The canvas chart is hand-drawn. Data is the UCI optical digits set (sklearn `load_digits`, 1,797 images at 8×8), split into a 1,297-image pool and a fixed 500-image held-out test set.

**Measured** (margin sampling, batch of 10, 5 seeds, from `bench()` in headless Chromium):
- Labels needed to reach 90% test accuracy: **active 80 on average** (range 70–100) vs **random 150** (100–190), about 47% fewer.
- At 100 labels: **92.1%** active vs **88.1%** random (5-seed mean).
- The active learner reached **95%** at 160–220 labels, which matches training on all 1,297 labels (95.0%). Random never reached 95% within 300 labels.
- One seed of the entropy strategy (seed 2) was slower than random to reach 90% (140 vs 100). Margin was the most reliable of the three, so it is the default.

**Lessons**
- Uncertainty sampling is not a free win. Entropy sampling lost to random on one seed, because at 10 labels the model's uncertainty is itself unreliable. Benchmarking several seeds and strategies changed the default.
- My first "all labels" baseline was undertrained (92.8% at 300 iterations), which made active learning look better than full supervision. Training to convergence (1,500 iterations, 95.0%) fixed a flattering but false comparison.

**Limits:** a toy dataset (8×8 digits) with a linear model and a simulated oracle that uses ground-truth labels. It shows the mechanism, not the 90% labeling-cost figure from the resume.

**Inspired by:** `temirlanzzz/IML` (accuracy vs interpretability on MNIST/Iris/Diabetes) and the active-learning labeling loop at Sewts (resume).

Run it: `cd /workspace/portfolio-demos && python3 serve.py 8000`, then open `/active-learning/`.
