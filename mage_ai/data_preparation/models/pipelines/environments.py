import asyncio
import os

import aiofiles

from mage_ai.server.logger import Logger

logger = Logger().new_server_logger(__name__)


# store environment in mage_data directory
async def initialize_pipeline_environment(pipeline):
    package_dependencies = pipeline.package_dependencies
    if package_dependencies:
        import shlex
        import shutil

        import virtualenv

        # Minimum dependencies needed to run a pipeline using Mage CLI
        dependencies = [
            # 'typer[all]==0.9.0',
            # 'pyyaml~=6.0',
            # 'simplejson',
            # 'Jinja2',
            # 'aiofiles',
            # 'pytz',
            # 'python-dateutil',
            # 'pandas>=1.3.0',
            # 'polars>=0.18.0, <0.19.2',
            # 'sqlalchemy>=1.4.20, <2.0.0',
            # 'inflection==0.5.1',
            # 'GitPython',
            # 'six>=1.15.0',
            # 'ruamel.yaml==0.17.17',
            # 'cryptography',
            # 'croniter',
            # 'pyarrow-hotfix==0.5',
            # 'pyarrow==10.0.1',
            # 'ipykernel==6.15.0',
        ] + package_dependencies

        logger.info('Installing dependencies: %s', dependencies)

        venv_path = os.path.join(pipeline.pipeline_variables_dir, '.venv')
        if os.path.exists(venv_path):
            shutil.rmtree(venv_path)
        else:
            os.makedirs(pipeline.pipeline_variables_dir, exist_ok=True)

        virtualenv.cli_run([venv_path])
        # venv.create(tmpdirname, with_pip=True)
        python_path = os.path.join(venv_path, 'bin', 'python3')
        # cmd = shlex.join([python_path, '-m', 'pip', 'install', '--no-deps', 'mage-ai'])
        # proc1 = await asyncio.create_subprocess_shell(cmd)
        # await proc1.wait()
        cmd = shlex.join([python_path, '-m', 'pip', 'install'] + dependencies)
        proc2 = await asyncio.create_subprocess_shell(cmd)
        await proc2.wait()

        logger.info('Finished creating virtual env at path: %s', venv_path)
