from server.routes import clean as clean_flask, launch as launch_flask

def connect_data(df):
    launch_flask(df)

def clean(df, pipeline_uuid=None):
    clean_flask(df, pipeline_uuid)

def init(api_key):
    # verify api_key with Mage backend
    pass
