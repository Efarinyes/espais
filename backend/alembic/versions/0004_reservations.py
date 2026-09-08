"""Reserves: interval UTC i estat confirmed."""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0004_reservations"
down_revision: str | Sequence[str] | None = "0003_invitations"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "reservations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("entity_id", sa.Uuid(), nullable=False),
        sa.Column("space_id", sa.Uuid(), nullable=False),
        sa.Column("coordinator_id", sa.Uuid(), nullable=False),
        sa.Column("coordinator_name", sa.String(length=255), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("notes", sa.String(length=512), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["entity_id"], ["entities.id"]),
        sa.ForeignKeyConstraint(["space_id"], ["spaces.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_reservations_entity_id", "reservations", ["entity_id"])
    op.create_index("ix_reservations_space_id", "reservations", ["space_id"])


def downgrade() -> None:
    op.drop_index("ix_reservations_space_id", table_name="reservations")
    op.drop_index("ix_reservations_entity_id", table_name="reservations")
    op.drop_table("reservations")
