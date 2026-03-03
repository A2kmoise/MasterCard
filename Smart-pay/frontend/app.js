// ========================================
// WEBSOCKET & STATE
// ========================================
const BACKEND_URL = `${location.protocol}//${location.hostname}:${location.port}`;
const socket = io(BACKEND_URL);

// Global state
let currentRole = 'admin'; // 'admin' or 'cashier'
let lastScannedUid = null;
let lastScannedBalance = null;
let products = [];
let authToken = localStorage.getItem('smart_pay_token');
let currentUser = JSON.parse(localStorage.getItem('smart_pay_user'));
let isRegisterMode = false;

// ========================================
// DOM ELEMENTS
// ========================================
// Shared
const cardVisual = document.getElementById('card-visual');
const cardUidDisplay = document.getElementById('card-uid-display');
const cardBalanceDisplay = document.getElementById('card-balance-display');
const statusDisplay = document.getElementById('status-display');
const logList = document.getElementById('log-list');
const appLayout = document.querySelector('.app-layout');
const connectionStatus = document.getElementById('connection-status');

// Layout Elements
const sidebar = document.getElementById('sidebar');
const mobileOpen = document.getElementById('mobile-open');
const mobileClose = document.getElementById('mobile-close');
const userDisplayName = document.getElementById('user-display-name');
const navItems = document.querySelectorAll('.nav-item');
const dashboardSections = document.querySelectorAll('.dashboard-section');
const roleIcon = document.getElementById('role-icon');
const roleName = document.getElementById('role-name');
const dashboardTitleContainer = document.getElementById('dashboard-title-container');

// Interface Panels
const adminPanel = document.getElementById('admin-panel');
const cashierPanel = document.getElementById('cashier-panel');

// Admin interface
const adminUid = document.getElementById('admin-uid');
const adminCurrentBalance = document.getElementById('admin-current-balance');
const adminAmount = document.getElementById('admin-amount');
const adminTopupBtn = document.getElementById('admin-topup-btn');
const adminResponse = document.getElementById('admin-response');

// Cashier interface
const cashierUid = document.getElementById('cashier-uid');
const cashierCurrentBalance = document.getElementById('cashier-current-balance');
const cashierProduct = document.getElementById('cashier-product');
const cashierQuantity = document.getElementById('cashier-quantity');
const cashierTotalCost = document.getElementById('cashier-total-cost');
const cashierPayBtn = document.getElementById('cashier-pay-btn');
const cashierResponse = document.getElementById('cashier-response');

// Auth elements
const loginOverlay = document.getElementById('login-overlay');
const loginForm = document.getElementById('login-form');
const logoutBtn = document.getElementById('logout-btn');
const loginError = document.getElementById('login-error');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

// Auth Toggle elements
const authTitle = document.getElementById('auth-title');
const authDesc = document.getElementById('auth-desc');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const toggleAuthBtn = document.getElementById('toggle-auth-btn');
const toggleText = document.getElementById('toggle-text');



// ========================================
// AUTHENTICATION
// ========================================
function checkAuth() {
    if (authToken && currentUser) {
        loginOverlay.style.display = 'none';
        appLayout.style.display = 'flex';
        userDisplayName.textContent = currentUser.username;
        addLog(`👋 Welcome back, ${currentUser.username}`);

        // Initialize role-based views
        const navManagement = document.getElementById('nav-management');
        if (currentUser.role === 'cashier') {
            adminPanel.style.display = 'none';
            cashierPanel.style.display = 'block';
            roleIcon.textContent = '💳';
            roleName.textContent = 'Cashier Dashboard';
            if (navManagement) navManagement.querySelector('a').innerHTML = '<span class="icon">💰</span> Payments';
            addLog('💼 Cashier Dashboard active');
        } else {
            adminPanel.style.display = 'block';
            cashierPanel.style.display = 'none';
            roleIcon.textContent = '👤';
            roleName.textContent = 'Admin Dashboard';
            if (navManagement) navManagement.querySelector('a').innerHTML = '<span class="icon">➕</span> Top-Up';
            addLog('🔧 Admin Dashboard active');
        }
        dashboardTitleContainer.style.display = 'flex';

        switchSection('overview');
    } else {
        loginOverlay.style.display = 'flex';
        appLayout.style.display = 'none';
    }
}

