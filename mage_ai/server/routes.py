from mage_ai.data_cleaner.data_cleaner import clean
from mage_ai.server.data.models import FeatureSet, Pipeline
from mage_ai.server import app

from flask import render_template

import pandas as pd
import threading

@app.route("/process", methods=["POST"])
def process():
    global index_df

    # clean df
    df_cleaned = clean(index_df)
    feature_set = FeatureSet(df=index_df)

    # get insights, statistics, etc.

    index_df = df_cleaned

@app.route("/")
def index():
    return render_template("index.html")

# @app.route("/test")
# def test():
#     data = {'col1': [1, 2], 'col2': [3, 4]}
#     df = pd.DataFrame(data)
#     feature_set = FeatureSet(df=df)
#     return feature_set.data.to_json()

@app.route("/feature_sets")
def feature_sets():
    pass

@app.route("/feature_sets/<id>")
def feature_set(id):
    feature_set = FeatureSet(id=id)
    return feature_set.to_dict()

@app.route("/feature_sets/<id>/columns/<column_name>")
def feature_set_column(id, column_name):
    feature_set = FeatureSet(id=id)
    return feature_set.column(column_name)

@app.route("/cleaning_functions")
def cleaning_functions():
    pass

@app.route("/pipelines")
def pipelines():
    return [pipeline.to_dict() for pipeline in Pipeline.objects()]

def launch(df) -> None:
    global index_df
    index_df = df
    app_kwargs = {"port": 5000, "host": "localhost", "debug": False}
    thread = threading.Thread(target=app.run, kwargs=app_kwargs, daemon=True)
    thread.start()
