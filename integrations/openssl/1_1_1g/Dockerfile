# Install openssl 1.1.1 instead of the default openssl 3.0.9
FROM mageai/mageai:latest

# (Install compiling library Make)
RUN apt-get -y install make 

# (single command that will download latest binaries, extract them, cd into the directory, compile configuration and then install the files)  
RUN wget https://www.openssl.org/source/openssl-1.1.1g.tar.gz
RUN tar -zxf openssl-1.1.1g.tar.gz
RUN cd openssl-1.1.1g && ./config && make && make install

# (This will create a sym link to the new binaries)
RUN ln -sf /usr/local/bin/openssl /usr/bin/openssl
RUN ldconfig
