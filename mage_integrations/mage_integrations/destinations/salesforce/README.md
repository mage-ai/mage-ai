# Salesforce

![](https://user-images.githubusercontent.com/78053898/198753571-7c033641-75a2-4338-b257-ee37a159915e.png)

<br />

## Config

You must enter the following credentials when configuring this destination:

| Key | Description | Required or optional
| --- | --- | --- |
client_id | OAuth client_id | optional|
client_secret | OAuth client_secret | optional|
refresh_token | OAuth refresh_token | optional|
username | User/password username |  optional|
password  |  User/password password| optional|
security_token | User/password generated security token. Reset under your Account Settings| optional|
domain | Your Salesforce instance domain. Use 'login' (default) or 'test' (sandbox), or Salesforce My domain.| Required|
action | How to handle incomming records by default (insert/update/upsert/delete/hard_delete). Default is "insert"| Required|
external_id_name | External Id name if required to `upsert` records. Default is "Id"| optional|
allow_failures | Allows the target to continue persisting if a record fails to commit. Default is "False"| optional| 
table_name | Allows the target to use a different source to this destination. (Read "limitations" section)| optional|

To obtain OAuth credentials, follow this [guide](https://github.com/mage-ai/mage-ai/blob/master/mage_integrations/mage_integrations/sources/salesforce/README.md#how-to-get-your-client_id-client_secret-and-refresh_token)

<br />

## Limitations

To effectively use a different source to this destination, you must specify the "table_name" parameter on the Configuration section. The table_name <b>must</b> consist of a Salesforce section name (E.G Accounts).

## Allow Failures

If `allow_failures` is set to True, only records that were <b> eligible </b> to be written but were not will be skipped.
Being eligible means that the record correspond to a given Salesforce object schema and is being executed with a valid action.

Else, if the given Salesforce Bulk result does not correspond to "success" AND `allow_failures` is False, a raise will be called. 