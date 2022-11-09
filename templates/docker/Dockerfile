FROM mageai/mageai:latest

WORKDIR /home/src

COPY . .

RUN pip3 install -r $(ls -d */ | head -1)/requirements.txt

EXPOSE 6789

ENV PYTHONPATH="${PYTHONPATH}:/home/src"
WORKDIR /home/src

CMD ["/bin/sh", "-c", "/app/run_app.sh"]
