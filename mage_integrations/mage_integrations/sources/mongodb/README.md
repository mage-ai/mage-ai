# MongoDB

![](https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/MongoDB_Logo.svg/2560px-MongoDB_Logo.svg.png)

<br />

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value
| --- | --- | --- |
| `database` | The name of the database you want to read data from. | `company` |
| `host` | The host name of your database. | [`127.0.0.1`](127.0.0.1) |
| `password` | Password for the user to access the database. | `abc123...` |
| `port` | Port of the running database (typically 27017). | `27017` |
| `user` | Name of the user that will access the database. | `admin` |
| `replica_set` | Name of replica set. | optional |
| `ssl` | If `true`, connect using SSL. | `false` (default value) |
| `authSource` | Allow connection for cluster, by overwriting default database name. | `the_database` (optional) |
| `authMechanism` | Specify default connection mechanism for MongoDB cluster |  `SCRAM-SHA-256` (default is None) |

<br />

## Run MongoDB locally

```
docker run -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  --name mongo \
  mongo:latest
```
