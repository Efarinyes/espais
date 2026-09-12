"""Columna archived_at: el coordinador arxiva avisos ja llegits."""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0007_notification_archived_at"
down_revision: str | Sequence[str] | None = "0006_notifications"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "notifications",
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("notifications", "archived_at")
