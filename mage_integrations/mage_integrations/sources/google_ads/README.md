# Google Ads

![Google](https://hellomidia.com.br/wp-content/uploads/2018/06/google-ads.png)

<br />

## INCREMENTAL Sync
This tap handles state internally, which means INCREMENTAL sync selection <b>is not supported</b>
<br />

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value | Required |
| --- | --- | --- | --- |
| `login_customer_ids` | A list containing both `costumerId` and `loginCustomerId` from google ads  | `"login_customer_ids": [{"customerId": "1234567890", "loginCustomerId": "0987654321"}]` | ✅ |
| `oauth_client_id` | OAuth client id from google cloud | `XXXXXXXXXXXX-YYYYYYYYYYYYYYYYYYYYYY.apps.googleusercontent.com.` | ✅ |
| `oauth_client_secret` | OAuth client secret from google cloud | `abc...` | ✅ |
| `refresh_token`| Google API refresh token from google oauth playgoround | `abc...` | ✅ |
| `developer_token` | Google Ads developer token | `abc...` | ✅ |
| `start_date` | Fetch data that is newer than the `start_date`. | `2022-01-01T00:00:00Z` | ✅ |

<br />

## Generating credentials

There is an amazing [article](https://articles.wesionary.team/how-to-implement-google-ads-api-ff69f628d4ac) by 'Sudeep Timalsina' that shows how to generate credentials for this source