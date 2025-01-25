FROM python:3.10-bookworm
LABEL description="Deploy Mage on ECS"
ARG FEATURE_BRANCH
USER root

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

## System Packages
RUN \
  curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add - && \
  curl https://packages.microsoft.com/config/debian/11/prod.list > /etc/apt/sources.list.d/mssql-release.list && \
  apt-get -y update && \
  ACCEPT_EULA=Y apt-get -y install --no-install-recommends \
  # NFS dependencies
  nfs-common \
  # odbc dependencies
  msodbcsql18\
  unixodbc-dev \
  graphviz \
  # postgres dependencies \
  postgresql-client \
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
COPY --chmod=0755 ./scripts/install_other_dependencies.py ./scripts/run_app.sh /app/

ENV MAGE_DATA_DIR="/home/src/mage_data"
ENV PYTHONPATH="${PYTHONPATH}:/home/src"
WORKDIR /home/src
EXPOSE 6789
EXPOSE 7789

CMD ["/bin/sh", "-c", "/app/run_app.sh"]
