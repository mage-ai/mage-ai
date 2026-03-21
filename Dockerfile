FROM node:18-bookworm AS frontend-build

WORKDIR /build

COPY mage_ai/frontend/package.json mage_ai/frontend/yarn.lock ./mage_ai/frontend/
RUN cd mage_ai/frontend && yarn install --frozen-lockfile

COPY mage_ai/frontend ./mage_ai/frontend
RUN cd mage_ai/frontend && \
  yarn export_prod && \
  yarn export_prod_base_path


FROM python:3.10-slim-bookworm

LABEL description="Build Mage AI from the local codebase"

USER root

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    MAGE_DATA_DIR=/home/src/mage_data \
    PYTHONPATH=/home/src

ARG INSTALL_MSSQL=false
ARG INSTALL_R=false
ARG INSTALL_SPARKMAGIC=false
ARG INSTALL_EXTRA_PY_DEPS=false
ARG MAGE_EXTRAS=""

WORKDIR /home/src

RUN \
  apt-get update && \
  apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    graphviz \
    libpq-dev \
    postgresql-client && \
  if [ "${INSTALL_EXTRA_PY_DEPS}" = "true" ]; then \
    apt-get install -y --no-install-recommends \
      build-essential \
      pkg-config \
      python3-dev; \
  fi && \
  if [ "${INSTALL_MSSQL}" = "true" ]; then \
    curl -fsSL https://packages.microsoft.com/keys/microsoft.asc | apt-key add - && \
    curl -fsSL https://packages.microsoft.com/config/debian/11/prod.list \
      > /etc/apt/sources.list.d/mssql-release.list && \
    apt-get update && \
    ACCEPT_EULA=Y apt-get install -y --no-install-recommends \
      nfs-common \
      msodbcsql18 \
      unixodbc-dev; \
  fi && \
  if [ "${INSTALL_R}" = "true" ]; then \
    apt-get install -y --no-install-recommends r-base; \
  fi && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*

RUN \
  python -m pip install --upgrade pip setuptools wheel build && \
  if [ "${INSTALL_R}" = "true" ]; then \
    R -e "install.packages('pacman', repos='http://cran.us.r-project.org')" && \
    R -e "install.packages('renv', repos='http://cran.us.r-project.org')"; \
  fi && \
  if [ "${INSTALL_SPARKMAGIC}" = "true" ]; then \
    python -m pip install sparkmagic && \
    mkdir -p /root/.sparkmagic && \
    curl -fsSL \
      https://raw.githubusercontent.com/jupyter-incubator/sparkmagic/master/sparkmagic/example_config.json \
      > /root/.sparkmagic/config.json && \
    sed -i 's/localhost:8998/host.docker.internal:9999/g' /root/.sparkmagic/config.json && \
    jupyter-kernelspec install --user \
      "$(python -m pip show sparkmagic | awk '/Location:/{print $2}')/sparkmagic/kernels/pysparkkernel"; \
  fi && \
  if [ "${INSTALL_EXTRA_PY_DEPS}" = "true" ]; then \
    python -m pip install \
      "git+https://github.com/wbond/oscrypto.git@d5f3437ed24257895ae1edd9e503cfb352e635a8" \
      "git+https://github.com/dremio-hub/arrow-flight-client-examples.git#egg=dremio-flight&subdirectory=python/dremio-flight" \
      "git+https://github.com/mage-ai/singer-python.git#egg=singer-python" \
      "git+https://github.com/mage-ai/dbt-mysql.git#egg=dbt-mysql" \
      "git+https://github.com/mage-ai/sqlglot#egg=sqlglot" \
      faster-fifo; \
  fi

COPY README.md MANIFEST.in pyproject.toml requirements.txt setup.py ./
COPY mage_ai ./mage_ai
COPY mage_integrations ./mage_integrations
COPY scripts/install_other_dependencies.py scripts/run_app.sh /app/
COPY --from=frontend-build /build/mage_ai/server/frontend_dist ./mage_ai/server/frontend_dist
COPY --from=frontend-build /build/mage_ai/server/frontend_dist_base_path_template ./mage_ai/server/frontend_dist_base_path_template

RUN \
  chmod +x /app/run_app.sh && \
  python -m pip install ./mage_integrations && \
  if [ -n "${MAGE_EXTRAS}" ]; then \
    python -m pip install ".[${MAGE_EXTRAS}]"; \
  else \
    python -m pip install .; \
  fi && \
  mkdir -p /home/src/default_repo /home/src/mage_data

EXPOSE 6789 7789

CMD ["/bin/sh", "-c", "/app/run_app.sh"]
