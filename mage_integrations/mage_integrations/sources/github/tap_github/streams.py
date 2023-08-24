from datetime import datetime

import singer
from singer import bookmarks, metadata, metrics

LOGGER = singer.get_logger()
DATE_FORMAT = "%Y-%m-%dT%H:%M:%SZ"


def get_bookmark(state, repo, stream_name, bookmark_key, start_date):
    """
    Return bookmark value if available in the state otherwise return start date
    """
    repo_stream_dict = bookmarks.get_bookmark(state, repo, stream_name)
    if repo_stream_dict:
        return repo_stream_dict.get(bookmark_key)

    return start_date


def get_schema(catalog, stream_id):
    """
    Return catalog of the specified stream.
    """
    stream_catalog = [cat for cat in catalog if cat["tap_stream_id"] == stream_id][0]
    return stream_catalog


def get_child_full_url(domain, child_object, repo_path, parent_id, grand_parent_id):
    """
    Build the child stream's URL based on the parent and the grandparent's ids.
    """

    if child_object.use_repository:
        # The `use_repository` represents that the url contains /repos and the repository name.
        child_full_url = "{}/repos/{}/{}".format(
            domain, repo_path, child_object.path
        ).format(*parent_id)

    elif child_object.use_organization:
        # The `use_organization` represents that the url contains the organization name.
        child_full_url = "{}/{}".format(domain, child_object.path).format(
            repo_path, *parent_id, *grand_parent_id
        )

    else:
        # Build and return url that does not contain the repos or the organization name.
        # Example: https://base_url/projects/{project_id}/columns
        child_full_url = "{}/{}".format(domain, child_object.path).format(
            *grand_parent_id
        )
    LOGGER.info("Final url is: %s", child_full_url)

    return child_full_url


