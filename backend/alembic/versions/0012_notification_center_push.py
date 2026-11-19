"""Reserva sota control del responsable i subscripcions Web Push (ADR 0026)."""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0012_notification_center_push"
down_revision: str | Sequence[str] | None = "0011_email_verification"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "reservations",
        sa.Column(
            "managed_by_responsible",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    reservations = sa.table(
        "reservations",
        sa.column("id", sa.Uuid()),
        sa.column("managed_by_responsible", sa.Boolean()),
    )
    notifications = sa.table(
        "notifications",
        sa.column("reservation_id", sa.Uuid()),
        sa.column("type", sa.String()),
    )
    # Només el responsable genera avisos de reprogramació: aquestes reserves ja
    # han estat modificades per ell i entren sota el seu control.
    op.execute(
        reservations.update()
        .where(
            reservations.c.id.in_(
                sa.select(notifications.c.reservation_id).where(
                    notifications.c.type == "reservation_rescheduled"
                )
            )
        )
        .values(managed_by_responsible=True)
    )
    op.create_table(
        "push_subscriptions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("entity_id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("endpoint_hash", sa.String(length=64), nullable=False),
        sa.Column("endpoint", sa.Text(), nullable=False),
        sa.Column("p256dh", sa.String(length=255), nullable=False),
        sa.Column("auth", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["entity_id"], ["entities.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("endpoint_hash", name="uq_push_subscriptions_endpoint_hash"),
    )
    op.create_index("ix_push_subscriptions_entity_id", "push_subscriptions", ["entity_id"])
    op.create_index("ix_push_subscriptions_user_id", "push_subscriptions", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_push_subscriptions_user_id", table_name="push_subscriptions")
    op.drop_index("ix_push_subscriptions_entity_id", table_name="push_subscriptions")
    op.drop_table("push_subscriptions")
    op.drop_column("reservations", "managed_by_responsible")
