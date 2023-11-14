import json
from typing import List, Tuple

import ruamel.yaml


def load_json(json_file: str) -> dict:
    """
    Load JSON file.

    Args:
        json_file (str): The JSON file path.

    Returns:
        json_data (dict): JSON data as a python dictionary.
    """
    with open(json_file, "r") as f:
        json_data = json.load(f)

    return json_data


def generate_models_sql(catalog_data: dict, schema_name: str) -> List[Tuple[str, str]]:
    """
    Generate the SQL statements for each stream in the catalog data.

    Args:
        catalog_data (dict): Mage's integration pipeline catalog data.

    Returns:
        sql_statements (list[tuple[str, str]]): list of tuples containing the stream name
        and correspondent SQL statement.
    """
    sql_statements = []

    for stream in catalog_data["catalog"]["streams"]:
        stream_name = stream["destination_table"]
        columns = ",\n".join(stream["schema"]["properties"].keys())
        sql = f"SELECT\n {columns}\nFROM {{ source('{schema_name}', '{stream_name}') }} \n"
        sql_statements.append((stream_name, sql))

    return sql_statements


def generate_dbt_models(target_dir: str, sql_statements: List[Tuple[str, str]]):
    """
    Generate the dbt models for each stream in the catalog data.

    Args:
        target_dir (str): the dbt models target directory.
        sql_statements (list[tuple[str, str]]): a list of tuples containing the stream name and
        its correspondent SQL statement.
    """
    # Generate separate SQL files for each stream
    for stream_name, sql in sql_statements:
        file_name = f"{target_dir}/raw_{stream_name}.sql"
        with open(file_name, "w") as f:
            f.write(sql)

        print("Raw dbt model generated for stream", stream_name)

    print("SQL files generated successfully!")


def update_dbt_sources(catalog_data: dict, sources_file: str, schema_name: str):
    """
    Update the dbt sources YAML file with the new streams.

    Args:
        catalog_data (dict): Mage's integration pipeline catalog data.
        sources_file (str): The dbt sources YAML file.
        schema_name (str): The schema name where the integration pipeline is saving the data to.
    """
    yaml = ruamel.yaml.YAML()

    # Load YAML data from file
    with open(sources_file, "r") as f:
        yaml_data = yaml.load(f)

    schema_indexes = {
        source["schema"]: i for i, source in enumerate(yaml_data["sources"])
    }

    schema_index = schema_indexes.get(schema_name)

    # Add the passed schema to the YAML data if it doesn't exist
    if not schema_indexes.get(schema_name):
        schema_index = len(yaml_data["sources"])

        yaml_data["sources"].append(
            {
                "name": schema_name,
                "tables": [],
            }
        )

    # Add each stream as a table in the YAML data
    tables = [
        {
            "name": stream["destination_table"],
            "description": f"Table containing {stream['destination_table']}",
            "loaded_at_field": "_mage_created_at",
        }
        for stream in catalog_data["catalog"]["streams"]
    ]

    yaml_data["sources"][schema_index]["tables"].extend(tables)

    # Write the updated YAML data to file
    try:
        with open(sources_file, "w") as f:
            yaml.dump(yaml_data, f)

        print("YAML file updated successfully!")

    except Exception as e:
        print("Error updating YAML file:", e)