class Stream:
    """
    A base class representing tap-github streams.
    """

    tap_stream_id = None
    replication_method = None
    replication_keys = None
    key_properties = []
    path = None
    filter_param = False
    id_keys = []
    use_organization = False
    children = []
    pk_child_fields = []
    use_repository = False
    headers = {"Accept": "*/*"}
    parent = None

    def build_url(self, base_url, repo_path, bookmark):
        """
        Build the full url with parameters and attributes.
        """
        if self.filter_param:
            # Add the since parameter for incremental streams
            query_string = "?since={}".format(bookmark)
        else:
            query_string = ""

        if self.use_organization:
            # The `use_organization` represents that the url contains the organization name.
            full_url = "{}/{}".format(base_url, self.path).format(repo_path)
        else:
            # The url that contains /repos and the repository name.
            full_url = "{}/repos/{}/{}{}".format(
                base_url, repo_path, self.path, query_string
            )

        LOGGER.info("Final url is: %s", full_url)
        return full_url

    def get_min_bookmark(
        self, stream, selected_streams, bookmark, repo_path, start_date, state
    ):
        """
        Get the minimum bookmark from the parent and its corresponding child bookmarks.
        """

        stream_obj = STREAMS[stream]()
        min_bookmark = bookmark
        if stream in selected_streams:
            # Get minimum of stream's bookmark(start date in case of no bookmark) and min_bookmark
            min_bookmark = min(
                min_bookmark,
                get_bookmark(state, repo_path, stream, "since", start_date),
            )
            LOGGER.debug("New minimum bookmark is %s", min_bookmark)

        for child in stream_obj.children:
            # Iterate through all children and return minimum bookmark among all.
            min_bookmark = min(
                min_bookmark,
                self.get_min_bookmark(
                    child, selected_streams, min_bookmark, repo_path, start_date, state
                ),
            )

        return min_bookmark

    def write_bookmarks(
        self, stream, selected_streams, bookmark_value, repo_path, state
    ):
        """Write the bookmark in the state corresponding to the stream."""
        stream_obj = STREAMS[stream]()

        # If the stream is selected, write the bookmark.
        if stream in selected_streams:
            singer.write_bookmark(
                state, repo_path, stream_obj.tap_stream_id, {"since": bookmark_value}
            )

        # For the each child, write the bookmark if it is selected.
        for child in stream_obj.children:
            self.write_bookmarks(
                child, selected_streams, bookmark_value, repo_path, state
            )

    # pylint: disable=no-self-use
    def get_child_records(
        self,
        client,
        catalog,
        child_stream,
        grand_parent_id,
        repo_path,
        state,
        start_date,
        bookmark_dttm,
        stream_to_sync,
        selected_stream_ids,
        parent_id=None,
        parent_record=None,
    ):
        """
        Retrieve and write all the child records for each updated parent based on the parent record and its ids.
        """
        child_object = STREAMS[child_stream]()

        child_bookmark_value = get_bookmark(
            state, repo_path, child_object.tap_stream_id, "since", start_date
        )

        if not parent_id:
            parent_id = grand_parent_id

        child_full_url = get_child_full_url(
            client.base_url, child_object, repo_path, parent_id, grand_parent_id
        )
        stream_catalog = get_schema(catalog, child_object.tap_stream_id)

        with metrics.record_counter(child_object.tap_stream_id) as counter:
            for response in client.authed_get_all_pages(
                child_object.tap_stream_id,
                child_full_url,
                stream=child_object.tap_stream_id,
            ):
                records = response.json()
                extraction_time = singer.utils.now()

                if isinstance(records, list):
                    # Loop through all the records of response
                    for record in records:
                        record["_sdc_repository"] = repo_path
                        child_object.add_fields_at_1st_level(
                            record=record, parent_record=parent_record
                        )

                        with singer.Transformer() as transformer:
                            rec = transformer.transform(
                                record,
                                stream_catalog["schema"],
                                metadata=metadata.to_map(stream_catalog["metadata"]),
                            )

                            if (
                                child_object.tap_stream_id in selected_stream_ids
                                and record.get(
                                    child_object.replication_keys, start_date
                                )
                                >= child_bookmark_value
                            ):
                                singer.write_record(
                                    child_object.tap_stream_id,
                                    rec,
                                    time_extracted=extraction_time,
                                )
                                counter.increment()

                        # Loop thru each child and nested child in the parent and fetch all the child records.
                        for nested_child in child_object.children:
                            if nested_child in stream_to_sync:
                                # Collect id of child record to pass in the API of its sub-child.
                                child_id = tuple(
                                    record.get(key)
                                    for key in STREAMS[nested_child]().id_keys
                                )
                                # Here, grand_parent_id is the id of 1st level parent(main parent) which is required to
                                # pass in the API of the current child's sub-child.
                                child_object.get_child_records(
                                    client,
                                    catalog,
                                    nested_child,
                                    child_id,
                                    repo_path,
                                    state,
                                    start_date,
                                    bookmark_dttm,
                                    stream_to_sync,
                                    selected_stream_ids,
                                    grand_parent_id,
                                    record,
                                )

                else:
                    # Write JSON response directly if it is a single record only.
                    records["_sdc_repository"] = repo_path
                    child_object.add_fields_at_1st_level(
                        record=records, parent_record=parent_record
                    )

                    with singer.Transformer() as transformer:
                        rec = transformer.transform(
                            records,
                            stream_catalog["schema"],
                            metadata=metadata.to_map(stream_catalog["metadata"]),
                        )
                        if (
                            child_object.tap_stream_id in selected_stream_ids
                            and records.get(child_object.replication_keys, start_date)
                            >= child_bookmark_value
                        ):
                            singer.write_record(
                                child_object.tap_stream_id,
                                rec,
                                time_extracted=extraction_time,
                            )

    # pylint: disable=unnecessary-pass
    def add_fields_at_1st_level(self, record, parent_record=None):
        """
        Add fields in the record explicitly at the 1st level of JSON.
        """
        pass


class FullTableStream(Stream):
    def sync_endpoint(
        self,
        client,
        state,
        catalog,
        repo_path,
        start_date,
        selected_stream_ids,
        stream_to_sync,
    ):
        """
        A common function sync full table streams.
        """

        # build full url
        full_url = self.build_url(client.base_url, repo_path, None)

        stream_catalog = get_schema(catalog, self.tap_stream_id)

        with metrics.record_counter(self.tap_stream_id) as counter:
            for response in client.authed_get_all_pages(
                self.tap_stream_id, full_url, self.headers, stream=self.tap_stream_id
            ):
                records = response.json()
                extraction_time = singer.utils.now()
                # Loop through all records
                for record in records:
                    record["_sdc_repository"] = repo_path
                    self.add_fields_at_1st_level(record=record, parent_record=None)

                    with singer.Transformer() as transformer:
                        rec = transformer.transform(
                            record,
                            stream_catalog["schema"],
                            metadata=metadata.to_map(stream_catalog["metadata"]),
                        )
                        if self.tap_stream_id in selected_stream_ids:
                            singer.write_record(
                                self.tap_stream_id, rec, time_extracted=extraction_time
                            )

                            counter.increment()

                    for child in self.children:
                        if child in stream_to_sync:
                            parent_id = tuple(
                                record.get(key) for key in STREAMS[child]().id_keys
                            )

                            # Sync child stream, if it is selected or its nested child is selected.
                            self.get_child_records(
                                client,
                                catalog,
                                child,
                                parent_id,
                                repo_path,
                                state,
                                start_date,
                                record.get(self.replication_keys),
                                stream_to_sync,
                                selected_stream_ids,
                                parent_record=record,
                            )

        return state


