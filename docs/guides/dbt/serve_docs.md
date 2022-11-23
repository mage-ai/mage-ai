# Serve DBT docs in production

To serve DBT docs in production, you will need to enable a container to host the DBT docs webserver in the cloud service you are using.

## Generating docs

Before enabling DBT docs in production, we need to make sure the static files for the docs are generated.

1. Configure the DBT super project.
    * Your DBT projects should be in the `/path/to/<mage_project>/dbt` directory.
        * The `/dbt` directory will serve as a "super-project" for all of your DBT projects in your Mage project.
    * Make sure the `/.../<mage_project>/dbt` directory has the files `dbt_project.yml`, `profiles.yml`, and `packages.yml`. These files are needed for DBT to create docs for all the projects within this directory.
        1. `dbt_project.yml`
            ```yaml
              name: 'base'
              version: '1.0.0'
              config-version: 2

              profile: 'base'

              target-path: "target" 
              clean-targets:
                - "target"
                - "dbt_packages"
            ```
        1. `profiles.yml`: The config in this file is not necessary, but it needs to compile.
            ```yaml
              base:
                target: dev
                outputs:
                  dev:
                    <output_config>
            ```
        1. `packages.yml`: Add all projects that you want to be included in the documentation.
            ```yaml
              packages:
                - local: ./project1
                - local: ./project2
            ```
2. Generate the DBT docs
    ```bash
      cd ./dbt
      dbt docs generate
    ```


## Terraform

### GCP

In the [mage-ai-terraform-templates](https://github.com/mage-ai/mage-ai-terraform-templates) repository, the template for GCP has commented out resources for enabling the DBT docs service. If you uncomment those resources, you should see an output at the end of `terraform apply` with the IP to access the DBT docs in the cloud.

```bash
Outputs:

docs_service_ip = "<dbt_docs_ip>"
service_ip = "<mage_ip>"
```

### AWS

Coming soon...