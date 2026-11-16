---
name: arc-lut-induction
title: arc-lut-induction
type: concept/arc-reasoning
description: Mathematical formalization and operational instructions for deterministic cellular lookup table (LUT) induction across local stencils, rotational invariants, and raycast vectors.
status: stable
generated:
  by: agent:google-antigravity
  at: '2026-11-09T08:45:00Z'
tags:
- arc-agi
- spatial-reasoning
- discrete-grid
---
# Lookup Table (LUT) Induction Skill (`arc-lut-induction`)

Formulates exact deterministic mappings \(f: \mathcal{K} \to \mathcal{C}\) from local neighborhood contexts or directional rays to cell target colors.

---

## 1. Stencil Context Encodings

Let \(P = \text{Pad}(G, 1, \text{val}=-1)\) be the boundary-padded grid. For each cell \((r, c)\):

### 1. Full \(3 \times 3\) Context Tuple
\[
\kappa_{3\times 3}(r, c) = \Big( P[r+u, c+v] \;\Big|\; u, v \in \{0, 1, 2\} \Big) \in \{-1, 0, \dots, 9\}^9
\]

### 2. Orthogonal Cross Stencil
\[
\kappa_{\text{cross}}(r, c) = \Big( G[r, c], \; P[r, c+1], \; P[r+2, c+1], \; P[r+1, c], \; P[r+1, c+2] \Big)
\]
encoding \((c_{\text{center}}, c_{\text{up}}, c_{\text{down}}, c_{\text{left}}, c_{\text{right}})\).

### 3. Rotational-Invariant Multiset Stencil
Eliminates directional bias by sorting orthogonal and diagonal neighbor sets:
\[
\mathcal{N}_4 = \text{sort}\Big(\big\{ P[r, c+1], P[r+2, c+1], P[r+1, c], P[r+1, c+2] \big\}\Big)
\]
\[
\mathcal{N}_8 = \text{sort}\Big(\big\{ P[r, c], P[r, c+2], P[r+2, c], P[r+2, c+2] \big\}\Big)
\]
\[
\kappa_{\text{rot}}(r, c) = \Big( G[r, c], \; \mathcal{N}_4, \; \mathcal{N}_8 \Big)
\]

### 4. Cardinal Raycast Vector Stencil
Captures long-distance obstacle reachability by projecting rays in 4 cardinal directions until striking the nearest non-zero particle:
\[
\text{ray}_{\text{up}}(r, c) = \text{last non-zero in } G[:r, c] \text{ (or } 0 \text{ if empty)}
\]
\[
\text{ray}_{\text{down}}(r, c) = \text{first non-zero in } G[r+1:, c]
\]
\[
\text{ray}_{\text{left}}(r, c) = \text{last non-zero in } G[r, :c]
\]
\[
\text{ray}_{\text{right}}(r, c) = \text{first non-zero in } G[r, c+1:]
\]
\[
\kappa_{\text{ray}}(r, c) = \Big( G[r, c], \; \text{ray}_{\text{up}}, \; \text{ray}_{\text{down}}, \; \text{ray}_{\text{left}}, \; \text{ray}_{\text{right}} \Big)
\]

---

## 2. Induction & Verification Protocol

1. **Table Construction**:
   Across all training demonstration pairs \(\{(G_{\text{in}}^{(i)}, G_{\text{out}}^{(i)})\}\):
   For each cell \((r, c)\), record mapping:
   \[
   \kappa(r, c) \mapsto G_{\text{out}}^{(i)}[r, c]
   \]
2. **Consistency Verification**:
   If any key \(\kappa\) maps to two conflicting target values (\(\text{LUT}[\kappa] \ne v\)), reject the candidate stencil mode.
3. **Non-Triviality Check**:
   Require that \(\exists \kappa\) such that \(\text{LUT}[\kappa] \ne \text{center}(\kappa)\) (ensuring non-identity transformation).
4. **Inference Execution**:
   For test input \(G_{\text{test}}\), compute context keys \(\kappa(r, c)\) and evaluate:
   \[
   G_{\text{pred}}[r, c] = \begin{cases} \text{LUT}[\kappa(r, c)] & \text{if } \kappa(r, c) \in \text{LUT} \\ G_{\text{test}}[r, c] & \text{otherwise} \end{cases}
   \]
