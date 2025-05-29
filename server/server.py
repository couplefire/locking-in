from flask import Flask, request, jsonify, abort
from flask_cors import CORS
import os
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv

app = Flask(__name__)
CORS(app)  # Allow requests from anywhere (admin & client)
load_dotenv()

# Load secret from environment variable (set via .env)
SECRET = os.getenv("SECRET", "changeme")

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "config.json")

# Default configuration
DEFAULT_CONFIG = {
    "mode": "chill",  # chill or grind
    "whitelist": [
        "example.com",
        "openai.com"
    ],
    # When in grind mode, "until" holds an ISO timestamp indicating when grind mode ends
    # If until is None, grind mode is indefinite
    "until": None,
    # Track if grind was client-initiated (cannot be turned off by client)
    "client_initiated": False
}


def load_config():
    if not os.path.exists(CONFIG_PATH):
        return DEFAULT_CONFIG.copy()
    with open(CONFIG_PATH, "r") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return DEFAULT_CONFIG.copy()


def save_config(cfg):
    with open(CONFIG_PATH, "w") as f:
        json.dump(cfg, f)


def require_auth():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        abort(401)
    token = auth_header.split(" ", 1)[1]
    if token != SECRET:
        print(f"Invalid token: {token}")
        print(f"Expected: {SECRET}")
        abort(403)


@app.route("/config", methods=["GET", "POST"])
def config():
    cfg = load_config()

    # On GET, automatically switch back to chill mode if grind period expired
    if cfg["mode"] == "grind" and cfg.get("until"):
        try:
            if datetime.utcnow() >= datetime.fromisoformat(cfg["until"]):
                cfg["mode"] = "chill"
                cfg["until"] = None
                cfg["client_initiated"] = False
                save_config(cfg)
        except ValueError:
            # invalid timestamp; reset
            cfg["until"] = None
            save_config(cfg)

    if request.method == "GET":
        return jsonify(cfg)

    # POST: update config (admin only)
    require_auth()
    data = request.get_json(force=True)

    # Allowed fields: whitelist (list[str]), mode (str), grind_hours (int)
    if "whitelist" in data:
        if not isinstance(data["whitelist"], list):
            abort(400, "whitelist must be list of domains")
        cfg["whitelist"] = data["whitelist"]

    if "mode" in data:
        if data["mode"] not in ("chill", "grind"):
            abort(400, "mode must be chill or grind")
        cfg["mode"] = data["mode"]
        if data["mode"] == "grind":
            # Determine duration
            hours = int(data.get("grind_hours", 0))
            if hours > 0:
                cfg["until"] = (datetime.utcnow() + timedelta(hours=hours)).isoformat()
            else:
                # hours <= 0 means indefinite grind mode
                cfg["until"] = None
            cfg["client_initiated"] = False  # Admin can always override
        else:
            cfg["until"] = None
            cfg["client_initiated"] = False

    save_config(cfg)
    return jsonify(cfg), 200


@app.route("/client-grind", methods=["POST"])
def client_grind():
    """
    Allow clients to enable grind mode during chill mode.
    Clients cannot disable grind mode once enabled.
    """
    cfg = load_config()
    
    # Only allow if currently in chill mode
    if cfg["mode"] != "chill":
        abort(400, "Can only enable grind mode when currently in chill mode")
    
    data = request.get_json(force=True)
    
    # Client is enabling grind mode
    cfg["mode"] = "grind"
    cfg["client_initiated"] = True
    
    # Handle duration
    hours = int(data.get("grind_hours", 0))
    if hours > 0:
        cfg["until"] = (datetime.utcnow() + timedelta(hours=hours)).isoformat()
    else:
        # hours <= 0 means indefinite grind mode
        cfg["until"] = None
    
    save_config(cfg)
    return jsonify(cfg), 200


@app.errorhandler(400)
@app.errorhandler(401)
@app.errorhandler(403)
@app.errorhandler(404)
@app.errorhandler(500)
def handle_error(err):
    response = {
        "error": getattr(err, "description", str(err)),
        "code": err.code if hasattr(err, "code") else 500
    }
    return jsonify(response), response["code"]


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5005)
