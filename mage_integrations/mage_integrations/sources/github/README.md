# GitHub

![GitHub](https://github.githubassets.com/images/modules/logos_page/GitHub-Logo.png)

<br />

## Config

You must supply the following parameters to use this tap:

| Key               | Description                                                                               | Sample value                               | Required |
| ----------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------ | -------- |
| `access_token`    | A GitHub access token containing credentials to access your desired repo.                 | `abcdefghijklmnopqrstuvwxyz1234567890ABCD` | ✅       |
| `repository`      | The repository path (everything after `github.com`)                                       | `mage-ai/mage-ai`                          | ✅       |
| `start_date`      | A sync start date                                                                         | `2021-01-01T00:00:00Z`                     | ✅       |
| `request_timeout` | Request timeout value in seconds                                                          | `300`                                      | ✅       |
| `base_url`        | The base url— this changes the repo base path, i.e. the url before the `repository` value | `https://api.github.com`                   | ✅       |

<br />

## Generating credentials

See [this guide](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) for generating a PAT.

## Supported endpoints

This tap:

- Pulls raw data from the GitHub REST API
- Extracts the following resources from GitHub for a single repository:
  - Assignees
  - Collaborators
  - Commits
  - Commit Comments
  - Events
  - Issues
  - Issue Events
  - Issue Milestones
  - Projects
  - Project Cards
  - Project Columns
  - Pull Requests
  - PR Commits
  - Releases
  - Comments
  - Reviews
  - Review Comments
  - Stargazers
  - Teams
  - Team Members
  - Team Memberships
- Outputs the schema for each resource


Note: at this time, incremental sync is not supported for any endpoint. In order to support, we'll need to modify the `./tap_github/streams.py` `IncrementalStream` class to support incremental sync. This appears to be due to a malformed bookmark value.
