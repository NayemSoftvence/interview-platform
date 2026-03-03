// Main application controller
document.addEventListener('DOMContentLoaded', function () {
    // Apply theme if set
    applyThemeToCurrentPage();

    // Initialize the application
    initApp();

    // Initialize login form if on admin page
    initLoginForm();

    // Initialize timer display with default or saved time
    initializeTimerDisplay();

    // Load welcome content & apply to home screen
    loadAndApplyWelcomeContent();

    // Setup event listeners (always call, not just on index.html)
    setupEventListeners();
});

function applyThemeToCurrentPage() {
    const savedTheme = localStorage.getItem('appTheme') || 'style-modern';
    if (savedTheme !== 'style-modern' && !document.querySelector(`link[href*="${savedTheme}.css"]`)) {
        const themeLink = document.createElement('link');
        themeLink.rel = 'stylesheet';
        themeLink.href = `css/${savedTheme}.css?v=2.2`;
        themeLink.dataset.theme = 'true';
        document.head.appendChild(themeLink);
    }
}

function initializeTimerDisplay() {
    const timerEl = document.getElementById('timer');
    if (!timerEl) return;

    fetch('php/settings.php?action=get_interview_time')
        .then(res => res.json())
        .then(result => {
            if (result.success && result.interview_time) {
                const minutes = parseInt(result.interview_time, 10);
                timerEl.textContent = `${minutes.toString().padStart(2, '0')}:00`;
            } else {
                timerEl.textContent = '30:00';
            }
        })
        .catch(() => { timerEl.textContent = '30:00'; });
}

function initApp() {
    fetch('php/settings.php?action=get_interview_time')
        .then(res => res.json())
        .then(result => {
            const mainContent = document.getElementById('mainContent');
            const examClosedMessage = document.getElementById('examClosedMessage');

            if (result.success && result.exam_status) {
                if (mainContent) mainContent.style.display = 'block';
                if (examClosedMessage) examClosedMessage.style.display = 'none';
                initializeTimerDisplay();
            } else {
                if (mainContent) mainContent.style.display = 'none';
                if (examClosedMessage) examClosedMessage.style.display = 'block';
            }
        })
        .catch(() => {
            const mainContent = document.getElementById('mainContent');
            const examClosedMessage = document.getElementById('examClosedMessage');
            if (mainContent) mainContent.style.display = 'none';
            if (examClosedMessage) examClosedMessage.style.display = 'block';
        });
}

function setupEventListeners() {
    const studentRegisterBtn = document.getElementById('studentRegisterBtn');
    if (studentRegisterBtn) studentRegisterBtn.addEventListener('click', showStudentRegister);
    const backToWelcomeBtn = document.getElementById('backToWelcomeBtn');
    if (backToWelcomeBtn) backToWelcomeBtn.addEventListener('click', showWelcomeScreen);

    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) registerBtn.addEventListener('click', registerStudent);

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

    const prevBtn = document.getElementById('prevBtn');
    if (prevBtn) prevBtn.addEventListener('click', showPreviousQuestion);
    const nextBtn = document.getElementById('nextBtn');
    if (nextBtn) nextBtn.addEventListener('click', showNextQuestion);
}

// Screen management
function showScreen(screenId) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => { screen.classList.remove('active'); });
    document.getElementById(screenId).classList.add('active');

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
    document.getElementById('registrationError').textContent = '';
}

// ===== LOAD AND APPLY WELCOME CONTENT =====

async function loadAndApplyWelcomeContent() {
    try {
        const response = await fetch('php/settings.php?action=get_welcome_content');
        const result = await response.json();

        if (result.success && result.welcome_content) {
            const content = result.welcome_content;

            // Apply admin-chosen theme
            if (result.admin_theme) {
                localStorage.setItem('appTheme', result.admin_theme);
                if (result.admin_theme !== 'style-modern') {
                    document.querySelectorAll('link[data-theme]').forEach(l => l.remove());
                    const themeLink = document.createElement('link');
                    themeLink.rel = 'stylesheet';
                    themeLink.href = `css/${result.admin_theme}.css?v=2.2`;
                    themeLink.dataset.theme = 'true';
                    document.head.appendChild(themeLink);
                }
            }

            // Platform name → <h1>, <title>, exam-closed section
            const platformName = content.platform_name || 'Interview Platform';
            const headerTitleEl = document.getElementById('siteHeaderTitle');
            if (headerTitleEl) headerTitleEl.textContent = platformName;

            const pageTitleEl = document.getElementById('pageTitle');
            if (pageTitleEl) pageTitleEl.textContent = platformName;
            else document.title = platformName;

            const examClosedText = document.getElementById('examClosedText');
            if (examClosedText) examClosedText.textContent = `The ${platformName} is currently not available. Please check back later.`;

            // Header subtitle
            const headerSubEl = document.getElementById('siteHeaderSubtitle');
            if (headerSubEl && content.header_subtitle) headerSubEl.textContent = content.header_subtitle;

            // Welcome screen title
            const titleEl = document.getElementById('welcomeTitle');
            if (titleEl && content.title) titleEl.textContent = content.title;

            // Welcome screen description
            const descEl = document.getElementById('welcomeDescription');
            if (descEl && content.description) descEl.textContent = content.description;

            // Instructions list
            const instructionsList = document.getElementById('instructionsList');
            if (instructionsList && content.instructions) {
                instructionsList.innerHTML = '';
                const instructions = content.instructions.split('\n').filter(i => i.trim());
                instructions.forEach(instruction => {
                    const li = document.createElement('li');
                    li.textContent = instruction.trim();
                    instructionsList.appendChild(li);
                });
            }
        }
    } catch (error) {
        console.error('Error loading welcome content:', error);
    }
}