# Local MongoDB Setup

### Install MongoDB Community Edition
Follow MongoDB Manual directions to install MongoDB Community Edition on ubuntu [[3.2](https://docs.mongodb.com/v3.2/tutorial/install-mongodb-on-ubuntu/), [3.4](https://docs.mongodb.com/v3.4/tutorial/install-mongodb-on-ubuntu/), [3.6](https://docs.mongodb.com/v3.6/tutorial/install-mongodb-on-ubuntu/), [4.0](https://docs.mongodb.com/manual/tutorial/install-mongodb-on-ubuntu/)]

### Add users, roles, authentication
Follow steps 1-5 of these [instructions](https://docs.mongodb.com/manual/tutorial/enable-authentication/) to add user administrator

After step 5, run the following commands to create:
- a user `stitch_root` that can enable oplog

```
use admin
db.createUser(
  {
    user: "stitch_root",
    pwd: "<password>",
    roles: [{role: "root", db: "admin"}]
  }
)
```

- a user `stitch_dev` that can create/read/write new dbs and access oplog

```
use test
db.createUser(
  {
    user: "stitch_dev",
    pwd: "<password>",
    roles: [ { role: "readWriteAnyDatabase", db: "admin" }, {role: "read", db: "local"} ]
  }
)
```

### Enable Oplog
1. Edit `/etc/mongod.conf` and add a replciation set:

Assume superuser:
```
sudo su
```

Uncomment replication and add `replicationSetName` (indented) in `/etc/mongod.conf`:
```
replication:
  replSetName: rs0
```

Return to normal user with `C-d`

2. Restart mongod and pass it --config flag:
```
sudo mongod --auth --config /etc/mongod.conf
```

3. Initiate replica set

Connect to shell as `stitch_root` user:

```
mongo --port 27017 -u stitch_root -p <password> --authenticationDatabase admin
```

and initiate replica set:
```
rs.initiate({_id: "rs0", members: [{_id: 0, host: "127.0.0.1:27017"}]})
```

4. Check out that oplog

Disconnect from shell and reconnect as `stitch_dev` user;

```
mongo --port 27017 -u stitch_dev -p <password> --authenticationDatabase test
```

switch to local
```
use local
```

view oplog rows
```
db.oplog.rs.find()
```

### Connect with shell
Can now connect to Mongo via the mongo shell with:
```
mongo --host localhost --port 27017 --authenticationDatabase <db_name> --username <username> --password <password>
```
