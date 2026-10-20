# tap-mongodb suppored versions & flavors spike

## Connecting to mongodb (shell and via pymongo)
### Mongo Shell
Newer versions of the mongo shell should be backwards compatible for the
commands we'll be running. Any new features (mostly helper stuff)
introduced to the mongo shell won't work with previous versions of
mongodb.

### PyMongo

Mongo officially supports versions 3.4, 3.6, 4.0. They are ending support for 3.4 in Jan 2020

According to the
[Pymongo docs on compatability](https://docs.mongodb.com/ecosystem/drivers/pymongo/#compatibility),
pymongo version 3.7/3.8 supports
- 4.0
- 3.6
- 3.4
- 3.2
- 3.0
- 2.6

**We believe this means that any major differences in the client mongo version should be handled by pymongo**

## Replica sets and sharded clusters
- A replica set is a cluster of MongoDB servers that implements
  replication and automated failover. MongoDB’s recommended replication
  strategy
- With sharding, each shard contains a subset of sharded data for a
  sharded cluster. Together, the cluster’s shards hold the entire data set
  for the cluster.
  - Users, clients, or applications should only directly connect to a
    shard to perform local administrative and maintenance operations.
- As of MongoDB 3.6, shards must be deployed as a replica set to provide
  redundancy and high availability.
- [Docs on shards](https://docs.mongodb.com/manual/core/sharded-cluster-shards/)
- [Docs on replication](https://docs.mongodb.com/manual/replication/)
- Basically, we should connect to the cluster, never to an individual
  shard/replica

## Mongo-as-a-service mLab?
 - mLab is "not accepting new customers" and migrating existing ones to
   Atlas (what we test with)
 - It looks like there was no difference though in the way you connected
   to it via shell/driver

## Test Instance versions

For Atlas, the free version (and M2/M5 shared clusters) default to the
latest version. You can choose the version for the M10 (paid) clusters, so
we'll have the ability to spin up test clusters for different versions if
we choose (and pay).

We recommend testing on the latest version since we believe pymongo will
handle version differences within the tap. If we uncover major bugs due to
version differences, we can consider spinning up multiple clusters on
different versions to test with.
