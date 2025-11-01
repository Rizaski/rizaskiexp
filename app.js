// App State
let currentUser = null;
let expenses = [];
let received = [];
let budgets = {
    rent: 0,
    grocery: 0,
    cosmetics: 0,
    clothes: 0,
    miscellaneous: 0
};
let expenseChart = null;
let budgetChart = null;

// Firebase Firestore Collections Reference
const expensesCollection = db.collection('expenses');
const receivedCollection = db.collection('received');
const budgetsCollection = db.collection('budgets');
const usersCollection = db.collection('users');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    checkAuthState();
});

// Initialize App
function initializeApp() {
    hideLoading();
}

// Hide Loading Screen
function hideLoading() {
    setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
    }, 500);
}

// Setup Event Listeners
function setupEventListeners() {
    // Auth Forms
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    document.getElementById('show-register').addEventListener('click', (e) => {
        e.preventDefault();
        showRegister();
    });
    document.getElementById('show-login').addEventListener('click', (e) => {
        e.preventDefault();
        showLogin();
    });

    // Navigation
    document.getElementById('nav-menu-btn').addEventListener('click', toggleSidebar);
    document.querySelectorAll('.nav-link[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            navigateTo(page);
            closeSidebar();
        });
    });
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    // Expense Modal
    document.getElementById('add-expense-btn').addEventListener('click', () => openExpenseModal());
    document.getElementById('close-expense-modal').addEventListener('click', closeExpenseModal);
    document.getElementById('cancel-expense').addEventListener('click', closeExpenseModal);
    document.getElementById('expense-form').addEventListener('submit', handleExpenseSubmit);

    // Received Modal
    document.getElementById('add-received-btn').addEventListener('click', () => openReceivedModal());
    document.getElementById('close-received-modal').addEventListener('click', closeReceivedModal);
    document.getElementById('cancel-received').addEventListener('click', closeReceivedModal);
    document.getElementById('received-form').addEventListener('submit', handleReceivedSubmit);

    // Profile Form
    document.getElementById('profile-form').addEventListener('submit', handleProfileUpdate);
    document.getElementById('password-form').addEventListener('submit', handlePasswordChange);

    // Search and Filters
    document.getElementById('expense-search').addEventListener('input', filterExpenses);
    document.getElementById('expense-filter').addEventListener('change', filterExpenses);
    document.getElementById('received-search').addEventListener('input', filterReceived);
    document.getElementById('received-filter').addEventListener('change', filterReceived);

    // Modal Overlay
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
}

// Auth State Check
function checkAuthState() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            loadUserData(user.uid);
            showApp();
        } else {
            currentUser = null;
            showAuth();
        }
    });
}

// Show Auth Pages
function showAuth() {
    document.getElementById('app-container').classList.add('hidden');
    document.getElementById('login-page').classList.add('active');
    document.getElementById('register-page').classList.remove('active');
}

// Show Register Page
function showRegister() {
    document.getElementById('login-page').classList.remove('active');
    document.getElementById('register-page').classList.add('active');
}

// Show Login Page
function showLogin() {
    document.getElementById('register-page').classList.remove('active');
    document.getElementById('login-page').classList.add('active');
}

// Show App
function showApp() {
    document.getElementById('login-page').classList.remove('active');
    document.getElementById('register-page').classList.remove('active');
    document.getElementById('app-container').classList.remove('hidden');
    navigateTo('dashboard');
}

// Handle Login
function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            showToast('Login successful!', 'success');
        })
        .catch((error) => {
            showToast(getErrorMessage(error), 'error');
        });
}

// Handle Register
function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const mobile = document.getElementById('register-mobile').value;
    const password = document.getElementById('register-password').value;

    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            // Save user profile
            usersCollection.doc(user.uid).set({
                name: name,
                email: email,
                mobile: mobile,
                createdAt: firebase.firestore.Timestamp.now()
            });
            showToast('Account created successfully!', 'success');
        })
        .catch((error) => {
            showToast(getErrorMessage(error), 'error');
        });
}

// Handle Logout
function handleLogout() {
    auth.signOut()
        .then(() => {
            showToast('Logged out successfully', 'success');
            expenses = [];
            received = [];
            budgets = {
                rent: 0,
                grocery: 0,
                cosmetics: 0,
                clothes: 0,
                miscellaneous: 0
            };
        })
        .catch((error) => {
            showToast(getErrorMessage(error), 'error');
        });
}

