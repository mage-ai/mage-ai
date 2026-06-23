FROM python:3.11-bookworm

ENV PYTHONPATH="${PYTHONPATH}:/home/src"
WORKDIR /home/src

RUN pip3 install --no-cache-dir uv
RUN uv pip install --system --no-cache-dir \
  "python-lsp-server[all]" \
  "python-lsp-server[websockets]" \
  pyls-memestra \
  pylsp-mypy \
  pylsp-rope \
  python-lsp-black \
  python-lsp-isort \
  python-lsp-ruff

ENV PORT=8765
EXPOSE ${PORT}

CMD ["sh", "-c", "pylsp --ws --port ${PORT}"]
