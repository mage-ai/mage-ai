FROM python

LABEL description="Mage data management platform"

ARG PIP=pip3

USER root

RUN apt update && apt install curl
RUN curl -fsSL https://deb.nodesource.com/setup_17.x | bash -
RUN apt install nodejs

# Install Python dependencies
COPY requirements.txt requirements.txt
RUN ${PIP} install -r requirements.txt

COPY ./mage_ai /home/src/mage_ai

# Install node modules used in front-end
RUN npm install --global yarn
RUN yarn global add next
RUN cd /home/src/mage_ai/frontend && yarn install

ENV PYTHONPATH="${PYTHONPATH}:/home/src"

RUN ${PIP} install jupyterlab

WORKDIR /home/src
