# Mode

![Mode](https://ta-relay-public-files-prod.s3.us-east-2.amazonaws.com/icp/product_images/163aa82596261bf2ce6b6d88e9b68a4f.png)

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value
| --- | --- | --- |
| `access_token` | The access token used to authenticate your Mode account. | `abcdefg123456` |
| `password` | Your Mode Token password | `supersecurepassword` |
| `workspace` | The workspace ID | `ws-12345` |
| `user_agent` | The User Agent string to send in the request header | `my-app-v1.0`|
| `start_date` | Used to filter the results. When using IncrementalSync, only fetch records updated after `start_date` | `2023-01-01` |

<br />

### How to get your `access_token` and `password`

Follow Mode's [instructions](https://mode.com/developer/api-reference/authentication/) to get your `access_token` and `password`.
