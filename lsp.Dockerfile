FROM python:3.10-bookworm

ENV PYTHONPATH="${PYTHONPATH}:/home/src"
WORKDIR /home/src

RUN pip3 install --no-cache-dir "python-lsp-server[all]" && \
  pip3 install --no-cache-dir "python-lsp-server[websockets]" && \
  pip3 install --no-cache-dir pyls-memestra && \
  pip3 install --no-cache-dir pylsp-mypy && \
  pip3 install --no-cache-dir pylsp-rope && \
  pip3 install --no-cache-dir python-lsp-black && \
  pip3 install --no-cache-dir python-lsp-isort && \
  pip3 install --no-cache-dir python-lsp-ruff

ENV PORT=8765
EXPOSE ${PORT}

CMD ["sh", "-c", "pylsp --ws --port ${PORT}"]
