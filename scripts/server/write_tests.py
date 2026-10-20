import os
import subprocess
from datetime import datetime
from pathlib import Path

import anthropic
from typing_extensions import Optional

MODEL = 'claude-3-opus-20240229'

client = anthropic.Anthropic(
    # defaults to os.environ.get("ANTHROPIC_API_KEY")
    api_key=os.environ.get('ANTHROPIC_API_KEY'),
)


def build_file_path_from_import(import_line, base_path=''):
    """
    Correctly formats a filepath from an import line.
    """
    # Normalize the line
    normalized_line = import_line.strip().replace('import ', '').replace('from ', '').split(' ')[0]

    # Convert to path
    path = normalized_line.replace('.', '/')

    # Ensure only one .py extension is appended
    if not path.endswith('.py'):
        path += '.py'

    # Combine with base path
    file_path = os.path.join(base_path, path)

    return file_path


def extract_mage_ai_imports(code: str) -> list[str]:
    """
    Extracts lines from a string of Python code that import modules from 'mage_ai'.
    """
    mage_ai_imports = []

    # Split the code into lines for processing
    lines = code.splitlines()

    for line in lines:
        # Trim whitespace for accurate starts with checking
        stripped_line = line.strip()
        if stripped_line.startswith('import mage_ai') or stripped_line.startswith('from mage_ai'):
            mage_ai_imports.append(stripped_line)

    return mage_ai_imports


def run_shell_command(command, raise_on_error: bool = True):
    """
    Runs the provided shell command and returns its output.
    """
    try:
        # This will capture the output of the command and store it
        output = subprocess.check_output(command, shell=True, stderr=subprocess.STDOUT, text=True)
        return output
    except subprocess.CalledProcessError as e:
        if raise_on_error:
            # If an error occurs while running the command, this will raise the exception
            raise e
        print(f'Command failed with exit code {e.returncode}: {e.output}\n')
        return e.output


def build_prompt(code: str, file_path: str) -> str:
    """
    Place the question at the end of the prompt, after the input data.
    As mentioned, this has been shown to significantly improve the quality of Claude's responses.

    Ask Claude to find quotes relevant to the question before answering,
    and to only answer if it finds relevant quotes.
    This encourages Claude to ground its responses in the provided context and
    reduces hallucination risk.

    Instruct Claude to read the document carefully, as it will be asked questions later.
    This primes Claude to pay close attention to the input data with an eye for the task
    it will be asked to execute.
    """

    parts = Path(file_path).parts
    import_from = '.'.join(parts[:-1])
    import_name = parts[-1].replace('.py', '')
    import_example = f'from {import_from}.{import_name} import ...'

    return f"""
Here is an example of code:

<code>
import time
from typing import Dict


def retry(
    retries: int = 2,
    delay: int = 5,
    max_delay: int = 60,
    exponential_backoff: bool = True,
    logger=None,
    logging_tags: Dict = None,
    retry_metadata: Dict = None,
):
    if logging_tags is None:
        logging_tags = dict()

    def retry_decorator(func):
        def retry_func(*args, **kwargs):
            max_attempts = retries + 1
            attempt = 1
            total_delay = 0
            curr_delay = delay
            while attempt <= max_attempts:
                try:
                    if retry_metadata:
                        retry_metadata['attempts'] = (retry_metadata.get('attempts', 0) or 0) + 1

                    return func(*args, **kwargs)
                except Exception as e:
                    if logger is None:
                        print(
                            'Exception thrown when attempting to run %s, attempt '
                            '%d of %d' % (func, attempt, max_attempts)
                        )
                    attempt += 1
                    if attempt > max_attempts or total_delay + curr_delay >= max_delay:
                        raise e
                    time.sleep(curr_delay)
                    total_delay += curr_delay
                    if exponential_backoff:
                        curr_delay *= 2
            return func(*args, **kwargs)
        return retry_func
    return retry_decorator
</code>

Here is an example of a unit test:

<test>
from unittest.mock import call, patch

from mage_ai.shared.retry import retry
from mage_ai.tests.base_test import TestCase


class RetryTests(TestCase):
    @patch('time.sleep')
    def test_retry(self, mock_sleep):
        @retry(retries=2, max_delay=40)
        def test_func():
            raise Exception('error')
            return

        with self.assertRaises(Exception):
            test_func()
            mock_sleep.assert_has_calls([call(5), call(10), call(20)])
</test>

Your task is to write a comprehensive unit test for the provided Python code.
Make sure to test the code under different scenarios and edge cases.
You can use the example test as a reference for writing your test.
When importing classes or functions from the provided code,
use the '{import_example}' syntax.

Here is the provided Python code:
<code>
{code}
</code>
"""


