"""Add multi-project type support

Revision ID: 17b83128d548
Revises: b1d3bfde3c60
Create Date: 2025-10-01 23:13:41.802206

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "17b83128d548"
down_revision: Union[str, Sequence[str], None] = "b1d3bfde3c60"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # For SQLite, we need to recreate the table completely
    # Create a new table with all columns
    op.execute(
        """
        CREATE TABLE projects_new (
            id VARCHAR NOT NULL PRIMARY KEY,
            name VARCHAR NOT NULL,
            description TEXT,
            type VARCHAR NOT NULL DEFAULT 'image_annotation',
            status VARCHAR NOT NULL DEFAULT 'active',
            settings JSON,
            project_metadata JSON,
            user_id VARCHAR,
            created_at DATETIME,
            updated_at DATETIME,
            FOREIGN KEY(user_id) REFERENCES users (id)
        )
    """
    )

    # Copy data from old table
    op.execute(
        """
        INSERT INTO projects_new (id, name, created_at, updated_at)
        SELECT id, name, created_at, updated_at
        FROM projects
    """
    )

    # Drop old table
    op.execute("DROP TABLE projects")

    # Rename new table
    op.execute("ALTER TABLE projects_new RENAME TO projects")


def downgrade() -> None:
    """Downgrade schema."""
    # Recreate original table
    op.execute(
        """
        CREATE TABLE projects_old (
            id VARCHAR NOT NULL PRIMARY KEY,
            name VARCHAR NOT NULL,
            created_at DATETIME,
            updated_at DATETIME
        )
    """
    )

    # Copy data back
    op.execute(
        """
        INSERT INTO projects_old (id, name, created_at, updated_at)
        SELECT id, name, created_at, updated_at
        FROM projects
    """
    )

    # Drop new table
    op.execute("DROP TABLE projects")

    # Rename old table
    op.execute("ALTER TABLE projects_old RENAME TO projects")
