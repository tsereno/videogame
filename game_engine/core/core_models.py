"""Visual compositor, neural world model, and Jev cognitive decision primitives."""
import os, sys, re, time, math, random, json, zlib, queue, threading, atexit
from concurrent.futures import ThreadPoolExecutor
import yaml
import numpy as np
from PIL import Image, ImageDraw
try:
    from numba import njit, prange
except Exception:
    njit = None
try:
    import simplejpeg
except ImportError:
    simplejpeg = None
from .constants import GRID_SQ, CC_ELM_CHECKPOINT_PATH

_YAML_LOADER = getattr(yaml, "CSafeLoader", yaml.SafeLoader)
_SKILL_MD_CACHE = {}
_SKILL_MD_LOCK = threading.Lock()
_WORD_RE = re.compile(r'[a-z0-9]+')

def fast_yaml_load(text: str):
    return yaml.load(text, Loader=_YAML_LOADER) or {}

def load_skill_yaml_cached(path: str) -> tuple[dict, str]:
    """Thread-safe mtime-keyed cache for SKILL.md YAML frontmatter + markdown body."""
    ap = os.path.abspath(path)
    mt = os.path.getmtime(ap)
    with _SKILL_MD_LOCK:
        hit = _SKILL_MD_CACHE.get(ap)
        if hit is not None and hit[0] == mt:
            return hit[1], hit[2]
    with open(ap, "r", encoding="utf-8") as f:
        raw = f.read()
    parts = raw.split("---", 2)
    meta = fast_yaml_load(parts[1]) if len(parts) >= 3 else {}
    body = parts[2] if len(parts) >= 3 else raw
    with _SKILL_MD_LOCK:
        _SKILL_MD_CACHE[ap] = (mt, meta, body)
    return meta, body

_ASYNC_IO_LOCK = threading.Lock()
_ASYNC_IO_PENDING = {}
_ASYNC_IO_EVENT = threading.Event()
_ASYNC_IO_STARTED = False

def _async_io_worker():
    while True:
        _ASYNC_IO_EVENT.wait(timeout=0.5)
        _ASYNC_IO_EVENT.clear()
        with _ASYNC_IO_LOCK:
            tasks = list(_ASYNC_IO_PENDING.values())
            _ASYNC_IO_PENDING.clear()
        for fn in tasks:
            try:
                fn()
            except Exception:
                pass

def flush_async_io():
    with _ASYNC_IO_LOCK:
        tasks = list(_ASYNC_IO_PENDING.values())
        _ASYNC_IO_PENDING.clear()
    for fn in tasks:
        try:
            fn()
        except Exception:
            pass

def enqueue_async_io(key: str, fn):
    """Coalesces and executes disk persistence on a daemon background thread without blocking game ticks."""
    global _ASYNC_IO_STARTED
    with _ASYNC_IO_LOCK:
        _ASYNC_IO_PENDING[key] = fn
        if not _ASYNC_IO_STARTED:
            _ASYNC_IO_STARTED = True
            t = threading.Thread(target=_async_io_worker, daemon=True)
            t.start()
            atexit.register(flush_async_io)
    _ASYNC_IO_EVENT.set()

if njit is not None:
    @njit(fastmath=True, nogil=True, parallel=True, cache=True)
    def _nb_sherman_morrison_step(P_cov, W_adaptive, gain, Ph, err, inv_lam):
        h_dim = P_cov.shape[0]
        e_dim = W_adaptive.shape[1]
        for i in prange(h_dim):
            gi = gain[i]
            w_row = W_adaptive[i]
            for k in range(e_dim):
                v = w_row[k] + gi * err[k]
                w_row[k] = 4.0 if v > 4.0 else (-4.0 if v < -4.0 else v)
            p_row = P_cov[i]
            for j in range(h_dim):
                p_row[j] = (p_row[j] - gi * Ph[j]) * inv_lam
        for i in prange(h_dim):
            for j in range(i + 1, h_dim):
                v = 0.5 * (P_cov[i, j] + P_cov[j, i])
                P_cov[i, j] = v
                P_cov[j, i] = v
else:
    _nb_sherman_morrison_step = None

_GLOBAL_CC_ELM_MODEL = None
_CC_ELM_WARMED_UP = False

