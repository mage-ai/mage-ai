# SpecStream

[SpecStream](https://specstream.ai) is a live web data API. This source loads web search results
and extracted web pages or documents (HTML, PDF, Word, Excel) into a Mage data integration
pipeline.

## Configuration

| Key | Description | Default | Required |
| --- | --- | --- | --- |
| `api_key` | SpecStream API key, sent as a Bearer token. Create one under Agents & API in the [SpecStream workspace](https://specstream.ai/workspace). | | Yes |
| `urls` | URLs to extract, as a list or comma-separated string. | | For `extracted_pages` |
| `extract_format` | Output format for extracted text: `markdown`, `text`, or `html`. | `markdown` | No |
| `search_query` | Search query in plain words (1 to 2,000 characters). | | For `search_results` |
| `search_limit` | Results per search page (`num`, 1 to 100). | `10` | No |
| `search_speed` | Search tier: `fast` or `default`. | `fast` | No |
| `search_language` | Two-letter language code, such as `en` or `de`. | | No |
| `search_country` | Two-letter country code, such as `US` or `DE`. | | No |
| `include_passages` | Include relevant page excerpts (`passages=true`) on search results. | `false` | No |
| `max_pages` | Maximum search result pages to fetch (1 to 10). | `1` | No |

New SpecStream accounts start with $10 of credit. The Search API is $1 per 1,000 calls on `fast`
($5 per 1,000 on `default`), and the Extract API is $0.80 per 1,000 pages. See
[pricing](https://specstream.ai/pricing).

## Example: public records pipeline

To ingest municipal or regulatory public records into a warehouse, configure `search_results` with
a query such as `site:sec.gov "Form 10-K" filetype:pdf` or point `extracted_pages` at a list of
public-record URLs and PDFs to load clean Markdown text alongside publication dates and URLs.

## Streams

Both streams use `FULL_TABLE` replication with `url` as the key property.

### `extracted_pages`

One row per URL in `urls`. Up to 20 URLs are sent per `POST /v1/extract` call.

| Column | Description |
| --- | --- |
| `url` | The requested URL. |
| `status` | `ok`, `blocked`, `not_found`, `empty`, `unsupported`, `invalid_url`, or `failed`. |
| `status_code` | HTTP status code returned when a page answered with an error status. |
| `title` | Page title, when present. |
| `text` | Main extracted text in the configured `format`. |
| `text_truncated` | Whether `text` exceeded 200,000 characters and was truncated. |
| `format` | Output format requested (`markdown`, `text`, or `html`). |
| `published` | Publication date reported by the page, when known. |
| `modified` | Last modification date reported by the page, when known. |
| `read_from` | Source used to read the page (`live`, `site`, `archive`, or `html`). |
| `captured_at` | Archive capture timestamp when `read_from` is `archive`. |
| `request_id` | SpecStream request ID for the batch call. |

### `search_results`

One row per search result from `POST /v1/web-search`.

| Column | Description |
| --- | --- |
| `url` | Result URL. |
| `title` | Result title. |
| `site` | Hostname or site name. |
| `snippet` | Search snippet. |
| `excerpt` | Page passage closest to the query when `include_passages` is enabled. |
| `published` | Publication date, when known. |
| `modified` | Last modification date, when known. |
| `cited` | Whether the result was cited for an answer or row. |
| `file_type` | File extension when the URL points to a document (such as `pdf`). |
| `query` | The search query sent. |
| `page` | 1-based result page index. |
| `request_id` | SpecStream request ID for that page request. |

## Failure handling

- In `extracted_pages`, a URL that returns `blocked`, `not_found`, `empty`, `unsupported`,
  `invalid_url`, or `failed` is emitted as a row with `status` set so other URLs still sync.
  Filter on `status = 'ok'` downstream if you only want extracted pages.
- The sync raises if every URL fails to extract, if `api_key` is invalid, or if the account
  balance or key spending limit is exhausted.
- HTTP 429 and 5xx responses are retried up to 4 times with backoff, honoring `Retry-After`.

## Testing the connection

`test_connection` calls `GET /v1/capacity/catalog` to verify the API key without starting paid
work.
