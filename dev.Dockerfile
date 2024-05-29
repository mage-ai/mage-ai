FROM python:3.8-slim
WORKDIR /usr/src/app
COPY . .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install mage-ai
EXPOSE 6789
CMD ["mage", "start", "server"]
