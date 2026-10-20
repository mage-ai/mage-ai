# SFTP



## Config

| Key | Description | Sample Value |
| --- | --- | --- |
| `host` | Hostname or IP of the SFTP server | `ABC1...` |
| `port` | Port number for the SFTP server | 
| `username` | Username for the SFTP server | `ABC1...` |
| `password` | Authentication to the SFTP Server (optional) |  `ABC1...` |
| `tables` | An array of tables to load. See table configuration below |
| `start_date` | Earliest file date to synchronize | `2021-01-28` |  
| `decryption_config` | Decryption configs for the SFTP files. See table configuration below (optional) |
| `private_key_file` | Authentication to the SFTP Server (optional) | `/bin/home/securefolder` |


### Tables config

The following `tables` values are <b>required</b>:

| Key | Description | Sample Value |
| --- | --- | --- |
| `table_name` | The name that should be given to the table (stream) | `ABC1...` |
| `search_prefix` | Folder where the files are located | `/Export/SubFolder` |
| `search_pattern` | Regex pattern to match the file names | `MyExportData.*\\.zip.gpg$` |
| `delimiter` | A one-character string delimiter used to separate fields. Default, is ',' |


The following `tables` values are <b>optional</b>:

| Key | Description | Sample Value |
| --- | --- | --- |
| `key_properties` | Array containing the unique keys of the table. Defaults to ['_sdc_source_file', '_sdc_source_lineno'], representing the file name and line number. Specify an emtpy array ([]) to load all new files without a replication key  |
| `encoding` | File encoding, defaults to utf-8|
| `sanitize_header` | Boolean, specifies whether to clean up header names so that they are more likely to be accepted by a target SQL database. Default is `False`. | `True` or `False`|
| `skip_rows` | Integer, specifies the number of rows to skip at the top of the file to handle non-data content like comments or other text. Default 0. | 0 |


### Decryption config

| Key | Description | Sample Value |
| --- | --- | --- |
| `SSM_key_name` | SSM Parameter key name | `SSM_PARAMETER_KEY_NAME` |
| `gnupghome` | .gnupg path | `/home/.gnupg` |
| `passphrase` |  Your gpg Passphrase | `ABC1...` |
