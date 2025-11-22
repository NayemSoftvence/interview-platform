// Admin panel functionality

let currentSort = { field: 'completion_date', direction: 'desc' };

function showAdminMessage(message, type = 'success') {
    const el = document.getElementById('adminMessage');
    if (!el) return;
    el.textContent = message;
    el.classList.remove('success', 'error');
    el.classList.add(type === 'error' ? 'error' : 'success');
    // Auto-hide after a few seconds
    setTimeout(() => { el.classList.remove('success', 'error'); el.textContent = ''; }, 4000);
}

async function addQuestion() {
    const questionText = document.getElementById('questionText').value.trim();
    const option1 = document.getElementById('option1').value.trim();
    const option2 = document.getElementById('option2').value.trim();
    const option3 = document.getElementById('option3').value.trim();
    const option4 = document.getElementById('option4').value.trim();
    const correctAnswer = parseInt(document.getElementById('correctAnswer').value);

    if (!questionText || !option1 || !option2 || !option3 || !option4) {
        showAdminMessage('Please fill in all fields', 'error');
        return;
    }

    // If editing an existing question, delegate to update flow
    const editingId = document.getElementById('editingQuestionId').value;
    if (editingId) {
        return updateQuestion(parseInt(editingId, 10));
    }

    try {
        const response = await fetch('php/questions.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            credentials: 'same-origin',
            body: `action=add&question=${encodeURIComponent(questionText)}&option1=${encodeURIComponent(option1)}&option2=${encodeURIComponent(option2)}&option3=${encodeURIComponent(option3)}&option4=${encodeURIComponent(option4)}&correct_answer=${correctAnswer}`
        });

        const result = await response.json();

        if (result.success) {
            showAdminMessage('Question added successfully!', 'success');
            // Clear form
            document.getElementById('questionText').value = '';
            document.getElementById('option1').value = '';
            document.getElementById('option2').value = '';
            document.getElementById('option3').value = '';
            document.getElementById('option4').value = '';
            document.getElementById('correctAnswer').value = '1';

            // Refresh questions list
            await renderQuestionsList();
        } else {
            showAdminMessage('Error: ' + (result.message || 'Failed to add question'), 'error');
        }
    } catch (error) {
        showAdminMessage('Error adding question: ' + error.message, 'error');
    }
}

async function updateQuestion(id) {
    const questionText = document.getElementById('questionText').value.trim();
    const option1 = document.getElementById('option1').value.trim();
    const option2 = document.getElementById('option2').value.trim();
    const option3 = document.getElementById('option3').value.trim();
    const option4 = document.getElementById('option4').value.trim();
    const correctAnswer = parseInt(document.getElementById('correctAnswer').value);

    if (!questionText || !option1 || !option2 || !option3 || !option4) {
        showAdminMessage('Please fill in all fields', 'error');
        return;
    }

    try {
        const response = await fetch('php/questions.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            credentials: 'same-origin',
            body: `action=update&id=${id}&question=${encodeURIComponent(questionText)}&option1=${encodeURIComponent(option1)}&option2=${encodeURIComponent(option2)}&option3=${encodeURIComponent(option3)}&option4=${encodeURIComponent(option4)}&correct_answer=${correctAnswer}`
        });

        const result = await response.json();
        if (result.success) {
            showAdminMessage('Question updated', 'success');
            // Clear edit state and form
            cancelEdit();
            await renderQuestionsList();
        } else {
            showAdminMessage('Error updating question: ' + (result.message || ''), 'error');
        }
    } catch (error) {
        showAdminMessage('Error updating question: ' + error.message, 'error');
    }
}

function cancelEdit() {
    document.getElementById('editingQuestionId').value = '';
    document.getElementById('questionText').value = '';
    document.getElementById('option1').value = '';
    document.getElementById('option2').value = '';
    document.getElementById('option3').value = '';
    document.getElementById('option4').value = '';
    document.getElementById('correctAnswer').value = '1';
    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) cancelBtn.style.display = 'none';
    const addBtn = document.getElementById('addQuestionBtn');
    if (addBtn) addBtn.textContent = 'Add Question';
}

async function clearQuestions() {
    if (confirm('Are you sure you want to clear all questions?')) {
        try {
            const response = await fetch('php/questions.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                credentials: 'same-origin',
                body: 'action=clear_all'
            });

            const result = await response.json();

            if (result.success) {
                await renderQuestionsList();
                showAdminMessage('All questions cleared!', 'success');
            } else {
                showAdminMessage('Error: ' + (result.message || 'Failed to clear questions'), 'error');
            }
        } catch (error) {
            showAdminMessage('Error clearing questions: ' + error.message, 'error');
        }
    }
}

async function clearResults() {
    if (confirm('Are you sure you want to clear all student results? This action cannot be undone.')) {
        try {
            const response = await fetch('php/results.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                credentials: 'same-origin',
                body: 'action=clear_all'
            });

            const result = await response.json();

            if (result.success) {
                await renderResultsTable();
                showAdminMessage('All results cleared!', 'success');
            } else {
                showAdminMessage('Error: ' + (result.message || 'Failed to clear results'), 'error');
            }
        } catch (error) {
            showAdminMessage('Error clearing results: ' + error.message, 'error');
        }
    }
}

