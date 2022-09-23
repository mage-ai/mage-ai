# Triggering pipeline via API request

You can trigger a pipeline by making an API request.

## Prerequisites

1. [Create a pipeline](../features/orchestration/README.md#pipelines)
1. [Create a trigger](../features/orchestration/README.md#triggers)

<br />

## Configuring trigger type

When you create a new trigger or edit an existing one, choose the option `API`
under trigger type.

<br />

## API endpoint

The endpoint to use when making an API request will depend on the domain you’re
running Mage and the trigger’s unique ID.

For example, if you’re running Mage on localhost with port 6789 and the trigger you just created
has an ID of 3, then the API endpoint you’ll use is:

```
POST http://localhost:6789/api/pipeline_schedules/3/pipeline_runs
```

<br />

## Request payload

You can optionally include runtime variables in your request payload.
These runtime variables are accessible from within each pipeline block.

### Example

```json
{
  "pipeline_run": {
    "variables": {
      "env": "staging",
      "schema": "public"
    }
  }
}
```

When the pipeline is triggered by this API request,
each block in the pipeline can access all the values defined in the variables object
(e.g. `env`, `schema`) within the request payload
(in addition to the global variables defined within the pipeline itself).

To use those runtime variables, use the variable name as a key
when accessing the keyword arguments dictionary (`kwargs`) in the decorated function of your block.
For example:

```python
@data_loader
def load_data(**kwargs) -> DataFrame:
    env = kwargs['env']
    schema = kwargs['schema']

    # ...other code
```

You can include as many key value pairs within the variables object in the request payload as
you want.

<br />

## Sample cURL command

Here is a sample cURL command using the examples listed above:

```bash
curl -X POST http://localhost:6789/api/pipeline_schedules/3/pipeline_runs \
  --header 'Content-Type: application/json' \
  --data '
{
  "pipeline_run": {
    "variables": {
      "env": "staging",
      "schema": "public"
    }
  }
}'
```

<br />