// Load User Profile
function loadUserProfile(uid) {
    usersCollection.doc(uid).get().then((doc) => {
        if (doc.exists) {
            const userData = doc.data();
            updateProfileUI(userData);
        } else {
            // If profile doesn't exist, create it with current auth user data
            if (currentUser) {
                const defaultUserData = {
                    name: currentUser.displayName || '',
                    email: currentUser.email || '',
                    mobile: '',
                    createdAt: firebase.firestore.Timestamp.now()
                };
                usersCollection.doc(uid).set(defaultUserData, {
                        merge: true
                    })
                    .then(() => {
                        updateProfileUI(defaultUserData);
                    });
            }
        }
    }).catch((error) => {
        console.error('Error loading user profile:', error);
        showToast('Error loading profile data', 'error');
    });
}

// Load User Data
function loadUserData(uid) {
    // Load User Profile
    loadUserProfile(uid);

    // Load Expenses
    expensesCollection.where('userId', '==', uid).onSnapshot((snapshot) => {
        expenses = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            expenses.push({
                id: doc.id,
                ...data
            });
        });
        // Sort by date descending (client-side sorting to avoid index requirement)
        expenses.sort((a, b) => {
            const dateA = new Date(a.date || 0);
            const dateB = new Date(b.date || 0);
            return dateB - dateA;
        });
        renderExpenses();
        updateDashboard();
    }, (error) => {
        console.error('Error loading expenses:', error);
        showToast('Error loading expenses. Please refresh the page.', 'error');
    });

    // Load Received
    receivedCollection.where('userId', '==', uid).onSnapshot((snapshot) => {
        received = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            received.push({
                id: doc.id,
                ...data
            });
        });
        // Sort by date descending (client-side sorting to avoid index requirement)
        received.sort((a, b) => {
            const dateA = new Date(a.date || 0);
            const dateB = new Date(b.date || 0);
            return dateB - dateA;
        });
        renderReceived();
        updateDashboard();
    }, (error) => {
        console.error('Error loading received:', error);
        showToast('Error loading received entries. Please refresh the page.', 'error');
    });

    // Load Budgets
    budgetsCollection.doc(uid).get().then((doc) => {
        if (doc.exists) {
            const budgetData = doc.data();
            budgets = {
                ...budgets,
                ...budgetData
            };
        }
        renderBudgets();
        updateDashboard();
    }).catch((error) => {
        console.error('Error loading budgets:', error);
    });
}

// Update Profile UI
function updateProfileUI(userData) {
    const initial = userData.name ? userData.name.charAt(0).toUpperCase() : 'U';
    document.getElementById('user-initial').textContent = initial;
    document.getElementById('user-name').textContent = userData.name || 'User';
    document.getElementById('profile-initial').textContent = initial;
    document.getElementById('profile-name').value = userData.name || '';
    document.getElementById('profile-email').value = userData.email || '';
    document.getElementById('profile-mobile').value = userData.mobile || '';
}

// Navigation
function navigateTo(page) {
    // Update active page content
    document.querySelectorAll('.page-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(page).classList.add('active');

    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`.nav-link[data-page="${page}"]`).classList.add('active');

    // Update URL hash
    window.location.hash = page;

    // Load data for specific pages
    if (page === 'dashboard') {
        updateDashboard();
    } else if (page === 'profile' && currentUser) {
        // Refresh profile data when navigating to profile page
        loadUserProfile(currentUser.uid);
    }
}

// Toggle Sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.overlay') || createOverlay();
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
}

// Close Sidebar
function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.overlay');
    sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
}

// Create Overlay
function createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.addEventListener('click', closeSidebar);
    document.body.appendChild(overlay);
    return overlay;
}

// Handle Expense Submit
function handleExpenseSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('expense-id').value;
    const date = document.getElementById('expense-date').value;
    const merchant = document.getElementById('expense-merchant').value;
    const purpose = document.getElementById('expense-purpose').value;
    const amount = parseFloat(document.getElementById('expense-amount').value);

    const expenseData = {
        uniqueId: id || generateUniqueId(),
        date: date,
        merchant: merchant,
        purpose: purpose,
        amount: amount,
        userId: currentUser.uid,
        updatedAt: firebase.firestore.Timestamp.now()
    };

    if (id) {
        // Update existing expense
        expensesCollection.doc(id).update(expenseData)
            .then(() => {
                showToast('Expense updated successfully!', 'success');
                closeExpenseModal();
            })
            .catch((error) => {
                showToast(getErrorMessage(error), 'error');
            });
    } else {
        // Add new expense
        expenseData.createdAt = firebase.firestore.Timestamp.now();
        expensesCollection.add(expenseData)
            .then(() => {
                showToast('Expense added successfully!', 'success');
                closeExpenseModal();
            })
            .catch((error) => {
                showToast(getErrorMessage(error), 'error');
            });
    }
}