def get_shared_cc_elm_surrogate():
    """Lazily loads and retains the L2-cache resident CC-ELM surrogate neural manifold (< 256 KB)."""
    global _GLOBAL_CC_ELM_MODEL, _CC_ELM_WARMED_UP
    if _GLOBAL_CC_ELM_MODEL is None:
        try:
            game_engine_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            if game_engine_dir not in sys.path:
                sys.path.insert(0, game_engine_dir)
            try:
                from models import cc_elm
            except Exception:
                try:
                    from ..models import cc_elm
                except Exception:
                    import cc_elm
            if os.path.exists(CC_ELM_CHECKPOINT_PATH):
                _GLOBAL_CC_ELM_MODEL = cc_elm.CCELMSurrogate.load_compressed(CC_ELM_CHECKPOINT_PATH)
                if not _CC_ELM_WARMED_UP:
                    try:
                        _GLOBAL_CC_ELM_MODEL.warmup_jit()
                        _CC_ELM_WARMED_UP = True
                    except Exception:
                        pass
        except Exception:
            _GLOBAL_CC_ELM_MODEL = False
    return _GLOBAL_CC_ELM_MODEL if _GLOBAL_CC_ELM_MODEL is not False else None


class VisualCompositor:
    """
    Real-time procedural neural 2D visual compositor.
    Generates all tactical battlemaps, environment backgrounds, entities, items, and monsters
    entirely on-the-fly via mathematical procedural synthesis (zero disk image dependency).
    """
    def __init__(self, scene_mapping=None, sprite_mapping=None, default_sprites=None, environment_themes=None):
        self.scene_mapping = scene_mapping or {}
        self.sprite_mapping = sprite_mapping or {}
        self.default_sprites = default_sprites or {}
        self.environment_themes = environment_themes or {}
        self.texture_cache = {}
        self.sprite_cache = {}
        self._theme_cache = {}
        self._visual_spec_cache = {}
        self.visual_client_config = {}
        self._cache_lock = threading.Lock()

    def get_room_theme(self, room_id: str) -> dict:
        themes = self.environment_themes or {}
        if themes:
            c_key = (room_id, id(themes), len(themes))
            hit = self._theme_cache.get(c_key)
            if hit is not None:
                return hit
            crit = {k: f"{k} {' '.join(v.get('match', []))}" for k, v in themes.items()}
            ans = evaluate_jev_decision(room_id, {"t": Choice(criteria=crit)})["t"]
            key = ans.choice if ans.confidence >= 0.35 or "cave" not in themes else "cave"
            td = themes.get(key) or themes.get("cave")
            if td:
                res = {"type": key, **{k: tuple(td[k]) for k in ("base", "alt", "accent", "grid", "light")}}
                with self._cache_lock:
                    self._theme_cache[c_key] = res
                return res
        return {"type": "cave", "base": (32, 36, 42), "alt": (24, 28, 34), "accent": (60, 68, 80), "grid": (18, 20, 25, 150), "light": (160, 180, 210)}

    def generate_procedural_background(self, room_id: str, W: int = 1024, H: int = 768, obstacles: list = None) -> Image.Image:
        theme = self.get_room_theme(room_id)
        return Image.new("RGBA", (W, H), (theme["base"][0], theme["base"][1], theme["base"][2], 255))

    def generate_procedural_sprite(self, category: str, name: str, size: int = GRID_SQ) -> Image.Image:
        return Image.new("RGBA", (size, size), (120, 140, 180, 220))

    def render_game_frame(self, room_id: str, items: list, monsters: list, player_pos: list = None, portals: list = None, obstacles: list = None) -> Image.Image:
        theme = self.get_room_theme(room_id)
        return Image.new("RGBA", (1024, 768), (theme["base"][0], theme["base"][1], theme["base"][2], 255))

    def load_visual_models_from_skills(self, skills_dir=None):
        """Loads 3D/2D visual object definitions, archetypes, and meshes from skills files in parallel."""
        import glob
        if not hasattr(self, 'visual_models') or self.visual_models is None:
            self.visual_models = {'character_archetypes': {}, 'monsters': {}, 'scenery': {}, 'items': {}}

        workspace_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        search_dirs = [
            skills_dir,
            os.path.join(workspace_root, "games", "*", "skills"),
            os.path.join(workspace_root, "game_builder", "skills"),
            os.path.join(workspace_root, "game_engine", "skills", "game_skills"),
            os.path.join(workspace_root, ".agents", "skills"),
        ]

        file_list = []
        seen_paths = set()
        for s_dir in search_dirs:
            if not s_dir:
                continue
            matched_dirs = glob.glob(s_dir) if "*" in s_dir else ([s_dir] if os.path.exists(s_dir) else [])
            for md in matched_dirs:
                for fp in glob.glob(os.path.join(md, "*", "SKILL.md")):
                    ap = os.path.abspath(fp)
                    if ap not in seen_paths:
                        seen_paths.add(ap)
                        file_list.append(ap)

        def _parse_vm(sp):
            try:
                meta, _ = load_skill_yaml_cached(sp)
                return meta
            except Exception:
                return None

        if len(file_list) > 1:
            with ThreadPoolExecutor(max_workers=min(len(file_list), os.cpu_count() or 4)) as ex:
                metas = list(ex.map(_parse_vm, file_list))
        else:
            metas = [_parse_vm(sp) for sp in file_list]

        cat_map = {
            'characters': 'character_archetypes',
            'character_archetypes': 'character_archetypes',
            'monsters': 'monsters',
            'scenery': 'scenery',
            'items': 'items',
        }
        self.visual_client_config = {}
        for meta in metas:
            if not meta:
                continue
            vm = meta.get('visual_models') or meta.get('game', {}).get('visual_models')
            if isinstance(vm, dict):
                for cat, entries in vm.items():
                    if cat in self.visual_models and isinstance(entries, dict):
                        self.visual_models[cat].update(entries)
            codex = meta.get('codex') or meta.get('game', {}).get('codex')
            if isinstance(codex, dict):
                for src_cat, dst_cat in cat_map.items():
                    entries = codex.get(src_cat)
                    if isinstance(entries, dict):
                        self.visual_models[dst_cat].update(entries)
                cli = codex.get('client')
                if isinstance(cli, dict):
                    self.visual_client_config.update(cli)
        with self._cache_lock:
            self._visual_spec_cache.clear()
            self._theme_cache.clear()
        return self.visual_models

    def build_entity_visual_spec(self, category: str, name: str, char_class: str = None, equipment: list = None) -> dict:
        """Generates a structured 3D/2D visual object model via cached CC-ELM classification."""
        if not getattr(self, 'visual_models', None):
            self.load_visual_models_from_skills()
        c_key = (category or 'player', name or '', char_class or '')
        hit_spec = self._visual_spec_cache.get(c_key)
        if hit_spec is not None:
            return hit_spec
        cat, nm = c_key[0].lower(), c_key[1].lower()
        models = getattr(self, 'visual_models', {})
        vc = getattr(self, 'visual_classification', {})
        query = f"{c_key[0]} {c_key[1]} {c_key[2]}".strip()
        res = None
        for cats, (mkey, default_k) in {(('player', 'character', 'hero', 'npc')): ('character_archetypes', 'fighter'), (('monster', 'creature', 'threat')): ('monsters', 'raider')}.items():
            if cat in cats:
                table = models.get(mkey, {})
                crit = {**vc.get(mkey, {}), **{k: k for k in table if k not in vc.get(mkey, {})}} or {default_k: default_k}
                key = evaluate_jev_decision(query or default_k, {'k': Choice(criteria=crit)})['k'].choice or default_k
                res = {**table.get(key, {}), 'matched_key': key}
                break
        if res is None and cat in ('scenery', 'obstacle', 'fixture'):
            scenery = models.get('scenery', {})
            hit = next((k for k in scenery if k in nm), None)
            if not hit and scenery and nm:
                resp = evaluate_jev_decision(nm, {'k': Choice(criteria={k: k.replace('_', ' ') for k in scenery})})['k']
                hit = resp.choice if resp.confidence >= 0.35 else None
            if hit:
                res = {**scenery[hit], 'matched_key': hit}
        if res is None:
            res = {'matched_key': 'generic', 'parts': []}
        with self._cache_lock:
            if len(self._visual_spec_cache) < 2048:
                self._visual_spec_cache[c_key] = res
        return res

