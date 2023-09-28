"""Add executor_type to pipeline_run.

Revision ID: 66e67039b8a2
Revises: 21e31d66ccea
Create Date: 2023-05-12 11:20:50.288324

"""
from alembic import op
from mage_ai.data_preparation.models.constants import ExecutorType
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '66e67039b8a2'
down_revision = '21e31d66ccea'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # bind = op.get_bind()
    executor_type_enum = sa.Enum(ExecutorType, name='executortype')
    executor_type_enum.create(op.get_bind(), checkfirst=True)
    with op.batch_alter_table('pipeline_run', schema=None) as batch_op:
        batch_op.add_column(sa.Column('executor_type', executor_type_enum, nullable=True))


def downgrade() -> None:
    with op.batch_alter_table('pipeline_run', schema=None) as batch_op:
        batch_op.drop_column('executor_type')
    executor_type_enum = sa.Enum(ExecutorType, name='executortype')
    executor_type_enum.drop(op.get_bind())
