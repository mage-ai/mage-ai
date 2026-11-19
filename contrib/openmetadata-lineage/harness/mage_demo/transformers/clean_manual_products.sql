DROP TABLE IF EXISTS stg.manual_products_clean;

CREATE TABLE stg.manual_products_clean AS
SELECT
    id AS product_id,
    category,
    price
FROM raw.manual_products
