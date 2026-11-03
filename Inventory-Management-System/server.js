require("dotenv").config();
const express = require("express");
const path = require("path");
const { initializeDatabase, getPool } = require("./db");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

const positiveInt = (v) => Number.isInteger(Number(v)) && Number(v) >= 0;
const validId = (v) => Number.isInteger(Number(v)) && Number(v) > 0;

app.get("/api/health", asyncRoute(async (req, res) => {
  await getPool().query("SELECT 1");
  res.json({ status: "ok", database: process.env.DB_NAME || "Company" });
}));

app.get("/api/dashboard", asyncRoute(async (req, res) => {
  const db = getPool();
  const [[summary]] = await db.query(`
    SELECT
      (SELECT COUNT(*) FROM products) AS totalProducts,
      (SELECT COALESCE(SUM(quantity),0) FROM products) AS totalUnits,
      (SELECT COUNT(*) FROM suppliers) AS totalSuppliers,
      (SELECT COUNT(*) FROM products WHERE quantity <= reorder_level) AS lowStock
  `);
  const [recent] = await db.query(`
    SELECT st.transaction_id, st.transaction_type, st.quantity, st.transaction_date,
           p.product_name, s.name AS supplier_name
    FROM stock_transactions st
    JOIN products p ON p.product_id = st.product_id
    LEFT JOIN suppliers s ON s.supplier_id = st.supplier_id
    ORDER BY st.transaction_id DESC LIMIT 6
  `);
  const [low] = await db.query(`
    SELECT product_id, product_name, category, quantity, reorder_level
    FROM products WHERE quantity <= reorder_level
    ORDER BY quantity ASC LIMIT 8
  `);
  res.json({ summary, recent, low });
}));

app.get("/api/products", asyncRoute(async (req, res) => {
  const [rows] = await getPool().query("SELECT * FROM products ORDER BY product_id DESC");
  res.json(rows);
}));

app.post("/api/products", asyncRoute(async (req, res) => {
  const { product_name, category, price, quantity, reorder_level } = req.body;
  if (!product_name?.trim() || !category?.trim() ||
      !Number.isFinite(Number(price)) || Number(price) < 0 ||
      !positiveInt(quantity) || !positiveInt(reorder_level)) {
    return res.status(400).json({ message: "Enter valid product details. Price and stock values cannot be negative." });
  }
  const [result] = await getPool().query(
    "INSERT INTO products (product_name, category, price, quantity, reorder_level) VALUES (?, ?, ?, ?, ?)",
    [product_name.trim(), category.trim(), Number(price), Number(quantity), Number(reorder_level)]
  );
  res.status(201).json({ message: "Product added successfully.", product_id: result.insertId });
}));

app.put("/api/products/:id", asyncRoute(async (req, res) => {
  const id = req.params.id;
  const { product_name, category, price, quantity, reorder_level } = req.body;
  if (!validId(id) || !product_name?.trim() || !category?.trim() ||
      !Number.isFinite(Number(price)) || Number(price) < 0 ||
      !positiveInt(quantity) || !positiveInt(reorder_level)) {
    return res.status(400).json({ message: "Please enter valid product details." });
  }
  const [result] = await getPool().query(
    "UPDATE products SET product_name=?, category=?, price=?, quantity=?, reorder_level=? WHERE product_id=?",
    [product_name.trim(), category.trim(), Number(price), Number(quantity), Number(reorder_level), id]
  );
  if (!result.affectedRows) return res.status(404).json({ message: "Product not found." });
  res.json({ message: "Product updated successfully." });
}));

app.delete("/api/products/:id", asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid product ID." });
  try {
    const [result] = await getPool().query("DELETE FROM products WHERE product_id=?", [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: "Product not found." });
    res.json({ message: "Product deleted successfully." });
  } catch (error) {
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return res.status(409).json({ message: "This product has transaction history and cannot be deleted." });
    }
    throw error;
  }
}));

app.get("/api/suppliers", asyncRoute(async (req, res) => {
  const [rows] = await getPool().query("SELECT * FROM suppliers ORDER BY supplier_id DESC");
  res.json(rows);
}));

app.post("/api/suppliers", asyncRoute(async (req, res) => {
  const { name, company, phone, email, address } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: "Supplier name is required." });
  const [result] = await getPool().query(
    "INSERT INTO suppliers (name, company, phone, email, address) VALUES (?, ?, ?, ?, ?)",
    [name.trim(), company || "", phone || "", email || "", address || ""]
  );
  res.status(201).json({ message: "Supplier added successfully.", supplier_id: result.insertId });
}));

