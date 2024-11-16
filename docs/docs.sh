#!/bin/bash

# Check if mintlify is installed
if ! command -v mintlify &> /dev/null
then
    echo "mintlify is not installed. Installing..."
    npm install -g mintlify
else
    echo "mintlify is already installed."
fi

# Run mintlify dev on port 3333
mintlify dev --port 3333
