# Actions

## Cleaning actions that remove rows

- [Drop duplicates](#drop-duplicates)
- [WIP] [Remove irrelevant rows](#remove-irrelevant-rows)
- [WIP] [Remove outliers](#remove-outliers)
- [WIP] [Remove anomalies](#remove-anomalies)

## Cleaning actions for a specific column

- [Impute](#impute)
- [Reformat values](#reformat-values)
- [WIP] [Unit conversion](#unit-conversion)
- [WIP] [Type conversion](#type-conversion)
- [Remove collinear columns](#remove-collinear-columns)
- [Remove columns with single value](#remove-columns-with-single-value)
- [Remove columns with empty values](#remove-columns-with-empty-values)
- [Remove irrelevant columns](#remove-irrelevant-columns)
- [Clean column names](#clean-column-names)

**Numbers**

- [WIP] [Scale values](#scale-values)
- WIP

**Text**

- [WIP] [Encode values](#encode-values)
- WIP

**Images**

- WIP

**Audio**

- WIP

**Video**

- WIP

**Cleaning actions for e-commerce**

- WIP

### Drop duplicates
Remove duplicate rows based on matching N columns.

### Remove irrelevant rows
Remove irrelevant rows using matching function e.g. if function returns true, remove row.

### Remove outliers
Remove outliers based on values in N columns.

### Remove anomalies
Remove anomalies based on values in N columns.

### Impute
Impute missing values using different strategies:

- Numeric imputation: mean, ratio, reg
- Hot deck imputation: rand, seq, pmm
- kNN imputation

### Reformat values
- Standardize capitalization
- Date formats
- Number formats; e.g. 23, twenty, eihgteen (spelled incorrectly)
- Currency

### Unit conversion
- Dates: change UTC to PST
- Currency: change USD to Yen
- Weight

### Type conversion
- dtype conversion: int to float
- Primitive type conversion: number to category

### Remove collinear columns
Columns with high correlation are redundant to a model.

### Remove columns with single value
Columns with a single value is useless for a model.

### Remove columns with empty values
Columns with a lot of missing values may not contain enough
relevant information for a model to learn from.

### Remove irrelevant columns
Remove columns with:

- PII
- Boilerplate text
- Tracking codes
- and more

### Clean column names
Rename columns by:
- Removing excessive blank space around and between text
- Converting special characters to underscores
- Lowercasing the name
- and more

### Scale values
- Standardize
- Normalize

### Encode values
- One-hot encoding
- Ordinal encoding
- Label encoding
- Label hashing
- Embeddings
