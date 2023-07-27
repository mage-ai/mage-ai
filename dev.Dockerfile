FROM python:3.10

LABEL description="Mage data management platform"

ARG PIP=pip3

USER root

# Download ODBC headers for pyodbc
RUN curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add -
RUN curl https://packages.microsoft.com/config/debian/11/prod.list > /etc/apt/sources.list.d/mssql-release.list
RUN apt-get -y update
RUN ACCEPT_EULA=Y apt-get -y install msodbcsql18
RUN apt-get -y install unixodbc-dev

# Install NFS dependencies, and pymssql dependencies
RUN apt-get -y install curl freetds-dev freetds-bin

# Install R
# RUN apt-get install -y r-base
# RUN R -e "install.packages('pacman', repos='http://cran.us.r-project.org')"
# RUN R -e "install.packages('renv', repos='http://cran.us.r-project.org')"

# Install Python dependencies
COPY requirements.txt requirements.txt
RUN ${PIP} install --upgrade pip

# pymssql temporary fix
RUN echo "Cython==0.29.36" >> /tmp/mssql-constraints.txt
RUN PIP_CONSTRAINT=/tmp/mssql-constraints.txt ${PIP} install pymssql==2.2.7

COPY mage_integrations mage_integrations
RUN ${PIP} install mage_integrations/
RUN ${PIP} install "git+https://github.com/mage-ai/dbt-mysql.git#egg=dbt-mysql"
RUN ${PIP} install "git+https://github.com/mage-ai/singer-python.git#egg=singer-python"
RUN ${PIP} install "git+https://github.com/mage-ai/google-ads-python.git#egg=google-ads"
RUN ${PIP} install -r requirements.txt

# Set up spark kernel (Uncomment the code below to set it up)
RUN ${PIP} install sparkmagic
RUN mkdir ~/.sparkmagic
RUN wget https://raw.githubusercontent.com/jupyter-incubator/sparkmagic/master/sparkmagic/example_config.json
RUN mv example_config.json ~/.sparkmagic/config.json
RUN sed -i 's/localhost:8998/host.docker.internal:9999/g' ~/.sparkmagic/config.json
RUN jupyter-kernelspec install --user $(pip show sparkmagic | grep Location | cut -d" " -f2)/sparkmagic/kernels/pysparkkernel


# Install node modules used in front-end
RUN curl -fsSL https://deb.nodesource.com/setup_17.x | bash -
RUN apt-get install -y nodejs
RUN apt-get install -y npm
RUN npm install --global yarn
RUN yarn global add next

# Copy code and setup frontend.
COPY ./mage_ai /home/src/mage_ai
RUN cd /home/src/mage_ai/frontend && yarn install

ENV PYTHONPATH="${PYTHONPATH}:/home/src"

WORKDIR /home/src
