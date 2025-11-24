// Main application controller
document.addEventListener('DOMContentLoaded', function () {
    // Initialize the application
    initApp();
});

function initApp() {
    // Set up event listeners
    setupEventListeners();
}

function setupEventListeners() {
    // Navigation buttons
    document.getElementById('studentRegisterBtn').addEventListener('click', showStudentRegister);
    document.getElementById('backToWelcomeBtn').addEventListener('click', showWelcomeScreen);

    // Student registration
    document.getElementById('registerBtn').addEventListener('click', registerStudent);

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

    // Quiz navigation
    document.getElementById('prevBtn').addEventListener('click', showPreviousQuestion);
    document.getElementById('nextBtn').addEventListener('click', showNextQuestion);
    document.getElementById('restartBtn').addEventListener('click', restartInterview);
}

// Screen management
function showScreen(screenId) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function showWelcomeScreen() {
    showScreen('welcomeScreen');
}

function showStudentRegister() {
    showScreen('studentRegisterScreen');
    // Clear any previous errors
    document.getElementById('registrationError').textContent = '';
}