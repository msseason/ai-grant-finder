// ===================================
// Authentication System
// ===================================

const Auth = {
    // Current user
    currentUser: null,
    
    // Initialize
    init: function() {
        this.currentUser = JSON.parse(localStorage.getItem('currentUser'));
        return this.currentUser;
    },
    
    // Sign up
    signup: function(userData) {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        
        // Check if email already exists
        if (users.find(u => u.email === userData.email)) {
            throw new Error('Email already registered');
        }
        
        // Validate password
        if (userData.password.length < 8) {
            throw new Error('Password must be at least 8 characters');
        }
        
        // Create new user
        const newUser = {
            ...userData,
            id: 'user_' + Date.now(),
            role: userData.role || 'owner',
            status: 'trial',
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
        
        // Auto login
        this.login(userData.email, userData.password);
        
        return newUser;
    },
    
    // Login
    login: function(email, password) {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const user = users.find(u => u.email === email && u.password === password);
        
        if (!user) {
            throw new Error('Invalid email or password');
        }
        
        // Set current user
        this.currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        return user;
    },
    
    // Logout
    logout: function() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
    },
    
    // Check if authenticated
    isAuthenticated: function() {
        return this.currentUser !== null;
    },
    
    // Check if admin
    isAdmin: function() {
        return this.currentUser && this.currentUser.role === 'admin';
    },
    
    // Require authentication
    requireAuth: function() {
        if (!this.isAuthenticated()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    },
    
    // Require admin
    requireAdmin: function() {
        if (!this.isAdmin()) {
            alert('Access denied. Admin privileges required.');
            window.location.href = 'dashboard.html';
            return false;
        }
        return true;
    }
};

// Initialize on page load
Auth.init();