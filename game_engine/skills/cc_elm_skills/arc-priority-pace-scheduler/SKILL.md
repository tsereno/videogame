---
name: arc-priority-pace-scheduler
title: arc-priority-pace-scheduler
type: concept/arc-reasoning
description: Kaplan-Meier empirical cost distributions, dynamic priority scoring, pacing multipliers, and resource allocation across concurrent game runs.
status: stable
generated:
  by: agent:google-antigravity
  at: '2026-11-09T08:45:00Z'
tags:
- arc-agi
- spatial-reasoning
- discrete-grid
---
# Priority Pace Scheduler Skill (`arc-priority-pace-scheduler`)

Mathematical formalization and operational mechanics for token/time budgeting, dynamic priority calculation, and multi-game queue pacing using empirical Kaplan-Meier survival curves.

---

## 1. Empirical Kaplan-Meier Restricted Mean Reference

Level completion costs (in tokens and wall-clock seconds) follow heavy-tailed empirical survival curves derived from thousands of benchmark episodes:

### Kaplan-Meier Estimator
Let $T$ denote the tokens spent to clear level $L$. The survival function $\hat{S}(t) = P(T > t)$ is estimated via:
$$
\hat{S}(t) = \prod_{t_i \le t} \left( 1 - \frac{d_i}{n_i} \right)
$$
Where $d_i$ is completions at cost $t_i$, and $n_i$ is active episodes reaching cost $t_i$.

### Restricted Mean Token Reference $\mu_L$ (Capped at 120,000 tokens)
| Level $L$ | Empirical Mean Tokens $\mu_L$ | Tail Expected Value $E[\text{Tail} \mid L]$ |
|---|---|---|
| Level 1 | 27,011 | 3.91 |
| Level 2 | 51,073 | 5.08 |
| Level 3 | 48,932 | 5.35 |
| Level 4 | 56,352 | 5.61 |
| Level 5 | 55,797 | 4.09 |
| Level 6 | 67,264 | 0.00 (Final Level tail) |
| Levels 7-10 | 22,000 - 41,000 (Pooled extrapolated) | Extrapolated lookup |

---

## 2. Dynamic Agent Pacing Multiplier

Individual games run with varying efficiency depending on model alignment and difficulty.

### Online Pacing Estimator
Let historical completed levels in current game be $\{1, \dots, L-1\}$.
For each completed level $i$, actual tokens used is $u_i$ against reference $\mu_i$:
$$
\text{Pace}(L) = \frac{\sum_{i=1}^{L-1} u_i}{\sum_{i=1}^{L-1} \mu_i}
$$
- If $\text{Pace}(L) < 1.0$: Agent is operating efficiently (fast completer).
- If $\text{Pace}(L) > 1.0$: Agent requires elevated token budget to clear levels.

### Adjusted Cost Expectation
The projected remaining cost for the active level is scaled dynamically:
$$
\hat{C}_{\text{current}} = \text{Pace}(L) \cdot \mu_L
$$

---

## 3. Dynamic Priority Scoring Function

To schedule $N$ concurrent games sharing finite inference concurrency slots, each game computes an integer priority $P \in [0, 1000]$:

### Scoring Formula
$$
P(g) = w_{\text{level}} \cdot L + w_{\text{tail}} \cdot E[\text{Tail} \mid L] - w_{\text{cost}} \cdot \left( \frac{u_{\text{spent}}}{\mu_L} \right) + w_{\text{endgame}} \cdot \mathbb{I}(\text{Time} < T_{\text{endgame}})
$$
Where:
- **Level Progress Bonus**: Strongly favors games that have already cleared deeper levels (maximizing completed points).
- **Tail Value Bonus**: Quantifies future accessible points if the current level is cleared.
- **Cost Penalty**: Downweights games that have consumed disproportionate tokens on a single level without progress.
- **Endgame Surge**: In the final minutes of a competition notebook run, shifts all concurrency to games nearest completion.

---

## 4. Priority Handover & Non-Starvation Gating

To prevent thrashing and deadlocks:
- Games yield inference execution after completing turns or timing out.
- Handover transfers the hardware slot to the highest-priority waiting game:
  $$
  g^* = \arg\max_{g \in \mathcal{Q}} P(g)
  $$
- Aging factor prevents starvations of early-level games:
  $$
  P_{\text{eff}}(g) = P(g) + \lambda \cdot t_{\text{wait}}
  $$

---

## 5. Unbounded Level Win-Maximization & Online TTT Self-Teaching

When the objective is shifted to maximizing total level completions across all games:
1. **Unbounded Level Persistence**:
   - Deactivate premature game surrender logic (`Concluding game to protect overall RHAE score`).
   - Increase per-level action limit to $N_{\text{max\_moves}} = 120$ per attempt with up to $K_{\text{attempts}} = 6$ full retry cycles per level.
2. **Online Closed-Loop Self-Teaching & TTT Consolidation**:
   - Whenever an arcade game level is solved during black-box play, the full successful transition trajectory $\tau^* = \big((s_0, a_0), \dots, (s_T, a_T)\big)$ is immediately consolidated into:
     1. **Solution Cache & Visual Plan Bank**: Multi-scale invariant perceptual hashes of each visited state are registered with the remaining solution suffix, enabling zero-shot re-execution if that state topology recurs.
     2. **CC-EML Critic & ORPO Preference Head**: Transitions are trained via closed-form dual Gram regression and online ORPO preference steps where rejected actions $\mathcal{A}_{\text{rej}} = \mathcal{A}_{\text{avail}} \setminus \{a_t\}$ are updated with odds-ratio loss.
     3. **Micro-LLM Temporal Prototypes & World Model Dynamics**: Updates hidden state dynamics $f(s_t, a_t) \to s_{t+1}$ with online test-time learning rates without test set leakage.
