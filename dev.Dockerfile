FROM python:3.10

LABEL description="Mage data management platform"

ARG PIP=pip3

USER root

RUN apt -y update && apt -y install curl
RUN curl -fsSL https://deb.nodesource.com/setup_17.x | bash -
RUN apt install nodejs

# Install R
RUN apt install -y r-base
RUN R -e "install.packages('pacman', repos='http://cran.us.r-project.org')"

# Install Python dependencies
COPY requirements.txt requirements.txt
RUN ${PIP} install --upgrade pip
RUN ${PIP} install -r requirements.txt
RUN ${PIP} install jupyterlab
RUN ${PIP} install "git+https://github.com/mage-ai/mage-ai.git#egg=mage-integrations&subdirectory=mage_integrations"

COPY ./mage_ai /home/src/mage_ai

# Set up spark kernel (Uncomment the code below to set it up)
RUN ${PIP} install sparkmagic
RUN mkdir ~/.sparkmagic
RUN wget https://raw.githubusercontent.com/jupyter-incubator/sparkmagic/master/sparkmagic/example_config.json
RUN mv example_config.json ~/.sparkmagic/config.json
RUN sed -i 's/localhost:8998/host.docker.internal:9999/g' ~/.sparkmagic/config.json
RUN jupyter-kernelspec install --user $(pip show sparkmagic | grep Location | cut -d" " -f2)/sparkmagic/kernels/pysparkkernel


# Install node modules used in front-end
RUN npm install --global yarn
RUN yarn global add next
RUN cd /home/src/mage_ai/frontend && yarn install

ENV PYTHONPATH="${PYTHONPATH}:/home/src"

WORKDIR /home/src
