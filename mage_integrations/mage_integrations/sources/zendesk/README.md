# Zendesk

![Zendesk](https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Zendesk_logo.svg/2560px-Zendesk_logo.svg.png)

<br />

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value
| --- | --- | --- |
| `access_token` | OAuth token to access API endpoints. | `abc123...` |
| `request_timeout` | Number of milliseconds until the API request should timeout and raise an error. | 300 |
| `start_date` | Fetch data that is newer than the `start_date`. | `2022-01-01T00:00:00Z` |
| `subdomain` | If you access Zendesk from a URL like this https://magesupport.zendesk.com/, then the `domain` is `magesupport`. | `magesupport` |

<br />

## How to get your `access_token`

Follow [Zendesk’s documentation](https://support.zendesk.com/hc/en-us/articles/4408845965210)
to get your access token.

Example Admin Center URL: https://magesupport.zendesk.com/admin/home
(subdomain in example is `magesupport`).

### Example values for getting access token

<b>Zendesk authorization page</b>

https://magesupport.zendesk.com/oauth/authorizations/new?client_id=mage-ai&response_type=code&redirect_uri=https://www.mage.ai&scope=read

<b>Authorize redirect URL with code</b>

https://www.mage.ai/?code=6b21972c79e12cbda37947df4ba22d4cb394da752e955c6dac81361d5f453695

<b>Example cURL command to exchange code for access token</b>

```curl
curl --request POST \
  --url https://magesupport.zendesk.com/oauth/tokens \
  --header 'Content-Type: application/json' \
  --data '{
  "grant_type": "authorization_code",
  "code": "6b21972c79e12cbda37947df4ba22d4cb394da752e955c6dac81361d5f453695",
  "client_id": "mage-ai",
  "client_secret": "your_oauth_client_secret",
  "redirect_uri": "https://www.mage.ai",
  "scope": "read"
}'
```

<b>Example OAuth token exchange response</b>

```json
{
  "access_token": "cdaae5613efca304972cd8175adf51b560691f51e9a6331a986a772801a5d898",
  "token_type": "bearer",
  "scope": "read"
}
```

<br />
