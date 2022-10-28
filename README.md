# Overview

<figure><img src="https://github.com/mage-ai/assets/blob/main/mascots/mascots-shorter.jpeg?raw=true" alt=""><figcaption></figcaption></figure>

[**Watch demo** ](https://www.youtube.com/watch?v=hrsErfPDits)   🌊    [**Live demo** ](https://demo.mage.ai)   🔥    [**Documentation** ](docs/)   🌪️    [**Community chat**](https://www.mage.ai/chat)

[![PyPi](https://img.shields.io/pypi/v/mage-ai?color=orange) ](https://pypi.org/project/mage-ai/)[![](https://anaconda.org/conda-forge/mage-ai/badges/version.svg) ](https://anaconda.org/conda-forge/mage-ai)[![License](https://img.shields.io/github/license/mage-ai/mage-ai?color=red) ](https://opensource.org/licenses/Apache-2.0)[![Slack](https://img.shields.io/badge/Slack-Join%20Slack-blueviolet?logo=slack)](https://join.slack.com/t/mageai/shared\_invite/zt-1adn34w4m-t\~TcnPTlo3\~5\~d\_0raOp6A)![](https://static.scarf.sh/a.png?x-pxid=b3c96d79-b8f0-414b-a687-8bfc164b4b7a)

#### Give your data team `magical` powers

**Integrate** and synchronize data from 3rd party sources

Build real-time and batch pipelines to **transform** data using Python, SQL, and R

Run, monitor, and **orchestrate** thousands of pipelines without losing sleep



## 1️⃣ 🏗️ Build

Have you met anyone who said they loved developing in Airflow?\
That’s why we designed an easy developer experience that you’ll enjoy.

|                                                                                                             |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <img src="https://github.com/mage-ai/assets/blob/main/mage-build.gif?raw=true" alt="" data-size="original"> | <p><strong>Easy developer experience</strong><br>Start developing locally with a single command or launch a dev environment in your cloud using Terraform.<br><br><strong>Language of choice</strong><br>Write code in Python, SQL, or R in the same data pipeline for ultimate flexibility.<br><br><strong>Engineering best practices built-in</strong><br>Each step in your pipeline is a standalone file containing modular code that’s reusable and testable with data validations. No more DAGs with spaghetti code.</p> |



## 2️⃣ 🔮 Preview

Stop wasting time waiting around for your DAGs to finish testing.\
Get instant feedback from your code each time you run it.

|                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |                                                                             |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| <p><strong>Interactive code</strong><br>Immediately see results from your code’s output with an interactive notebook UI.<br><br><strong>Data is a first-class citizen</strong><br>Each block of code in your pipeline produces data that can be versioned, partitioned, and cataloged for future use.<br><br><strong>Collaborate on cloud</strong><br>Develop collaboratively on cloud resources, version control with Git, and test pipelines without waiting for an available shared staging environment.</p> | ![](https://github.com/mage-ai/assets/blob/main/mage-preview2.gif?raw=true) |



## 3️⃣ 🚀 Launch

Don’t have a large team dedicated to Airflow?\
Mage makes it easy for a single developer or small team to scale up and manage thousands of pipelines.

|                                                                           |                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ![](https://github.com/mage-ai/assets/blob/main/mage-launch.gif?raw=true) | <p><strong>Fast deploy</strong><br>Deploy Mage to AWS, GCP, or Azure with only 2 commands using maintained Terraform templates.<br><br><strong>Scaling made simple</strong><br>Transform very large datasets directly in your data warehouse or through a native integration with Spark.<br><br><strong>Observability</strong><br>Operationalize your pipelines with built-in monitoring, alerting, and observability through an intuitive UI.</p> |

\


## 🧙 Intro

Mage is an open-source data pipeline tool for transforming and integrating data.

1. [Quick start](./#️-quick-start)
2. [Demo](./#-demo)
3. [Tutorials](./#-tutorials)
4. [Documentation](docs/)
5. [Features](./#-features)
6. [Core design principles](docs/core/design\_principles.md)
7. [Core abstractions](docs/core/abstractions.md)
8. [Contributing](docs/contributing/)

\


## 🏃‍♀️ Quick start

You can install and run Mage using Docker (recommended), `pip`, or `conda`.

#### Install using Docker

1.  Create a new project and launch tool (change `demo_project` to any other name if you want):

    ```bash
    docker run -it -p 6789:6789 -v $(pwd):/home/src mageai/mageai \
      mage start demo_project
    ```

    Want to use Spark or other integrations? Read more about [integrations](docs/#integrations).
2. Open [http://localhost:6789](http://localhost:6789) in your browser and build a pipeline.

#### Using `pip` or `conda`

1.  Install Mage

    ```bash
    pip install mage-ai
    ```

    or

    ```bash
    conda install -c conda-forge mage-ai
    ```

    For additional packages (e.g. `spark`, `postgres`, etc), please see [Installing extra packages](docs/#installing-extra-packages).

    If you run into errors, please see [Install errors](docs/tutorials/quick\_start/setup.md#errors).
2.  Create new project and launch tool (change `demo_project` to any other name if you want):

    ```bash
    mage start demo_project
    ```
3. Open [http://localhost:6789](http://localhost:6789) in your browser and build a pipeline.

\


## 🎮 Demo

#### Live demo

Build and run a data pipeline with our [**demo app**](https://demo.mage.ai/).

> WARNING
>
> The live demo is public to everyone, please don’t save anything sensitive (e.g. passwords, secrets, etc).

#### Demo video (2 min)

[![Mage quick start demo](media/mage-youtube-preview.jpg)](https://www.youtube.com/watch?v=hrsErfPDits)

_Click the image to play video_

\


## 👩‍🏫 Tutorials

* [Train model on Titanic dataset](docs/tutorials/quick\_start/train\_titanic\_model/)
* [Load data from API, transform it, and export it to PostgreSQL](docs/tutorials/quick\_start/etl\_restaurant/)
* [Integrate Mage into an existing Airflow project](docs/tutorials/airflow/integrate\_into\_existing\_project/)

<img src="media/mage-fire-charging-up.svg" alt="Fire mage" data-size="original">\


## 🔮 [Features](docs/features/)

|     |                                                                       |                                                                        |
| --- | --------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 🎶  | [**Orchestration**](docs/features/orchestration/)                     | Schedule and manage data pipelines with observability.                 |
| 📓  | [**Notebook**](docs/features/#notebook-for-building-data-pipelines)   | Interactive Python, SQL, & R editor for coding data pipelines.         |
| 🏗️ | [**Data integrations**](docs/data\_integrations/)                     | Synchronize data from 3rd party sources to your internal destinations. |
| 🚰  | [**Streaming pipelines**](docs/guides/pipelines/StreamingPipeline.md) | Ingest and transform real-time data.                                   |

**A sample data pipeline defined across 3 files ➝**

1.  Load data ➝

    ```python
    @data_loader
    def load_csv_from_file():
        return pd.read_csv('default_repo/titanic.csv')
    ```
2.  Transform data ➝

    ```python
    @transformer
    def select_columns_from_df(df, *args):
        return df[['Age', 'Fare', 'Survived']]
    ```
3.  Export data ➝

    ```python
    @data_exporter
    def export_titanic_data_to_disk(df) -> None:
        df.to_csv('default_repo/titanic_transformed.csv')
    ```

**What the data pipeline looks like in the UI ➝**

![data pipeline overview](media/data-pipeline-overview.jpg)

New? We recommend reading about [**blocks**](docs/blocks/) and learning from a [**hands-on tutorial**](docs/tutorials/quick\_start/etl\_restaurant/).

[![Ask us questions on Slack](https://img.shields.io/badge/%20-Ask%20us%20questions%20on%20Slack-purple?style=for-the-badge\&logo=slack\&labelColor=6B50D7)](https://www.mage.ai/chat)

\


## 🏔️ [Core design principles](docs/core/design\_principles.md)

Every user experience and technical design decision adheres to these principles.

|    |                                                                                                            |                                                                                                                              |
| -- | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 💻 | [Easy developer experience](docs/core/design\_principles.md#-easy-developer-experience)                    | Open-source engine that comes with a custom notebook UI for building data pipelines.                                         |
| 🚢 | [Engineering best practices built-in](docs/core/design\_principles.md#engineering-best-practices-built-in) | Build and deploy data pipelines using modular code. No more writing throwaway code or trying to turn notebooks into scripts. |
| 💳 | [Data is a first-class citizen](docs/core/design\_principles.md#data-is-a-first-class-citizen)             | Designed from the ground up specifically for running data-intensive workflows.                                               |
| 🪐 | [Scaling is made simple](docs/core/design\_principles.md#scaling-is-made-simple)                           | Analyze and process large data quickly for rapid iteration.                                                                  |

\


## 🛸 [Core abstractions](docs/core/abstractions.md)

These are the fundamental concepts that Mage uses to operate.

|                                                        |                                                                                                                                                             |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Project](docs/core/abstractions.md#project)           | Like a repository on GitHub; this is where you write all your code.                                                                                         |
| [Pipeline](docs/core/abstractions.md#pipeline)         | Contains references to all the blocks of code you want to run, charts for visualizing data, and organizes the dependency between each block of code.        |
| [Block](docs/core/abstractions.md#block)               | A file with code that can be executed independently or within a pipeline.                                                                                   |
| [Data product](docs/core/abstractions.md#data-product) | Every block produces data after it's been executed. These are called data products in Mage.                                                                 |
| [Trigger](docs/core/abstractions.md#trigger)           | A set of instructions that determine when or how a pipeline should run.                                                                                     |
| [Run](docs/core/abstractions.md#run)                   | Stores information about when it was started, its status, when it was completed, any runtime variables used in the execution of the pipeline or block, etc. |

\


## 🙋‍♀️ Contributing and developing

Add features and instantly improve the experience for everyone.

Check out the [**contributing guide**](docs/contributing/) to setup your development environment and start building.

\


## 👨‍👩‍👧‍👦 Community

Individually, we’re a mage.

> 🧙 Mage
>
> Magic is indistinguishable from advanced technology. A mage is someone who uses magic (aka advanced technology). Together, we’re Magers!

> 🧙‍♂️🧙 Magers (`/ˈmājər/`)
>
> A group of mages who help each other realize their full potential! Let’s hang out and chat together ➝

[![Hang out on Slack](https://img.shields.io/badge/%20-Hang%20out%20on%20Slack-purple?style=for-the-badge\&logo=slack\&labelColor=6B50D7)](https://www.mage.ai/chat)

For real-time news, fun memes, data engineering topics, and more, join us on ➝

|                                                                                                                                                                   |                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Twitter-logo.svg/2491px-Twitter-logo.svg.png" alt="Twitter" data-size="line">                 | [Twitter](https://twitter.com/mage\_ai)                         |
| <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/LinkedIn_logo_initials.png/800px-LinkedIn_logo_initials.png" alt="LinkedIn" data-size="line"> | [LinkedIn](https://www.linkedin.com/company/magetech/mycompany) |
| <img src="https://github.githubassets.com/images/modules/logos_page/Octocat.png" alt="GitHub" data-size="line">                                                   | [GitHub](https://github.com/mage-ai/mage-ai)                    |
| <img src="https://thepostsportsbar.com/wp-content/uploads/2017/02/Slack-Logo.png" alt="Slack" data-size="line">                                                   | [Slack](https://www.mage.ai/chat)                               |

\


## 🤔 Frequently Asked Questions (FAQs)

Check out our [FAQ page](https://www.notion.so/mageai/Mage-FAQs-33d93ee65f934ed39568f8a4bc823b39) to find answers to some of our most asked questions.

\


## 🪪 License

See the [LICENSE](LICENSE/) file for licensing information.

[![Water mage casting spell](media/mage-water-charging-up.svg)](https://www.mage.ai/)

\
