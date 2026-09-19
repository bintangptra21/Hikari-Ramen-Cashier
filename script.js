const STORAGE_KEYS = { users:'hikari_users', menu:'hikari_menu', orders:'hikari_orders', expenses:'hikari_expenses' };
const QRIS_IMAGE_URL = 'assets/qris.png';

if (typeof window.storage === 'undefined') {
  window.storage = {
    async get(key){
      const raw = localStorage.getItem(key);
      if (raw === null) throw new Error('key not found: ' + key);
      return { key, value: raw, shared: false };
    },
    async set(key, value){
      localStorage.setItem(key, value);
      return { key, value, shared: false };
    },
    async delete(key){
      localStorage.removeItem(key);
      return { key, deleted: true, shared: false };
    },
    async list(prefix){
      const keys = Object.keys(localStorage).filter(k => !prefix || k.startsWith(prefix));
      return { keys, prefix, shared: false };
    }
  };
}

let state = {
  view: 'loading', 
  currentUser: null,
  loginError: '',
  users: [], menu: [], orders: [], expenses: [],
  cart: [],
  activeCategory: 'Ramen',
  adminTab: 'dashboard',
  modal: null, 
  menuSearch: '',
  sidebarOpen: false,
  payMethod: 'Cash',
  cashGiven: '',
};

function uid(prefix){ return prefix + '_' + Math.random().toString(36).slice(2,9); }
function fmtRp(n){ return 'Rp' + Math.round(n).toLocaleString('id-ID'); }
function fmtDateTime(ts){
  const d = new Date(ts);
  return d.toLocaleDateString('id-ID',{day:'2-digit',month:'2-digit',year:'numeric'}) + ' ' +
         d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
}
function isSameDay(ts, ref){ const a=new Date(ts), b=new Date(ref); return a.toDateString()===b.toDateString(); }
function daysAgo(n){ const d=new Date(); d.setDate(d.getDate()-n); return d; }

/* ---------------- Seed data ---------------- */
const SEED_USERS = [
  {id:'u_admin1', username:'admin1', password:'admin', name:'Bintang', role:'admin'},
  {id:'u_kasir1', username:'kasir1', password:'kasir123', name:'Aura', role:'kasir'},
  {id:'u_kasir2', username:'kasir2', password:'kasir123', name:'Linda', role:'kasir'},
  {id:'u_kasir3', username:'kasir3',password:'kasir123', name:'Neo', role:'kasir'},
];
const SEED_MENU = [
  {id:uid('m'), name:'Shoyu Ramen', category:'Ramen', price:38000, available:true, image:'https://www.justonecookbook.com/wp-content/uploads/2023/04/Shoyu-Ramen-8308-I.jpg'},
  {id:uid('m'), name:'Miso Ramen', category:'Ramen', price:40000, available:true, image:'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSgG11ELQcqu1j11FRRj5EaljpxDbxDBj6ed_Xll70cQQ&s=10'},
  {id:uid('m'), name:'Tonkotsu Ramen', category:'Ramen', price:45000, available:true, image:'https://cdn.apartmenttherapy.info/image/upload/f_jpg,q_auto:eco,c_fill,g_auto,w_1500,ar_1:1/k%2FPhoto%2FRecipes%2F2024-03-tonkotsu-ramen%2Ftonkotsu-ramen-195.jpg'},
  {id:uid('m'), name:'Spicy Chili Ramen', category:'Ramen', price:42000, available:true, image:'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR1TlpXO2FLQ67LIrGYBBHYbIg3-FDy4U71blShi4kS-w&s=10'},
  {id:uid('m'), name:'Vegetable Ramen', category:'Ramen', price:36000, available:true, image:'https://is.squarespace-cdn.com/content/v1/5e185ce3e56525704fdae715/285175dc-3dda-4f26-8136-397d8d61dad6/DSC02846.jpg'},
  {id:uid('m'), name:'Gyoza (5pcs)', category:'Side', price:20000, available:true, image:'https://cardamommagazine.com/wp-content/uploads/2021/04/chicken-gyoza.jpg'},
  {id:uid('m'), name:'Karaage Ayam', category:'Side', price:25000, available:true, image:'https://asset.kompas.com/crops/Na9HxqHtaZ2wOKgZsIo8Eh82Rvw=/30x0:998x645/1200x800/data/photo/2023/01/30/63d780697d727.jpg'},
  {id:uid('m'), name:'Chashu Tambahan', category:'Side', price:15000, available:true, image:'https://www.angsarap.net/wp-content/uploads/2022/03/Chashu-men.jpg'},
  {id:uid('m'), name:'Edamame', category:'Side', price:15000, available:true, image:'https://pickledplum.com/wp-content/uploads/2018/09/edamame-WP-tasty-thumb.jpg'},
  {id:uid('m'), name:'Nasi Putih', category:'Side', price:8000, available:true, image:'https://akcdn.detik.net.id/visual/2019/07/09/5eb5d75b-7eae-4e9c-8a94-1b3a536891ec_169.jpeg?w=1200'},
  {id:uid('m'), name:'Es Ocha', category:'Minuman', price:10000, available:true, image:'https://png.pngtree.com/background/20250710/original/pngtree-iced-green-tea-chilled-served-over-ice-picture-image_16662858.jpg'},
  {id:uid('m'), name:'Ramune Original', category:'Minuman', price:15000, available:true, image:'https://tastysnack.id/cdn/shop/files/18_4a0a7be2-488c-41e4-9f0d-0dc043cc6a34_1000x1000.png?v=1729670482'},
  {id:uid('m'), name:'Hot Green Tea', category:'Minuman', price:8000, available:true, image:'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRR25eRXl-5PanHfcdkynInfLyGF5nJZmSw1AG2XyIXgxqnIWXm7LwKSMs&s=10'},
  {id:uid('m'), name:'Es Teh Manis', category:'Minuman', price:6000, available:true, image:'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTgtRtoC0S3edisv8h5i9OdkCcJ96Lt0dFWAZKaD-9YK0PKiqTb9ag2sxI&s=10'},
  {id:uid('m'), name:'Dorayaki', category:'Dessert', price:12000, available:true, image:'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQYsVWacuF154nzl1xnlAk1re62zRI2Q4_53N8kZfQgkToRlsR22CpkLFQ&s=10'},
  {id:uid('m'), name:'Mochi Ice Cream', category:'Dessert', price:15000, available:true, image:'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSx2iN4YsQJk2O03S_GDylQ9iuyoQ6uLtXDLKEaadaGSI1y7AYfhXML9a4&s=10'},
  {id:uid('m'), name:'Matcha Pudding', category:'Dessert', price:18000, available:true, image:''}
];

