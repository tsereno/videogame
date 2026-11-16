---
name: arc-fractal-scale
title: arc-fractal-scale
type: concept/arc-reasoning
description: Mathematical formalization and operational instructions for Kronecker self-fractal expansion, integer scale factor replication, diagonal ray casting, and in-context fixed-shape projection.
status: stable
generated:
  by: agent:google-antigravity
  at: '2026-11-09T08:45:00Z'
tags:
- arc-agi
- spatial-reasoning
- discrete-grid
---
# Fractal & Scale Induction Skill (`arc-fractal-scale`)

Provides formal mathematical specifications and operational rules for shape scaling, Kronecker product self-similar fractals, and in-context fixed-shape decoders.

---

## 1. Kronecker Self-Similar Fractal Product (`solve_kronecker_fractal`)

Maps input pattern \(G \in \{0, \dots, 9\}^{H \times W}\) into a self-similar fractal grid of shape \((H^2, W^2)\).

### Mathematical Definition
Let the binary support mask of \(G\) be \(M_{\text{binary}} = \mathbb{I}(G \ne 0) \in \{0, 1\}^{H \times W}\).
The fractal output is defined by the block Kronecker tensor product:
\[
G_{\text{out}} = M_{\text{binary}} \otimes G
\]
Where each block \((i, j) \in \{0, \dots, H-1\} \times \{0, \dots, W-1\}\) of size \(H \times W\) is populated as:
\[
G_{\text{out}}[i \cdot H : (i + 1) \cdot H, \; j \cdot W : (j + 1) \cdot W] = \begin{cases} G & \text{if } G[i, j] \ne 0 \\ \mathbf{0}_{H \times W} & \text{if } G[i, j] = 0 \end{cases}
\]

### Operational Induction Rule:
If across all demonstration pairs \(\{(G_{\text{in}}^{(k)}, G_{\text{out}}^{(k)})\}\):
\[
G_{\text{out}}^{(k)} = \mathbb{I}(G_{\text{in}}^{(k)} \ne 0) \otimes G_{\text{in}}^{(k)} \quad \forall \; k
\]
Then predict \(G_{\text{pred}} = \mathbb{I}(G_{\text{test}} \ne 0) \otimes G_{\text{test}}\).

---

## 2. Integer Scale Factor Replication (`solve_scale_replication`)

When output dimensions are uniform integer multiples \((s_H, s_W)\) of input dimensions:
\[
H_{\text{out}} = s_H \cdot H_{\text{in}}, \qquad W_{\text{out}} = s_W \cdot W_{\text{in}}
\]

### Primary Attempt (Nearest-Neighbor Tile Replication)
Each input cell \((r, c)\) expands into a solid block of dimensions \(s_H \times s_W\):
\[
G_{\text{pred}}[r \cdot s_H : (r + 1) \cdot s_H, \; c \cdot s_W : (c + 1) \cdot s_W] = G_{\text{test}}[r, c]
\]

### Secondary Attempt (Diagonal Particle Extension)
When \(s_H = s_W = 2\), along each diagonal trajectory emanating from foreground points \((r_0, c_0)\), propagate unit identity stamps \(\mathbf{I}_2\) across empty regions. Otherwise, evaluate periodic tiling \(\text{Tile}(G_{\text{test}}, (s_H, s_W))\).

---

## 3. In-Context Fixed-Shape Decoders

When all demonstration outputs share an invariant target shape \((H^*, W^*)\) regardless of variable input dimensions:
1. Extract global 10-dimensional input color histogram:
   \[
   \mathbf{x} = \Big[ \frac{1}{|G|} \sum_{u, v} \mathbb{I}(G[u, v] = c) \;\Big|\; c \in \{0, \dots, 9\} \Big]^T \in \mathbb{R}^{10}
   \]
2. Solve ridge regression operator \(\mathbf{W} \in \mathbb{R}^{10 \times (H^* \cdot W^*)}\):
   \[
   \mathbf{W} = (\mathbf{X}^T \mathbf{X} + \lambda \mathbf{I})^{-1} \mathbf{X}^T \mathbf{Y}
   \]
3. Project test input histogram \(\mathbf{x}_{\text{test}}\) and quantize to discrete palette \(\{0, \dots, 9\}\):
   \[
   G_{\text{pred}} = \text{reshape}\Big( \text{clip}\big(\text{round}(\mathbf{x}_{\text{test}}^T \mathbf{W}), 0, 9\big), \; (H^*, W^*) \Big)
   \]
