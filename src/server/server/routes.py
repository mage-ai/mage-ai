from server.db.models import FeatureSet
from server import app

import pandas as pd
import threading

@app.route("/process", methods=["POST"])
def process():
    global index_df

    # clean df
    df_cleaned = index_df

    index_df = df_cleaned
    return dict()

# @app.route("/test")
# def test():
#     data = {'col1': [1, 2], 'col2': [3, 4]}
#     df = pd.DataFrame(data)
#     feature_set = FeatureSet(id=0)
#     return feature_set.data.to_json()

@app.route("/feature_sets")
def feature_sets():
    pass

@app.route("/feature_sets/<id>")
def feature_set(id):
    feature_set = FeatureSet(id=id)
    return feature_set.to_dict()

@app.route("/feature_sets/<id>/sample_data")
def sample_data(id):
    feature_set = FeatureSet(id=id)
    return feature_set.sample_data

@app.route("/feature_sets/<id>/insights")
def insights(id):
    feature_set = FeatureSet(id=id)
    return feature_set.insights

@app.route("/feature_sets/<id>/transformer_actions")
def transformer_actions(id):
    feature_set = FeatureSet(id=id)
    return feature_set.transformer_actions

@app.route("/feature_sets/<id>/suggestions")
def suggestions(id):
    pass

def launch(df) -> None:
    global index_df
    index_df = df
    app_kwargs = {"port": 5000, "host": "localhost", "debug": False}
    thread = threading.Thread(target=app.run, kwargs=app_kwargs, daemon=True)
    thread.start()
