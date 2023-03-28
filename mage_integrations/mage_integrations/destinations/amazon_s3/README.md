# Amazon S3

![](https://help.grow.com/hc/article_attachments/1500016247722/amazons3.svg)

<br />

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value
| --- | --- | --- |
| `aws_access_key_id` | AWS access key ID. | `abc123` |
| `aws_region` | Region where the bucket is located. | `us-west-2` (default value) |
| `aws_secret_access_key` | AWS secret access key. | `xyz456` |
| `bucket` | Name of the AWS S3 bucket to save data in. | `user_generated_content` |
| `file_type` | The type of S3 files. Supported file type values: `parquet`, `csv`. | `parquet` or `csv` |
| `object_key_path` | The path of the location where you have files. Don’t include the `s3`, the bucket name, or the table name in this path value.  | `users/ds/20221225` |
| `date_partition_format` | (Optional) The datetime format of the partition. If it's null, files will not be saved into paratitions. | `null`, `%Y%m%d`, `%Y%m%dT%H` |

<br />
