"""Revocació de tokens de sessió: hash i caducitat, sense el token en clar."""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0009_revoked_tokens"
down_revision: str | Sequence[str] | None = "0008_entity_palette"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "revoked_tokens",
        sa.Column("token_hash", sa.String(length=64), primary_key=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_revoked_tokens_expires_at", "revoked_tokens", ["expires_at"])


def downgrade() -> None:
    op.drop_index("ix_revoked_tokens_expires_at", table_name="revoked_tokens")
    op.drop_table("revoked_tokens")
