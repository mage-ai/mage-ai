# Delta Lake (S3)

![](https://docs.delta.io/latest/_static/delta-lake-logo.png)

<br />

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value
| --- | --- | --- |
| `aws_access_key_id` | AWS access key ID. | `abc123` |
| `aws_region` | Region where the bucket is located. | `us-west-2` (default value) |
| `aws_secret_access_key` | AWS secret access key. | `xyz456` |
| `bucket` | Name of the AWS S3 bucket to save data in. | `mage_spark` |
| `mode` | `append` will add more rows to the table but will error if schema changes. `overwrite` will remove all existing rows and recreate the table. | `append` (default value) or `overwrite` |
| `object_key_path` | The path of the location you want to store your data. Don’t include the `s3`, the bucket name, or the table name in this path value.  | `users/ds/20221225` |
| `table` | Name of the table that will be created to store data from your source. | `dim_profiles_v1` |

<br />
