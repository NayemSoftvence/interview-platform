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

        // Set time limit (read from admin input if available)
        const timeEl = document.getElementById('interviewTime');
        const interviewTime = timeEl ? (parseInt(timeEl.value, 10) || 30) : 30;
        quizState.timeLeft = interviewTime * 60; // Convert to seconds

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

    // Clear and populate options
    const optionsContainer = document.getElementById('optionsContainer');
    optionsContainer.innerHTML = '';

    question.options.forEach((option, i) => {
        const optionElement = document.createElement('div');
        optionElement.className = 'option';
        if (quizState.userAnswers[index] === i) {
            optionElement.classList.add('selected');
        }
        optionElement.textContent = option;
        optionElement.addEventListener('click', () => selectOption(i));
        optionsContainer.appendChild(optionElement);
    });

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
    const percentage = ((score / totalQuestions) * 100).toFixed(2);
    const answers = JSON.stringify(quizState.userAnswers);

    try {
        // Save results to database
        const response = await fetch('php/results.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `action=save&student_id=${window.currentStudentId}&score=${score}&total_questions=${totalQuestions}&percentage=${percentage}&answers=${encodeURIComponent(answers)}`
        });

        const result = await response.json();

        if (!result.success) {
            console.error('Failed to save results:', result.message);
        }
    } catch (error) {
        console.error('Error saving results:', error);
    }

    // Display results
    document.getElementById('finalScore').textContent = `${score}/${totalQuestions}`;

    // Set result message based on performance
    let message = "You need more practice. Review Flutter concepts and try again.";
    if (percentage >= 80) {
        message = "Excellent! You have strong Flutter knowledge.";
    } else if (percentage >= 60) {
        message = "Good job! You have a solid understanding of Flutter.";
    } else if (percentage >= 40) {
        message = "Not bad! Keep studying Flutter to improve.";
    }

    document.getElementById('resultMessage').textContent = message;
    showScreen('resultsScreen');
}

function restartInterview() {
    // Clear student registration form
    document.getElementById('studentName').value = '';
    document.getElementById('studentEmail').value = '';
    document.getElementById('studentPhone').value = '';

    showWelcomeScreen();
}