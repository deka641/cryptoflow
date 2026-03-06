"""pgAdmin4 local configuration for CryptoFlow."""

import os

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
STORAGE_DIR = os.path.join(DATA_DIR, "storage")
SESSION_DB_PATH = os.path.join(DATA_DIR, "sessions")
SQLITE_PATH = os.path.join(DATA_DIR, "pgadmin4.db")
LOG_FILE = "/tmp/cryptoflow-pgadmin.log"

# ---------------------------------------------------------------------------
# Server settings
# ---------------------------------------------------------------------------
DEFAULT_SERVER = "0.0.0.0"
DEFAULT_SERVER_PORT = 5050

# ---------------------------------------------------------------------------
# Server mode — authentication required
# ---------------------------------------------------------------------------
SERVER_MODE = True
MASTER_PASSWORD_REQUIRED = True

# ---------------------------------------------------------------------------
# Misc
# ---------------------------------------------------------------------------
UPGRADE_CHECK_ENABLED = False
UPGRADE_CHECK_KEY = ""
CSP_ENABLED = True
