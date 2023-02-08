# Couchbase

![Couchbase](https://www.couchbase.com/wp-content/uploads/2022/08/CB-logo-R_B_B.png)

<br />

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value |
| --- | --- | --- |
| `host` | Host name of your Couchbase database. | `--your-instance--.cloud.couchbase.com` |
| `username` | Name of the user that will access the database (must have permissions to read from specified bucket and scope) | `username` |
| `password` | Password for the user to access the database.  | `password` |
| `bucket` | Name of Couchbase bucket that contains your data | `my_bucket` |
| `scope` | Name of Couchbase scope that contains your data. Only collections within this scope will be available in Mage. | `my_scope` |

<br />
