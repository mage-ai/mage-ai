# Tableau

![Tableau](https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSWG60Loiu8KeR9TgUNjopJ59A9R0-pp0fJCitooXRz4tsn-5erVYtB-CjilCrRAZSkUn4&usqp=CAU)

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Sample value
| --- | --- | --- |
| `access_token` | (REQUIRED) The access token used to authenticate your Tableau account. | `abcdefg123456` |
| `base_url` | (REQUIRED) This is the base api url for tableau, it includes the <servername> and <siteid>. | `https://<servername>/api/3.20/sites/<siteid>` |
| `request_timeout` | (OPTIONAL) The amout of time before the request times out, default: 300 | `300`|
| `user_agent` | (OPTIONAL) The User Agent string to send in the request header | `my-app-v1.0`|
| `start_date` | (OPTIONAL) Used to filter the results. When using IncrementalSync, only fetch records updated after `start_date` | `2023-01-01` |

**Note: Currently this version of the source has been tested for Tableau Cloud, so it might not work for Tableau Server**
<br />

### How to get your `access_token`

Follow Tableau's [instructions](https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api_concepts_auth.htm) to get your `access_token`.
