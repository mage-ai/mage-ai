FROM python:3.10
LABEL description="Deploy Mage on ECS"
ARG PIP=pip3
USER root

# Download ODBC headers for pyodbc
RUN curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add -
RUN curl https://packages.microsoft.com/config/debian/11/prod.list > /etc/apt/sources.list.d/mssql-release.list
RUN apt-get -y update
RUN ACCEPT_EULA=Y apt-get -y install msodbcsql18
RUN apt-get -y install unixodbc-dev

# Install NFS dependencies, and pymssql dependencies
RUN apt-get -y install nfs-common freetds-dev freetds-bin

# Install Mage
RUN ${PIP} install --upgrade pip

# pymssql temporary fix
RUN echo "Cython==0.29.36" >> /tmp/mssql-constraints.txt
RUN PIP_CONSTRAINT=/tmp/mssql-constraints.txt ${PIP} install pymssql==2.2.7

RUN ${PIP} install --no-cache "git+https://github.com/mage-ai/mage-ai.git#egg=mage-integrations&subdirectory=mage_integrations"
RUN ${PIP} install "git+https://github.com/mage-ai/dbt-mysql.git#egg=dbt-mysql"
RUN ${PIP} install "git+https://github.com/mage-ai/singer-python.git#egg=singer-python"
RUN ${PIP} install "git+https://github.com/mage-ai/google-ads-python.git#egg=google-ads"
COPY ./mage_ai/server/constants.py constants.py
RUN tag=$(tail -n 1 constants.py) && VERSION=$(echo $tag | tr -d "'") && ${PIP} install --no-cache "mage-ai[all]"==$VERSION

# Install R
RUN apt-get install -y r-base
RUN R -e "install.packages('pacman', repos='http://cran.us.r-project.org')"
RUN R -e "install.packages('renv', repos='http://cran.us.r-project.org')"

# Set up spark kernel
RUN ${PIP} install sparkmagic
RUN mkdir ~/.sparkmagic
RUN wget https://raw.githubusercontent.com/jupyter-incubator/sparkmagic/master/sparkmagic/example_config.json
RUN mv example_config.json ~/.sparkmagic/config.json
RUN sed -i 's/localhost:8998/host.docker.internal:9999/g' ~/.sparkmagic/config.json
RUN jupyter-kernelspec install --user $(pip show sparkmagic | grep Location | cut -d" " -f2)/sparkmagic/kernels/pysparkkernel

EXPOSE 6789
EXPOSE 7789

ENV MAGE_DATA_DIR="/home/src/mage_data"
ENV PYTHONPATH="${PYTHONPATH}:/home/src"
WORKDIR /home/src

COPY ./scripts/install_other_dependencies.py /app/install_other_dependencies.py
COPY ./scripts/run_app.sh /app/run_app.sh
RUN chmod +x /app/run_app.sh

CMD ["/bin/sh", "-c", "/app/run_app.sh"]
