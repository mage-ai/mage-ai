#!/bin/sh

if [ -f yarn.lock ]; then
  rm yarn.lock && echo "yarn.lock file has been removed.";
elif [ -d yarn.lock ]; then
  rm -r yarn.lock && echo "yarn.lock directory has been removed.";
else
  echo "yarn.lock does not exist.";
fi &&

mkdir -p node_modules
echo "Ensured node_modules directory is present."

if [ -d node_modules ]; then
  rm -rf node_modules && echo "node_modules directory has been removed.";
else
  echo "node_modules directory does not exist.";
fi &&

mkdir -p .next
echo "Ensured .next directory is present."

if [ -d .next ]; then
  rm -rf .next && echo ".next directory has been removed.";
else
  echo ".next directory does not exist.";
fi &&

yarn cache clean
yarn install
