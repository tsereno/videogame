---
name: arc-interactive-action-space
title: arc-interactive-action-space
type: concept/arc-reasoning
description: Formal specification, semantics, coordinate grounding, and execution invariants for ARC-AGI-3 interactive game actions (UP, DOWN, LEFT, RIGHT, SPACE, MOUSE, UNDO, RESET).
status: stable
generated:
  by: agent:google-antigravity
  at: '2026-11-09T08:45:00Z'
tags:
- arc-agi
- spatial-reasoning
- discrete-grid
---
# Interactive Action Space Skill (`arc-interactive-action-space`)

Defines the mathematical formalization, protocol semantics, coordinate framing, and operational execution invariants for all model-facing and engine-level actions across interactive ARC-AGI-3 environments.

---

## 1. Action Mapping & Canonical Signatures

The interactive ARC runtime maps discrete user/agent invocations between human-readable model labels and low-level engine action codes:

| Model Label | Engine Action | Semantic Archetype | Parameterization | Cost / Lifecycle |
|---|---|---|---|---|
| `UP` | `ACTION1` | Directional translation | None | 1 step action budget |
| `DOWN` | `ACTION2` | Directional translation | None | 1 step action budget |
| `LEFT` | `ACTION3` | Directional translation | None | 1 step action budget |
| `RIGHT` | `ACTION4` | Directional translation | None | 1 step action budget |
| `SPACE` | `ACTION5` | Primary interaction / toggle / rotate / select | None | 1 step action budget |
| `MOUSE` | `ACTION6` | Spatial targeting / cell click | `row \in [0, H-1]`, `col \in [0, W-1]` | 1 step action budget |
| `UNDO` | `ACTION7` | Historical state rollback | None | Reverses last turn (where enabled) |
| `RESET` | `ACTION0` | Board restart / attempt renewal | None | Re-initializes level board to state 0 |

### Mathematical Signature Function
For an action invocation $a$, its canonical hash signature $\sigma(a)$ is defined invariant to dictionary formatting or string representations:
$$
\sigma(a) = \begin{cases}
\text{"MOUSE("} \parallel r \parallel \text{","} \parallel c \parallel \text{")"} & \text{if } a.\text{name} = \text{MOUSE} \\
a.\text{name} & \text{otherwise}
\end{cases}
$$
This ensures that `{"action": "MOUSE", "row": 4, "col": 7}` and `"MOUSE(row=4, col=7)"` resolve to identical signatures: `MOUSE(4,7)`.

---

## 2. Spatial Grid Coordinate Grounding

For all discrete 2D grid operations on lattice $G \in \{0, \dots, 9\}^{H \times W}$:
- **Origin $(0, 0)$**: Top-left corner cell.
- **Row Index $r$**: Increases strictly downward from $0$ to $H-1$.
- **Column Index $c$**: Increases strictly rightward from $0$ to $W-1$.
- **Bounds Checking**:
  $$
  \text{valid}(r, c) \iff 0 \le r < H \;\land\; 0 \le c < W
  $$

---

## 3. Directional Mechanics & Collision Semantics

Directional vectors $\vec{v}_d \in \mathbb{Z}^2$ correspond to:
$$
\vec{v}_{\text{UP}} = (-1, 0), \quad \vec{v}_{\text{DOWN}} = (1, 0), \quad \vec{v}_{\text{LEFT}} = (0, -1), \quad \vec{v}_{\text{RIGHT}} = (0, 1)
$$

### Entity Kinematics Model
Given an active controllable entity located at coordinate set $\mathcal{E}_t \subset [0, H-1] \times [0, W-1]$:
1. Proposed target displacement:
   $$
   \mathcal{E}' = \{ (r + v_r, c + v_c) \mid (r, c) \in \mathcal{E}_t \}
   $$
2. Collision evaluation against obstacle / barrier set $\mathcal{O}$:
   $$
   \mathcal{E}_{t+1} = \begin{cases}
   \mathcal{E}' & \text{if } \mathcal{E}' \cap \mathcal{O} = \emptyset \;\land\; \forall (r, c) \in \mathcal{E}', \text{valid}(r, c) \\
   \mathcal{E}_t & \text{otherwise (collision obstruction)}
   \end{cases}
   $$

