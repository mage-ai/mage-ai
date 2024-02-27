# MySQL

![](https://user-images.githubusercontent.com/78053898/198753513-4a149790-853a-4dcd-8c93-388f84ef6aeb.png)

<br />

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value
| --- | --- | --- |
| `database` | The name of the database you want to read data from. | `demo` |
| `host` | The host name of your database. | `mage.abc.us-west-2.rds.amazonaws.com` |
| `port` | Port of the running database (typically 3306). | `3306` |
| `username` | Name of the user that will access the database (must have permissions to read and write to specified schema). | `root` |
| `password` | Password for the user to access the database. | `abc123...` |
| `connection_method` | The method used to connect to MySQL server, either "direct" or "ssh_tunnel". | `direct` or `ssh_tunnel` |
| `conn_kwargs` | (Optional) Extra [connection keyword arguments](https://dev.mysql.com/doc/connector-python/en/connector-python-connectargs.html) in dictionary format. | `{"ssl_ca": "CARoot.pem", "ssl_cert": "certificate.pem", "ssl_key: "key.pem"'}` |
| `ssh_host` | (Optional) The host of the intermediate bastion server. | `123.45.67.89` |
| `ssh_port` | (Optional) The port of the intermediate bastion server. Default value: 22 | `22` |
| `ssh_username` | (Optional) The username used to connect to the bastion server. | `username` |
| `ssh_password` | (Optional) The password used to connect to the bastion server. It should be set if you authenticate with the bastion server with password. | `password` |
| `ssh_pkey` | (Optional) The path to the private key used to connect to the bastion server. It should be set if you authenticate with the bastion server with private key. | `/path/to/private/key` |

### Optional Configs

| Key | Description | Sample value
| --- | --- | --- |
| `batch_fetch_limit` | The number of rows to fetch in each batch (default to 50k). You can specify a larger batch size if your instance has higher memory. | `50000`

<br />
