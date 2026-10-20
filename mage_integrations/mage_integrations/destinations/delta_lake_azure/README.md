# Delta Lake (Azure)

![](https://docs.delta.io/latest/_static/delta-lake-logo.png)

<br />

## Config

You must enter the following credentials when configuring this destination:

| Key | Description | Sample value
| --- | --- | --- |
| `account_name` | Your Azure Storage account name | `ABC...` |
| `access_key` | Your Azure Storage access key | `ABC...` |
| `table_uri` | Your table URI (to see available formats, consult the [delta-rs](https://delta-io.github.io/delta-rs/python/usage.html) docs) | `abfs://<container>/<path>`
| `mode` | `append` will add more rows to the table but will error if schema changes. `overwrite` will remove all existing rows and recreate the table. | `append` (default value) or `overwrite` |

<br />