// ========================================
// NAVIGATION LOGIC
// ========================================

function switchSection(sectionId) {
    // Update Nav Items
    navItems.forEach(item => {
        if (item.dataset.section === sectionId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Update Dashboard Sections
    dashboardSections.forEach(section => {
        if (section.id === `section-${sectionId}`) {
            section.classList.add('active');
        } else {
            section.classList.remove('active');
        }
    });

    // Close mobile sidebar on navigate
    sidebar.classList.remove('open');
}

// Event Listeners for Navigation
navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const sectionId = item.dataset.section;
        switchSection(sectionId);
    });
});

// Mobile Sidebar Toggles
if (mobileOpen) {
    mobileOpen.addEventListener('click', () => sidebar.classList.add('open'));
}
if (mobileClose) {
    mobileClose.addEventListener('click', () => sidebar.classList.remove('open'));
}

// Auth Toggle Handler (using delegation to avoid losing listener on HTML change)
if (toggleText) {
    toggleText.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'toggle-auth-btn') {
            e.preventDefault();
            isRegisterMode = !isRegisterMode;
            updateAuthUI();
        }
    });
}

function updateAuthUI() {
    if (isRegisterMode) {
        authTitle.textContent = '📝 Cashier Registration';
        authDesc.textContent = 'Create a new cashier account';
        authSubmitBtn.textContent = 'Register New Cashier';
        toggleText.innerHTML = 'Already have an account? <a href="#" id="toggle-auth-btn">Login here</a>';
    } else {
        authTitle.textContent = '🔐 System Login';
        authDesc.textContent = 'Please enter your credentials to access the dashboard';
        authSubmitBtn.textContent = 'Login to Dashboard';
        toggleText.innerHTML = 'New cashier? <a href="#" id="toggle-auth-btn">Register here</a>';
    }

    loginError.textContent = '';
    usernameInput.value = '';
    passwordInput.value = '';
}

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';

    const username = usernameInput.value;
    const password = passwordInput.value;

    const endpoint = isRegisterMode ? '/api/register' : '/api/login';

    try {
        const response = await fetch(`${BACKEND_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, role: 'cashier' })
        });

        const result = await response.json();

        if (result.success) {
            if (isRegisterMode) {
                isRegisterMode = false;
                toggleAuthBtn.click(); // Switch back to login
                loginError.className = 'response-message success';
                loginError.textContent = 'Registration successful! Please login.';
                addLog(`✓ Registered new cashier: ${username}`);
            } else {
                authToken = result.token;
                currentUser = result.user;
                localStorage.setItem('smart_pay_token', authToken);
                localStorage.setItem('smart_pay_user', JSON.stringify(currentUser));

                usernameInput.value = '';
                passwordInput.value = '';
                checkAuth();
                addLog(`✓ Logged in as: ${currentUser.username}`);
            }
        } else {
            loginError.className = 'response-message error';
            loginError.textContent = result.error || 'Operation failed';
        }
    } catch (error) {
        loginError.className = 'response-message error';
        loginError.textContent = 'Connection error';
        console.error('Auth error:', error);
    }
});

logoutBtn.addEventListener('click', () => {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('smart_pay_token');
    localStorage.removeItem('smart_pay_user');
    checkAuth();
    addLog('🚪 Logged out');
});

// ========================================
// WEBSOCKET EVENTS
// ========================================
socket.on('connect', () => {
    addLog('✓ Connected to backend server');
    connectionStatus.className = 'status-online';

    // Request products on connect
    socket.emit('request-products');
});

socket.on('disconnect', () => {
    addLog('✗ Disconnected from backend');
    connectionStatus.className = 'status-offline';
});

// Card scanned event
socket.on('card-scanned', (data) => {
    const { uid, deviceBalance } = data;
    addLog(`🔍 Card detected: ${uid}`);

    lastScannedUid = uid;

    // Update shared display
    cardVisual.classList.add('active');
    cardUidDisplay.textContent = uid;

    // Update role-specific fields
    adminUid.value = uid;
    adminTopupBtn.disabled = false;

    cashierUid.value = uid;
    if (products.length > 0) {
        cashierPayBtn.disabled = false;
    }

    // Fetch actual balance from database
    socket.emit('request-balance', { uid });

    statusDisplay.innerHTML = `
    <div class="data-row">
      <span class="data-label">UID:</span>
      <span class="data-value">${uid}</span>
    </div>
    <div class="data-row">
      <span class="data-label">Balance:</span>
      <span class="data-value" style="color: #10b981;">Fetching from database...</span>
    </div>
    <div class="data-row">
      <span class="data-label">Status:</span>
      <span class="data-value" style="color: #4ade80;">✓ Active</span>
    </div>
  `;

    clearResponses();
});

// Top-up success
socket.on('topup-success', (data) => {
    const { uid, amount, newBalance } = data;
    addLog(`✓ Top-up successful: +$${amount.toFixed(2)} | New balance: $${newBalance.toFixed(2)}`);

    if (uid === lastScannedUid) {
        lastScannedBalance = newBalance;
        cardBalanceDisplay.textContent = `$${newBalance.toFixed(2)}`;
        adminCurrentBalance.value = `$${newBalance.toFixed(2)}`;

        cardVisual.style.transform = 'scale(1.05)';
        setTimeout(() => { cardVisual.style.transform = ''; }, 300);
    }

    adminResponse.className = 'response-message success';
    adminResponse.innerHTML = `✓ Top-up Successful<br>+$${amount.toFixed(2)}<br>New Balance: $${newBalance.toFixed(2)}`;
    adminAmount.value = '';
});

// Payment success
socket.on('payment-success', (data) => {
    const { uid, amount, newBalance } = data;
    addLog(`✓ Payment approved: -$${amount.toFixed(2)} | New balance: $${newBalance.toFixed(2)}`);

    if (uid === lastScannedUid) {
        lastScannedBalance = newBalance;
        cardBalanceDisplay.textContent = `$${newBalance.toFixed(2)}`;
        cashierCurrentBalance.value = `$${newBalance.toFixed(2)}`;

        cardVisual.style.transform = 'scale(1.05)';
        setTimeout(() => { cardVisual.style.transform = ''; }, 300);
    }

    cashierResponse.className = 'response-message success';
    cashierResponse.innerHTML = `✓ Payment Approved<br>-$${amount.toFixed(2)}<br>New Balance: $${newBalance.toFixed(2)}`;
    cashierQuantity.value = '1';
    cashierTotalCost.value = '$0.00';
});

// Payment declined
socket.on('payment-declined', (data) => {
    const { uid, reason, required, available } = data;
    addLog(`✗ Payment declined: ${reason}`);

    cashierResponse.className = 'response-message error';
    cashierResponse.innerHTML = `✗ Payment Declined<br>${reason}<br>Required: $${required.toFixed(2)} | Available: $${available.toFixed(2)}`;
});

// Products received
socket.on('products-response', (data) => {
    if (data.success) {
        products = data.products;
        populateProductList();
        addLog(`✓ Loaded ${products.length} products`);
    }
});

// Balance response - fetched from database
socket.on('balance-response', (data) => {
    if (data.success && data.uid === lastScannedUid) {
        const balance = data.balance !== null ? data.balance : 0;
        lastScannedBalance = balance;

        // Update shared display
        cardBalanceDisplay.textContent = `$${balance.toFixed(2)}`;

        // Update admin panel
        adminCurrentBalance.value = `$${balance.toFixed(2)}`;

        // Update cashier panel
        cashierCurrentBalance.value = `$${balance.toFixed(2)}`;

        // Update status display
        const statusRow = statusDisplay.querySelector('.data-row:nth-child(2)');
        if (statusRow) {
            statusRow.innerHTML = `
      <span class="data-label">Balance:</span>
      <span class="data-value" style="color: #10b981;">$${balance.toFixed(2)}</span>
    `;
        }

        addLog(`📊 Balance loaded from DB: $${balance.toFixed(2)}`);
    }
});

// ========================================
// ADMIN INTERFACE HANDLERS
// ========================================
adminAmount.addEventListener('input', () => {
    if (lastScannedUid && adminAmount.value) {
        adminTopupBtn.disabled = false;
    } else {
        adminTopupBtn.disabled = true;
    }
});

adminTopupBtn.addEventListener('click', async () => {
    const amount = parseFloat(adminAmount.value);

    if (!lastScannedUid || !amount || amount <= 0) {
        adminResponse.className = 'response-message error';
        adminResponse.textContent = '✗ Please enter a valid amount';
        return;
    }

    try {
        const response = await fetch(`${BACKEND_URL}/topup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                uid: lastScannedUid,
                amount
            })
        });

        const result = await response.json();
        if (!result.success) {
            adminResponse.className = 'response-message error';
            adminResponse.textContent = `✗ Error: ${result.error}`;
            addLog(`❌ Top-up failed: ${result.error}`);
        }
    } catch (error) {
        adminResponse.className = 'response-message error';
        adminResponse.textContent = `✗ Connection error: ${error.message}`;
        addLog(`❌ Top-up connection error: ${error.message}`);
    }
});

