"""store_photo_bytes_in_postgres

Revision ID: a1c9f6e3d4b2
Revises: 922f66699322
Create Date: 2026-08-20 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1c9f6e3d4b2'
down_revision = '922f66699322'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('photos', sa.Column('original_file_data', sa.LargeBinary(), nullable=True))
    op.add_column('photos', sa.Column('result_file_data', sa.LargeBinary(), nullable=True))


def downgrade() -> None:
    op.drop_column('photos', 'result_file_data')
    op.drop_column('photos', 'original_file_data')
