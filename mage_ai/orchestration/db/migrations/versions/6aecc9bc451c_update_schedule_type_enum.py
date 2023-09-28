"""Update schedule type enum

Revision ID: 6aecc9bc451c
Revises: 7ac6fed06918
Create Date: 2023-01-05 15:17:52.800183

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '6aecc9bc451c'
down_revision = '7ac6fed06918'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.engine.name == 'postgresql':
        with op.get_context().autocommit_block():
            op.execute("ALTER TYPE scheduletype ADD VALUE 'API'")
            op.execute("ALTER TYPE scheduletype ADD VALUE 'EVENT'")


def downgrade() -> None:
    bind = op.get_bind()
    if bind.engine.name == 'postgresql':
        op.execute("ALTER TYPE scheduletype RENAME TO scheduletype_old")
        op.execute("CREATE TYPE scheduletype AS ENUM('TIME')")
        op.execute((
            "ALTER TABLE pipeline_schedule ALTER COLUMN schedule_type TYPE scheduletype USING "
            "schedule_type::text::scheduletype"
        ))
        op.execute("DROP TYPE scheduletype_old")
