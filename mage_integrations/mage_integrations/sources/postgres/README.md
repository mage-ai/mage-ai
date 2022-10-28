# PostgreSQL

<img
  alt="PostgreSQL"
  src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Postgresql_elephant.svg/1985px-Postgresql_elephant.svg.png"
  width="200"
/>

<br />

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value
| --- | --- | --- |
| `database` | The name of the database you want to export data to. | `demo` |
| `host` | The host name of your PostgreSQL database. | [`db.bit.io`](https://bit.io/) |
| `password` | Password for the PostgreSQL user to access the database. | `abc123...` |
| `port` | Port of the running database (typically 5432). | `5432` |
| `schema` | Schema of the data you want to export to. | `public` |
| `username` | Name of the user that will access the database (must have permissions to read and write to specified schema). | `guest` |

<br />
