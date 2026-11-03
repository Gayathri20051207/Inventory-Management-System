const $ = (s) => document.querySelector(s);
const state = { products: [], suppliers: [], transactions: [], page: "dashboard", editing: null };
const today = new Date().toISOString().slice(0, 10);

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed.");
  return data;
}
function toast(message, error = false) {
  const el = $("#toast"); el.textContent = message; el.classList.toggle("error", error);
  el.classList.add("show"); clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove("show"), 3200);
}
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
function money(value) { return "₹" + Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function dateText(value) { return value ? new Date(value).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric", timeZone:"UTC" }) : "—"; }
function empty(message) { return `<div class="empty-state">${esc(message)}</div>`; }

function showPage(page) {
  state.page = page;
  document.querySelectorAll(".page").forEach(el => el.classList.toggle("active", el.id === `page-${page}`));
  document.querySelectorAll(".nav-link").forEach(el => el.classList.toggle("active", el.dataset.page === page));
  $("#crumbTitle").textContent = ({ dashboard:"Overview", products:"Products", suppliers:"Suppliers", transactions:"Stock transactions" })[page];
  $("#sidebar").classList.remove("open");
}
document.querySelectorAll("[data-page]").forEach(el => el.addEventListener("click", e => { e.preventDefault(); showPage(el.dataset.page); }));
document.querySelectorAll("[data-go]").forEach(el => el.addEventListener("click", () => showPage(el.dataset.go)));
$("#mobileMenu").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
$("#refreshBtn").addEventListener("click", loadAll);

async function loadAll() {
  try {
    const [dashboard, products, suppliers, transactions] = await Promise.all([
      api("/api/dashboard"), api("/api/products"), api("/api/suppliers"), api("/api/transactions")
    ]);
    state.products = products; state.suppliers = suppliers; state.transactions = transactions;
    renderDashboard(dashboard); renderProducts(); renderSuppliers(); renderTransactions(); fillTransactionOptions();
  } catch (error) { toast(error.message, true); }
}
function renderDashboard(data) {
  $("#statProducts").textContent = Number(data.summary.totalProducts).toLocaleString("en-IN");
  $("#statUnits").textContent = Number(data.summary.totalUnits).toLocaleString("en-IN");
  $("#statSuppliers").textContent = Number(data.summary.totalSuppliers).toLocaleString("en-IN");
  $("#statLow").textContent = Number(data.summary.lowStock).toLocaleString("en-IN");
  $("#alertCount").textContent = data.low.length;
  $("#recentTable").innerHTML = data.recent.length ? `<table class="data-table"><thead><tr><th>PRODUCT</th><th>TYPE</th><th>QUANTITY</th><th>DATE</th></tr></thead><tbody>${data.recent.map(t => `<tr><td class="product-cell"><span class="product-thumb">▤</span>${esc(t.product_name)}</td><td><span class="pill ${t.transaction_type === "purchase" ? "in":"out"}">${esc(t.transaction_type)}</span></td><td>${t.quantity}</td><td>${dateText(t.transaction_date)}</td></tr>`).join("")}</tbody></table>` : empty("No stock activity yet. Record your first transaction.") ;
  $("#lowStockList").innerHTML = data.low.length ? data.low.map(p => `<div class="alert-item"><span class="alert-icon">!</span><div class="alert-copy"><strong>${esc(p.product_name)}</strong><small>${esc(p.category)} · Reorder at ${p.reorder_level}</small></div><span class="alert-qty">${p.quantity} left</span></div>`).join("") : empty("All products are above reorder level.");
}
function renderProducts() {
  const q = ($("#productSearch")?.value || "").toLowerCase(), cat = $("#categoryFilter")?.value || "";
  const rows = state.products.filter(p => (`${p.product_name} ${p.category}`).toLowerCase().includes(q) && (!cat || p.category === cat));
  $("#productCount").textContent = `${rows.length} products`;
  $("#productsTable").innerHTML = rows.length ? `<table class="data-table"><thead><tr><th>PRODUCT</th><th>CATEGORY</th><th>PRICE</th><th>QUANTITY</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>${rows.map(p => `<tr><td class="product-cell"><span class="product-thumb">▤</span>${esc(p.product_name)}</td><td>${esc(p.category)}</td><td>${money(p.price)}</td><td><b>${p.quantity}</b></td><td><span class="pill ${p.quantity <= p.reorder_level ? "low":"ok"}">${p.quantity <= p.reorder_level ? "Low stock":"In stock"}</span></td><td><button class="action-btn" data-edit-product="${p.product_id}">Edit</button><button class="action-btn delete" data-delete-product="${p.product_id}">Delete</button></td></tr>`).join("")}</tbody></table>` : empty("No products match your search.");
}
function renderSuppliers() {
  const q = ($("#supplierSearch")?.value || "").toLowerCase();
  const rows = state.suppliers.filter(s => (`${s.name} ${s.company} ${s.email}`).toLowerCase().includes(q));
  $("#supplierCount").textContent = `${rows.length} suppliers`;
  $("#suppliersTable").innerHTML = rows.length ? `<table class="data-table"><thead><tr><th>SUPPLIER</th><th>COMPANY</th><th>PHONE</th><th>EMAIL</th><th>ADDRESS</th><th>ACTIONS</th></tr></thead><tbody>${rows.map(s => `<tr><td class="product-cell"><span class="product-thumb">♧</span>${esc(s.name)}</td><td>${esc(s.company)}</td><td>${esc(s.phone)}</td><td>${esc(s.email)}</td><td>${esc(s.address)}</td><td><button class="action-btn" data-edit-supplier="${s.supplier_id}">Edit</button><button class="action-btn delete" data-delete-supplier="${s.supplier_id}">Delete</button></td></tr>`).join("")}</tbody></table>` : empty("No suppliers added yet.");
}
function renderTransactions() {
  const q = ($("#transactionSearch")?.value || "").toLowerCase();
  const rows = state.transactions.filter(t => (`${t.product_name} ${t.supplier_name || ""} ${t.transaction_type}`).toLowerCase().includes(q));
  $("#transactionsTable").innerHTML = rows.length ? `<table class="data-table"><thead><tr><th>REFERENCE</th><th>PRODUCT</th><th>SUPPLIER</th><th>TYPE</th><th>QUANTITY</th><th>DATE</th></tr></thead><tbody>${rows.map(t => `<tr><td>#${t.transaction_id}</td><td class="product-cell">${esc(t.product_name)}</td><td>${esc(t.supplier_name || "—")}</td><td><span class="pill ${t.transaction_type === "purchase" ? "in":"out"}">${esc(t.transaction_type)}</span></td><td><b>${t.quantity}</b></td><td>${dateText(t.transaction_date)}</td></tr>`).join("")}</tbody></table>` : empty("No transactions found.");
}
function fillTransactionOptions() {
  $("#transactionProduct").innerHTML = `<option value="">Choose a product</option>` + state.products.map(p => `<option value="${p.product_id}">${esc(p.product_name)} · ${p.quantity} available</option>`).join("");
  $("#transactionSupplier").innerHTML = `<option value="">Choose a supplier</option>` + state.suppliers.map(s => `<option value="${s.supplier_id}">${esc(s.name)}${s.company ? " · " + esc(s.company) : ""}</option>`).join("");
  updateStockHint();
}
function updateStockHint() {
  const id = Number($("#transactionProduct").value), product = state.products.find(p => p.product_id === id);
  $("#stockHint").textContent = product ? `Available stock for ${product.product_name}: ${product.quantity} units · Reorder level: ${product.reorder_level}` : "Choose a product to see its available stock.";
}
$("#transactionProduct").addEventListener("change", updateStockHint);
$("#productSearch").addEventListener("input", renderProducts);
$("#categoryFilter").addEventListener("change", renderProducts);
$("#supplierSearch").addEventListener("input", renderSuppliers);
$("#transactionSearch").addEventListener("input", renderTransactions);

const backdrop = $("#modalBackdrop");
function openModal(type, record = null) {
  state.editing = record ? { type, id: record[type === "product" ? "product_id" : "supplier_id"] } : { type, id: null };
  $("#modalTitle").textContent = `${record ? "Edit" : "Add"} ${type}`;
  const fields = type === "product" ? [
    ["product_name","Product name","text",record?.product_name || "",true],
    ["category","Category","select",record?.category || "Electronics",true],
    ["price","Price (₹)","number",record?.price ?? "",true],
    ["quantity","Available quantity","number",record?.quantity ?? 0,true],
    ["reorder_level","Reorder level","number",record?.reorder_level ?? 5,true]
  ] : [
    ["name","Supplier name","text",record?.name || "",true],
    ["company","Company","text",record?.company || "",false],
    ["phone","Phone number","tel",record?.phone || "",false],
    ["email","Email address","email",record?.email || "",false],
    ["address","Address","text",record?.address || "",false]
  ];
  $("#modalFields").innerHTML = fields.map(([name,label,type,value,required]) => {
    let control = type === "select"
      ? `<select name="${name}" required>${["Electronics","Stationery","Office Supplies","Furniture","Other"].map(c => `<option ${value === c ? "selected":""}>${c}</option>`).join("")}</select>`
      : `<input name="${name}" type="${type}" value="${esc(value)}" ${required ? "required":""} ${type === "number" ? `min="0" ${name === "price" ? 'step="0.01"' : 'step="1"'}` : ""} placeholder="${label}">`;
    return `<label class="${type === "select" ? "" : ""}">${label}${control}</label>`;
  }).join("");
  if (type === "product") $("#modalFields").querySelector('[name="product_name"]').parentElement.classList.add("full-field");
  backdrop.classList.add("show");
}
function closeModal() { backdrop.classList.remove("show"); $("#recordForm").reset(); }
$("#closeModal").addEventListener("click", closeModal);
$("#cancelModal").addEventListener("click", closeModal);
backdrop.addEventListener("click", e => { if (e.target === backdrop) closeModal(); });
$("#addProductBtn").addEventListener("click", () => openModal("product"));
$("#addSupplierBtn").addEventListener("click", () => openModal("supplier"));

$("#recordForm").addEventListener("submit", async e => {
  e.preventDefault();
  const form = Object.fromEntries(new FormData(e.target).entries());
  const { type, id } = state.editing;
  try {
    await api(`/api/${type === "product" ? "products":"suppliers"}${id ? `/${id}`:""}`, {
      method: id ? "PUT":"POST", body: JSON.stringify(form)
    });
    closeModal(); await loadAll(); toast(`${type[0].toUpperCase()+type.slice(1)} ${id ? "updated":"added"} successfully.`);
  } catch (error) { toast(error.message, true); }
});

document.addEventListener("click", async e => {
  const editP = e.target.closest("[data-edit-product]"), editS = e.target.closest("[data-edit-supplier]");
  const delP = e.target.closest("[data-delete-product]"), delS = e.target.closest("[data-delete-supplier]");
  if (editP) openModal("product", state.products.find(p => p.product_id === Number(editP.dataset.editProduct)));
  if (editS) openModal("supplier", state.suppliers.find(s => s.supplier_id === Number(editS.dataset.editSupplier)));
  if (delP || delS) {
    const product = !!delP, id = Number((delP || delS).dataset[product ? "deleteProduct":"deleteSupplier"]);
    if (!confirm(`Delete this ${product ? "product":"supplier"}?`)) return;
    try {
      await api(`/api/${product ? "products":"suppliers"}/${id}`, { method:"DELETE" });
      await loadAll(); toast("Record deleted successfully.");
    } catch (error) { toast(error.message, true); }
  }
});

$("#transactionDate").value = today;
$("#transactionForm").addEventListener("submit", async e => {
  e.preventDefault();
  const form = Object.fromEntries(new FormData(e.target).entries());
  try {
    const result = await api("/api/transactions", { method:"POST", body:JSON.stringify(form) });
    e.target.reset(); $("#transactionDate").value = today;
    await loadAll(); toast(result.message);
  } catch (error) { toast(error.message, true); }
});

loadAll();
