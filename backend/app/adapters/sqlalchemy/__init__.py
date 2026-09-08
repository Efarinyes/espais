"""Adaptador SQLAlchemy 2 (SQLite dev, compatible amb PostgreSQL)."""

from app.adapters.sqlalchemy.models import EntityRow, MembershipRow, UserRow

__all__ = ["EntityRow", "MembershipRow", "UserRow"]
