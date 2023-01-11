import pymongo # requires dnspython package as well
import sys

#------------------------ Setup Client ------------------------

#----- Atlas using connection string -----
#username = sys.argv[1]
#password = sys.argv[2]
#host = 'stitch-upwjw.mongodb.net'
# connection_string = "mongodb+srv://{}:{}@{}/test".format(username, password, host)
# client = pymongo.MongoClient(connection_string)

#----- Atlas using connection props -----
# username = sys.argv[1]
# password = sys.argv[2]
# host=['stitch-shard-00-00-upwjw.mongodb.net',
#       'stitch-shard-00-01-upwjw.mongodb.net',
#       'stitch-shard-00-02-upwjw.mongodb.net']
# ssl = True # client must have ssl=True to connect to atlas cluster
# client = pymongo.MongoClient(host=host, username=username, password=password, port=27017, ssl=True)

#------ Local mongo server ------
username = sys.argv[1]
password = sys.argv[2]
host= '127.0.0.1'
auth_source = 'test'
ssl = False
client = pymongo.MongoClient(host=host, username=username, password=password, port=27017, authSource=auth_source, ssl=ssl)

# Get connection Info
print("\nConnecting to MongoDB version " + client.server_info()['version'])

# List dbs
print("\nShowing Initial Databases...")
print(client.list_database_names())


# Make db and collection
# Note: MongoDB waits until you have created a collection (table), with at least one document (record) before it actually creates the database (and collection).
print("\nAdding database=spike_db and collection=sources_team_members...")
spike_db = client["spike_db"]
sources_team_members_coll = spike_db["sources_team_members"]

# Add one document to collection
print ("\nAdding nick to collection=sources_team_members...")
sources_team_members_coll.insert_one({"name": "Nick", "membersince": 2018})

# Add multiple documents to collection
print("\nAdding everyone else to collection=sources_team_members...")
sources_team_members_coll.insert_many([{"name": "Jacob", "membersince": 2019, "my_object": {"nested_field": "some_value"}},
                                       {"name": "Collin", "membersince": 2019},
                                       {"name": "Dan", "membersince": 2017},
                                       {"name": "Kyle", "membersince": 2016},
                                       {"name": "Andy", "membersince": 2018},
                                       {"name": "Brian", "membersince": 2014},
                                       {"name": "Harrison", "membersince": 2018}])


print("\nShowing Databases...")
print(client.list_database_names())

print("\nShowing collections in db=spike_db...")
print(spike_db.list_collection_names())

print("\nShowing all documents in sources_team_members_coll...")
for doc in sources_team_members_coll.find():
    print(doc)

print("\nShowing documents where membersince > 2016...")
for doc in sources_team_members_coll.find({"membersince": {"$gt": 2016}}):
    print(doc)

print("\nShow only name and id...")
for doc in sources_team_members_coll.find({}, {"name": 1}):
    print(doc)

print("\nShow only name...")
for doc in sources_team_members_coll.find({}, {"name": 1, "_id": 0}):
    print(doc)

print("\nUpdating Nick's membersince from 2017->2018...")
update_result = sources_team_members_coll.update_one({"name": "Nick"}, {"$set": {"membersince": 2017}})
for doc in sources_team_members_coll.find():
    print(doc)

print("\nUpdating to add team field to all documents...")
update_result = sources_team_members_coll.update_many({}, {"$set": {"team": "sources"}})
for doc in sources_team_members_coll.find():
    print(doc)

print("\nRemoving Harrison because he is NOT part of the team...")
delete_result = sources_team_members_coll.delete_many({"name": "Harrison"})
for doc in sources_team_members_coll.find():
    print(doc)

oplog = client.local.oplog.rs
first = oplog.find().sort('$natural', pymongo.ASCENDING).limit(-1).next()
ts = first['ts']

should_print_oplog = True
if should_print_oplog:
    print('\nPrinting oplog rows...')

    with client.local.oplog.rs.find({'ts': {'$gt': ts}},
                                    oplog_replay=True) as cursor:
        for row in cursor:
            if row['op'] in ['i', 'u', 'd']:
                print({k: row[k] if row.get(k) else '' for k in ['o', 'o2', 'ns', 'op']})


print("\nDeleting the collection and database...")
sources_team_members_coll.drop()

print("\nShowing Databases...")
print(client.list_database_names())
