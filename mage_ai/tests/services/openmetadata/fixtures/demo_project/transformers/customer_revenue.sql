INSERT INTO mart.customer_revenue
SELECT
    c.id AS customer_id,
    c.country,
    COUNT(o.order_id) AS order_count,
    SUM(o.amount) AS revenue
FROM raw.customers c
JOIN stg.orders_clean o ON o.customer_id = c.id
GROUP BY c.id, c.country
