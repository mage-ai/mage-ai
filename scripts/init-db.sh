#!/bin/bash
# set -e is removed to allow the script to continue executing after an error.

# Function to check if a database exists and create it if it does not.
# It takes one argument: the name of the database to check and potentially create.
create_db_if_not_exists() {
    local dbname=$1
    PGPASSWORD=$POSTGRES_PASSWORD psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "postgres" --list | grep -qw $dbname
    if [ $? -ne 0 ]; then
        echo "Database $dbname not found, creating..."
        PGPASSWORD=$POSTGRES_PASSWORD psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "postgres" -c "CREATE DATABASE $dbname;"
    else
        echo "Database $dbname already exists, skipping creation."
    fi
}

# Attempt to create the main application database.
create_db_if_not_exists "$POSTGRES_DB"

# Attempt to create the 'experiments' database.
# create_db_if_not_exists "$EXPERIMENTS_DB"

# Assuming the role exists; otherwise, you'd include CREATE ROLE commands as needed.
# Grant all privileges on the databases to the specified user.
PGPASSWORD=$POSTGRES_PASSWORD psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "postgres" <<-EOSQL
    GRANT ALL PRIVILEGES ON DATABASE "$POSTGRES_DB" TO "$POSTGRES_USER";
    GRANT ALL PRIVILEGES ON DATABASE "$EXPERIMENTS_DB" TO "$POSTGRES_USER";
EOSQL
