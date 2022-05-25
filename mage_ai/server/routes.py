from data_cleaner.data_cleaner import analyze, clean as clean_data
from data_cleaner.pipelines.base import BasePipeline
from flask import render_template, request
from numpyencoder import NumpyEncoder
from server.data.models import FeatureSet, Pipeline
from server import app

import json
import threading

@app.route("/")
def index():
    return render_template('index.html')


"""
request: {
    id: string (feature set id)
    clean: boolean
}

response: {
    id,
    metadata,
    sample_data,
    statistics,
    insights,
    suggestions
}
"""
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

"""
response: [
    {
        id,
        metadata,
    }
]
"""
@app.route("/feature_sets")
def feature_sets():
    feature_sets = list(map(lambda fs: fs.to_dict(False), FeatureSet.objects()))
    response = app.response_class(
        response=json.dumps(feature_sets, cls=NumpyEncoder),
        status=200,
        mimetype='application/json'
    )
    return response

"""
response: [
    {
        id,
        metadata,
    }
]
"""
@app.route("/feature_sets/<id>")
def feature_set(id):
    feature_set = FeatureSet(id=id)
    response = app.response_class(
        response=json.dumps(feature_set.to_dict(), cls=NumpyEncoder),
        status=200,
        mimetype='application/json'
    )
    return response

"""
request: {
    metadata,
    statistics,
    insights,
    suggestions,
}

response: {
    id,
    metadata,
    pipeline,
    sample_data,
    statistics,
    insights,
    suggestions,
}
"""
@app.route("/feature_sets/<id>", methods=["PUT"])
def update_feature_set(id):
    request_data = request.json
    feature_set = FeatureSet(id=id)
    feature_set.write_files(request_data)
    response = app.response_class(
        response=json.dumps(feature_set.to_dict(), cls=NumpyEncoder),
        status=200,
        mimetype='application/json'
    )
    return response

"""
response: [
    {
        id,
        pipeline_actions,
    }
]
"""
@app.route("/pipelines")
def pipelines():
    pipelines = list(map(lambda p: p.to_dict(False), Pipeline.objects()))
    response = app.response_class(
        response=json.dumps(pipelines, cls=NumpyEncoder),
        status=200,
        mimetype='application/json'
    )
    return response

"""
response: {
    id,
    actions,
}
"""
@app.route("/pipelines/<id>")
def pipeline(id):
    pipeline = Pipeline(id=id)
    response = app.response_class(
        response=json.dumps(pipeline.to_dict(), cls=NumpyEncoder),
        status=200,
        mimetype='application/json'
    )
    return response

"""
request: {
    actions,
}

response: {
    id,
    actions,
}
"""
@app.route("/pipelines/<id>", methods=["PUT"])
def update_pipeline(id):
    request_data = request.json
    pipeline = Pipeline(id=id)
    pipeline.pipeline = BasePipeline(request_data.get('actions', []))
    response = app.response_class(
        response=json.dumps(pipeline.to_dict(), cls=NumpyEncoder),
        status=200,
        mimetype='application/json'
    )
    return response

# @app.route("/feature_sets/<id>/columns/<column_name>")
# def feature_set_column(id, column_name):
#     feature_set = FeatureSet(id=id)
#     return feature_set.column(column_name)

def clean_df(df, name, pipeline_uuid=None):
    feature_set = FeatureSet(df=df, name=name)

    metadata = feature_set.metadata

    result = clean_data(df)

    feature_set.write_files(result)

    column_types = result['column_types']
    metadata['column_types'] = column_types

    feature_set.metadata = metadata
    return (feature_set, result['df_cleaned'])

def connect_df(df, name):
    feature_set = FeatureSet(df=df, name=name)

    metadata = feature_set.metadata

    result = analyze(df)

    feature_set.write_files(result)

    column_types = result['column_types']
    metadata['column_types'] = column_types
    
    feature_set.metadata = metadata
    return (feature_set, df)

def launch() -> None:
    app_kwargs = {"port": 5000, "host": "localhost", "debug": False}
    thread = threading.Thread(target=app.run, kwargs=app_kwargs, daemon=True)
    thread.start()
