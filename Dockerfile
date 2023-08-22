ARG PIP=pip3
ARG VIRTUAL_ENV=/opt/venv

FROM python:3.10 as builder
ARG PIP
ARG VIRTUAL_ENV
RUN python3 -m venv ${VIRTUAL_ENV}
ENV PATH=${VIRTUAL_ENV}/bin:$PATH

RUN ${PIP} install --no-cache-dir sparkmagic
# Mage Integration
RUN ${PIP} install --no-cache-dir "git+https://github.com/mage-ai/singer-python.git#egg=singer-python"
RUN ${PIP} install --no-cache-dir "git+https://github.com/mage-ai/google-ads-python.git#egg=google-ads"
RUN ${PIP} install --no-cache-dir "git+https://github.com/mage-ai/dbt-mysql.git#egg=dbt-mysql"
RUN ${PIP} install --no-cache-dir "git+https://github.com/mage-ai/mage-ai.git#egg=mage-integrations&subdirectory=mage_integrations"
# Mage
COPY ./mage_ai/server/constants.py constants.py
RUN tag=$(tail -n 1 constants.py) && VERSION=$(echo $tag | tr -d "'") && ${PIP} install --no-cache-dir "mage-ai[all]"==$VERSION


FROM python:3.10
LABEL description="Deploy Mage on ECS"
ARG PIP
ARG VIRTUAL_ENV
USER root

# Packages
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
    # pymssql dependencies
    freetds-dev \
    freetds-bin \
    # R
    r-base && \
  apt-get clean && \
  rm -rf /var/lib/apt/lists/*

# R Packages
RUN \
  R -e "install.packages('pacman', repos='http://cran.us.r-project.org')" && \
  R -e "install.packages('renv', repos='http://cran.us.r-project.org')"

# Python Packages
COPY --link --from=builder ${VIRTUAL_ENV} ${VIRTUAL_ENV}
ENV PATH=${VIRTUAL_ENV}/bin:$PATH
RUN \
  mkdir ~/.sparkmagic && \
  wget https://raw.githubusercontent.com/jupyter-incubator/sparkmagic/master/sparkmagic/example_config.json && \
  mv example_config.json ~/.sparkmagic/config.json && \
  sed -i 's/localhost:8998/host.docker.internal:9999/g' ~/.sparkmagic/config.json && \
  jupyter-kernelspec install --user $(${PIP} show sparkmagic | grep Location | cut -d" " -f2)/sparkmagic/kernels/pysparkkernel

# Startup Script
COPY --chmod=+x ./scripts/install_other_dependencies.py ./scripts/run_app.sh /app/

ENV MAGE_DATA_DIR="/home/src/mage_data"
ENV PYTHONPATH="${PYTHONPATH}:/home/src"
WORKDIR /home/src
EXPOSE 6789
EXPOSE 7789

CMD ["/bin/sh", "-c", "/app/run_app.sh"]
