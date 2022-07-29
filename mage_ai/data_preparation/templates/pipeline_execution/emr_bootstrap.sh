#!/bin/bash
sudo yum -y install git-core
sudo yum -y install python3-devel
sudo pip3 install --upgrade pip setuptools wheel
sudo pip3 install --no-cache --upgrade git+https://github.com/mage-ai/mage-ai.git
sudo pip3 install --no-cache --upgrade numpy==1.19.2
sudo pip3 install --no-cache --upgrade --upgrade-strategy only-if-needed scipy==1.2.2
sudo pip3 install --no-cache --upgrade --upgrade-strategy only-if-needed pandas==1.1.3
sudo pip3 install --no-cache --upgrade --upgrade-strategy only-if-needed pyarrow==0.13.0
sudo pip3 install --no-cache --upgrade --upgrade-strategy only-if-needed scikit-learn==0.24.1