// Open Expense Modal
function openExpenseModal(expense = null) {
    const modal = document.getElementById('expense-modal');
    const form = document.getElementById('expense-form');

    if (expense) {
        document.getElementById('expense-modal-title').textContent = 'Edit Expense';
        document.getElementById('expense-id').value = expense.id;
        document.getElementById('expense-date').value = convertTimestamp(expense.date);
        document.getElementById('expense-merchant').value = expense.merchant || '';
        document.getElementById('expense-purpose').value = expense.purpose || '';
        document.getElementById('expense-amount').value = expense.amount || 0;
    } else {
        document.getElementById('expense-modal-title').textContent = 'Add Expense';
        form.reset();
        document.getElementById('expense-id').value = '';
        document.getElementById('expense-date').value = new Date().toISOString().split('T')[0];
    }

    modal.classList.add('active');
}

// Close Expense Modal
function closeExpenseModal() {
    document.getElementById('expense-modal').classList.remove('active');
    document.getElementById('expense-form').reset();
    document.getElementById('expense-id').value = '';
}

// Handle Received Submit
function handleReceivedSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('received-id').value;
    const date = document.getElementById('received-date').value;
    const payer = document.getElementById('received-payer').value;
    const from = document.getElementById('received-from').value;
    const amount = parseFloat(document.getElementById('received-amount').value);
    const paymentType = document.getElementById('received-payment-type').value;

    const receivedData = {
        uniqueId: id || generateUniqueId(),
        date: date,
        payer: payer,
        from: from,
        amount: amount,
        paymentType: paymentType,
        userId: currentUser.uid,
        updatedAt: firebase.firestore.Timestamp.now()
    };

    if (id) {
        // Update existing received
        receivedCollection.doc(id).update(receivedData)
            .then(() => {
                showToast('Received updated successfully!', 'success');
                closeReceivedModal();
            })
            .catch((error) => {
                showToast(getErrorMessage(error), 'error');
            });
    } else {
        // Add new received
        receivedData.createdAt = firebase.firestore.Timestamp.now();
        receivedCollection.add(receivedData)
            .then(() => {
                showToast('Received added successfully!', 'success');
                closeReceivedModal();
            })
            .catch((error) => {
                showToast(getErrorMessage(error), 'error');
            });
    }
}

// Open Received Modal
function openReceivedModal(received = null) {
    const modal = document.getElementById('received-modal');
    const form = document.getElementById('received-form');

    if (received) {
        document.getElementById('received-modal-title').textContent = 'Edit Received';
        document.getElementById('received-id').value = received.id;
        document.getElementById('received-date').value = convertTimestamp(received.date);
        document.getElementById('received-payer').value = received.payer || '';
        document.getElementById('received-from').value = received.from || '';
        document.getElementById('received-amount').value = received.amount || 0;
        document.getElementById('received-payment-type').value = received.paymentType || '';
    } else {
        document.getElementById('received-modal-title').textContent = 'Add Received';
        form.reset();
        document.getElementById('received-id').value = '';
        document.getElementById('received-date').value = new Date().toISOString().split('T')[0];
    }

    modal.classList.add('active');
}

// Close Received Modal
function closeReceivedModal() {
    document.getElementById('received-modal').classList.remove('active');
    document.getElementById('received-form').reset();
    document.getElementById('received-id').value = '';
}

