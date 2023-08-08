# Database migrations

We use alembic to perform DB migrations. alembic tutorial: https://alembic.sqlalchemy.org/en/latest/tutorial.html

## Before running commands

1. Open the file `mage-ai/mage_ai/orchestration/db/alembic.ini`
1. Change the value `sqlalchemy.url` to the URL of your database.
    - e.g. `sqlalchemy.url = postgresql+psycopg2://postgres:postgres@host.docker.internal:5432/demo`

## Create migration scripts

Change directory into:

```
cd mage_ai/orchestration/db
```


```
alembic revision --autogenerate -m "Migration message"
```

If you don’t see your changes in the migration file, add your new models module in this
file: `mage-ai/mage_ai/orchestration/db/migrations/env.py`

For example:

```python
import mage_ai.orchestration.db.models.tags  # noqa: E402, F401
```

## Run migration

```
alembic upgrade head
```

## Rollback migration

```
alembic downgrade -1
```

## Clean up

1. Change the `sqlalchemy.url` back to the original value.
