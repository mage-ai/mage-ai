DROP TABLE IF EXISTS mart.demo_lineage_customer_revenue;

CREATE TABLE mart.demo_lineage_customer_revenue AS
SELECT
    c.id AS customer_id,
    c.country,
    COUNT(o.order_id) AS order_count,
    SUM(o.amount) AS revenue
FROM raw.customers c
JOIN stg.demo_lineage_clean_orders o ON o.customer_id = c.id
GROUP BY c.id, c.country
