# Python 3 server example
from http.server import BaseHTTPRequestHandler, HTTPServer
import time
from jupyter_client import KernelManager
import argparse
import json


hostName = "localhost"
serverPort = 1337


def execute(code):
    connection_file = '/var/folders/76/632_cds56d56s19m1q4y5zdr0000gn/T/tmp2u7ce2up.json'
    with open(connection_file) as f:
        connection = json.loads(f.read())

    manager = KernelManager(**connection)
    client = manager.client()
    client.execute(code)


class MyServer(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-type", "text/html")
        self.end_headers()
        self.wfile.write(bytes("<html><head><title>https://pythonbasics.org</title></head>", "utf-8"))
        self.wfile.write(bytes("<p>Request: %s</p>" % self.path, "utf-8"))
        self.wfile.write(bytes("<body>", "utf-8"))
        self.wfile.write(bytes("<p>This is an example web server.</p>", "utf-8"))
        self.wfile.write(bytes("</body></html>", "utf-8"))

    def do_POST(self):
        content_length = int(self.headers['Content-Length'])
        raw_body = self.rfile.read(content_length)
        body = json.loads(raw_body)

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()

        path = self.path[1:]
        if 'run_codes' == path:
            code = body['run_code']['code']
            execute(code)
            message = dict(code=code)
            self.wfile.write(json.dumps(message).encode(encoding='utf_8'))


if __name__ == "__main__":
    webServer = HTTPServer((hostName, serverPort), MyServer)
    print("Server started http://%s:%s" % (hostName, serverPort))

    try:
        webServer.serve_forever()
    except KeyboardInterrupt:
        pass

    webServer.server_close()
    print("Server stopped.")
