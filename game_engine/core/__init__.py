"""Generic Modular Game Engine Package.

Provides deterministic 2D/3D tactical skill-based adventure game engine, companion party dynamics,
neural world model transitions, procedural battlemaps, and web streaming console.
"""

from .constants import (
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
from .core_models import (
    VisualCompositor,
    NeuralWorldModel,
    Noul,
    Choice,
    JevAnswer,
    JevResponse,
    evaluate_jev_decision,
)
from .session_state import SessionStateMixin
from .session_navigation import SessionNavigationMixin
from .session_combat import SessionCombatMixin
from .session_dialogue import SessionDialogueMixin
from .session_systems import SessionLivingWorldMixin

class GameSession(SessionLivingWorldMixin, SessionDialogueMixin, SessionStateMixin, SessionNavigationMixin, SessionCombatMixin):
    """Stateful generic execution engine composing skill-driven state, navigation, combat, dialogue, and living-world systems."""

from .web_server import GameWebServer, HTML_TEMPLATE

__all__ = [
    "SCRIPT_DIR",
    "SKILLS_DIR",
    "SAVES_DIR",
    "FRAME_OUT",
    "SAVE_FRAME_TO_DISK",
    "GRID_SQ",
    "ROOM_BOUNDS_AND_COLLISIONS",
    "HTML_TEMPLATE_PATH",
    "APP_JS_PATH",
    "VisualCompositor",
    "NeuralWorldModel",
    "Noul",
    "Choice",
    "JevAnswer",
    "JevResponse",
    "evaluate_jev_decision",
    "GameSession",
    "GameWebServer",
    "HTML_TEMPLATE",
]
