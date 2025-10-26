import logging
import subprocess
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def run_migrations():
    """Run database migrations"""
    try:
        logger.info("Running database migrations...")
        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            cwd=Path(__file__).parent.parent,
            capture_output=True,
            text=True,
            timeout=60
        )
        if result.returncode == 0:
            logger.info("Migrations completed successfully")
        else:
            logger.error(f"Migration failed: {result.stderr}")
            return False
    except Exception as e:
        logger.error(f"Error running migrations: {e}")
        return False
    return True


def startup():
    """Run startup tasks"""
    logger.info("Starting up application...")
    
    # Run migrations
    if not run_migrations():
        logger.error("Failed to run migrations")
        return False
    
    # Import and run initial data creation
    try:
        from app.initial_data import main as init_data
        init_data()
        logger.info("Initial data created")
    except Exception as e:
        logger.error(f"Error creating initial data: {e}")
    
    return True
