# Couchbase

![Couchbase](https://www.couchbase.com/wp-content/uploads/2022/08/CB-logo-R_B_B.png)

<br />

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value |
| --- | --- | --- |
| `connection_string` | Connection string for your Couchbase database. For more information see [here](https://docs.couchbase.com/kotlin-sdk/current/howtos/connecting.html#connection-string-scheme). | `couchbase://my_instance.cloud.couchbase.com` |
| `username` | Name of the user that will access the database (must have permissions to read from specified bucket and scope) | `username` |
| `password` | Password for the user to access the database.  | `password` |
| `bucket` | Name of Couchbase bucket that contains your data | `my_bucket` |
| `scope` | Name of Couchbase scope that contains your data. Only collections within this scope will be available in Mage. | `my_scope` |
| `strategy` | (Optional) See below for more info. | `infer` |


By default, Mage will try to infer your data's schema from a sample of data from your database. If a single schema cannot be determined, then Mage will combine your data into one `_document` column. You can override this default behavior by setting the `strategy` field.
* `strategy: infer`: force Mage to determine a schema for your data. If there are multiple schema options, then Mage will choose the schema that covers the most data points.
* `strategy: combine`: force Mage to combine your data into one `_document` object column.

<br />
