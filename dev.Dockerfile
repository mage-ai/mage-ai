FROM python:3.10
LABEL description="Mage data management platform"
ARG PIP=pip3
USER root

# Packages
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

# R Packages
# RUN \
#   R -e "install.packages('pacman', repos='http://cran.us.r-project.org')" && \
#   R -e "install.packages('renv', repos='http://cran.us.r-project.org')"

# Node Packages
RUN npm install --global yarn && yarn global add next

# Python Packages
RUN \
  ${PIP} install --no-cache-dir sparkmagic && \
  mkdir ~/.sparkmagic && \
  wget https://raw.githubusercontent.com/jupyter-incubator/sparkmagic/master/sparkmagic/example_config.json && \
  mv example_config.json ~/.sparkmagic/config.json && \
  sed -i 's/localhost:8998/host.docker.internal:9999/g' ~/.sparkmagic/config.json && \
  jupyter-kernelspec install --user $(${PIP} show sparkmagic | grep Location | cut -d" " -f2)/sparkmagic/kernels/pysparkkernel
# Mage Integration
COPY requirements.txt requirements.txt
RUN ${PIP} install --no-cache-dir "git+https://github.com/mage-ai/singer-python.git#egg=singer-python"
RUN ${PIP} install --no-cache-dir "git+https://github.com/mage-ai/google-ads-python.git#egg=google-ads"
RUN ${PIP} install --no-cache-dir "git+https://github.com/mage-ai/dbt-mysql.git#egg=dbt-mysql"
COPY mage_integrations mage_integrations
RUN ${PIP} install mage_integrations/
# Mage Dependencies
RUN ${PIP} install --no-cache-dir -r requirements.txt

# Mage Frontend
COPY ./mage_ai /home/src/mage_ai
RUN cd /home/src/mage_ai/frontend && yarn install

ENV PYTHONPATH="${PYTHONPATH}:/home/src"
WORKDIR /home/src
