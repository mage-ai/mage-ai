FROM jupyter/minimal-notebook

LABEL description="Mage data management platform"

ARG PIP=pip3

USER root

# Install some handful libraries like curl, wget, git, build-essential, zlib
RUN apt-get update && apt-get install -y --no-install-recommends software-properties-common && \
    add-apt-repository ppa:deadsnakes/ppa -y && \
    apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        ca-certificates \
        curl \
        wget \
        git \
        libopencv-dev \
        openssh-client \
        openssh-server \
        vim \
        zlib1g-dev \
        graphviz \
        yarn

COPY requirements.txt requirements.txt
RUN ${PIP} install -r requirements.txt

# RUN jupyter nbextension install --py --sys-prefix widgetsnbextension

COPY . /home/jovyan/src

RUN cd /home/jovyan/src/mage_ai/frontend && npm install

ENV PYTHONPATH="${PYTHONPATH}:/home/jovyan/src"
