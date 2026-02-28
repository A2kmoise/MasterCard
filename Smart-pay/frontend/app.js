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

// ========================================
// DOM ELEMENTS
// ========================================
// Shared
const cardVisual = document.getElementById('card-visual');
const cardUidDisplay = document.getElementById('card-uid-display');
const cardBalanceDisplay = document.getElementById('card-balance-display');
const statusDisplay = document.getElementById('status-display');
const logList = document.getElementById('log-list');
const connectionStatus = document.getElementById('connection-status');

// Role selector
const roleAdminBtn = document.getElementById('role-admin');
const roleCashierBtn = document.getElementById('role-cashier');
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

// ========================================
// ROLE MANAGEMENT
// ========================================
roleAdminBtn.addEventListener('click', () => {
    currentRole = 'admin';
    roleAdminBtn.classList.add('active');
    roleCashierBtn.classList.remove('active');
    adminPanel.style.display = 'block';
    cashierPanel.style.display = 'none';
    clearResponses();
    addLog('Switched to Admin interface');
});

roleCashierBtn.addEventListener('click', () => {
    currentRole = 'cashier';
    roleCashierBtn.classList.add('active');
    roleAdminBtn.classList.remove('active');
    cashierPanel.style.display = 'block';
    adminPanel.style.display = 'none';
    clearResponses();
    addLog('Switched to Cashier interface');
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
    lastScannedBalance = deviceBalance;

    // Update shared display
    cardVisual.classList.add('active');
    cardUidDisplay.textContent = uid;
    cardBalanceDisplay.textContent = `$${deviceBalance.toFixed(2)}`;

    // Update role-specific fields
    adminUid.value = uid;
    adminCurrentBalance.value = `$${deviceBalance.toFixed(2)}`;
    adminTopupBtn.disabled = false;

    cashierUid.value = uid;
    cashierCurrentBalance.value = `$${deviceBalance.toFixed(2)}`;
    if (products.length > 0) {
        cashierPayBtn.disabled = false;
    }

    statusDisplay.innerHTML = `
    <div class="data-row">
      <span class="data-label">UID:</span>
      <span class="data-value">${uid}</span>
    </div>
    <div class="data-row">
      <span class="data-label">Balance:</span>
      <span class="data-value" style="color: #10b981;">$${deviceBalance.toFixed(2)}</span>
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

// Balance response
socket.on('balance-response', (data) => {
    if (data.success) {
        addLog(`Balance for ${data.uid}: $${data.balance.toFixed(2)}`);
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
            headers: { 'Content-Type': 'application/json' },
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
            headers: { 'Content-Type': 'application/json' },
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
addLog('Dashboard initialized');
