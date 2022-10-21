# Sources

A source is a system that you want to load data from and synchronize it into another system.
A source can be a 3rd party API, SaaS, database, data warehouse, or a data lake.

Sources are defined in the `mage_integrations/sources/` directory.

All sources should be a subclass of the `Source` class defined in
`mage_integrations/sources/base.py`.
