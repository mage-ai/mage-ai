# MySQL

![](https://user-images.githubusercontent.com/78053898/198754276-a4524211-aafa-40b2-a95a-1d8f08ba6835.png)

<br />

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value
| --- | --- | --- |
| `database` | The name of the database you want to export data to. | `demo` |
| `host` | The host name of your database. | `mage.abc.us-west-2.rds.amazonaws.com` |
| `password` | Password for the user to access the database. | `abc123...` |
| `port` | Port of the running database (typically 3306). | `3306` |
| `table` | Name of the table that will be created to store data from your source. | `dim_users_v1` |
| `username` | Name of the user that will access the database (must have permissions to read and write to specified schema). | `root` |

<br />
