import time

import backoff
import requests
import singer
from simplejson import JSONDecodeError
from singer import metrics

LOGGER = singer.get_logger()
DEFAULT_DOMAIN = "https://api.github.com"

# Set default timeout of 300 seconds
REQUEST_TIMEOUT = 300


class GithubException(Exception):
    pass


class Server5xxError(GithubException):
    pass


class BadCredentialsException(GithubException):
    pass


class AuthException(GithubException):
    pass


class NotFoundException(GithubException):
    pass


class BadRequestException(GithubException):
    pass


class InternalServerError(Server5xxError):
    pass


class UnprocessableError(GithubException):
    pass


class NotModifiedError(GithubException):
    pass


class MovedPermanentlyError(GithubException):
    pass


class ConflictError(GithubException):
    pass


class RateLimitExceeded(GithubException):
    pass


class TooManyRequests(GithubException):
    pass


ERROR_CODE_EXCEPTION_MAPPING = {
    301: {
        "raise_exception": MovedPermanentlyError,
        "message": "The resource you are looking for is moved to another URL.",
    },
    304: {
        "raise_exception": NotModifiedError,
        "message": "The requested resource has not been modified since the last time you accessed it.",
    },
    400: {
        "raise_exception": BadRequestException,
        "message": "The request is missing or has a bad parameter.",
    },
    401: {
        "raise_exception": BadCredentialsException,
        "message": "Invalid authorization credentials.",
    },
    403: {
        "raise_exception": AuthException,
        "message": "User doesn't have permission to access the resource.",
    },
    404: {
        "raise_exception": NotFoundException,
        "message": "The resource you have specified cannot be found. Alternatively the access_token is not valid for the resource",
    },
    409: {
        "raise_exception": ConflictError,
        "message": "The request could not be completed due to a conflict with the current state of the server.",
    },
    422: {
        "raise_exception": UnprocessableError,
        "message": "The request was not able to process right now.",
    },
    429: {"raise_exception": TooManyRequests, "message": "Too many requests occurred."},
    500: {
        "raise_exception": InternalServerError,
        "message": "An error has occurred at Github's end.",
    },
}


def raise_for_error(resp, source, stream, client, should_skip_404):
    """
    Retrieve the error code and the error message from the response and return custom exceptions accordingly.
    """
    error_code = resp.status_code
    try:
        response_json = resp.json()
    except JSONDecodeError:
        response_json = {}

    if (
        stream == "commits"
        and response_json.get("message") == "Git Repository is empty."
    ):
        LOGGER.info("Encountered an empty git repository")
        return None

    if error_code == 404 and should_skip_404:
        # Add not accessible stream into list.
        client.not_accessible_repos.add(stream)
        details = ERROR_CODE_EXCEPTION_MAPPING.get(error_code).get("message")
        if source == "teams":
            details += " or it is a personal account repository"
        message = "HTTP-error-code: 404, Error: {}. Please refer '{}' for more details.".format(
            details, response_json.get("documentation_url")
        )
        LOGGER.warning(message)
        # Don't raise a NotFoundException
        return None

    message = "HTTP-error-code: {}, Error: {}".format(
        error_code,
        ERROR_CODE_EXCEPTION_MAPPING.get(error_code, {}).get("message", "Unknown Error")
        if response_json == {}
        else response_json,
    )

    if error_code > 500:
        raise Server5xxError(message) from None

    exc = ERROR_CODE_EXCEPTION_MAPPING.get(error_code, {}).get(
        "raise_exception", GithubException
    )
    raise exc(message) from None


def calculate_seconds(epoch):
    """
    Calculate the seconds to sleep before making a new request.
    """
    current = time.time()
    return int(round((epoch - current), 0))


