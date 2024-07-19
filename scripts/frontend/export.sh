#!/bin/sh

bash ./frontend/scripts/clean.sh

NODE_ENV=production yarn export_prod
