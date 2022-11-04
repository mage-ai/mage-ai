# Run a single model

1. Under the data loader block you just added, click the button <b>`DBT model`</b>,
then click the option `Single model`.
1. In the file browser that pops up,
click the file of the DBT model you want to add to your pipeline.

![](https://github.com/mage-ai/assets/blob/main/dbt/add-dbt-model.gif?raw=true)

<br />

## Depending on upstream blocks

If your DBT model references other models,
those models will also be added to the current pipeline as upstream blocks.

Once you’ve added 1 or more DBT models to your pipeline,
you can set its dependencies on other blocks.

The DBT model won’t run until all upstream blocks have successfully been completed.

<br />

## Preview DBT model results

You can run a DBT model block and see the results of the SQL query.

Under the hood, Mage is running [`dbt compile`](https://docs.getdbt.com/reference/commands/compile)
for that single model, then executing the compiled SQL query in the data source from
your DBT project’s [connection profile](https://docs.getdbt.com/docs/get-started/connection-profiles) target.

<br />

## Pipeline execution run

When pipeline is triggered and executes,
it’ll run each DBT model block using the
[`dbt run`](https://docs.getdbt.com/reference/node-selection/syntax) command.

<br />
