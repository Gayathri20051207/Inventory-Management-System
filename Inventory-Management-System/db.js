const mysql = require("mysql2/promise");
require("dotenv").config();

const config = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool;

async function initializeDatabase() {
  // Connect without selecting a database so the app can create Company.
  const connection = await mysql.createConnection(config);
  const dbName = process.env.DB_NAME || "Company";
  if (!/^[A-Za-z0-9_]+$/.test(dbName)) {
    throw new Error("DB_NAME may contain only letters, numbers and underscores.");
  }

  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await connection.end();

  pool = mysql.createPool({
    ...config,
    database: dbName,
    decimalNumbers: true
  });

  const statements = [
    `CREATE TABLE IF NOT EXISTS products (
      product_id INT AUTO_INCREMENT PRIMARY KEY,
      product_name VARCHAR(150) NOT NULL,
      category VARCHAR(50) NOT NULL,
      price DECIMAL(10,2) NOT NULL DEFAULT 0,
      quantity INT NOT NULL DEFAULT 0,
      reorder_level INT NOT NULL DEFAULT 5
    )`,
    `CREATE TABLE IF NOT EXISTS suppliers (
      supplier_id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      company VARCHAR(150),
      phone VARCHAR(15),
      email VARCHAR(100),
      address VARCHAR(200)
    )`,
    `CREATE TABLE IF NOT EXISTS stock_transactions (
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
    )`
  ];

  for (const sql of statements) await pool.query(sql);
  return pool;
}

function getPool() {
  if (!pool) throw new Error("Database is not initialized.");
  return pool;
}

module.exports = { initializeDatabase, getPool };
