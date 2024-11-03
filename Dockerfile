FROM ubuntu:22.04
LABEL description="Deploy Mage on ECS"
ARG FEATURE_BRANCH
USER root

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Update the package list, install CA certificates and curl
# Install PostgreSQL development headers
RUN mkdir -p /etc/apt/keyrings && \
    apt-get update && apt-get install -y --no-install-recommends \
    curl \
    apt-transport-https \
    ca-certificates \
    gnupg2 \
    software-properties-common \
    krb5-config \
    gcc \
    g++ \
    build-essential \
    libkrb5-dev \
    krb5-user \
    git \
    libpq-dev

# install Python 3.10 and pip3
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.10 python3.10-dev python3.10-venv python3-pip python3-pip

# Create a symbolic link to make python3 point to python3.10
# Make 'python' command available by creating a symlink to 'python3'
# Upgrade pip to the latest version
RUN \
  ln -s /usr/bin/python3 /usr/bin/python && \
  update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.10 1 && \
  pip3 install --no-cache-dir --upgrade pip

## System Packages
RUN \
  curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add - && \
  curl https://packages.microsoft.com/config/ubuntu/22.04/prod.list > /etc/apt/sources.list.d/mssql-release.list && \
  apt-get -y update && \
  ACCEPT_EULA=Y apt-get -y install --no-install-recommends \
  # Node
  nodejs \
  # NFS dependencies
  nfs-common \
  # odbc dependencies
  msodbcsql18\
  unixodbc-dev \
  graphviz \
  # R
  r-base && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*

## R Packages
RUN \
  R -e "install.packages('pacman', repos='http://cran.us.r-project.org')" && \
  R -e "install.packages('renv', repos='http://cran.us.r-project.org')"


## Python Packages
RUN \
  pip3 install --no-cache-dir sparkmagic && \
  mkdir ~/.sparkmagic && \
  curl https://raw.githubusercontent.com/jupyter-incubator/sparkmagic/master/sparkmagic/example_config.json > ~/.sparkmagic/config.json && \
  sed -i 's/localhost:8998/host.docker.internal:9999/g' ~/.sparkmagic/config.json && \
  jupyter-kernelspec install --user "$(pip3 show sparkmagic | grep Location | cut -d' ' -f2)/sparkmagic/kernels/pysparkkernel"
# Mage integrations and other related packages
RUN \
  pip3 install --no-cache-dir "git+https://github.com/wbond/oscrypto.git@d5f3437ed24257895ae1edd9e503cfb352e635a8" && \
  pip3 install --no-cache-dir "git+https://github.com/dremio-hub/arrow-flight-client-examples.git#egg=dremio-flight&subdirectory=python/dremio-flight" && \
  pip3 install --no-cache-dir "git+https://github.com/mage-ai/singer-python.git#egg=singer-python" && \
  pip3 install --no-cache-dir "git+https://github.com/mage-ai/dbt-mysql.git#egg=dbt-mysql" && \
  pip3 install --no-cache-dir "git+https://github.com/mage-ai/dbt-synapse.git#egg=dbt-synapse" && \
  pip3 install --no-cache-dir "git+https://github.com/mage-ai/sqlglot#egg=sqlglot" && \
  # faster-fifo is not supported on Windows: https://github.com/alex-petrenko/faster-fifo/issues/17
  pip3 install --no-cache-dir faster-fifo && \
  if [ -z "$FEATURE_BRANCH" ] || [ "$FEATURE_BRANCH" = "null" ]; then \
  pip3 install --no-cache-dir "git+https://github.com/mage-ai/mage-ai.git#egg=mage-integrations&subdirectory=mage_integrations"; \
  else \
  pip3 install --no-cache-dir "git+https://github.com/mage-ai/mage-ai.git@$FEATURE_BRANCH#egg=mage-integrations&subdirectory=mage_integrations"; \
  fi

# Mage
COPY ./mage_ai/server/constants.py /tmp/constants.py
RUN if [ -z "$FEATURE_BRANCH" ] || [ "$FEATURE_BRANCH" = "null" ] ; then \
  tag=$(tail -n 1 /tmp/constants.py) && \
  VERSION=$(echo "$tag" | tr -d "'") && \
  pip3 install --no-cache-dir "mage-ai[all]==$VERSION"; \
  else \
  pip3 install --no-cache-dir "git+https://github.com/mage-ai/mage-ai.git@$FEATURE_BRANCH#egg=mage-ai[all]"; \
  fi


## Startup Script
COPY --chmod=+x ./scripts/install_other_dependencies.py ./scripts/run_app.sh /app/

ENV MAGE_DATA_DIR="/home/src/mage_data"
ENV PYTHONPATH="${PYTHONPATH}:/home/src"
WORKDIR /home/src
EXPOSE 6789
EXPOSE 7789

CMD ["/bin/sh", "-c", "/app/run_app.sh"]
