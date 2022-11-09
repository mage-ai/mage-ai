FROM mageai/mageai:latest

WORKDIR /home/src

COPY . .

RUN pip3 install -r $(ls -d */ | head -1)/requirements.txt
