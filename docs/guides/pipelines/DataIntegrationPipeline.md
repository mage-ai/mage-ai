# How to build a data integration pipeline

Here are the high level steps to build a data integration pipeline:

1. [Add new data integration pipeline](#add-new-data-integration-pipeline)
1. [Configure source](#configure-source)
    1. [Configure schema](#configure-schema)
1. [Configure destination](#configure-destination)
1. [Run pipeline and start sync](#run-pipeline-and-start-sync)
    1. [Monitoring pipeline](#monitoring-pipeline)

<br />

## Add new data integration pipeline

1. Open Mage in your browser and click the <b>`[+ New pipeline]`</b> button.
1. Click the dropdown menu option <b>Data integration</b>.

<br />

## Configure source

1. Click the dropdown menu under <b>Select source</b> and choose the option you want to
load data from (e.g. Amplitude).
1. Depending on the chosen source, you’ll need to enter credentials and options into the section
labeled <b>Configuration</b>. For example, if you chose Amplitude, you’ll need to enter credentials
like this:
    ```yaml
    api_key: abc456
    secret_key: "{{ env_var('SECRET_KEY') }}"
    ```
    <b>Best practices</b>:
    you can interpolate values in the configuration using the following syntax:
    1. `"{{ env_var('SECRET_KEY') }}"`: this will extract the value from the `SECRET_KEY` key
    in your environment variables.
    1. `"{{ variables('SECRET_KEY') }}"`: this will extract the value from the `SECRET_KEY` key
    in your [runtime variables](../../production/runtime_variables.md).
1. After you enter in all the credentials, click the button <b>`[Fetch list of streams]`</b>
under the section labeled <b>Select stream</b>.
1. Shortly after clicking the above button,
click the new dropdown menu under the section labeled <b>Select stream</b>.
Then, choose the stream (aka table) you want to load data from.

### Configure schema

After selecting a stream (aka table), you’ll need to configure the schema.

Configuring the schema informs your pipeline on which fields to synchronize,
how to determine if a record is unique,
and what to do if their are conflicts (aka duplicate records).

Here are the steps you can optionally go through:

1. Selected field(s):
    1. Check the box next to the field name to include the field in your synchronization.
    1. Uncheck the ones you don’t want to sync.
1. Field type(s)
    1. Each field will have a default field type.
    1. Add additional field types or remove them if they don’t fit your needs.
1. Unique field(s)
    1. On the right of the field names, there is a box you can check that will determine which
    field(s) need to have unique values.
    1. If the box is un-checkable, that means you cannot use that field as a unique field.
1. Bookmark field(s)
    1. Under the column labeled <b>Bookmark</b>, check the box to use the field as a way to keep
    track of progress during synchronization.
    1. Upon every synchronization, these columns are used to pick up from where the previous synchronization
    left off. In addition, if a synchronization fails midway, these bookmark columns are used to
    track the record that was most recently successful.
1. Replication method
    1. `FULL_TABLE`: synchronize the entire set of records from the source.
    1. `INCREMENTAL`: synchronize the records starting after the most recent bookmarked record
    from the previous synchronization run.
1. Unique conflict method: choose how to handle duplicate records
    1. `IGNORE`: skip the new record if it’s a duplicate of an existing record.
    1. `UPDATE`: update the existing record with the new record’s properties.

<br />


## Configure destination

1. Click the dropdown menu under <b>Select destination</b> and choose the option you want to
export data to (e.g. Snowflake).
1. Depending on the chosen source, you’ll need to enter credentials and options into the section
labeled <b>Configuration</b>. For example, if you chose Snowflake, you’ll need to enter credentials
like this:
    ```yaml
    account: ...
    database: ...
    password: "{{ env_var('PASSWORD') }}"
    schema: ...
    table: ...
    username: ...
    warehouse: ...
    ```
    <b>Best practices</b>:
    you can interpolate values in the configuration using the following syntax:
    1. `"{{ env_var('PASSWORD') }}"`: this will extract the value from the `PASSWORD` key
    in your environment variables.
    1. `"{{ variables('PASSWORD') }}"`: this will extract the value from the `PASSWORD` key
    in your [runtime variables](../../production/runtime_variables.md).

<br />

## Run pipeline and start sync

Once you’re done configuring your pipeline,
go back to the pipeline’s trigger page by clicking the name of your pipeline in your header.

The breadcrumbs in your header could look like this: `Pipelines / pipeline name / Edit`.

Once you’re on the pipeline triggers page,
create a [new scheduled trigger](../../features/orchestration/README.md#create-trigger) and
choose the `@once` interval. For more schedules, read the [other options here](../../tutorials/triggers/schedule.md).

### Monitoring pipeline

After you create a scheduled trigger, click the <b>`[Start trigger]`</b>
button at the top of the page.

You’ll see a new pipeline run appear shortly on the screen.

You can [click the logs](../../features/orchestration/README.md#logs)
for that pipeline run to view the progress of your synchronization.

<br />

## Support

If you get stuck, run into problems, or just want someone to walk you through these steps, please join our
[<img alt="Slack" height="20" src="https://thepostsportsbar.com/wp-content/uploads/2017/02/Slack-Logo.png" style="position: relative; top: 4px;" /> Slack](https://www.mage.ai/chat)
and someone will help you ASAP.

[![Join us on Slack](https://img.shields.io/badge/%20-Join%20us%20on%20Slack-black?style=for-the-badge&logo=slack&labelColor=6B50D7)](https://www.mage.ai/chat)

<br />
