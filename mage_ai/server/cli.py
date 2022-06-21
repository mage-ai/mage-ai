import os
import subprocess
import sys

class ShellCommandException(Exception):
    pass

def exec_cmd(
    cmd, throw_on_error=True, env=None, stream_output=False, cwd=None, cmd_stdin=None, **kwargs
):
    cmd_env = os.environ.copy()
    if env:
        cmd_env.update(env)
    if stream_output:
        child = subprocess.Popen(
            cmd, env=cmd_env, cwd=cwd, universal_newlines=True, stdin=subprocess.PIPE, **kwargs
        )
        child.communicate(cmd_stdin)
        exit_code = child.wait()
        if throw_on_error and exit_code != 0:
            raise ShellCommandException("Non-zero exitcode: %s" % (exit_code))
        return exit_code
    else:
        child = subprocess.Popen(
            cmd,
            env=cmd_env,
            stdout=subprocess.PIPE,
            stdin=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=cwd,
            universal_newlines=True,
            **kwargs
        )
        (stdout, stderr) = child.communicate(cmd_stdin)
        exit_code = child.wait()
        if throw_on_error and exit_code != 0:
            raise ShellCommandException(
                "Non-zero exit code: %s\n\nSTDOUT:\n%s\n\nSTDERR:%s" % (exit_code, stdout, stderr)
            )
        return exit_code, stdout, stderr

def run_gunicorn_command(host, port):
    cmd = [sys.executable, '-m', 'gunicorn', '-b', f'{host}:{port}']
    cmd += ['mage_ai.server.app:app']
    exec_cmd(cmd)

    print("Server started!")