---

## 4. `SPACE` Contextual Mechanics & Temporal Clone / Phase-Lock Dynamics

Unlike translational directions, `SPACE` performs polymorphic in-place operations across puzzle domains:
- **Rotational Pivoting**: Applies 90-degree clockwise affine transformation to target entity around centroid $(r_0, c_0)$.
- **Tool Attachment / Detachment**: Toggles adjacency binding between player avatar and cargo token.
- **Trigger Execution**: Activates switch blocks or triggers gravity cascade.
- **Hypothesis Testing**: Always test `SPACE` with probe actions before committing full trajectory.

### Temporal Phase-Lock & Ghost Clone Replay Invariants (`g50t` Archetype)
In multi-phase cooperative puzzle mechanics (e.g. `g50t`), `SPACE` (`ACTION5`) is not a passive no-op or random probe; it acts as a **Phase-Lock & Clone Spawn Trigger**:
1. **The Remote Latch Dilemma**:
   When a pressure plate or contact switch opens a remote sliding barrier or door elsewhere on the board, the door only remains open while the switch is actively occupied. The avatar cannot physically stand on the switch and pass through the barrier simultaneously.
2. **Path Rewind & Ghost Clone Allocation**:
   Executing `SPACE` records the avatar's preceding path trajectory, rewinds the avatar to the level spawn origin, and instantiates a persistent autonomous **Ghost Clone** that replays the exact movement sequence on subsequent turns.
3. **Execution Invariant for `ACTION5` Promotion**:
   - **Switch Occupation Condition**: When the avatar reaches an interactive contact cell (pressure plate) that caused an observed board-level delta (door slide or state toggle) in the Hungarian frame difference, `SPACE` (`ACTION5`) must be prioritized immediately over further directional wander.
   - **Dead-End Wall Block Condition**: When all four translational directions $(1, 2, 3, 4)$ from the current cell are obstructed by walls or closed barriers, evaluate `SPACE` (`ACTION5`) to rewind and delegate the held switch to a ghost replay.
   - **Clone Budget Invariant**: In levels with $K$ recording slots (e.g., 2 or 3 clone capacity), allocate each clone phase to a distinct, reachable pressure plate before attempting to route the primary avatar to the goal.

---

## 5. `UNDO` & `RESET` Rollback Protocols

### `UNDO` Protocol:
- Restores previous board state $G_{t-1}$ and player location $\mathcal{E}_{t-1}$.
- Ineffective after `game_over` or terminal death.
- Does not restore spent wall-clock or token computation budget.

### `RESET` Protocol:
- Restores initial level board $G_{\text{init}}$ and resets HUD step timer.
- Preserves all completed level solutions ($L < L_{\text{current}}$).
- Costs 1 action step; spent attempt budget remains consumed.
- In scripting / REPL workflows: `RESET` must be the first executed game action in the snippet.

---

## 6. Candidate-Score Aligned MCTS Verification & Tie-Breaking

When parallel MCTS rollouts (`CCEMLInferenceSearchEngine`) evaluate candidate actions alongside Active Inference Expected Free Energy (EFE) scoring:
1. **Candidate Pool Pre-Sorting**:
   The branch candidate pool $\mathcal{A}_{\text{mcts}}$ must be ordered strictly by descending EFE utility score $\text{Score}_{\text{EFE}}(a)$, ensuring parallel simulation branches prioritize the highest-ranked exploratory and goal-directed actions first.
2. **Score-Bounded Override Tolerance**:
   An MCTS candidate $a_{\text{mcts}}$ may only override the primary analytical candidate $a_{\text{efe}}^* = \arg\max_a \text{Score}_{\text{EFE}}(a)$ if its pre-computed utility satisfies:
   $$
   \text{Score}_{\text{EFE}}(a_{\text{mcts}}) \ge \text{Score}_{\text{EFE}}(a_{\text{efe}}^*) - \Delta_{\text{tol}}, \quad \Delta_{\text{tol}} = 2.5
   $$
   and $C(h, a_{\text{mcts}}) \le C(h, a_{\text{efe}}^*)$, preventing stochastic rollouts from overriding verified modality gates or choosing inferior branches.
