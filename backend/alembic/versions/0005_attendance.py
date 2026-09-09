"""Reserves: interval UTC i estat confirmed. Assistència per compte (1:1)."""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0005_attendance"
down_revision: str | Sequence[str] | None = "0004_reservations"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "attendance_records",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("entity_id", sa.Uuid(), nullable=False),
        sa.Column("reservation_id", sa.Uuid(), nullable=False),
        sa.Column("strategy", sa.String(length=32), nullable=False),
        sa.Column("count", sa.Integer(), nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["entity_id"], ["entities.id"]),
        sa.ForeignKeyConstraint(["reservation_id"], ["reservations.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("reservation_id", name="uq_attendance_reservation"),
    )
    op.create_index("ix_attendance_records_entity_id", "attendance_records", ["entity_id"])
    op.create_index("ix_attendance_records_reservation_id", "attendance_records", ["reservation_id"])


def downgrade() -> None:
    op.drop_index("ix_attendance_records_reservation_id", table_name="attendance_records")
    op.drop_index("ix_attendance_records_entity_id", table_name="attendance_records")
    op.drop_table("attendance_records")
