// Authentication and student registration functions

// Student registration
async function registerStudent() {
    const name = document.getElementById('studentName').value.trim();
    const email = document.getElementById('studentEmail').value.trim();
    const phone = document.getElementById('studentPhone').value.trim();

    // Validation
    if (!name || !email || !phone) {
        showRegistrationError('Please fill in all fields');
        return;
    }

    if (!isValidEmail(email)) {
        showRegistrationError('Please enter a valid email address');
        return;
    }

    if (!isValidPhone(phone)) {
        showRegistrationError('Please enter a valid phone number (10-15 digits)');
        return;
    }

    try {
        const response = await fetch('php/auth.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `action=register&name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}`
        });

        const result = await response.json();

        if (result.success) {
            // Store student ID for later use (persist across refreshes)
            window.currentStudentId = result.student_id;
            localStorage.setItem('currentStudentId', result.student_id);
            startInterview();
        } else {
            showRegistrationError(result.message);
        }
    } catch (error) {
        showRegistrationError('Network error. Please try again.');
    }
}

function showRegistrationError(message) {
    document.getElementById('registrationError').textContent = message;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidPhone(phone) {
    // Accept 10-15 digits, with optional dashes, spaces, or parentheses
    const phoneRegex = /^[\d\s()\-+]{10,15}$/;
    return phoneRegex.test(phone);
}

// Admin login
function adminLogin() {
    const username = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value.trim();

    // Validate inputs
    if (!username || !password) {
        document.getElementById('loginError').textContent = 'Please enter username and password';
        return;
    }

    // Call server-side admin authentication
    fetch('php/admin_auth.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        credentials: 'same-origin',
        body: `action=login&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
    })
        .then(res => {
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            return res.json();
        })
        .then(result => {
            console.log('Login response:', result);
            if (result.success) {
                showAdminPanel();
                // Initialize theme selector
                initThemeSelector();
            } else {
                document.getElementById('loginError').textContent = result.message || 'Invalid username or password';
            }
        })
        .catch(err => {
            document.getElementById('loginError').textContent = 'Network error. Please try again.';
            console.error('Admin login error:', err);
        });
}

function showAdminPanel() {
    // Show sidebar and admin screen
    const sidebar = document.querySelector('.admin-sidebar');
    if (sidebar) sidebar.classList.add('visible');
    const adminScreen = document.getElementById('adminScreen');
    if (adminScreen) adminScreen.style.display = 'flex';

    showScreen('adminScreen');
    initializeAdminPanel();
    // Load dashboard stats immediately
    updateDashboardStats();
    renderQuestionsList();
    renderResultsTable();
    // Load question set selectors
    if (typeof loadSetSelectorsForQuestions === 'function') {
        loadSetSelectorsForQuestions();
    }
}

function logout() {
    // Call server to destroy admin session
    fetch('php/admin_auth.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        credentials: 'same-origin',
        body: 'action=logout'
    }).catch(err => console.warn('Logout request failed', err)).finally(() => {
        // Clear student data
        localStorage.removeItem('currentStudentId');
        window.currentStudentId = null;

        // Clear admin login form
        const adminUsername = document.getElementById('adminUsername');
        const adminPassword = document.getElementById('adminPassword');
        if (adminUsername) adminUsername.value = '';
        if (adminPassword) adminPassword.value = '';

        // Clear login error
        const loginError = document.getElementById('loginError');
        if (loginError) loginError.textContent = '';
        // Hide admin panel and show only login screen
        const sidebar = document.querySelector('.admin-sidebar');
        if (sidebar) sidebar.classList.remove('visible');
        const adminScreen = document.getElementById('adminScreen');
        if (adminScreen) adminScreen.style.display = 'none';

        // Show login screen
        if (typeof showScreen === 'function') {
            showScreen('adminLoginScreen');
        } else {
            const adminLoginScreen = document.getElementById('adminLoginScreen');
            if (adminLoginScreen) adminLoginScreen.classList.add('active');
        }
    });
}

// Initialize login form keyboard support
function initLoginForm() {
    const passwordInput = document.getElementById('adminPassword');
    const usernameInput = document.getElementById('adminUsername');

    if (passwordInput) {
        // Allow Enter key to submit login from password field
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                adminLogin();
            }
        });
    }

    if (usernameInput) {
        // Allow Enter key to submit login from username field
        usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                adminLogin();
            }
        });
    }

    // Wire up logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}