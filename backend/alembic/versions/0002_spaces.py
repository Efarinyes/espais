"""Espais: taules spaces i finestres de disponibilitat.

Revision ID: 0002_spaces
Revises: 0001_identity
Create Date: 2026-09-08
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0002_spaces"
down_revision: str | Sequence[str] | None = "0001_identity"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "spaces",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("entity_id", sa.Uuid(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("name_normalized", sa.String(length=255), nullable=False),
        sa.Column("capacity", sa.Integer(), nullable=False),
        sa.Column("equipment", sa.String(length=512), nullable=True),
        sa.Column("min_attendance", sa.Integer(), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["entity_id"], ["entities.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("entity_id", "name_normalized", name="uq_spaces_entity_name"),
    )
    op.create_index("ix_spaces_entity_id", "spaces", ["entity_id"])
    op.create_table(
        "space_availability_windows",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("space_id", sa.Uuid(), nullable=False),
        sa.Column("weekday", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.ForeignKeyConstraint(["space_id"], ["spaces.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_space_availability_windows_space_id", "space_availability_windows", ["space_id"])


def downgrade() -> None:
    op.drop_index("ix_space_availability_windows_space_id", table_name="space_availability_windows")
    op.drop_table("space_availability_windows")
    op.drop_index("ix_spaces_entity_id", table_name="spaces")
    op.drop_table("spaces")
