import os
import mysql.connector

try:
    from dotenv import load_dotenv
except Exception:  # pragma: no cover
    load_dotenv = None


def _load_env_once():
    """Load env vars from common locations if python-dotenv is available."""
    if load_dotenv is None:
        return

    script_dir = os.path.dirname(__file__)
    candidates = [
        os.path.join(script_dir, ".env"),
        os.path.join(script_dir, "..", "backend", ".env"),
        os.path.join(script_dir, "..", ".env"),
    ]

    for env_path in candidates:
        if os.path.exists(env_path):
            load_dotenv(env_path)
            break


def get_db_config():
    _load_env_once()
    return {
        "host": os.getenv("DB_HOST", "localhost"),
        "user": os.getenv("DB_USER", "root"),
        "password": os.getenv("DB_PASS", "Amaamama12345."),
        "database": os.getenv("DB_NAME", "scraping"),
        "port": int(os.getenv("DB_PORT", "3306")),
        "charset": "utf8mb4",
        "use_unicode": True,
    }


def get_connection(**overrides):
    config = get_db_config()
    config.update(overrides)
    return mysql.connector.connect(**config)
