## Resources
- https://stackoverflow.com/questions/12794302/salesforce-authentication-failing/29112224#29112224
- https://help.salesforce.com/s/articleView?id=sf.remoteaccess_oauth_web_server_flow.htm&type=5

## Authorize apps

https://mage6-dev-ed.develop.my.salesforce.com/services/oauth2/authorize?client_id=&redirect_uri=https://login.salesforce.com/services/oauth2/success&response_type=code

### Redirect URL with code

https://login.salesforce.com/services/oauth2/success?code=

## Get access token

```bash
curl -X POST https://mage.my.salesforce.com/services/oauth2/token \
   -H "Content-Type: application/x-www-form-urlencoded"  \
   -d "grant_type=authorization_code&code=&client_id=&client_secret=&redirect_uri=https://login.salesforce.com/services/oauth2/success"
```

## Sample response

```json
{
  "access_token": "",
  "refresh_token": "",
  "signature": "",
  "scope": "",
  "id_token": "",
  "instance_url": "https://mage6-dev-ed.develop.my.salesforce.com",
  "id": "https://login.salesforce.com/id/00D4w000001MV5AEAW/0054w00000AgUDiAAN",
  "token_type": "Bearer",
  "issued_at": ""
}
```
