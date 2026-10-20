FROM mageai/mageai:latest
ARG PIP=pip3

RUN apt-get update && \
apt-get install -y --no-install-recommends \
        openjdk-11-jre

RUN ${PIP} install databricks-connect==11.3.0b0

ENV MAGE_DATA_DIR=
