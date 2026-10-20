# Knowi

![Knowi](https://images.g2crowd.com/uploads/product/image/social_landscape/social_landscape_7ef98d665734f3cc8618df9149c0f5fc/knowi.jpg)

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value
| --- | --- | --- |
| `access_token` | (REQUIRED) The access token used to authenticate your Knowi account. | `abcdefg123456` |
| `request_timeout` | (OPTIONAL) The amout of time before the request times out, default: 300 | `300`|
| `user_agent` | (OPTIONAL) The User Agent string to send in the request header | `my-app-v1.0`|
| `start_date` | (OPTIONAL) Used to filter the results. When using IncrementalSync, only fetch records updated after `start_date` | `2023-01-01` |

<br />

### How to get your `access_token`

Follow Knowi's [instructions](https://www.knowi.com/docs/managementAPI.html#APIAuthentication) to get your `access_token`.
