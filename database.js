// ===================================
// Database Management System
// Using localStorage for demo (replace with real DB in production)
// ===================================

const Database = {
    // ===================================
    // Users
    // ===================================
    
    users: {
        getAll: () => JSON.parse(localStorage.getItem('users') || '[]'),
        
        getById: (email) => {
            const users = Database.users.getAll();
            return users.find(u => u.email === email);
        },
        
        create: (userData) => {
            const users = Database.users.getAll();
            const newUser = {
                ...userData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            users.push(newUser);
            localStorage.setItem('users', JSON.stringify(users));
            return newUser;
        },
        
        update: (email, updates) => {
            const users = Database.users.getAll();
            const index = users.findIndex(u => u.email === email);
            if (index !== -1) {
                users[index] = {
                    ...users[index],
                    ...updates,
                    updatedAt: new Date().toISOString()
                };
                localStorage.setItem('users', JSON.stringify(users));
                return users[index];
            }
            return null;
        },
        
        delete: (email) => {
            const users = Database.users.getAll();
            const filtered = users.filter(u => u.email !== email);
            localStorage.setItem('users', JSON.stringify(filtered));
        },
        
        authenticate: (email, password) => {
            const users = Database.users.getAll();
            return users.find(u => u.email === email && u.password === password);
        }
    },
    
    // ===================================
    // Applications
    // ===================================
    
    applications: {
        getAll: () => JSON.parse(localStorage.getItem('applications') || '[]'),
        
        getByUser: (userId) => {
            const applications = Database.applications.getAll();
            return applications.filter(app => app.userId === userId);
        },
        
        getById: (id) => {
            const applications = Database.applications.getAll();
            return applications.find(app => app.id === id);
        },
        
        create: (appData) => {
            const applications = Database.applications.getAll();
            const newApp = {
                id: 'app_' + Date.now(),
                ...appData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            applications.push(newApp);
            localStorage.setItem('applications', JSON.stringify(applications));
            return newApp;
        },
        
        update: (id, updates) => {
            const applications = Database.applications.getAll();
            const index = applications.findIndex(app => app.id === id);
            if (index !== -1) {
                applications[index] = {
                    ...applications[index],
                    ...updates,
                    updatedAt: new Date().toISOString()
                };
                localStorage.setItem('applications', JSON.stringify(applications));
                return applications[index];
            }
            return null;
        },
        
        delete: (id) => {
            const applications = Database.applications.getAll();
            const filtered = applications.filter(app => app.id !== id);
            localStorage.setItem('applications', JSON.stringify(filtered));
        },
        
        getStats: (userId = null) => {
            const applications = userId 
                ? Database.applications.getByUser(userId)
                : Database.applications.getAll();
            
            const stats = {
                total: applications.length,
                draft: applications.filter(a => a.status === 'draft').length,
                inProgress: applications.filter(a => a.status === 'in-progress').length,
                submitted: applications.filter(a => a.status === 'submitted').length,
                underReview: applications.filter(a => a.status === 'under-review').length,
                awarded: applications.filter(a => a.status === 'awarded').length,
                rejected: applications.filter(a => a.status === 'rejected').length,
                totalRequested: applications.reduce((sum, app) => sum + app.amount, 0),
                totalAwarded: applications
                    .filter(a => a.status === 'awarded')
                    .reduce((sum, app) => sum + (app.awardAmount || 0), 0),
                successRate: applications.length > 0 
                    ? (applications.filter(a => a.status === 'awarded').length / applications.length * 100).toFixed(1)
                    : 0
            };
            
            return stats;
        }
    },
    
    // ===================================
    // Grants
    // ===================================
    
    grants: {
        getAll: async () => {
            try {
                const response = await fetch('grants_database.json');
                const data = await response.json();
                let allGrants = [];
                for (let category in data) {
                    allGrants = allGrants.concat(data[category]);
                }
                return allGrants;
            } catch (error) {
                console.error('Error loading grants:', error);
                return [];
            }
        },
        
        getById: async (id) => {
            const grants = await Database.grants.getAll();
            return grants.find(g => g.id === id);
        },
        
        search: async (query) => {
            const grants = await Database.grants.getAll();
            const lowerQuery = query.toLowerCase();
            return grants.filter(grant => 
                grant.name.toLowerCase().includes(lowerQuery) ||
                grant.provider.toLowerCase().includes(lowerQuery) ||
                grant.category.some(cat => cat.toLowerCase().includes(lowerQuery))
            );
        }
    },
    
    // ===================================
    // Grantor Analysis
    // ===================================
    
    grantorAnalysis: {
        getAll: async () => {
            try {
                const response = await fetch('grantor_analysis.json');
                return await response.json();
            } catch (error) {
                console.error('Error loading grantor analysis:', error);
                return {};
            }
        },
        
        getById: async (id) => {
            const analysis = await Database.grantorAnalysis.getAll();
            return analysis[id];
        }
    },
    
    // ===================================
    // Analytics
    // ===================================
    
    analytics: {
        getUserStats: () => {
            const users = Database.users.getAll();
            const now = new Date();
            const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            
            return {
                total: users.length,
                active: users.filter(u => u.status === 'active').length,
                trial: users.filter(u => u.status === 'trial').length,
                newThisMonth: users.filter(u => new Date(u.createdAt) >= thisMonth).length,
                byPlan: {
                    starter: users.filter(u => u.plan === 'starter').length,
                    professional: users.filter(u => u.plan === 'professional').length,
                    enterprise: users.filter(u => u.plan === 'enterprise').length
                }
            };
        },
        
        getRevenueStats: () => {
            const users = Database.users.getAll();
            const planPrices = {
                starter: 49,
                professional: 99,
                enterprise: 299
            };
            
            const activeUsers = users.filter(u => u.status === 'active' || u.status === 'trial');
            const mrr = activeUsers.reduce((sum, user) => sum + (planPrices[user.plan] || 0), 0);
            
            return {
                mrr: mrr,
                arr: mrr * 12,
                arpu: activeUsers.length > 0 ? mrr / activeUsers.length : 0,
                byPlan: {
                    starter: users.filter(u => u.plan === 'starter' && (u.status === 'active' || u.status === 'trial')).length * 49,
                    professional: users.filter(u => u.plan === 'professional' && (u.status === 'active' || u.status === 'trial')).length * 99,
                    enterprise: users.filter(u => u.plan === 'enterprise' && (u.status === 'active' || u.status === 'trial')).length * 299
                }
            };
        },
        
        getApplicationStats: () => {
            const applications = Database.applications.getAll();
            return Database.applications.getStats();
        }
    }
};

// ===================================
// Export Database
// ===================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Database;
}