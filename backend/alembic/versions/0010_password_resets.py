"""Recuperació de compte: hash del token, versió de sessió i intents."""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0010_password_resets"
down_revision: str | Sequence[str] | None = "0009_revoked_tokens"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("session_version", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_table(
        "password_resets",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash", name="uq_password_resets_token_hash"),
    )
    op.create_index("ix_password_resets_user_id", "password_resets", ["user_id"])
    op.create_table(
        "recovery_attempts",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("subject_hash", sa.String(length=64), nullable=False),
        sa.Column("ip_hash", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_recovery_attempts_subject_hash", "recovery_attempts", ["subject_hash"])
    op.create_index("ix_recovery_attempts_ip_hash", "recovery_attempts", ["ip_hash"])
    op.create_index("ix_recovery_attempts_created_at", "recovery_attempts", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_recovery_attempts_created_at", table_name="recovery_attempts")
    op.drop_index("ix_recovery_attempts_ip_hash", table_name="recovery_attempts")
    op.drop_index("ix_recovery_attempts_subject_hash", table_name="recovery_attempts")
    op.drop_table("recovery_attempts")
    op.drop_index("ix_password_resets_user_id", table_name="password_resets")
    op.drop_table("password_resets")
    op.drop_column("users", "session_version")
