"""Global constants and path resolution for generic tactical game engines."""
import os

# Root resolution order:
# 1. CC_GAME_ROOT environment variable
# 2. SCRIPT_DIR pointing to game directory or engine parent
_candidate_parent = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_workspace_root = os.path.dirname(_candidate_parent)
_env_root = os.environ.get("CC_GAME_ROOT")

if _env_root and os.path.exists(_env_root):
    SCRIPT_DIR = os.path.abspath(_env_root)
else:
    SCRIPT_DIR = _candidate_parent

# Global engine search paths for skills:
# - Custom game directory: SCRIPT_DIR/skills or SCRIPT_DIR/.agents/skills
# - Workspace games root: <workspace>/games
# - Engine generic skills: <game_engine>/skills
SKILLS_DIR = os.path.join(SCRIPT_DIR, "skills")
if not os.path.exists(SKILLS_DIR):
    SKILLS_DIR = os.path.join(SCRIPT_DIR, ".agents", "skills")

SAVES_DIR = os.path.join(SCRIPT_DIR, "saves")
os.makedirs(SAVES_DIR, exist_ok=True)
FRAME_OUT = os.path.join(SCRIPT_DIR, "current_game_screen.png")
SAVE_FRAME_TO_DISK = False
GRID_SQ = 64  # Character token size == 1 grid square (64x64 px)
ROOM_BOUNDS_AND_COLLISIONS = {}

HTML_TEMPLATE_PATH = os.path.join(_candidate_parent, "web", "index.html")
APP_JS_PATH = os.path.join(_candidate_parent, "web", "app.js")
WEB_DIR = os.path.join(_candidate_parent, "web")

# Shared Persistent Neural Weights & Trajectory Synergy Paths
_models_dir = os.path.join(SCRIPT_DIR, "models")
if os.path.exists(_models_dir):
    WORLD_MODEL_WEIGHTS_PATH = os.path.join(_models_dir, "world_model_weights.npz")
    SHARED_EXPERIENCE_LOG_PATH = os.path.join(_models_dir, "experience_history.json")
    # Check for game-prefixed variants if present
    for fname in os.listdir(_models_dir):
        if fname.endswith("world_model_weights.npz"):
            WORLD_MODEL_WEIGHTS_PATH = os.path.join(_models_dir, fname)
        elif fname.endswith("experience_history.json"):
            SHARED_EXPERIENCE_LOG_PATH = os.path.join(_models_dir, fname)
else:
    WORLD_MODEL_WEIGHTS_PATH = os.path.join(SCRIPT_DIR, "world_model_weights.npz")
    SHARED_EXPERIENCE_LOG_PATH = os.path.join(SCRIPT_DIR, "experience_history.json")
CC_ELM_CHECKPOINT_PATH = os.path.join(_candidate_parent, "models", "cc_elm_reasoning_pro.npz")
if not os.path.exists(CC_ELM_CHECKPOINT_PATH):
    CC_ELM_CHECKPOINT_PATH = os.path.join(_candidate_parent, "cc_elm_reasoning_pro.npz")