def rate_throttling(response):
    """
    For rate limit errors, get the remaining time before retrying and calculate the time to sleep before making a new request.
    """
    if "Retry-After" in response.headers:
        # handles the secondary rate limit
        seconds_to_sleep = int(response.headers["Retry-After"])
        if seconds_to_sleep > 0:
            LOGGER.info(
                "API rate limit exceeded. Tap will retry the data collection after %s seconds.",
                seconds_to_sleep,
            )
            time.sleep(seconds_to_sleep)
            # returns True if tap sleeps
            return True
    if "X-RateLimit-Remaining" in response.headers:
        if int(response.headers["X-RateLimit-Remaining"]) == 0:
            seconds_to_sleep = calculate_seconds(
                int(response.headers["X-RateLimit-Reset"])
            )
            LOGGER.info(
                "API rate limit exceeded. Tap will retry the data collection after %s seconds.",
                seconds_to_sleep,
            )
            # add the buffer 2 seconds
            time.sleep(seconds_to_sleep + 2)
            # returns True if tap sleeps
            return True
        return False

    # Raise an exception if `X-RateLimit-Remaining` is not found in the header.
    # API does include this key header if provided base URL is not a valid github custom domain.
    raise GithubException(
        "The API call using the specified base url was unsuccessful. Please double-check the provided base URL."
    )