app.put("/api/suppliers/:id", asyncRoute(async (req, res) => {
  const { name, company, phone, email, address } = req.body;
  if (!validId(req.params.id) || !name?.trim()) {
    return res.status(400).json({ message: "Supplier name is required." });
  }
  const [result] = await getPool().query(
    "UPDATE suppliers SET name=?, company=?, phone=?, email=?, address=? WHERE supplier_id=?",
    [name.trim(), company || "", phone || "", email || "", address || "", req.params.id]
  );
  if (!result.affectedRows) return res.status(404).json({ message: "Supplier not found." });
  res.json({ message: "Supplier updated successfully." });
}));

app.delete("/api/suppliers/:id", asyncRoute(async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid supplier ID." });
  const [result] = await getPool().query("DELETE FROM suppliers WHERE supplier_id=?", [req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ message: "Supplier not found." });
  res.json({ message: "Supplier deleted successfully." });
}));

app.get("/api/transactions", asyncRoute(async (req, res) => {
  const [rows] = await getPool().query(`
    SELECT st.transaction_id, st.product_id, st.supplier_id, st.transaction_type,
           st.quantity, st.transaction_date, p.product_name, s.name AS supplier_name
    FROM stock_transactions st
    JOIN products p ON p.product_id=st.product_id
    LEFT JOIN suppliers s ON s.supplier_id=st.supplier_id
    ORDER BY st.transaction_id DESC
  `);
  res.json(rows);
}));

app.post("/api/transactions", asyncRoute(async (req, res) => {
  const { product_id, supplier_id, transaction_type, quantity, transaction_date } = req.body;
  const qty = Number(quantity);
  const type = String(transaction_type || "").toLowerCase();
  if (!validId(product_id) || !["purchase", "sale"].includes(type) ||
      !Number.isInteger(qty) || qty <= 0 || !transaction_date) {
    return res.status(400).json({ message: "Select a product, transaction type, date and a quantity greater than zero." });
  }

  const db = getPool();
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [products] = await conn.query(
      "SELECT product_id, quantity FROM products WHERE product_id=? FOR UPDATE", [product_id]
    );
    if (!products.length) throw Object.assign(new Error("Selected product was not found."), { status: 404 });
    const current = Number(products[0].quantity);
    if (type === "sale" && current < qty) {
      throw Object.assign(new Error(`Insufficient stock. Available quantity: ${current}.`), { status: 400 });
    }
    const newQty = type === "purchase" ? current + qty : current - qty;
    await conn.query("UPDATE products SET quantity=? WHERE product_id=?", [newQty, product_id]);
    const supplierId = supplier_id ? Number(supplier_id) : null;
    if (supplierId && !validId(supplierId)) throw Object.assign(new Error("Invalid supplier."), { status: 400 });
    await conn.query(
      "INSERT INTO stock_transactions (product_id, supplier_id, transaction_type, quantity, transaction_date) VALUES (?, ?, ?, ?, ?)",
      [product_id, supplierId, type, qty, transaction_date]
    );
    await conn.commit();
    res.status(201).json({ message: `Stock ${type} recorded. Updated stock: ${newQty}.`, quantity: newQty });
  } catch (error) {
    await conn.rollback();
    if (error.status) return res.status(error.status).json({ message: error.message });
    throw error;
  } finally {
    conn.release();
  }
}));

app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));

app.use((err, req, res, next) => {
  console.error("API error:", err);
  if (err.code === "ER_NO_SUCH_TABLE") {
    return res.status(500).json({ message: "Database tables are missing. Restart the server to initialize them." });
  }
  res.status(500).json({ message: "Server error. Check the VS Code terminal for details." });
});

const PORT = Number(process.env.PORT || 3000);
initializeDatabase()
  .then(() => {
    app.listen(PORT, () => console.log(`\nInventory Management System running at http://localhost:${PORT}\nDatabase: ${process.env.DB_NAME || "Company"}\n`));
  })
  .catch((error) => {
    console.error("\nDATABASE CONNECTION FAILED");
    console.error(error.message);
    console.error("\nCheck that MySQL is running and .env contains the correct DB_HOST, DB_USER and DB_PASSWORD.\n");
    process.exit(1);
  });
