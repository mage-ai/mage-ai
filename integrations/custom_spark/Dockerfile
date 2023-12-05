# Use Ubuntu 22.04 as the base image
FROM ubuntu:22.04 AS base

ARG PYTHON_VERSION=3.10.13

ENV JAVA_HOME /usr/lib/jvm/java-11-openjdk-amd64

RUN apt-get update

RUN DEBIAN_FRONTEND=noninteractive TZ=Etc/UTC apt-get -y install tzdata

RUN apt-get install -y \
    openjdk-11-jdk \
    wget bzip2 \
    python3-pip && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

ENV PYTHON_VERSION $PYTHON_VERSION
ENV SCALA_VERSION 2.13
ENV SPARK_VERSION 3.5.0
ENV SPARK_BUILD "spark-${SPARK_VERSION}-bin-hadoop3"
ENV SPARK_BUILD_URL "https://dist.apache.org/repos/dist/release/spark/spark-${SPARK_VERSION}/${SPARK_BUILD}.tgz"
RUN wget $SPARK_BUILD_URL -O /tmp/spark.tgz && \
    tar -C /opt -xf /tmp/spark.tgz && \
    mv /opt/$SPARK_BUILD /opt/spark && \
    rm /tmp/spark.tgz
ENV SPARK_HOME /opt/spark
ENV PATH $SPARK_HOME/bin:$PATH
ENV PYTHONPATH /opt/spark/python/lib/py4j-0.10.9-src.zip:/opt/spark/python/lib/pyspark.zip:$PYTHONPATH

ENV PYSPARK_PYTHON python3
ENV PYSPARK_DRIVER_PYTHON python3

RUN apt-get update

RUN apt-get install screen unzip -y

ADD hive-site.xml $SPARK_HOME/conf

RUN pip3 install pandas numpy matplotlib seaborn scipy jupyter importlib_metadata spark-nlp

ENV SHELL /bin/bash

WORKDIR $SPARK_HOME

COPY . $SPARK_HOME
