"""HTTP server, streaming broadcast, public tunnels, and hot-reload file watching."""
import os, sys, re, time, json, io, base64, hashlib, urllib.parse, webbrowser, socketserver, gzip, struct, threading, signal, importlib, socket, queue
import http.server
from PIL import Image, ImageDraw
import numpy as np
from .constants import HTML_TEMPLATE_PATH, APP_JS_PATH
from .core_models import VisualCompositor, NeuralWorldModel, get_shared_cc_elm_surrogate
from .action_catalog import get_action_catalog_payload

def _load_default_template() -> str:
    if os.path.exists(HTML_TEMPLATE_PATH):
        try:
            with open(HTML_TEMPLATE_PATH, "r", encoding="utf-8") as f:
                return f.read()
        except Exception:
            pass
    return "<!DOCTYPE html><html><body><h1>Tactical Game Console</h1><script src='/app.js'></script></body></html>"

HTML_TEMPLATE = _load_default_template()

class GameWebServer:
    """Lightweight HTTP server hosting tactical game consoles on localhost:8080 and public tunnel."""
    _favicon_bytes = None

    @classmethod
    def get_favicon_bytes(cls) -> bytes:
        if cls._favicon_bytes is None:
            # Procedurally synthesize an 8-pointed Starforge Meridian Compass icon
            img = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
            draw = ImageDraw.Draw(img)
            cx, cy, r = 16, 16, 14
            poly_pts = [
                (cx, cy - r),
                (cx + int(r * 0.7), cy - int(r * 0.7)),
                (cx + r, cy),
                (cx + int(r * 0.7), cy + int(r * 0.7)),
                (cx, cy + r),
                (cx - int(r * 0.7), cy + int(r * 0.7)),
                (cx - r, cy),
                (cx - int(r * 0.7), cy - int(r * 0.7))
            ]
            draw.polygon(poly_pts, fill=(14, 116, 144), outline=(245, 158, 11))
            draw.ellipse([cx - 5, cy - 5, cx + 5, cy + 5], fill=(250, 204, 21), outline=(255, 255, 255))
            buf = io.BytesIO()
            img.save(buf, format="ICO")
            cls._favicon_bytes = buf.getvalue()
        return cls._favicon_bytes

    _html_cache = (0.0, "")
    _js_cache = (0.0, b"", b"", "0")
    _cc_elm_client_cache = None

    @classmethod
    def get_client_cc_elm_payload(cls) -> dict:
        """Serializes the compact ~86 KB CC-ELM semantic anchor encoder (W_anc, token_idf, vocab_tokens) for browser inference."""
        if cls._cc_elm_client_cache is not None:
            return cls._cc_elm_client_cache
        surrogate = get_shared_cc_elm_surrogate()
        if not surrogate or getattr(surrogate, "W_anc", None) is None or not getattr(surrogate, "vocab_tokens", None):
            return {"available": False}
        w_anc = np.ascontiguousarray(surrogate.W_anc, dtype="<f4")
        t_idf = getattr(surrogate, "token_idf", None)
        idf_arr = np.ascontiguousarray(t_idf, dtype="<f4") if t_idf is not None else np.ones(w_anc.shape[0], dtype="<f4")
        cls._cc_elm_client_cache = {
            "available": True,
            "vocab_tokens": list(surrogate.vocab_tokens),
            "vocab_size": int(w_anc.shape[0]),
            "anchor_dim": int(w_anc.shape[1]),
            "token_idf_b64": base64.b64encode(idf_arr.tobytes()).decode("ascii"),
            "W_anc_b64": base64.b64encode(w_anc.tobytes()).decode("ascii"),
        }
        return cls._cc_elm_client_cache

    @classmethod
    def get_live_html_template(cls) -> str:
        """Reads HTML template dynamically from web/index.html with mtime-based memory caching."""
        try:
            html_path = HTML_TEMPLATE_PATH
            if os.path.exists(html_path):
                mt = os.path.getmtime(html_path)
                if cls._html_cache[0] == mt and cls._html_cache[1]:
                    return cls._html_cache[1]
                with open(html_path, "r", encoding="utf-8") as f:
                    content = f.read()
                cls._html_cache = (mt, content)
                return content
        except Exception:
            pass
        return HTML_TEMPLATE

    @classmethod
    def get_live_app_js_bytes(cls) -> tuple[bytes, bytes]:
        """Returns (raw_utf8_bytes, gzipped_bytes) of web/app.js cached in memory by mtime."""
        try:
            import glob as _glob
            js_files = sorted(_glob.glob(os.path.join(os.path.dirname(APP_JS_PATH), "js", "*.js")))
            if js_files:
                mt = max(os.path.getmtime(f_) for f_ in js_files)
                if cls._js_cache[0] == mt and cls._js_cache[1]:
                    return cls._js_cache[1], cls._js_cache[2]
                raw_bytes = b"\n".join(open(f_, "rb").read() for f_ in js_files)
                gz_bytes = gzip.compress(raw_bytes, compresslevel=1)
                js_ver = hashlib.blake2b(raw_bytes, digest_size=6).hexdigest()
                cls._js_cache = (mt, raw_bytes, gz_bytes, js_ver)
                return raw_bytes, gz_bytes
        except Exception:
            pass
        return b"", b""

    @classmethod
    def get_live_app_js_ver(cls) -> str:
        cls.get_live_app_js_bytes()
        return cls._js_cache[3] if len(cls._js_cache) > 3 else "0"

    @classmethod
    def get_live_app_js(cls) -> str:
        """Reads JavaScript dynamically from web/app.js to support instant frontend script hotloading."""
        raw_b, _ = cls.get_live_app_js_bytes()
        return raw_b.decode("utf-8", errors="replace")

    @staticmethod
    def _prebuild_sig(obj) -> str:
        raw = json.dumps(obj, sort_keys=True, separators=(",", ":"), default=str).encode("utf-8")
        return hashlib.blake2b(raw, digest_size=12).hexdigest()

    @staticmethod
    def _sync_prebuild_bucket(old_map, items, build_fn):
        """Reuses cached objects with matching signatures and only regenerates missing/stale entries."""
        old_map = old_map if isinstance(old_map, dict) else {}
        new_map, misses, hits = {}, [], 0
        for k, sig, arg in items:
            prev = old_map.get(k)
            if isinstance(prev, dict) and prev.get("sig") == sig and "val" in prev:
                new_map[k] = prev
                hits += 1
            else:
                misses.append((k, sig, arg))
        if len(misses) > 1:
            from concurrent.futures import ThreadPoolExecutor
            with ThreadPoolExecutor(max_workers=min(len(misses), os.cpu_count() or 4)) as ex:
                for (k, sig, _), val in zip(misses, ex.map(lambda it: build_fn(it[0], it[2]), misses)):
                    if val is not None:
                        new_map[k] = {"sig": sig, "val": val}
        else:
            for k, sig, arg in misses:
                val = build_fn(k, arg)
                if val is not None:
                    new_map[k] = {"sig": sig, "val": val}
        pruned = bool(set(old_map.keys()) - set(new_map.keys()))
        return new_map, hits, len(misses), (bool(misses) or pruned)

    def warmup_prebuild_cache(self) -> dict:
        """Loads persisted startup prebuilds from disk and regenerates only uncached or modified objects."""
        game = self.game
        slug = re.sub(r"[^a-zA-Z0-9_-]", "_", getattr(game, "skill_name", "default") or "default")
        cache_fp = os.path.join(self.prebuild_cache_dir, f"{slug}.json")
        with self._prebuild_lock:
            disk = self._prebuild_mem.get(slug)
            if disk is None and os.path.isfile(cache_fp):
                try:
                    with open(cache_fp, "r", encoding="utf-8") as f:
                        disk = json.load(f)
                except Exception:
                    disk = {}
            disk = disk if isinstance(disk, dict) else {}
            core_dir = os.path.dirname(os.path.abspath(__file__))
            code_mt = [os.path.getmtime(os.path.join(core_dir, fn)) for fn in ("core_models.py", "session_combat.py") if os.path.exists(os.path.join(core_dir, fn))]
            env_sig = self._prebuild_sig([code_mt, getattr(getattr(game, "compositor", None), "environment_themes", None), getattr(game, "scenery_classification", None)])
            vis_sig = self._prebuild_sig([code_mt, getattr(getattr(game, "compositor", None), "visual_models", None), getattr(getattr(game, "compositor", None), "visual_classification", None)])

            room_items = [(rk, self._prebuild_sig([rv, (getattr(game, "room_bounds", None) or {}).get(rk), env_sig]), None) for rk, rv in (getattr(game, "rooms_def", None) or {}).items()]
            rooms_map, r_hits, r_misses, r_dirty = self._sync_prebuild_bucket(disk.get("rooms"), room_items, lambda rk, _: game.build_room_static_payload(rk))

            comp = getattr(game, "compositor", None)
            arch_items = [(f"{a.get('name', 'Hero')}::{a.get('class', 'Fighter')}", self._prebuild_sig([a, vis_sig]), a) for a in (getattr(game, "current_archetypes", None) or [])] if comp else []
            arch_map, a_hits, a_misses, a_dirty = self._sync_prebuild_bucket(disk.get("archetypes"), arch_items, lambda _, a: {"name": a.get("name", "Hero"), "class": a.get("class", "Fighter"), "visual_spec": comp.build_entity_visual_spec(category="player", name=a.get("name", "Hero"), char_class=a.get("class", "Fighter"))})

            best_items = [(bk, self._prebuild_sig([bk, bv, vis_sig]), (bk, bv)) for bk, bv in (getattr(game, "bestiary_def", None) or {}).items()] if comp else []
            best_map, b_hits, b_misses, b_dirty = self._sync_prebuild_bucket(disk.get("bestiary"), best_items, lambda _, pair: (lambda mnm: {"name": mnm, "visual_spec": comp.build_entity_visual_spec(category="monster", name=mnm)})((pair[1].get("name") if isinstance(pair[1], dict) else None) or pair[0]))

            cc_b = self.get_client_cc_elm_payload()
            skills_b = game.get_client_skills_bundle() if hasattr(game, "get_client_skills_bundle") else {}
            self.get_live_html_template()
            self.get_live_app_js_bytes()
            m_hash = self._prebuild_sig([
                {rk: rooms_map[rk]["sig"] for rk in rooms_map},
                {ak: arch_map[ak]["sig"] for ak in arch_map},
                {bk: best_map[bk]["sig"] for bk in best_map},
                cc_b.get("vocab_size"), cc_b.get("anchor_dim"),
                getattr(game, "skill_name", ""), skills_b.get("client"), skills_b.get("rooms"),
            ])

            out = {"rooms": rooms_map, "archetypes": arch_map, "bestiary": best_map, "manifest_hash": m_hash}
            self._prebuild_mem[slug] = out
            self.prebuild_stats = {"room_hits": r_hits, "room_misses": r_misses, "spec_hits": a_hits + b_hits, "spec_misses": a_misses + b_misses}
            if r_dirty or a_dirty or b_dirty or not os.path.isfile(cache_fp):
                try:
                    os.makedirs(self.prebuild_cache_dir, exist_ok=True)
                    tmp_fp = f"{cache_fp}.{threading.get_ident()}.tmp"
                    with open(tmp_fp, "w", encoding="utf-8") as f:
                        json.dump(out, f, separators=(",", ":"))
                    os.replace(tmp_fp, cache_fp)
                except Exception:
                    pass
            return out

    def __init__(self, game_session, host="0.0.0.0", port=8080, public_tunnel=True):
        self.game, self.host, self.port, self.public_tunnel = game_session, host, port, public_tunnel
        # Store child process references for clean exit handling on Ctrl+C
        self.tunnel_processes = []
        self.public_url = None
        self.stream_clients = set()
        self.stream_lock = threading.Lock()
        self.prebuild_cache_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".prebuild_cache")
        self._prebuild_lock = threading.Lock()
        self._prebuild_mem = {}
        self.prebuild_stats = {"room_hits": 0, "room_misses": 0, "spec_hits": 0, "spec_misses": 0}
        self.warmup_prebuild_cache()

    def _start_public_tunnel(self):
        """Starts a public HTTPS internet tunnel (Cloudflare Quick Tunnel -> localhost.run SSH -> localtunnel fallback)."""
        def _run_provider(label, cmd, url_re, shell=False, timeout_s=12.0):
            import subprocess
            stop_ev = getattr(self, "server_stop_event", None)
            try:
                p = subprocess.Popen(cmd, shell=shell, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding="utf-8", errors="replace", bufsize=1)
            except Exception:
                return False
            self.tunnel_processes.append(p)
            got_url = threading.Event()
            def _watch():
                if not got_url.wait(timeout_s) and not (stop_ev and stop_ev.is_set()):
                    try: p.terminate(); p.kill()
                    except Exception: pass
            threading.Thread(target=_watch, daemon=True).start()
            try:
                for line in iter(p.stdout.readline, ""):
                    if stop_ev and stop_ev.is_set():
                        break
                    m = re.search(url_re, line.strip())
                    if m:
                        url = m.group(m.lastindex or 0).rstrip(".,]")
                        if not got_url.is_set():
                            got_url.set()
                        def _publish(u=url):
                            host = urllib.parse.urlparse(u).hostname or ""
                            if "trycloudflare.com" in host:
                                time.sleep(1.5)
                            deadline = time.time() + 20.0
                            while time.time() < deadline and not (stop_ev and stop_ev.is_set()):
                                try:
                                    socket.getaddrinfo(host, 443)
                                    break
                                except Exception:
                                    time.sleep(0.8)
                            if u != self.public_url and not (stop_ev and stop_ev.is_set()):
                                self.public_url = u
                                print(f"\n{'*'*70}\n[LIVE PUBLIC INTERNET GAME URL ({label})]: {u}\n(Share this URL with anyone on the internet to play together!)\n{'*'*70}\n", flush=True)
                        threading.Thread(target=_publish, daemon=True).start()
                p.wait()
            except Exception:
                pass
            finally:
                got_url.set()
                try: p.terminate()
                except Exception: pass
            return got_url.is_set()

        def tunnel_worker():
            import shutil
            time.sleep(0.3)
            print(f"\n[INTERNET TUNNEL]: Hosting public HTTPS link for port {self.port}...", flush=True)
            stop_ev = getattr(self, "server_stop_event", None)
            providers = []
            cf_bin = shutil.which("cloudflared") or next((p for p in (
                os.path.join(os.environ.get("ProgramFiles(x86)", ""), "cloudflared", "cloudflared.exe"),
                os.path.join(os.environ.get("ProgramFiles", ""), "cloudflared", "cloudflared.exe"),
                os.path.join(os.environ.get("LOCALAPPDATA", ""), "cloudflared", "cloudflared.exe"),
            ) if p and os.path.isfile(p)), None)
            if cf_bin:
                providers.append(("Cloudflare Edge", [cf_bin, "tunnel", "--url", f"http://127.0.0.1:{self.port}", "--no-autoupdate"], r"(https://[a-zA-Z0-9.-]+\.trycloudflare\.com)", False))
            ssh_bin = shutil.which("ssh")
            if ssh_bin:
                providers.append(("localhost.run", [ssh_bin, "-T", "-o", "StrictHostKeyChecking=no", "-o", "BatchMode=yes", "-o", "ConnectTimeout=10", "-o", "ServerAliveInterval=30", "-o", "ServerAliveCountMax=3", "-R", f"80:127.0.0.1:{self.port}", "nokey@localhost.run"], r"(https://[a-zA-Z0-9.-]+\.lhr\.life\b)", False))
            npx_bin = shutil.which("npx")
            if npx_bin:
                providers.append(("localtunnel", f"npx --yes localtunnel --port {self.port}", r"(https://[a-zA-Z0-9.-]+\.loca\.lt\b)", True))
            if not providers:
                print("[INTERNET TUNNEL]: No tunnel binary found (cloudflared, ssh, or npx).", flush=True)
                return
            while not (stop_ev and stop_ev.is_set()):
                for label, cmd, pat, use_shell in providers:
                    if stop_ev and stop_ev.is_set():
                        return
                    if _run_provider(label, cmd, pat, shell=use_shell) and not (stop_ev and stop_ev.is_set()):
                        time.sleep(1.5)
                        break
                else:
                    time.sleep(3.0)

        threading.Thread(target=tunnel_worker, daemon=True).start()

    def reload_code_in_place(self) -> bool:
        """Hot-reloads Python classes and methods from disk into the running server & game session without shutting down."""
        try:
            importlib.invalidate_caches()
            pkg = __package__ or "core"
            engine_modules = []
            for m in list(sys.modules.keys()):
                if m == "run_game" or m == pkg or m.startswith(f"{pkg}."):
                    mod = sys.modules.get(m)
                    mod_file = getattr(mod, "__file__", None) if mod is not None else None
                    if mod is None or getattr(mod, "__spec__", None) is None or (mod_file and not os.path.exists(mod_file)):
                        sys.modules.pop(m, None)
                    else:
                        engine_modules.append(m)
            priority_order = [f"{pkg}.{s}" for s in ("constants", "core_models", "session_dialogue", "session_systems", "session_state", "session_navigation", "session_combat", "web_server")] + [pkg, "run_game"]
            ordered_modules = [m for m in priority_order if m in engine_modules] + [m for m in engine_modules if m not in priority_order]

            for m_name in ordered_modules:
                try:
                    importlib.reload(sys.modules[m_name])
                except ModuleNotFoundError as me:
                    if getattr(me, "name", None) == m_name or "spec not found" in str(me):
                        sys.modules.pop(m_name, None)
                    else:
                        print(f"[HOTLOAD MODULE RELOAD ERROR] {m_name}: {me}", flush=True)
                except Exception as me:
                    print(f"[HOTLOAD MODULE RELOAD ERROR] {m_name}: {me}", flush=True)

            cm = importlib.import_module(f"{pkg}.core_models")
            gs = importlib.import_module(pkg)
            ws = importlib.import_module(f"{pkg}.web_server")

            NewCompositor = getattr(cm, "VisualCompositor", None)
            NewWorldModel = getattr(cm, "NeuralWorldModel", None)
            NewGameSession = getattr(gs, "GameSession", None)
            NewWebServer = getattr(ws, "GameWebServer", None)

            if NewWebServer:
                self.__class__ = NewWebServer
            if not hasattr(self, "stream_clients") or self.stream_clients is None:
                self.stream_clients = set()
            if not hasattr(self, "stream_lock") or self.stream_lock is None:
                self.stream_lock = threading.Lock()
            # Patch any already-running ThreadedTCPServer RequestHandler class in-place so hotload updates HTTP handlers live
            try:
                import gc
                web_server_ref = self
                for obj in gc.get_objects():
                    if isinstance(obj, socketserver.TCPServer) and getattr(obj, "server_address", (None, None))[1] == self.port:
                        RH = obj.RequestHandlerClass
                        def _hot_send_json(h_self, payload_obj):
                            data = json.dumps(payload_obj, separators=(",", ":")).encode("utf-8")
                            accept_enc = h_self.headers.get("Accept-Encoding", "") if hasattr(h_self, "headers") and h_self.headers else ""
                            use_gzip = "gzip" in accept_enc and len(data) > 512
                            if use_gzip:
                                data = gzip.compress(data, compresslevel=1)
                            h_self.send_response(200)
                            h_self.send_header("Content-Type", "application/json; charset=utf-8")
                            if use_gzip:
                                h_self.send_header("Content-Encoding", "gzip")
                            h_self.send_header("Content-Length", str(len(data)))
                            h_self.send_header("Cache-Control", "no-cache")
                            h_self.send_header("Access-Control-Allow-Origin", "*")
                            h_self.end_headers()
                            h_self.wfile.write(data)
                        RH._send_json = _hot_send_json
                        RH.do_GET = lambda h_self: web_server_ref.handle_http_get(h_self)
                        RH.do_POST = lambda h_self: web_server_ref.handle_http_post(h_self)
            except Exception:
                pass
            if NewGameSession and self.game:
                with self.game.state_lock:
                    self.game.__class__ = NewGameSession
                    if NewCompositor and hasattr(self.game, "compositor"):
                        self.game.compositor.__class__ = NewCompositor
                        self.game.compositor.sprite_cache.clear()
                        self.game.compositor.texture_cache.clear()
                        self.game.compositor._theme_cache.clear()
                        self.game.compositor._visual_spec_cache.clear()
                    if NewWorldModel and hasattr(self.game, "world_model"):
                        self.game.world_model.__class__ = NewWorldModel
                    try:
                        self.game.load_skill(self.game.skill_name)
                        if self.game.current_room == self.game.start_room:
                            reset_cfg = getattr(self.game, "start_room_reset", {})
                            for ev in reset_cfg.get("discard_events", []):
                                self.game.triggered_events.discard(ev)
                            for dm in reset_cfg.get("discard_defeated_monsters", []):
                                self.game.defeated_monsters.discard(dm)
                            self.game.room_monsters[self.game.start_room] = []
                            self.game.monster_states[self.game.start_room] = []
                            sp = self.game.room_bounds.get(self.game.start_room, {}).get("spawn", [140, 390])
                            self.game.player_x, self.game.player_y = float(sp[0]), float(sp[1])
                            for pid, po in list(self.game.players.items()):
                                if po.get("room") == self.game.start_room:
                                    px, py = self.game.find_open_position(sp[0], sp[1], exclude_player_id=pid, min_spacing=64.0)
                                    po["x"], po["y"], po["facing"] = px, py, "east"
                    except Exception:
                        pass
                    self.game.scene_dirty = True
            self._prebuild_mem.clear()
            self.warmup_prebuild_cache()
            self.ensure_stream_thread()
            return True
        except Exception as e:
            print(f"[HOTLOAD WARNING]: Error applying hot-reload: {e}", flush=True)
            return False

    def ensure_stream_thread(self):
        if getattr(self, "_stream_thread_running", False):
            return
        self._stream_thread_running = True
        t = threading.Thread(target=self._stream_broadcast_worker, daemon=True)
        t.start()

    def _stream_broadcast_worker(self):
        fps = 30.0
        game = self.game
        if not getattr(game, "last_frame_packet", b""):
            try:
                game.last_frame_packet = game.render_and_encode_mjpeg_packet()
            except Exception:
                pass
        last_broadcast_time = time.time()
        needs_flush = False
        stop_ev = getattr(self, "server_stop_event", None)

        while not (stop_ev and stop_ev.is_set()):
            t0 = time.perf_counter()
            now = time.time()
            game = self.game

            with game.state_lock:
                stale_gp = [pid for pid, po in game.players.items() if pid.startswith("gp_") and now - po.get("last_active", 0) > 5.0]
                for pid in stale_gp:
                    del game.players[pid]
                    game.scene_dirty = True
                if now - getattr(game, "_last_ai_step_time", 0.0) >= 0.85:
                    game._last_ai_step_time = now
                    try:
                        active_monsters = game.get_monsters_in_room(game.current_room)
                        has_combat = bool(active_monsters)
                        is_player_moving = (now - getattr(game, "last_human_move_time", 0.0)) <= 1.2
                        # In background worker: only step party AI if in combat or if player is actively moving
                        bg_m_logs = game.step_monsters_turn(game.current_room) if has_combat else []
                        bg_ai_logs = game.step_ai_party_members(allow_combat=True) if (has_combat or is_player_moving) else []
                        if hasattr(game, "step_autonomous_ecology"):
                            game.step_autonomous_ecology(game.current_room)
                        for po in list(game.players.values()):
                            if po.get("is_downed") and po.get("downed_until", 0) > 0 and now >= po["downed_until"]:
                                game.respawn_player(po["id"])
                        combat_feed = (bg_m_logs or []) + (bg_ai_logs or [])
                        if combat_feed:
                            if not hasattr(game, "pending_events"):
                                game.pending_events = []
                            game.pending_events.append({
                                "turn": game.turn_count + 1,
                                "message": "\n".join(combat_feed),
                                "battle_triggered": True
                            })
                    except Exception:
                        pass

            with self.stream_lock:
                clients = list(self.stream_clients)

            if clients and (getattr(game, "scene_dirty", False) or needs_flush or now - last_broadcast_time > 15.0):
                if getattr(game, "scene_dirty", False):
                    game.scene_dirty = False
                    needs_flush = True
                    try:
                        game.last_frame_packet = game.render_and_encode_mjpeg_packet()
                    except Exception:
                        pass
                else:
                    needs_flush = False

                last_broadcast_time = now
                pkt = game.last_frame_packet
                for cq in clients:
                    if hasattr(cq, "full"):
                        if cq.full():
                            try:
                                cq.get_nowait()
                            except Exception:
                                pass
                        try:
                            cq.put_nowait(pkt)
                        except Exception:
                            pass

            elapsed = time.perf_counter() - t0
            time.sleep(max(0.001, (1.0 / fps) - elapsed))

    def handle_http_get(self, handler):
        game = self.game
        try:
            if hasattr(handler, "connection") and handler.connection:
                handler.connection.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        except Exception:
            pass
        parsed = urllib.parse.urlparse(handler.path)
        accept_enc = handler.headers.get("Accept-Encoding", "") if hasattr(handler, "headers") and handler.headers else ""
        supports_gzip = "gzip" in accept_enc
        eng_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        def _serve_file(fn: str, dirs: list[str], ctype: str, max_age: int):
            p = next((os.path.join(d, fn) for d in dirs if os.path.isfile(os.path.join(d, fn))), None)
            if not p:
                return handler.send_error(404)
            f_cache = getattr(self, "_static_file_cache", None)
            if f_cache is None:
                f_cache = self._static_file_cache = {}
            mt = os.path.getmtime(p)
            hit = f_cache.get(p)
            if not hit or hit[0] != mt:
                with open(p, "rb") as f:
                    raw_b = f.read()
                gz_b = gzip.compress(raw_b, compresslevel=1) if (len(raw_b) > 512 and ctype.startswith(("model/", "image/svg"))) else None
                hit = (mt, raw_b, gz_b)
                f_cache[p] = hit
            _, raw_b, gz_b = hit
            use_gz = supports_gzip and gz_b is not None
            out_b = gz_b if use_gz else raw_b
            handler.send_response(200)
            handler.send_header("Content-Type", ctype)
            if use_gz:
                handler.send_header("Content-Encoding", "gzip")
            handler.send_header("Content-Length", str(len(out_b)))
            handler.send_header("Cache-Control", f"public, max-age={max_age}")
            handler.send_header("Access-Control-Allow-Origin", "*")
            handler.end_headers()
            handler.wfile.write(out_b)
            handler.wfile.flush()
        if parsed.path.startswith("/js/") and parsed.path.endswith(".js"):
            js_fp = os.path.join(os.path.dirname(APP_JS_PATH), "js", os.path.basename(parsed.path))
            if os.path.isfile(js_fp):
                with open(js_fp, "rb") as jf:
                    jb = jf.read()
                if supports_gzip:
                    jb = gzip.compress(jb, compresslevel=1)
                handler.send_response(200)
                handler.send_header("Content-Type", "application/javascript; charset=utf-8")
                if supports_gzip:
                    handler.send_header("Content-Encoding", "gzip")
                handler.send_header("Content-Length", str(len(jb)))
                handler.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
                handler.end_headers()
                handler.wfile.write(jb)
            else:
                handler.send_error(404)
        elif parsed.path in ("/app.js", "/static/app.js"):
            raw_js, gz_js = self.get_live_app_js_bytes()
            js_ver = self.get_live_app_js_ver()
            q_js = urllib.parse.parse_qs(parsed.query)
            req_ver = (q_js.get("v") or [""])[0]
            out_bytes = gz_js if (supports_gzip and gz_js) else raw_js
            handler.send_response(200)
            handler.send_header("Content-Type", "application/javascript; charset=utf-8")
            if supports_gzip and gz_js:
                handler.send_header("Content-Encoding", "gzip")
            handler.send_header("Content-Length", str(len(out_bytes)))
            handler.send_header("Cache-Control", "public, max-age=31536000, immutable" if (req_ver and req_ver == js_ver) else "no-cache, no-store, must-revalidate")
            handler.send_header("Access-Control-Allow-Origin", "*")
            handler.end_headers()
            handler.wfile.write(out_bytes)
            handler.wfile.flush()
        elif parsed.path in ("/", "/index.html"):
            r_info = game.rooms_def.get(game.current_room, {})
            pre = self.warmup_prebuild_cache()
            raw_template = self.get_live_html_template()
            html_str = (raw_template
                .replace("{TITLE}", game.title)
                .replace("{INTRO}", game.intro_message)
                .replace("{ROOM_DESC}", game.get_room_description())
                .replace("{ROOM_NAME}", json.dumps(r_info.get("name", game.current_room)))
                .replace("{INVENTORY}", ", ".join(game.inventory) or "empty")
                .replace("{INITIAL_OBJECTS}", json.dumps(game.get_inspectable_objects(), separators=(",", ":")))
                .replace("{JS_VER}", self.get_live_app_js_ver())
                .replace("{MANIFEST_HASH}", json.dumps(pre.get("manifest_hash", "")))
                .replace("{BOOT_ROOM_ID}", json.dumps(game.current_room))
                .replace("{BOOT_TW}", json.dumps(game.get_time_and_weather(room_id=game.current_room), separators=(",", ":"))))
            html_bytes = html_str.encode("utf-8")
            if supports_gzip:
                html_bytes = gzip.compress(html_bytes, compresslevel=1)
            handler.send_response(200)
            handler.send_header("Content-Type", "text/html; charset=utf-8")
            if supports_gzip:
                handler.send_header("Content-Encoding", "gzip")
            handler.send_header("Content-Length", str(len(html_bytes)))
            handler.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
            handler.send_header("Access-Control-Allow-Origin", "*")
            handler.end_headers()
            handler.wfile.write(html_bytes)
            handler.wfile.flush()
        elif parsed.path in ("/s", "/api/stream"):
            self.ensure_stream_thread()
            if not getattr(game, "last_frame_packet", b""):
                game.last_frame_packet = game.render_and_encode_mjpeg_packet()
            q_out = queue.Queue(maxsize=1)
            stop_ev = getattr(self, "server_stop_event", None)
            try:
                handler.wfile.write(
                    b"HTTP/1.1 200 OK\r\n"
                    b"Content-Type: multipart/x-mixed-replace; boundary=frame\r\n"
                    b"Cache-Control: no-cache, no-store, no-transform\r\n"
                    b"Connection: keep-alive\r\n"
                    b"Access-Control-Allow-Origin: *\r\n"
                    b"X-Accel-Buffering: no\r\n\r\n"
                    b"--frame\r\n"
                    + game.last_frame_packet * 2
                )
                handler.wfile.flush()
                with self.stream_lock:
                    self.stream_clients.add(q_out)
                while not (stop_ev and stop_ev.is_set()):
                    try:
                        pkt = q_out.get(timeout=1.0)
                        handler.wfile.write(pkt)
                        handler.wfile.flush()
                    except queue.Empty:
                        continue
            except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError, OSError):
                pass
            finally:
                with self.stream_lock:
                    self.stream_clients.discard(q_out)
        elif parsed.path in ("/favicon.ico", "favicon.ico"):
            ico_data = self.get_favicon_bytes()
            handler.send_response(200)
            handler.send_header("Content-Type", "image/x-icon")
            handler.send_header("Content-Length", str(len(ico_data)))
            handler.send_header("Cache-Control", "public, max-age=604800")
            handler.end_headers()
            handler.wfile.write(ico_data)
        elif parsed.path == "/api/sync":
            q = urllib.parse.parse_qs(parsed.query)
            pid = q.get("player_id", ["player_1"])[0]
            base_id_str = q.get("base_id", [""])[0]
            known_turn_str = q.get("known_turn", [""])[0]
            known_room = q.get("known_room", [""])[0]
            spectate = q.get("spectate", [""])[0] == "1"
            wants_vector = q.get("vector", ["0"])[0] == "1"
            if not spectate or pid in game.players:
                p_obj = game.get_player(pid)
                if base_id_str.isdigit():
                    p_obj["numeric_id"] = int(base_id_str)
                char_st = game.get_player_char_stats(pid)
            else:
                char_st = game.char_stats
            active_players = game.get_players_in_room(game.current_room)
            if known_turn_str.lstrip("-").isdigit() and int(known_turn_str) == game.turn_count and known_room == game.current_room:
                if wants_vector:
                    v_bytes = game.get_entities_vector_bytes()
                    handler.send_response(200)
                    handler.send_header("Content-Type", "application/octet-stream")
                    handler.send_header("Content-Length", str(len(v_bytes)))
                    handler.send_header("Cache-Control", "no-cache, no-store")
                    handler.send_header("Connection", "keep-alive")
                    if getattr(self, "public_url", None):
                        handler.send_header("X-Public-Url", self.public_url)
                    handler.end_headers()
                    handler.wfile.write(v_bytes)
                    return
                active_monsters = game.get_monsters_in_room(game.current_room)
                now_sync = time.time()
                # Ultra-lightweight ~200B delta response when turn & room haven't changed
                handler._send_json({
                    "unchanged": True,
                    "turn": game.turn_count,
                    "code_version": getattr(self, "code_version", 1),
                    **({"public_url": self.public_url} if getattr(self, "public_url", None) else {}),
                    "players": [{"id": po["id"]} for po in game.players.values()],
                    "active_room_players": [{"id": po["id"], "numeric_id": po.get("numeric_id"), "x": po["x"], "y": po["y"], "z": po.get("z", 64.0), "facing": po.get("facing", "east"), "is_moving": bool(po.get("is_moving", False) and (now_sync - po.get("last_move_time", 0.0) < 0.45))} for po in active_players],
                    "active_room_monsters": [{"id": m["id"], "numeric_id": m.get("numeric_id"), "x": m["x"] + 32, "y": m["y"] + 32, "facing": m.get("facing", "west"), "is_moving": bool(m.get("is_moving", False) and (now_sync - m.get("last_move_time", 0.0) < 0.45))} for m in active_monsters if game.is_object_discovered("monster", m.get("raw_name", m.get("name", "")))]
                })
                return
            p_map = {p_id: po.get("char_stats", game.get_player_char_stats(p_id)) for p_id, po in game.players.items()}
            pending_evs = list(getattr(game, "pending_events", []))
            if hasattr(game, "pending_events"):
                game.pending_events.clear()
            pending_visuals = list(getattr(game, "pending_action_visuals", []))
            if hasattr(game, "pending_action_visuals"):
                game.pending_action_visuals.clear()
            metrics = game.world_model.get_learning_metrics()
            same_room = (known_room == game.current_room) and bool(known_room)
            sync_payload = {
                "room_id": game.current_room,
                "room_name": game.rooms_def.get(game.current_room, {}).get("name", game.current_room),
                "inventory": game.inventory,
                "char_stats": char_st,
                "players": list(game.players.values()),
                "all_player_stats": p_map,
                "active_room_players": active_players,
                "scene_3d": game.get_3d_scene_payload(pid if pid in game.players else None, include_static=not same_room),
                "takeable_items": game.get_takeable_items(pid if pid in game.players else None),
                "events": pending_evs,
                "action_visuals": pending_visuals,
                "learning_metrics": metrics,
                "is_won": game.is_won,
                "is_over": game.is_over,
                "story_flags": sorted(getattr(game, "story_flags", set()) or ()),
                "turn": game.turn_count,
                "code_version": getattr(self, "code_version", 1),
                **({"public_url": self.public_url} if getattr(self, "public_url", None) else {}),
            }
            if not same_room:
                sync_payload["room_desc"] = game.get_room_description()
                sync_payload["inspectable_objects"] = game.get_inspectable_objects()
            handler._send_json(sync_payload)
        elif parsed.path == "/api/3d":
            q = urllib.parse.parse_qs(parsed.query)
            pid = q.get("player_id", ["player_1"])[0]
            rid = q.get("room_id", [None])[0]
            handler._send_json(game.get_3d_scene_payload(pid, room_id=rid))
        elif parsed.path == "/api/preload_assets":
            pre = self.warmup_prebuild_cache()
            m_hash = pre.get("manifest_hash", "")
            q_pre = urllib.parse.parse_qs(parsed.query)
            known_hash = (q_pre.get("known_hash") or [""])[0]
            r_keys = list(getattr(game, "rooms_def", {}).keys())
            cur_r = getattr(game, "current_room", getattr(game, "start_room", "start"))
            if known_hash and m_hash and known_hash == m_hash:
                live_rooms = {cur_r: game.get_3d_scene_payload(include_static=False, room_id=cur_r)} if cur_r else {}
                handler._send_json({
                    "cached": True,
                    "manifest_hash": m_hash,
                    "live_rooms": live_rooms,
                    "current_room": cur_r,
                    "action_catalog": get_action_catalog_payload(),
                    "public_url": getattr(self, "public_url", None),
                })
                return
            rooms_static = pre.get("rooms", {})
            r_catalogs = {
                rk: game.get_3d_scene_payload(include_static=True, room_id=rk, static_override=(rooms_static.get(rk) or {}).get("val"))
                for rk in r_keys
            }
            arch_specs = [v["val"] for v in pre.get("archetypes", {}).values()]
            best_specs = [v["val"] for v in pre.get("bestiary", {}).values()]
            handler._send_json({
                "manifest_hash": m_hash,
                "models": [
                    "/characters/character_rogue.glb",
                    "/characters/character_wizard.glb",
                    "/models/soldier.glb",
                    "/models/xbot.glb"
                ],
                "rooms": r_catalogs,
                "archetype_specs": arch_specs,
                "bestiary_specs": best_specs,
                "prebuild_stats": dict(getattr(self, "prebuild_stats", {})),
                "current_room": getattr(game, "current_room", getattr(game, "start_room", "start")),
                "public_url": getattr(self, "public_url", None),
                "cc_elm_client": self.get_client_cc_elm_payload(),
                "skills": {**(game.get_client_skills_bundle() if hasattr(game, "get_client_skills_bundle") else {}), "action_catalog": get_action_catalog_payload()},
            })
        elif parsed.path == "/api/cc_elm_client":
            handler._send_json(self.get_client_cc_elm_payload())
        elif parsed.path == "/api/skills":
            handler._send_json({**(game.get_client_skills_bundle() if hasattr(game, "get_client_skills_bundle") else {}), "action_catalog": get_action_catalog_payload()})
        elif parsed.path == "/api/archetypes":
            q = urllib.parse.parse_qs(parsed.query)
            pid = q.get("player_id", [""])[0]
            used_cls = [po.get("class") for p_id, po in game.players.items() if p_id != pid and not po.get("is_ai")]
            handler._send_json({"archetypes": game.current_archetypes, "used_classes": used_cls})
        elif parsed.path == "/api/takeable_items":
            q = urllib.parse.parse_qs(parsed.query)
            pid = q.get("player_id", [""])[0]
            reach = float(q.get("reach", ["140.0"])[0]) if q.get("reach", [""])[0].replace(".", "", 1).isdigit() else 140.0
            handler._send_json({"items": game.get_takeable_items(pid or None, reach_px=reach)})
        elif parsed.path == "/api/model_learning":
            metrics = game.world_model.get_learning_metrics()
            handler._send_json(metrics)
        elif parsed.path == "/api/saves":
            handler._send_json({"saves": game.list_saved_games()})
        elif parsed.path == "/api/voice_signal":
            q = urllib.parse.parse_qs(parsed.query)
            pid = q.get("player_id", [""])[0]
            since = float(q.get("since", ["0"])[0] or 0)
            now = time.time()
            sigs = [s for s in (getattr(game, "voice_signals", None) or []) if now - s.get("ts", 0) < 15.0]
            if hasattr(game, "voice_signals"):
                game.voice_signals = sigs
            out = [s for s in sigs if s.get("ts", 0) > since and s.get("from_id") != pid and s.get("to_id") in (None, "", pid)]
            handler._send_json({"signals": out, "server_time": now})
        elif parsed.path.startswith("/api/sprite/"):
            parts = parsed.path.split("/")[3:]
            cat = parts[0] if parts else "item"
            sp_name = urllib.parse.unquote(parts[1]) if len(parts) > 1 else "Unknown"
            spr_img = game.compositor.generate_procedural_sprite(cat, sp_name, 64)
            buf = io.BytesIO()
            spr_img.save(buf, format="PNG")
            data = buf.getvalue()
            handler.send_response(200); handler.send_header("Content-Type", "image/png"); handler.send_header("Content-Length", str(len(data))); handler.send_header("Cache-Control", "public, max-age=86400"); handler.send_header("Connection", "keep-alive"); handler.end_headers(); handler.wfile.write(data)
        elif parsed.path.startswith(("/models/", "/web/models/", "/characters/", "/web/characters/", "/dataset/my_3d_models/", "/web/dataset/my_3d_models/", "/assets/")):
            fn = os.path.basename(parsed.path)
            _serve_file(fn, [*( [os.path.join(game.game_assets_dir, s) for s in ("characters", "models", "")] if getattr(game, "game_assets_dir", None) else [] ), os.path.join(eng_dir, "web", "characters"), os.path.join(eng_dir, "web", "models")], "model/gltf-binary" if fn.endswith(".glb") else "model/gltf+json", 604800)
        elif parsed.path.endswith((".png", ".jpg", ".jpeg", ".webp", ".svg")):
            fn = os.path.basename(parsed.path)
            ct = "image/png" if fn.endswith(".png") else ("image/jpeg" if fn.endswith((".jpg", ".jpeg")) else "image/webp")
            _serve_file(fn, [*( [game.game_assets_dir] if getattr(game, "game_assets_dir", None) else [] ), os.path.join(eng_dir, "web")], ct, 604800)
        elif parsed.path == "/api/screen":
            try:
                if not getattr(game, "last_jpg_bytes", None) or getattr(game, "scene_dirty", False):
                    game.render_and_encode_mjpeg_packet()
                data = game.last_jpg_bytes
                handler.send_response(200); handler.send_header("Content-Type", "image/jpeg"); handler.send_header("Content-Length", str(len(data))); handler.send_header("Cache-Control", "no-store"); handler.send_header("Connection", "keep-alive"); handler.end_headers(); handler.wfile.write(data)
            except (ConnectionAbortedError, ConnectionResetError, BrokenPipeError): pass
        else:
            handler.send_error(404)

    def handle_http_post(self, handler):
        game = self.game
        try:
            if hasattr(handler, "connection") and handler.connection:
                handler.connection.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
        except Exception:
            pass
        clen = int(handler.headers.get("Content-Length", 0))
        if handler.path == "/i":
            if clen > 0 and clen % 16 == 0:
                body = handler.rfile.read(clen)
                now = time.time()
                for offset in range(0, clen, 16):
                    pid_int, x, y, z = struct.unpack_from("<Ifff", body, offset)
                    game.update_player_binary(pid_int, x, y, z, now)
            elif clen > 0:
                handler.rfile.read(clen)
            handler.send_response(204)
            handler.send_header("Content-Length", "0")
            handler.send_header("Access-Control-Allow-Origin", "*")
            handler.end_headers()
            return

        payload = json.loads(handler.rfile.read(clen).decode("utf-8")) if clen > 0 else {}
        pid = payload.get("player_id", "player_1")
        if handler.path == "/api/command":
            p = game.get_player(pid)
            resp, atk, combat_info = game.combat_detailed(payload.get("command", ""), player_id=pid)
            game.scene_dirty = True
            p_map = {p_id: po.get("char_stats", game.get_player_char_stats(p_id)) for p_id, po in game.players.items()}
            handler._send_json({"response": resp, "attack_occurred": atk, "combat_info": combat_info, "player_id": p["id"], "player_facing": p.get("facing", "east"), "room_id": game.current_room, "room_name": game.rooms_def.get(game.current_room, {}).get("name", game.current_room), "player_x": p["x"], "player_y": p["y"], "players": list(game.players.values()), "all_player_stats": p_map, "inventory": game.inventory, "story_flags": sorted(getattr(game, "story_flags", set()) or ()), "char_stats": game.get_player_char_stats(pid), "inspectable_objects": game.get_inspectable_objects(), "scene_3d": game.get_3d_scene_payload(pid), "is_won": game.is_won, "is_over": game.is_over})
        elif handler.path == "/api/saves/action":
            act, slot, nslot = payload.get("action", ""), payload.get("slot", ""), payload.get("new_slot", "")
            msg = game.save_game(slot) if act == "save" else game.load_game(slot) if act == "load" else game.delete_game(slot) if act == "delete" else game.rename_game(slot, nslot) if act == "rename" else ""
            game.scene_dirty = True
            handler._send_json({"message": msg, "action": act, "room_id": game.current_room, "room_name": game.rooms_def.get(game.current_room, {}).get("name", game.current_room), "player_x": game.player_x, "player_y": game.player_y, "inventory": game.inventory, "char_stats": game.get_player_char_stats(pid), "inspectable_objects": game.get_inspectable_objects(), "scene_3d": game.get_3d_scene_payload(pid), "saves": game.list_saved_games()})
        elif handler.path == "/api/move":
            known_room = payload.get("known_room", "")
            tx = float(payload["target_x"]) if "target_x" in payload and payload["target_x"] is not None else None
            ty = float(payload["target_y"]) if "target_y" in payload and payload["target_y"] is not None else None
            res = game.move_player_vector(float(payload.get("dx", 0)), float(payload.get("dy", 0)), player_id=pid, target_x=tx, target_y=ty)
            if "seq" in payload:
                res["seq"] = payload["seq"]
            same_room = (known_room == res["room_id"]) and not res.get("transition")
            if res.get("battle_triggered") or not same_room:
                res["all_player_stats"] = {p_id: po.get("char_stats", game.get_player_char_stats(p_id)) for p_id, po in game.players.items()}
            if not same_room:
                res["inspectable_objects"] = game.get_inspectable_objects()
            res["takeable_items"] = game.get_takeable_items(pid)
            res["scene_3d"] = game.get_3d_scene_payload(pid, include_static=not same_room)
            handler._send_json(res)
        elif handler.path in ("/api/select_character", "/api/respawn"):
            if handler.path == "/api/select_character":
                p = game.register_player(pid, archetype_index=int(payload.get("archetype_index", 0)))
                base_id = payload.get("base_id")
                if base_id is not None and str(base_id).isdigit():
                    p["numeric_id"] = int(base_id)
            else:
                p = game.respawn_player(pid)
            p_map = {p_id: po.get("char_stats", game.get_player_char_stats(p_id)) for p_id, po in game.players.items()}
            handler._send_json({
                "player_id": p["id"], "player_x": p["x"], "player_y": p["y"],
                "char_stats": game.get_player_char_stats(pid), "all_player_stats": p_map,
                "players": list(game.players.values()), "inspectable_objects": game.get_inspectable_objects(),
                "scene_3d": game.get_3d_scene_payload(pid), "turn": game.turn_count,
            })
        elif handler.path == "/api/ping":
            ping = game.create_ping(payload.get("kind", "look"), payload.get("x"), payload.get("y"), payload.get("label"), pid)
            handler._send_json({"ping": ping, "living_world": game.get_living_world_payload(pid)})
        elif handler.path == "/api/voice_signal":
            now = time.time()
            if payload.get("type") == "speech_bubble":
                p = game.get_player(pid)
                game.speech_bubbles.append({"id": f"sb_{int(now*1000)}", "room": game.current_room, "from_id": pid, "name": p.get("name", "Hero"), "text": str(payload.get("text", ""))[:120], "x": float(p.get("x", 400)), "y": float(p.get("y", 380)), "expires_at": now + 5.0})
                game.speech_bubbles = game.speech_bubbles[-24:]
            else:
                game.voice_signals.append({"from_id": pid, "to_id": payload.get("to_id", ""), "type": payload.get("type", "offer"), "sdp": payload.get("sdp"), "candidate": payload.get("candidate"), "x": payload.get("x"), "y": payload.get("y"), "room": game.current_room, "ts": now})
                game.voice_signals = game.voice_signals[-80:]
            handler._send_json({"ok": True, "living_world": game.get_living_world_payload(pid)})
        elif handler.path == "/api/hero_profile":
            if payload.get("mode") == "import" or payload.get("profile"):
                prof = game.import_hero_profile(payload.get("profile") or payload, pid)
                handler._send_json({"profile": prof, "player": game.get_player(pid), "scene_3d": game.get_3d_scene_payload(pid)})
            else:
                handler._send_json({"profile": game.export_hero_profile(pid)})
        elif handler.path == "/api/join_squad":
            res = game.join_at_leader(pid, payload.get("room"), payload.get("x"), payload.get("y"))
            if payload.get("profile"):
                game.import_hero_profile(payload["profile"], pid)
            handler._send_json({**res, "scene_3d": game.get_3d_scene_payload(pid)})
        elif handler.path == "/api/living_world":
            act = str(payload.get("action", "")).lower()
            p = game.get_player(pid)
            msg = ""
            if act == "wardrobe":
                msg = game.set_wardrobe(pid, payload.get("silhouette"), payload.get("headgear"), payload.get("palette"), payload.get("custom_dyes"), payload.get("cloak"))
            elif act == "emote":
                msg = game.perform_emote(payload.get("emote", "wave"), pid)
            elif act == "char_action":
                msg = game.perform_character_action(payload.get("action_id") or payload.get("query", "wave"), pid)
            elif act == "gift":
                msg = game.gift_item(payload.get("item", ""), pid)
            elif act == "craft":
                msg = game.craft_item(payload.get("recipe", ""), pid)
            elif act == "stash_deposit":
                msg = game.deposit_matching_materials()
            elif act == "auto_vacuum":
                game.auto_vacuum_enabled = bool(payload.get("enabled", True))
                msg = f"🧲 Auto-vacuum {'enabled' if game.auto_vacuum_enabled else 'disabled'}."
            elif act == "compare":
                msg = game.compare_item(payload.get("item", ""), pid)
            elif act == "equip":
                msg = game.equip_weapon(payload.get("weapon", ""), pid)
            elif act == "reinvent":
                msg = game.reinvent_build(payload.get("style", ""), pid)
            elif act == "weapon_skill":
                msg = game.use_weapon_skill(payload.get("slot", "q"), pid)
            elif act == "dodge":
                msg = game.dodge_roll(pid)
            elif act == "parry":
                msg = game.timed_parry(pid)
            elif act == "revive":
                msg = game.revive_player(payload.get("target_id"), pid)
            elif act == "harvest":
                msg = game.harvest_node(pid, payload.get("node_id"))
            elif act == "map_pin":
                msg = game.add_map_pin(payload.get("label", "Expedition Pin"), payload.get("x"), payload.get("y"), pid)
            elif act == "map_table":
                msg = game.interact_map_table(pid)
            elif act == "note":
                msg = game.leave_note(payload.get("text", ""), pid)
            elif act == "fish":
                msg = game.play_fishing(pid)
            elif act == "dice":
                msg = game.play_dice(payload.get("query", ""), pid)
            elif act == "riddle":
                msg = game.solve_riddle(payload.get("answer", ""), pid)
            elif act == "mount":
                msg = game.summon_mount(payload.get("mount", ""), pid)
            elif act == "mount_passenger":
                msg = game.mount_passenger(pid)
            elif act == "dismount":
                msg = game.dismount(pid)
            elif act == "bounty":
                msg = game.accept_bounty(payload.get("bounty", "list"), pid)
            elif act == "bazaar_rug":
                msg = game.setup_bazaar_rug(pid)
            elif act == "bazaar_buy":
                msg = game.bazaar_buy(payload.get("item", ""), pid)
            elif act == "world_event":
                msg = game.advance_world_event(int(payload.get("delta", 1)), pid)
            elif act == "tame_pet":
                msg = game.tame_pet(payload.get("pet", ""), pid)
            elif act == "name_pet":
                msg = game.name_pet(payload.get("name", "Ember"), pid)
            elif act == "labyrinth":
                msg = game.enter_labyrinth(payload.get("curse", ""), pid)
            elif act == "build":
                msg = game.build_structure(payload.get("piece", "hearth"), payload.get("x"), payload.get("y"), pid)
            elif act == "save_blueprint":
                msg = game.save_blueprint(payload.get("name", "MyCamp"), pid)
            elif act == "deploy_blueprint":
                msg = game.deploy_blueprint(payload.get("name", "MyCamp"), pid)
            elif act == "vehicle":
                msg = game.spawn_vehicle(payload.get("vehicle", "skiff"), pid)
            elif act == "crew":
                msg = game.assign_crew_station(payload.get("station", "helm"), pid)
            elif act == "cannon":
                msg = game.fire_vehicle_cannon(pid)
            elif act == "outpost":
                msg = game.supply_outpost(pid, int(payload.get("delta", 1)))
            elif act == "chemistry":
                notes = game.trigger_world_chemistry(payload.get("element", "fire"), float(payload.get("x", p["x"])), float(payload.get("y", p["y"])), pid)
                msg = "\n".join(notes) if notes else "🧪 No reactive world chemistry prop nearby."
            elif act == "breach":
                msg = game.breach_destructible(payload.get("target_id"), pid)
            elif act == "dig":
                msg = game.dig_tunnel(payload.get("x"), payload.get("y"), pid)
            elif act == "rest_warmth":
                msg = game.apply_rested_warmth(pid)
            elif act == "spare":
                msg = game.spare_foe(payload.get("query", ""), pid)
            elif act == "reflect":
                nh = game.get_narrative_harmony_payload(pid)
                msg = f"☕ [{nh['guild_title']} | Prep +{nh['climax_prep_pct']}%]: {nh['breakfast_scene']}\n🔍 {nh['vignette']}\n💬 {nh['reaction']}"
            elif payload.get("command"):
                msg = game.handle_living_world_command(payload["command"], pid) or game.execute_command(payload["command"], pid)
            if act in ("weapon_skill", "dodge", "parry", "chemistry", "breach", "cannon") and game.room_monsters.get(game.current_room):
                extra = (game.step_monsters_turn(game.current_room) or []) + (game.step_ai_party_members(leader_player_id=pid, allow_combat=True) or [])
                if extra:
                    msg = f"{msg}\n" + "\n".join(extra)
            handler._send_json({
                "message": msg, "inventory": game.inventory,
                "player_x": p.get("x"), "player_y": p.get("y"), "player_facing": p.get("facing"),
                "combat_info": getattr(game, "last_combat_result", None) if act == "weapon_skill" else None,
                "char_stats": game.get_player_char_stats(pid),
                "players": list(game.players.values()),
                "scene_3d": game.get_3d_scene_payload(pid),
            })
        else:
            handler.send_error(404)

    def run(self):
        game = self.game
        web_server_ref = self
        class RequestHandler(http.server.BaseHTTPRequestHandler):
            def _send_json(self, obj):
                data = json.dumps(obj, separators=(",", ":")).encode("utf-8")
                accept_enc = self.headers.get("Accept-Encoding", "") if hasattr(self, "headers") and self.headers else ""
                use_gzip = "gzip" in accept_enc and len(data) > 512
                if use_gzip:
                    data = gzip.compress(data, compresslevel=1)
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                if use_gzip:
                    self.send_header("Content-Encoding", "gzip")
                self.send_header("Content-Length", str(len(data)))
                self.send_header("Cache-Control", "no-cache")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(data)
                self.wfile.flush()

            def do_GET(self):
                web_server_ref.handle_http_get(self)

            def do_POST(self):
                web_server_ref.handle_http_post(self)

            def log_message(self, format, *args): pass

        self._active_request_handler_cls = RequestHandler

        socketserver.TCPServer.allow_reuse_address = True
        class ThreadedTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
            daemon_threads = True
            request_queue_size = 64
            def handle_error(self, request, client_address):
                if sys.exc_info()[0] not in (ConnectionAbortedError, ConnectionResetError, BrokenPipeError): super().handle_error(request, client_address)

        # File watcher thread: checks if any core files, root engine file, or HTML/JS have changed
        self.code_version = 1
        server_stop_event = threading.Event()
        self.server_stop_event = server_stop_event
        self.ensure_stream_thread()
        def code_watcher():
            server_file = os.path.abspath(__file__)
            pkg_dir = os.path.dirname(server_file)
            base_dir = os.path.dirname(pkg_dir)
            workspace_dir = os.path.dirname(base_dir)

            def get_watched_files():
                import glob
                # Dynamically collect all python, html, js, and css files across the engine and active game
                patterns = [
                    os.path.join(base_dir, "*.py"),
                    os.path.join(base_dir, "core", "**", "*.py"),
                    os.path.join(base_dir, "web", "**", "*.html"),
                    os.path.join(base_dir, "web", "**", "*.js"),
                    os.path.join(base_dir, "web", "**", "*.css"),
                    os.path.join(base_dir, "skills", "**", "*.py"),
                    os.path.join(workspace_dir, "games", "*", "*.py"),
                    os.path.join(workspace_dir, "games", "*", "skills", "**", "*.py"),
                    os.path.join(workspace_dir, "games", "*", "skills", "**", "*.md"),
                ]
                files = set()
                for pat in patterns:
                    for fp in glob.glob(pat, recursive=True):
                        if os.path.isfile(fp):
                            files.add(os.path.abspath(fp))
                return files
            
            def get_mtimes():
                m = {}
                for p in get_watched_files():
                    try:
                        if os.path.exists(p):
                            m[p] = os.path.getmtime(p)
                    except Exception:
                        pass
                return m

            last_mtimes = get_mtimes()
            while not server_stop_event.is_set():
                time.sleep(0.8)
                try:
                    cur_mtimes = get_mtimes()
                    changed = [p for p in cur_mtimes if cur_mtimes.get(p, 0) > last_mtimes.get(p, 0)]
                    if changed:
                        last_mtimes = cur_mtimes
                        changed_names = ", ".join(os.path.basename(p) for p in changed)
                        print(f"\n[HOTLOAD DETECTED]: Changes saved to [{changed_names}]. Hot-reloading in-place...", flush=True)
                        
                        # If python engine files changed, reload python runtime classes
                        if any(p.endswith(".py") for p in changed):
                            self.reload_code_in_place()
                        elif any(p.endswith(".md") for p in changed) and self.game:
                            with self.game.state_lock:
                                self.game.load_skill(self.game.skill_name)
                                self.game.scene_dirty = True
                            self._prebuild_mem.clear()
                            self.warmup_prebuild_cache()
                            
                        # Increment code version so connected browser tabs reload UI immediately
                        self.code_version = getattr(self, "code_version", 1) + 1
                        print(f"[HOTLOAD COMPLETE]: Live server updated to v{self.code_version} (port {self.port} & public tunnel preserved).", flush=True)
                except Exception:
                    pass

        watcher_thread = threading.Thread(target=code_watcher, daemon=True)
        watcher_thread.start()

        def cleanup_tunnels():
            for p in self.tunnel_processes:
                try:
                    p.terminate()
                    p.kill()
                except Exception:
                    pass

        def sigint_handler(signum, frame):
            server_stop_event.set()
            cleanup_tunnels()
            try:
                httpd.shutdown()
            except Exception:
                pass
            print("\nShutting down Game Server. Goodbye!", flush=True)
            sys.exit(0)

        # Register signal handlers for clean Ctrl+C handling
        try:
            signal.signal(signal.SIGINT, sigint_handler)
            if hasattr(signal, "SIGBREAK"):
                signal.signal(signal.SIGBREAK, sigint_handler)
            if hasattr(signal, "SIGTERM"):
                signal.signal(signal.SIGTERM, sigint_handler)
        except Exception:
            pass

        with ThreadedTCPServer((self.host, self.port), RequestHandler) as httpd:
            httpd.timeout = 0.5
            self.port = httpd.server_address[1]
            local_url = f"http://localhost:{self.port}"
            bind_info = f"http://{self.host}:{self.port}"
            print(f"\n{'='*70}\n[GAME ENGINE SERVING ON {bind_info} (Local: {local_url})]\n[HOTLOAD ACTIVE]: Auto-reloads on any Python or HTML/JS changes.\n[CTRL+C]: Press Ctrl+C in this console to cleanly exit.\n{'='*70}", flush=True)
            if self.public_tunnel:
                self._start_public_tunnel()
            if not os.environ.get("NO_BROWSER"):
                try: webbrowser.open(local_url)
                except Exception: pass
            try:
                # Poll with short timeout instead of blocking serve_forever()
                # On Windows, serve_forever() inside a try block blocks Ctrl+C signals
                while not server_stop_event.is_set():
                    httpd.handle_request()
            except (KeyboardInterrupt, SystemExit):
                pass
            finally:
                server_stop_event.set()
                cleanup_tunnels()
                try:
                    httpd.server_close()
                except Exception:
                    pass
                print("\nShutting down Game Server.", flush=True)
                sys.exit(0)


