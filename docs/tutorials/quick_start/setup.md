# Setup

You can install Mage using Docker or `pip`:

## Using Docker

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

## Using pip

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
