# Setup

You can install Mage using Docker or `pip`:

## Using Docker

##### 1. Create new project and launch tool

```bash
docker run -it -p 6789:6789 -v $(pwd):/home/src \
  mageai/mageai mage start [project_name]
```

Open [http://localhost:6789](http://localhost:6789) in your browser and build a pipeline.

##### 2. Run pipeline after building it in the tool
```bash
docker run -it -p 6789:6789 -v $(pwd):/home/src \
  mageai/mageai mage run [project_name] [pipeline]
```

##### Initialize new project
If you want to create a different project with a different name, run the following:

```bash
docker run -it -p 6789:6789 -v $(pwd):/home/src \
  mageai/mageai mage init [project_name]
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

##### 2. Create new project and launch tool
```bash
mage start [project_name]
```

Open [http://localhost:6789](http://localhost:6789) in your browser and build a pipeline.

##### 3. Run pipeline after building it in the tool
```bash
mage run [project_name] [pipeline]
```

##### Initialize new project
If you want to create a different project with a different name, run the following:
```bash
mage init [project_name]
```