// Generate Unique ID
function generateUniqueId() {
    return 'EXP-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

// Render Expenses
function renderExpenses() {
    const container = document.getElementById('expenses-list');
    if (expenses.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💸</div>
                <p class="empty-state-text">No expenses found. Add your first expense!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = expenses.map(expense => `
        <div class="data-item">
            <div class="data-item-header">
                <div>
                    <div class="data-item-title">${escapeHtml(expense.merchant)}</div>
                    <div class="data-item-id">ID: ${escapeHtml(expense.uniqueId)}</div>
                </div>
                <div class="data-item-amount">${formatCurrency(expense.amount)}</div>
            </div>
            <div class="data-item-details">
                <div class="data-item-detail">
                    <div class="data-item-detail-label">Date</div>
                    <div class="data-item-detail-value">${formatDate(expense.date)}</div>
                </div>
                <div class="data-item-detail">
                    <div class="data-item-detail-label">Purpose</div>
                    <div class="data-item-detail-value">${formatPurposeName(expense.purpose)}</div>
                </div>
            </div>
            <div class="data-item-actions">
                <button class="btn btn-icon btn-edit" data-expense-id="${expense.id}">Edit</button>
                <button class="btn btn-icon btn-delete" data-expense-id="${expense.id}">Delete</button>
            </div>
        </div>
    `).join('');

    // Add event listeners for edit and delete buttons
    container.querySelectorAll('.btn-edit[data-expense-id]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const expenseId = e.target.getAttribute('data-expense-id');
            const expense = expenses.find(exp => exp.id === expenseId);
            if (expense) openExpenseModal(expense);
        });
    });

    container.querySelectorAll('.btn-delete[data-expense-id]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const expenseId = e.target.getAttribute('data-expense-id');
            deleteExpense(expenseId);
        });
    });
}

// Delete Expense
function deleteExpense(id) {
    if (confirm('Are you sure you want to delete this expense?')) {
        expensesCollection.doc(id).delete()
            .then(() => {
                showToast('Expense deleted successfully!', 'success');
            })
            .catch((error) => {
                showToast(getErrorMessage(error), 'error');
            });
    }
}

// Render Received
function renderReceived() {
    const container = document.getElementById('received-list');
    if (received.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💰</div>
                <p class="empty-state-text">No received entries found. Add your first received entry!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = received.map(item => `
        <div class="data-item">
            <div class="data-item-header">
                <div>
                    <div class="data-item-title">${escapeHtml(item.payer)}</div>
                    <div class="data-item-id">ID: ${escapeHtml(item.uniqueId)}</div>
                </div>
                <div class="data-item-amount">${formatCurrency(item.amount)}</div>
            </div>
            <div class="data-item-details">
                <div class="data-item-detail">
                    <div class="data-item-detail-label">Date</div>
                    <div class="data-item-detail-value">${formatDate(item.date)}</div>
                </div>
                <div class="data-item-detail">
                    <div class="data-item-detail-label">From</div>
                    <div class="data-item-detail-value">${item.from.charAt(0).toUpperCase() + item.from.slice(1)}</div>
                </div>
                <div class="data-item-detail">
                    <div class="data-item-detail-label">Payment Type</div>
                    <div class="data-item-detail-value">${item.paymentType.charAt(0).toUpperCase() + item.paymentType.slice(1)}</div>
                </div>
            </div>
            <div class="data-item-actions">
                <button class="btn btn-icon btn-edit" data-received-id="${item.id}">Edit</button>
                <button class="btn btn-icon btn-delete" data-received-id="${item.id}">Delete</button>
            </div>
        </div>
    `).join('');

    // Add event listeners for edit and delete buttons
    container.querySelectorAll('.btn-edit[data-received-id]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const receivedId = e.target.getAttribute('data-received-id');
            const item = received.find(rec => rec.id === receivedId);
            if (item) openReceivedModal(item);
        });
    });

    container.querySelectorAll('.btn-delete[data-received-id]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const receivedId = e.target.getAttribute('data-received-id');
            deleteReceived(receivedId);
        });
    });
}

// Delete Received
function deleteReceived(id) {
    if (confirm('Are you sure you want to delete this received entry?')) {
        receivedCollection.doc(id).delete()
            .then(() => {
                showToast('Received entry deleted successfully!', 'success');
            })
            .catch((error) => {
                showToast(getErrorMessage(error), 'error');
            });
    }
}

