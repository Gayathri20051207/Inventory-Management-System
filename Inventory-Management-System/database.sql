CREATE DATABASE IF NOT EXISTS Company;
USE Company;

CREATE TABLE IF NOT EXISTS products (
  product_id INT AUTO_INCREMENT PRIMARY KEY,
  product_name VARCHAR(150) NOT NULL,
  category VARCHAR(50) NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  quantity INT NOT NULL DEFAULT 0,
  reorder_level INT NOT NULL DEFAULT 5
);

CREATE TABLE IF NOT EXISTS suppliers (
  supplier_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  company VARCHAR(150),
  phone VARCHAR(15),
  email VARCHAR(100),
  address VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS stock_transactions (
  transaction_id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  supplier_id INT NULL,
  transaction_type VARCHAR(20) NOT NULL,
  quantity INT NOT NULL,
  transaction_date DATE NOT NULL,
  CONSTRAINT fk_transaction_product FOREIGN KEY (product_id)
    REFERENCES products(product_id),
  CONSTRAINT fk_transaction_supplier FOREIGN KEY (supplier_id)
    REFERENCES suppliers(supplier_id) ON DELETE SET NULL
);

-- Optional demo records. Run once only if you want sample data.
INSERT INTO suppliers (name, company, phone, email, address)
SELECT 'Ananya Rao', 'Prime Wholesale', '9876543210', 'ananya@example.com', 'Kurnool, Andhra Pradesh'
WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE email = 'ananya@example.com');

INSERT INTO products (product_name, category, price, quantity, reorder_level)
SELECT 'Wireless Mouse', 'Electronics', 599.00, 42, 10
WHERE NOT EXISTS (SELECT 1 FROM products WHERE product_name = 'Wireless Mouse');

INSERT INTO products (product_name, category, price, quantity, reorder_level)
SELECT 'A4 Paper Pack', 'Stationery', 250.00, 8, 12
WHERE NOT EXISTS (SELECT 1 FROM products WHERE product_name = 'A4 Paper Pack');

INSERT INTO products (product_name, category, price, quantity, reorder_level)
SELECT 'Storage Box', 'Office Supplies', 320.00, 24, 6
WHERE NOT EXISTS (SELECT 1 FROM products WHERE product_name = 'Storage Box');