// ========================================
// CASHIER INTERFACE HANDLERS
// ========================================
function populateProductList() {
    cashierProduct.innerHTML = '<option value="">-- Select Product --</option>';
    products.forEach(product => {
        const option = document.createElement('option');
        option.value = product._id;
        option.textContent = `${product.name} - $${product.price.toFixed(2)}`;
        option.dataset.price = product.price;
        cashierProduct.appendChild(option);
    });
}

function calculateTotal() {
    const productSelect = cashierProduct.options[cashierProduct.selectedIndex];
    if (!productSelect.dataset.price) {
        cashierTotalCost.value = '$0.00';
        return 0;
    }

    const unitPrice = parseFloat(productSelect.dataset.price);
    const quantity = parseInt(cashierQuantity.value) || 1;
    const total = unitPrice * quantity;

    cashierTotalCost.value = `$${total.toFixed(2)}`;
    return total;
}

cashierProduct.addEventListener('change', () => {
    calculateTotal();
    updatePayButtonState();
});

cashierQuantity.addEventListener('change', () => {
    calculateTotal();
    updatePayButtonState();
});

function updatePayButtonState() {
    const hasUid = !!lastScannedUid;
    const hasProduct = cashierProduct.value !== '';
    const hasQuantity = parseInt(cashierQuantity.value) > 0;

    cashierPayBtn.disabled = !(hasUid && hasProduct && hasQuantity);
}

