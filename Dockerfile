FROM python
LABEL description="Deploy Mage on ECS"
ARG PIP=pip3
USER root

# Install Mage
RUN ${PIP} install "mage-ai[all]"

# Install NFS dependencies
RUN apt -y update && apt -y install nfs-common


# Set up spark kernel
RUN ${PIP} install sparkmagic
RUN mkdir ~/.sparkmagic
RUN wget https://raw.githubusercontent.com/jupyter-incubator/sparkmagic/master/sparkmagic/example_config.json
RUN mv example_config.json ~/.sparkmagic/config.json
RUN sed -i 's/localhost:8998/host.docker.internal:9999/g' ~/.sparkmagic/config.json
RUN jupyter-kernelspec install --user $(pip show sparkmagic | grep Location | cut -d" " -f2)/sparkmagic/kernels/pysparkkernel

EXPOSE 6789

ENV PYTHONPATH="${PYTHONPATH}:/home/src"
WORKDIR /home/src
COPY ./scripts/run_app.sh ./

RUN chmod +x /home/src/run_app.sh

CMD ["/home/src/run_app.sh"]
