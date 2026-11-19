import sys
import uuid
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Let tests import the app modules (main, models, ...) from the backend folder.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# DATABASE_URL comes from the environment (CI sets it; locally use .env.development).
from main import app  # noqa: E402
from middleware.rate_limit import limiter  # noqa: E402

# The register/login limits (5 and 10 per minute) would make a test run flaky.
limiter.enabled = False


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def new_user():
    """Unique credentials per test, so runs never collide in a shared database."""
    suffix = uuid.uuid4().hex[:10]
    return {
        "username": f"user_{suffix}",
        "email": f"user_{suffix}@example.com",
        "password": "Testpass123",
    }
