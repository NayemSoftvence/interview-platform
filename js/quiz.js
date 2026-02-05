// Quiz functionality

let quizState = {
    questions: [],
    currentQuestionIndex: 0,
    userAnswers: [],
    timeLeft: 0,
    timerInterval: null,
    warningCountdown: 5,
    warningInterval: null,
    focusLost: false
};

// runtime flags to prevent duplicate submission
quizState.ended = false;
quizState.saving = false;

// Listen for interview time updates from admin window
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'update-interview-time') {
        // Update localStorage with new time
        localStorage.setItem('adminInterviewTime', event.data.value);
        // Update timer display if on main page
        const timerEl = document.getElementById('timer');
        if (timerEl && !quizState.timerInterval) {
            // Only update if quiz hasn't started
            timerEl.textContent = `${event.data.value.toString().padStart(2, '0')}:00`;
        }
    }
});

// Listen for localStorage changes (cross-tab communication)
window.addEventListener('storage', (event) => {
    if (event.key === 'adminInterviewTime' && event.newValue) {
        const timerEl = document.getElementById('timer');
        if (timerEl && !quizState.timerInterval) {
            // Only update if quiz hasn't started
            timerEl.textContent = `${event.newValue.toString().padStart(2, '0')}:00`;
        }
    }
});

// Start the interview
async function startInterview() {
    try {
        // Load questions from database
        const response = await fetch('php/questions.php');
        quizState.questions = await response.json();

        if (quizState.questions.length === 0) {
            alert('No questions available. Please contact administrator.');
            return;
        }

        quizState.currentQuestionIndex = 0;
        quizState.userAnswers = [];
        quizState.ended = false;
        quizState.saving = false;

        // Fetch interview time from database settings
        try {
            const settingsResponse = await fetch('php/settings.php?action=get_interview_time');
            const settingsData = await settingsResponse.json();
            let interviewTime = settingsData.success && settingsData.interview_time
                ? parseInt(settingsData.interview_time, 10)
                : 30; // Default to 30 minutes

            quizState.timeLeft = interviewTime * 60; // Convert to seconds
        } catch (err) {
            console.error('Error loading interview time, using default (30 min):', err);
            quizState.timeLeft = 30 * 60; // Default to 30 minutes if fetch fails
        }

        // Update timer display
        updateTimerDisplay();

        // Start the timer
        quizState.timerInterval = setInterval(updateTimer, 1000);

        // Set up tab/window monitoring
        setupTabMonitoring();

        // Show first question
        showQuestion(quizState.currentQuestionIndex);
        showScreen('quizScreen');
    } catch (error) {
        alert('Error loading questions: ' + error.message);
    }
}

function updateTimer() {
    quizState.timeLeft--;
    updateTimerDisplay();

    if (quizState.timeLeft <= 0) {
        endInterview();
    }
}

function updateTimerDisplay() {
    const minutes = Math.floor(quizState.timeLeft / 60);
    const seconds = quizState.timeLeft % 60;
    document.getElementById('timer').textContent =
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // Change color when time is running out
    if (quizState.timeLeft < 300) { // 5 minutes
        document.getElementById('timer').style.color = 'var(--danger)';
    }
}

function setupTabMonitoring() {
    // Reset focus state
    quizState.focusLost = false;

    // Add event listeners for visibility change and blur
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
}

function handleVisibilityChange() {
    if (document.hidden) {
        handleFocusLost();
    }
}

function handleWindowBlur() {
    handleFocusLost();
}

function handleWindowFocus() {
    if (quizState.focusLost) {
        hideWarningModal();
    }
}

function handleFocusLost() {
    if (document.getElementById('quizScreen').classList.contains('active')) {
        quizState.focusLost = true;
        showWarningModal();
    }
}

function showWarningModal() {
    quizState.warningCountdown = 5;
    document.getElementById('warningModal').style.display = 'flex';
    document.getElementById('warningTimer').textContent = quizState.warningCountdown;
    document.getElementById('countdown').textContent = quizState.warningCountdown;

    quizState.warningInterval = setInterval(() => {
        quizState.warningCountdown--;
        document.getElementById('warningTimer').textContent = quizState.warningCountdown;
        document.getElementById('countdown').textContent = quizState.warningCountdown;

        if (quizState.warningCountdown <= 0) {
            endInterview();
        }
    }, 1000);
}

function hideWarningModal() {
    quizState.focusLost = false;
    document.getElementById('warningModal').style.display = 'none';
    clearInterval(quizState.warningInterval);
}

