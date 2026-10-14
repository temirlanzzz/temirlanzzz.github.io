# Portfolio demo candidates (ranked)

Ordering favours ML/CV first (papers, diffusion, active learning, labeling cost), agent/LLM tools second, so the set reads as one profile. Graft and the provenance tracer are excluded because they already exist.

1. **Active-learning labeler** (`active-learning`). Label 30 images instead of 300: uncertainty sampling picks what to label next, and a live curve races it against random picks.
   Why it's impressive: it puts his resume's "−90% labeling cost" (Sewts) on screen as a measured, reproducible curve, trained in the browser. Inspired by IML (accuracy/interpretability tradeoffs on MNIST) and the resume.
2. **Background studio** (`bg-studio`). Drop a photo, an in-browser segmentation model cuts out the subject, and you swap the background with a before/after slider.
   Why it's impressive: real CV running on-device, with no server or key. It modernises `scrapperbackgroundchanger` (mask-based background colour change).
3. **Federated learning playground** (`fedlearn`). Eight simulated hospitals/devices train one digit classifier with FedAvg without sharing data, with a non-IID slider and a centralized baseline.
   Why it's impressive: a privacy-ML concept shown as live, honest numbers, with the gap between IID and non-IID visible. Inspired by IML, strokeML (medical data), and his stated interest.
4. **pytest for facts** (`factcheck`). Write claims as test cases against a source document, and an in-browser NLI model returns PASS/FAIL/SKIP with the evidence sentence.
   Why it's impressive: it turns LLM-output verification into a familiar dev workflow, and it ties to his TDD story and the RAG work. Inspired by `planai` (RAG over construction norms).
5. **Real-vs-fake image game**. Guess which image is diffusion-generated, then see a detector's verdict and your score against the model's.
   Why it's impressive: it connects to his diffusion synthetic-data work. Not built because it needs a licensed real/fake image set and a credible detector that runs offline.
6. **Interface agent** (Android/UI). A natural-language task becomes a step plan that is executed on a mock phone UI, with each action grounded to an accessibility-tree element.
   Why it's impressive: it is the agent story behind cloud_robot_agent, graft and adsdroid. Not built because a credible version needs an LLM, and a keyless version would be mostly scripted.
