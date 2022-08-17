# Database migrations

We use alembic to perform DB migrations. alembic tutorial: https://alembic.sqlalchemy.org/en/latest/tutorial.html

## Create migration scripts
`alembic revision --autogenerate -m "Migration message"`


## Run migration
`alembic upgrade head`