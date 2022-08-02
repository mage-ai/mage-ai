[![PyPi](https://img.shields.io/pypi/v/mage-ai?color=orange)](https://pypi.org/project/mage-ai/)
[![mage-ai](https://img.shields.io/circleci/build/gh/mage-ai/mage-ai?color=%23159946&label=CircleCI&logo=circleci)](https://app.circleci.com/pipelines/github/mage-ai/mage-ai?branch=master&filter=all)
[![License](https://img.shields.io/github/license/mage-ai/mage-ai?color=red)](https://opensource.org/licenses/Apache-2.0)
[![Join Slack](https://img.shields.io/badge/Slack-Join%20Slack-blueviolet?logo=slack)](https://join.slack.com/t/mageai/shared_invite/zt-1adn34w4m-t~TcnPTlo3~5~d_0raOp6A)

# Intro

Mage is an open-source notebook for <b>building</b> and <b>deploying</b> data pipelines.

<img
  alt="Mage"
  src="media/tool-overview.png"
/>

[![Join us on Slack](https://img.shields.io/badge/%20-Join%20us%20on%20Slack-black?style=for-the-badge&logo=slack&labelColor=6B50D7)](https://www.mage.ai/chat)

**Table of contents**

1. [Quick start](#%EF%B8%8F-quick-start)
1. [Tutorials](#-tutorials)
1. [Features](#-features)
1. [Contributing](#%EF%B8%8F-contributing)
1. [Community](#-community)

# 🏃‍♀️ Quick start

<img alt="Fire mage" height="160" src="media/mage-fire-charging-up.svg" />

You can install Mage using Docker or `pip`:

### Using Docker

##### 1. Clone repository
```bash
git clone https://github.com/mage-ai/mage-ai.git && cd mage-ai
```

##### 2. Create new project
```bash
./scripts/init.sh [project_name]
```

##### 3. Launch editor
```bash
./scripts/start.sh [project_name]
```

Open [http://localhost:6789](http://localhost:6789) in your browser and build a pipeline.

##### 4. Run pipeline after building it in the tool
```bash
./scripts/run.sh [project_name] [pipeline]
```

### Using pip

##### 1. Install Mage
```bash
pip install mage-ai
```

You may need to install development libraries for MIT Kerberos to use some Mage features. On Ubuntu, this can be installed as:
```bash
apt install libkrb5-dev
```

##### 2. Create new project
```bash
mage init [project_name]
```

##### 3. Launch editor
```bash
mage start [project_name]
```

Open [http://localhost:6789](http://localhost:6789) in your browser and build a pipeline.

##### 4. Run pipeline after building it in the tool
```bash
mage run [project_name] [pipeline]
```

# 👩‍🏫 Tutorials

- [Train model on Titanic dataset](docs/tutorials/train_titanic_model/README.md)
- [Coming soon] Build an ETL pipeline end-to-end
- [Coming soon] How to visualize your data with charts

<br />

# 🔮 Features

1. [Data centric editor](#1-data-centric-editor)
1. [Production ready code](#2-production-ready-code)
1. [Extensible](#3-extensible)

### 1. Data centric editor
An interactive coding experience designed for preparing data to train ML models.

Visualize the impact of your code every time you load, clean, and transform data.

<img
  alt="Data centric editor"
  src="media/data-centric-editor.png"
/>

### 2. Production ready code
No more writing throw away code or trying to turn notebooks into scripts.

Each block (aka cell) in this editor is a modular file that can be tested, reused,
and chained together to create an executable data pipeline locally or in any environment.

Read more about <b>[blocks](docs/blocks/README.md)</b> and how they work.

<img
  alt="Production ready code"
  src="media/data-pipeline.png"
/>

Run your data pipeline end-to-end using the command line function: `$ mage run [project] [pipeline]`

You can run your pipeline in production environments with the orchestration tools
* [Airflow](docs/production/airflow.md)
* [Prefect](docs/production/prefect.md)
* Dagster (Tutorial coming soon)

### 3. Extensible
Easily add new functionality directly in the source code or through plug-ins (coming soon).

Adding new API endpoints ([Tornado](https://www.tornadoweb.org/en/stable/)),
transformations (Python, PySpark, SQL),
and charts (using [React](https://reactjs.org/)) is easy to do (tutorial coming soon).

<img
  alt="Extensible charts"
  src="media/extensible-charts.gif"
/>

### New features and changelog
Check out what’s new [here](https://mageai.notion.site/What-s-new-7cc355e38e9c42839d23fdbef2dabd2c).

# 🙋‍♀️ Contributing
We welcome all contributions to Mage;
from small UI enhancements to brand new cleaning actions.
We love seeing community members level up and give people power-ups!

Check out the [🎁 contributing guide](/docs/contributing/README.md) to get started
by setting up your development environment and
exploring the code base.

Got questions? Live chat with us in
[<img alt="Slack" height="20" src="https://thepostsportsbar.com/wp-content/uploads/2017/02/Slack-Logo.png" style="position: relative; top: 4px;" /> Slack](https://www.mage.ai/chat)

Anything you contribute, the Mage team and community will maintain. We’re in it together!

# 🧙 Community
We love the community of Magers (`/ˈmājər/`);
a group of mages who help each other realize their full potential!

To live chat with the Mage team and community,
please join the free Mage [<img alt="Slack" height="20" src="https://thepostsportsbar.com/wp-content/uploads/2017/02/Slack-Logo.png" style="position: relative; top: 4px;" /> Slack](https://www.mage.ai/chat)
channel.

[![Join us on Slack](https://img.shields.io/badge/%20-Join%20us%20on%20Slack-black?style=for-the-badge&logo=slack&labelColor=6B50D7)](https://www.mage.ai/chat)

For real-time news and fun memes, check out the Mage
[<img alt="Twitter" height="20" src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Twitter-logo.svg/2491px-Twitter-logo.svg.png" style="position: relative; top: 4px;" /> Twitter](https://twitter.com/mage_ai).

To report bugs or add your awesome code for others to enjoy,
visit [GitHub](https://github.com/mage-ai/mage-ai).

# 🪪 License
See the [LICENSE](LICENSE) file for licensing information.

<br />

[<img alt="Wind mage casting spell" height="160" src="media/mage-wind-casting-spell.svg" />](https://www.mage.ai/)