class IncrementalStream(Stream):
    def sync_endpoint(
        self,
        client,
        state,
        catalog,
        repo_path,
        start_date,
        selected_stream_ids,
        stream_to_sync,
    ):
        """
        A common function sync incremental streams. Sync an incremental stream for which records are not
        in descending order. For, incremental streams iterate all records, write only newly updated records and
        write the latest bookmark value.
        """

        parent_bookmark_value = get_bookmark(
            state, repo_path, self.tap_stream_id, "since", start_date
        )
        current_time = datetime.today().strftime(DATE_FORMAT)
        min_bookmark_value = self.get_min_bookmark(
            self.tap_stream_id,
            selected_stream_ids,
            current_time,
            repo_path,
            start_date,
            state,
        )

        max_bookmark_value = min_bookmark_value

        # build full url
        full_url = self.build_url(client.base_url, repo_path, min_bookmark_value)

        stream_catalog = get_schema(catalog, self.tap_stream_id)

        with metrics.record_counter(self.tap_stream_id) as counter:
            for response in client.authed_get_all_pages(
                self.tap_stream_id, full_url, self.headers, stream=self.tap_stream_id
            ):
                records = response.json()
                extraction_time = singer.utils.now()
                # Loop through all records
                for record in records:
                    record["_sdc_repository"] = repo_path
                    self.add_fields_at_1st_level(record=record, parent_record=None)

                    with singer.Transformer() as transformer:
                        if record.get(self.replication_keys):
                            if record[self.replication_keys] >= max_bookmark_value:
                                # Update max_bookmark_value
                                max_bookmark_value = record[self.replication_keys]

                            bookmark_dttm = record[self.replication_keys]

                            # Keep only records whose bookmark is after the last_datetime
                            if bookmark_dttm >= min_bookmark_value:
                                if (
                                    self.tap_stream_id in selected_stream_ids
                                    and bookmark_dttm >= parent_bookmark_value
                                ):
                                    rec = transformer.transform(
                                        record,
                                        stream_catalog["schema"],
                                        metadata=metadata.to_map(
                                            stream_catalog["metadata"]
                                        ),
                                    )

                                    singer.write_record(
                                        self.tap_stream_id,
                                        rec,
                                        time_extracted=extraction_time,
                                    )
                                    counter.increment()

                                for child in self.children:
                                    if child in stream_to_sync:
                                        parent_id = tuple(
                                            record.get(key)
                                            for key in STREAMS[child]().id_keys
                                        )

                                        # Sync child stream, if it is selected or its nested child is selected.
                                        self.get_child_records(
                                            client,
                                            catalog,
                                            child,
                                            parent_id,
                                            repo_path,
                                            state,
                                            start_date,
                                            record.get(self.replication_keys),
                                            stream_to_sync,
                                            selected_stream_ids,
                                            parent_record=record,
                                        )
                        else:
                            LOGGER.warning(
                                "Skipping this record for %s stream with %s = %s as it is missing replication key %s.",
                                self.tap_stream_id,
                                self.key_properties,
                                record[self.key_properties],
                                self.replication_keys,
                            )

            # Write bookmark for incremental stream.
            self.write_bookmarks(
                self.tap_stream_id,
                selected_stream_ids,
                max_bookmark_value,
                repo_path,
                state,
            )

        return state


