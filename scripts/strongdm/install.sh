#!/bin/bash

apt update -y
curl -J -O -L https://app.strongdm.com/releases/cli/linux
unzip sdmcli*
./sdm install --user root --nologin
