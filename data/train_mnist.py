"""Train a 784-64-10 MLP on MNIST with numpy, export int8 weights for the browser."""
import numpy as np, json, base64, time
rng = np.random.default_rng(0)
d = np.load('mnist.npz')
Xtr, ytr, Xte, yte = d['x_train'], d['y_train'], d['x_test'], d['y_test']
Xtr = Xtr.astype(np.float32) / 255; Xte = Xte.astype(np.float32) / 255

def augment(X):
    # random shifts of up to 2 px and random stroke thickening, to survive hand-drawn input
    out = np.empty_like(X)
    for i, img in enumerate(X):
        dx, dy = rng.integers(-2, 3, 2)
        img = np.roll(np.roll(img, dy, 0), dx, 1)
        if rng.random() < .35:
            img = np.maximum(img, np.roll(img, 1, 1) * .8)
        out[i] = img
    return out

H = 64
W1 = rng.normal(0, np.sqrt(2 / 784), (784, H)).astype(np.float32); b1 = np.zeros(H, np.float32)
W2 = rng.normal(0, np.sqrt(2 / H), (H, 10)).astype(np.float32); b2 = np.zeros(10, np.float32)
P = [W1, b1, W2, b2]; M = [np.zeros_like(p) for p in P]; V = [np.zeros_like(p) for p in P]
lr, B1, B2, t = 1e-3, .9, .999, 0

def forward(X):
    h = np.maximum(0, X @ W1 + b1); z = h @ W2 + b2
    z -= z.max(1, keepdims=True); p = np.exp(z); p /= p.sum(1, keepdims=True)
    return h, p

t0 = time.time()
for ep in range(12):
    Xa = augment(Xtr).reshape(-1, 784); idx = rng.permutation(len(Xa))
    for k in range(0, len(idx), 128):
        j = idx[k:k + 128]; X = Xa[j]; y = ytr[j]
        h, p = forward(X)
        g = p.copy(); g[np.arange(len(y)), y] -= 1; g /= len(y)
        gW2 = h.T @ g; gb2 = g.sum(0)
        gh = g @ W2.T; gh[h <= 0] = 0
        gW1 = X.T @ gh; gb1 = gh.sum(0)
        t += 1
        for q, (pp, gg) in enumerate(zip(P, [gW1, gb1, gW2, gb2])):
            gg = gg + (1e-5 * pp if pp.ndim == 2 else 0)
            M[q] = B1 * M[q] + (1 - B1) * gg; V[q] = B2 * V[q] + (1 - B2) * gg * gg
            pp -= lr * (M[q] / (1 - B1 ** t)) / (np.sqrt(V[q] / (1 - B2 ** t)) + 1e-8)
    if ep == 8: lr = 3e-4
    acc = (forward(Xte.reshape(-1, 784))[1].argmax(1) == yte).mean()
    print(f'epoch {ep+1} test acc {acc:.4f} ({time.time()-t0:.0f}s)', flush=True)

def q8(a):
    s = float(np.abs(a).max()) / 127
    return {'s': s, 'shape': list(a.shape), 'q': base64.b64encode(np.round(a / s).astype(np.int8).tobytes()).decode()}
Wq = {'W1': q8(W1), 'b1': q8(b1), 'W2': q8(W2), 'b2': q8(b2), 'acc': round(float(acc), 4)}
# accuracy after int8 quantization
deq = lambda o: np.frombuffer(base64.b64decode(o['q']), np.int8).astype(np.float32).reshape(o['shape']) * o['s']
W1, b1, W2, b2 = deq(Wq['W1']), deq(Wq['b1']), deq(Wq['W2']), deq(Wq['b2'])
qacc = (forward(Xte.reshape(-1, 784))[1].argmax(1) == yte).mean()
Wq['acc_int8'] = round(float(qacc), 4)
json.dump(Wq, open('mnist-mlp.json', 'w'))
print('float acc', acc, 'int8 acc', qacc)