class IncrementalOrderedStream(Stream):
    def sync_endpoint(
        self,
        client,
        state,
        catalog,
        repo_path,
        start_date,
        selected_stream_ids,
        stream_to_sync,
    ):
        """
        A sync function for streams that have records in the descending order of replication key value. For such streams,
        iterate only the latest records.
        """
        bookmark_value = get_bookmark(
            state, repo_path, self.tap_stream_id, "since", start_date
        )
        current_time = datetime.today().strftime(DATE_FORMAT)

        min_bookmark_value = self.get_min_bookmark(
            self.tap_stream_id,
            selected_stream_ids,
            current_time,
            repo_path,
            start_date,
            state,
        )
        bookmark_time = singer.utils.strptime_to_utc(min_bookmark_value)

        # Build full url
        full_url = self.build_url(client.base_url, repo_path, bookmark_value)
        synced_all_records = False
        stream_catalog = get_schema(catalog, self.tap_stream_id)

        parent_bookmark_value = bookmark_value
        record_counter = 0
        with metrics.record_counter(self.tap_stream_id) as counter:
            for response in client.authed_get_all_pages(
                self.tap_stream_id, full_url, stream=self.tap_stream_id
            ):
                records = response.json()
                extraction_time = singer.utils.now()
                for record in records:
                    record["_sdc_repository"] = repo_path
                    self.add_fields_at_1st_level(record=record, parent_record=None)

                    updated_at = record.get(self.replication_keys)

                    if record_counter == 0 and updated_at > bookmark_value:
                        # Consider replication key value of 1st record as bookmark value.
                        # Because all records are in descending order of replication key value
                        bookmark_value = updated_at
                    record_counter = record_counter + 1

                    if updated_at:
                        if (
                            bookmark_time
                            and singer.utils.strptime_to_utc(updated_at) < bookmark_time
                        ):
                            # Skip all records from now onwards because the bookmark value of the current record is less than
                            # last saved bookmark value and all records from now onwards will have bookmark value less than last
                            # saved bookmark value.
                            synced_all_records = True
                            break

                        if (
                            self.tap_stream_id in selected_stream_ids
                            and updated_at >= parent_bookmark_value
                        ):
                            # Transform and write record
                            with singer.Transformer() as transformer:
                                rec = transformer.transform(
                                    record,
                                    stream_catalog["schema"],
                                    metadata=metadata.to_map(
                                        stream_catalog["metadata"]
                                    ),
                                )
                                singer.write_record(
                                    self.tap_stream_id,
                                    rec,
                                    time_extracted=extraction_time,
                                )
                                counter.increment()

                        for child in self.children:
                            if child in stream_to_sync:
                                parent_id = tuple(
                                    record.get(key) for key in STREAMS[child]().id_keys
                                )

                                # Sync child stream, if it is selected or its nested child is selected.
                                self.get_child_records(
                                    client,
                                    catalog,
                                    child,
                                    parent_id,
                                    repo_path,
                                    state,
                                    start_date,
                                    record.get(self.replication_keys),
                                    stream_to_sync,
                                    selected_stream_ids,
                                    parent_record=record,
                                )
                    else:
                        LOGGER.warning(
                            "Skipping this record for %s stream with %s = %s as it is missing replication key %s.",
                            self.tap_stream_id,
                            self.key_properties,
                            record[self.key_properties],
                            self.replication_keys,
                        )

                if synced_all_records:
                    break

            # Write bookmark for incremental stream.
            self.write_bookmarks(
                self.tap_stream_id,
                selected_stream_ids,
                bookmark_value,
                repo_path,
                state,
            )

        return state


class Reviews(IncrementalStream):
    """
    https://docs.github.com/en/rest/reference/pulls#list-reviews-for-a-pull-request
    """

    tap_stream_id = "reviews"
    replication_method = "INCREMENTAL"
    replication_keys = "submitted_at"
    key_properties = ["id"]
    path = "pulls/{}/reviews"
    use_repository = True
    id_keys = ["number"]
    parent = "pull_requests"

    def add_fields_at_1st_level(self, record, parent_record=None):
        """
        Add fields in the record explicitly at the 1st level of JSON.
        """
        record["pr_id"] = parent_record["id"]


class ReviewComments(IncrementalOrderedStream):
    """
    https://docs.github.com/en/rest/pulls/comments#get-a-review-comment-for-a-pull-request
    """

    tap_stream_id = "review_comments"
    replication_method = "INCREMENTAL"
    replication_keys = "updated_at"
    key_properties = ["id"]
    path = "pulls/{}/comments?sort=updated_at&direction=desc"
    use_repository = True
    id_keys = ["number"]
    parent = "pull_requests"

    def add_fields_at_1st_level(self, record, parent_record=None):
        """
        Add fields in the record explicitly at the 1st level of JSON.
        """
        record["pr_id"] = parent_record["id"]


