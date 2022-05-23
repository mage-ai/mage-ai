from data_cleaner.data_cleaner import analyze, clean as clean_data
from flask import request
from numpyencoder import NumpyEncoder
from server.data.models import FeatureSet, Pipeline
from server import app

import json
import threading

@app.route("/process", methods=["POST"])
def process():
    request_data = request.json
    if not request_data:
        request_data = request.form

    id = request_data['id']

    if not id:
        return

    feature_set = FeatureSet(id=id)
    df = feature_set.data

    metadata = feature_set.metadata

    if request_data.get('clean', True):
        result = clean_data(df)
    else:
        result = analyze(df)

    feature_set.write_files(result)
    
    column_types = result['column_types']
    metadata['column_types'] = column_types

    feature_set.metadata = metadata

    response = app.response_class(
        response=json.dumps(feature_set.to_dict(), cls=NumpyEncoder),
        status=200,
        mimetype='application/json'
    )
    return response

@app.route("/clean")
def clean_route():
    global index_df
    
    index_df = clean_df(index_df)

    return {}

@app.route("/feature_sets")
def feature_sets():
    feature_sets = FeatureSet.objects()
    feature_sets = list(map(lambda fs: fs.to_dict(False), feature_sets))
    response = app.response_class(
        response=json.dumps(feature_sets, cls=NumpyEncoder),
        status=200,
        mimetype='application/json'
    )
    return response

@app.route("/feature_sets/<id>", methods=["GET", "PUT"])
def feature_set(id):
    feature_set = FeatureSet(id=id)
    response = app.response_class(
        response=json.dumps(feature_set.to_dict(), cls=NumpyEncoder),
        status=200,
        mimetype='application/json'
    )
    return response

# @app.route("/feature_sets/<id>/columns/<column_name>")
# def feature_set_column(id, column_name):
#     feature_set = FeatureSet(id=id)
#     return feature_set.column(column_name)

@app.route("/pipelines")
def pipelines():
    pipelines = Pipeline.objects()
    pipelines = list(map(lambda p: p.to_dict(False), pipelines))
    response = app.response_class(
        response=json.dumps(pipelines, cls=NumpyEncoder),
        status=200,
        mimetype='application/json'
    )
    return response

def clean_df(df):
    feature_set = FeatureSet(df=df)

    metadata = feature_set.metadata

    result = clean_data(df)

    feature_set.write_files(result)

    column_types = result['column_types']
    metadata['column_types'] = column_types

    feature_set.metadata = metadata
    return result['df_cleaned']

def launch(df) -> None:
    global index_df
    index_df = df
    app_kwargs = {"port": 5000, "host": "localhost", "debug": False}
    thread = threading.Thread(target=app.run, kwargs=app_kwargs, daemon=True)
    thread.start()

def clean(df, pipeline_uuid) -> None:
    global index_df
    index_df = clean_df(df)
    app_kwargs = {"port": 5000, "host": "localhost", "debug": False}
    thread = threading.Thread(target=app.run, kwargs=app_kwargs, daemon=True)
    thread.start()
