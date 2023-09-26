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
  apt-get -y update && \
  ACCEPT_EULA=Y apt-get -y install --no-install-recommends \
    # Node
    nodejs \
    # NFS dependencies
    nfs-common \
    # odbc dependencies
    msodbcsql18 \
    unixodbc-dev \
    # pymssql dependencies
    freetds-dev \
    freetds-bin && \
    # R
    # r-base=4.2.2.20221110-2 \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*

## R Packages
# RUN \
#   R -e "install.packages('pacman', repos='http://cran.us.r-project.org')" && \
#   R -e "install.packages('renv', repos='http://cran.us.r-project.org')"

## Node Packages
RUN npm install --global yarn && yarn global add next

## Python Packages
RUN \
  pip3 install --no-cache-dir sparkmagic && \
  mkdir ~/.sparkmagic && \
  curl https://raw.githubusercontent.com/jupyter-incubator/sparkmagic/master/sparkmagic/example_config.json > ~/.sparkmagic/config.json && \
  sed -i 's/localhost:8998/host.docker.internal:9999/g' ~/.sparkmagic/config.json && \
  jupyter-kernelspec install --user "$(pip3 show sparkmagic | grep Location | cut -d' ' -f2)/sparkmagic/kernels/pysparkkernel"
# Mage Integration and other related packages
RUN \
  pip3 install --no-cache-dir "git+https://github.com/mage-ai/singer-python.git#egg=singer-python" && \
  pip3 install --no-cache-dir "git+https://github.com/mage-ai/google-ads-python.git#egg=google-ads" && \
  pip3 install --no-cache-dir "git+https://github.com/mage-ai/dbt-mysql.git#egg=dbt-mysql"
COPY mage_integrations /home/src/mage_integrations
RUN pip3 install --no-cache-dir -e "/home/src/mage_integrations"
# Mage
COPY ./pyproject.toml /home/src/
COPY ./mage_ai /home/src/mage_ai
RUN pip3 install --no-cache-dir -e "/home/src[all]"

# Mage Frontend
WORKDIR /home/src/mage_ai/frontend
RUN yarn install && yarn cache clean

ENV PYTHONPATH="${PYTHONPATH}:/home/src"
WORKDIR /home/src
