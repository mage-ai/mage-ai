import asyncio
import json
import os
import pty
import pyte
import shlex
import select
import signal
import subprocess
import threading


class TerminalStatus:
    def __init__(self):
        self.cwd = os.getcwd()
        self.active_process = None
        self.fd = None
        self.child_pid = None


status = TerminalStatus()


class Terminal:
    def __init__(self, columns, lines, p_in):
        self.screen = pyte.HistoryScreen(columns, lines)
        self.screen.set_mode(pyte.modes.LNM)
        self.screen.write_process_input = \
            lambda data: p_in.write(data.encode())
        self.stream = pyte.ByteStream()
        self.stream.attach(self.screen)

    def feed(self, data):
        self.stream.feed(data)

    def dumps(self):
        cursor = self.screen.cursor
        lines = []
        for y in self.screen.dirty:
            line = self.screen.buffer[y]
            data = [(char.data, char.reverse, char.fg, char.bg)
                    for char in (line[x] for x in range(self.screen.columns))]
            lines.append((y, data))

        self.screen.dirty.clear()
        return json.dumps({"c": (cursor.x, cursor.y), "lines": lines})


def open_terminal(command="bash", columns=1000, lines=100):
    p_pid, master_fd = pty.fork()
    if p_pid == 0:  # Child.
        argv = shlex.split(command)
        env = dict(TERM="linux", LC_ALL="en_GB.UTF-8",
                   COLUMNS=str(columns), LINES=str(lines))
        os.execvpe(argv[0], argv, env)

    # File-like object for I/O with the child process aka command.
    p_out = os.fdopen(master_fd, "w+b", 0)
    return Terminal(columns, lines, p_out), p_pid, p_out


async def command_handler(command: str, send_output):
    terminal, pid, pout = open_terminal()
    send_output(terminal.dumps(), 'busy')

    def on_master_output():
        terminal.feed(pout.read(65536))
        send_output(terminal.dumps(), 'busy')

    loop = asyncio.get_event_loop()
    loop.add_reader(pout, on_master_output)
    try:
        pout.write(command.encode())
    except (asyncio.CancelledError,
            OSError):
        pass
    finally:
        loop.remove_reader(pout)
        os.kill(pid, signal.SIGTERM)
        pout.close()
        send_output('', 'idle')


# subprocess implementation

# def terminate_process():
#     proc = status.active_process
#     if proc is not None:
#         if proc.returncode is None:
#             proc.send_signal(signal.SIGINT)
#         status.active_process = None


# def connect():
#     if status.child_pid:
#         # already started child process, don't start another
#         return

#     # create child process attached to a pty we can read from and write to
#     (child_pid, fd) = pty.fork()
#     if child_pid == 0:
#         # this is the child process fork.
#         # anything printed here will show up in the pty, including the output
#         # of this subprocess
#         subprocess.run(['bash'])
#     else:
#         # this is the parent process fork.
#         # store child fd and pid
#         status.fd = fd
#         status.child_pid = child_pid
#         thread = threading.Thread(target=read_output)
#         thread.start()


# def read_output():
#     from mage_ai.server.websocket_server import WebSocketServer
#     max_read_bytes = 1024 * 20
#     while True:
#         if status.fd:
#             timeout_sec = 0
#             (data_ready, _, _) = select.select([status.fd], [], [], timeout_sec)
#             if data_ready:
#                 output = os.read(status.fd, max_read_bytes).decode(
#                     errors="ignore"
#                 )
#                 print(output)
#                 WebSocketServer.send_message(
#                     dict(
#                         data=output,
#                         execution_metadata=dict(
#                             block_uuid='terminal',
#                         ),
#                         execution_state='idle',
#                         # msg_id=message.get('msg_id'),
#                         type='text',
#                     ),
#                 )
#                 # socketio.emit("pty-output", {"output": output}, namespace="/pty")


# def run_command(cmd: str, send_output=print):
#     print('status fd:', status.fd)
#     if status.fd:
#         os.write(status.fd, cmd.encode())

# async def run_command(cmd: str, send_output=print):
#     async def read_stdout(process):
#         while True:
#             bytes_read = await process.stdout.read(100)
#             if bytes_read:
#                 send_output(bytes_read.decode(), 'busy')
#             else:
#                 break

#     async def read_stderr(process):
#         while True:
#             bytes_read = await process.stderr.read(100)
#             if bytes_read:
#                 send_output(bytes_read.decode(), 'busy')
#             else:
#                 break

#     async def test(process, stdout_task, stderr_task):
#         try:
#             await process.wait()
#             # err = await process.stderr.read()
#             send_output('', 'idle')
#         except Exception:
#             pass
#         stdout_task.cancel()
#         stderr_task.cancel()
#         status.active_process = None

#     if status.active_process is None:
#         master, slave = pty.openpty()
#         proc = await asyncio.create_subprocess_shell(
#             cmd,
#             cwd=status.cwd,
#             stdin=subprocess.PIPE,
#             stdout=subprocess.PIPE,
#             stderr=subprocess.PIPE,
#         )
#         # proc = subprocess.Popen(
#         #     cmd,
#         #     cwd=status.cwd,
#         #     stdin=subprocess.PIPE,
#         #     stdout=subprocess.PIPE,
#         #     shell=True,
#         #     text=True,
#         # )
#         status.active_process = proc
#         stdout_task = asyncio.create_task(read_stdout(proc))
#         stderr_task = asyncio.create_task(read_stderr(proc))
#         asyncio.create_task(test(proc, stdout_task, stderr_task))
#         # check for cd
#         args = shlex.split(cmd)
#         if args[0] == 'cd':
#             path = os.path.abspath(os.path.join(status.cwd, args[1]))
#             if os.path.exists(path):
#                 status.cwd = path
#     else:
#         proc = status.active_process
#         proc.stdin.write(f'{cmd}\n'.encode())
#         await proc.stdin.drain()


# import subprocess
# import threading

# test_args = 'echo "type something"; read foo; echo $foo'

# proc = subprocess.Popen(
#     test_args,
#     stdin=subprocess.PIPE,
#     stdout=subprocess.PIPE,
#     shell=True,
# )

# # def read_stdout(process):
# #     while process.poll() is None:
# #         print(process.stdout.readline())

# # t = threading.Thread(target=read_stdout, args=(proc,))
# # t.daemon = True
# # t.start()

# proc.stdin.write('huh'.encode())
# proc.stdin.write('huh'.encode())
# # proc.stdin.write('huh\n')

# # print(proc.stdout.read())


# while True:
#     line = proc.stdout.readline()
#     if not line:
#         break
#     print(line)

# return_code = proc.poll()
# if return_code is not None:
#     proc.kill()


# # test cd ========================================================
# import subprocess
# import threading

# test_args = 'pwd'

# run_command('pwd')

# run_command('cd ../')

# run_command('pwd')