cashierPayBtn.addEventListener('click', async () => {
    const productSelect = cashierProduct.options[cashierProduct.selectedIndex];
    const productId = cashierProduct.value;
    const quantity = parseInt(cashierQuantity.value);
    const totalAmount = parseFloat(cashierTotalCost.value.replace('$', ''));

    if (!lastScannedUid || !productId || !quantity || totalAmount <= 0) {
        cashierResponse.className = 'response-message error';
        cashierResponse.textContent = '✗ Please fill all fields';
        return;
    }

    try {
        const response = await fetch(`${BACKEND_URL}/pay`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                uid: lastScannedUid,
                productId,
                quantity,
                totalAmount
            })
        });

        const result = await response.json();
        if (!result.success) {
            cashierResponse.className = 'response-message error';
            cashierResponse.innerHTML = `✗ ${result.reason || result.error}`;
            addLog(`❌ Payment failed: ${result.reason || result.error}`);
        }
    } catch (error) {
        cashierResponse.className = 'response-message error';
        cashierResponse.textContent = `✗ Connection error: ${error.message}`;
        addLog(`❌ Payment connection error: ${error.message}`);
    }
});

// ========================================
// UTILITY FUNCTIONS
// ========================================
function addLog(message) {
    const li = document.createElement('li');
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    li.textContent = `[${timeStr}] ${message}`;
    logList.prepend(li);

    // Keep only last 30 logs
    while (logList.children.length > 30) {
        logList.removeChild(logList.lastChild);
    }
}

function clearResponses() {
    adminResponse.className = 'response-message';
    adminResponse.textContent = '';
    cashierResponse.className = 'response-message';
    cashierResponse.textContent = '';
}

// ========================================
// INITIALIZATION
// ========================================
checkAuth();
addLog('Dashboard initialized');
