<h1 align="center">
  <a
    target="_blank"
    href="https://mage.ai"
  >
    <img
      align="center"
      alt="Mage"
      src="https://github.com/mage-ai/assets/blob/main/mascots/mascots-shorter.jpeg?raw=true"
      style="width:100%;"
    />
  </a>
</h1>
<p align="center">
  🧙 A modern replacement for Airflow.
</p>

<p align="center">
  <a
    href="https://www.youtube.com/watch?v=hrsErfPDits"
    target="_blank"
  ><b>Watch demo</b></a>&nbsp;&nbsp;&nbsp;🌊&nbsp;&nbsp;&nbsp;
  <a
    href="https://demo.mage.ai"
    target="_blank"
  ><b>Live demo</b></a>&nbsp;&nbsp;&nbsp;🔥&nbsp;&nbsp;&nbsp;
  <a
    href="docs/README.md"
    target="_blank"
  ><b>Documentation</b></a>&nbsp;&nbsp;&nbsp;🌪️&nbsp;&nbsp;&nbsp;
  <a
    href="https://www.mage.ai/chat"
    target="_blank"
  >
    <b>Community chat</b>
  </a>
</p>
<div align="center">
  <a
    href="https://pypi.org/project/mage-ai/"
    target="_blank"
  >
    <img alt="PyPi" src="https://img.shields.io/pypi/v/mage-ai?color=orange" />
  </a>
  <a
    href="https://anaconda.org/conda-forge/mage-ai"
    target="_blank"
  >
    <img src="https://anaconda.org/conda-forge/mage-ai/badges/version.svg" />
  </a>
  <a
    href="https://opensource.org/licenses/Apache-2.0"
    target="_blank"
  >
    <img alt="License" src="https://img.shields.io/github/license/mage-ai/mage-ai?color=red" />
  </a>
  <a
    href="https://join.slack.com/t/mageai/shared_invite/zt-1adn34w4m-t~TcnPTlo3~5~d_0raOp6A"
    target="_blank"
  >
    <img alt="Slack" src="https://img.shields.io/badge/Slack-Join%20Slack-blueviolet?logo=slack" />
  </a>
  <a
    href="https://github.com/mage-ai/mage-ai"
    target="_blank"
  >
    <img alt="Github Stars" src="https://img.shields.io/github/stars/mage-ai/mage-ai?logo=github">
  </a>
</div>
<img
  referrerpolicy="no-referrer-when-downgrade"
  src="https://static.scarf.sh/a.png?x-pxid=b3c96d79-b8f0-414b-a687-8bfc164b4b7a"
/>

<div align="center">

### Give your data team `magical` powers

</div>

<p align="center">
  <b>Integrate</b> and synchronize data from 3rd party sources
</p>

<p align="center">
  Build real-time and batch pipelines to <b>transform</b> data using Python, SQL, and R
</p>

<p align="center">
  Run, monitor, and <b>orchestrate</b> thousands of pipelines without losing sleep
</p>

<br />

<p align="center">1️⃣ 🏗️</p>
<h1 align="center">Build</h1>
<p align="center">
  Have you met anyone who said they loved developing in Airflow?
  <br />
  That’s why we designed an easy developer experience that you’ll enjoy.
</p>

|   |   |
| --- | --- |
| <b>Easy developer experience</b><br />Start developing locally with a single command or launch a dev environment in your cloud using Terraform.<br /><br/><b>Language of choice</b><br />Write code in Python, SQL, or R in the same data pipeline for ultimate flexibility.<br /><br /><b>Engineering best practices built-in</b><br />Each step in your pipeline is a standalone file containing modular code that’s reusable and testable with data validations. No more DAGs with spaghetti code. | <img src="https://github.com/mage-ai/assets/blob/main/mage-build.gif?raw=true" /> |

<p align="center">
  ↓
</p>

<p align="center">2️⃣ 🔮</p>
<h1 align="center">Preview</h1>
<p align="center">
  Stop wasting time waiting around for your DAGs to finish testing.
  <br />
  Get instant feedback from your code each time you run it.
</p>

|   |   |
| --- | --- |
| <b>Interactive code</b><br />Immediately see results from your code’s output with an interactive notebook UI.<br /><br/><b>Data is a first-class citizen</b><br />Each block of code in your pipeline produces data that can be versioned, partitioned, and cataloged for future use.<br /><br /><b>Collaborate on cloud</b><br />Develop collaboratively on cloud resources, version control with Git, and test pipelines without waiting for an available shared staging environment. | <img src="https://github.com/mage-ai/assets/blob/main/mage-preview2.gif?raw=true" /> |

<p align="center">
  ↓
</p>

<p align="center">3️⃣ 🚀</p>
<h1 align="center">Launch</h1>
<p align="center">
  Don’t have a large team dedicated to Airflow?
  <br />
  Mage makes it easy for a single developer or small team to scale up and manage thousands of pipelines.
