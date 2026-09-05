"""add_contact_messages_table

Revision ID: e91f3a8c2d4b
Revises: c4a7e2f1b9d3
Create Date: 2026-09-05 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision = 'e91f3a8c2d4b'
down_revision = 'c4a7e2f1b9d3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('contact_messages',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('name', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=False),
    sa.Column('phone', sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
    sa.Column('email', sqlmodel.sql.sqltypes.AutoString(length=200), nullable=True),
    sa.Column('subject', sqlmodel.sql.sqltypes.AutoString(length=200), nullable=False),
    sa.Column('message', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('is_read', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('contact_messages')