// Filter Expenses
function filterExpenses() {
    const search = document.getElementById('expense-search').value.toLowerCase();
    const filter = document.getElementById('expense-filter').value;

    let filtered = expenses.filter(expense => {
        const matchesSearch = expense.merchant.toLowerCase().includes(search) ||
            expense.uniqueId.toLowerCase().includes(search);
        const matchesFilter = filter === 'all' || expense.purpose === filter;
        return matchesSearch && matchesFilter;
    });

    const container = document.getElementById('expenses-list');
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔍</div>
                <p class="empty-state-text">No expenses match your search criteria.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(expense => `
        <div class="data-item">
            <div class="data-item-header">
                <div>
                    <div class="data-item-title">${escapeHtml(expense.merchant)}</div>
                    <div class="data-item-id">ID: ${escapeHtml(expense.uniqueId)}</div>
                </div>
                <div class="data-item-amount">${formatCurrency(expense.amount)}</div>
            </div>
            <div class="data-item-details">
                <div class="data-item-detail">
                    <div class="data-item-detail-label">Date</div>
                    <div class="data-item-detail-value">${formatDate(expense.date)}</div>
                </div>
                <div class="data-item-detail">
                    <div class="data-item-detail-label">Purpose</div>
                    <div class="data-item-detail-value">${formatPurposeName(expense.purpose)}</div>
                </div>
            </div>
            <div class="data-item-actions">
                <button class="btn btn-icon btn-edit" data-expense-id="${expense.id}">Edit</button>
                <button class="btn btn-icon btn-delete" data-expense-id="${expense.id}">Delete</button>
            </div>
        </div>
    `).join('');

    // Add event listeners for edit and delete buttons
    container.querySelectorAll('.btn-edit[data-expense-id]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const expenseId = e.target.getAttribute('data-expense-id');
            const expense = expenses.find(exp => exp.id === expenseId);
            if (expense) openExpenseModal(expense);
        });
    });

    container.querySelectorAll('.btn-delete[data-expense-id]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const expenseId = e.target.getAttribute('data-expense-id');
            deleteExpense(expenseId);
        });
    });
}

// Filter Received
function filterReceived() {
    const search = document.getElementById('received-search').value.toLowerCase();
    const filter = document.getElementById('received-filter').value;

    let filtered = received.filter(item => {
        const matchesSearch = item.payer.toLowerCase().includes(search) ||
            item.uniqueId.toLowerCase().includes(search);
        const matchesFilter = filter === 'all' || item.from === filter;
        return matchesSearch && matchesFilter;
    });

    const container = document.getElementById('received-list');
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔍</div>
                <p class="empty-state-text">No received entries match your search criteria.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(item => `
        <div class="data-item">
            <div class="data-item-header">
                <div>
                    <div class="data-item-title">${escapeHtml(item.payer)}</div>
                    <div class="data-item-id">ID: ${escapeHtml(item.uniqueId)}</div>
                </div>
                <div class="data-item-amount">${formatCurrency(item.amount)}</div>
            </div>
            <div class="data-item-details">
                <div class="data-item-detail">
                    <div class="data-item-detail-label">Date</div>
                    <div class="data-item-detail-value">${formatDate(item.date)}</div>
                </div>
                <div class="data-item-detail">
                    <div class="data-item-detail-label">From</div>
                    <div class="data-item-detail-value">${item.from.charAt(0).toUpperCase() + item.from.slice(1)}</div>
                </div>
                <div class="data-item-detail">
                    <div class="data-item-detail-label">Payment Type</div>
                    <div class="data-item-detail-value">${item.paymentType.charAt(0).toUpperCase() + item.paymentType.slice(1)}</div>
                </div>
            </div>
            <div class="data-item-actions">
                <button class="btn btn-icon btn-edit" data-received-id="${item.id}">Edit</button>
                <button class="btn btn-icon btn-delete" data-received-id="${item.id}">Delete</button>
            </div>
        </div>
    `).join('');

    // Add event listeners for edit and delete buttons
    container.querySelectorAll('.btn-edit[data-received-id]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const receivedId = e.target.getAttribute('data-received-id');
            const item = received.find(rec => rec.id === receivedId);
            if (item) openReceivedModal(item);
        });
    });

    container.querySelectorAll('.btn-delete[data-received-id]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const receivedId = e.target.getAttribute('data-received-id');
            deleteReceived(receivedId);
        });
    });
}

