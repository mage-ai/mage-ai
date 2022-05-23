from server.routes import launch as l

def launch(df):
    l(df)

def clean(df):
    # clean first
    launch(df)
