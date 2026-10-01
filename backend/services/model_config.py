import os

DEFAULT_GEMINI_MODEL = "gemini-3.8-flash"


def get_model_name():
    return (os.getenv("GEMINI_MODEL") or DEFAULT_GEMINI_MODEL).strip() or DEFAULT_GEMINI_MODEL