async function deleteQuestion(id) {
    if (confirm('Are you sure you want to delete this question?')) {
        try {
            const response = await fetch('php/questions.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                credentials: 'same-origin',
                body: `action=delete&id=${id}`
            });

            const result = await response.json();

            if (result.success) {
                await renderQuestionsList();
                showAdminMessage('Question deleted', 'success');
            } else {
                showAdminMessage('Error: ' + (result.message || 'Failed to delete question'), 'error');
            }
        } catch (error) {
            showAdminMessage('Error deleting question: ' + error.message, 'error');
        }
    }
}

async function loadQuestionsFromDB() {
    try {
        const response = await fetch('php/questions.php', { credentials: 'same-origin' });
        return await response.json();
    } catch (error) {
        console.error('Error loading questions:', error);
        return [];
    }
}

async function renderQuestionsList() {
    const questionsList = document.getElementById('questionsList');

    try {
        const questions = await loadQuestionsFromDB();
        // keep a local copy accessible for edit actions
        window.adminQuestions = questions;

        questionsList.innerHTML = '';

        if (questions.length === 0) {
            questionsList.innerHTML = '<p>No questions added yet.</p>';
            return;
        }

        questions.forEach((question, index) => {
            const questionItem = document.createElement('div');
            questionItem.className = 'question-item';

            questionItem.innerHTML = `
                <h4>${index + 1}. ${question.question}</h4>
                <ol type="A">
                    ${question.options.map((option, i) =>
                `<li class="${i === question.correctAnswer ? 'correct-option' : ''}">${option}</li>`
            ).join('')}
                </ol>
                <div class="question-actions">
                    <button class="btn" onclick="editQuestion(${question.id})">Edit</button>
                    <button class="btn" onclick="deleteQuestion(${question.id})">Delete</button>
                </div>
            `;

            questionsList.appendChild(questionItem);
        });
    } catch (error) {
        questionsList.innerHTML = '<p>Error loading questions.</p>';
        console.error('Error rendering questions:', error);
    }
}

function sortResults(field) {
    // Toggle direction if same field
    if (currentSort.field === field) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.field = field;
        currentSort.direction = 'asc';
    }

    renderResultsTable();
}

async function renderResultsTable() {
    const resultsTableContainer = document.getElementById('resultsTableContainer');

    try {
        const response = await fetch('php/results.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            credentials: 'same-origin',
            body: `action=get_all&sort_field=${currentSort.field}&sort_direction=${currentSort.direction}`
        });

        const results = await response.json();

        if (results.length === 0) {
            resultsTableContainer.innerHTML = '<p>No student results yet.</p>';
            return;
        }

        const sortIndicator = (field) => {
            if (currentSort.field === field) {
                return currentSort.direction === 'asc' ? ' ↑' : ' ↓';
            }
            return '';
        };

        let tableHTML = `
            <div class="results-header">
                <h4>Student Results (${results.length} total)</h4>
                <button class="btn btn-danger" onclick="clearResults()">Clear All Results</button>
            </div>
            <table class="results-table">
                <thead>
                    <tr>
                        <th onclick="sortResults('name')" style="cursor:pointer;">Name${sortIndicator('name')}</th>
                        <th onclick="sortResults('email')" style="cursor:pointer;">Email${sortIndicator('email')}</th>
                        <th onclick="sortResults('phone')" style="cursor:pointer;">Phone${sortIndicator('phone')}</th>
                        <th onclick="sortResults('score')" style="cursor:pointer;">Score${sortIndicator('score')}</th>
                        <th onclick="sortResults('percentage')" style="cursor:pointer;">Percentage${sortIndicator('percentage')}</th>
                        <th onclick="sortResults('completion_date')" style="cursor:pointer;">Date${sortIndicator('completion_date')}</th>
                    </tr>
                </thead>
                <tbody>
        `;

        results.forEach(result => {
            const scoreColor = result.percentage >= 80 ? 'green' : result.percentage >= 60 ? 'orange' : 'red';

            tableHTML += `
                <tr>
                    <td>${result.name}</td>
                    <td>${result.email}</td>
                    <td>${result.phone}</td>
                    <td>${result.score}/${result.total_questions}</td>
                    <td style="color:${scoreColor}; font-weight:bold;">${result.percentage}%</td>
                    <td>${new Date(result.completion_date).toLocaleDateString()} ${new Date(result.completion_date).toLocaleTimeString()}</td>
                </tr>
            `;
        });

        tableHTML += `
                </tbody>
            </table>
        `;

        resultsTableContainer.innerHTML = tableHTML;
    } catch (error) {
        resultsTableContainer.innerHTML = '<p>Error loading results.</p>';
        console.error('Error rendering results:', error);
    }
}

function editQuestion(id) {
    if (!window.adminQuestions) return;
    const q = window.adminQuestions.find(x => parseInt(x.id, 10) === parseInt(id, 10));
    if (!q) return showAdminMessage('Question not found', 'error');

    document.getElementById('editingQuestionId').value = q.id;
    document.getElementById('questionText').value = q.question || '';
    document.getElementById('option1').value = q.options[0] || '';
    document.getElementById('option2').value = q.options[1] || '';
    document.getElementById('option3').value = q.options[2] || '';
    document.getElementById('option4').value = q.options[3] || '';
    // correctAnswer stored as zero-based in API; UI expects 1-4
    document.getElementById('correctAnswer').value = (q.correctAnswer !== undefined) ? (q.correctAnswer + 1) : 1;

    // toggle UI
    const addBtn = document.getElementById('addQuestionBtn');
    if (addBtn) addBtn.textContent = 'Update Question';
    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) cancelBtn.style.display = 'inline-block';
}