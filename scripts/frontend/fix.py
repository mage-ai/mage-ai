import os
import subprocess

from openai import OpenAI

client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))


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
        print(f'Command failed with exit code {e.returncode}, that’s suppose to happen...\n')
        return e.output


def build_prompt(file_content: str, errors: list[str]) -> str:
    errors_str = '\n'.join(errors)
    return f"""
TypeScript code:
<code>
{file_content}
</code>

Fix the following eslint errors:
<errors>
{errors_str}
</errors>

Return the complete code solution back with all the fixes in place:
"""


def extract_errors(output):
    """
    Process the output string to get filenames and corresponding errors.

    :param output: The multi-line string containing the error output from a command.
    :return: A dictionary with filenames as keys and a list of their errors as values.
    """
    # Remove the introductory and concluding lines
    filtered_output = output.split('\n')[1:-3]

    # Dictionary to hold filename and errors
    errors_dict = {}
    current_file = None

    for line in filtered_output:
        # Check if line contains a filename (assuming error lines do not start with '/')
        if line.startswith('/'):
            current_file = line
            errors_dict[current_file] = []
        else:
            # Otherwise, it's an error message, add to the current file's list
            if current_file:
                errors_dict[current_file].append(line.strip())

    return errors_dict


def fix_errors(output: str):
    errors_dict = extract_errors(output)
    print(f'Files with errors: {len(errors_dict)}\n')
    for file, errors in errors_dict.items():
        print(f'Fixing {file}...')
        fixed_code = None

        with open(file, 'r') as f:
            prompt = build_prompt(
                f.read(),
                errors,
            )

            completion = client.chat.completions.create(
                model='gpt-4o',
                messages=[
                    {
                        'role': 'system',
                        'content': 'Don’t explain and only return complete code solutions.',
                    },
                    {'role': 'user', 'content': prompt},
                ],
            )
            fixed_code = completion.choices[0].message.content

        if fixed_code is None:
            raise Exception(f'No fixed code returned by the model for {file}')

        with open(file, 'w') as f:
            f.write(fixed_code)

        print('Fixed\n')


if __name__ == '__main__':
    run_shell_command(r"""
    git diff --name-only master...HEAD | \
          grep -v '^mage_ai/server/frontend_dist/' | \
          grep -v '^mage_ai/server/frontend_dist_base_path_template/' | \
          grep -E '\.(js|jsx|ts|tsx)$' | \
          xargs prettier --config mage_ai/frontend/.prettierrc --write
    """)

    command = r"""
    git diff --name-only master...HEAD | \
        grep -v '^mage_ai/server/frontend_dist/' | \
        grep -v '^mage_ai/server/frontend_dist_base_path_template/' | \
        grep -E '\.(js|jsx|ts|tsx)$' | \
        xargs eslint_d --quiet --config mage_ai/frontend/.eslintrc.js --fix --ext .js,.jsx,.ts,.tsx
    """

    # Run the command
    output = run_shell_command(command, raise_on_error=False)

    # Process or display the output as needed
    if output is None:
        print('No output or an error occurred.')
    else:
        fix_errors(output)
