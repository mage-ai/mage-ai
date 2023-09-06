# PowerBI

![PowerBI](https://icon-library.com/images/power-bi-icon/power-bi-icon-21.jpg)

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value
| --- | --- | --- |
| `access_token` | (REQUIRED) The access token used to authenticate your PowerBI account. | `abcdefg123456` |
| `request_timeout` | (OPTIONAL) The amout of time before the request times out, default: 300 | `300`|
| `user_agent` | (OPTIONAL) The User Agent string to send in the request header | `my-app-v1.0`|
| `start_date` | (OPTIONAL) Used to filter the results. When using IncrementalSync, only fetch records updated after `start_date` | `2023-01-01` |

<br />

### How to get your `access_token`

Follow PowerBI's [instructions](https://community.fabric.microsoft.com/t5/Developer/REST-API-Get-Access-Token/m-p/1895937/) to get your `access_token`.
