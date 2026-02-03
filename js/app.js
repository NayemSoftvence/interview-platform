// Main application controller
document.addEventListener('DOMContentLoaded', function () {
    // Initialize the application
    initApp();

    // Initialize login form if on admin page
    initLoginForm();

    // Initialize timer display with default or saved time
    initializeTimerDisplay();
});

function initializeTimerDisplay() {
    const timerEl = document.getElementById('timer');
    if (!timerEl) return; // Exit if timer element not found

    // Fetch interview time from database
    fetch('php/settings.php?action=get_interview_time')
        .then(res => res.json())
        .then(result => {
            if (result.success && result.interview_time) {
                const minutes = parseInt(result.interview_time, 10);
                timerEl.textContent = `${minutes.toString().padStart(2, '0')}:00`;
            } else {
                // Default to 30 minutes if fetch fails or no time set
                timerEl.textContent = '30:00';
            }
        })
        .catch(err => {
            console.error('Error loading interview time:', err);
            timerEl.textContent = '30:00'; // Default fallback
        });
} function initApp() {
    // Check exam status first
    fetch('php/settings.php?action=get_interview_time')
        .then(res => res.json())
        .then(result => {
            const mainContent = document.getElementById('mainContent');
            const examClosedMessage = document.getElementById('examClosedMessage');

            if (result.success && result.exam_status) {
                // Exam is running, show main content
                if (mainContent) mainContent.style.display = 'block';
                if (examClosedMessage) examClosedMessage.style.display = 'none';
                setupEventListeners(); // Only set up event listeners if exam is running
                initializeTimerDisplay();
            } else {
                // Exam is not running, show closed message
                if (mainContent) mainContent.style.display = 'none';
                if (examClosedMessage) examClosedMessage.style.display = 'block';
            }
        })
        .catch(err => {
            console.error('Error fetching exam status:', err);
            // Default to showing exam closed message on error
            const mainContent = document.getElementById('mainContent');
            const examClosedMessage = document.getElementById('examClosedMessage');
            if (mainContent) mainContent.style.display = 'none';
            if (examClosedMessage) examClosedMessage.style.display = 'block';
        });
}

function setupEventListeners() {
    // Navigation buttons (only on index.html)
    const studentRegisterBtn = document.getElementById('studentRegisterBtn');
    if (studentRegisterBtn) studentRegisterBtn.addEventListener('click', showStudentRegister);
    const backToWelcomeBtn = document.getElementById('backToWelcomeBtn');
    if (backToWelcomeBtn) backToWelcomeBtn.addEventListener('click', showWelcomeScreen);

    // Student registration (only on index.html)
    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) registerBtn.addEventListener('click', registerStudent);

    // Admin functions (for admin.html page)
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) loginBtn.addEventListener('click', adminLogin);
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    const addQuestionBtn = document.getElementById('addQuestionBtn');
    if (addQuestionBtn) addQuestionBtn.addEventListener('click', addQuestion);
    const clearQuestionsBtn = document.getElementById('clearQuestionsBtn');
    if (clearQuestionsBtn) clearQuestionsBtn.addEventListener('click', clearQuestions);
    const bulkUploadBtn = document.getElementById('bulkUploadBtn');
    if (bulkUploadBtn) bulkUploadBtn.addEventListener('click', bulkUploadQuestions);
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', cancelEdit);
    const saveInterviewTimeBtn = document.getElementById('saveInterviewTimeBtn');
    if (saveInterviewTimeBtn) saveInterviewTimeBtn.addEventListener('click', saveInterviewTime);
    const clearResultsBtn = document.getElementById('clearResultsBtn');
    if (clearResultsBtn) clearResultsBtn.addEventListener('click', clearResults);

    // Quiz navigation (only on index.html)
    const prevBtn = document.getElementById('prevBtn');
    if (prevBtn) prevBtn.addEventListener('click', showPreviousQuestion);
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) nextBtn.addEventListener('click', showNextQuestion);
}

// Screen management
function showScreen(screenId) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');

    // Show admin icon only on welcome screen
    const adminIcon = document.querySelector('.admin-icon-btn');
    if (adminIcon) {
        adminIcon.style.display = screenId === 'welcomeScreen' ? 'flex' : 'none';
    }
}

function showWelcomeScreen() {
    showScreen('welcomeScreen');
}

function showStudentRegister() {
    showScreen('studentRegisterScreen');
    // Clear any previous errors
    document.getElementById('registrationError').textContent = '';
}