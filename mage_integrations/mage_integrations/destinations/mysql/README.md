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
| `ssh_pkey` | (Optional) The path to the private key used to connect to the bastion server. It should be set if you authenticate with the bastion server with private key. | `/path/to/private/key` |
<br />