// Render Budgets
function renderBudgets() {
    const container = document.getElementById('budget-settings');
    const categories = ['rent', 'grocery', 'cosmetics', 'clothes', 'miscellaneous'];

    container.innerHTML = categories.map(category => `
        <div class="budget-setting-item">
            <div class="budget-setting-header">
                <div class="budget-setting-title">${category.charAt(0).toUpperCase() + category.slice(1)}</div>
            </div>
            <form class="budget-setting-form" data-category="${category}">
                <div class="form-group">
                    <label for="budget-${category}">Monthly Budget (MVR)</label>
                    <input type="number" id="budget-${category}" step="0.01" min="0" value="${budgets[category] || 0}" required>
                </div>
                <button type="submit" class="btn btn-primary">Save</button>
            </form>
        </div>
    `).join('');

    // Add event listeners for budget forms
    container.querySelectorAll('.budget-setting-form').forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const category = form.getAttribute('data-category');
            saveBudget(e, category);
        });
    });
}

// Save Budget
function saveBudget(event, category) {
    event.preventDefault();
    const amount = parseFloat(document.getElementById(`budget-${category}`).value);

    budgets[category] = amount;
    budgetsCollection.doc(currentUser.uid).set(budgets, {
            merge: true
        })
        .then(() => {
            showToast(`${category.charAt(0).toUpperCase() + category.slice(1)} budget saved successfully!`, 'success');
            updateDashboard();
        })
        .catch((error) => {
            showToast(getErrorMessage(error), 'error');
        });
}

// Update Dashboard
function updateDashboard() {
    // Calculate totals
    const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    const totalReceived = received.reduce((sum, rec) => sum + (rec.amount || 0), 0);
    const balance = totalReceived - totalExpenses;

    // Update summary cards
    document.getElementById('total-expenses').textContent = formatCurrency(totalExpenses);
    document.getElementById('total-received').textContent = formatCurrency(totalReceived);
    document.getElementById('balance').textContent = formatCurrency(balance);

    // Calculate expenses by category
    const expensesByCategory = {
        rent: 0,
        grocery: 0,
        cosmetics: 0,
        clothes: 0,
        miscellaneous: 0
    };

    expenses.forEach(expense => {
        const category = expense.purpose;
        if (expensesByCategory.hasOwnProperty(category)) {
            expensesByCategory[category] += expense.amount || 0;
        }
    });

    // Update budget cards
    updateBudgetCards(expensesByCategory);

    // Update charts
    updateCharts(expensesByCategory);

    // Update recent transactions
    updateRecentTransactions();
}

// Update Budget Cards
function updateBudgetCards(expensesByCategory) {
    const container = document.getElementById('budget-cards');
    const categories = ['rent', 'grocery', 'cosmetics', 'clothes', 'miscellaneous'];

    let warnings = [];

    container.innerHTML = categories.map(category => {
        const budget = budgets[category] || 0;
        const spent = expensesByCategory[category] || 0;
        const percentage = budget > 0 ? (spent / budget) * 100 : 0;
        const remaining = budget - spent;
        const warningClass = percentage >= 75 ? (percentage >= 100 ? 'danger' : 'warning') : '';

        // Add warning if usage >= 75%
        if (percentage >= 75 && budget > 0) {
            warnings.push({
                category: category,
                percentage: percentage,
                remaining: remaining
            });
        }

        return `
            <div class="budget-card">
                <div class="budget-card-header">
                    <div class="budget-card-title">${category.charAt(0).toUpperCase() + category.slice(1)}</div>
                    <div class="budget-card-amount">${formatCurrency(budget)}</div>
                </div>
                <div class="budget-progress">
                    <div class="budget-progress-bar ${warningClass}" style="width: ${Math.min(percentage, 100)}%"></div>
                </div>
                <div class="budget-stats">
                    <span>Spent: ${formatCurrency(spent)}</span>
                    <span>Remaining: ${formatCurrency(remaining)}</span>
                </div>
            </div>
        `;
    }).join('');

    // Update warnings
    updateWarnings(warnings);
}

// Update Warnings
function updateWarnings(warnings) {
    const container = document.getElementById('budget-warnings');

    if (warnings.length === 0) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = warnings.map(warning => `
        <div class="warning-message">
            <span class="warning-icon">⚠️</span>
            <p>
                <strong>${warning.category.charAt(0).toUpperCase() + warning.category.slice(1)}</strong> budget is at 
                ${warning.percentage.toFixed(1)}%. Only ${formatCurrency(warning.remaining)} remaining!
            </p>
        </div>
    `).join('');
}

