FROM mageai/mageai:latest

WORKDIR /home/mage_code

COPY . .

# Set the USER_CODE_PATH variable to the path of user project
# The project path needs to contain project name
ENV USER_CODE_PATH="/home/mage_code"

RUN pip3 install -r $(ls -d */ | head -1)/requirements.txt

ENV PYTHONPATH="${PYTHONPATH}:/home/mage_code"

CMD ["/bin/sh", "-c", "/app/run_app.sh"]
