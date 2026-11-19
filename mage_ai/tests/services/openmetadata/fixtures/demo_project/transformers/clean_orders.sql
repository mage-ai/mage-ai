INSERT INTO stg.orders_clean
SELECT
    id AS order_id,
    customer_id,
    CAST(amount AS DECIMAL(10, 2)) AS amount,
    ordered_at
FROM raw.orders
WHERE status = 'complete'
