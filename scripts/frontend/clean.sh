#!/bin/bash

# Run the Docker service with cleanup and install steps
HOST='' PORT='' PROJECT='' docker compose run --rm app sh -c './scripts/clean.sh'
