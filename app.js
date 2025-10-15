// Personal Finance Management App with Encryption
class FinanceApp {
    constructor() {
        this.currentView = 'dashboard';
        this.data = {
            accounts: [],
            categories: [],
            transactions: []
        };
        this.encryptionKey = null;
        this.importedData = null;
        this.init();
    }

    async init() {
        // Check if data exists
        const hasData = localStorage.getItem('financialData');
        if (hasData) {
            document.getElementById('setup-form').style.display = 'none';
            document.getElementById('login-form').style.display = 'block';
        }

        // Set default date for transaction
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('transaction-date');
        if (dateInput) {
            dateInput.value = today;
        }

        // Set default month for reports
        const monthInput = document.getElementById('report-month');
        if (monthInput) {
            const now = new Date();
            monthInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        }

        // Setup search listener
        const searchInput = document.getElementById('search-transaction');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.searchTransactions(e.target.value));
        }
    }

    // Encryption Functions
    async deriveKey(password, salt) {
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );

        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        );
    }

    async encrypt(data, password) {
        const encoder = new TextEncoder();
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await this.deriveKey(password, salt);

        const encryptedData = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            encoder.encode(JSON.stringify(data))
        );

        // Combine salt, iv, and encrypted data
        const result = new Uint8Array(salt.length + iv.length + encryptedData.byteLength);
        result.set(salt, 0);
        result.set(iv, salt.length);
        result.set(new Uint8Array(encryptedData), salt.length + iv.length);

        // Convert to base64
        return btoa(String.fromCharCode(...result));
    }

    async decrypt(encryptedData, password) {
        try {
            // Decode from base64
            const data = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

            // Extract salt, iv, and encrypted content
            const salt = data.slice(0, 16);
            const iv = data.slice(16, 28);
            const content = data.slice(28);

            const key = await this.deriveKey(password, salt);
            const decryptedData = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                content
            );

            const decoder = new TextDecoder();
            return JSON.parse(decoder.decode(decryptedData));
        } catch (e) {
            throw new Error('解密失败：密码错误或数据损坏');
        }
    }

    // Authentication
    async setupPassword() {
        const password = document.getElementById('setup-password').value;
        const confirmPassword = document.getElementById('setup-password-confirm').value;

        if (!password || password.length < 6) {
            alert('密码至少需要6个字符');
            return;
        }

        if (password !== confirmPassword) {
            alert('两次输入的密码不一致');
            return;
        }

        // Initialize default data
        this.data = {
            accounts: [
                { id: this.generateId(), name: '现金', type: 'cash', balance: 0, initialBalance: 0 },
                { id: this.generateId(), name: '银行卡', type: 'bank', balance: 0, initialBalance: 0 }
            ],
            categories: [
                { id: this.generateId(), name: '餐饮', type: 'expense', color: '#e74c3c' },
                { id: this.generateId(), name: '交通', type: 'expense', color: '#3498db' },
                { id: this.generateId(), name: '购物', type: 'expense', color: '#9b59b6' },
                { id: this.generateId(), name: '娱乐', type: 'expense', color: '#e67e22' },
                { id: this.generateId(), name: '工资', type: 'income', color: '#27ae60' },
                { id: this.generateId(), name: '奖金', type: 'income', color: '#16a085' }
            ],
            transactions: []
        };

        // Encrypt and save
        const encryptedData = await this.encrypt(this.data, password);
        localStorage.setItem('financialData', encryptedData);

        // Login
        this.encryptionKey = password;
        this.showMainScreen();
    }

    async login() {
        const password = document.getElementById('login-password').value;

        if (!password) {
            alert('请输入密码');
            return;
        }

        try {
            const encryptedData = localStorage.getItem('financialData');
            this.data = await this.decrypt(encryptedData, password);
            this.encryptionKey = password;
            this.showMainScreen();
        } catch (e) {
            alert(e.message);
        }
    }

    logout() {
        this.encryptionKey = null;
        this.data = { accounts: [], categories: [], transactions: [] };
        document.getElementById('main-screen').classList.remove('active');
        document.getElementById('auth-screen').classList.add('active');
    }

    resetData() {
        if (confirm('确定要重置所有数据吗？此操作不可恢复！')) {
            localStorage.removeItem('financialData');
            location.reload();
        }
    }

    async saveData() {
        if (!this.encryptionKey) return;
        const encryptedData = await this.encrypt(this.data, this.encryptionKey);
        localStorage.setItem('financialData', encryptedData);
    }

    showMainScreen() {
        document.getElementById('auth-screen').classList.remove('active');
        document.getElementById('main-screen').classList.add('active');
        this.showView('dashboard');
    }

    // View Management
    showView(viewName) {
        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });

        // Show selected view
        document.getElementById(`${viewName}-view`).classList.add('active');
        this.currentView = viewName;

        // Refresh view content
        switch (viewName) {
            case 'dashboard':
                this.refreshDashboard();
                break;
            case 'transactions':
                this.refreshTransactions();
                break;
            case 'accounts':
                this.refreshAccounts();
                break;
            case 'categories':
                this.refreshCategories();
                break;
            case 'reports':
                this.generateReport();
                break;
        }
    }

    // Dashboard
    refreshDashboard() {
        this.updateStats();
        this.updateRecentTransactions();
        this.updateCategoryChart();
    }

    updateStats() {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        let totalBalance = 0;
        this.data.accounts.forEach(account => {
            totalBalance += account.balance;
        });

        let monthIncome = 0;
        let monthExpense = 0;

        this.data.transactions.forEach(transaction => {
            const transDate = new Date(transaction.date);
            if (transDate.getMonth() === currentMonth && transDate.getFullYear() === currentYear) {
                if (transaction.type === 'income') {
                    monthIncome += transaction.amount;
                } else if (transaction.type === 'expense') {
                    monthExpense += transaction.amount;
                }
            }
        });

        const monthNet = monthIncome - monthExpense;

        document.getElementById('total-balance').textContent = this.formatCurrency(totalBalance);
        document.getElementById('month-income').textContent = this.formatCurrency(monthIncome);
        document.getElementById('month-expense').textContent = this.formatCurrency(monthExpense);
        document.getElementById('month-net').textContent = this.formatCurrency(monthNet);
        document.getElementById('month-net').className = 'stat-value ' + (monthNet >= 0 ? 'income' : 'expense');
    }

    updateRecentTransactions() {
        const container = document.getElementById('recent-transactions');
        const recent = [...this.data.transactions]
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10);

        if (recent.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>暂无交易记录</p></div>';
            return;
        }

        container.innerHTML = recent.map(t => {
            const account = this.data.accounts.find(a => a.id === t.accountId);
            const category = this.data.categories.find(c => c.id === t.categoryId);
            return `
                <div class="recent-transaction">
                    <div class="recent-transaction-info">
                        <div class="recent-transaction-note">${t.note || '无备注'}</div>
                        <div class="recent-transaction-date">${t.date} - ${category?.name || ''} - ${account?.name || ''}</div>
                    </div>
                    <div class="recent-transaction-amount ${t.type}">${t.type === 'expense' ? '-' : '+'}${this.formatCurrency(t.amount)}</div>
                </div>
            `;
        }).join('');
    }

    updateCategoryChart() {
        const container = document.getElementById('category-chart');
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const categoryTotals = {};
        let maxAmount = 0;

        this.data.transactions.forEach(transaction => {
            const transDate = new Date(transaction.date);
            if (transaction.type === 'expense' && 
                transDate.getMonth() === currentMonth && 
                transDate.getFullYear() === currentYear) {
                const categoryId = transaction.categoryId;
                if (!categoryTotals[categoryId]) {
                    categoryTotals[categoryId] = 0;
                }
                categoryTotals[categoryId] += transaction.amount;
                if (categoryTotals[categoryId] > maxAmount) {
                    maxAmount = categoryTotals[categoryId];
                }
            }
        });

        if (Object.keys(categoryTotals).length === 0) {
            container.innerHTML = '<div class="empty-state"><p>本月暂无支出记录</p></div>';
            return;
        }

        container.innerHTML = Object.entries(categoryTotals)
            .sort((a, b) => b[1] - a[1])
            .map(([categoryId, amount]) => {
                const category = this.data.categories.find(c => c.id === categoryId);
                const percentage = (amount / maxAmount) * 100;
                return `
                    <div class="category-bar">
                        <div class="category-bar-header">
                            <span class="category-bar-name">${category?.name || '未分类'}</span>
                            <span class="category-bar-amount">${this.formatCurrency(amount)}</span>
                        </div>
                        <div class="category-bar-fill" style="width: ${percentage}%; background-color: ${category?.color || '#ccc'}">
                            ${percentage.toFixed(1)}%
                        </div>
                    </div>
                `;
            }).join('');
    }

    // Transactions
    refreshTransactions() {
        this.populateAccountFilter();
        this.filterTransactions();
    }

    populateAccountFilter() {
        const filterAccount = document.getElementById('filter-account');
        filterAccount.innerHTML = '<option value="all">所有账户</option>';
        this.data.accounts.forEach(account => {
            filterAccount.innerHTML += `<option value="${account.id}">${account.name}</option>`;
        });
    }

    filterTransactions() {
        const typeFilter = document.getElementById('filter-type').value;
        const accountFilter = document.getElementById('filter-account').value;
        const searchTerm = document.getElementById('search-transaction').value.toLowerCase();

        let filtered = [...this.data.transactions];

        if (typeFilter !== 'all') {
            filtered = filtered.filter(t => t.type === typeFilter);
        }

        if (accountFilter !== 'all') {
            filtered = filtered.filter(t => t.accountId === accountFilter || t.toAccountId === accountFilter);
        }

        if (searchTerm) {
            filtered = filtered.filter(t => 
                (t.note && t.note.toLowerCase().includes(searchTerm)) ||
                t.date.includes(searchTerm)
            );
        }

        this.displayTransactions(filtered);
    }

    searchTransactions(searchTerm) {
        this.filterTransactions();
    }

    displayTransactions(transactions) {
        const container = document.getElementById('transactions-list');
        
        if (transactions.length === 0) {
            container.innerHTML = '<div class="empty-state"><h3>暂无交易记录</h3><p>点击"添加交易"按钮创建第一笔交易</p></div>';
            return;
        }

        const sorted = transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        container.innerHTML = sorted.map(t => {
            const account = this.data.accounts.find(a => a.id === t.accountId);
            const toAccount = this.data.accounts.find(a => a.id === t.toAccountId);
            const category = this.data.categories.find(c => c.id === t.categoryId);
            
            let subtitle = `${t.date} - ${account?.name || ''}`;
            if (t.type === 'transfer' && toAccount) {
                subtitle += ` → ${toAccount.name}`;
            } else if (category) {
                subtitle += ` - ${category.name}`;
            }

            return `
                <div class="transaction-item">
                    <div class="item-info">
                        <div class="item-title">${t.note || '无备注'}</div>
                        <div class="item-subtitle">${subtitle}</div>
                    </div>
                    <div class="item-amount ${t.type}">${t.type === 'expense' ? '-' : (t.type === 'income' ? '+' : '')}${this.formatCurrency(t.amount)}</div>
                    <div class="item-actions">
                        <button onclick="app.editTransaction('${t.id}')" class="btn btn-small btn-secondary">编辑</button>
                        <button onclick="app.deleteTransaction('${t.id}')" class="btn btn-small btn-danger">删除</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    showTransactionModal(transactionId = null) {
        const modal = document.getElementById('transaction-modal');
        const title = document.getElementById('transaction-modal-title');
        
        if (transactionId) {
            const transaction = this.data.transactions.find(t => t.id === transactionId);
            title.textContent = '编辑交易';
            document.getElementById('transaction-id').value = transaction.id;
            document.getElementById('transaction-type').value = transaction.type;
            document.getElementById('transaction-date').value = transaction.date;
            document.getElementById('transaction-account').value = transaction.accountId;
            document.getElementById('transaction-to-account').value = transaction.toAccountId || '';
            document.getElementById('transaction-amount').value = transaction.amount;
            document.getElementById('transaction-category').value = transaction.categoryId || '';
            document.getElementById('transaction-note').value = transaction.note || '';
        } else {
            title.textContent = '添加交易';
            document.getElementById('transaction-id').value = '';
            document.getElementById('transaction-type').value = 'expense';
            document.getElementById('transaction-date').value = new Date().toISOString().split('T')[0];
            document.getElementById('transaction-account').value = '';
            document.getElementById('transaction-to-account').value = '';
            document.getElementById('transaction-amount').value = '';
            document.getElementById('transaction-category').value = '';
            document.getElementById('transaction-note').value = '';
        }

        this.populateTransactionForm();
        this.updateTransactionForm();
        modal.classList.add('active');
    }

    populateTransactionForm() {
        const accountSelect = document.getElementById('transaction-account');
        const toAccountSelect = document.getElementById('transaction-to-account');
        const categorySelect = document.getElementById('transaction-category');

        accountSelect.innerHTML = this.data.accounts.map(a => 
            `<option value="${a.id}">${a.name}</option>`
        ).join('');

        toAccountSelect.innerHTML = this.data.accounts.map(a => 
            `<option value="${a.id}">${a.name}</option>`
        ).join('');

        const type = document.getElementById('transaction-type').value;
        const categories = this.data.categories.filter(c => c.type === type);
        categorySelect.innerHTML = categories.map(c => 
            `<option value="${c.id}">${c.name}</option>`
        ).join('');
    }

    updateTransactionForm() {
        const type = document.getElementById('transaction-type').value;
        const toAccountGroup = document.getElementById('to-account-group');
        const categoryGroup = document.getElementById('category-group');

        if (type === 'transfer') {
            toAccountGroup.style.display = 'block';
            categoryGroup.style.display = 'none';
        } else {
            toAccountGroup.style.display = 'none';
            categoryGroup.style.display = 'block';
            
            // Update categories based on type
            const categorySelect = document.getElementById('transaction-category');
            const categories = this.data.categories.filter(c => c.type === type);
            categorySelect.innerHTML = categories.map(c => 
                `<option value="${c.id}">${c.name}</option>`
            ).join('');
        }
    }

    async saveTransaction() {
        const id = document.getElementById('transaction-id').value;
        const type = document.getElementById('transaction-type').value;
        const date = document.getElementById('transaction-date').value;
        const accountId = document.getElementById('transaction-account').value;
        const toAccountId = document.getElementById('transaction-to-account').value;
        const amount = parseFloat(document.getElementById('transaction-amount').value);
        const categoryId = document.getElementById('transaction-category').value;
        const note = document.getElementById('transaction-note').value;

        if (!date || !accountId || !amount || amount <= 0) {
            alert('请填写所有必填字段');
            return;
        }

        if (type === 'transfer' && !toAccountId) {
            alert('请选择转入账户');
            return;
        }

        if (type !== 'transfer' && !categoryId) {
            alert('请选择分类');
            return;
        }

        const transaction = {
            id: id || this.generateId(),
            type,
            date,
            accountId,
            toAccountId: type === 'transfer' ? toAccountId : null,
            amount,
            categoryId: type !== 'transfer' ? categoryId : null,
            note
        };

        if (id) {
            // Edit existing transaction
            const oldTransaction = this.data.transactions.find(t => t.id === id);
            this.revertTransaction(oldTransaction);
            const index = this.data.transactions.findIndex(t => t.id === id);
            this.data.transactions[index] = transaction;
        } else {
            // Add new transaction
            this.data.transactions.push(transaction);
        }

        this.applyTransaction(transaction);
        await this.saveData();
        this.closeModal('transaction-modal');
        this.showView(this.currentView);
    }

    applyTransaction(transaction) {
        const account = this.data.accounts.find(a => a.id === transaction.accountId);
        
        if (transaction.type === 'income') {
            account.balance += transaction.amount;
        } else if (transaction.type === 'expense') {
            account.balance -= transaction.amount;
        } else if (transaction.type === 'transfer') {
            const toAccount = this.data.accounts.find(a => a.id === transaction.toAccountId);
            account.balance -= transaction.amount;
            toAccount.balance += transaction.amount;
        }
    }

    revertTransaction(transaction) {
        const account = this.data.accounts.find(a => a.id === transaction.accountId);
        
        if (transaction.type === 'income') {
            account.balance -= transaction.amount;
        } else if (transaction.type === 'expense') {
            account.balance += transaction.amount;
        } else if (transaction.type === 'transfer') {
            const toAccount = this.data.accounts.find(a => a.id === transaction.toAccountId);
            account.balance += transaction.amount;
            toAccount.balance -= transaction.amount;
        }
    }

    editTransaction(id) {
        this.showTransactionModal(id);
    }

    async deleteTransaction(id) {
        if (!confirm('确定要删除这笔交易吗？')) return;

        const transaction = this.data.transactions.find(t => t.id === id);
        this.revertTransaction(transaction);
        this.data.transactions = this.data.transactions.filter(t => t.id !== id);
        await this.saveData();
        this.showView(this.currentView);
    }

    // Accounts
    refreshAccounts() {
        const container = document.getElementById('accounts-list');
        
        if (this.data.accounts.length === 0) {
            container.innerHTML = '<div class="empty-state"><h3>暂无账户</h3><p>点击"添加账户"按钮创建第一个账户</p></div>';
            return;
        }

        container.innerHTML = this.data.accounts.map(account => `
            <div class="account-item">
                <div class="item-info">
                    <div class="item-title">${account.name}</div>
                    <div class="item-subtitle">${this.getAccountTypeName(account.type)}</div>
                </div>
                <div class="item-amount">${this.formatCurrency(account.balance)}</div>
                <div class="item-actions">
                    <button onclick="app.editAccount('${account.id}')" class="btn btn-small btn-secondary">编辑</button>
                    <button onclick="app.deleteAccount('${account.id}')" class="btn btn-small btn-danger">删除</button>
                </div>
            </div>
        `).join('');
    }

    showAccountModal(accountId = null) {
        const modal = document.getElementById('account-modal');
        
        if (accountId) {
            const account = this.data.accounts.find(a => a.id === accountId);
            document.getElementById('account-id').value = account.id;
            document.getElementById('account-name').value = account.name;
            document.getElementById('account-type').value = account.type;
            document.getElementById('account-balance').value = account.initialBalance;
        } else {
            document.getElementById('account-id').value = '';
            document.getElementById('account-name').value = '';
            document.getElementById('account-type').value = 'cash';
            document.getElementById('account-balance').value = '0';
        }

        modal.classList.add('active');
    }

    async saveAccount() {
        const id = document.getElementById('account-id').value;
        const name = document.getElementById('account-name').value;
        const type = document.getElementById('account-type').value;
        const balance = parseFloat(document.getElementById('account-balance').value);

        if (!name) {
            alert('请输入账户名称');
            return;
        }

        if (id) {
            // Edit existing account
            const account = this.data.accounts.find(a => a.id === id);
            account.name = name;
            account.type = type;
            // Don't update balance when editing
        } else {
            // Add new account
            const account = {
                id: this.generateId(),
                name,
                type,
                balance: balance || 0,
                initialBalance: balance || 0
            };
            this.data.accounts.push(account);
        }

        await this.saveData();
        this.closeModal('account-modal');
        this.showView('accounts');
    }

    editAccount(id) {
        this.showAccountModal(id);
    }

    async deleteAccount(id) {
        // Check if account has transactions
        const hasTransactions = this.data.transactions.some(t => 
            t.accountId === id || t.toAccountId === id
        );

        if (hasTransactions) {
            alert('该账户存在交易记录，无法删除');
            return;
        }

        if (!confirm('确定要删除这个账户吗？')) return;

        this.data.accounts = this.data.accounts.filter(a => a.id !== id);
        await this.saveData();
        this.showView('accounts');
    }

    getAccountTypeName(type) {
        const types = {
            cash: '现金',
            bank: '银行卡',
            credit: '信用卡',
            investment: '投资账户'
        };
        return types[type] || type;
    }

    // Categories
    refreshCategories() {
        const container = document.getElementById('categories-list');
        
        if (this.data.categories.length === 0) {
            container.innerHTML = '<div class="empty-state"><h3>暂无分类</h3><p>点击"添加分类"按钮创建第一个分类</p></div>';
            return;
        }

        container.innerHTML = this.data.categories.map(category => `
            <div class="category-item">
                <div class="item-info">
                    <div class="item-title">
                        <span style="display: inline-block; width: 20px; height: 20px; background: ${category.color}; border-radius: 4px; margin-right: 10px;"></span>
                        ${category.name}
                    </div>
                    <div class="item-subtitle">${category.type === 'income' ? '收入' : '支出'}</div>
                </div>
                <div class="item-actions">
                    <button onclick="app.editCategory('${category.id}')" class="btn btn-small btn-secondary">编辑</button>
                    <button onclick="app.deleteCategory('${category.id}')" class="btn btn-small btn-danger">删除</button>
                </div>
            </div>
        `).join('');
    }

    showCategoryModal(categoryId = null) {
        const modal = document.getElementById('category-modal');
        
        if (categoryId) {
            const category = this.data.categories.find(c => c.id === categoryId);
            document.getElementById('category-id').value = category.id;
            document.getElementById('category-name').value = category.name;
            document.getElementById('category-type').value = category.type;
            document.getElementById('category-color').value = category.color;
        } else {
            document.getElementById('category-id').value = '';
            document.getElementById('category-name').value = '';
            document.getElementById('category-type').value = 'expense';
            document.getElementById('category-color').value = '#3498db';
        }

        modal.classList.add('active');
    }

    async saveCategory() {
        const id = document.getElementById('category-id').value;
        const name = document.getElementById('category-name').value;
        const type = document.getElementById('category-type').value;
        const color = document.getElementById('category-color').value;

        if (!name) {
            alert('请输入分类名称');
            return;
        }

        if (id) {
            // Edit existing category
            const category = this.data.categories.find(c => c.id === id);
            category.name = name;
            category.type = type;
            category.color = color;
        } else {
            // Add new category
            const category = {
                id: this.generateId(),
                name,
                type,
                color
            };
            this.data.categories.push(category);
        }

        await this.saveData();
        this.closeModal('category-modal');
        this.showView('categories');
    }

    editCategory(id) {
        this.showCategoryModal(id);
    }

    async deleteCategory(id) {
        // Check if category has transactions
        const hasTransactions = this.data.transactions.some(t => t.categoryId === id);

        if (hasTransactions) {
            alert('该分类存在交易记录，无法删除');
            return;
        }

        if (!confirm('确定要删除这个分类吗？')) return;

        this.data.categories = this.data.categories.filter(c => c.id !== id);
        await this.saveData();
        this.showView('categories');
    }

    // Reports
    generateReport() {
        const monthInput = document.getElementById('report-month').value;
        if (!monthInput) return;

        const [year, month] = monthInput.split('-').map(Number);
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const transactions = this.data.transactions.filter(t => {
            const date = new Date(t.date);
            return date >= startDate && date <= endDate;
        });

        let totalIncome = 0;
        let totalExpense = 0;
        const categoryTotals = {};

        transactions.forEach(t => {
            if (t.type === 'income') {
                totalIncome += t.amount;
            } else if (t.type === 'expense') {
                totalExpense += t.amount;
                const categoryId = t.categoryId;
                if (!categoryTotals[categoryId]) {
                    categoryTotals[categoryId] = 0;
                }
                categoryTotals[categoryId] += t.amount;
            }
        });

        const container = document.getElementById('report-content');
        container.innerHTML = `
            <div class="report-section">
                <h3>${year}年${month}月财务报表</h3>
                <div class="stats-grid">
                    <div class="stat-card">
                        <h3>总收入</h3>
                        <p class="stat-value income">${this.formatCurrency(totalIncome)}</p>
                    </div>
                    <div class="stat-card">
                        <h3>总支出</h3>
                        <p class="stat-value expense">${this.formatCurrency(totalExpense)}</p>
                    </div>
                    <div class="stat-card">
                        <h3>净收入</h3>
                        <p class="stat-value ${totalIncome - totalExpense >= 0 ? 'income' : 'expense'}">${this.formatCurrency(totalIncome - totalExpense)}</p>
                    </div>
                    <div class="stat-card">
                        <h3>交易笔数</h3>
                        <p class="stat-value">${transactions.length}</p>
                    </div>
                </div>
            </div>
            <div class="report-section">
                <h3>分类支出明细</h3>
                ${Object.entries(categoryTotals).length > 0 ? 
                    Object.entries(categoryTotals)
                        .sort((a, b) => b[1] - a[1])
                        .map(([categoryId, amount]) => {
                            const category = this.data.categories.find(c => c.id === categoryId);
                            const percentage = (amount / totalExpense * 100).toFixed(1);
                            return `
                                <div class="category-bar">
                                    <div class="category-bar-header">
                                        <span class="category-bar-name">${category?.name || '未分类'}</span>
                                        <span class="category-bar-amount">${this.formatCurrency(amount)} (${percentage}%)</span>
                                    </div>
                                    <div class="category-bar-fill" style="width: ${percentage}%; background-color: ${category?.color || '#ccc'}">
                                    </div>
                                </div>
                            `;
                        }).join('')
                    : '<p class="empty-state">暂无支出记录</p>'
                }
            </div>
        `;
    }

    // CSV Import
    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            this.parseCSV(text);
        };
        reader.readAsText(file);
    }

    parseCSV(text) {
        const lines = text.split('\n').filter(line => line.trim());
        const transactions = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Skip header if exists
            if (i === 0 && (line.toLowerCase().includes('date') || line.includes('日期'))) {
                continue;
            }

            const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
            
            if (parts.length < 3) continue;

            const date = this.parseDate(parts[0]);
            const note = parts[1];
            const amount = parseFloat(parts[2]);
            const categoryName = parts[3] || '';

            if (!date || isNaN(amount)) continue;

            transactions.push({
                date: date.toISOString().split('T')[0],
                note,
                amount: Math.abs(amount),
                type: amount >= 0 ? 'income' : 'expense',
                categoryName
            });
        }

        this.importedData = transactions;
        this.previewImport(transactions);
    }

    parseDate(dateStr) {
        // Try multiple date formats
        const formats = [
            /^(\d{4})-(\d{1,2})-(\d{1,2})$/,  // YYYY-MM-DD
            /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/,  // YYYY/MM/DD
            /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,  // MM/DD/YYYY
            /^(\d{1,2})-(\d{1,2})-(\d{4})$/     // DD-MM-YYYY
        ];

        for (const format of formats) {
            const match = dateStr.match(format);
            if (match) {
                if (match[1].length === 4) {
                    // Year first
                    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
                } else {
                    // Try both month-first and day-first
                    const date1 = new Date(parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2]));
                    if (!isNaN(date1.getTime())) return date1;
                }
            }
        }

        return null;
    }

    previewImport(transactions) {
        const container = document.getElementById('import-preview');
        
        if (transactions.length === 0) {
            container.innerHTML = '<p class="empty-state">无法解析CSV文件，请检查格式</p>';
            document.getElementById('confirm-import').style.display = 'none';
            return;
        }

        container.innerHTML = `
            <h3>预览导入数据 (${transactions.length} 条记录)</h3>
            <table class="preview-table">
                <thead>
                    <tr>
                        <th>日期</th>
                        <th>备注</th>
                        <th>金额</th>
                        <th>类型</th>
                        <th>分类</th>
                    </tr>
                </thead>
                <tbody>
                    ${transactions.slice(0, 10).map(t => `
                        <tr>
                            <td>${t.date}</td>
                            <td>${t.note}</td>
                            <td>${this.formatCurrency(t.amount)}</td>
                            <td>${t.type === 'income' ? '收入' : '支出'}</td>
                            <td>${t.categoryName || '待指定'}</td>
                        </tr>
                    `).join('')}
                    ${transactions.length > 10 ? `<tr><td colspan="5">... 还有 ${transactions.length - 10} 条记录</td></tr>` : ''}
                </tbody>
            </table>
        `;

        document.getElementById('confirm-import').style.display = 'block';
    }

    async confirmImport() {
        if (!this.importedData || this.importedData.length === 0) return;

        const defaultAccount = this.data.accounts[0];
        if (!defaultAccount) {
            alert('请先创建至少一个账户');
            return;
        }

        let imported = 0;
        this.importedData.forEach(item => {
            // Find or create category
            let categoryId = null;
            if (item.categoryName) {
                let category = this.data.categories.find(c => 
                    c.name === item.categoryName && c.type === item.type
                );
                if (!category) {
                    category = {
                        id: this.generateId(),
                        name: item.categoryName,
                        type: item.type,
                        color: item.type === 'income' ? '#27ae60' : '#3498db'
                    };
                    this.data.categories.push(category);
                }
                categoryId = category.id;
            } else {
                // Use first matching category
                const category = this.data.categories.find(c => c.type === item.type);
                categoryId = category?.id;
            }

            const transaction = {
                id: this.generateId(),
                type: item.type,
                date: item.date,
                accountId: defaultAccount.id,
                toAccountId: null,
                amount: item.amount,
                categoryId: categoryId,
                note: item.note
            };

            this.data.transactions.push(transaction);
            this.applyTransaction(transaction);
            imported++;
        });

        await this.saveData();
        alert(`成功导入 ${imported} 笔交易`);
        
        this.importedData = null;
        document.getElementById('import-preview').innerHTML = '';
        document.getElementById('confirm-import').style.display = 'none';
        document.getElementById('csv-file').value = '';
        
        this.showView('transactions');
    }

    // Export Data
    async exportData() {
        const data = {
            accounts: this.data.accounts,
            categories: this.data.categories,
            transactions: this.data.transactions,
            exportDate: new Date().toISOString()
        };

        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `financial-data-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Utilities
    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    formatCurrency(amount) {
        return '¥' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
}

// Initialize app
const app = new FinanceApp();
