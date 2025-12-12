# backend/app/routers/__init__.py
from . import auth, chat, files, analytics, account, admin, passwd_reset, quota

__all__ = ["auth", "chat", "files", "analytics", "account", "admin", "passwd_reset", "quota"]
