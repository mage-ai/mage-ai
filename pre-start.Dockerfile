FROM python:3.10-bookworm

RUN pip3 install --no-cache-dir kubernetes==25.3.0

COPY --chmod=+x /kubernetes_pre_start.py /app/
