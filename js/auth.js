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

    try {
        const response = await fetch('php/auth.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `action=register&name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}`
        });

        const result = await response.json();

        if (result.success) {
            // Store student ID for later use
            window.currentStudentId = result.student_id;
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

// Admin login
function adminLogin() {
    const username = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;

    // Call server-side admin authentication
    fetch('php/admin_auth.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        credentials: 'same-origin',
        body: `action=login&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
    })
        .then(res => res.json())
        .then(result => {
            if (result.success) {
                showAdminPanel();
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
    showScreen('adminScreen');
    initializeAdminPanel();
    renderQuestionsList();
    renderResultsTable();
}

function logout() {
    // Call server to destroy admin session (best-effort)
    fetch('php/admin_auth.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        credentials: 'same-origin',
        body: 'action=logout'
    }).catch(err => console.warn('Logout request failed', err)).finally(() => {
        // Clear admin login form
        const adminUsername = document.getElementById('adminUsername');
        const adminPassword = document.getElementById('adminPassword');
        if (adminUsername) adminUsername.value = '';
        if (adminPassword) adminPassword.value = '';
        
        // Redirect to admin login page (admin.html)
        window.location.href = 'admin.html';
    });
}