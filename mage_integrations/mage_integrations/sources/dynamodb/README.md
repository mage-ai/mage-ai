# Amazon DynamoDB

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value
| --- | --- | --- |
| `aws_access_key_id` | AWS access key ID. | `abc123` |
| `aws_region` | Region where the bucket is located. | `us-west-2` (default value) |
| `aws_secret_access_key` | AWS secret access key. | `xyz456` |
| `table_configs` | An array of table config object. In each object, it must provide table_name field to read   and load data | `[{"table_name": "table_name_1"},{"table_name":"table_name_2"}]` |

<br />
