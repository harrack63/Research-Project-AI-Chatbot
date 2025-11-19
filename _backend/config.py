import os
from dotenv import load_dotenv

VECTORDB_NAME_CHAT_HISTORY = "vectordb_chat_history"

# Milvus Configuration
env_path = os.path.join(os.path.dirname(__file__), "..", ".env.local")
load_dotenv(env_path)

MILVUS_URI = os.getenv("MILVUS_URI")
MILVUS_TOKEN = os.getenv("MILVUS_TOKEN")

OPENAI_EMBEDDING_MODEL = "text-embedding-3-small"

WORKDIR = "out"
PROMPTS_DIR = "prompts"

LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "standard": {
            "format": "[%(levelname).4s][%(asctime)s][%(name)s:%(lineno)d] %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "level": "INFO",
            "formatter": "standard",
            "stream": "ext://sys.stdout",
        },
        "rotating_file": {
            "class": "logging.handlers.RotatingFileHandler",
            "level": "DEBUG",
            "formatter": "standard",
            "filename": f"{WORKDIR}/backend.log",
            "maxBytes": 10_000_000,
            "backupCount": 3,
            "encoding": "utf-8",
        },
    },
    "loggers": {
        "backend": {
            "level": "DEBUG",
            "handlers": ["console", "rotating_file"],
            "propagate": False,
        },
        # "personalized_chatbot": {
        #     "level": "DEBUG",
        #     "handlers": ["rotating_file"],
        #     "propagate": False,
        # },
    },
    "root": {"level": "WARNING", "handlers": []},
}