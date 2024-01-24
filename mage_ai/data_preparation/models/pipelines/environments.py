import asyncio
import os

import aiofiles


# store environment in mage_data directory
async def initialize_pipeline_environment(pipeline):
    requirements_file_path = os.path.join(pipeline.dir_path, 'requirements.txt')
    if os.path.exists(requirements_file_path):
        import shlex
        import shutil
        import venv
        dependencies = [
            'typer[all]==0.7.0',
            'pyyaml~=6.0',
            'simplejson',
            'Jinja2==3.1.2',
            'aiofiles==22.1.0',
            'pytz==2022.2.1',
            'python-dateutil==2.8.2',
            'pandas>=1.3.0',
            'polars>=0.18.0, <0.19.2',
            'sqlalchemy>=1.4.20, <2.0.0',
            'inflection==0.5.1',
            'GitPython==3.1.34',
            'six>=1.15.0',
            'ruamel.yaml==0.17.17',
            'cryptography==36.0.2',
            'croniter==1.3.7',
            'pyarrow-hotfix==0.5',
            'pyarrow==10.0.1',
        ]

        async with aiofiles.open(requirements_file_path) as f:
            content = await f.read()
            for line in content.splitlines():
                dependencies.append(line)

        async with aiofiles.tempfile.TemporaryDirectory() as tmpdirname:
            venv.create(tmpdirname, with_pip=True)
            python_path = os.path.join(tmpdirname, 'bin', 'python3')
            # cmd = shlex.join([python_path, '-m', 'pip', 'install', '--no-deps', 'mage-ai'])
            # proc1 = await asyncio.create_subprocess_shell(cmd)
            # await proc1.wait()
            cmd = shlex.join([python_path, '-m', 'pip', 'install'] + dependencies)
            proc2 = await asyncio.create_subprocess_shell(cmd)
            await proc2.wait()

            # copy venv to pipeline directory
            venv_path = os.path.join(pipeline.pipeline_variables_dir, '.venv')
            shutil.copytree(tmpdirname, venv_path, dirs_exist_ok=True)
