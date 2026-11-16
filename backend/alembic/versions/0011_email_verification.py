"""Verificació del correu: compte i entitat provisionals fins a l’enllaç."""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0011_email_verification"
down_revision: str | Sequence[str] | None = "0010_password_resets"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("entities", sa.Column("activated_at", sa.DateTime(timezone=True), nullable=True))
    op.execute("UPDATE users SET email_verified_at = created_at")
    op.execute("UPDATE entities SET activated_at = created_at")
    op.create_table(
        "email_verifications",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash", name="uq_email_verifications_token_hash"),
    )
    op.create_index("ix_email_verifications_user_id", "email_verifications", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_email_verifications_user_id", table_name="email_verifications")
    op.drop_table("email_verifications")
    op.drop_column("entities", "activated_at")
    op.drop_column("users", "email_verified_at")
