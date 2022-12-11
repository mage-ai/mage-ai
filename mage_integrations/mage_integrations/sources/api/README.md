# API

List of sample APIs: https://apipheny.io/free-api/

## Config

You must enter the following credentials when configuring this source:

| Key | Description | Required or optional |
| --- | --- | --- |
| `url` | API URL | Required |
| `method` | `GET` or `POST` | Optional: `GET` is default |
| `query` | URL query parameters. | Optional |
| `payload` | When method is `POST`, this payload is used in the request body. | Optional |
| `headers` | Request headers. | Optional |
| `response_parser` | Parse the API response using dot notation. The final result must be an array. | Optional |
| `columns` | If the final data returned from the API or from the `response_parser` is not a JSON object (e.g. it’s an array of strings or an array of array of strings), then you must define the columns. | Required (conditionally) |

<br />

### Example GET API 1

```json
{
  "url": "https://api.plos.org/search",
  "query": {
    "q": "title:DNA"
  },
  "headers": {
    "Content-Type": "application/json"
  },
  "response_parser": "response.docs[0].author_display",
  "columns": ["author_display"]
}
```

The response from the above endpoint is:

```json
{
  "response": {
    "numFound": 5669,
    "start": 0,
    "maxScore": 6.7217336,
    "docs": [
      {
        "id": "10.1371/journal.pone.0000290",
        "journal": "PLoS ONE",
        "eissn": "1932-6203",
        "publication_date": "2007-03-14T00:00:00Z",
        "article_type": "Research Article",
        "author_display": [
          "Rayna I. Kraeva",
          "Dragomir B. Krastev",
          "Assen Roguev",
          "Anna Ivanova",
          "Marina N. Nedelcheva-Veleva",
          "Stoyno S. Stoynov"
        ],
        "abstract": [
          "Nucleic acids, due to their structural and chemical properties, can form double-stranded secondary structures that assist the transfer of genetic information and can modulate gene expression. However, the nucleotide sequence alone is insufficient in explaining phenomena like intron-exon recognition during RNA processing. This raises the question whether nucleic acids are endowed with other attributes that can contribute to their biological functions. In this work, we present a calculation of thermodynamic stability of DNA/DNA and mRNA/DNA duplexes across the genomes of four species in the genus Saccharomyces by nearest-neighbor method. The results show that coding regions are more thermodynamically stable than introns, 3′-untranslated regions and intergenic sequences. Furthermore, open reading frames have more stable sense mRNA/DNA duplexes than the potential antisense duplexes, a property that can aid gene discovery. The lower stability of the DNA/DNA and mRNA/DNA duplexes of 3′-untranslated regions and the higher stability of genes correlates with increased mRNA level. These results suggest that the thermodynamic stability of DNA/DNA and mRNA/DNA duplexes affects mRNA transcription."
        ],
        "title_display": "Stability of mRNA/DNA and DNA/DNA Duplexes Affects mRNA Transcription",
        "score": 6.7217336
      }
    ]
  }
}
```

However, with the `response_parser` value of `response.docs[0].author_display`,
the data that is extracted from the API’s response is:

```json
[
  "Rayna I. Kraeva",
  "Dragomir B. Krastev",
  "Assen Roguev",
  "Anna Ivanova",
  "Marina N. Nedelcheva-Veleva",
  "Stoyno S. Stoynov"
]
```

Since each item in the final data is not a JSON object, the `columns` configuration value is required.

The final data is converted into a JSON object before being outputted to its destination:

```json
[
  {
    "author_display": "Rayna I. Kraeva"
  },
  {
    "author_display": "Dragomir B. Krastev"
  },
  {
    "author_display": "Assen Roguev"
  },
  {
    "author_display": "Anna Ivanova"
  },
  {
    "author_display": "Marina N. Nedelcheva-Veleva"
  },
  {
    "author_display": "Stoyno S. Stoynov"
  }
]
```

<br />

### Example GET API 2

```json
{
  "url": "https://api.coingecko.com/api/v3/coins/markets",
  "query": {
    "vs_currency": "usd"
  }
}
```

The response from the above endpoint is:

```json
[
  {
    "id": "bitcoin",
    "symbol": "btc",
    "name": "Bitcoin",
    "image": "https://assets.coingecko.com/coins/images/1/large/bitcoin.png?1547033579",
    "current_price": 17154.23,
    "market_cap": 329331527834,
    "market_cap_rank": 1,
    "fully_diluted_valuation": 359638803581,
    "total_volume": 14339246353,
    "high_24h": 17227.56,
    "low_24h": 17107.75,
    "price_change_24h": 18.57,
    "price_change_percentage_24h": 0.10839,
    "market_cap_change_24h": -425260465.15130615,
    "market_cap_change_percentage_24h": -0.12896,
    "circulating_supply": 19230300.0,
    "total_supply": 21000000.0,
    "max_supply": 21000000.0,
    "ath": 69045,
    "ath_change_percentage": -75.16662,
    "ath_date": "2021-11-10T14:24:11.849Z",
    "atl": 67.81,
    "atl_change_percentage": 25185.95387,
    "atl_date": "2013-07-06T00:00:00.000Z",
    "roi": null,
    "last_updated": "2022-12-11T00:32:01.695Z"
  }
]
```

Because there is no `response_parser`, the final data matches the exact response from the API.

Since each item in the final data is a JSON object, the `columns` configuration value isn’t required.

<br />

### Example POST API

```yaml
url: https://api.something.com/users
method: POST
payload:
  user:
    first_name: Urza
    power: 10
headers:
  "Content-Type": "application/json"
  token: abc123
response_parser: "user"
```

<br />
