"""Add User table and Detection user_id

Revision ID: c1a2b3c4d5e6
Revises: b077739085b4
Create Date: 2025-01-15 10:00:00.000000

"""

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision = "c1a2b3c4d5e6"
down_revision = "b077739085b4"
branch_labels = None
depends_on = None


def upgrade():
    # Create users table
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )

    # Add user_id column to detections table
    op.add_column("detections", sa.Column("user_id", sa.Integer(), nullable=True))

    # Create a default user for existing detections
    op.execute("""
        INSERT INTO users (id, name, email, password, created_at)
        VALUES (1, 'Default User', 'default@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.V/aV1bDEv1YqO.', NOW())
        ON DUPLICATE KEY UPDATE id=id
    """)

    # Update existing detections to have user_id = 1
    op.execute("UPDATE detections SET user_id = 1 WHERE user_id IS NULL")

    # Now make user_id non-nullable
    op.alter_column("detections", "user_id", nullable=False, existing_type=sa.Integer())

    # Add foreign key constraint
    op.create_foreign_key(
        "fk_detections_user_id", "detections", "users", ["user_id"], ["id"]
    )


def downgrade():
    # Remove foreign key constraint
    op.drop_constraint("fk_detections_user_id", "detections", type_="foreignkey")

    # Remove user_id column from detections
    op.drop_column("detections", "user_id")

    # Drop users table
    op.drop_table("users")
