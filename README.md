<div align="left">
  <h1>Mage AI</h1>

  <p>Give your data team magical powers.</p>

<a href="https://mage.ai"><img alt="Mage AI GitHub repo stars" src="https://img.shields.io/github/stars/mage-ai/mage-ai?style=for-the-badge&logo=github&labelColor=000000&logoColor=FFFFFF&label=stars&color=0500ff" /></a>
<a href="https://hub.docker.com/r/mageai/mageai"><img alt="Mage AI Docker downloads" src="https://img.shields.io/docker/pulls/mageai/mageai?style=for-the-badge&logo=docker&labelColor=000000&logoColor=FFFFFF&label=pulls&color=6A35FF" /></a>
<a href="https://github.com/mage-ai/mage-ai/blob/master/LICENSE"><img alt="Mage AI license" src="https://img.shields.io/github/license/mage-ai/mage-ai?style=for-the-badge&logo=codeigniter&labelColor=000000&logoColor=FFFFFF&label=license&color=FFCC19" /></a>
<a href="https://www.mage.ai/chat"><img alt="Join the Mage AI community" src="https://img.shields.io/badge/Join%20the%20community-black.svg?style=for-the-badge&logo=lightning&labelColor=000000&logoColor=FFFFFF&label=&color=DD55FF&logoWidth=20" /></a>

</div>

<br />

<a href="https://cloud.mage.ai/sign-up">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://github.com/mage-ai/assets/blob/main/oss/hero.png?raw=true">
    <img alt="Mage AI hero" src="https://github.com/mage-ai/assets/blob/main/oss/hero.png?raw=true" />
  </picture>
</a>

<br />
<br />

Mage is a hybrid framework for transforming and integrating data. It combines the best of both worlds: the flexibility of notebooks with the rigor of modular code.

<br />

- Extract and synchronize data from 3rd party sources.
- Transform data with real-time and batch pipelines using Python, SQL, and R.
- Load data into your data warehouse or data lake using our pre-built connectors.
- Run, monitor, and orchestrate thousands of pipelines without losing sleep.

<br />

Plus hundreds of enterprise-class features, infrastructure innovations, and magical surprises.

<h1></h1>

#### Available in two spellbinding versions

<br />

<table style="width: 100%; border: none;" cellspacing="0" cellpadding="0" border="0">
  <tr>
    <td rowspan="2">
      <a href="https://cloud.mage.ai/sign-up">
        <img alt="Mage Pro" width="124" align="left" src="https://github.com/mage-ai/assets/blob/main/oss/card-pro.png?raw=true" />
      </a>
      <b>For teams.</b> Fully managed platform
      for integrating and transforming data.
    </td>
    <td rowspan="2">
      <a href="https://github.com/mage-ai/mage-ai?tab=readme-ov-file#its-magic">
        <img alt="Mage OSS" width="124" align="left" src="https://github.com/mage-ai/assets/blob/main/oss/card-oss.png?raw=true" />
      </a>
      <b>Self-hosted.</b> System to build, run, and
      manage data pipelines.
    </td>
  </tr>
</table>

<br />

<a href="https://cloud.mage.ai/sign-up">
  <img alt="Try out Mage Pro" src="https://img.shields.io/badge/try%20it%20out%20now-black.svg?style=for-the-badge&logo=artifacthub&labelColor=6A35FF&logoColor=FFFFFF&label=mage%20pro&color=6A35FF">
</a>

<br />
<br />

<div align="left">

# It’s magic.

<p align="left">
  For documentation on getting started, how to develop, and how to deploy to production check out the live
  <br />
  <a
    href="https://docs.mage.ai?source=github"
    target="_blank"
  ><b>Developer documentation portal</b></a>.
</p>

<br />

## 🏃‍♀️ Install

The recommended way to install the latest version of Mage is through Docker with the following command:

```bash
docker pull mageai/mageai:latest
```

You can also install Mage using pip or conda, though this may cause dependency issues without the proper environment.

```bash
pip install mage-ai
```
```bash
conda install -c conda-forge mage-ai
```

Looking for help? The _fastest_ way to get started is by checking out our documentation [here](https://docs.mage.ai/getting-started/setup).

Looking for quick examples? Open a [demo](https://demo.mage.ai/) project right in your browser or check out our [guides](https://docs.mage.ai/guides/overview).

## 🎮 Demo

### Live demo

Build and run a data pipeline with our <b>[demo app](https://demo.mage.ai/)</b>.

> WARNING
>
> The live demo is public to everyone, please don’t save anything sensitive (e.g. passwords, secrets, etc).
### Demo video (5 min)

[![Mage quick start demo](https://github.com/mage-ai/assets/blob/main/overview/overview-video.png?raw=True)](https://youtu.be/GswOdShLGmg)

<sub><i>Click the image to play video</i></sub>

<br />

## 🔮 [Features](https://docs.mage.ai/about/features)

|   |   |   |
| --- | --- | --- |
| 🎶 | <b>[Orchestration](https://docs.mage.ai/design/data-pipeline-management)</b> | Schedule and manage data pipelines with observability. |
| 📓 | <b>[Notebook](https://docs.mage.ai/about/features#notebook-for-building-data-pipelines)</b> | Interactive Python, SQL, & R editor for coding data pipelines. |
| 🏗️ | <b>[Data integrations](https://docs.mage.ai/data-integrations/overview)</b> | Synchronize data from 3rd party sources to your internal destinations. |
| 🚰 | <b>[Streaming pipelines](https://docs.mage.ai/guides/streaming-pipeline)</b> | Ingest and transform real-time data. |
| ❎ | <b>[dbt](https://docs.mage.ai/dbt/overview)</b> | Build, run, and manage your dbt models with Mage. |

<br />

<b>A sample data pipeline defined across 3 files ➝</b>

<br />

1. Load data ➝
    ```python
    @data_loader
    def load_csv_from_file() -> pl.DataFrame:
        return pl.read_csv('default_repo/titanic.csv')
    ```
1. Transform data ➝
    ```python
    @transformer
    def select_columns_from_df(df: pl.DataFrame, *args) -> pl.DataFrame:
        return df[['Age', 'Fare', 'Survived']]
    ```
1. Export data ➝
    ```python
    @data_exporter
    def export_titanic_data_to_disk(df: pl.DataFrame) -> None:
        df.to_csv('default_repo/titanic_transformed.csv')
    ```

<br />

[<img alt="Water mage casting spell" height="300" src="https://github.com/mage-ai/assets/blob/main/mage-water-charging-up.svg?raw=True" />](https://www.mage.ai/)
