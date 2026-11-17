# Videogame

A text/visual adventure game engine with a web console (`game_engine/`), plus a game builder (`game_builder/`) and game content (`games/`).

## Requirements

- Python 3.11+
- A modern web browser

## Install

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1          # macOS/Linux: source .venv/bin/activate
pip install -r game_engine/core/requirements.txt
pip install pillow                  # used by the web server, not listed in requirements.txt
```

> `torch`, `numba` and `onnxruntime` are large; the first install may take a while.

## Launch

From the repo root:

```powershell
python game_engine/run_game.py --no-tunnel
```

Then open <http://localhost:8080>.

### Options

| Flag | Description |
|------|-------------|
| `--game NAME` | Game/campaign to load (default `aeonward-continuum`, or env `GAME_NAME`) |
| `--cli` | Play in the terminal instead of the web UI |
| `--solve` | Run the automated walkthrough solver |
| `--port N` | Web server port (default `8080`) |
| `--host H` | Bind address (default `0.0.0.0`) |
| `--no-tunnel` | Disable the public internet tunnel (the tunnel is **on** by default) |

Examples:

```powershell
python game_engine/run_game.py --cli --game aeonward-continuum
python game_engine/run_game.py --port 9000 --no-tunnel
```

## Troubleshooting

- **Port in use:** pass a different `--port`.
- **Missing module errors:** re-run the `pip install` steps in an activated virtual environment.
