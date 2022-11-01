# 🎁 Contributing
We welcome all contributions to Mage;
from small UI enhancements to brand new cleaning actions.
We love seeing community members level up and give people power-ups!

Got questions? Live chat with us in
[<img alt="Slack" height="20" src="https://user-images.githubusercontent.com/78053898/198755650-3a314c52-36b5-4b73-a24b-16e1efcdd7f8.png" style="position: relative; top: 4px;" /> Slack](https://www.mage.ai/chat)

Anything you contribute, the Mage team and community will maintain. We’re in it together!

1. [Projects to contribute to](#projects-to-contribute-to)
1. [Set up development environment](#set-up-development-environment)
1. [Debugging](#debugging)
1. [Guides](#guides)

<br />

## Projects to contribute to

If you’re looking for cool projects to ship, check out the following:

|   |   |
| --- | --- |
| [GitHub issues](https://github.com/mage-ai/mage-ai/issues) | Small to medium complexity projects |
| [Roadmap](https://airtable.com/shrJS0cDOmQywb8vp) | Small to large complexity projects |

<br />

## Set up development environment

1. Create a new project:
    ```bash
    ./scripts/init.sh [project_name]
    ```
1. Run the below script to build the Docker image and run all the services:
    ```bash
    ./scripts/dev.sh [project]
    ```
1. Open your browser and go to [http://localhost:3000](http://localhost:3000).

<br />

## Debugging

Instead of using `breakpoint()`, add the following line to your code where you
want a debug:
```python
import pdb; pdb.set_trace()
```

Attach to running container to use debugger. To get the container ID, run `docker ps`
and look in the `NAMES` column.

```bash
docker attach [container_id]
```

<br />

### Backend server

Code for the web server is in [`mage_ai/server/`](../../mage_ai/server).

<br />

### Front-end app

Code for the front-end app is in [`mage_ai/frontend/`](../../mage_ai/frontend).

<br />

## Guides

1. [How to add a new chart type](./charts/how_to_add.md)
1. *More coming soon...*

<br />

## Testing changes

Please read this [document](./testing.md).

<br />
