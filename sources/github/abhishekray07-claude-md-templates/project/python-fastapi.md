## Project
[Your project name] — [one-sentence description of what it does].

## Stack
- Python 3.12, FastAPI, Pydantic v2
- [Database: e.g., SQLAlchemy + PostgreSQL, SQLModel]
- [Auth: e.g., JWT, OAuth2, API keys]
- [Task queue: e.g., Celery, ARQ, none]
- Deployed on [AWS / GCP / Railway / etc.]

## Structure
- src/api/ — route handlers
- src/models/ — Pydantic models and DB schemas
- src/services/ — business logic
- src/db/ — database connection, migrations
- tests/ — test files (mirrors src/ structure)

## Commands
- Dev: `uvicorn src.main:app --reload`
- Test: `pytest`
- Lint: `ruff check .`
- Format: `ruff format .`
- Type check: `mypy src/`
- Migrate: `alembic upgrade head`

## Verification
After every change, run in this order:
1. `mypy src/` — fix type errors
2. `pytest` — fix failing tests
3. `ruff check .` — fix lint errors

## Conventions
- Use Pydantic models for all request/response schemas
- Use dependency injection for database sessions
- Async by default for route handlers
- [Add: error handling patterns, logging conventions]
- For [complex domain topic], see docs/[relevant-guide].md

## Don't
- Don't use `# type: ignore` without a comment explaining why
- Don't catch bare `Exception` — catch specific exceptions
- Don't put business logic in route handlers — use services/
