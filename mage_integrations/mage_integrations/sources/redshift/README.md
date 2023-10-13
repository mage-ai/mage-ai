# Redshift

![Amazon-Redshift-Logo svg](https://user-images.githubusercontent.com/78053898/198753538-2d606c3a-f6b0-472a-b0b3-c16086f256fc.png)

<br />

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value
| --- | --- | --- |
| `database` | The name of the database you want to load data from. | `demo` |
| `host` | The host name of your database. | `mage-prod.3.us-west-2.redshift.amazonaws.com` |
| `password` | Password for the user to access the database. | `abc123...` |
| `port` | Port of the running database (typically 5439). | `5439` |
| `region` | Region of your database. | `us-west-2` |
| `schema` | Schema of the data you want to load data from. | `public` |
| `user` | Name of the user that will access the database (must have permissions to read and write to specified schema). | `awsuser` |

Alternatively, instead of using `password` and `user`, you can use the following credentials to authenticate:

| Key | Description | Sample value
| --- | --- | --- |
| `access_key_id` | The access key for the IAM role or IAM user configured for IAM database authentication. | `abc123...` |
| `cluster_identifier` | The cluster identifier of the Amazon Redshift Cluster. | `mage-prod` |
| `db_user` | The user ID to use with Amazon Redshift. | `admin` |
| `secret_access_key` | The secret access key for the IAM role or IAM user configured for IAM database authentication. | `xyz123` |

### Optional Configs

| Key | Description | Sample value
| --- | --- | --- |
| `batch_fetch_limit` | The number of rows to fetch in each batch (default to 50k). You can specify a larger batch size if your instance has higher memory. | `50000`

<br />