function showQuestion(index) {
    const question = quizState.questions[index];

    // Update question counter
    document.getElementById('currentQuestion').textContent = index + 1;
    document.getElementById('totalQuestions').textContent = quizState.questions.length;

    // Update progress bar
    const progress = ((index + 1) / quizState.questions.length) * 100;
    document.getElementById('progressBar').style.width = `${progress}%`;

    // Set question text
    document.getElementById('questionTextElement').textContent = question.question;

    // Clear and populate options - IMPORTANT: Always clear first to prevent showing previous options
    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = ''; // Completely clear previous options

    // Add all options fresh for current question
    if (Array.isArray(question.options)) {
        question.options.forEach((option, i) => {
            const optionElement = document.createElement('div');
            optionElement.className = 'option';
            // Only mark as selected if user already answered this question
            if (quizState.userAnswers[index] !== undefined && quizState.userAnswers[index] === i) {
                optionElement.classList.add('selected');
            }
            optionElement.textContent = option;
            optionElement.addEventListener('click', () => selectOption(i));
            optionsContainer.appendChild(optionElement);
        });
    }

    // Update navigation buttons
    document.getElementById('prevBtn').disabled = index === 0;
    document.getElementById('nextBtn').textContent =
        index === quizState.questions.length - 1 ? 'Finish' : 'Next';
}

function selectOption(optionIndex) {
    quizState.userAnswers[quizState.currentQuestionIndex] = optionIndex;

    // Update UI to show selected option
    const options = document.querySelectorAll('.option');
    options.forEach((option, i) => {
        if (i === optionIndex) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });
}

function showPreviousQuestion() {
    if (quizState.currentQuestionIndex > 0) {
        quizState.currentQuestionIndex--;
        showQuestion(quizState.currentQuestionIndex);
    }
}

function showNextQuestion() {
    // Save answer if not already saved
    if (quizState.userAnswers[quizState.currentQuestionIndex] === undefined) {
        quizState.userAnswers[quizState.currentQuestionIndex] = -1; // No answer
    }

    if (quizState.currentQuestionIndex < quizState.questions.length - 1) {
        quizState.currentQuestionIndex++;
        showQuestion(quizState.currentQuestionIndex);
    } else {
        endInterview();
    }
}

async function endInterview() {
    // make endInterview idempotent to avoid duplicate saves
    if (quizState.ended) return;
    quizState.ended = true;

    // prevent concurrent save attempts
    if (quizState.saving) return;
    quizState.saving = true;

    // Clear intervals
    clearInterval(quizState.timerInterval);
    clearInterval(quizState.warningInterval);

    // Remove event listeners
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('blur', handleWindowBlur);
    window.removeEventListener('focus', handleWindowFocus);

    // Calculate score
    let score = 0;
    quizState.userAnswers.forEach((answer, index) => {
        if (answer === quizState.questions[index].correctAnswer) {
            score++;
        }
    });

    const totalQuestions = quizState.questions.length;
    const percentage = parseFloat(((score / totalQuestions) * 100).toFixed(2));
    const answers = JSON.stringify(quizState.userAnswers);

    // Display results immediately (before saving to ensure they show)
    const finalScoreEl = document.getElementById('finalScore');
    const resultMessageEl = document.getElementById('resultMessage');

    if (finalScoreEl) {
        finalScoreEl.textContent = `${score}/${totalQuestions}`;
    }

    // Set result message based on performance
    let message = "You need more practice. Review Flutter concepts and try again.";
    if (percentage >= 80) {
        message = "Excellent! You have strong Flutter knowledge.";
    } else if (percentage >= 60) {
        message = "Good job! You have a solid understanding of Flutter.";
    } else if (percentage >= 40) {
        message = "Not bad! Keep studying Flutter to improve.";
    }

    if (resultMessageEl) {
        resultMessageEl.textContent = message;
    }

    // Show results screen immediately
    showScreen('resultsScreen');

    try {
        // Validate student ID
        if (!window.currentStudentId) {
            console.error('Cannot save results: Student ID is missing');
            return;
        }

        console.log(`Saving results for student ${window.currentStudentId}...`);
        console.log(`Score: ${score}/${totalQuestions}, Percentage: ${percentage}%`);

        // Save results to database asynchronously
        const body = `action=save&student_id=${window.currentStudentId}&score=${score}&total_questions=${totalQuestions}&percentage=${percentage}&answers=${encodeURIComponent(answers)}`;
        console.log('Request body:', body);

        const response = await fetch('php/results.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Server response:', result);

        if (result.success) {
            console.log('Results saved successfully:', result.message);
            try {
                // Signal other tabs (admin) that results were updated
                localStorage.setItem('results_updated', String(Date.now()));
            } catch (e) {
                console.warn('Unable to write results_updated to localStorage', e);
            }
        } else {
            console.error('Failed to save results:', result.message);
            // Optionally show to user if it's critical
        }
    } catch (error) {
        console.error('Error saving results:', error);
    }

    // Close warning modal if it's open
    hideWarningModal();
}

function restartInterview() {
    // Clear student registration form
    document.getElementById('studentName').value = '';
    document.getElementById('studentEmail').value = '';
    document.getElementById('studentPhone').value = '';

    // Reset runtime flags and timers
    clearInterval(quizState.timerInterval);
    clearInterval(quizState.warningInterval);
    quizState.ended = false;
    quizState.saving = false;

    showWelcomeScreen();
}