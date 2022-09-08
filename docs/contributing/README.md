# 🙋‍♀️ Contributing
We welcome all contributions to Mage;
from small UI enhancements to brand new cleaning actions.
We love seeing community members level up and give people power-ups!

Got questions? Live chat with us in
[<img alt="Slack" height="20" src="https://thepostsportsbar.com/wp-content/uploads/2017/02/Slack-Logo.png" style="position: relative; top: 4px;" /> Slack](https://www.mage.ai/chat)

Anything you contribute, the Mage team and community will maintain. We’re in it together!

1. [Set up development environment](#set-up-development-environment)
1. [Debugging](#debugging)
1. [Guides](#guides)

## Set up development environment

First, create a new project:

```bash
$ ./scripts/init.sh [project_name]
```

Run the below script to build the Docker image and run all the services:

```bash
$ ./scripts/dev.sh [project]
```

## Debugging

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

### Backend server

Code for the web server is in `mage_ai/server/`.

### Front-end app

Code for the front-end app is in `mage_ai/frontend/`.

## Guides

1. [How to add a new chart type](./charts/how_to_add.md)

## Testing changes

Please read this [document](./testing.md).
