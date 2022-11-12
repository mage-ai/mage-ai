FROM mageai/mageai:latest

WORKDIR /home/mage_code

# Replace [project_name] with the name of your project (e.g. demo_project)
COPY [project_name] [project_name]

# Set the USER_CODE_PATH variable to the path of user project.
# The project path needs to contain project name.
# Replace [project_name] with the name of your project (e.g. demo_project)
ENV USER_CODE_PATH="/home/mage_code/[project_name]"

RUN pip3 install -r $(ls -d */ | head -1)/requirements.txt

ENV PYTHONPATH="${PYTHONPATH}:/home/mage_code"

CMD ["/bin/sh", "-c", "/app/run_app.sh"]
