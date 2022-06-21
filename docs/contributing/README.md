# Contributing guide

## Setting up development environment

### 🏗️ Using Docker

Run the below script to build the Docker image and run all the services:

```bash
$ ./scripts/dev.sh
```

Or run the following command to build the Docker image:

```bash
$ docker-compose build .
```

Run the following command to run all the services:

```bash
$ docker-compose up
```

Open [http://localhost:3000/](http://localhost:3000/) in your browser to use the app.

Jupyter Lab is running on [http://127.0.0.1:8888/lab](http://127.0.0.1:8888/lab).
Look at your terminal and find a corresponding URL with a token in the URL parameter;
e.g. `http://127.0.0.1:8888/lab?token=`.

#### Debugging

Instead of using `breakpoint()`, add the following line to your code where you
want a debug:
```python
import pdb; pdb.set_trace()
```

Attach to running container to use debugger. To get the container ID, run `docker ps`
and look in the `NAMES` column.

```bash
$ docker attach [container_id]
```

#### Example notebook

Open the [example.ipynb](../../example.ipynb) notebook for an interactive Python environment and connect your data
to the app.

##### Using tool in Jupyter notebook cell

You can run the tool inside a Jupyter notebook cell iFrame using the method:
`mage_ai.launch()` within a single cell.

Optionally, you can use the following arguments to change the default host and
port that the iFrame loads from:

##### Kill tool

*To stop the tool, run this command*: `mage_ai.kill()`

```python
mage_ai.launch(iframe_host='127.0.0.1', iframe_port=1337)
```

### 🖥️ Setting up the front-end UI

#### Install Homebrew (if you haven't already)
Directions at [brew.sh](https://brew.sh/).

#### Install Node 14 or Node 16
More details at [Homebrew website](https://formulae.brew.sh/formula/node).

**Note:** We are currently using Node 14 as of 11/1/21, but Node 16 became the latest LTS version as of 10/26/21. You can try using Node 16, but if there are issues running the app, revert to Node 14.
```bash
# Node v14
$ brew install node@14
```

```bash
# Node v16
$ brew install node@16
```

#### Installing Node with Node Version Manager (nvm) [OPTIONAL]
If switching between Node versions is needed, use nvm, but uninstall any Node versions installed with Homebrew first. Refer to [nvm's docs](https://github.com/nvm-sh/nvm#usage) for details on installing and using different Node versions.
```bash
# Install nvm
$ curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
```

```bash
# Uninstall any existing node versions (e.g. through Homebrew) FIRST.
$ nvm install 16
$ nvm use 16
```

#### Install Yarn after installing Node
More details at [Yarn website](https://yarnpkg.com/getting-started/install).
```bash
$ npm install -g yarn
```

#### Install node modules

Change directory into the front-end folder.
```bash
$ cd mage-ai/mage_ai/frontend
```

Install Node modules using `yarn`.
```bash
$ yarn install
```

#### Run front-end UI locally
While in the directory `mage-ai/mage_ai/frontend`,
run the following command to launch the UI locally.

```bash
$ yarn run dev
```

Now visit [http://localhost:3000/datasets](http://localhost:3000/datasets) to view the tool.

### 🗄️ Setting up the backend server

#### Install Python packages

Change directory into the root folder.
```bash
$ cd mage-ai
```

Install Python packages
```bash
$ pip3 install -r requirements.txt
```

#### Run backend server locally

You can optionally set the host or port environment variables:

```bash
$ export HOST=127.0.0.1
$ export PORT=5789
```

Or, you can set the host and port at runtime (see below).

While in the root directory,
run the following command to launch the backend locally.

```bash
$ python3 mage_ai/server/app.py
```

or

```bash
$ python3 mage_ai/server/app.py --host 127.0.0.2 --port 1337
```

Now visit [http://localhost:5789](http://localhost:5789)
to make HTTP requests to the backend server.

#### Using the mage_ai Python package from your machine

In your notebook or interactive Python environment, run the following code to use a local
version of the `mage_ai` library that reads from your local repository:

```python
import sys
sys.path.append('/absolute_path_to_repo/mage-ai')


import mage_ai
```

### 💾 Sample data
Load sample datasets to test and play with.

```python
import mage_ai
from mage_ai.sample_datasets import list_dataset_names, load_dataset


dataset_names = list_dataset_names()
df = load_dataset('titanic_survival.csv')
```

## Explore the code base

- [WIP] How to add a chart for visualization
- [WIP] How to add a report
- [WIP] How to add a cleaning action
- [WIP] How to add a suggested cleaning action
