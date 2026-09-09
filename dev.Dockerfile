FROM python:3.10-bookworm
LABEL description="Mage data management platform"
USER root

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

## System Packages
RUN \
  curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add - && \
  curl https://packages.microsoft.com/config/debian/11/prod.list > /etc/apt/sources.list.d/mssql-release.list && \
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
  NODE_MAJOR=20 && \
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list && \
  apt-get update -y && \
  ACCEPT_EULA=Y apt-get install -y --no-install-recommends \
  # Node
  nodejs \
  # NFS dependencies
  nfs-common \
  # odbc dependencies
  msodbcsql18 \
  unixodbc-dev \
  # postgres dependencies \
  postgresql-client && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*

## Chart packages
# Before fixing, ensure you have merged the chart packages installation step with another apt-get install step to adhere to best practices.
# If keeping as a separate RUN statement, ensure you follow the same pattern regarding list cleanup and `-y` switch as done for system packages.
RUN apt-get update -y && \
  apt-get install -y --no-install-recommends graphviz && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*

## Node Packages
RUN npm install --global yarn && yarn global add next

# uv is the package manager for this project. Pin it so image builds and CI
# resolve dependencies the same way.
ARG UV_VERSION=0.11.29
RUN pip3 install --no-cache-dir "uv==$UV_VERSION"
# Install into the image's Python instead of a project virtualenv.
ENV UV_PROJECT_ENVIRONMENT=/usr/local

## Python Packages
RUN \
  uv pip install --system --no-cache-dir sparkmagic && \
  mkdir ~/.sparkmagic && \
  curl https://raw.githubusercontent.com/jupyter-incubator/sparkmagic/master/sparkmagic/example_config.json > ~/.sparkmagic/config.json && \
  sed -i 's/localhost:8998/host.docker.internal:9999/g' ~/.sparkmagic/config.json && \
  jupyter-kernelspec install --user "$(uv pip show sparkmagic | grep Location | cut -d' ' -f2)/sparkmagic/kernels/pysparkkernel"
# Mage integrations and other related packages
RUN \
  uv pip install --system --no-cache-dir "git+https://github.com/wbond/oscrypto.git@d5f3437ed24257895ae1edd9e503cfb352e635a8" && \
  uv pip install --system --no-cache-dir "git+https://github.com/dremio-hub/arrow-flight-client-examples.git#egg=dremio-flight&subdirectory=python/dremio-flight" && \
  uv pip install --system --no-cache-dir "git+https://github.com/mage-ai/singer-python.git#egg=singer-python" && \
  uv pip install --system --no-cache-dir "git+https://github.com/mage-ai/dbt-mysql.git#egg=dbt-mysql" && \
  uv pip install --system --no-cache-dir "git+https://github.com/mage-ai/sqlglot#egg=sqlglot" && \
  # faster-fifo is not supported on Windows: https://github.com/alex-petrenko/faster-fifo/issues/17
  uv pip install --system --no-cache-dir faster-fifo
COPY mage_integrations /tmp/mage_integrations
RUN \
  uv pip install --system --no-cache-dir /tmp/mage_integrations && \
  rm -rf /tmp/mage_integrations
# Mage Dependencies, resolved from uv.lock. --inexact keeps the packages
# installed in the steps above, which are not part of the lockfile.
COPY pyproject.toml uv.lock /tmp/mage/
RUN \
  uv sync --project /tmp/mage --locked --no-install-project --inexact --no-cache \
  --extra all --extra integrations --group dev && \
  rm -rf /tmp/mage

## Mage Frontend
COPY ./mage_ai /home/src/mage_ai
WORKDIR /home/src/mage_ai/frontend
RUN yarn install && yarn cache clean

ENV PYTHONPATH="${PYTHONPATH}:/home/src"
WORKDIR /home/src
