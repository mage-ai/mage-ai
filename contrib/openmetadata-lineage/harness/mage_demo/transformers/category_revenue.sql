DROP TABLE IF EXISTS mart.manual_category_revenue;

CREATE TABLE mart.manual_category_revenue AS
SELECT
    p.category,
    COUNT(*) AS product_count,
    SUM(s.sale_amount) AS total_value
FROM raw.manual_sales s
JOIN stg.manual_products_clean p ON p.product_id = s.product_id
GROUP BY p.category
