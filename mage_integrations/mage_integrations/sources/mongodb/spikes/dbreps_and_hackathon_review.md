# Review of dbreps and Chris C's hackathon project

## dbreps
[sync_table](https://github.com/stitchdata/db-replicators/blob/3764f905a76952324c9f9b8ff8e1545fe9cd8113/src/com/rjmetrics/dbreplicator/worker/methods/sync_table/mongodb.clj)
file and
[sync_structure](https://github.com/stitchdata/db-replicators/blob/3764f905a76952324c9f9b8ff8e1545fe9cd8113/src/com/rjmetrics/dbreplicator/worker/methods/sync_structure/mongodb.clj)
file for mongo

### notes
- retrieves fields to decide which fields are "bookmarkable" [get-index code](https://github.com/stitchdata/db-replicators/blob/3764f905a76952324c9f9b8ff8e1545fe9cd8113/src/com/rjmetrics/dbreplicator/worker/methods/sync_structure/mongodb.clj#L29)[bookmarkable code](https://github.com/stitchdata/db-replicators/blob/3764f905a76952324c9f9b8ff8e1545fe9cd8113/src/com/rjmetrics/dbreplicator/worker/methods/sync_structure/mongodb.clj#L39-L50)
- retrieves row count for each collection [code](https://github.com/stitchdata/db-replicators/blob/3764f905a76952324c9f9b8ff8e1545fe9cd8113/src/com/rjmetrics/dbreplicator/worker/methods/sync_structure/mongodb.clj#L70)
- when opening cursor
  - specifies `QUERYOPTION_SLAVEOK` [code](https://github.com/stitchdata/db-replicators/blob/3764f905a76952324c9f9b8ff8e1545fe9cd8113/src/com/rjmetrics/dbreplicator/worker/methods/sync_table/mongodb.clj#L47)
    - when turned on, read queries will be directed to slave servers instead of the primary server
  - specifies `batch_size` [code](https://github.com/stitchdata/db-replicators/blob/3764f905a76952324c9f9b8ff8e1545fe9cd8113/src/com/rjmetrics/dbreplicator/worker/methods/sync_table/mongodb.clj#L68)
    - Uses the max of (2, 16 MB), and calls getDynamicFetchSize, so will ultimately set fetch size to 8 MB
    - pymongo uses a default of 1 MB, may want to look into changing this for efficiency
- uses projections [code](https://github.com/stitchdata/db-replicators/blob/3764f905a76952324c9f9b8ff8e1545fe9cd8113/src/com/rjmetrics/dbreplicator/worker/methods/sync_table/mongodb.clj#L64-L71)

## Hackathon
- Supports op-log and full-table rep
- Client accepts authsource (db name) which defaults to 'admin'
  - we did not do this in our spike, should do it in tap
- Discovery
  - ignores 
    - dbs = ['admin', 'system', 'local']
    - collections = ['system.indexes']
  - does not discover fields, only writes `database-name` and `row-count` metadata
    - 'schema': {
        'type': 'object'
      }
- Sync
  - Prioritizes streams in by:
    - Currently Syncing
    - Streams without state
    - streams with state
  - Non-oplog streams
    - Uses `custom-select-clause` metadata for a stream to get the select statement
      - streams that don't have this are skipped
    - whitelisting is done post select, we should use projections instead of this
  - oplog streams
    - works similar to other db taps
    - whitelisting again performed post select
- Generally seems like a good starting point for our tap


