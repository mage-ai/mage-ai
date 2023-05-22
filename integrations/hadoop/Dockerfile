FROM mageai/mageai:latest
ARG PIP=pip3

RUN apt-get update && \
apt-get install -y --no-install-recommends \
        openjdk-11-jre

# Install dependencies
RUN apt-get install -y ssh rsync

# Download and extract Hadoop
RUN wget -qO- https://archive.apache.org/dist/hadoop/common/hadoop-3.3.4/hadoop-3.3.4.tar.gz | tar xvz -C /opt/
RUN ln -s /opt/hadoop-3.3.4 /opt/hadoop

# Set environment variables
ENV JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64
ENV HADOOP_HOME=/opt/hadoop
ENV HADOOP_CONF_DIR=$HADOOP_HOME/etc/hadoop/
ENV YARN_CONF_DIR=$HADOOP_HOME/etc/hadoop
ENV PATH=$PATH:$HADOOP_HOME/bin:$HADOOP_HOME/sbin

# Format the Hadoop filesystem
RUN hdfs namenode -format

# Start the Hadoop services
CMD start-dfs.sh && start-yarn.sh && tail -f /dev/null

RUN ${PIP} install pyspark

ENV MAGE_DATA_DIR=