// Update Charts
function updateCharts(expensesByCategory) {
    // Expenses vs Budget Chart
    const expenseCtx = document.getElementById('expenses-chart').getContext('2d');

    if (expenseChart) {
        expenseChart.destroy();
    }

    const categories = ['rent', 'grocery', 'cosmetics', 'clothes', 'miscellaneous'];
    const categoryLabels = categories.map(cat => cat.charAt(0).toUpperCase() + cat.slice(1));
    const expenseData = categories.map(cat => expensesByCategory[cat] || 0);
    const budgetData = categories.map(cat => budgets[cat] || 0);

    expenseChart = new Chart(expenseCtx, {
        type: 'bar',
        data: {
            labels: categoryLabels,
            datasets: [{
                label: 'Expenses',
                data: expenseData,
                backgroundColor: 'rgba(239, 68, 68, 0.7)',
                borderColor: 'rgba(239, 68, 68, 1)',
                borderWidth: 2
            }, {
                label: 'Budget',
                data: budgetData,
                backgroundColor: 'rgba(99, 102, 241, 0.7)',
                borderColor: 'rgba(99, 102, 241, 1)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });

    // Budget Distribution Chart
    const budgetCtx = document.getElementById('budget-chart').getContext('2d');

    if (budgetChart) {
        budgetChart.destroy();
    }

    const totalBudget = Object.values(budgets).reduce((sum, val) => sum + val, 0);
    const budgetPercentages = categories.map(cat => {
        const budget = budgets[cat] || 0;
        return totalBudget > 0 ? (budget / totalBudget) * 100 : 0;
    });

    budgetChart = new Chart(budgetCtx, {
        type: 'doughnut',
        data: {
            labels: categoryLabels,
            datasets: [{
                data: budgetPercentages,
                backgroundColor: [
                    'rgba(99, 102, 241, 0.8)',
                    'rgba(139, 92, 246, 0.8)',
                    'rgba(236, 72, 153, 0.8)',
                    'rgba(251, 191, 36, 0.8)',
                    'rgba(16, 185, 129, 0.8)'
                ],
                borderColor: [
                    'rgba(99, 102, 241, 1)',
                    'rgba(139, 92, 246, 1)',
                    'rgba(236, 72, 153, 1)',
                    'rgba(251, 191, 36, 1)',
                    'rgba(16, 185, 129, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            return label + ': ' + value.toFixed(1) + '%';
                        }
                    }
                }
            }
        }
    });
}

// Update Recent Transactions
function updateRecentTransactions() {
    // Recent Expenses
    const recentExpenses = expenses.slice(0, 5);
    const recentExpensesContainer = document.getElementById('recent-expenses');

    if (recentExpenses.length === 0) {
        recentExpensesContainer.innerHTML = '<p class="empty-state-text">No recent expenses</p>';
    } else {
        recentExpensesContainer.innerHTML = recentExpenses.map(expense => `
            <div class="recent-item">
                <div class="recent-item-info">
                    <div class="recent-item-title">${expense.merchant}</div>
                    <div class="recent-item-subtitle">${formatDate(expense.date)} • ${formatPurposeName(expense.purpose)}</div>
                </div>
                <div class="recent-item-amount">${formatCurrency(expense.amount)}</div>
            </div>
        `).join('');
    }

    // Recent Received
    const recentReceived = received.slice(0, 5);
    const recentReceivedContainer = document.getElementById('recent-received');

    if (recentReceived.length === 0) {
        recentReceivedContainer.innerHTML = '<p class="empty-state-text">No recent received</p>';
    } else {
        recentReceivedContainer.innerHTML = recentReceived.map(item => `
            <div class="recent-item">
                <div class="recent-item-info">
                    <div class="recent-item-title">${item.payer}</div>
                    <div class="recent-item-subtitle">${formatDate(item.date)} • ${item.from}</div>
                </div>
                <div class="recent-item-amount">${formatCurrency(item.amount)}</div>
            </div>
        `).join('');
    }
}

// Handle Profile Update
function handleProfileUpdate(e) {
    e.preventDefault();
    const name = document.getElementById('profile-name').value.trim();
    const email = document.getElementById('profile-email').value.trim();
    const mobile = document.getElementById('profile-mobile').value.trim();

    // Validate inputs
    if (!name || !email || !mobile) {
        showToast('Please fill in all fields', 'error');
        return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }

    // Show loading state
    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = 'Updating...';

    // Update user profile in Firestore using set with merge
    // This will create the document if it doesn't exist, or update if it does
    usersCollection.doc(currentUser.uid).set({
            name: name,
            email: email,
            mobile: mobile,
            updatedAt: firebase.firestore.Timestamp.now()
        }, {
            merge: true
        })
        .then(() => {
            // Update email in Firebase Auth if changed
            if (email !== currentUser.email) {
                // Email change requires re-authentication
                return currentUser.updateEmail(email)
                    .then(() => {
                        showToast('Profile updated successfully! Email updated.', 'success');
                        // Update currentUser reference
                        currentUser.reload().then(() => {
                            updateProfileUI({
                                name,
                                email,
                                mobile
                            });
                        });
                    })
                    .catch((error) => {
                        // If email update fails, still show success for other fields
                        showToast('Profile updated, but email update requires recent login. Please log out and log back in to change email.', 'warning');
                        updateProfileUI({
                            name,
                            email: currentUser.email, // Keep original email
                            mobile
                        });
                    });
            } else {
                showToast('Profile updated successfully!', 'success');
                updateProfileUI({
                    name,
                    email,
                    mobile
                });
            }
        })
        .catch((error) => {
            console.error('Error updating profile:', error);
            showToast(getErrorMessage(error), 'error');
        })
        .finally(() => {
            // Restore button state
            submitButton.disabled = false;
            submitButton.textContent = originalText;
        });
}

// Handle Password Change
function handlePasswordChange(e) {
    e.preventDefault();
    const oldPassword = document.getElementById('old-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (newPassword !== confirmPassword) {
        showToast('New passwords do not match!', 'error');
        return;
    }

    // Re-authenticate user
    const credential = firebase.auth.EmailAuthProvider.credential(
        currentUser.email,
        oldPassword
    );

    currentUser.reauthenticateWithCredential(credential)
        .then(() => {
            currentUser.updatePassword(newPassword)
                .then(() => {
                    showToast('Password changed successfully!', 'success');
                    document.getElementById('password-form').reset();
                })
                .catch((error) => {
                    showToast(getErrorMessage(error), 'error');
                });
        })
        .catch((error) => {
            showToast('Current password is incorrect!', 'error');
        });
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Format Currency
function formatCurrency(amount) {
    const formatted = new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount || 0);
    return formatted + ' MVR';
}

// Format Purpose Name
function formatPurposeName(purpose) {
    if (!purpose) return '';

    const purposeMap = {
        'rent': 'Rent',
        'grocery': 'Grocery',
        'cosmetics': 'Cosmetics',
        'clothes': 'Clothes',
        'water': 'Water',
        'electricity': 'Electricity',
        'mobile-bill': 'Mobile Bill',
        'internet-bill': 'Internet Bill',
        'water-taza': 'Water (Taza)',
        'miscellaneous': 'Miscellaneous'
    };

    return purposeMap[purpose] || purpose.charAt(0).toUpperCase() + purpose.slice(1).replace(/-/g, ' ');
}

// Format Date
function formatDate(dateString) {
    let date;
    // Handle Firestore Timestamp
    if (dateString && dateString.toDate) {
        date = dateString.toDate();
    } else if (dateString) {
        date = new Date(dateString);
    } else {
        return 'N/A';
    }
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Convert Firestore Timestamp to Date string if needed
function convertTimestamp(timestamp) {
    if (timestamp && timestamp.toDate) {
        return timestamp.toDate().toISOString().split('T')[0];
    }
    return timestamp;
}

// Show Toast
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Get Error Message
function getErrorMessage(error) {
    const errorMessages = {
        'auth/user-not-found': 'User not found.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/email-already-in-use': 'Email already in use.',
        'auth/weak-password': 'Password should be at least 6 characters.',
        'auth/invalid-email': 'Invalid email address.',
        'auth/network-request-failed': 'Network error. Please check your connection.'
    };

    return errorMessages[error.code] || error.message || 'An error occurred. Please try again.';
}

// Make functions globally available
window.deleteExpense = deleteExpense;
window.deleteReceived = deleteReceived;
window.saveBudget = saveBudget;

// Handle hash change for routing
window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '');
    if (hash && document.getElementById(hash)) {
        navigateTo(hash);
    }
});

// Handle initial hash
if (window.location.hash) {
    const hash = window.location.hash.replace('#', '');
    if (hash && document.getElementById(hash)) {
        setTimeout(() => navigateTo(hash), 100);
    }
}