-- Fresh tables for the manually executed Mage -> OpenMetadata lineage demo.
-- Run inside the existing warehouse container (see harness/setup_manual_demo.sh).

CREATE TABLE IF NOT EXISTS raw.manual_products (
    id          INTEGER PRIMARY KEY,
    name        TEXT NOT NULL,
    category    TEXT NOT NULL,
    price       NUMERIC(10, 2) NOT NULL
);

INSERT INTO raw.manual_products (id, name, category, price) VALUES
    (1, 'Keyboard',   'Accessories', 49.00),
    (2, 'Mouse',      'Accessories', 25.00),
    (3, 'Monitor',    'Displays',    199.00),
    (4, 'USB Hub',    'Accessories', 19.00)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS raw.manual_sales (
    id          INTEGER PRIMARY KEY,
    product_id  INTEGER NOT NULL REFERENCES raw.manual_products(id),
    quantity    INTEGER NOT NULL,
    sale_amount NUMERIC(10, 2) NOT NULL
);

INSERT INTO raw.manual_sales (id, product_id, quantity, sale_amount) VALUES
    (1, 1, 2,  98.00),
    (2, 2, 3,  75.00),
    (3, 3, 1, 199.00),
    (4, 4, 4,  76.00),
    (5, 1, 1,  49.00)
ON CONFLICT (id) DO NOTHING;

-- Empty placeholders with the exact produced schemas. They are ingested into
-- OpenMetadata before the Mage run, so the run resolves every table/column.

CREATE TABLE IF NOT EXISTS stg.manual_products_clean (
    product_id  INTEGER,
    category    TEXT,
    price       NUMERIC(10, 2)
);

CREATE TABLE IF NOT EXISTS mart.manual_category_revenue (
    category      TEXT,
    product_count BIGINT,
    total_value   NUMERIC(14, 2)
);

CREATE TABLE IF NOT EXISTS mart.manual_category_revenue_export (
    category      TEXT,
    product_count BIGINT,
    total_value   NUMERIC(14, 2)
);
