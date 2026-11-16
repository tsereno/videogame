---
name: arc-noop-repeat-guard
title: arc-noop-repeat-guard
type: concept/arc-reasoning
description: Border-cropped state hashing, idempotent action detection, and override safety guards to prevent repetitive no-op cycles in ARC-AGI games.
status: stable
generated:
  by: agent:google-antigravity
  at: '2026-11-09T08:45:00Z'
tags:
- arc-agi
- spatial-reasoning
- discrete-grid
---
# No-Op Repeat Guard Skill (`arc-noop-repeat-guard`)

Mathematical formalization and operational mechanics for detecting, intercepting, and overriding idempotent action attempts that produce zero state transitions on the game lattice.

---

## 1. Border-Cropped Interior State Hashing

Game environments frequently maintain dynamic HUD elements, step counters, or ticking timers in border cells that would render trivial full-board hashes non-stationary even when gameplay is completely frozen.

### Mathematical Formulation
Let lattice $G \in \{0, \dots, 9\}^{H \times W}$. Define the border margin $b \ge 0$ (default $b=1$).
The interior active gameplay subgrid $G_{\text{int}}$ is defined over coordinates:
$$
\Omega_{\text{int}} = \{ (r, c) \mid b \le r < H - b, \; b \le c < W - b \}
$$
The interior state hash $h(G)$ is computed via canonical byte serialization:
$$
h(G) = \text{MD5}\Big( \bigoplus_{(r, c) \in \Omega_{\text{int}}} G[r, c] \Big)
$$
This ensures that changes restricted strictly to peripheral HUD frames do not alter state identity $h(G)$.

---

## 2. No-Op Observation & Triplet Registration

Let level index be $L$, interior state hash be $h_t$, and action signature be $\sigma(a_t)$.
When an executed action results in transition $G_t \to G_{t+1}$:

### Change Detection Operator
$$
\Delta(G_t, G_{t+1}) = \bigvee_{(r, c) \in \Omega_{\text{int}}} \Big( G_t[r, c] \ne G_{t+1}[r, c] \Big)
$$

### Registration Rule
If $\Delta(G_t, G_{t+1}) = \text{False}$, the action produced zero interior change (idempotent action / wall bump / failed click).
Register triplet in bounded memory $\mathcal{M}_{\text{noop}}$:
$$
\mathcal{M}_{\text{noop}} \leftarrow \mathcal{M}_{\text{noop}} \cup \{ (L, h_t, \sigma(a_t)) \}
$$

---

## 3. Interception Logic & Arming Override Protocol

To avoid the self-sealing failure mode where an action gated on hidden counters (cooldowns, delayed switches, off-screen timers) is permanently foreclosed:

### Two-Stage Overridable Guard Protocol
1. **Initial Interception**:
   If $(L, h_t, \sigma(a)) \in \mathcal{M}_{\text{noop}}$:
   - Refuse immediate execution.
   - Raise `KnownNoOpActionError`.
   - Arm override slot: $\text{Armed}(L, h_t) \leftarrow \sigma(a)$.
   - Spend 0 action budget steps.
2. **Immediate Insistence Override**:
   If the subsequent action $a_{t+1}$ satisfies:
   $$
   \sigma(a_{t+1}) = \text{Armed}(L, h_t)
   $$
   - Disarm slot: $\text{Armed}(L, h_t) \leftarrow \emptyset$.
   - **Bypass guard and execute action**, allowing the agent to confirm hidden temporal dynamics or force stubborn state changes.
   - Cost: Exactly 1 action step.

---

## 4. Cross-State Spatial Kernel No-Op Click Suppression & HUD Margin Filtering