/* ---------------- Storage helpers ---------------- */
async function loadData(){
  try{
    const u = await window.storage.get(STORAGE_KEYS.users, true);
    state.users = JSON.parse(u.value);
  }catch(e){
    state.users = SEED_USERS;
    await window.storage.set(STORAGE_KEYS.users, JSON.stringify(SEED_USERS), true);
  }
  try{
    const m = await window.storage.get(STORAGE_KEYS.menu, true);
    state.menu = JSON.parse(m.value);
  }catch(e){
    state.menu = SEED_MENU;
    await window.storage.set(STORAGE_KEYS.menu, JSON.stringify(SEED_MENU), true);
  }
  try{
    const o = await window.storage.get(STORAGE_KEYS.orders, true);
    state.orders = JSON.parse(o.value);
  }catch(e){
    state.orders = [];
    await window.storage.set(STORAGE_KEYS.orders, JSON.stringify([]), true);
  }
  try{
    const ex = await window.storage.get(STORAGE_KEYS.expenses, true);
    state.expenses = JSON.parse(ex.value);
  }catch(e){
    state.expenses = [];
    await window.storage.set(STORAGE_KEYS.expenses, JSON.stringify([]), true);
  }
}
async function persist(key){
  try{ await window.storage.set(STORAGE_KEYS[key], JSON.stringify(state[key]), true); }
  catch(e){ console.error('Gagal menyimpan', key, e); }
}
async function refreshFromCloud(){
  if(state.modal) return;
  try{
    const [o, ex, m] = await Promise.all([
      window.storage.get(STORAGE_KEYS.orders, true),
      window.storage.get(STORAGE_KEYS.expenses, true),
      window.storage.get(STORAGE_KEYS.menu, true),
    ]);
    state.orders = JSON.parse(o.value);
    state.expenses = JSON.parse(ex.value);
    state.menu = JSON.parse(m.value);
    if(state.view==='admin' && !state.modal) render();
  } catch(e){ console.error('Gagal refresh dari cloud', e); }
}
setInterval(refreshFromCloud, 6000);

/* ---------------- Auth ---------------- */
function attemptLogin(username, password){
  const user = state.users.find(u => u.username === username && u.password === password);
  if(!user){ state.loginError = 'Username atau password salah. Coba lagi.'; render(); return; }
  state.currentUser = user;
  state.loginError = '';
  state.cart = [];
  state.view = user.role === 'admin' ? 'admin' : 'kasir';
  state.adminTab = 'dashboard';
  render();
}
function logout(){
  state.currentUser = null;
  state.view = 'login';
  state.cart = [];
  render();
}

/* ---------------- Cart / Kasir logic ---------------- */
function addToCart(menuId){
  const item = state.menu.find(m=>m.id===menuId);
  if(!item || !item.available) return;
  const existing = state.cart.find(c=>c.menuId===menuId);
  if(existing) existing.qty += 1;
  else state.cart.push({menuId:item.id, name:item.name, price:item.price, category:item.category, qty:1});
  render();
}
function changeQty(menuId, delta){
  const it = state.cart.find(c=>c.menuId===menuId);
  if(!it) return;
  it.qty += delta;
  if(it.qty<=0) state.cart = state.cart.filter(c=>c.menuId!==menuId);
  render();
}
function removeFromCart(menuId){ state.cart = state.cart.filter(c=>c.menuId!==menuId); render(); }
function cartSubtotal(){ return state.cart.reduce((s,c)=>s+c.price*c.qty,0); }
function cartTax(){ return Math.round(cartSubtotal()*0.1); }
function cartTotal(){ return cartSubtotal()+cartTax(); }

function openCheckout(){
  if(state.cart.length===0) return;
  state.payMethod = 'Cash';
  state.cashGiven = '';
  state.modal = {type:'checkout'};
  render();
}
function proceedCheckout(){
  if(state.payMethod === 'QRIS'){
    state.modal = {type:'qris'};
    render();
  } else {
    finalizeOrder();
  }
}
async function finalizeOrder(){
  const total = cartTotal();
  const orderNo = 'HR-' + String(state.orders.length+1).padStart(4,'0');
  const order = {
    id: uid('o'),
    orderNo,
    cashierName: state.currentUser.name,
    items: state.cart.map(c=>({name:c.name, price:c.price, qty:c.qty, category:c.category})),
    subtotal: cartSubtotal(),
    tax: cartTax(),
    total,
    paymentMethod: state.payMethod,
    cashGiven: state.payMethod==='Cash' ? Number(state.cashGiven||total) : total,
    timestamp: Date.now(),
  };
  state.orders.unshift(order);
  await persist('orders');
  state.cart = [];
  state.modal = {type:'receipt', data:order};
  render();
}
function closeModal(){ state.modal=null; render(); }

