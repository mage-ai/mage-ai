# MySQL

![](https://user-images.githubusercontent.com/78053898/198754276-a4524211-aafa-40b2-a95a-1d8f08ba6835.png)

<br />

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value
| --- | --- | --- |
| `database` | The name of the database you want to export data to. | `demo` |
| `host` | The host name of your database. | `mage.abc.us-west-2.rds.amazonaws.com` |
| `port` | Port of the running database (typically 3306). | `3306` |
| `username` | Name of the user that will access the database (must have permissions to read and write to specified schema). | `root` |
| `password` | Password for the user to access the database. | `abc123...` |
| `table` | Name of the table that will be created to store data from your source. | `dim_users_v1` |
| `connection_method` | The method used to connect to MySQL server, either "direct" or "ssh_tunnel". | `direct` or `ssh_tunnel` |
| `ssh_host` | (Optional) The host of the intermediate bastion server. | `123.45.67.89` |
| `ssh_port` | (Optional) The port of the intermediate bastion server. Default value: 22 | `22` |
| `ssh_username` | (Optional) The username used to connect to the bastion server. | `username` |
| `ssh_password` | (Optional) The password used to connect to the bastion server. It should be set if you authenticate with the bastion server with password. | `password` |
| `ssh_pkey` | (Optional) The path to the private key used to connect to the bastion server or the content of the key file. It should be set if you authenticate with the bastion server with private key. | `/path/to/private/key` |
| `conn_kwargs` | (Optional) Extra [connection keyword arguments](https://dev.mysql.com/doc/connector-python/en/connector-python-connectargs.html) in dictionary format. | `{"ssl_ca": "CARoot.pem", "ssl_cert": "certificate.pem", "ssl_key: "key.pem"'}` |
| `use_lowercase` | (Optional) Whether to use lower case for column names. | `true` or `false` |

### Optional Configs

| Key | Description | Sample value
| --- | --- | --- |
| `skip_schema_creation` | If `true`, Mage won't run CREATE SCHEMA command. For more information, see this [issue](https://github.com/mage-ai/mage-ai/issues/3416) | `true`
| `lower_case` | If `true`, Mage will set all columns name as lower case. Default is `true` | `true` |
<br />


<br />
