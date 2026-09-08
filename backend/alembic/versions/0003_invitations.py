"""Invitacions de coordinador: token copiable, sense SMTP."""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0003_invitations"
down_revision: str | Sequence[str] | None = "0002_spaces"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "invitations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("entity_id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("token", sa.String(length=128), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["entity_id"], ["entities.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token", name="uq_invitations_token"),
    )
    op.create_index("ix_invitations_entity_id", "invitations", ["entity_id"])


def downgrade() -> None:
    op.drop_index("ix_invitations_entity_id", table_name="invitations")
    op.drop_table("invitations")