/* ---------------- Stats ---------------- */
function computeStats(){
  const now = Date.now();
  const todayOrders = state.orders.filter(o=>isSameDay(o.timestamp, now));
  const todayExpenses = state.expenses.filter(e=>isSameDay(e.date, now));
  const incomeToday = todayOrders.reduce((s,o)=>s+o.total,0);
  const expenseToday = todayExpenses.reduce((s,e)=>s+Number(e.amount),0);

  const weekStart = daysAgo(6).setHours(0,0,0,0);
  const weekOrders = state.orders.filter(o=>o.timestamp>=weekStart);
  const weekExpenses = state.expenses.filter(e=>e.date>=weekStart);
  const incomeWeek = weekOrders.reduce((s,o)=>s+o.total,0);
  const expenseWeek = weekExpenses.reduce((s,e)=>s+Number(e.amount),0);

  const monthStart = daysAgo(29).setHours(0,0,0,0);
  const monthOrders = state.orders.filter(o=>o.timestamp>=monthStart);
  const monthExpenses = state.expenses.filter(e=>e.date>=monthStart);
  const incomeMonth = monthOrders.reduce((s,o)=>s+o.total,0);
  const expenseMonth = monthExpenses.reduce((s,e)=>s+Number(e.amount),0);

  return {
    incomeToday, expenseToday, netToday: incomeToday-expenseToday,
    incomeWeek, expenseWeek, netWeek: incomeWeek-expenseWeek,
    incomeMonth, expenseMonth, netMonth: incomeMonth-expenseMonth,
    ordersTodayCount: todayOrders.length,
  };
}
function last7DaysSeries(){
  const days=[];
  for(let i=6;i>=0;i--){
    const d = daysAgo(i);
    const dayStart = new Date(d).setHours(0,0,0,0);
    const dayEnd = new Date(d).setHours(23,59,59,999);
    const income = state.orders.filter(o=>o.timestamp>=dayStart && o.timestamp<=dayEnd).reduce((s,o)=>s+o.total,0);
    const expense = state.expenses.filter(e=>e.date>=dayStart && e.date<=dayEnd).reduce((s,e)=>s+Number(e.amount),0);
    days.push({label:d.toLocaleDateString('id-ID',{weekday:'short'}), income, expense});
  }
  return days;
}
function exportTodayToExcel(){
  const now = Date.now();
  const todayOrders = state.orders.filter(o=>isSameDay(o.timestamp, now));
  const todayExpenses = state.expenses.filter(e=>isSameDay(e.date, now));

  const incomeRows = todayOrders.map(o=>({
    'No. Pesanan': o.orderNo,
    'Kasir': o.cashierName,
    'Waktu': fmtDateTime(o.timestamp),
    'Item': o.items.map(i=>`${i.name} x${i.qty}`).join(', '),
    'Metode Bayar': o.paymentMethod,
    'Subtotal': o.subtotal,
    'Pajak': o.tax,
    'Total': o.total,
  }));
  const expenseRows = todayExpenses.map(e=>({
    'Deskripsi': e.desc,
    'Kategori': e.category,
    'Waktu': fmtDateTime(e.date),
    'Jumlah': Number(e.amount),
  }));

  const totalIncome = todayOrders.reduce((s,o)=>s+o.total,0);
  const totalExpense = todayExpenses.reduce((s,e)=>s+Number(e.amount),0);
  const summaryRows = [
    {'Keterangan':'Total Pemasukan', 'Jumlah (Rp)': totalIncome},
    {'Keterangan':'Total Pengeluaran', 'Jumlah (Rp)': totalExpense},
    {'Keterangan':'Laba Bersih', 'Jumlah (Rp)': totalIncome-totalExpense},
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Ringkasan');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(incomeRows), 'Pemasukan');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expenseRows), 'Pengeluaran');

  const dateStr = new Date().toLocaleDateString('id-ID').replace(/\//g,'-');
  XLSX.writeFile(wb, `Rekap-Hikari-Ramen-${dateStr}.xlsx`);
}

/* ---------------- Menu CRUD ---------------- */
function openMenuForm(menuId){
  const item = menuId ? state.menu.find(m=>m.id===menuId) : {id:null,name:'',category:'Ramen',price:'',available:true,image:''};
  state.modal = {type:'menuForm', data:{...item}};
  render();
}
async function saveMenuForm(name, category, price, image){
  const data = state.modal.data;
  if(!name.trim() || !price) return;
  if(data.id){
    const it = state.menu.find(m=>m.id===data.id);
    it.name=name; it.category=category; it.price=Number(price); it.image=image;
  } else {
    state.menu.push({id:uid('m'), name, category, price:Number(price), available:true, image});
  }
  await persist('menu');
  state.modal=null; render();
}
async function toggleMenuAvailability(menuId){
  const it = state.menu.find(m=>m.id===menuId);
  it.available = !it.available;
  await persist('menu'); render();
}
async function deleteMenuItem(menuId){
  state.menu = state.menu.filter(m=>m.id!==menuId);
  await persist('menu'); render();
}

/* ---------------- Expense CRUD ---------------- */
function openExpenseForm(){ state.modal={type:'expenseForm'}; render(); }
async function saveExpenseForm(desc, amount, category){
  if(!desc.trim() || !amount) return;
  state.expenses.unshift({id:uid('e'), desc, amount:Number(amount), category, date:Date.now()});
  await persist('expenses');
  state.modal=null; render();
}
async function deleteExpense(expId){
  state.expenses = state.expenses.filter(e=>e.id!==expId);
  await persist('expenses'); render();
}

/* ---------------- Employee CRUD ---------------- */
function openEmployeeForm(){ state.modal={type:'employeeForm'}; render(); }
async function saveEmployeeForm(name, username, password, role){
  if(!name.trim() || !username.trim() || !password) return;
  if(state.users.find(u=>u.username===username)){ alert('Username sudah dipakai.'); return; }
  state.users.push({id:uid('u'), name, username, password, role});
  await persist('users');
  state.modal=null; render();
}
async function deleteEmployee(userId){
  if(userId===state.currentUser.id){ alert('Tidak bisa menghapus akun sendiri.'); return; }
  state.users = state.users.filter(u=>u.id!==userId);
  await persist('users'); render();
}

function printReceipt(){ window.print(); }

/* ================= RENDER ================= */
function render(){
  const app = document.getElementById('app');
  if(state.view==='loading'){ app.innerHTML = ''; return; }
  if(state.view==='login'){ app.innerHTML = renderLogin(); attachLoginEvents(); return; }
  if(state.view==='kasir'){ app.innerHTML = renderKasirShell(); attachShellEvents(); return; }
  if(state.view==='admin'){ app.innerHTML = renderAdminShell(); attachShellEvents(); return; }
}

function steamHtml(n, leftBase){
  let out='';
  for(let i=0;i<n;i++){
    const left = leftBase + i*9;
    const delay = (i*1.3).toFixed(1);
    const dur = (4.5 + i*0.4).toFixed(1);
    out += `<div class="steam-wisp" style="left:${left}px; animation-delay:${delay}s; animation-duration:${dur}s;"></div>`;
  }
  return out;
}

function renderLogin(){
  return `
  <div class="login-screen">
    <div class="login-bg-noren">${'<div class="noren-strip"></div>'.repeat(8)}</div>
    <div class="steam-wrap" style="left:50%; top:120px; transform:translateX(-70px);">${steamHtml(5,0)}</div>
    <div class="login-card">
      <div class="login-mark">
        <div class="login-kanji">光 R A M E N</div>
        <h1 class="login-title">Hikari Ramen</h1>
      </div>
      <div class="login-tagline">RASAKAN NIKMATNYA KUAH DAN CITA RASA RAMEN</div>
      ${state.loginError ? `<div class="login-error">${state.loginError}</div>` : ''}
      <form id="loginForm">
        <div class="field">
          <label>Username</label>
          <input type="text" id="loginUser" autocomplete="username" placeholder="mis. bintangcakep1" required />
        </div>
        <div class="field">
          <label>Password</label>
          <input type="password" id="loginPass" autocomplete="current-password" placeholder="••••••••" required />
        </div>
        <button type="submit" class="btn btn-primary">Masuk</button>
      </form>
    </div>
  </div>`;
}
function attachLoginEvents(){
  const f = document.getElementById('loginForm');
  if(f) f.addEventListener('submit', e=>{
    e.preventDefault();
    attemptLogin(document.getElementById('loginUser').value.trim(), document.getElementById('loginPass').value);
  });
}

function initials(name){ return name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase(); }

function sidebarHtml(){
  const isAdmin = state.currentUser.role==='admin';
  const navAdmin = [
    ['dashboard','◈','Dashboard'],
    ['pos','🍜','Buka Kasir'],
    ['menu','📋','Menu Makanan'],
    ['orders','🧾','Riwayat Pesanan'],
    ['expenses','💴','Pengeluaran'],
    ['employees','👥','Karyawan'],
  ];
  return `
  <div class="sidebar ${state.sidebarOpen?'open':''}">
    <div class="brand">
      <div class="brand-dot"></div>
      <div><div class="brand-name">Hikari Ramen</div><div class="brand-sub">POS System</div></div>
    </div>
    ${isAdmin ? `
      <div class="nav-group">
        <div class="nav-label">Manajemen</div>
        ${navAdmin.map(([key,icon,label])=>`
          <button class="nav-item ${state.adminTab===key?'active':''}" data-nav="${key}">
            <span class="nav-icon">${icon}</span>${label}
          </button>`).join('')}
      </div>` : ''
    }
    <div class="sidebar-footer">
      <div class="user-chip">
        <div class="user-avatar">${initials(state.currentUser.name)}</div>
        <div>
          <div class="user-name">${state.currentUser.name}</div>
          <div class="user-role">${state.currentUser.role==='admin'?'Manager':'Kasir'}</div>
        </div>
      </div>
      <button class="btn btn-ghost btn-sm" style="width:100%" data-action="logout">Keluar</button>
    </div>
  </div>`;
}

/* ---------- Kasir view ---------- */
function renderKasirShell(){
  const categories = ['Ramen','Side','Minuman','Dessert'];
  const filteredMenu = state.menu.filter(m=>m.category===state.activeCategory);
  return `
  <div class="shell">
    ${sidebarHtml()}
    <div class="main">
      <div class="topbar">
        <div><h1>Kasir</h1><div class="topbar-sub">Pilih menu untuk mulai pesanan baru</div></div>
        <span class="pill pill-live"><span class="dot"></span>Cloud Sync Aktif</span>
      </div>
      <div class="pos-layout">
        <div class="pos-menu">
          <div class="cat-tabs">
            ${categories.map(c=>`<button class="cat-tab ${state.activeCategory===c?'active':''}" data-cat="${c}">${c}</button>`).join('')}
          </div>
          <div class="menu-grid">
            ${filteredMenu.map(m=>`
              <div class="menu-card ${!m.available?'unavailable':''}" data-add="${m.id}">
                ${!m.available ? '<span class="menu-card-badge tag tag-dessert">Habis</span>' : ''}
                ${m.image ? `<img class="menu-card-img" src="${m.image}" alt="${m.name}" onerror="this.style.display='none'"/>` : `<div class="menu-card-img menu-card-img-placeholder">🍜</div>`}
                <div class="menu-card-name">${m.name}</div>
                <div class="menu-card-price">${fmtRp(m.price)}</div>
              </div>
            `).join('') || `<div class="empty-state">Belum ada menu di kategori ini.</div>`}
          </div>
        </div>
        ${cartPanelHtml()}
      </div>
    </div>
  </div>
  ${modalHtml()}
  `;
}

function cartPanelHtml(){
  return `
  <div class="cart-panel">
    <div class="cart-head">
      <h3>Pesanan Saat Ini</h3>
      <div class="order-no">Kasir: ${state.currentUser.name}</div>
    </div>
    <div class="cart-items">
      ${state.cart.length===0 ? `<div class="cart-empty">Keranjang kosong.<br/>Ketuk menu untuk menambahkan.</div>` :
        state.cart.map(c=>`
        <div class="cart-item">
          <div style="flex:1;">
            <div class="cart-item-name">${c.name}</div>
            <div class="cart-item-price">${fmtRp(c.price)}</div>
          </div>
          <div class="qty-ctrl">
            <button class="qty-btn" data-qty-minus="${c.menuId}">−</button>
            <span class="qty-val">${c.qty}</span>
            <button class="qty-btn" data-qty-plus="${c.menuId}">+</button>
          </div>
          <div class="cart-item-total">${fmtRp(c.price*c.qty)}</div>
          <button class="cart-remove" data-remove="${c.menuId}">✕</button>
        </div>
      `).join('')}
    </div>
    <div class="cart-foot">
      <div class="cart-line"><span>Subtotal</span><span class="val">${fmtRp(cartSubtotal())}</span></div>
      <div class="cart-line"><span>Pajak (10%)</span><span class="val">${fmtRp(cartTax())}</span></div>
      <div class="cart-line total"><span>Total</span><span class="val">${fmtRp(cartTotal())}</span></div>
      <button class="btn btn-primary" style="margin-top:14px;" data-action="checkout" ${state.cart.length===0?'disabled':''}>Bayar Sekarang</button>
    </div>
  </div>`;
}

/* ---------- Admin view ---------- */
function renderAdminShell(){
  let body = '';
  if(state.adminTab==='dashboard') body = renderDashboard();
  else if(state.adminTab==='pos') return renderKasirShell();
  else if(state.adminTab==='menu') body = renderMenuManagement();
  else if(state.adminTab==='orders') body = renderOrderHistory();
  else if(state.adminTab==='expenses') body = renderExpenses();
  else if(state.adminTab==='employees') body = renderEmployees();

  const titles = {
    dashboard:['Dashboard','Ringkasan pemasukan & pengeluaran real-time'],
    menu:['Menu Makanan','Tambah, ubah, atau nonaktifkan item menu'],
    orders:['Riwayat Pesanan','Semua transaksi yang sudah tercatat'],
    expenses:['Pengeluaran','Catat biaya operasional restoran'],
    employees:['Karyawan','Kelola akun kasir dan admin'],
  };
  const [title, sub] = titles[state.adminTab];

  return `
  <div class="shell">
    ${sidebarHtml()}
    <div class="main">
      <div class="topbar">
        <div><h1>${title}</h1><div class="topbar-sub">${sub}</div></div>
        <span class="pill pill-live"><span class="dot"></span>Live</span>
      </div>
      <div class="content">${body}</div>
    </div>
  </div>
  ${modalHtml()}
  `;
}

function renderDashboard(){
  const s = computeStats();
  const series = last7DaysSeries();
  const maxVal = Math.max(...series.map(d=>Math.max(d.income,d.expense)), 1000);
  return `
  <div class="toolbar" style="margin-bottom:18px;">
    <div></div>
    <button class="btn btn-primary btn-sm" data-action="export-excel">⬇ Export Rekap Hari Ini (Excel)</button>
  </div>
  <div class="stat-grid">
    <div class="stat-card" style="--accent:var(--gold)">
      <div class="stat-label">Pemasukan Hari Ini</div>
      <div class="stat-value gold">${fmtRp(s.incomeToday)}</div>
      <div class="stat-foot">${s.ordersTodayCount} transaksi tercatat</div>
    </div>
    <div class="stat-card" style="--accent:var(--red)">
      <div class="stat-label">Pengeluaran Hari Ini</div>
      <div class="stat-value red">${fmtRp(s.expenseToday)}</div>
      <div class="stat-foot">Bahan baku, gaji, dll.</div>
    </div>
    <div class="stat-card" style="--accent:var(--green)">
      <div class="stat-label">Laba Bersih Hari Ini</div>
      <div class="stat-value ${s.netToday>=0?'green':'red'}">${fmtRp(s.netToday)}</div>
      <div class="stat-foot">Pemasukan − pengeluaran</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Laba Bersih Bulan Ini</div>
      <div class="stat-value">${fmtRp(s.netMonth)}</div>
      <div class="stat-foot">30 hari terakhir</div>
    </div>
  </div>

  <div class="panel">
    <div class="panel-title">Tren 7 Hari Terakhir</div>
    <div class="bars">
      ${series.map(d=>`
        <div class="bar-col">
          <div class="bar-stack" style="height:100%;">
            <div class="bar-seg income" style="height:${Math.max((d.income/maxVal)*100,d.income>0?4:0)}%"></div>
          </div>
          <div class="bar-day">${d.label}</div>
        </div>
      `).join('')}
    </div>
    <div class="legend">
      <span><i style="background:var(--gold)"></i>Pemasukan</span>
      <span><i style="background:var(--red)"></i>Pengeluaran</span>
    </div>
  </div>

  <div class="panel">
    <div class="panel-title">Transaksi Terbaru</div>
    ${state.orders.length===0 ? `<div class="empty-state"><div class="em-icon">🧾</div>Belum ada transaksi.</div>` : `
    <table>
      <thead><tr><th>No. Pesanan</th><th>Kasir</th><th>Waktu</th><th>Metode</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>
        ${state.orders.slice(0,6).map(o=>`
          <tr>
            <td class="mono">${o.orderNo}</td>
            <td>${o.cashierName}</td>
            <td>${fmtDateTime(o.timestamp)}</td>
            <td>${o.paymentMethod}</td>
            <td class="mono" style="text-align:right; color:var(--gold-soft); font-weight:600;">${fmtRp(o.total)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`}
  </div>
  `;
}

function renderMenuManagement(){
  const q = state.menuSearch.toLowerCase();
  const filtered = state.menu.filter(m=>m.name.toLowerCase().includes(q));
  const cats = ['Ramen','Side','Minuman','Dessert'];
  const tagClass = {Ramen:'tag-ramen', Side:'tag-side', Minuman:'tag-minuman', Dessert:'tag-dessert'};
  return `
  <div class="toolbar">
    <input class="search-box" id="menuSearchInput" placeholder="Cari menu..." value="${state.menuSearch}"/>
    <button class="btn btn-primary btn-sm" data-action="add-menu">+ Tambah Menu</button>
  </div>
  <div class="panel" style="padding:0; overflow:hidden;">
    <table>
      <thead><tr><th>Nama</th><th>Kategori</th><th>Harga</th><th>Status</th><th></th></tr></thead>
      <tbody>
        ${filtered.map(m=>`
          <tr>
            <td style="font-weight:600;">${m.name}</td>
            <td><span class="tag ${tagClass[m.category]||''}">${m.category}</span></td>
            <td class="mono">${fmtRp(m.price)}</td>
            <td><button class="toggle-switch ${m.available?'on':''}" data-toggle-avail="${m.id}"></button></td>
            <td style="text-align:right; white-space:nowrap;">
              <button class="btn btn-ghost btn-sm" data-edit-menu="${m.id}">Ubah</button>
              <button class="btn btn-danger btn-sm" data-del-menu="${m.id}">Hapus</button>
            </td>
          </tr>
        `).join('') || `<tr><td colspan="5"><div class="empty-state">Menu tidak ditemukan.</div></td></tr>`}
      </tbody>
    </table>
  </div>
  `;
}

function renderOrderHistory(){
  return `
  <div class="panel" style="padding:0; overflow:hidden;">
    ${state.orders.length===0 ? `<div class="empty-state"><div class="em-icon">🧾</div>Belum ada riwayat pesanan.</div>` : `
    <table>
      <thead><tr><th>No. Pesanan</th><th>Kasir</th><th>Item</th><th>Waktu</th><th>Metode</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>
        ${state.orders.map(o=>`
          <tr>
            <td class="mono">${o.orderNo}</td>
            <td>${o.cashierName}</td>
            <td>${o.items.map(i=>i.name+' ×'+i.qty).join(', ')}</td>
            <td>${fmtDateTime(o.timestamp)}</td>
            <td>${o.paymentMethod}</td>
            <td class="mono" style="text-align:right; color:var(--gold-soft); font-weight:600;">${fmtRp(o.total)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`}
  </div>
  `;
}

function renderExpenses(){
  const total = state.expenses.reduce((s,e)=>s+Number(e.amount),0);
  return `
  <div class="toolbar">
    <div class="stat-foot" style="font-size:13px;">Total tercatat: <b class="mono" style="color:var(--red-soft)">${fmtRp(total)}</b></div>
    <button class="btn btn-primary btn-sm" data-action="add-expense">+ Catat Pengeluaran</button>
  </div>
  <div class="panel" style="padding:0; overflow:hidden;">
    ${state.expenses.length===0 ? `<div class="empty-state"><div class="em-icon">💴</div>Belum ada pengeluaran tercatat.</div>` : `
    <table>
      <thead><tr><th>Deskripsi</th><th>Kategori</th><th>Tanggal</th><th style="text-align:right">Jumlah</th><th></th></tr></thead>
      <tbody>
        ${state.expenses.map(e=>`
          <tr>
            <td>${e.desc}</td>
            <td><span class="tag tag-minuman">${e.category}</span></td>
            <td>${fmtDateTime(e.date)}</td>
            <td class="mono" style="text-align:right; color:var(--red-soft); font-weight:600;">${fmtRp(e.amount)}</td>
            <td style="text-align:right;"><button class="btn btn-danger btn-sm" data-del-expense="${e.id}">Hapus</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>`}
  </div>
  `;
}

function renderEmployees(){
  return `
  <div class="toolbar">
    <div></div>
    <button class="btn btn-primary btn-sm" data-action="add-employee">+ Tambah Karyawan</button>
  </div>
  <div class="panel" style="padding:0; overflow:hidden;">
    <table>
      <thead><tr><th>Nama</th><th>Username</th><th>Peran</th><th></th></tr></thead>
      <tbody>
        ${state.users.map(u=>`
          <tr>
            <td style="font-weight:600;">${u.name}</td>
            <td class="mono">${u.username}</td>
            <td><span class="tag ${u.role==='admin'?'tag-dessert':'tag-side'}">${u.role==='admin'?'Manager':'Kasir'}</span></td>
            <td style="text-align:right;"><button class="btn btn-danger btn-sm" data-del-employee="${u.id}">Hapus</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  `;
}

/* ---------- Modals ---------- */
function modalHtml(){
  if(!state.modal) return '';
  const m = state.modal;
  if(m.type==='checkout') return checkoutModalHtml();
  if(m.type==='qris') return qrisModalHtml();
  if(m.type==='receipt') return receiptModalHtml(m.data);
  if(m.type==='menuForm') return menuFormModalHtml(m.data);
  if(m.type==='expenseForm') return expenseFormModalHtml();
  if(m.type==='employeeForm') return employeeFormModalHtml();
  return '';
}

function checkoutModalHtml(){
  const total = cartTotal();
  const given = Number(state.cashGiven||0);
  const change = state.payMethod==='Cash' ? Math.max(given-total,0) : 0;
  return `
  <div class="modal-overlay" data-close-overlay>
    <div class="modal">
      <button class="close-x" data-action="close-modal">✕</button>
      <h2>Konfirmasi Pembayaran</h2>
      <div class="cart-line"><span>Subtotal</span><span class="val mono">${fmtRp(cartSubtotal())}</span></div>
      <div class="cart-line"><span>Pajak (10%)</span><span class="val mono">${fmtRp(cartTax())}</span></div>
      <div class="cart-line total"><span>Total Bayar</span><span class="val mono">${fmtRp(total)}</span></div>

      <div style="margin-top:18px;">
        <label style="font-size:12px; color:var(--slate); display:block; margin-bottom:8px;">Metode Pembayaran</label>
        <div class="pay-methods">
          ${['Cash','QRIS','Debit'].map(pm=>`<button class="pay-method ${state.payMethod===pm?'active':''}" data-pay="${pm}">${pm}</button>`).join('')}
        </div>
      </div>

      ${state.payMethod==='Cash' ? `
        <div class="field">
          <label>Uang Diterima</label>
          <input type="number" id="cashGivenInput" value="${state.cashGiven}" placeholder="${total}"/>
        </div>
        <div class="cart-line"><span>Kembalian</span><span class="val mono" style="color:var(--green-soft)">${fmtRp(change)}</span></div>
      ` : ''}

      <div class="modal-actions">
        <button class="btn btn-ghost" data-action="close-modal">Batal</button>
        <button class="btn btn-primary" data-action="proceed-checkout">Selesaikan</button>
      </div>
    </div>
  </div>`;
}
function qrisModalHtml(){
  const total = cartTotal();
  return `
  <div class="modal-overlay" data-close-overlay>
    <div class="modal">
      <button class="close-x" data-action="close-modal">✕</button>
      <h2>Pembayaran QRIS</h2>
      <p style="color:var(--slate); font-size:13px; margin-top:-8px;">Minta pelanggan scan QR di bawah ini.</p>
      <div style="text-align:center; margin:18px 0;">
        <img src="${QRIS_IMAGE_URL}" alt="QRIS" class="qris-img"
             onerror="this.style.display='none'; document.getElementById('qrisMissingMsg').style.display='block';"/>
        <div id="qrisMissingMsg" style="display:none; color:var(--red-soft); font-size:12.5px;">
          Gambar QR tidak ditemukan. Cek nilai QRIS_IMAGE_URL di script.js.
        </div>
      </div>
      <div class="cart-line total"><span>Total Tagihan</span><span class="val mono">${fmtRp(total)}</span></div>
      <div class="modal-actions">
        <button class="btn btn-ghost" data-action="close-modal">Batal</button>
        <button class="btn btn-primary" data-action="confirm-qris">Sudah Dibayar, Lanjutkan</button>
      </div>
    </div>
  </div>`;
}

function receiptModalHtml(order){
  const givenLine = order.paymentMethod==='Cash' ? `
    <div class="receipt-line"><span>Bayar (${order.paymentMethod})</span><span>${fmtRp(order.cashGiven)}</span></div>
    <div class="receipt-line"><span>Kembali</span><span>${fmtRp(Math.max(order.cashGiven-order.total,0))}</span></div>
  ` : `<div class="receipt-line"><span>Bayar (${order.paymentMethod})</span><span>${fmtRp(order.total)}</span></div>`;

  return `
  <div class="modal-overlay" data-close-overlay>
    <div class="modal">
      <button class="close-x" data-action="close-modal">✕</button>
      <h2>Struk Pembayaran</h2>
      <div id="print-area">
        <div class="receipt">
          <div class="receipt-center">
            <div class="receipt-title">HIKARI RAMEN</div>
            <div class="receipt-sub">Restoran Ramen &amp; Izakaya · Tasikmalaya</div>
          </div>
          <hr/>
          <div class="receipt-line"><span>No. Pesanan</span><span>${order.orderNo}</span></div>
          <div class="receipt-line"><span>Kasir</span><span>${order.cashierName}</span></div>
          <div class="receipt-line"><span>Tanggal</span><span>${fmtDateTime(order.timestamp)}</span></div>
          <hr/>
          ${order.items.map(i=>`
            <div class="receipt-line"><span class="receipt-item-name">${i.name} ×${i.qty}</span><span>${fmtRp(i.price*i.qty)}</span></div>
          `).join('')}
          <hr/>
          <div class="receipt-line"><span>Subtotal</span><span>${fmtRp(order.subtotal)}</span></div>
          <div class="receipt-line"><span>Pajak (10%)</span><span>${fmtRp(order.tax)}</span></div>
          <div class="receipt-line" style="font-weight:700;"><span>TOTAL</span><span>${fmtRp(order.total)}</span></div>
          ${givenLine}
          <hr/>
          <div class="receipt-center">
            <div>Terima kasih atas kunjungan Anda!</div>
            <div style="margin-top:4px;">また来てください</div>
          </div>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" data-action="close-modal">Tutup</button>
        <button class="btn btn-primary" data-action="print-receipt">🖨 Cetak Struk</button>
      </div>
    </div>
  </div>`;
}

function menuFormModalHtml(data){
  const cats = ['Ramen','Side','Minuman','Dessert'];
  return `
  <div class="modal-overlay" data-close-overlay>
    <div class="modal">
      <button class="close-x" data-action="close-modal">✕</button>
      <h2>${data.id?'Ubah Menu':'Tambah Menu Baru'}</h2>
      <div class="field"><label>Nama Menu</label><input type="text" id="menuNameInput" value="${data.name}" placeholder="mis. Tantanmen"/></div>
      <div class="field">
        <label>Kategori</label>
        <select id="menuCatInput">
          ${cats.map(c=>`<option value="${c}" ${data.category===c?'selected':''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="field"><label>Harga (Rp)</label><input type="number" id="menuPriceInput" value="${data.price}" placeholder="35000"/></div>
      <div class="field"><label>URL Foto (opsional)</label><input type="text" id="menuImageInput" value="${data.image||''}" placeholder="https://..."/></div>
      <div class="modal-actions">
        <button class="btn btn-ghost" data-action="close-modal">Batal</button>
        <button class="btn btn-primary" data-action="save-menu">Simpan</button>
      </div>
    </div>
  </div>`;
}

function expenseFormModalHtml(){
  const cats = ['Bahan Baku','Gaji','Sewa','Utilitas','Lainnya'];
  return `
  <div class="modal-overlay" data-close-overlay>
    <div class="modal">
      <button class="close-x" data-action="close-modal">✕</button>
      <h2>Catat Pengeluaran</h2>
      <div class="field"><label>Deskripsi</label><input type="text" id="expDescInput" placeholder="mis. Beli mie & sayur"/></div>
      <div class="field">
        <label>Kategori</label>
        <select id="expCatInput">${cats.map(c=>`<option value="${c}">${c}</option>`).join('')}</select>
      </div>
      <div class="field"><label>Jumlah (Rp)</label><input type="number" id="expAmountInput" placeholder="150000"/></div>
      <div class="modal-actions">
        <button class="btn btn-ghost" data-action="close-modal">Batal</button>
        <button class="btn btn-primary" data-action="save-expense">Simpan</button>
      </div>
    </div>
  </div>`;
}

function employeeFormModalHtml(){
  return `
  <div class="modal-overlay" data-close-overlay>
    <div class="modal">
      <button class="close-x" data-action="close-modal">✕</button>
      <h2>Tambah Karyawan</h2>
      <div class="field"><label>Nama Lengkap</label><input type="text" id="empNameInput" placeholder="mis. Kevin Wijaya"/></div>
      <div class="field"><label>Username</label><input type="text" id="empUserInput" placeholder="mis. kasir3"/></div>
      <div class="field"><label>Password</label><input type="text" id="empPassInput" placeholder="mis. kasir123"/></div>
      <div class="field">
        <label>Peran</label>
        <select id="empRoleInput"><option value="kasir">Kasir</option><option value="admin">Manager (Admin)</option></select>
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost" data-action="close-modal">Batal</button>
        <button class="btn btn-primary" data-action="save-employee">Simpan</button>
      </div>
    </div>
  </div>`;
}

/* ---------------- Event delegation ---------------- */
function attachShellEvents(){
  const app = document.getElementById('app');

  app.querySelectorAll('[data-nav]').forEach(el=>el.addEventListener('click', ()=>{
    state.adminTab = el.getAttribute('data-nav'); render();
  }));
  const logoutBtn = app.querySelector('[data-action="logout"]');
  if(logoutBtn) logoutBtn.addEventListener('click', logout);

  app.querySelectorAll('[data-cat]').forEach(el=>el.addEventListener('click', ()=>{
    state.activeCategory = el.getAttribute('data-cat'); render();
  }));
  app.querySelectorAll('[data-add]').forEach(el=>el.addEventListener('click', ()=>addToCart(el.getAttribute('data-add'))));
  app.querySelectorAll('[data-qty-plus]').forEach(el=>el.addEventListener('click', ()=>changeQty(el.getAttribute('data-qty-plus'),1)));
  app.querySelectorAll('[data-qty-minus]').forEach(el=>el.addEventListener('click', ()=>changeQty(el.getAttribute('data-qty-minus'),-1)));
  app.querySelectorAll('[data-remove]').forEach(el=>el.addEventListener('click', ()=>removeFromCart(el.getAttribute('data-remove'))));
  
  const exportBtn = app.querySelector('[data-action="export-excel"]');
  if(exportBtn) exportBtn.addEventListener('click', exportTodayToExcel);

  const checkoutBtn = app.querySelector('[data-action="checkout"]');
  if(checkoutBtn) checkoutBtn.addEventListener('click', openCheckout);

  const closeBtns = app.querySelectorAll('[data-action="close-modal"]');
  closeBtns.forEach(el=>el.addEventListener('click', closeModal));
  const overlay = app.querySelector('[data-close-overlay]');
  if(overlay) overlay.addEventListener('click', (e)=>{ if(e.target===overlay) closeModal(); });

  app.querySelectorAll('[data-pay]').forEach(el=>el.addEventListener('click', ()=>{ state.payMethod = el.getAttribute('data-pay'); render(); }));
  const cashInput = document.getElementById('cashGivenInput');
  if(cashInput) cashInput.addEventListener('input', (e)=>{ state.cashGiven = e.target.value; render(); });
  const proceedBtn = app.querySelector('[data-action="proceed-checkout"]');
  if(proceedBtn) proceedBtn.addEventListener('click', proceedCheckout);
  const confirmQrisBtn = app.querySelector('[data-action="confirm-qris"]');
  if(confirmQrisBtn) confirmQrisBtn.addEventListener('click', finalizeOrder);
  const printBtn = app.querySelector('[data-action="print-receipt"]');
  if(printBtn) printBtn.addEventListener('click', printReceipt);

  // Menu management
  const searchInput = document.getElementById('menuSearchInput');
  if(searchInput){
    searchInput.addEventListener('input', (e)=>{ state.menuSearch = e.target.value; render(); });
    searchInput.focus(); searchInput.selectionStart = searchInput.value.length;
  }
  const addMenuBtn = app.querySelector('[data-action="add-menu"]');
  if(addMenuBtn) addMenuBtn.addEventListener('click', ()=>openMenuForm(null));
  app.querySelectorAll('[data-edit-menu]').forEach(el=>el.addEventListener('click', ()=>openMenuForm(el.getAttribute('data-edit-menu'))));
  app.querySelectorAll('[data-del-menu]').forEach(el=>el.addEventListener('click', ()=>{ if(confirm('Hapus menu ini?')) deleteMenuItem(el.getAttribute('data-del-menu')); }));
  app.querySelectorAll('[data-toggle-avail]').forEach(el=>el.addEventListener('click', ()=>toggleMenuAvailability(el.getAttribute('data-toggle-avail'))));
  const saveMenuBtn = app.querySelector('[data-action="save-menu"]');
  if(saveMenuBtn) saveMenuBtn.addEventListener('click', ()=>{
    saveMenuForm(document.getElementById('menuNameInput').value, document.getElementById('menuCatInput').value, document.getElementById('menuPriceInput').value, document.getElementById('menuImageInput').value);
  });

  // Expenses
  const addExpBtn = app.querySelector('[data-action="add-expense"]');
  if(addExpBtn) addExpBtn.addEventListener('click', openExpenseForm);
  app.querySelectorAll('[data-del-expense]').forEach(el=>el.addEventListener('click', ()=>{ if(confirm('Hapus catatan pengeluaran ini?')) deleteExpense(el.getAttribute('data-del-expense')); }));
  const saveExpBtn = app.querySelector('[data-action="save-expense"]');
  if(saveExpBtn) saveExpBtn.addEventListener('click', ()=>{
    saveExpenseForm(document.getElementById('expDescInput').value, document.getElementById('expAmountInput').value, document.getElementById('expCatInput').value);
  });

  // Employees
  const addEmpBtn = app.querySelector('[data-action="add-employee"]');
  if(addEmpBtn) addEmpBtn.addEventListener('click', openEmployeeForm);
  app.querySelectorAll('[data-del-employee]').forEach(el=>el.addEventListener('click', ()=>{ if(confirm('Hapus karyawan ini?')) deleteEmployee(el.getAttribute('data-del-employee')); }));
  const saveEmpBtn = app.querySelector('[data-action="save-employee"]');
  if(saveEmpBtn) saveEmpBtn.addEventListener('click', ()=>{
    saveEmployeeForm(document.getElementById('empNameInput').value, document.getElementById('empUserInput').value, document.getElementById('empPassInput').value, document.getElementById('empRoleInput').value);
  });
}

/* ---------------- Init ---------------- */
(async function init(){
  await loadData();
  state.view = 'login';
  render();
})();