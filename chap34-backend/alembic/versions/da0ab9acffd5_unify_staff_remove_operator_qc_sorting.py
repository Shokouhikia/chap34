"""unify_staff_remove_operator_qc_sorting

Revision ID: da0ab9acffd5
Revises: b381e25f90d3
Create Date: 2026-08-06 20:23:11.903125

"""
from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql

revision = 'da0ab9acffd5'
down_revision = 'b381e25f90d3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Create new unified staff table
    op.create_table('staff_accounts',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('name', sqlmodel.sql.sqltypes.AutoString(length=100), nullable=False),
    sa.Column('username', sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
    sa.Column('password_hash', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('role', sa.Enum('ADMIN', 'ATELIER', name='staffrole'), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('last_login_at', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_staff_accounts_role'), 'staff_accounts', ['role'], unique=False)
    op.create_index(op.f('ix_staff_accounts_username'), 'staff_accounts', ['username'], unique=True)

    # 2. Migrate operators -> staff_accounts (role=ATELIER for operators, ADMIN for admins)
    op.execute("""
        INSERT INTO staff_accounts (id, name, username, password_hash, role, is_active, created_at, last_login_at)
        SELECT id, name, username, password_hash,
            CASE WHEN role = 'ADMIN'::operatorrole THEN 'ADMIN'::staffrole ELSE 'ATELIER'::staffrole END,
            is_active, created_at, last_login_at
        FROM operators
    """)

    # 3. Migrate ateliers -> staff_accounts (role=ATELIER)
    op.execute("""
        INSERT INTO staff_accounts (id, name, username, password_hash, role, is_active, created_at, last_login_at)
        SELECT id, name, username, password_hash, 'ATELIER'::staffrole, is_active, created_at, last_login_at
        FROM ateliers
    """)

    # 4. Drop old FKs that reference operators/ateliers
    op.drop_constraint('print_batches_operator_id_fkey', 'print_batches', type_='foreignkey')
    op.drop_constraint('shipments_operator_id_fkey', 'shipments', type_='foreignkey')
    op.drop_constraint('orders_atelier_id_fkey', 'orders', type_='foreignkey')
    op.drop_index('ix_orders_atelier_id', table_name='orders')

    # 4b. Rename operator_id -> staff_id now that the FK targets staff_accounts
    op.alter_column('print_batches', 'operator_id', new_column_name='staff_id')
    op.alter_column('shipments', 'operator_id', new_column_name='staff_id')
    op.execute('ALTER INDEX ix_print_batches_operator_id RENAME TO ix_print_batches_staff_id')
    op.execute('ALTER INDEX ix_shipments_operator_id RENAME TO ix_shipments_staff_id')

    # 5. Drop columns from orders
    op.drop_column('orders', 'qc_reject_reason')
    op.drop_column('orders', 'atelier_id')
    op.drop_column('orders', 'actual_piece_count')

    # 6. Add new columns to orders
    op.add_column('orders', sa.Column('discount_code', sqlmodel.sql.sqltypes.AutoString(length=30), nullable=True))
    op.add_column('orders', sa.Column('discount_percent', sa.Integer(), nullable=True))
    op.add_column('orders', sa.Column('discount_amount', sa.Integer(), nullable=True))

    # 7. Recreate FKs pointing to staff_accounts
    op.create_foreign_key(None, 'print_batches', 'staff_accounts', ['staff_id'], ['id'])
    op.create_foreign_key(None, 'shipments', 'staff_accounts', ['staff_id'], ['id'])

    # 8. Drop old tables
    op.drop_table('ateliers')
    op.drop_table('operators')

    # 9. Drop old ENUMs
    op.execute("DROP TYPE IF EXISTS operatorrole")
    op.execute("DROP TYPE IF EXISTS qcrejectreason")

    # Note: PostgreSQL does not support dropping individual ENUM values.
    # The unused enum values (qc_pending, qc_rejected, sorting) remain in
    # the fulfillmentstatus type but are no longer referenced by the app.


def downgrade() -> None:
    # Recreate the old ENUM types first since the columns/tables below reference them.
    op.execute("CREATE TYPE operatorrole AS ENUM ('OPERATOR', 'ADMIN')")
    op.execute("CREATE TYPE qcrejectreason AS ENUM ('LOW_QUALITY', 'WRONG_COLOR', 'WRONG_CUT', 'INCOMPLETE_PRINT', 'PAPER_DAMAGE', 'OTHER')")

    # Recreate old tables and migrate back
    op.create_table('ateliers',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('name', sa.VARCHAR(length=100), nullable=False),
    sa.Column('username', sa.VARCHAR(length=50), nullable=False),
    sa.Column('password_hash', sa.VARCHAR(), nullable=False),
    sa.Column('is_active', sa.BOOLEAN(), nullable=False),
    sa.Column('created_at', sa.TIMESTAMP(), nullable=False),
    sa.Column('last_login_at', sa.TIMESTAMP(), nullable=True),
    sa.PrimaryKeyConstraint('id', name='ateliers_pkey')
    )
    op.create_index('ix_ateliers_username', 'ateliers', ['username'], unique=True)

    op.create_table('operators',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('name', sa.VARCHAR(length=100), nullable=False),
    sa.Column('username', sa.VARCHAR(length=50), nullable=False),
    sa.Column('password_hash', sa.VARCHAR(), nullable=False),
    sa.Column('role', postgresql.ENUM('OPERATOR', 'ADMIN', name='operatorrole', create_type=False), nullable=False),
    sa.Column('is_active', sa.BOOLEAN(), nullable=False),
    sa.Column('created_at', sa.TIMESTAMP(), nullable=False),
    sa.Column('last_login_at', sa.TIMESTAMP(), nullable=True),
    sa.PrimaryKeyConstraint('id', name='operators_pkey')
    )
    op.create_index('ix_operators_username', 'operators', ['username'], unique=True)

    # Migrate staff back to operators/ateliers
    op.execute("""
        INSERT INTO operators (id, name, username, password_hash, role, is_active, created_at, last_login_at)
        SELECT id, name, username, password_hash,
            (CASE WHEN role = 'ADMIN' THEN 'ADMIN' ELSE 'OPERATOR' END)::operatorrole,
            is_active, created_at, last_login_at
        FROM staff_accounts
        WHERE role IN ('ADMIN', 'ATELIER')
    """)
    op.execute("""
        INSERT INTO ateliers (id, name, username, password_hash, is_active, created_at, last_login_at)
        SELECT id, name, username, password_hash, is_active, created_at, last_login_at
        FROM staff_accounts
        WHERE role = 'ATELIER'
    """)

    op.execute('ALTER INDEX ix_shipments_staff_id RENAME TO ix_shipments_operator_id')
    op.execute('ALTER INDEX ix_print_batches_staff_id RENAME TO ix_print_batches_operator_id')
    op.drop_constraint('shipments_staff_id_fkey', 'shipments', type_='foreignkey')
    op.alter_column('shipments', 'staff_id', new_column_name='operator_id')
    op.create_foreign_key('shipments_operator_id_fkey', 'shipments', 'operators', ['operator_id'], ['id'])
    op.drop_constraint('print_batches_staff_id_fkey', 'print_batches', type_='foreignkey')
    op.alter_column('print_batches', 'staff_id', new_column_name='operator_id')
    op.create_foreign_key('print_batches_operator_id_fkey', 'print_batches', 'operators', ['operator_id'], ['id'])

    op.add_column('orders', sa.Column('actual_piece_count', sa.INTEGER(), autoincrement=False, nullable=True))
    op.add_column('orders', sa.Column('atelier_id', sa.UUID(), autoincrement=False, nullable=True))
    op.add_column('orders', sa.Column('qc_reject_reason', postgresql.ENUM('LOW_QUALITY', 'WRONG_COLOR', 'WRONG_CUT', 'INCOMPLETE_PRINT', 'PAPER_DAMAGE', 'OTHER', name='qcrejectreason', create_type=False), autoincrement=False, nullable=True))
    op.create_foreign_key('orders_atelier_id_fkey', 'orders', 'ateliers', ['atelier_id'], ['id'])
    op.create_index('ix_orders_atelier_id', 'orders', ['atelier_id'], unique=False)
    op.drop_column('orders', 'discount_amount')
    op.drop_column('orders', 'discount_percent')
    op.drop_column('orders', 'discount_code')

    op.drop_index(op.f('ix_staff_accounts_username'), table_name='staff_accounts')
    op.drop_index(op.f('ix_staff_accounts_role'), table_name='staff_accounts')
    op.drop_table('staff_accounts')

    op.execute("DROP TYPE IF EXISTS staffrole")
    # Note: downgrade does not restore old ENUM values to fulfillmentstatus
    # because PostgreSQL does not support ADD VALUE in downgrade migrations.