class PRCommits(IncrementalStream):
    """
    https://docs.github.com/en/rest/reference/pulls#list-commits-on-a-pull-request
    """

    tap_stream_id = "pr_commits"
    replication_method = "INCREMENTAL"
    replication_keys = "updated_at"
    key_properties = ["id"]
    path = "pulls/{}/commits"
    use_repository = True
    id_keys = ["number"]
    parent = "pull_requests"

    def add_fields_at_1st_level(self, record, parent_record=None):
        """
        Add fields in the record explicitly at the 1st level of JSON.
        """
        record["updated_at"] = record["commit"]["committer"]["date"]

        record["pr_number"] = parent_record.get("number")
        record["pr_id"] = parent_record.get("id")
        record["id"] = "{}-{}".format(parent_record.get("id"), record.get("sha"))


class PullRequests(IncrementalOrderedStream):
    """
    https://developer.github.com/v3/pulls/#list-pull-requests
    """

    tap_stream_id = "pull_requests"
    replication_method = "INCREMENTAL"
    replication_keys = "updated_at"
    key_properties = ["id"]
    path = "pulls?state=all&sort=updated&direction=desc"
    children = ["reviews", "review_comments", "pr_commits"]
    pk_child_fields = ["number"]


class ProjectCards(IncrementalStream):
    """
    https://docs.github.com/en/rest/reference/projects#list-project-cards
    """

    tap_stream_id = "project_cards"
    replication_method = "INCREMENTAL"
    replication_keys = "updated_at"
    key_properties = ["id"]
    path = "projects/columns/{}/cards"
    tap_stream_id = "project_cards"
    parent = "project_columns"
    id_keys = ["id"]


class ProjectColumns(IncrementalStream):
    """
    https://docs.github.com/en/rest/reference/projects#list-project-columns
    """

    tap_stream_id = "project_columns"
    replication_method = "INCREMENTAL"
    replication_keys = "updated_at"
    key_properties = ["id"]
    path = "projects/{}/columns"
    children = ["project_cards"]
    parent = "projects"
    id_keys = ["id"]
    has_children = True


class Projects(IncrementalStream):
    """
    https://docs.github.com/en/rest/reference/projects#list-repository-projects
    """

    tap_stream_id = "projects"
    replication_method = "INCREMENTAL"
    replication_keys = "updated_at"
    key_properties = ["id"]
    path = "projects?state=all"
    tap_stream_id = "projects"
    children = ["project_columns"]
    child_objects = [ProjectColumns()]


class TeamMemberships(FullTableStream):
    """
    https://docs.github.com/en/rest/reference/teams#get-team-membership-for-a-user
    """

    tap_stream_id = "team_memberships"
    replication_method = "FULL_TABLE"
    key_properties = ["url"]
    path = "orgs/{}/teams/{}/memberships/{}"
    use_organization = True
    parent = "team_members"
    id_keys = ["login"]

    def add_fields_at_1st_level(self, record, parent_record=None):
        """
        Add fields in the record explicitly at the 1st level of JSON.
        """
        record["login"] = parent_record["login"]


class TeamMembers(FullTableStream):
    """
    https://docs.github.com/en/rest/reference/teams#list-team-members
    """

    tap_stream_id = "team_members"
    replication_method = "FULL_TABLE"
    key_properties = ["team_slug", "id"]
    path = "orgs/{}/teams/{}/members"
    use_organization = True
    id_keys = ["slug"]
    children = ["team_memberships"]
    has_children = True
    parent = "teams"
    pk_child_fields = ["login"]

    def add_fields_at_1st_level(self, record, parent_record=None):
        """
        Add fields in the record explicitly at the 1st level of JSON.
        """
        record["team_slug"] = parent_record["slug"]


class Teams(FullTableStream):
    """
    https://docs.github.com/en/rest/reference/teams#list-teams
    """

    tap_stream_id = "teams"
    replication_method = "FULL_TABLE"
    key_properties = ["id"]
    path = "orgs/{}/teams"
    use_organization = True
    children = ["team_members"]
    pk_child_fields = ["slug"]


class Commits(IncrementalStream):
    """
    https://docs.github.com/en/rest/commits/commits#list-commits-on-a-repository
    """

    tap_stream_id = "commits"
    replication_method = "INCREMENTAL"
    replication_keys = "updated_at"
    key_properties = ["sha"]
    path = "commits"
    filter_param = True

    def add_fields_at_1st_level(self, record, parent_record=None):
        """
        Add fields in the record explicitly at the 1st level of JSON.
        """
        record["updated_at"] = record["commit"]["committer"]["date"]


