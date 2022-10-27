# R blocks

You can write R language to transform data in blocks.

## Add R block to pipeline

1. Create a new pipeline or open an existing pipeline.
1. Add a data loader, transformer, or data exporter block.
1. Select `R`.

<br />

## Example pipeline

<br />

Data loader

```R
load_data <- function() {
    # Specify your data loading logic here
    # Return value: loaded dataframe
    df <- read.csv(url('https://raw.githubusercontent.com/datasciencedojo/datasets/master/titanic.csv'))
    df
}
```

Transformer

```R
library("pacman")
p_load(dplyr)

transform <- function(df_1, ...) {
    # Specify your transformation logic here
    # Return value: transformed dataframe.
    df_1 <- filter(df_1, Pclass < 3)
    df_1
}
```

Data exporter

```R
export_data <- function(df_1, ...) {
    # Specify your data exporting logic here
    # Return value: exported dataframe
    write.csv(df_1, "titanic_filtered.csv", row.names = FALSE)
}
```