</p>

|   |   |
| --- | --- |
| <b>Fast deploy</b><br />Deploy Mage to AWS, GCP, or Azure with only 2 commands using maintained Terraform templates.<br /><br/><b>Scaling made simple</b><br />Transform very large datasets directly in your data warehouse or through a native integration with Spark.<br /><br /><b>Observability</b><br />Operationalize your pipelines with built-in monitoring, alerting, and observability through an intuitive UI. | <img src="https://github.com/mage-ai/assets/blob/main/mage-launch.gif?raw=true" /> |

<br />

# 🧙 Intro

Mage is an open-source data pipeline tool for transforming and integrating data.

1. [Quick start](#%EF%B8%8F-quick-start)
1. [Demo](#-demo)
1. [Tutorials](#-tutorials)
1. [Documentation](docs/README.md)
1. [Features](#-features)
1. [Core design principles](docs/core/design_principles.md)
1. [Core abstractions](docs/core/abstractions.md)
1. [Contributing](docs/contributing/README.md)

<br />

# 🏃‍♀️ Quick start

You can install and run Mage using Docker (recommended), `pip`, or `conda`.

### Install using Docker

1. Create a new project and launch tool (change `demo_project` to any other name if you want):
    ```bash
    docker run -it -p 6789:6789 -v $(pwd):/home/src mageai/mageai \
      mage start demo_project
    ```

    <sub>Want to use Spark or other integrations? Read more about [integrations](docs/README.md#integrations).</sub>

1. Open [http://localhost:6789](http://localhost:6789) in your browser and build a pipeline.

### Using `pip` or `conda`

1. Install Mage
    ```bash
    pip install mage-ai
    ```

    or

    ```bash
    conda install -c conda-forge mage-ai
    ```

    <sub>For additional packages (e.g. `spark`, `postgres`, etc), please see [Installing extra packages](docs/README.md#installing-extra-packages).</sub>

    <sub>If you run into errors, please see [Install errors](docs/tutorials/quick_start/setup.md#errors).</sub>

1. Create new project and launch tool (change `demo_project` to any other name if you want):
    ```bash
    mage start demo_project
    ```
1. Open [http://localhost:6789](http://localhost:6789) in your browser and build a pipeline.

<br />

# 🎮 Demo

### Live demo

Build and run a data pipeline with our <b>[demo app](https://demo.mage.ai/)</b>.

> WARNING
>
> The live demo is public to everyone, please don’t save anything sensitive (e.g. passwords, secrets, etc).
### Demo video (2 min)

[![Mage quick start demo](media/mage-youtube-preview.jpg)](https://www.youtube.com/watch?v=hrsErfPDits "Mage quick start demo")

<sub><i>Click the image to play video</i></sub>

<br />

# 👩‍🏫 Tutorials

- [Train model on Titanic dataset](docs/tutorials/quick_start/train_titanic_model/README.md)
- [Load data from API, transform it, and export it to PostgreSQL](docs/tutorials/quick_start/etl_restaurant/README.md)
- [Integrate Mage into an existing Airflow project](docs/tutorials/airflow/integrate_into_existing_project/README.md)
- [Set up DBT models and orchestrate DBT runs](docs/tutorials/dbt/quick_start.md)

<img alt="Fire mage" height="160" src="media/mage-fire-charging-up.svg" />

<br />

# 🔮 [Features](docs/features/README.md)

|   |   |   |
| --- | --- | --- |
| 🎶 | <b>[Orchestration](docs/features/orchestration/README.md)</b> | Schedule and manage data pipelines with observability. |
| 📓 | <b>[Notebook](docs/features/README.md#notebook-for-building-data-pipelines)</b> | Interactive Python, SQL, & R editor for coding data pipelines. |
| 🏗️ | <b>[Data integrations](docs/data_integrations/README.md)</b> | Synchronize data from 3rd party sources to your internal destinations. |
| 🚰 | <b>[Streaming pipelines](docs/guides/pipelines/StreamingPipeline.md)</b> | Ingest and transform real-time data. |
| ❎ | <b>[DBT](docs/dbt/README.md)</b> | Build, run, and manage your DBT models with Mage. |

<b>A sample data pipeline defined across 3 files ➝</b>

1. Load data ➝
    ```python
    @data_loader
    def load_csv_from_file():
        return pd.read_csv('default_repo/titanic.csv')
    ```
1. Transform data ➝
    ```python
    @transformer
    def select_columns_from_df(df, *args):
        return df[['Age', 'Fare', 'Survived']]
    ```
1. Export data ➝
    ```python
    @data_exporter
    def export_titanic_data_to_disk(df) -> None:
        df.to_csv('default_repo/titanic_transformed.csv')
    ```

<b>What the data pipeline looks like in the UI ➝</b>

<img
  alt="data pipeline overview"
  src="media/data-pipeline-overview.jpg"
/>

New? We recommend reading about <b>[blocks](docs/blocks/README.md)</b> and
learning from a <b>[hands-on tutorial](docs/tutorials/quick_start/etl_restaurant/README.md)</b>.

[![Ask us questions on Slack](https://img.shields.io/badge/%20-Ask%20us%20questions%20on%20Slack-purple?style=for-the-badge&logo=slack&labelColor=6B50D7)](https://www.mage.ai/chat)

<br />

# 🏔️ [Core design principles](docs/core/design_principles.md)

Every user experience and technical design decision adheres to these principles.

|   |   |   |
| --- | --- | --- |
| 💻 | [Easy developer experience](docs/core/design_principles.md#-easy-developer-experience) | Open-source engine that comes with a custom notebook UI for building data pipelines. |
| 🚢 | [Engineering best practices built-in](docs/core/design_principles.md#engineering-best-practices-built-in) | Build and deploy data pipelines using modular code. No more writing throwaway code or trying to turn notebooks into scripts. |
| 💳 | [Data is a first-class citizen](docs/core/design_principles.md#data-is-a-first-class-citizen) | Designed from the ground up specifically for running data-intensive workflows. |
| 🪐 | [Scaling is made simple](docs/core/design_principles.md#scaling-is-made-simple) | Analyze and process large data quickly for rapid iteration. |

<br />

# 🛸 [Core abstractions](docs/core/abstractions.md)

These are the fundamental concepts that Mage uses to operate.

|   |   |
| --- | --- |
| [Project](docs/core/abstractions.md#project) | Like a repository on GitHub; this is where you write all your code. |
| [Pipeline](docs/core/abstractions.md#pipeline) | Contains references to all the blocks of code you want to run, charts for visualizing data, and organizes the dependency between each block of code. |
| [Block](docs/core/abstractions.md#block) | A file with code that can be executed independently or within a pipeline. |
| [Data product](docs/core/abstractions.md#data-product) | Every block produces data after it's been executed. These are called data products in Mage. |
| [Trigger](docs/core/abstractions.md#trigger) | A set of instructions that determine when or how a pipeline should run. |
| [Run](docs/core/abstractions.md#run) | Stores information about when it was started, its status, when it was completed, any runtime variables used in the execution of the pipeline or block, etc. |

<br />

# 🙋‍♀️ Contributing and developing

Add features and instantly improve the experience for everyone.

Check out the <b>[contributing guide](docs/contributing/README.md)</b>
to setup your development environment and start building.

<br />

# 👨‍👩‍👧‍👦 Community
Individually, we’re a mage.

> 🧙 Mage
>
> Magic is indistinguishable from advanced technology.
> A mage is someone who uses magic (aka advanced technology).
Together, we’re Magers!

> 🧙‍♂️🧙 Magers (`/ˈmājər/`)
>
> A group of mages who help each other realize their full potential!
Let’s hang out and chat together ➝

[![Hang out on Slack](https://img.shields.io/badge/%20-Hang%20out%20on%20Slack-purple?style=for-the-badge&logo=slack&labelColor=6B50D7)](https://www.mage.ai/chat)

For real-time news, fun memes, data engineering topics, and more, join us on ➝

|   |   |
| --- | --- |
| <img alt="Twitter" height="20" src="https://user-images.githubusercontent.com/78053898/198755056-a15c4439-c07f-41ea-ba35-bc4bfdd09f1a.png" /> | [Twitter](https://twitter.com/mage_ai) |
| <img alt="LinkedIn" height="20" src="https://user-images.githubusercontent.com/78053898/198755052-2777d6ae-c161-4a4b-9ece-4fd7bd458e26.png" /> | [LinkedIn](https://www.linkedin.com/company/magetech/mycompany) |
| <img alt="GitHub" height="20" src="https://user-images.githubusercontent.com/78053898/198755053-5c3971b1-9c49-4888-8a8e-1599f0fc6646.png" /> | [GitHub](https://github.com/mage-ai/mage-ai) |
| <img alt="Slack" height="20" src="https://user-images.githubusercontent.com/78053898/198755054-03d47bfc-18b6-45a5-9593-7b496eb927f3.png" /> | [Slack](https://www.mage.ai/chat) |

<br />

# 🤔 Frequently Asked Questions (FAQs)

Check out our [FAQ page](https://www.notion.so/mageai/Mage-FAQs-33d93ee65f934ed39568f8a4bc823b39) to find answers to some of our most asked questions.

<br />

# 🪪 License
See the [LICENSE](LICENSE) file for licensing information.

[<img alt="Water mage casting spell" height="300" src="media/mage-water-charging-up.svg" />](https://www.mage.ai/)

<br />