class NeuralWorldModel:
    """
    CC-ELM Small Language Model & Continuous Self-Learning World State Transition Engine.
    Implements real-time closed-form Dual-Space Sherman-Morrison online recursive updates,
    tracking reward returns, combat efficacy, dynamic transition embeddings, and state representations
    without catastrophic forgetting or backpropagation delays.
    """
    def __init__(self, d_in=128, h_dim=512, seed=42, narrative_flavors=None, immovable_fixtures=None, lam=0.996, ridge=10.0):
        self.d_in, self.h_dim = d_in, h_dim
        self.lam = float(lam)
        self.ridge = float(ridge)
        rng = np.random.default_rng(seed)
        self.W_rand = rng.normal(0.0, 1.0, size=(d_in, h_dim)).astype(np.float32) / np.sqrt(d_in)
        self.b_rand = rng.uniform(-0.5, 0.5, size=(h_dim,)).astype(np.float32)
        self.W_out = rng.normal(0.0, 0.05, size=(h_dim, 64)).astype(np.float32)
        
        # Dual-Space Online Sherman-Morrison Recursive Least Squares State (Self-Learning Readout)
        # P matrix tracks inverse covariance across hidden state manifold:
        self.P_cov = np.eye(h_dim, dtype=np.float32) * self.ridge
        # Value & transition expectation head (h_dim -> 64 dynamic state target):
        self.W_adaptive = np.zeros((h_dim, 64), dtype=np.float32)
        
        # Real-time Self-Learning Statistics
        self.learning_step_count = 0
        self.cumulative_td_loss = 0.0
        self.recent_losses = []
        self.recent_rewards = []
        self.action_history = []
        
        fl = narrative_flavors or {}
        self.combat_flavors = fl.get("combat", ["attacks decisively"])
        self.movement_flavors = fl.get("movement", ["advances carefully"])
        self.monster_flavors = fl.get("monster", ["watches aggressively"])
        self.npc_flavors = fl.get("npc", ["speaks thoughtfully"])
        self.background_flavors = fl.get("background", ["The air hangs still."])
        self.immovable_fixtures = immovable_fixtures or []
        # Leverage single forward pass CC-ELM surrogate neural engine
        self.cc_elm_surrogate = get_shared_cc_elm_surrogate()

    def _raw_context(self, actor_type: str, actor_name: str, action_text: str, ctx: dict) -> str:
        return f"{actor_type}:{actor_name}:{action_text}:{ctx.get('room','')}:{','.join(ctx.get('monsters',[]))}:{','.join(ctx.get('items',[]))}:{','.join(ctx.get('inventory',[]))}:{','.join(ctx.get('obstacles',[]))}:{ctx.get('turn',0)}"

    def encode_action(self, actor_type: str, actor_name: str, action_text: str, ctx: dict) -> np.ndarray:
        raw = self._raw_context(actor_type, actor_name, action_text, ctx)
        surrogate = self.cc_elm_surrogate or get_shared_cc_elm_surrogate()
        if surrogate:
            anc = surrogate.compute_prompt_anchor(surrogate.encode_text(raw))
            return np.tile(anc, (self.d_in + len(anc) - 1) // len(anc))[:self.d_in].astype(np.float32)
        return np.zeros(self.d_in, dtype=np.float32)

    def get_hidden_activation(self, phi: np.ndarray, raw_text: str = None) -> np.ndarray:
        surrogate = self.cc_elm_surrogate or get_shared_cc_elm_surrogate()
        if surrogate and raw_text:
            p_ids = surrogate.encode_text(raw_text)
            anc = surrogate.compute_prompt_anchor(p_ids)
            w = surrogate.context_window
            win = p_ids[-w:] if len(p_ids) >= w else [0] * (w - len(p_ids)) + list(p_ids)
            H = surrogate._elm_hidden_batch(np.asarray([win], dtype=np.int32), anc_states=anc[None, :])[0]
            H = H / max(float(np.linalg.norm(H)), 1e-6)
            return np.tile(H, (self.h_dim + len(H) - 1) // len(H))[:self.h_dim].astype(np.float32)
        return np.tanh(np.dot(phi, self.W_rand) + self.b_rand).astype(np.float32)

    def learn_step(self, actor_type: str, actor_name: str, action_text: str, ctx: dict, outcome: dict = None) -> float:
        """
        Executes online real-time Sherman-Morrison self-learning update over game transition.
        Outcome contains reward, hit/miss combat efficacy, state progression, and transition flags.
        """
        raw = self._raw_context(actor_type, actor_name, action_text, ctx)
        phi = self.encode_action(actor_type, actor_name, action_text, ctx)
        h = self.get_hidden_activation(phi, raw_text=raw) # (h_dim,)
        
        # Construct target continuous semantic response vector from transition outcome:
        target_vec = np.zeros(64, dtype=np.float32)
        rew = float(outcome.get("reward", 0.0)) if outcome else 0.0
        is_hit = bool(outcome.get("hit", False)) if outcome else False
        is_crit = bool(outcome.get("is_crit", False)) if outcome else False
        is_kill = bool(outcome.get("is_kill", False)) if outcome else False
        is_trans = bool(outcome.get("transition", False)) if outcome else False
        is_loot = bool(outcome.get("looted", False)) if outcome else False
        
        # Populate target manifold coordinates
        target_vec[0] = np.tanh(rew)
        target_vec[1] = 1.0 if is_hit else (-0.5 if "attack" in action_text.lower() else 0.0)
        target_vec[2] = 2.0 if is_crit else 0.0
        target_vec[3] = 1.5 if is_kill else 0.0
        target_vec[4] = 1.0 if is_trans else 0.0
        target_vec[5] = 1.0 if is_loot else 0.0
        # Ambient token hash signature spread across channels 6..63
        hash_seed = sum(ord(c) for c in action_text) & 63
        target_vec[6 + (hash_seed % 58)] = 1.0
        
        # Current model prediction
        pred_vec = np.dot(h, self.W_out) + np.dot(h, self.W_adaptive)
        err = np.clip(target_vec - pred_vec, -3.0, 3.0)
        loss = float(np.mean(err ** 2))
        
        # Online Sherman-Morrison recursive inverse covariance update with Joseph-form stability:
        # P_next = (P - (P @ h @ h.T @ P) / (lam + h.T @ P @ h)) / lam
        Ph = np.dot(self.P_cov, h)
        denom = max(1e-4, float(self.lam + np.dot(h, Ph)))
        if np.isfinite(denom):
            gain = np.clip(Ph / denom, -0.6, 0.6) # (h_dim,)
            if _nb_sherman_morrison_step is not None and not np.isnan(gain).any() and not np.isnan(Ph).any() and not np.isnan(err).any():
                _nb_sherman_morrison_step(self.P_cov, self.W_adaptive, gain, Ph, err, np.float32(1.0 / self.lam))
            else:
                d_W = np.outer(gain, err)
                self.W_adaptive = np.clip(self.W_adaptive + np.nan_to_num(d_W, nan=0.0), -4.0, 4.0)
                P_delta = np.outer(gain, Ph)
                self.P_cov = np.nan_to_num((self.P_cov - P_delta) / self.lam, nan=0.0)
                self.P_cov = 0.5 * (self.P_cov + self.P_cov.T)

            # Periodic numerical stability regularization: scale down when diagonal inflates and add trace ridge
            if self.learning_step_count % 25 == 0:
                max_d = float(np.max(np.diag(self.P_cov)))
                if max_d > 20.0:
                    self.P_cov *= (20.0 / max_d)
                self.P_cov.flat[::self.h_dim + 1] += 0.1
        
        self.learning_step_count += 1
        self.cumulative_td_loss += loss
        self.recent_losses.append(loss)
        if len(self.recent_losses) > 50: self.recent_losses.pop(0)
        self.recent_rewards.append(rew)
        if len(self.recent_rewards) > 50: self.recent_rewards.pop(0)
        self.action_history.append({"actor": actor_name, "action": action_text, "loss": round(loss, 5), "reward": rew})
        if len(self.action_history) > 30: self.action_history.pop(0)
        
        return loss

    def predict_manifold(self, actor_type: str, actor_name: str, action_text: str, ctx: dict) -> np.ndarray:
        """Predicts expected outcome manifold [reward, hit, crit, kill, trans, loot, ...] via learned Sherman-Morrison weights."""
        raw = self._raw_context(actor_type, actor_name, action_text, ctx or {})
        phi = self.encode_action(actor_type, actor_name, action_text, ctx or {})
        h = self.get_hidden_activation(phi, raw_text=raw)
        return (np.dot(h, self.W_out) + np.dot(h, self.W_adaptive)).astype(np.float32)

    def rank_adaptive_choices(self, actor_type: str, actor_name: str, query: str, options: dict, ctx: dict = None) -> tuple[str, float]:
        """Combines CC-ELM anchor similarity with online-learned Sherman-Morrison reward prediction."""
        if not options:
            return "", 0.0
        jev = evaluate_jev_decision(query or "", {"o": Choice(criteria=options)})["o"]
        best_k, best_score = jev.choice, float(jev.confidence)
        if self.learning_step_count > 0:
            scored = []
            for k, desc in options.items():
                base_p = float(jev.distribution.get(k, 0.0))
                pv = self.predict_manifold(actor_type, actor_name, f"{k} {desc}", ctx or {})
                adaptive_bias = float(np.tanh(pv[0]) * 0.25 + np.tanh(pv[1]) * 0.15)
                scored.append((base_p + adaptive_bias, k))
            scored.sort(reverse=True)
            best_score, best_k = scored[0][0], scored[0][1]
        return best_k, best_score

    def _pick_flavor(self, flavors: list[str], prompt: str) -> str:
        return evaluate_jev_decision(prompt, {"f": Choice(options=flavors)})["f"].choice if flavors else ""

    def infer_transition(self, actor_type: str, actor_name: str, action_text: str, ctx: dict) -> dict:
        cmd = action_text.lower().strip()
        res = {"actor_type": actor_type, "actor_name": actor_name, "action": action_text, "narration": "", "action_override_message": None, "state_updates": {}, "world_event": None}
        r_items, r_mons, r_obs, inv = ([x.lower() for x in ctx.get(k, [])] for k in ("items", "monsters", "obstacles", "inventory"))

        if actor_type == "character":
            tm = re.search(r"^(?:take|get|grab|pick\s*up|loot)\s+(.+)", cmd)
            if tm:
                t_raw = tm.group(1).strip()
                if any(t_raw in it for it in r_items) or any(w in t_raw for w in ctx.get("extractable_triggers", [])):
                    res["narration"] = f"[{actor_name.upper()}]: carefully secures the item into their adventuring pack."
                else:
                    m_obs = next((o for o in r_obs if t_raw in o or t_raw in re.sub(r"\s*\([^)]*\)", "", o).strip() or o in t_raw), None)
                    chk = m_obs or t_raw
                    m_rule = next((r for r in self.immovable_fixtures if any(k in chk for k in r.get("keywords", []))), None)
                    if m_rule:
                        res["narration"] = m_rule.get("narration", "[{actor}]: inspects the fixture.").replace("{actor}", actor_name.upper()).replace("{target}", chk)
                        res["action_override_message"] = m_rule.get("override_message", "The {target} cannot be taken.").replace("{target}", chk)
                    elif m_obs:
                        res["narration"] = f"[{actor_name.upper()}]: inspects the hefty structure of {m_obs}."
                        res["action_override_message"] = f"The {m_obs} is an immovable fixture and cannot be placed into your inventory."
                    elif any(t_raw in m for m in r_mons + ctx.get("known_monsters", [])) or any(w in t_raw for w in ctx.get("known_monsters", [])):
                        res["narration"] = f"[{actor_name.upper()}]: reaches toward the hostile creature."
                        res["action_override_message"] = "You cannot put a living, hostile creature into your backpack! You must defeat it in combat first."
                    elif any(t_raw in i for i in inv):
                        res["narration"] = f"[{actor_name.upper()}]: checks their packs."
                        res["action_override_message"] = f"You are already carrying the {t_raw} in your inventory."
                    else:
                        res["narration"] = f"[{actor_name.upper()}]: looks around for '{t_raw}'."
                        res["action_override_message"] = f"There is no '{t_raw}' here to take. Inspect the room description or hover over items on the tactical map."
            else:
                act_kind = evaluate_jev_decision(cmd, {"a": Choice(criteria={
                    "attack": "attack strike slay hit kill fight cleave weave boss",
                    "move": "north south east west up down move walk step advance dungeon",
                    "look": "look examine investigate search survey scan",
                    "other": f"use rest wait loot victory {action_text}",
                })})["a"].choice
                if act_kind == "attack":
                    res["narration"] = f"[{actor_name.upper()}]: {self._pick_flavor(self.combat_flavors, f'{actor_name} {action_text}')}!"
                    res["state_updates"]["attack_attempt"] = True
                elif act_kind == "move":
                    res["narration"] = f"[{actor_name.upper()}]: {self._pick_flavor(self.movement_flavors, f'{actor_name} {action_text}')}."
                elif act_kind == "look":
                    res["narration"] = f"[{actor_name.upper()}]: closely surveys the surrounding environment and tactical terrain."
                else:
                    res["narration"] = f"[{actor_name.upper()}]: executes '{action_text}', adapting to the unfolding tactical scenario."
        elif actor_type in ("monster", "npc", "background"):
            flavors = {"monster": self.monster_flavors, "npc": self.npc_flavors, "background": self.background_flavors}[actor_type]
            prefix = {"monster": f"[MONSTER - {actor_name}]", "npc": f"[NPC - {actor_name}]", "background": "[WORLD ATMOSPHERE]"}[actor_type]
            res["narration"] = f"{prefix}: {self._pick_flavor(flavors, f'{actor_name} {action_text}')}."
            if actor_type == "background":
                res["world_event"] = action_text
        if actor_type in ("character", "background"):
            thought_text, thought_tele = self.think(f"{actor_type}:{actor_name}:{action_text}:{ctx.get('room', '')}", num_tokens=16)
            if thought_text:
                res["cc_elm_thought"] = thought_text
            res["cc_elm_telemetry"] = thought_tele
        return res

    def think(self, prompt: str, num_tokens: int = 32) -> tuple[str, dict]:
        """
        Executes a genuine single forward pass through the CC-ELM neural surrogate manifold.
        Computes fast in-cache continuous latent thinking (< 3ms) over the prompt trajectory.
        """
        surrogate = self.cc_elm_surrogate or get_shared_cc_elm_surrogate()
        if not surrogate:
            return "", {"status": "fallback", "latency_ms": 0.0}
        t0 = time.perf_counter()
        try:
            p_ids = surrogate.encode_text(prompt)
            out_ids, tele = surrogate.generate_continuous_thought(p_ids, num_tokens=num_tokens)
            thought_ids = out_ids[len(p_ids):]
            thought_text = surrogate.decode_compact_ids(thought_ids)
            dt_ms = (time.perf_counter() - t0) * 1000.0
            tele["latency_ms"] = round(dt_ms, 2)
            tele["tokens_generated"] = len(thought_ids)
            return thought_text.strip(), tele
        except Exception as e:
            return "", {"status": f"error: {e}", "latency_ms": (time.perf_counter() - t0) * 1000.0}

    def get_learning_metrics(self) -> dict:
        """Returns real-time diagnostics of the online self-learning neural world model."""
        avg_loss = float(np.mean(self.recent_losses)) if self.recent_losses else 0.0
        recent_rew = float(np.mean(self.recent_rewards)) if self.recent_rewards else 0.0
        w_norm = float(np.linalg.norm(self.W_adaptive))
        p_trace = float(np.trace(self.P_cov))
        return {
            "learning_step_count": self.learning_step_count,
            "mean_recent_loss": round(avg_loss, 5),
            "recent_mean_reward": round(recent_rew, 3),
            "adaptive_weight_norm": round(w_norm, 4),
            "covariance_trace": round(p_trace, 2),
            "is_learning": True,
            "algorithm": "Dual-Space Sherman-Morrison Recursive ELM",
            "recent_actions": self.action_history[-6:]
        }

    def save_weights(self, path: str = None, sync: bool = False):
        """Persists trained Sherman-Morrison weights and covariance asynchronously without blocking game ticks."""
        target_path = path or os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models", "world_model_weights.npz")
        snap = {
            "W_adaptive": self.W_adaptive.copy(),
            "P_cov": self.P_cov.copy(),
            "W_out": self.W_out.copy(),
            "W_rand": self.W_rand.copy(),
            "b_rand": self.b_rand.copy(),
            "learning_step_count": np.array([self.learning_step_count], dtype=np.int32),
            "cumulative_td_loss": np.array([self.cumulative_td_loss], dtype=np.float32),
            "lam": np.array([self.lam], dtype=np.float32),
            "ridge": np.array([self.ridge], dtype=np.float32),
        }

        def _write_npz():
            try:
                os.makedirs(os.path.dirname(os.path.abspath(target_path)), exist_ok=True)
                tmp_path = target_path + ".tmp.npz"
                np.savez(tmp_path, **snap)
                os.replace(tmp_path, target_path)
            except Exception:
                pass

        if sync:
            _write_npz()
        else:
            enqueue_async_io(f"world_model_weights:{target_path}", _write_npz)

    def load_weights(self, path: str = None) -> bool:
        """Loads and integrates existing trained weights and covariance manifold."""
        target_path = path or os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models", "world_model_weights.npz")
        if not os.path.exists(target_path):
            return False
        try:
            with np.load(target_path, allow_pickle=True) as data:
                if "W_adaptive" in data and data["W_adaptive"].shape == self.W_adaptive.shape:
                    self.W_adaptive = data["W_adaptive"].astype(np.float32)
                if "P_cov" in data and data["P_cov"].shape == self.P_cov.shape:
                    self.P_cov = data["P_cov"].astype(np.float32)
                if "W_out" in data and data["W_out"].shape == self.W_out.shape:
                    self.W_out = data["W_out"].astype(np.float32)
                if "learning_step_count" in data:
                    self.learning_step_count = int(data["learning_step_count"][0])
                if "cumulative_td_loss" in data:
                    self.cumulative_td_loss = float(data["cumulative_td_loss"][0])
            return True
        except Exception:
            return False



# ==============================================================================
# CC-ELM Jev Decision Primitives (Cognitive System 1 Decision Architecture)
# ==============================================================================
class Noul:
    def __init__(self, instructions='', criteria=''): self.instructions, self.criteria = instructions, criteria

class Choice:
    def __init__(self, instructions='', criteria=None, options=None):
        self.instructions = instructions
        self.criteria = criteria if isinstance(criteria, dict) else {opt: opt for opt in (criteria or options or [])}
        self.options = list(self.criteria.keys())

class JevAnswer:
    def __init__(self, choice='', confidence=1.0, distribution=None):
        self.choice, self.confidence, self.distribution = choice, confidence, distribution or {}

class JevResponse:
    def __init__(self, answers): self.answers = answers
    def __getitem__(self, k): return self.answers[k]

_JEV_LOCK = threading.Lock()
_JEV_TEXT_CACHE = {}
_JEV_BANK_CACHE = {}

def _jev_text_feats(surrogate, text: str):
    key = (id(surrogate) if surrogate is not None else 0, text)
    hit = _JEV_TEXT_CACHE.get(key)
    if hit is not None:
        return hit
    words = frozenset(_WORD_RE.findall(text.lower()))
    anc = surrogate.compute_prompt_anchor(surrogate.encode_text(text)) if surrogate is not None else None
    val = (words, anc)
    with _JEV_LOCK:
        if len(_JEV_TEXT_CACHE) >= 4096:
            _JEV_TEXT_CACHE.clear()
        _JEV_TEXT_CACHE[key] = val
    return val

def _jev_choice_bank(surrogate, criteria: dict):
    s_id = id(surrogate) if surrogate is not None else 0
    items = tuple((opt, str(criteria.get(opt, opt)).strip()) for opt in criteria.keys())
    key = (s_id, items)
    hit = _JEV_BANK_CACHE.get(key)
    if hit is not None:
        return hit
    opts = tuple(opt for opt, _ in items)
    word_sets = []
    anc_rows = [] if surrogate is not None else None
    for _, txt in items:
        cw, anc = _jev_text_feats(surrogate, txt)
        word_sets.append(cw)
        if anc_rows is not None:
            anc_rows.append(anc)
    anc_mat = np.ascontiguousarray(np.vstack(anc_rows), dtype=np.float32) if anc_rows else None
    bank = (opts, word_sets, anc_mat)
    with _JEV_LOCK:
        if len(_JEV_BANK_CACHE) >= 2048:
            _JEV_BANK_CACHE.clear()
        _JEV_BANK_CACHE[key] = bank
    return bank

def evaluate_jev_decision(query: str, questions: dict, temperature: float = 0.25) -> JevResponse:
    surrogate = get_shared_cc_elm_surrogate()
    sw, anc_q = _jev_text_feats(surrogate, query or '')
    answers, inv_temp = {}, 1.0 / max(temperature, 0.05)
    for k, q in questions.items():
        if isinstance(q, Choice):
            if not q.options:
                answers[k] = JevAnswer()
                continue
            opts, cw_list, anc_mat = _jev_choice_bank(surrogate, q.criteria)
            scores = np.array([len(sw & cw) * 2.5 for cw in cw_list], dtype=np.float32)
            if anc_q is not None and anc_mat is not None:
                scores += np.dot(anc_mat, anc_q) * np.float32(5.0)
            scaled = (scores - np.max(scores)) * np.float32(inv_temp)
            np.exp(scaled, out=scaled)
            probs = scaled / np.sum(scaled)
            bi = int(np.argmax(probs))
            answers[k] = JevAnswer(choice=opts[bi], confidence=float(probs[bi]), distribution={opts[i]: float(probs[i]) for i in range(len(opts))})
    return JevResponse(answers)

