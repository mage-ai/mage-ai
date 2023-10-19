FROM python:3.10-bookworm
USER root

RUN \
  pip3 install --no-cache-dir kubernetes==25.3.0 && \
  pip3 install --no-cache-dir Jinja2==3.1.2

COPY --chmod=+x ./scripts/pre-start /app/
RUN chmod +x /app/pre-start.sh


CMD ["/bin/sh", "-c", "/app/pre-start.sh"]
