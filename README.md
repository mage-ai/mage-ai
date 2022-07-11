[![PyPi](https://img.shields.io/pypi/v/mage-ai?color=orange)](https://pypi.org/project/mage-ai/)
[![mage-ai](https://img.shields.io/circleci/build/gh/mage-ai/mage-ai?color=%23159946&label=CircleCI&logo=circleci)](https://app.circleci.com/pipelines/github/mage-ai/mage-ai?branch=master&filter=all)
[![License](https://img.shields.io/github/license/mage-ai/mage-ai?color=red)](https://opensource.org/licenses/Apache-2.0)
[![Join Slack](https://img.shields.io/badge/Slack-Join%20Slack-blueviolet?logo=slack)](https://join.slack.com/t/mageai/shared_invite/zt-1adn34w4m-t~TcnPTlo3~5~d_0raOp6A)

# Intro

Mage is an open-source code editor for <b>transforming data</b> and building <b>ML pipelines</b>.

<img
  alt="Mage"
  src="media/tool-overview.png"
/>

> Join us on
> **[<img alt="Slack" height="20" src="https://thepostsportsbar.com/wp-content/uploads/2017/02/Slack-Logo.png" style="position: relative; top: 4px;" /> Slack](https://www.mage.ai/chat)**

**Table of contents**

1. [Quick start](#%EF%B8%8F-quick-start)
1. [Features](#-features)
1. [Contributing](#%EF%B8%8F-contributing)
1. [Community](#-community)

# 🏃‍♀️ Quick start

<img alt="Fire mage" height="160" src="media/mage-fire-charging-up.svg" />

### Using Docker

##### 1. Clone repository
```bash
$ git clone https://github.com/mage-ai/mage-ai.git && cd mage-ai
```

##### 2. Create new project
```bash
$ ./scripts/init.sh --project [project_name]
```

##### 3. Launch editor
```bash
$ ./scripts/start.sh --project [project_name]
```

Open [http://localhost:6789](http://localhost:6789) in your browser.

##### 4. Run pipeline
```bash
$ ./scripts/run.sh --project [project_name]
```

### Using pip

##### 1. Install Mage
```bash
$ pip install mage-ai
```

##### 2. Create new project
```bash
$ mage init [project_name]
```

##### 3. Launch editor
```bash
$ mage start [project_name]
```

Open [http://localhost:6789](http://localhost:6789) in your browser.

##### 4. Run pipeline
```bash
$ mage run [project_name] [pipeline]
```

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

Each cell block in this editor is a modular file that can be tested, reused,
and chained together to create an executable data pipeline locally or in any environment.

<img
  alt="Production ready code"
  src="media/production-ready-code.png"
/>

### 3. Extensible
Easily add new functionality directly in the source code or through plug-ins (coming soon).

Adding new API endpoints ([Tornado](https://www.tornadoweb.org/en/stable/)),
transformations (Python, PySpark, SQL),
and charts (using [React](https://reactjs.org/)) is easy to do (tutorial coming soon).

<img
  alt="Extensible charts"
  src="media/extensible-charts.png"
/>

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

For real-time news and fun memes, check out the Mage
[<img alt="Twitter" height="20" src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Twitter-logo.svg/2491px-Twitter-logo.svg.png" style="position: relative; top: 4px;" /> Twitter](https://twitter.com/mage_ai).

To report bugs or add your awesome code for others to enjoy,
visit [GitHub](https://github.com/mage-ai/mage-ai).

# 🪪 License
See the [LICENSE](LICENSE) file for licensing information.

<br />

[<img alt="Wind mage casting spell" height="160" src="media/mage-wind-casting-spell.svg" />](https://www.mage.ai/)
