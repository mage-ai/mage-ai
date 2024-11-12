# Airtable

![Airtable](https://1000logos.net/wp-content/uploads/2022/05/Airtable-Logo.png)

<br />

## Config

You must supply the following parameters to use this tap:

| Key               | Description                                                                               | Sample value                               | Required |
|-------------------|-------------------------------------------------------------------------------------------|--------------------------------------------|----------|
| `token`           | An Airtable access token containing credentials to access your desired tables.            | `patabcdefghijklmnopqrstuvwxyz1234567890A` | ✅        |
| `base_id`         | The ID of the specified application inside airtable workspace                             | `app********`                              | ✅        |
| `table_name`      | The table name or id                                                                      | `tbl********`                              |          |
<br />

## Generating credentials

See [this guide](https://airtable.com/developers/web/guides/personal-access-tokens) for generating a PAT.

## Scopes

Your access token should support the following scopes:

- data.records:read
- data.recordComments:read
- schema.bases:read
- user.email:read
