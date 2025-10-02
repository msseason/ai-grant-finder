// ===================================
// AI Grant Finder Pro - Main App Logic
// ===================================

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Check if we're on a protected page
    const protectedPages = ['dashboard.html', 'applications.html', 'reports.html', 'profile.html', 'admin.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (protectedPages.includes(currentPage)) {
        checkAuthentication();
    }
    
    // Initialize demo data if needed
    initializeDemoData();
}

// ===================================
// Authentication
// ===================================

function checkAuthentication() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (!currentUser) {
        window.location.href = 'login.html';
        return false;
    }
    
    return true;
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('currentUser');
        window.location.href = 'login.html';
    }
}

// ===================================
// Demo Data Initialization
// ===================================

function initializeDemoData() {
    // Create demo user if doesn't exist
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    if (!users.find(u => u.email === 'demo@grantfinder.com')) {
        users.push({
            fullName: 'Demo User',
            email: 'demo@grantfinder.com',
            password: 'demo1234',
            companyName: 'Demo Company LLC',
            plan: 'professional',
            role: 'owner',
            status: 'active',
            createdAt: new Date().toISOString()
        });
        localStorage.setItem('users', JSON.stringify(users));
    }
    
    // Create admin user if doesn't exist
    if (!users.find(u => u.email === 'admin@grantfinder.com')) {
        users.push({
            fullName: 'Admin User',
            email: 'admin@grantfinder.com',
            password: 'admin123',
            companyName: 'Grant Finder Pro',
            plan: 'enterprise',
            role: 'admin',
            status: 'active',
            createdAt: new Date().toISOString()
        });
        localStorage.setItem('users', JSON.stringify(users));
    }
    
    // Create demo applications if needed
    const applications = JSON.parse(localStorage.getItem('applications') || '[]');
    
    if (applications.length === 0) {
        const demoApplications = [
            {
                id: 'app_demo_1',
                userId: 'demo@grantfinder.com',
                grantName: 'NSF SBIR Phase I',
                provider: 'National Science Foundation',
                amount: 275000,
                status: 'submitted',
                deadline: '2025-06-15',
                assignedTo: 'Demo User',
                awardAmount: null,
                notes: 'Strong technical proposal submitted',
                createdAt: '2025-01-15T10:00:00Z',
                submittedDate: '2025-01-20T14:30:00Z'
            },
            {
                id: 'app_demo_2',
                userId: 'demo@grantfinder.com',
                grantName: 'AWS Activate Credits',
                provider: 'Amazon Web Services',
                amount: 100000,
                status: 'awarded',
                deadline: '2025-03-01',
                assignedTo: 'Demo User',
                awardAmount: 100000,
                notes: 'Approved! $100K in AWS credits received',
                createdAt: '2024-12-01T09:00:00Z',
                submittedDate: '2024-12-05T11:00:00Z'
            },
            {
                id: 'app_demo_3',
                userId: 'demo@grantfinder.com',
                grantName: 'Illinois SBIR Match',
                provider: 'Illinois DCEO',
                amount: 50000,
                status: 'in-progress',
                deadline: '2025-04-30',
                assignedTo: 'Demo User',
                awardAmount: null,
                notes: 'Waiting for federal SBIR decision first',
                createdAt: '2025-01-10T08:00:00Z'
            }
        ];
        
        localStorage.setItem('applications', JSON.stringify(demoApplications));
    }
}

// ===================================
// Utility Functions
// ===================================

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function calculateDaysUntil(dateString) {
    const today = new Date();
    const targetDate = new Date(dateString);
    const diffTime = targetDate - today;const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

// ===================================
// Export Functions
// ===================================

function exportToCSV(data, filename) {
    const csv = convertArrayToCSV(data);
    downloadFile(csv, filename, 'text/csv');
}

function convertArrayToCSV(data) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const rows = data.map(obj => headers.map(header => obj[header] || ''));
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
}

function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type: type });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// ===================================
// Notification System
// ===================================

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'success' ? 'var(--success)' : 'var(--danger)'};
        color: white;
        border-radius: var(--radius-md);
        box-shadow: var(--shadow-lg);
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ===================================
// Local Storage Helpers
// ===================================

const DB = {
    get: (key) => JSON.parse(localStorage.getItem(key) || '[]'),
    set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
    add: (key, item) => {
        const items = DB.get(key);
        items.push(item);
        DB.set(key, items);
        return item;
    },
    update: (key, id, updates) => {
        const items = DB.get(key);
        const index = items.findIndex(item => item.id === id);
        if (index !== -1) {
            items[index] = { ...items[index], ...updates };
            DB.set(key, items);
            return items[index];
        }
        return null;
    },
    delete: (key, id) => {
        const items = DB.get(key);
        const filtered = items.filter(item => item.id !== id);
        DB.set(key, filtered);
    }
};

// ===================================
// Animation Keyframes
// ===================================

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);