"""Monday tap class."""

from typing import List

from singer_sdk import Tap, Stream
from singer_sdk import typing as th


from tap_monday.streams import (
    WorkspacesStream,
    BoardsStream,
    BoardViewsStream,
    ColumnsStream,
    GroupsStream,
)

STREAM_TYPES = [
    WorkspacesStream,
    BoardsStream,
    BoardViewsStream,
    ColumnsStream,
    GroupsStream,
]


class TapMonday(Tap):
    """Monday tap class."""
    name = "tap-monday"

    config_jsonschema = th.PropertiesList(
        th.Property(
            "auth_token",
            th.StringType,
            required=True,
            description="The token to authenticate against the API service"
        ),
        th.Property(
            "board_limit",
            th.IntegerType,
            default=10,
            description="The number of boards to fetch at once"
        ),
    ).to_dict()

    def discover_streams(self) -> List[Stream]:
        """Return a list of discovered streams."""
        return [stream_class(tap=self) for stream_class in STREAM_TYPES]
