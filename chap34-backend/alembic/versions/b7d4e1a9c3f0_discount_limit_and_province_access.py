"""discount_limit_and_province_access

Revision ID: b7d4e1a9c3f0
Revises: a1c9f6e3d4b2
Create Date: 2026-08-22 09:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'b7d4e1a9c3f0'
down_revision = 'a1c9f6e3d4b2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('discount_codes', sa.Column('max_uses_per_user', sa.Integer(), nullable=True))
    # NULL = no restriction (existing atelier accounts keep seeing everything).
    op.add_column('staff_accounts', sa.Column('provinces', postgresql.JSONB(), nullable=True))


def downgrade() -> None:
    op.drop_column('staff_accounts', 'provinces')
    op.drop_column('discount_codes', 'max_uses_per_user')
