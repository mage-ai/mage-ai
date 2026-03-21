# Mage OSS

### Build modern data pipelines locally — fast, visual, and production-ready.

<br />

Mage OSS is a self-hosted development environment designed to help teams create production-grade data pipelines with confidence.

Ideal for automating ETL tasks, architecting data flow, or orchestrating transformations — all in a fast, notebook-style interface powered by modular code.

When it’s time to scale, [Mage Pro](https://mage.ai) — our core platform — unlocks enterprise orchestration, collaboration, and AI-powered workflows.

<br />

<a href="https://mage.ai"><img alt="Mage AI GitHub repo stars" src="https://img.shields.io/github/stars/mage-ai/mage-ai?style=for-the-badge&logo=github&labelColor=000000&logoColor=FFFFFF&label=stars&color=0500ff" /></a>
<a href="https://hub.docker.com/r/mageai/mageai"><img alt="Mage AI Docker downloads" src="https://img.shields.io/docker/pulls/mageai/mageai?style=for-the-badge&logo=docker&labelColor=000000&logoColor=FFFFFF&label=pulls&color=6A35FF" /></a>
<a href="https://github.com/mage-ai/mage-ai/blob/master/LICENSE"><img alt="Mage AI license" src="https://img.shields.io/github/license/mage-ai/mage-ai?style=for-the-badge&logo=codeigniter&labelColor=000000&logoColor=FFFFFF&label=license&color=FFCC19" /></a>
<a href="https://www.mage.ai/chat"><img alt="Join the Mage AI community" src="https://img.shields.io/badge/Join%20the%20community-black.svg?style=for-the-badge&logo=lightning&labelColor=000000&logoColor=FFFFFF&label=&color=DD55FF&logoWidth=20" /></a>

<br />

## What you can do with Mage OSS

- Build pipelines locally with Python, SQL, or R in a modular notebook-style UI

- Run jobs manually or on a schedule (cron supported)

- Connect to databases, APIs, and cloud storage with prebuilt connectors

- Debug visually with logs, live previews, and step-by-step execution

- Set up quickly with Docker, pip, or conda — no cloud account required

- Your go-to workspace for local pipeline development — fully in your control.
  
<img width="100%" alt="mage" src="https://github.com/user-attachments/assets/75992872-20a6-4120-8bf0-9c22a3d66450" />


<br /><br />

## Start local. Scale when you're ready.

Use Mage OSS to build and run pipelines on your machine. When you're ready for advanced tooling, performance, and AI-assisted productivity, Mage Pro is just one click away.

[**Try Mage Pro free →**](https://mage.ai)

<br />

### Quickstart

Install using Docker (recommended):

```bash
docker pull mageai/mageai:latest
```

Or with pip:

```bash
pip install mage-ai
```

Or with conda:

```bash
conda install -c conda-forge mage-ai
```

Full setup guide and docs: [docs.mage.ai](https://docs.mage.ai/getting-started/setup#%E2%9B%B5%EF%B8%8F-mage-oss-overview)

<br />

## Build And Deploy Docker Image

This repository includes a local `Dockerfile` that builds Mage from the current codebase instead of pulling `mageai/mageai:latest`.

Build the image locally:

```bash
docker build -t b2m-sage-ai:latest .
```

The Dockerfile now defaults to a slimmer runtime image. It installs the base app only,
without the full `.[all]` Python extras bundle or optional stacks like R, Sparkmagic,
MSSQL drivers, and extra git-based Python dependencies.

If you need those back, enable them explicitly at build time:

```bash
docker build \
  --build-arg MAGE_EXTRAS='dbt,postgres,mysql,oracle,redshift,s3,snowflake,spark' \
  --build-arg INSTALL_EXTRA_PY_DEPS=true \
  --build-arg INSTALL_SPARKMAGIC=true \
  --build-arg INSTALL_MSSQL=true \
  --build-arg INSTALL_R=true \
  -t b2m-sage-ai:latest .
```

This Docker build now regenerates the Mage frontend assets from `mage_ai/frontend`
by running:

```bash
yarn export_prod
yarn export_prod_base_path
```

inside a frontend build stage before the Python image is assembled.

For reverse-proxy/base-path deployments, `export_prod_base_path` now temporarily switches
to `next_base_path.config.js` so exported `_next` assets are generated with the
`CLOUD_NOTEBOOK_BASE_PATH_PLACEHOLDER_` prefix that Mage rewrites at runtime.

Run it locally:

```bash
docker run -it --rm \
  -p 6789:6789 \
  -p 7789:7789 \
  b2m-sage-ai:latest
```

Run it on port `6380` behind a reverse proxy path such as `/workspace/abc`:

```bash
docker run -it --rm \
  -p 6380:6380 \
  -e HOST=0.0.0.0 \
  -e PORT=6380 \
  -e MAGE_BASE_PATH=workspace/abc \
  -e MAGE_PUBLIC_HOST=http://IP/workspace/abc \
  b2m-sage-ai:latest
```

Then proxy `/workspace/abc/` to `http://127.0.0.1:6380/workspace/abc/`.

For Nginx:

```nginx
location /workspace/abc/ {
    proxy_pass http://127.0.0.1:6380/workspace/abc/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

Or run Traefik and Mage together with Docker Compose:

```bash
docker compose -f docker-compose.traefik.yml up --build -d
```

If you need a full clean rebuild after frontend or Dockerfile changes:

```bash
docker compose -f docker-compose.traefik.yml down
docker build --no-cache -t b2m-sage-ai:latest .
docker compose -f docker-compose.traefik.yml up -d
```

This exposes:

- Mage at `http://127.0.0.1/workspace/abc`
- Traefik dashboard at `http://localhost:8080`

Before using it on a real server, update `MAGE_PUBLIC_HOST` in `docker-compose.traefik.yml`
from `http://127.0.0.1/workspace/abc` to your real address, for example:

```yaml
MAGE_PUBLIC_HOST: http://192.168.1.10/workspace/abc
```

The Traefik compose file also sets:

```yaml
REQUIRE_USER_AUTHENTICATION: "false"
```

This avoids `401` responses on `/api/oauths` during the sign-in flow for this local reverse-proxy setup.

If you want to mount a local project into the container:

```bash
docker run -it --rm \
  -p 6789:6789 \
  -p 7789:7789 \
  -v "$(pwd)/default_repo:/home/src/default_repo" \
  b2m-sage-ai:latest
```

## Scripts

Use [scripts/publish_harbor.sh](/Users/tunasonmez/Documents/B2metric/core/test/mage-ai/scripts/publish_harbor.sh) to build and push a multi-platform image to Harbor with an env file.

```bash
cp .env.harbor.example .env.harbor
```

Required values in `.env.harbor`:

```bash
HARBOR_REGISTRY=harbor.b2metric.com
HARBOR_PROJECT=stc
HARBOR_USER=your-user
HARBOR_PASSWORD=your-password
```

Then run:

```bash
./scripts/publish_harbor.sh .env.harbor
```

By default, the script builds and pushes:

```bash
harbor.b2metric.com/stc/b2m-sage-ai:latest
```

The script also reads these optional values from `.env.harbor`:

- `IMAGE_NAME` defaults to `b2m-sage-ai`
- `IMAGE_TAG` defaults to `latest`
- `BUILD_PLATFORMS` defaults to `linux/amd64,linux/arm64`
- `BUILDER_NAME` defaults to `multiarch`
- `DOCKERFILE_PATH` defaults to `Dockerfile`
- `BUILD_CONTEXT` defaults to `.`
- `MAGE_EXTRAS` defaults to `postgres`
- `INSTALL_EXTRA_PY_DEPS` defaults to `true`
- `INSTALL_MSSQL` defaults to `false`
- `INSTALL_R` defaults to `false`
- `INSTALL_SPARKMAGIC` defaults to `false`

The Harbor script performs these steps:

1. Logs in to Harbor with `docker login`
2. Creates or reuses a Docker Buildx builder
3. Builds `linux/amd64,linux/arm64`
4. Pushes the multi-platform image to Harbor

Keep Harbor credentials in environment variables or CI secrets. Do not commit them into the repository.

<br />

## Core Features

| Feature | Description |
| :- | :- |
| Modular pipelines | Build pipelines block-by-block using Python, SQL, or R |
| Notebook UI | Interactive editor for writing and documenting logic |
| Data integrations | Prebuilt connectors to databases, APIs, and cloud storage |
| Scheduling | Trigger pipelines manually or on a schedule |
| Visual debugging | Step-by-step logs, data previews, and error handling |
| dbt support | Build and run dbt models directly inside Mage |

<br />

## Example Use Cases

- Move data from Google Sheets to Snowflake with a Python transform
- Schedule a daily SQL pipeline to clean and aggregate product data
- Develop dbt models in a visual notebook-style interface
- Run simple ETL/ELT jobs locally with full transparency

<br />

## Documentation

Looking for how-to guides, examples, or advanced configuration?

Explore our full documentation at [docs.mage.ai](https://docs.mage.ai).


<br />

## Contributing

We welcome contributions of all kinds — bug fixes, docs, new features, or community examples.

Start with our [contributing guide](https://docs.mage.ai/contributing/overview), check out open issues, or suggest improvements.

<br />

## Ready to scale? Mage Pro has you covered.

Mage Pro is a powered-up platform built for teams.
It adds everything you need for production pipelines, at scale.

- Magical AI-assisted development and debugging
- Multi-environment orchestration
- Role-based access control
- Real-time monitoring & alerts
- Powerful CI/CD & version control
- Powerful enterprise features
- Available fully managed, hybrid, or on-premises

[**Try Mage Pro free →**](https://mage.ai)