In hybrid and point-and-click ARC-AGI-3 environments, an inert coordinate $(x, y)$ (such as a static HUD indicator or border ornament) remains inert across distinct interior states $h_t \neq h_{t'}$ within the same level $L$. Indexing no-op blocks solely by $(L, h_t, \sigma(a))$ allows the policy to re-click the same inert coordinate whenever another action changes $h_t$.

### Mathematical Formulation
1. **Cross-State No-Op Counter & Chebyshev Same-Color Propagation**:
   Maintain a level-persistent spatial counter $N_{\text{noop}}^{(L)}(x, y) \in \mathbb{Z}_{\ge 0}$. Whenever `MOUSE(x, y)` yields $\Delta(G_t, G_{t+1}) = \text{False}$, increment $N_{\text{noop}}^{(L)}(x, y)$ and propagate suppression across the $3\times 3$ Chebyshev neighborhood sharing the same color $c = G_t[y, x]$:
   $$
   \forall (x', y') \in \mathcal{N}_\infty(x, y; 1) : G_t[y', x'] = G_t[y, x] \implies N_{\text{noop}}^{(L)}(x', y') \leftarrow N_{\text{noop}}^{(L)}(x', y') + 1
   $$
   If $(x, y)$ subsequently produces a valid transition ($\Delta = \text{True}$), reset $N_{\text{noop}}^{(L)}(x, y) \leftarrow 0$ and add $(x, y)$ to verified hotspots $\mathcal{H}_{\text{eff}}^{(L)}$.
2. **Candidate Pruning & HUD Margin Penalty**:
   Prune any candidate $(6, x, y)$ from the active action pool whenever $N_{\text{noop}}^{(L)}(x, y) \ge 2$ and $(x, y) \notin \mathcal{H}_{\text{eff}}^{(L)}$. Apply a peripheral margin priority penalty:
   $$
   \Phi_{\text{margin}}(x, y) = \begin{cases} 85.0 & \text{if } x \le 2 \lor x \ge W-3 \lor y \le 2 \lor y \ge H-3 \\ 35.0 & \text{if } y \le 4 \lor y \ge H-4 \\ 0.0 & \text{otherwise} \end{cases}
   $$
   so interior connected components are always evaluated before peripheral status bars.

---

## 5. Beta-Bernoulli Empirical Bayes Action-Modality Gate

In environments exposing both directional actions $\mathcal{A}_{\text{dir}} = \{1, 2, 3, 4\}$ and coordinate clicks $\mathcal{A}_{\text{click}} = \{6\}$, up to 32 click candidates compete against 4 directional candidates.

### Posterior Modality Efficacy
Track per-level transition successes $S_m^{(L)}$ and no-op failures $F_m^{(L)}$ for each modality $m \in \{\text{dir}, \text{click}\}$ under a $\text{Beta}(1, 1)$ prior:
$$
\hat{p}_m^{(L)} = \frac{1 + S_m^{(L)}}{2 + S_m^{(L)} + F_m^{(L)}}
$$
Scale untried click exploration momentum by $\hat{p}_{\text{click}}^{(L)}$ and apply the modality log-odds bias:
$$
B_{\text{mod}}(a) = \begin{cases}
1.10 + 1.85 \big(\hat{p}_{\text{dir}}^{(L)} - \hat{p}_{\text{click}}^{(L)}\big) & \text{if } a \in \mathcal{A}_{\text{dir}} \land \hat{p}_{\text{dir}}^{(L)} \ge \hat{p}_{\text{click}}^{(L)} \\
-2.25 \big(\hat{p}_{\text{dir}}^{(L)} - \hat{p}_{\text{click}}^{(L)}\big) & \text{if } a = 6 \land S_{\text{dir}}^{(L)} > 0 \land \hat{p}_{\text{dir}}^{(L)} > 2 \hat{p}_{\text{click}}^{(L)}
\end{cases}
$$

---

## 6. Multi-Phase Action-5 Latch Guard Exception (`g50t` Archetype)

In games with recorded rewind / ghost replay mechanics (`g50t`):
1. **Single-Step Post-Interaction Reset**:
   Executing `SPACE` (`ACTION5`) records the current trajectory, resets the active avatar back to the spawn coordinate, and instantiates an autonomous ghost clone.
2. **Non-Idempotent Semantics**:
   Even if the primary avatar's local spatial position returns to spawn, the global multi-entity state space has changed permanently (a new replay agent has been added to the board). `ACTION5` must **never** be registered as a no-op repeat block when executed on a switch plate or after completing an exploratory branch.
3. **Ghost Collision Non-Block Invariant**:
   Ghost replay trajectories pass through the primary avatar without collision deadlock. Do not register directional moves $(1, 2, 3, 4)$ as wall collisions if the occupied cell contains a moving ghost clone rather than a physical wall.

---

## 7. State Capacity & LRU Eviction

Memory capacity per level is bounded to prevent unbounded footprint:
- $N_{\text{max\_states}} = 512$ unique state hashes per level.
- $K_{\text{max\_actions}} = 16$ blocked action signatures per state hash.
- Eviction follows strict Least-Recently-Used (LRU) discipline.
