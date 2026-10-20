from typing import Any, Dict, Generator, Iterable, List, Optional


class BaseStream:
    def __init__(self, client, config, stream, logger):
        self.client = client
        self.config = config
        self.stream = stream
        self.logger = logger

    def get_next_page_token(
        self, response: Dict, previous_token: Optional[Any]
    ) -> Any:
        return None

    def get_url_params(
        self, context: Optional[dict], next_page_token: Optional[Any]
    ) -> Dict[str, Any]:
        return dict()

    def load_data(self, bookmarks: Dict = None) -> Generator[List[Dict], None, None]:
        page_token = None
        while True:
            data = self.client.request(
                method='post',
                body=dict(
                    query=self.query,
                    variables=self.get_url_params(self.config, page_token),
                ),
            )
            results = list(self.parse_response(data))
            yield results
            page_token = self.get_next_page_token(data, page_token)

            if not page_token:
                break

        self.logger.info(f'Finish loading data for stream {self.__class__.__name__}.')


class WorkspacesStream(BaseStream):
    name = "workspaces"
    primary_keys = ["id"]
    replication_key = None

    @property
    def query(self) -> str:
        return """
            query {
              boards {
                workspace {
                  id
                  name
                  kind
                  description
                }
              }
            }
        """

    def parse_response(self, response: Dict) -> Iterable[dict]:
        for row in response["data"]["boards"]:
            workspace = row["workspace"]
            if workspace is not None:
                yield workspace


class BoardsStream(BaseStream):
    name = "boards"
    primary_keys = ["id"]
    replication_key = None

    def get_url_params(
        self, context: Optional[dict], next_page_token: Optional[Any]
    ) -> Dict[str, Any]:
        return {
            "page": next_page_token or 1,
            "board_limit": self.config["board_limit"]
        }

    @property
    def query(self) -> str:
        return """
            query ($page: Int!, $board_limit: Int!) {
                boards(limit: $board_limit, page: $page, order_by: created_at) {
                        id
                        updated_at
                        name
                        description
                        state
                        workspace_id
                        items {
                            id
                            name
                            state
                            created_at
                            updated_at
                            column_values {
                                id
                                title
                                text
                                type
                                value
                                additional_info
                            }
                        }
                    }
                }
        """

    def get_child_context(self, record: dict, context: Optional[dict]) -> dict:
        return {
            "board_id": record["id"],
        }

    def parse_response(self, response: Dict) -> Iterable[dict]:
        for row in response["data"]["boards"]:
            yield row

    def post_process(self, row: dict, context: Optional[dict] = None) -> dict:
        row["id"] = int(row["id"])
        for item in row["items"]:
            item["id"] = int(item["id"])
        return row

    def get_next_page_token(
        self, response: Dict, previous_token: Optional[Any]
    ) -> Any:
        current_page = previous_token if previous_token is not None else 1
        if len(response["data"][self.name]) == self.config["board_limit"]:
            next_page_token = current_page + 1
        else:
            next_page_token = None
        return next_page_token


class BoardViewsStream(BaseStream):
    name = "board_views"
    primary_keys = ["id"]
    replication_key = None
    parent_stream_type = BoardsStream
    ignore_parent_replication_keys = True
    # records_jsonpath: str = "$.data.boards[0].groups[*]"  # TODO: use records_jsonpath instead of overriding parse_response

    def get_url_params(
        self, context: Optional[dict], next_page_token: Optional[Any]
    ) -> Dict[str, Any]:
        return {
            "board_id": context["board_id"]
        }

    @property
    def query(self) -> str:
        return """
            query ($board_id: [Int]) {
                boards(ids: $board_id) {
                    views {
                        id
                        name
                        type
                        settings_str
                    }
                }
            }
        """

    def parse_response(self, response: Dict) -> Iterable[dict]:
        for row in response["data"]["boards"][0]["views"]:
            yield row


class GroupsStream(BaseStream):
    name = "groups"
    primary_keys = ["id"]
    replication_key = None
    parent_stream_type = BoardsStream
    ignore_parent_replication_keys = True
    # records_jsonpath: str = "$.data.boards[0].groups[*]"  # TODO: use records_jsonpath instead of overriding parse_response

    def get_url_params(
        self, context: Optional[dict], next_page_token: Optional[Any]
    ) -> Dict[str, Any]:
        return {
            "board_id": context["board_id"]
        }

    @property
    def query(self) -> str:
        return """
            query ($board_id: [Int]) {
                boards(ids: $board_id) {
                    groups() {
                        title
                        position
                        id
                        color
                    }
                }
            }
        """

    def parse_response(self, response: Dict) -> Iterable[dict]:
        for row in response["data"]["boards"][0]["groups"]:
            yield row

    def post_process(self, row: dict, context: Optional[dict] = None) -> dict:
        row["position"] = float(row["position"])
        row["board_id"] = context["board_id"]
        return row


class ColumnsStream(BaseStream):
    name = "columns"
    primary_keys = ["id"]
    replication_key = None
    parent_stream_type = BoardsStream
    ignore_parent_replication_keys = True
    # records_jsonpath: str = "$.data.boards[0].groups[*]"  # TODO: use records_jsonpath instead of overriding parse_response

    def get_url_params(
        self, context: Optional[dict], next_page_token: Optional[Any]
    ) -> Dict[str, Any]:
        return {
            "board_id": context["board_id"],
        }

    @property
    def query(self) -> str:
        return """
            query ($board_id: [Int]) {
                boards(ids: $board_id) {
                    columns {
                        archived
                        id
                        settings_str
                        title
                        type
                        width
                    }    
                }
            }
        """

    def parse_response(self, response: Dict) -> Iterable[dict]:
        for row in response["data"]["boards"]:
            for column in row["columns"]:
                yield column

    def post_process(self, row: dict, context: Optional[dict] = None) -> dict:
        row["board_id"] = context["board_id"]
        return row


STREAMS = dict(
    board_views=BoardViewsStream,
    boards=BoardsStream,
    columns=ColumnsStream,
    groups=GroupsStream,
    workspaces=WorkspacesStream,
)
