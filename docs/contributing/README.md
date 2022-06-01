# Contributing guide

- [WIP] How to add a chart for visualization
- [WIP] How to add a report
- [WIP] How to add a cleaning action
- [WIP] How to add a suggested cleaning action

## Development environment

### Setting up the front-end UI

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

### Setting up the backend server

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

Change directory into the server folder.
```bash
$ cd mage-ai/mage_ai/server
```

Set an environment variable to `development`.
```bash
$ export ENV=development
```

While in the directory `mage-ai/mage_ai/server`,
run the following command to launch the backend locally.

```bash
$ flask run
```

Now visit [http://localhost:5000](http://localhost:5000)
to make HTTP requests to the backend server.

## Explore the code base
WIP
