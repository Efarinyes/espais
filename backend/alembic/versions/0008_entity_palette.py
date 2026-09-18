"""Paleta de colors de l’entitat (un valor per tenant)."""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0008_entity_palette"
down_revision: str | Sequence[str] | None = "0007_notification_archived_at"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "entities",
        sa.Column("palette", sa.String(length=32), nullable=False, server_default="mar-cel"),
    )


def downgrade() -> None:
    op.drop_column("entities", "palette")
