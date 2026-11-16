---
name: arc-death-ledger
title: arc-death-ledger
type: concept/arc-reasoning
description: Terminal failure analysis, lethal state-action trajectory backtracing, prefix hazard matching, and proactive death guard interception for ARC-AGI games.
status: stable
generated:
  by: agent:google-antigravity
  at: '2026-11-09T08:45:00Z'
tags:
- arc-agi
- spatial-reasoning
- discrete-grid
---
# Death Ledger & Hazard Guard Skill (`arc-death-ledger`)

Formalizes the recording, retroactive attribution, and proactive runtime interception of fatal actions and hazardous state-action transitions in interactive grid environments.

---

## 1. Lethal State-Action Registration

When an action $a_t$ executed in state $G_t$ results in `game_over` or immediate life exhaustion:

### Triplet Formulation
Let interior state hash be $h(G_t)$ and action signature be $\sigma(a_t)$.
The lethal event is recorded into the death ledger $\mathcal{D}$:
$$
\mathcal{D} \leftarrow \mathcal{D} \cup \{ (L, h(G_t), \sigma(a_t)) \}
$$
Where:
- $L$ is the active level index.
- $h(G_t)$ is the border-cropped interior state hash.
- $\sigma(a_t)$ is the canonical action signature (e.g. `UP`, `MOUSE(12,15)`).

---

## 2. Retroactive Trajectory Backtracing

Death often results not from the final step alone, but from entering an irreversible fatal attractor (e.g., jumping into an unavoidable spike pit or triggering an inescapable trap).

### Credit Attribution Protocol
Given historical trajectory before death:
$$
\tau = \big( (G_0, a_0), (G_1, a_1), \dots, (G_T, a_T) \big)
$$
1. **Direct Terminal Hazard**: Mark $(L, h(G_T), \sigma(a_T))$ as strictly fatal ($w=1.0$).
2. **Pre-terminal Hazard Decay**: For horizon $k \in \{1, 2, \dots, K_{\text{horizon}}\}$:
   Assign hazard score:
   $$
   \text{Hazard}(G_{T-k}, a_{T-k}) = \gamma^k, \quad \gamma \in (0, 1]
   $$
3. Flag previous irreversible states in diagnostic trace to avoid entering identical sub-trajectories.

---

## 3. Proactive Guard Interception

Before executing proposed action $a$ in current state $G$:

### Execution Precondition
$$
\text{IsFatal}(G, a) = \mathbb{I}\Big( (L, h(G), \sigma(a)) \in \mathcal{D} \Big)
$$
- If $\text{IsFatal}(G, a) = 1$:
  - Intercept execution **before** sending action to engine.
  - Raise `KnownDeathActionError`.
  - Signal `stop_reason = "known_death"`.
  - Action is halted with **zero loss of game attempts or budget**.
- If the agent explicitly justifies and repeats the same action immediately as the next token, the single-slot override allows forced trial.

---

## 4. Active Inference Expected Free Energy (EFE) Hazard Subtraction & Cross-Retry Retention

1. **Direct EFE Hazard Potential Subtraction**:
   During online candidate scoring in state $h(G_t)$, subtract the accumulated retroactive hazard potential $H_{\text{haz}}(h(G_t), \sigma(a))$ directly from the candidate's total Expected Free Energy / utility score:
   $$
   \text{Score}(h(G_t), a) = \text{EFE}(s_t, a) + U_{\text{explore}}(h(G_t), a) + U_{\text{goal}}(G_t, a) - H_{\text{haz}}\big(h(G_t), \sigma(a)\big)
   $$
   where $H_{\text{haz}}(h_{T-k}, \sigma(a_{T-k})) \mathrel{+}= 4.0 \cdot \gamma^k$ ($\gamma = 0.65, k \in \{1, 2, 3\}$) upon any terminal `GAME_OVER` transition.
2. **Cross-Retry Epistemic Retention (`keep_twin_graph=True`)**:
   When a level resets due to `GAME_OVER` or step-budget exhaustion on the **same** level $L$, retain $\mathcal{D}^{(L)}$, $H_{\text{haz}}^{(L)}$, state-level blocked action sets $\mathcal{B}_{\text{noop}}^{(L)}(h)$, and spatial click no-op counts $N_{\text{noop}}^{(L)}(x, y)$, while resetting state-action traversal counts $C(h, a) \leftarrow 0$ only for productive, non-blocked transitions $(h, a) \notin \mathcal{B}_{\text{noop}}^{(L)}(h) \cup \mathcal{D}^{(L)}$. This guarantees that subsequent attempts traverse known valid corridors while never repeating fatal or idempotent actions.

---

## 5. Multi-Action Batch Verification

In scripted tool execution where an agent issues an action sequence $A = (a_1, a_2, \dots, a_m)$ inside a Python snippet:
- Guard evaluates each state-action pair sequentially.
- If simulated or observed state encounters $(L, h(G_j), \sigma(a_j)) \in \mathcal{D}$, sequence aborts at step $j$.
- Prevents batch execution from blindly running off a known cliff.