def build_system_prompt(file_paths: list[str]) -> str:
    """
    https://docs.anthropic.com/en/docs/system-prompts

    System prompts can include:
    - Task instructions and objectives
    - Personality traits, roles, and tone guidelines
    - Contextual information for the user input
    - Creativity constraints and style guidance
    - External knowledge, data, or reference material
    - Rules, guidelines, and guardrails
    - Output verification standards and requirements
    """
    documents = []
    for file_path in file_paths:
        with open(file_path, 'r') as file:
            code = file.read()
            documents.append(f"""
<source>
{file_path}
</source>
<document_content>
{code}
</document_content>
""")

    documents_string = '\n'.join(documents)

    return f"""
Here are documents that contain Python code for you to reference:

<documents>
{documents_string}
</documents>
"""


def build_test(prompt: str, system_prompt: Optional[str] = None, temperature: float = 1.0):
    """
    temperature:
        Defaults to 1.0. Ranges from 0.0 to 1.0.
        Use temperature closer to 0.0 for analytical / multiple choice,
        and closer to 1.0 for creative and generative tasks.
    """
    message = client.messages.create(
        model=MODEL,
        max_tokens=4096,
        temperature=temperature,
        system=system_prompt,
        messages=[
            {
                'role': 'user',
                'content': [
                    {
                        'text': prompt,
                        'type': 'text',
                    },
                ],
            },
            {
                'role': 'assistant',
                'content': '<test>',
            },
        ],
    )

    return message.content


def run(file_path: str):
    result = run_process(file_path)
    unit_test_code = result[0].text
    code = unit_test_code.split('</test>')[0]

    parts = Path(file_path).parts
    root_dir = parts[0]
    file_name = f'test_{parts[-1]}'
    test_file_path = os.path.join(root_dir, 'tests', *parts[1:-1], file_name)

    os.makedirs(os.path.dirname(test_file_path), exist_ok=True)
    with open(test_file_path, 'w') as f:
        print(f'Writing test code to file: {test_file_path}\n')
        code = code.strip() + '\n'
        f.write(code)
        print(code)
        print('\n')

    command = f'./scripts/server/py.sh -m unittest {test_file_path}'
    print(f'Running test: {command}')

    output = run_shell_command(command, raise_on_error=False)
    print(f'Test results:\n{output}')


def run_process(file_path: str):
    now = datetime.now()
    print(f'Writing tests for {file_path}')
    with open(file_path) as f:
        content = f.read()

    files_imported = extract_mage_ai_imports(content)
    print(f'Files imported: {len(files_imported)}')

    imported_file_paths = []
    for import_line in files_imported:
        import_file_path = build_file_path_from_import(import_line)
        print(f'  - {import_file_path}')

    prompt = build_prompt(content, file_path)
    system_prompt = build_system_prompt(imported_file_paths)
    result = build_test(prompt, system_prompt=system_prompt)

    print(f'Elapsed time: {datetime.utcnow().timestamp() - now.timestamp()} seconds.')
    print('\n')

    return result


if __name__ == '__main__':
    # output = run_shell_command(r"""
    # git diff --name-only --diff-filter=A master...HEAD | \
    #     grep '^mage_ai/' | \
    #     grep -vE '^mage_ai/server/frontend_dist/' | \
    #     grep -vE '^mage_ai/server/frontend_dist_base_path_template/' | \
    #     grep -vE '__init__.py|constants.py' | \
    #     grep -E '\.py$'
    # """)

    # file_paths = output.splitlines()

    file_paths = """
    mage_ai/data_preparation/models/utils.py
    mage_ai/system/memory/samples.py
    """.split('\n')
    file_paths = [file_path.strip() for file_path in file_paths if file_path.strip()][:]

    for file_path in file_paths:
        result = run(file_path)
