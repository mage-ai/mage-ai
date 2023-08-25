# Amazon S3

![aws_s3_logo](https://github.com/mage-ai/mage-ai/assets/78053898/a44c1c95-5aff-4fa4-8653-8939ccf12d09)

<br />

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value
| --- | --- | --- |
| `aws_access_key_id` | AWS access key ID. | `abc123` |
| `aws_region` | Region where the bucket is located. | `us-west-2` (default value) |
| `aws_secret_access_key` | AWS secret access key. | `xyz456` |
| `role_arn` | (Optional) The ARN of the IAM role that can be assumed to get access to S3 bucket. | `arn:aws:iam::111111:role/example-role` |
| `bucket` | Name of the AWS S3 bucket to save data in. | `user_generated_content` |
| `file_type` | The type of S3 files. Supported file type values: `parquet`, `csv`, `infer`. If the file type is `infer`, we infer the file type from the file extension. | `infer` |
| `prefix` | The path of the location where you have files. Don’t include the `s3`, the bucket name, or the table name in this path value.  | `users/ds/20221225` |
| `search_pattern` | Search files with the regular expression syntax. | `test_table\\/.*\\.csv` |
| `single_stream_in_prefix` | If `true`, then this source will treat all files in the prefix as part of the same stream. | `false` (default value) |
| `table_configs` | A list of table configs to configure multiple streams. Each table config must have three keys: `prefix`, `search_pattern` and `table_name`| `[{"prefix": "users/", "search_pattern": "test_table\\/.*\\.csv", "table_name": "test_table"}]` |
| `aws_endpoint` | (Optional) Allow for MinIO support | `https://play.min.io` |

<br />
