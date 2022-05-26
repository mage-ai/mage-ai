from server.app import clean_df, connect_df, launch as launch_flask

MAX_NUM_OF_ROWS = 100_000


def launch():
    launch_flask()


def connect_data(df, name):
    if df.shape[0] > MAX_NUM_OF_ROWS:
        connect_df(df.sample(MAX_NUM_OF_ROWS), name)
    else:
        connect_df(df, name)


def clean(df, pipeline_uuid=None):
    _, df_clean = clean_df(df, pipeline_uuid)
    return df_clean


def init(api_key):
    # verify api_key with Mage backend
    pass
