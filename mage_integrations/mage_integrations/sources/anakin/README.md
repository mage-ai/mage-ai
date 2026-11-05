# Anakin

[Anakin](https://anakin.io) is a web data API. This source loads web pages and web search results
into a Mage data integration pipeline.

## Configuration

| Key | Description | Default | Required |
| --- | --- | --- | --- |
| `api_key` | Anakin API key, sent as the `X-API-Key` header. Create one in the [Anakin dashboard](https://anakin.io/dashboard). | | Yes |
| `urls` | URLs to scrape, as a list or a comma-separated string. | | For `scraped_pages` |
| `country` | Country code to scrape from. | `us` | No |
| `use_browser` | Render pages in a browser before extracting them. Use it for JavaScript-heavy pages. | `false` | No |
| `force_fresh` | Skip Anakin's cache and scrape the page again. Use it when you track changes over time. | `false` | No |
| `generate_json` | Extract structured data from each page into `generated_json`. | `false` | No |
| `poll_timeout_seconds` | How long to wait for each group of 10 scrape jobs. | `300` | No |
| `search_prompt` | Search query to run on every sync. | | For `search_results` |
| `search_limit` | Maximum number of search results. | `5` | No |

Anakin usage is billed in credits, and the free Starter plan includes 300 credits. See
[pricing](https://anakin.io/pricing).

## Streams

Both streams use `FULL_TABLE` replication with `url` as the key property. Every sync requests the
pages or the search again.

### `scraped_pages`

One row per URL in `urls`.

| Column | Description |
| --- | --- |
| `url` | The URL from the configuration. |
| `final_url` | The URL after redirects. |
| `status` | `completed`, `failed` or `timed_out`. |
| `status_code` | HTTP status code of the page. |
| `error` | Why the scrape failed. |
| `markdown` | Page content as Markdown. |
| `html` | Raw page HTML. |
| `cleaned_html` | Page HTML with boilerplate removed. |
| `generated_json` | Structured data, when `generate_json` is on. |
| `country` | Country the page was scraped from. |
| `cached` | Whether Anakin served the page from its cache. |
| `duration_ms` | How long the job took. |
| `job_id` | Anakin job ID. |
| `completed_at` | When the job finished. |

### `search_results`

One row per search result.

| Column | Description |
| --- | --- |
| `url` | URL of the result. |
| `title` | Title of the result. |
| `snippet` | Text extract from the page. |
| `date` | Publication date, when known. |
| `last_updated` | Last update date, when known. |
| `prompt` | The search query. |
| `search_id` | Anakin search ID. |

## Failure handling

- A URL that can't be scraped becomes a row with `status` and `error` set, and the sync continues.
  Filter on `status = 'completed'` downstream if you only want successful pages.
- The sync fails if every URL fails, if the API key is invalid, or if the account is out of credits.
- Requests that get HTTP 429 or 5xx are retried up to 4 times with backoff.

## Testing the connection

Testing the connection looks up a job that doesn't exist, which checks the API key without starting
a scrape.
