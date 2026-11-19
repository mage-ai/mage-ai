DROP TABLE IF EXISTS stg.demo_lineage_clean_orders;

CREATE TABLE stg.demo_lineage_clean_orders AS
SELECT
    id AS order_id,
    customer_id,
    CAST(amount AS DECIMAL(10, 2)) AS amount,
    ordered_at
FROM raw.orders
WHERE status = 'complete'
