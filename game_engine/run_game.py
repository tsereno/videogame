#!/usr/bin/env python3
"""Generic Game Engine Runner (run_game.py).

Launches any game session and web console, defaulting to the skill name provided
via command-line arguments or environment variable `GAME_NAME`.
"""

import os, sys, time, argparse

# Maximize multi-core CPU utilization across all computational backends
_NUM_CORES = str(os.cpu_count() or 4)
for _var in ("OMP_NUM_THREADS", "MKL_NUM_THREADS", "OPENBLAS_NUM_THREADS", "NUMEXPR_NUM_THREADS", "VECLIB_MAXIMUM_THREADS"):
    os.environ.setdefault(_var, _NUM_CORES)

# Ensure game_engine is on path
_ENGINE_DIR = os.path.dirname(os.path.abspath(__file__))
if _ENGINE_DIR not in sys.path:
    sys.path.insert(0, _ENGINE_DIR)

from core.constants import (
    SCRIPT_DIR,
    SKILLS_DIR,
    SAVES_DIR,
    FRAME_OUT,
    SAVE_FRAME_TO_DISK,
    GRID_SQ,
    ROOM_BOUNDS_AND_COLLISIONS,
    HTML_TEMPLATE_PATH,
    APP_JS_PATH,
)
from core.core_models import (
    VisualCompositor,
    NeuralWorldModel,
    Noul,
    Choice,
    JevAnswer,
    JevResponse,
    evaluate_jev_decision,
)
from core import GameSession
from core.web_server import GameWebServer, HTML_TEMPLATE

def solve_campaign(skill_name: str) -> bool:
    game = GameSession(skill_name)
    if not game.walkthrough_commands:
        return False
    for item in game.walkthrough_commands:
        act = (item.get("command") or item.get("action")) if isinstance(item, dict) else (item if isinstance(item, str) else item[0])
        time.sleep(0.01)
        print(f"\n>>> ACTION: {act}")
        for l in game.execute_command(act).strip().splitlines()[:4]:
            print(f"  {l}")
    return game.is_won

def play_cli(skill_name: str):
    game = GameSession(skill_name)
    print(f"\nWELCOME TO {game.title.upper()}\n{game.get_room_description()}")
    while not game.is_over:
        try:
            cmd = input("\n> ").strip()
            if cmd in ("quit", "exit", "q"):
                break
            if cmd:
                print(game.execute_command(cmd))
        except (KeyboardInterrupt, EOFError):
            break

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generic Game Engine Runner")
    parser.add_argument("--game", default=os.environ.get("GAME_NAME", "aeonward-continuum"), help="Name of game skill / campaign")
    parser.add_argument("--cli", action="store_true", help="Play in CLI mode instead of web server")
    parser.add_argument("--solve", action="store_true", help="Run automated solver")
    parser.add_argument("--port", type=int, default=8080, help="Web server port")
    parser.add_argument("--host", default="0.0.0.0", help="Web server host")
    parser.add_argument("--tunnel", action="store_true", default=True, help="Enable public internet tunnel (default: enabled)")
    parser.add_argument("--no-tunnel", action="store_false", dest="tunnel", help="Disable public internet tunnel")
    args = parser.parse_args()

    if args.solve:
        solve_campaign(args.game)
    elif args.cli:
        play_cli(args.game)
    else:
        GameWebServer(GameSession(args.game), host=args.host, port=args.port, public_tunnel=args.tunnel).run()
