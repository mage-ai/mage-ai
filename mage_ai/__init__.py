from server.routes import clean_df, connect_df, launch as launch_flask

def launch():
    launch_flask()

def connect_data(df, name):
    connect_df(df, name)

def clean(df, pipeline_uuid=None):
    _, df_clean = clean_df(df, pipeline_uuid)
    return df_clean

def init(api_key):
    # verify api_key with Mage backend
    pass