class Comments(IncrementalOrderedStream):
    """
    https://docs.github.com/en/rest/issues/comments#list-comments-in-a-repository
    """

    tap_stream_id = "comments"
    replication_method = "INCREMENTAL"
    replication_keys = "updated_at"
    key_properties = ["id"]
    filter_param = True
    path = "issues/comments?sort=updated&direction=desc"


class Issues(IncrementalOrderedStream):
    """
    https://docs.github.com/en/rest/issues/issues#list-repository-issues
    """

    tap_stream_id = "issues"
    replication_method = "INCREMENTAL"
    replication_keys = "updated_at"
    key_properties = ["id"]
    filter_param = True
    path = "issues?state=all&sort=updated&direction=desc"


class Assignees(FullTableStream):
    """
    https://docs.github.com/en/rest/issues/assignees#list-assignees
    """

    tap_stream_id = "assignees"
    replication_method = "FULL_TABLE"
    key_properties = ["id"]
    path = "assignees"


class Releases(FullTableStream):
    """
    https://docs.github.com/en/rest/releases/releases#list-releases
    """

    tap_stream_id = "releases"
    replication_method = "FULL_TABLE"
    key_properties = ["id"]
    path = "releases?sort=created_at&direction=desc"


class IssueLabels(FullTableStream):
    """
    https://docs.github.com/en/rest/issues/labels#list-labels-for-a-repository
    """

    tap_stream_id = "issue_labels"
    replication_method = "FULL_TABLE"
    key_properties = ["id"]
    path = "labels"


class IssueEvents(IncrementalOrderedStream):
    """
    https://docs.github.com/en/rest/reference/issues#list-issue-events-for-a-repository
    """

    tap_stream_id = "issue_events"
    replication_method = "INCREMENTAL"
    replication_keys = "created_at"
    key_properties = ["id"]
    path = "issues/events?sort=created_at&direction=desc"


class Events(IncrementalStream):
    """
    https://docs.github.com/en/rest/activity/events#list-repository-events
    """

    tap_stream_id = "events"
    replication_method = "INCREMENTAL"
    replication_keys = "created_at"
    key_properties = ["id"]
    path = "events"


class CommitComments(IncrementalStream):
    """
    https://docs.github.com/en/rest/commits/comments#list-commit-comments-for-a-repository
    """

    tap_stream_id = "commit_comments"
    replication_method = "INCREMENTAL"
    replication_keys = "updated_at"
    key_properties = ["id"]
    path = "comments"


class IssueMilestones(IncrementalOrderedStream):
    """
    https://docs.github.com/en/rest/issues/milestones#list-milestones
    """

    tap_stream_id = "issue_milestones"
    replication_method = "INCREMENTAL"
    replication_keys = "updated_at"
    key_properties = ["id"]
    path = "milestones?direction=desc&sort=updated_at"


class Collaborators(FullTableStream):
    """
    https://docs.github.com/en/rest/collaborators/collaborators#list-repository-collaborators
    """

    tap_stream_id = "collaborators"
    replication_method = "FULL_TABLE"
    key_properties = ["id"]
    path = "collaborators"


class StarGazers(FullTableStream):
    """
    https://docs.github.com/en/rest/activity/starring#list-stargazers
    """

    tap_stream_id = "stargazers"
    replication_method = "FULL_TABLE"
    key_properties = ["user_id"]
    path = "stargazers"
    headers = {"Accept": "application/vnd.github.v3.star+json"}

    def add_fields_at_1st_level(self, record, parent_record=None):
        """
        Add fields in the record explicitly at the 1st level of JSON.
        """
        record["user_id"] = record["user"]["id"]


# Dictionary of the stream classes
STREAMS = {
    "commits": Commits,
    "comments": Comments,
    "issues": Issues,
    "assignees": Assignees,
    "releases": Releases,
    "issue_labels": IssueLabels,
    "issue_events": IssueEvents,
    "events": Events,
    "commit_comments": CommitComments,
    "issue_milestones": IssueMilestones,
    "projects": Projects,
    "project_columns": ProjectColumns,
    "project_cards": ProjectCards,
    "pull_requests": PullRequests,
    "reviews": Reviews,
    "review_comments": ReviewComments,
    "pr_commits": PRCommits,
    "teams": Teams,
    "team_members": TeamMembers,
    "team_memberships": TeamMemberships,
    "collaborators": Collaborators,
    "stargazers": StarGazers,
}
