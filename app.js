// ===================================
// AI Grant Finder Pro - Main App Logic
// UPDATED: Fixed demo deadlines to be in future
// ===================================

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Check if we're on a protected page
    const protectedPages = ['dashboard.html', 'applications.html', 'reports.html', 'profile.html', 'admin.html', 'business-profile.html'];
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
// Demo Data Initialization - FIXED DEADLINES
// ===================================

function initializeDemoData() {
    // Create demo user if doesn't exist
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    if (!users.find(u => u.email === 'demo@grantfinder.com')) {
        users.push({
            fullName: 'Demo User',
            email: 'demo@grantfinder.com',
            password: 'demo1234',
            companyName: 'Demo AI Business Solutions',
            plan: 'professional',
            role: 'owner',
            status: 'active',
            createdAt: '2024-12-01T10:00:00Z'
        });
        localStorage.setItem('users', JSON.stringify(users));
        console.log('✅ Demo user created');
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
            createdAt: '2024-11-01T10:00:00Z'
        });
        localStorage.setItem('users', JSON.stringify(users));
        console.log('✅ Admin user created');
    }
    
    // Create demo applications with FUTURE deadlines - FIXED
    const applications = JSON.parse(localStorage.getItem('applications') || '[]');
    const demoApps = applications.filter(app => app.userId === 'demo@grantfinder.com');
    
    if (demoApps.length === 0) {
        // Calculate future dates
        const today = new Date();
        const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
        const in60Days = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
        const in90Days = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
        
        const demoApplications = [
            {
                id: 'app_demo_1',
                userId: 'demo@grantfinder.com',
                grantName: 'NSF SBIR Phase I',
                provider: 'National Science Foundation',
                amount: 275000,
                status: 'submitted',
                deadline: in60Days.toISOString().split('T')[0], // 60 days from now
                assignedTo: 'Demo User',
                awardAmount: null,
                notes: 'Strong technical proposal submitted. Waiting for reviewer feedback.',
                createdAt: '2025-01-15T10:00:00Z',
                updatedAt: '2025-01-20T14:30:00Z',
                submittedDate: '2025-01-20T14:30:00Z'
            },
            {
                id: 'app_demo_2',
                userId: 'demo@grantfinder.com',
                grantName: 'AWS Activate Credits',
                provider: 'Amazon Web Services',
                amount: 100000,
                status: 'awarded',
                deadline: '2025-03-01', // Past deadline (already awarded)
                assignedTo: 'Demo User',
                awardAmount: 100000,
                notes: '✅ APPROVED! $100K in AWS credits received. Using for platform hosting and AI services.',
                createdAt: '2024-12-01T09:00:00Z',
                updatedAt: '2024-12-15T11:00:00Z',
                submittedDate: '2024-12-05T11:00:00Z'
            },
            {
                id: 'app_demo_3',
                userId: 'demo@grantfinder.com',
                grantName: 'Illinois SBIR Match Program',
                provider: 'Illinois DCEO',
                amount: 50000,
                status: 'in-progress',
                deadline: in90Days.toISOString().split('T')[0], // 90 days from now
                assignedTo: 'Demo User',
                awardAmount: null,
                notes: 'Waiting for federal SBIR decision before submitting state match application.',
                createdAt: '2025-01-10T08:00:00Z',
                updatedAt: '2025-01-10T08:00:00Z'
            }
        ];
        
        // Add demo applications to existing applications
        const allApplications = [...applications, ...demoApplications];
        localStorage.setItem('applications', JSON.stringify(allApplications));
        console.log('✅ Demo applications created with future deadlines:', demoApplications.length);
    } else {
        console.log('✅ Demo applications already exist:', demoApps.length);
    }

    // Create demo business profile with NATIONWIDE reach
    const demoProfile = localStorage.getItem('businessProfile_demo@grantfinder.com');
    if (!demoProfile) {
        const demoBusinessProfile = {
            userId: 'demo@grantfinder.com',
            legalBusinessName: 'Demo AI Business Solutions LLC',
            businessStructure: 'llc',
            yearFounded: '2024',
            employees: '2-10',
            revenue: '50k-250k',
            streetAddress: '123 Innovation Drive',
            city: 'Joliet',
            state: 'Illinois',
            county: 'Will County',
            zipCode: '60435',
            
            // Geographic Reach - ADDED
            geographicReach: 'nationwide',
            targetStates: ['Illinois', 'Indiana', 'Wisconsin', 'Michigan', 'Ohio', 'Iowa', 'Missouri'],
            servesRuralAreas: true,
            servesUrbanAreas: true,
            
            industries: ['AI & Technology', 'Workforce Development', 'Entrepreneurship'],
            audiences: ['Displaced Workers', 'Underemployed', 'Aspiring Entrepreneurs'],
            missionStatement: 'We empower displaced workers nationwide to build successful AI businesses through accessible training and business-in-a-box solutions.',
            problemStatement: 'Rapid AI advancement is displacing workers across America while creating a skills gap. Many people feel intimidated by AI technology and lack accessible pathways to leverage it for income generation.',
            solutionStatement: 'We provide affordable AI business-in-a-box packages ($150-$1000) that include prompt libraries, training materials, and step-by-step guidance, enabling anyone nationwide to start an AI-powered business.',
            valueProposition: 'Unlike expensive AI courses, our business-in-a-box model provides everything needed to start earning immediately, with packages priced for accessibility and delivered digitally to serve customers nationwide.',
            impactStatement: 'We help individuals across the United States transition to AI-powered businesses, generating an average of $3,500/month in new income within 90 days. Our digital delivery model enables us to serve rural and urban communities equally.',
            productsServices: '1) AI Prompt Package ($150), 2) Business Starter Kit ($500), 3) Complete Business Bundle ($1000)',
            priceRange: '$150 - $1,000',
            customersServed: '50',
            fundingUse: 'Platform development, nationwide marketing campaign, curriculum creation, pilot program for 100 participants across multiple states',
            outcomes: 'Train 500 displaced workers nationwide, 70% job placement rate, $2M in aggregate income generated, serve 10+ states',
            communityImpact: 'We address the nationwide AI skills gap, particularly in communities affected by manufacturing decline and automation. Our digital model enables us to serve underserved rural areas alongside urban centers.',
            isComplete: true,
            completionPercentage: 100,
            lastUpdated: '2024-12-01T10:00:00Z'
        };
        
        localStorage.setItem('businessProfile_demo@grantfinder.com', JSON.stringify(demoBusinessProfile));
        console.log('✅ Demo business profile created with nationwide reach');
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
    const diffTime = targetDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
    const rows = data.map(obj => headers.map(header => {
        const value = obj[header];
        // Escape commas and quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return '"' + value.replace(/"/g, '""') + '"';
        }
        return value || '';
    }));
    
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
        background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--info)'};
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
    
    .deadline-item.soon {
        border-left-color: var(--warning);
        background: #fffbeb;
    }
    
    .checkbox-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 1rem;
        margin-top: 0.5rem;
    }
    
    .checkbox-card {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem;
        background: var(--gray-50);
        border: 2px solid var(--gray-200);
        border-radius: var(--radius-md);
        cursor: pointer;
        transition: all 0.2s;
    }
    
    .checkbox-card:hover {
        border-color: var(--primary);
        background: var(--gray-100);
    }
    
    .checkbox-card input[type="checkbox"] {
        width: auto;
        margin: 0;
    }
    
    .checkbox-card input[type="checkbox"]:checked + span {
        font-weight: 600;
        color: var(--primary);
    }
    
    .ai-message {
        margin: 1rem 0;
        padding: 1rem;
        background: rgba(255,255,255,0.1);
        border-radius: 8px;
    }
    
    .user-message {
        margin: 1rem 0;
        padding: 1rem;
        background: rgba(255,255,255,0.2);
        border-radius: 8px;
        text-align: right;
    }
    
    .alert-warning {
        background: #fffbeb;
        border: 2px solid var(--warning);
        color: #92400e;
        padding: 1rem;
        border-radius: var(--radius-md);
        margin-bottom: 1.5rem;
    }
    
    .alert-warning strong {
        display: block;
        margin-bottom: 0.5rem;
    }
`;
document.head.appendChild(style);

console.log('✅ App initialized');