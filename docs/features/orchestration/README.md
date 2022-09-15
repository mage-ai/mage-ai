# 📡 Data pipeline management

<img
  alt="Mage orchestration"
  src="https://github.com/mage-ai/assets/blob/main/orchestration-overview.gif?raw=true"
/>

## Table of contents

1. [Setup](#setup)
1. [Pipelines](#pipelines)
    1. [Creating new pipeline](#creating-new-pipeline)
1. [Pipeline runs](#pipeline-runs)
1. [Pipeline detail](#pipeline-detail)
1. [Triggers](#triggers)
    1. [Create trigger](#create-trigger)
    1. [Trigger detail](#trigger-detail)
1. [Runs](#runs)
    1. *Retry runs (WIP)*
1. [Logs](#logs)
1. *Backfill (WIP)*
1. *Monitor (WIP)*

<br />

## Setup

If you haven’t setup a project before,
check out the [<b>setup guide</b>](../../tutorials/quick_start/setup.md) before starting.

<br />

## Pipelines
<sub>[`http://localhost:3000/pipelines`](http://localhost:3000/pipelines)</sub>

This page will show all the pipelines in your project.

> Core abstraction: [<b>Pipeline</b>](../../core/abstractions.md#pipeline)
>
> A pipeline contains references to all the blocks of code you want to run,
charts for visualizing data, and organizes the dependency between each block of code.

![Pipelines](https://github.com/mage-ai/assets/blob/main/pipelines/pipelines-index.jpg?raw=true)

<sub>Learn more about [<b>projects and pipelines here</b>](../../core/abstractions.md#project).

From this page,
you can also create a new pipeline by clicking the <b>`[+ New pipeline]`</b> button.

#### Creating new pipeline

Creating a new pipeline will take you to the <b>Pipeline edit page</b>; a notebook-like experience
for adding blocks, creating dependencies between blocks, testing code,
and visualizing data with charts.

<sub>Learn more about the [<b>Notebook for building data pipelines</b>](../README.md#notebook-for-building-data-pipelines)</sub>.

<br />

## Pipeline runs
<sub>[`http://localhost:3000/pipeline-runs`](http://localhost:3000/pipeline-runs)</sub>

View all the runs for every pipeline in your current project.

> Core abstraction: [<b>Run</b>](../../core/abstractions.md#run)
>
> A run record stores information about when it was started, its status, when it was completed,
any runtime variables used in the execution of the pipeline or block, etc.

![Pipeline runs](https://github.com/mage-ai/assets/blob/main/pipelines/pipeline-runs.jpg?raw=true)

<br />

## Pipeline detail
<sub>`http://localhost:3000/pipelines/[uuid]`</sub>

This page contains all the information and history for a single pipeline:

1. [Triggers](../../core/abstractions.md#trigger)
1. [Runs](../../core/abstractions.md#run)
1. [Logs](../../core/abstractions.md#log)

<br />

## Triggers
<sub>[`http://localhost:3000/pipelines/example_pipeline/triggers`](http://localhost:3000/pipelines/example_pipeline/triggers)</sub>

This page shows all the active and inactive triggers for a single pipeline.

> Core abstraction: [<b>Trigger</b>](../../core/abstractions.md#trigger)
>
> A trigger is a set of instructions that determine when or how a pipeline should run.

![Pipeline detail](https://github.com/mage-ai/assets/blob/main/pipelines/pipeline-detail.jpg?raw=true)

<br />

#### Create trigger
<sub>`http://localhost:3000/pipelines/[uuid]/triggers/[id]/edit`</sub>

Create a new trigger for this pipeline by clicking the <b>`[+ Create]`</b>
button near the top of the page.

You can configure the trigger to run the pipeline on a schedule
or when an event occurs.

> Core abstraction: [<b>Schedule</b>](../../core/abstractions.md#schedule)
>
> A schedule type trigger will instruct the pipeline to run after a start date and on a set interval.

<br />

> Core abstraction: [<b>Event</b>](../../core/abstractions.md#event)
>
> An event type trigger will instruct the pipeline to run whenever a specific event occurs.

![Trigger create](https://github.com/mage-ai/assets/blob/main/pipelines/trigger-create.jpg?raw=true)
<sub><i>Example page for creating a schedule type trigger.</i></sub>

<br />

#### Trigger detail

On this page, you can start or pause the trigger. Starting the trigger will make it active.
Pausing the trigger will prevent it from running the pipeline.

<sub>
  Note: if you have other triggers for this pipeline,
  pausing 1 trigger may not stop the pipeline from running since other triggers can also run the pipeline.
</sub>

<br />

![Trigger detail](https://github.com/mage-ai/assets/blob/main/pipelines/trigger-detail.jpg?raw=true)

You can also edit the trigger after creating it by clicking the <b>`[Edit trigger]`</b> button.

<br />

## Runs
<sub>[`http://localhost:3000/pipelines/example_pipeline/runs`](http://localhost:3000/pipelines/example_pipeline/runs)</sub>

View the pipeline runs and block runs for a pipeline.

> Core abstraction: [<b>Run</b>](../../core/abstractions.md#run)
>
> A run record stores information about when it was started, its status, when it was completed,
any runtime variables used in the execution of the pipeline or block, etc.

![Pipeline detail runs](https://github.com/mage-ai/assets/blob/main/pipelines/pipeline-detail-runs.jpg?raw=true)

#### Retry run
*WIP*

<br />

## Logs
<sub>[`http://localhost:3000/pipelines/example_pipeline/logs`](http://localhost:3000/pipelines/example_pipeline/logs)</sub>

Browse all logs for a pipeline. You can search and filter logs by log level, block type, block UUID, and more.

> Core abstraction: [<b>Log</b>](../../core/abstractions.md#log)
>
> A log is a file that contains system output information.

![Pipeline detail logs](https://github.com/mage-ai/assets/blob/main/pipelines/pipeline-detail-logs.jpg?raw=true)

<br />

## Backfill
*WIP*

<br />

## Monitor
*WIP*

<br />
