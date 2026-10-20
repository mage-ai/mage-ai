# Install oracle instant client to support oracle Thick mode.
# Documentation: https://python-oracledb.readthedocs.io/en/latest/user_guide/initialization.html#enabling-python-oracledb-thick-mode
FROM mageai/mageai:latest

RUN wget https://download.oracle.com/otn_software/linux/instantclient/2113000/instantclient-basic-linux.x64-21.13.0.0.0dbru.zip
RUN apt-get -y install unzip
RUN mkdir /var/oracle_instant_client
RUN unzip instantclient-basic-linux.x64-21.13.0.0.0dbru.zip -d /var/oracle_instant_client

RUN apt-get update
RUN apt-get -y install libaio1
RUN echo "/var/oracle_instant_client/instantclient_21_13" > /etc/ld.so.conf.d/oracle-instantclient.conf
RUN ldconfig
