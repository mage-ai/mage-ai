from flask import Flask

app = Flask(__name__,
            static_url_path='',
            static_folder="../frontend/out",
            template_folder="../frontend/out")

import server.routes
