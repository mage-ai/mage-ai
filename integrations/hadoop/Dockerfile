FROM mageai/mageai:latest
ARG PIP=pip3

RUN apt-get update && \
apt-get install -y --no-install-recommends \
        openjdk-11-jre

RUN apt-get install -y openssh-server
RUN mkdir /var/run/sshd
RUN echo "    PermitRootLogin yes" >> /etc/ssh/sshd_config
RUN echo "    PasswordAuthentication yes" >> /etc/ssh/sshd_config
RUN echo "    PermitEmptyPasswords yes" >> /etc/ssh/sshd_config
RUN echo "    StrictHostKeyChecking no" >> /etc/ssh/ssh_config

EXPOSE 22

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
ENV HDFS_DATANODE_USER=root
ENV HDFS_NAMENODE_USER=root
ENV HDFS_SECONDARYNAMENODE_USER=root
ENV YARN_NODEMANAGER_USER=root
ENV YARN_RESOURCEMANAGER_USER=root

RUN echo "export JAVA_HOME=$JAVA_HOME" >> /opt/hadoop/etc/hadoop/hadoop-env.sh
RUN echo "export HADOOP_SSH_OPTS=\"-p 22\"" >> /opt/hadoop/etc/hadoop/hadoop-env.sh

# Enable passwordless SSH
RUN ssh-keygen -b 2048 -t rsa -f ~/.ssh/id_rsa -q -N "" && \
        cat ~/.ssh/id_rsa.pub >> ~/.ssh/authorized_keys

# Format the Hadoop filesystem
RUN hdfs namenode -format
RUN ${PIP} install pyspark

COPY run_app_with_hadoop.sh /app/run_app_with_hadoop.sh
RUN chmod +x /app/run_app_with_hadoop.sh

ENV MAGE_DATA_DIR=
