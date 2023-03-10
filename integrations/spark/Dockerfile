FROM mageai/mageai:latest
ARG PIP=pip3

RUN apt-get update && \
apt-get install -y --no-install-recommends \
        openjdk-11-jre

RUN ${PIP} install pyspark

ENV MAGE_DATA_DIR=
