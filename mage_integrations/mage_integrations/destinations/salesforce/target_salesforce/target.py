"""Salesforce target class."""

from singer_sdk.target_base import Target
from singer_sdk import typing as th
from singer_sdk.exceptions import ConfigValidationError

from target_salesforce.sinks import (
    SalesforceSink,
)


class TargetSalesforce(Target):
    """Sample target for Salesforce."""

    name = "target-salesforce"
    config_jsonschema = th.PropertiesList(
        th.Property(
            "client_id", 
            th.StringType, 
            description="OAuth client_id",
        ),
        th.Property(
            "client_secret",
            th.StringType,
            secret=True,
            description="OAuth client_secret",
        ),
        th.Property(
            "refresh_token",
            th.StringType,
            secret=True,
            description="OAuth refresh_token",
        ),
        th.Property(
            "username", 
            th.StringType, 
            description="User/password username",
        ),
        th.Property(
            "password", 
            th.StringType, 
            secret=True, 
            description="User/password username",
        ),
        th.Property(
            "security_token",
            th.StringType,
            secret=True,
            description="User/password generated security token. Reset under your Account Settings",
        ),
        th.Property(
            "domain",
            th.StringType,
            default="login",
            description="Your Salesforce instance domain. Use 'login' (default) or 'test' (sandbox), or Salesforce My domain."
        ),
        th.Property(
            "is_sandbox",
            th.BooleanType,
            description="DEPRECATED: Use domain. is_sandbox-False = 'login', is_sandbox-True = 'test'",
        ),
        th.Property(
            "action",
            th.StringType,
            default="update",
            allowed_values=SalesforceSink.valid_actions,
            description="How to handle incomming records by default (insert/update/upsert/delete/hard_delete)",
        ),
        th.Property(
            "allow_failures",
            th.BooleanType,
            default=False,
            description="Allows the target to continue persisting if a record fails to commit",
        ),
    ).to_dict()
    default_sink_class = SalesforceSink

    def __init__(self, *, config= None, parse_env_config: bool = False, validate_config: bool = True) -> None:
        super().__init__(config=config, parse_env_config=parse_env_config, validate_config=validate_config)
        print(self.config.get("is_sandbox"))
        if self.config.get("is_sandbox") is not None:
            raise ConfigValidationError("is_sandbox has been deprecated, use domain. is_sandbox-False = 'login', is_sandbox-True = 'test'")
