import os
import pymongo


def ensure_environment_variables_set():
    missing_envs = [x for x in ['TAP_MONGODB_HOST',
                                'TAP_MONGODB_USER',
                                'TAP_MONGODB_PASSWORD',
                                'TAP_MONGODB_PORT',
                                'TAP_MONGODB_DBNAME'] if os.getenv(x) is None]
    if len(missing_envs) != 0:
        raise Exception(f"set environment variables: {missing_envs}")

##########################################################################
### Database Interactions
##########################################################################

def get_test_connection():
    username = os.getenv('TAP_MONGODB_USER')
    password = os.getenv('TAP_MONGODB_PASSWORD')
    host= os.getenv('TAP_MONGODB_HOST')
    auth_source = os.getenv('TAP_MONGODB_DBNAME')
    port = os.getenv('TAP_MONGODB_PORT')
    ssl = False
    conn = pymongo.MongoClient(host=host, username=username, password=password, port=27017, authSource=auth_source, ssl=ssl)
    return conn

def drop_all_collections(client):
    ############# Drop all dbs/collections #############
    for db_name in client.list_database_names():
        if db_name in ['config', 'local', 'system']:
            continue
        for collection_name in client[db_name].list_collection_names():
            if collection_name in ['system.views', 'system.version', 'system.keys', 'system.users']:
                continue
            print("Dropping database: " + db_name + ", collection: " + collection_name)
            client[db_name][collection_name].drop()
