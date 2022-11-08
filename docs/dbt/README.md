# DBT integration

Transform DBT with Mage.

![](https://c.tenor.com/gbLWPf5HCsYAAAAC/devastator-constructicons.gif)

1. [Overview](#overview)
1. [Features](#features)
1. [Tutorials](#tutorials)
1. [Guides](#guides)

<br />

## Overview

Build, run, and manage your DBT models with Mage.

![](https://www.meme-arsenal.com/memes/1b10a71e3fd178b2f623d2cde61f6b42.jpg)

| Role | Benefits |
| --- | --- |
| Analytics engineers<img width="100" /> | With Mage and DBT combined, you can expand build and run complex data pipelines. |
| Data engineers<img width="100" /> | Simplify your data infrastructure and reduce the amount of redundant tools in your “modern” data stack. Replace DBT cloud and Airflow with Mage’s native integration with DBT. |

<br />

## Features

| Feature | Description |
| --- | --- |
| Schedule DBT model runs | [Trigger](../core/abstractions.md#trigger) your DBT model runs on a regular schedule, from an event, or via API request. |
| Run specific DBT models and their dependencies | ![](https://github.com/mage-ai/assets/blob/main/dbt/add-dbt-model.gif?raw=true) |
| Run all models and optionally exclude others | ![](https://raw.githubusercontent.com/mage-ai/assets/main/dbt/add-dbt-models.gif) |
| DBT models can depend on non-DBT related tasks | *Examples:*<br />Build model after data ingestion from API<br />Build model after another pipeline completes |
| Preview DBT model results as you write SQL | ![](https://github.com/mage-ai/assets/blob/main/dbt/dbt-preview.gif?raw=true) |
| Build dynamic DBT pipelines using flexible variable interpolation | `{{ env_var('...') }}`<br />`{{ variables('...') }}` |
| Automatically run DBT tests every time a pipeline runs | Write checks using DBT tests, then Mage will run them and fail the pipeline if the test results produce any failures. |
| Observability built-in | Monitor your DBT pipelines and get alerted when things break. |

<br />

## Tutorials

- [Set up DBT models & orchestrate DBT runs](../tutorials/dbt/quick_start.md)

<br />

## Guides

- [Run a single model](../guides/dbt/run_model.md)
- [Run selected models (and optionally exclude others)](../guides/dbt/run_models.md)
- [Connection profiles](../guides/dbt/connection_profiles.md)
- [DBT models depending on other blocks using sources](../guides/dbt/dependencies.md)
- [Running DBT tests](../guides/dbt/tests.md)
- [Add an existing DBT project to Mage](../guides/dbt/add_existing_project.md)

<br />
