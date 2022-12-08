# MongoDB

<img src="https://thumbs.bfldr.com/at/85s8xk2j3k89b67xr8c7vwmv?expiry=1671070205&fit=bounds&height=800&sig=NDQ4NDZjYjYwOWU0MGQ1ZDYwNTEyMzM0MjA2NTUxZjhhNmExZGNhOQ%3D%3D&width=1100" width="400" />

<br />

## Add credentials

1. Create a new pipeline or open an existing pipeline.
1. Expand the left side of your screen to view the file browser.
1. Scroll down and click on a file named `io_config.yaml`.
1. Enter the following keys and values under the key named `default` (you can have multiple
profiles, add it under whichever is relevant to you)
```yaml
version: 0.1.1
default:
  MONGODB_DBNAME: ...
  MONGODB_COLNAME: ...
  MONGODB_USER: ...
  MONGODB_PASSWORD: ...
  MONGODB_HOST: ...
  MONGODB_PORT: ...
```

<br />

## Using SQL block

Available in two block type `Data loader` and `Data exporter`

#### 🟦Data Loader

1. Create a new pipeline or open an existing pipeline.
1. Add a data loader block.
1. Select `SQL`.
1. Under the `Data provider` dropdown, select `Mongodb`.
1. Under the `Profile` dropdown, select `default` (or the profile you added credentials underneath).
1. Enter custom select SQL. 

Example for custom select SQL:

![](https://user-images.githubusercontent.com/36539633/205658763-d888728a-0cd2-4339-8065-85cffdb20d52.PNG)

If **not enter**, block auto get SQL: "SELECT * FROM `collection_name`" 

`collection_name` is `MONGODB_COLNAME` in file `io_config.yaml`

This example run `collection_name` is `order2` :

![](https://user-images.githubusercontent.com/36539633/205658646-382e7fb0-7763-4f67-97c2-cee65f246e06.PNG)

7. Run the block.

<br />

#### 🟨Data Exporter

1. Create a new pipeline or open an existing pipeline.
1. Add a data exporter block.
1. Select `SQL`.
1. Under the `Data provider` dropdown, select `Mongodb`.
1. Under the `Profile` dropdown, select `default` (or the profile you added credentials underneath).
1. Under the `Write policy` dropdown, select `Replace` or `Append`
(please see [SQL blocks guide](../guides/blocks/SQL.md#configure-sql-block) for 
1. Enter this query: `SELECT * FROM {{ df_1 }}`

`{{ df_1 }}` is `df` (dataframe) return from "previous execute block"

![](https://user-images.githubusercontent.com/36539633/205658998-c3f38af5-a7e8-4c50-88fc-d9da34af9e3f.PNG)

8. Run the block.

<br />
