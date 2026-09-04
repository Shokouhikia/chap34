"""add_redirects_table

Revision ID: c4a7e2f1b9d3
Revises: b7d4e1a9c3f0
Create Date: 2026-09-04 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision = 'c4a7e2f1b9d3'
down_revision = 'b7d4e1a9c3f0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('redirects',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('source_path', sqlmodel.sql.sqltypes.AutoString(length=500), nullable=False),
    sa.Column('destination_path', sqlmodel.sql.sqltypes.AutoString(length=500), nullable=False),
    sa.Column('status_code', sa.Integer(), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_redirects_source_path'), 'redirects', ['source_path'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_redirects_source_path'), table_name='redirects')
    op.drop_table('redirects')
