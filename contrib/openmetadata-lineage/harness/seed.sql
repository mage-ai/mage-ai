-- Demo warehouse for the Mage -> OpenMetadata lineage connector.
-- Service: warehouse_demo   Database: analytics
-- Schemas:  raw (sources), stg (intermediate), mart (published)

CREATE SCHEMA IF NOT EXISTS raw;
CREATE SCHEMA IF NOT EXISTS stg;
CREATE SCHEMA IF NOT EXISTS mart;

CREATE TABLE IF NOT EXISTS raw.customers (
    id      integer PRIMARY KEY,
    country text    NOT NULL
);

CREATE TABLE IF NOT EXISTS raw.orders (
    id          integer PRIMARY KEY,
    customer_id integer NOT NULL REFERENCES raw.customers (id),
    amount      numeric(10, 2) NOT NULL,
    status      text NOT NULL,
    ordered_at  timestamp NOT NULL
);

-- Written by the pipeline; pre-created so metadata ingestion can see them.
CREATE TABLE IF NOT EXISTS stg.orders_clean (
    order_id    integer PRIMARY KEY,
    customer_id integer NOT NULL,
    amount      numeric(10, 2) NOT NULL,
    ordered_at  timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS mart.customer_revenue (
    customer_id integer PRIMARY KEY,
    country     text NOT NULL,
    order_count integer NOT NULL,
    revenue     numeric(12, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS mart.customer_revenue_export (
    customer_id integer,
    country     text,
    order_count integer,
    revenue     numeric(12, 2)
);

INSERT INTO raw.customers (id, country) VALUES
    (1, 'US'),
    (2, 'DE'),
    (3, 'IN')
ON CONFLICT (id) DO NOTHING;

INSERT INTO raw.orders (id, customer_id, amount, status, ordered_at) VALUES
    (1001, 1,  42.00, 'complete', '2024-01-02 10:00:00'),
    (1002, 1,  17.50, 'complete', '2024-01-03 11:30:00'),
    (1003, 2,  99.99, 'complete', '2024-01-04 09:15:00'),
    (1004, 3,  12.00, 'cancelled', '2024-01-05 16:45:00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO stg.orders_clean (order_id, customer_id, amount, ordered_at)
SELECT id, customer_id, amount, ordered_at
FROM raw.orders
WHERE status = 'complete'
ON CONFLICT (order_id) DO NOTHING;

INSERT INTO mart.customer_revenue (customer_id, country, order_count, revenue)
SELECT
    c.id,
    c.country,
    COUNT(o.order_id),
    SUM(o.amount)
FROM raw.customers c
JOIN stg.orders_clean o ON o.customer_id = c.id
GROUP BY c.id, c.country
ON CONFLICT (customer_id) DO UPDATE
SET order_count = EXCLUDED.order_count,
    revenue     = EXCLUDED.revenue;

INSERT INTO mart.customer_revenue_export (customer_id, country, order_count, revenue)
SELECT customer_id, country, order_count, revenue
FROM mart.customer_revenue
ON CONFLICT DO NOTHING;