class GithubClient:
    """
    The client class used for making REST calls to the Github API.
    """

    def __init__(self, config):
        self.config = config
        self.session = requests.Session()
        self.base_url = config["base_url"] if config.get("base_url") else DEFAULT_DOMAIN
        self.set_auth_in_session()
        self.not_accessible_repos = set()

    def get_request_timeout(self):
        """
        Get the request timeout from the config, if not present use the default 300 seconds.
        """
        # Get the value of request timeout from config
        config_request_timeout = self.config.get("request_timeout")

        # Only return the timeout value if it is passed in the config and the value is not 0, "0" or ""
        if config_request_timeout and float(config_request_timeout):
            return float(config_request_timeout)

        # Return default timeout
        return REQUEST_TIMEOUT

    def set_auth_in_session(self):
        """
        Set access token in the header for authorization.
        """
        access_token = self.config["access_token"]
        self.session.headers.update({"authorization": "token " + access_token})

    # pylint: disable=dangerous-default-value
    # During 'Timeout' error there is also possibility of 'ConnectionError',
    # hence added backoff for 'ConnectionError' too.
    @backoff.on_exception(
        backoff.expo,
        (requests.Timeout, requests.ConnectionError, Server5xxError, TooManyRequests),
        max_tries=5,
        factor=2,
    )
    def authed_get(self, source, url, headers={}, stream="", should_skip_404=True):
        """
        Call rest API and return the response in case of status code 200.
        """
        with metrics.http_request_timer(source) as timer:
            self.session.headers.update(headers)
            resp = self.session.request(
                method="get", url=url, timeout=self.get_request_timeout()
            )
            if rate_throttling(resp):
                # If the API rate limit is reached, the function will be recursively
                self.authed_get(source, url, headers, stream, should_skip_404)
            if resp.status_code != 200:
                raise_for_error(resp, source, stream, self, should_skip_404)
            timer.tags[metrics.Tag.http_status_code] = resp.status_code
            if resp.status_code in {404, 409}:
                # Return an empty response body since we're not raising a NotFoundException

                # In the 409 case, this is only for `commits` returning an
                # error for an empty repository, so we'll treat this as an
                # empty list of records to process
                resp._content = b"{}"  # pylint: disable=protected-access
            return resp

    def authed_get_all_pages(
        self, source, url, headers={}, stream="", should_skip_404=True
    ):
        """
        Fetch all pages of records and return them.
        """
        while True:
            r = self.authed_get(source, url, headers, stream, should_skip_404)
            yield r

            # Fetch the next page if next found in the response.
            if "next" in r.links:
                url = r.links["next"]["url"]
            else:
                # Break the loop if all pages are fetched.
                break

    def verify_repo_access(self, url_for_repo, repo):
        """
        Call rest API to verify that the user has sufficient permissions to access this repository.
        """
        try:
            self.authed_get(
                "verifying repository access", url_for_repo, stream="commits"
            )
        except NotFoundException:
            # Throwing user-friendly error message as it checks token access
            message = "HTTP-error-code: 404, Error: Please check the repository name '{}' or you do not have sufficient permissions to access this repository.".format(
                repo
            )
            raise NotFoundException(message) from None

    def verify_access_for_repo(self):
        """
        For all the repositories mentioned in the config, check the access for each repos.
        """
        (
            repositories,
            org,
        ) = self.extract_repos_from_config()  # pylint: disable=unused-variable

        for repo in repositories:
            url_for_repo = "{}/repos/{}/commits".format(self.base_url, repo)
            LOGGER.info("Verifying access of repository: %s", repo)

            # Verifying for Repo access
            self.verify_repo_access(url_for_repo, repo)

    def extract_orgs_from_config(self):
        """
        Extracts all organizations from the config
        """
        repo_paths = list(filter(None, self.config["repository"].split(" ")))
        orgs_paths = [repo.split("/")[0] for repo in repo_paths]

        return set(orgs_paths)

    def extract_repos_from_config(self):
        """
        Extracts all repositories from the config and calls get_all_repos()
        for organizations using the wildcard 'org/*' format.
        """
        repo_paths = list(filter(None, self.config["repository"].split(" ")))

        unique_repos = set()
        # Insert the duplicate repos found in the config repo_paths into duplicates
        duplicate_repos = [
            x for x in repo_paths if x in unique_repos or (unique_repos.add(x) or False)
        ]
        if duplicate_repos:
            LOGGER.warning(
                "Duplicate repositories found: %s and will be synced only once.",
                duplicate_repos,
            )

        repo_paths = list(set(repo_paths))

        orgs_with_all_repos = []
        orgs = []
        repos_with_errors = []
        for repo in repo_paths:
            # Split the repo_path by `/` as we are passing org/repo_name in the config.
            split_repo_path = repo.split("/")
            # Prepare list of organizations
            orgs.append(split_repo_path[0])
            # Check for the second element in the split list only if the length is greater than 1 and the first/second
            # element is not empty (for scenarios such as: `org/` or `/repo` which is invalid)
            if (
                len(split_repo_path) > 1
                and split_repo_path[1] != ""
                and split_repo_path[0] != ""
            ):
                # If the second element is *, we need to check access for all the repos.
                if split_repo_path[1] == "*":
                    orgs_with_all_repos.append(repo)
            else:
                # If `/`/repo name/organization not found, append the repo_path in the repos_with_errors
                repos_with_errors.append(repo)

        # If any repos found in repos_with_errors, raise an exception
        if repos_with_errors:
            raise GithubException(
                "Please provide valid organization/repository for: {}".format(
                    sorted(repos_with_errors)
                )
            )

        if orgs_with_all_repos:
            # Remove any wildcard "org/*" occurrences from `repo_paths`
            repo_paths = list(set(repo_paths).difference(set(orgs_with_all_repos)))

            # Get all repositories for an org in the config
            all_repos = self.get_all_repos(orgs_with_all_repos)

            # Update repo_paths
            repo_paths.extend(all_repos)

        return repo_paths, set(orgs)

    def get_all_repos(self, organizations: list):
        """
        Retrieves all repositories for the provided organizations and
        verifies basic access for them.

        Docs: https://docs.github.com/en/rest/reference/repos#list-organization-repositories
        """
        repos = []

        for org_path in organizations:
            org = org_path.split("/")[0]
            try:
                for response in self.authed_get_all_pages(
                    "get_all_repos",
                    "{}/orgs/{}/repos?sort=created&direction=desc".format(
                        self.base_url, org
                    ),
                    should_skip_404=False,
                ):
                    org_repos = response.json()
                    LOGGER.info("Collected repos for organization: %s", org)

                    for repo in org_repos:
                        repo_full_name = repo.get("full_name")
                        LOGGER.info(
                            "Verifying access of repository: %s", repo_full_name
                        )

                        self.verify_repo_access(
                            "{}/repos/{}/commits".format(self.base_url, repo_full_name),
                            repo,
                        )

                        repos.append(repo_full_name)
            except NotFoundException:
                # Throwing user-friendly error message as it checks token access
                message = "HTTP-error-code: 404, Error: Please check the organization name '{}' or you do not have sufficient permissions to access this organization.".format(
                    org
                )
                raise NotFoundException(message) from None

        return repos

    def __exit__(self, exception_type, exception_value, traceback):
        # Kill the session instance.
        self.session.close()
