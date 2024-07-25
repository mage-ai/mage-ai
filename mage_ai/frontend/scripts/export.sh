#!/bin/sh

export NODE_ENV=production

NODE_ENV=$NODE_ENV yarn next build
NODE_ENV=$NODE_ENV yarn next export -o ../server/frontend_dist
