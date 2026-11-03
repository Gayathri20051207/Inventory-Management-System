# Stockwise — Inventory Management System

A professional inventory management web application built with HTML, CSS, JavaScript, Node.js, Express and MySQL.

## Features
- Dashboard with product, unit, supplier and low-stock statistics
- Product create, read, update and delete
- Supplier create, read, update and delete
- Purchase and sale transactions
- Purchase increases stock; sale decreases stock
- Prevents sales when available stock is insufficient
- Low-stock alerts, search and category filtering
- Responsive layout and three local SVG illustrations
- Creates the `Company` database and required tables automatically

## 1. Install prerequisites
Install:
1. Node.js (LTS) from https://nodejs.org/
2. MySQL Server (and optionally MySQL Workbench) from https://dev.mysql.com/downloads/
3. Visual Studio Code from https://code.visualstudio.com/

After installing Node.js, open a NEW VS Code terminal and check:
```bash
node -v
npm -v
```

## 2. Open the project
1. Extract `Inventory-Management-System.zip`.
2. In VS Code select **File → Open Folder**.
3. Select the extracted `Inventory-Management-System` folder.
4. Open **Terminal → New Terminal**.

## 3. Configure MySQL
1. Make sure the MySQL Server service is running.
2. In the project root, copy `.env.example` and rename the copy to `.env`.
3. Open `.env` and enter the password for your MySQL `root` account.

Example:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_actual_mysql_password
DB_NAME=Company
PORT=3000
```
If your MySQL root account has no password, leave `DB_PASSWORD=` blank. Do not type quotation marks around the password.

The application creates the `Company` database and all three tables automatically on startup. The MySQL user must have permission to create databases and tables. Alternatively, import `database.sql` in MySQL Workbench first and use a MySQL account that can access `Company`.

## 4. Install project packages
In the VS Code terminal, run:
```bash
npm install
```
Wait until installation finishes.

## 5. Start the website
Run:
```bash
npm start
```
When successful, the terminal displays:
```text
Inventory Management System running at http://localhost:3000
Database: Company
```
Open this address in Chrome:
http://localhost:3000

Keep the terminal open while using the website. To stop the server, press `Ctrl + C`.

## 6. Check the database connection
Open this address:
http://localhost:3000/api/health

A successful connection returns a response similar to:
```json
{"status":"ok","database":"Company"}
```

## 7. Troubleshooting

### `Database connection failed` / `Access denied for user`
- Confirm the MySQL service is running.
- Check `DB_USER` and `DB_PASSWORD` in `.env`.
- Confirm the account has permission to create/use the `Company` database.
- Save `.env`, stop the server with `Ctrl + C`, then run `npm start` again.

### `ECONNREFUSED 127.0.0.1:3306`
MySQL is not running, or it uses a different port. Start MySQL Server and verify `DB_PORT`.

### `npm is not recognized`
Install Node.js LTS, close VS Code completely, reopen it, then check `node -v` and `npm -v`.

### Port 3000 is already in use
Change `PORT=3001` in `.env`, restart the server and open http://localhost:3001.

### Website opens but data is not loading
Check the VS Code terminal for the database error. Also open `/api/health` and confirm it reports `"status":"ok"`.

## Database tables and columns
- `products(product_id, product_name, category, price, quantity, reorder_level)`
- `suppliers(supplier_id, name, company, phone, email, address)`
- `stock_transactions(transaction_id, product_id, supplier_id, transaction_type, quantity, transaction_date)`

`product_id` and `supplier_id` in `stock_transactions` are foreign keys. Supplier is optional for a stock movement; deleting a supplier preserves the transaction and sets its supplier reference to `NULL`.

## Project structure
```text
Inventory-Management-System/
├── public/
│   ├── assets/
│   │   ├── boxes.svg
│   │   ├── delivery.svg
│   │   └── warehouse.svg
│   ├── index.html
│   ├── style.css
│   └── script.js
├── .env.example
├── .gitignore
├── database.sql
├── db.js
├── package.json
├── README.md
└── server.js
```

**Important:** `.env` contains your database password. Do not share it or upload it to GitHub.
