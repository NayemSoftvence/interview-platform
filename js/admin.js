// Admin panel functionality

let currentSort = { field: 'completion_date', direction: 'desc' };

// ===== THEME MANAGEMENT =====

function initThemeSelector() {
    const themeSelector = document.getElementById('themeSelector');
    if (!themeSelector) return;

    fetch('php/settings.php?action=get_welcome_content', { credentials: 'same-origin' })
        .then(res => res.json())
        .then(result => {
            const dbTheme = result.admin_theme || 'style-modern';
            const localTheme = localStorage.getItem('adminTheme') || dbTheme;
            const currentTheme = localTheme || 'style-modern';
            themeSelector.value = currentTheme;
            applyTheme(currentTheme);
        })
        .catch(() => {
            const savedTheme = localStorage.getItem('adminTheme') || 'style-modern';
            themeSelector.value = savedTheme;
            applyTheme(savedTheme);
        });

    themeSelector.addEventListener('change', function (e) {
        const selectedTheme = e.target.value;
        localStorage.setItem('adminTheme', selectedTheme);
        applyTheme(selectedTheme);

        fetch('php/settings.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            credentials: 'same-origin',
            body: `action=save_admin_theme&theme=${encodeURIComponent(selectedTheme)}`
        })
            .then(res => res.json())
            .then(result => {
                if (result.success) {
                    localStorage.setItem('adminThemeUpdated', String(Date.now()));
                    showAdminMessage('Theme saved and will apply to all devices', 'success');
                }
            })
            .catch(err => console.error('Error saving theme:', err));
    });
}

function applyTheme(themeName) {
    const existingThemeLinks = document.querySelectorAll('link[data-theme]');
    existingThemeLinks.forEach(link => link.remove());

    if (themeName !== 'style-modern') {
        const themeLink = document.createElement('link');
        themeLink.rel = 'stylesheet';
        themeLink.href = `css/${themeName}.css?v=2.2`;
        themeLink.dataset.theme = 'true';
        document.head.appendChild(themeLink);
    }

    localStorage.setItem('appTheme', themeName);
    localStorage.setItem('adminTheme', themeName);
}

// ===== ADMIN DASHBOARD NAVIGATION =====

function switchAdminScreen(screenId) {
    document.querySelectorAll('.admin-screen').forEach(screen => {
        screen.classList.remove('active');
    });

    const selectedScreen = document.getElementById(screenId);
    if (selectedScreen) {
        selectedScreen.classList.add('active');
        selectedScreen.scrollTop = 0;
    }

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-screen') === screenId) {
            item.classList.add('active');
        }
    });

    if (screenId === 'dashboardHome') {
        updateDashboardStats();
    } else if (screenId === 'resultsScreen') {
        renderResultsTable();
        if (window.resultsRefreshInterval) clearInterval(window.resultsRefreshInterval);
        window.resultsRefreshInterval = setInterval(renderResultsTable, 3000);
    } else if (screenId === 'questionsScreen') {
        initQuestionTabs();
        loadSetSelectorsForQuestions();
        renderQuestionsList();
    } else if (screenId === 'settingsScreen') {
        loadSettings();
    } else if (screenId === 'questionSetsScreen') {
        renderQuestionSetsList();
    }
}

async function updateDashboardStats() {
    // Active set name
    try {
        const resp = await fetch('php/question_sets.php', { credentials: 'same-origin' });
        const data = await resp.json();
        if (data.success) {
            const active = data.sets.find(s => s.is_active);
            const activeSetEl = document.getElementById('activeSetDisplay');
            if (activeSetEl) activeSetEl.textContent = active ? active.name : '--';

            // Total questions in active set
            const totalQEl = document.getElementById('totalQuestionsCount');
            if (totalQEl && active) totalQEl.textContent = active.question_count;
        }
    } catch (e) {
        console.error('Error loading sets for dashboard:', e);
    }

    fetch('php/settings.php?action=get_interview_time', { credentials: 'same-origin' })
        .then(res => res.json())
        .then(result => {
            if (result.success) {
                document.getElementById('currentDurationDisplay').textContent = result.interview_time;
                const examStatusEl = document.getElementById('examStatusDisplay');
                if (examStatusEl) {
                    examStatusEl.textContent = result.exam_status ? 'Running' : 'Not Running';
                    examStatusEl.className = result.exam_status ? 'stat-value status-running' : 'stat-value status-not-running';
                }
            }
        })
        .catch(err => console.error('Error fetching settings:', err));

    fetch('php/results.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        credentials: 'same-origin',
        body: 'action=get_all'
    })
        .then(res => res.json())
        .then(results => {
            document.getElementById('totalResultsCount').textContent = results.length || 0;
        })
        .catch(err => console.error('Error fetching results count:', err));
}

// Setup navigation event listeners
document.addEventListener('DOMContentLoaded', function () {
    initThemeSelector();

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function (e) {
            e.preventDefault();
            const screenId = this.getAttribute('data-screen');
            if (screenId) switchAdminScreen(screenId);
        });
    });

    initQuestionTabs();

    const clearSettingsBtn = document.getElementById('clearQuestionsBtnSettings');
    if (clearSettingsBtn) clearSettingsBtn.addEventListener('click', function (e) { e.preventDefault(); clearQuestions(); });

    const examStatusToggle = document.getElementById('examStatusToggle');
    if (examStatusToggle) {
        examStatusToggle.addEventListener('change', function () {
            saveExamStatus(this.checked);
        });
    }

    const saveWelcomeContentBtn = document.getElementById('saveWelcomeContentBtn');
    if (saveWelcomeContentBtn) saveWelcomeContentBtn.addEventListener('click', saveWelcomeContent);

    const createSetBtn = document.getElementById('createSetBtn');
    if (createSetBtn) createSetBtn.addEventListener('click', createQuestionSet);

    const questionSetFilter = document.getElementById('questionSetFilter');
    if (questionSetFilter) {
        questionSetFilter.addEventListener('change', function () {
            renderQuestionsList();
        });
    }

    const selectAllCheck = document.getElementById('selectAllQuestions');
    if (selectAllCheck) {
        selectAllCheck.addEventListener('change', function () {
            const checks = document.querySelectorAll('.question-checkbox');
            checks.forEach(c => c.checked = this.checked);
            updateBulkActionsUI();
        });
    }

    const bulkDelBtn = document.getElementById('bulkDeleteBtn');
    if (bulkDelBtn) {
        bulkDelBtn.addEventListener('click', bulkDeleteQuestions);
    }

    window.addEventListener('storage', function (e) {
        if (!e.key) return;
        if (e.key === 'results_updated') {
            updateDashboardStats();
            const resultsScreen = document.getElementById('resultsScreen');
            if (resultsScreen && resultsScreen.classList.contains('active')) {
                renderResultsTable();
            }
        }
        if (e.key === 'adminThemeUpdated') {
            fetch('php/settings.php?action=get_welcome_content', { credentials: 'same-origin' })
                .then(res => res.json())
                .then(result => {
                    const dbTheme = result.admin_theme || 'style-modern';
                    const themeSelector = document.getElementById('themeSelector');
                    if (themeSelector) themeSelector.value = dbTheme;
                    applyTheme(dbTheme);
                })
                .catch(err => console.error('Error syncing theme:', err));
        }
    });
});

function initQuestionTabs() {
    const section = document.querySelector('.questions-section');
    if (!section) return;
    if (section.__tabsInitialized) return;
    section.__tabsInitialized = true;

    section.addEventListener('click', function (e) {
        const btn = e.target.closest('.tab-btn');
        if (!btn || !section.contains(btn)) return;
        e.preventDefault();

        const tabId = btn.getAttribute('data-tab');
        section.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        section.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const tabContent = section.querySelector('#' + tabId);
        if (tabContent) tabContent.classList.add('active');
    });

    if (!section.querySelector('.tab-btn.active')) {
        const defaultTab = section.querySelector('.tab-btn[data-tab="addQuestion"]');
        if (defaultTab) defaultTab.classList.add('active');
    }
    if (!section.querySelector('.tab-content.active')) {
        const defaultContent = section.querySelector('#addQuestion');
        if (defaultContent) defaultContent.classList.add('active');
    }
}

function showAdminMessage(message, type = 'success', elementId = null) {
    const el = elementId ? document.getElementById(elementId) : document.getElementById('adminMessage');
    if (!el) return;
    el.textContent = message;
    el.classList.remove('success', 'error');
    el.classList.add(type === 'error' ? 'error' : 'success');
    setTimeout(() => { el.textContent = ''; el.classList.remove('success', 'error'); }, 5000);
}

// ===== QUESTION SETS =====

async function loadQuestionSets() {
    try {
        const resp = await fetch('php/question_sets.php', { credentials: 'same-origin' });
        const data = await resp.json();
        return data.success ? { sets: data.sets, activeSetId: data.active_set_id } : { sets: [], activeSetId: 1 };
    } catch (e) {
        return { sets: [], activeSetId: 1 };
    }
}

async function loadSetSelectorsForQuestions() {
    const { sets, activeSetId } = await loadQuestionSets();

    const selectors = ['questionSetSelect', 'bulkSetSelect', 'questionSetFilter'];
    selectors.forEach(selId => {
        const sel = document.getElementById(selId);
        if (!sel) return;
        const isFilter = selId === 'questionSetFilter';
        sel.innerHTML = '';
        if (isFilter) {
            const allOpt = document.createElement('option');
            allOpt.value = '0';
            allOpt.textContent = 'All Sets';
            sel.appendChild(allOpt);
        }
        sets.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.name + (s.is_active ? ' ✓ (active)' : '');
            if (s.id == activeSetId && !isFilter) opt.selected = true;
            sel.appendChild(opt);
        });
    });
}

async function renderQuestionSetsList() {
    const container = document.getElementById('questionSetsList');
    if (!container) return;
    container.innerHTML = '<p>Loading...</p>';

    const { sets, activeSetId } = await loadQuestionSets();

    if (sets.length === 0) {
        container.innerHTML = '<p>No question sets found.</p>';
        return;
    }

    container.innerHTML = '';
    sets.forEach(s => {
        const div = document.createElement('div');
        div.className = 'question-item';
        div.style.cssText = 'display:flex; align-items:center; gap:12px; flex-wrap:wrap;';

        const info = document.createElement('div');
        info.style.flex = '1';
        info.innerHTML = `
            <strong>${escapeHtml(s.name)}</strong>
            ${s.is_active ? ' <span style="background:#22c55e;color:#fff;padding:2px 8px;border-radius:12px;font-size:0.75rem;">Active</span>' : ''}
            <br>
            <small style="color:#666;">${escapeHtml(s.description || 'No description')} &mdash; ${s.question_count} question${s.question_count !== 1 ? 's' : ''}</small>
        `;

        const actions = document.createElement('div');
        actions.className = 'question-actions';
        actions.style.display = 'flex';
        actions.style.gap = '8px';
        actions.style.flexWrap = 'wrap';

        if (!s.is_active) {
            const activateBtn = createActionBtn('✓ Activate', 'btn', () => activateQuestionSet(s.id));
            actions.appendChild(activateBtn);
        }

        const renameBtn = createActionBtn('Rename', 'btn', () => promptRenameSet(s));
        actions.appendChild(renameBtn);

        if (sets.length > 1) {
            const deleteBtn = createActionBtn('Delete', 'btn btn-danger', () => deleteQuestionSet(s.id, s.name));
            actions.appendChild(deleteBtn);
        }

        div.appendChild(info);
        div.appendChild(actions);
        container.appendChild(div);
    });
}

function createActionBtn(text, className, onClick) {
    const btn = document.createElement('button');
    btn.className = className;
    btn.textContent = text;
    btn.style.padding = '4px 12px';
    btn.style.fontSize = '0.85rem';
    btn.addEventListener('click', onClick);
    return btn;
}

async function createQuestionSet() {
    const name = document.getElementById('newSetName').value.trim();
    const description = document.getElementById('newSetDescription').value.trim();
    if (!name) {
        showAdminMessage('Please enter a set name', 'error');
        return;
    }
    try {
        const resp = await fetch('php/question_sets.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ action: 'create', name, description })
        });
        const result = await resp.json();
        if (result.success) {
            showAdminMessage('Question set created!', 'success');
            document.getElementById('newSetName').value = '';
            document.getElementById('newSetDescription').value = '';
            await renderQuestionSetsList();
            await loadSetSelectorsForQuestions();
        } else {
            showAdminMessage('Error: ' + (result.message || 'Failed to create set'), 'error');
        }
    } catch (e) {
        showAdminMessage('Network error: ' + e.message, 'error');
    }
}

async function activateQuestionSet(id) {
    try {
        const resp = await fetch('php/question_sets.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ action: 'set_active', id })
        });
        const result = await resp.json();
        if (result.success) {
            showAdminMessage('Active question set updated!', 'success');
            await renderQuestionSetsList();
            await loadSetSelectorsForQuestions();
            updateDashboardStats();
        } else {
            showAdminMessage('Error: ' + (result.message || ''), 'error');
        }
    } catch (e) {
        showAdminMessage('Network error: ' + e.message, 'error');
    }
}

async function promptRenameSet(set) {
    const newName = prompt('Enter new name for set:', set.name);
    if (!newName || !newName.trim() || newName.trim() === set.name) return;
    const newDesc = prompt('Enter description (optional):', set.description || '');
    try {
        const resp = await fetch('php/question_sets.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ action: 'rename', id: set.id, name: newName.trim(), description: (newDesc || '').trim() })
        });
        const result = await resp.json();
        if (result.success) {
            showAdminMessage('Set renamed!', 'success');
            await renderQuestionSetsList();
            await loadSetSelectorsForQuestions();
        } else {
            showAdminMessage('Error: ' + (result.message || ''), 'error');
        }
    } catch (e) {
        showAdminMessage('Network error: ' + e.message, 'error');
    }
}

// ===== CUSTOM CONFIRM DIALOG =====
// Avoids browser native confirm() which can be blocked or flash-close in some environments

function showCustomConfirm(message, onConfirm, onCancel) {
    // Remove any existing confirm overlay
    const existing = document.getElementById('customConfirmOverlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'customConfirmOverlay';
    overlay.style.cssText = [
        'position:fixed', 'top:0', 'left:0', 'width:100%', 'height:100%',
        'background:rgba(0,0,0,0.55)', 'z-index:99999',
        'display:flex', 'align-items:center', 'justify-content:center',
        'animation:fadeIn 0.15s ease'
    ].join(';');

    const box = document.createElement('div');
    box.style.cssText = [
        'background:#fff', 'border-radius:12px', 'padding:28px 32px',
        'max-width:420px', 'width:90%', 'box-shadow:0 20px 60px rgba(0,0,0,0.3)',
        'text-align:center'
    ].join(';');

    box.innerHTML = `
        <div style="font-size:2rem;margin-bottom:12px;">⚠️</div>
        <p style="font-size:1rem;color:#1e293b;line-height:1.5;margin-bottom:24px;">${escapeHtml(message)}</p>
        <div style="display:flex;gap:12px;justify-content:center;">
            <button id="customConfirmCancel" style="flex:1;padding:10px 20px;border-radius:8px;border:2px solid #e2e8f0;background:#f8fafc;color:#1e293b;font-size:0.95rem;cursor:pointer;">Cancel</button>
            <button id="customConfirmOk" style="flex:1;padding:10px 20px;border-radius:8px;border:none;background:#ef4444;color:#fff;font-size:0.95rem;font-weight:600;cursor:pointer;">Yes, Delete</button>
        </div>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const cleanup = () => { if (overlay.parentNode) overlay.remove(); };

    overlay.querySelector('#customConfirmOk').addEventListener('click', () => {
        cleanup();
        if (onConfirm) onConfirm();
    });
    overlay.querySelector('#customConfirmCancel').addEventListener('click', () => {
        cleanup();
        if (onCancel) onCancel();
    });
    // Close on backdrop click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) { cleanup(); if (onCancel) onCancel(); }
    });
}

async function deleteQuestionSet(id, name) {
    showCustomConfirm(
        `Are you sure you want to delete the set "${name}" and ALL its questions? This cannot be undone.`,
        async () => {
            try {
                const resp = await fetch('php/question_sets.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ action: 'delete', id })
                });
                const result = await resp.json();
                if (result.success) {
                    showAdminMessage('Question set deleted!', 'success');
                    await renderQuestionSetsList();
                    await loadSetSelectorsForQuestions();
                    updateDashboardStats();
                } else {
                    showAdminMessage('Error: ' + (result.message || 'Failed to delete'), 'error');
                }
            } catch (e) {
                showAdminMessage('Network error: ' + e.message, 'error');
            }
        }
    );
}

// ===== QUESTIONS =====

async function addQuestion() {
    const questionText = document.getElementById('questionText').value.trim();
    const option1 = document.getElementById('option1').value.trim();
    const option2 = document.getElementById('option2').value.trim();
    const option3 = document.getElementById('option3').value.trim();
    const option4 = document.getElementById('option4').value.trim();
    const correctAnswer = parseInt(document.getElementById('correctAnswer').value);
    const set_id = parseInt(document.getElementById('questionSetSelect')?.value || 0);

    if (!questionText || !option1 || !option2 || !option3 || !option4) {
        showAdminMessage('Please fill in all fields', 'error');
        return;
    }

    const editingId = document.getElementById('editingQuestionId').value;
    if (editingId) {
        return updateQuestion(parseInt(editingId, 10));
    }

    try {
        const response = await fetch('php/questions.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            credentials: 'same-origin',
            body: `action=add&question=${encodeURIComponent(questionText)}&option1=${encodeURIComponent(option1)}&option2=${encodeURIComponent(option2)}&option3=${encodeURIComponent(option3)}&option4=${encodeURIComponent(option4)}&correct_answer=${correctAnswer}&set_id=${set_id}`
        });

        const result = await response.json();

        if (result.success) {
            showAdminMessage('Question added successfully!', 'success');
            document.getElementById('questionText').value = '';
            document.getElementById('option1').value = '';
            document.getElementById('option2').value = '';
            document.getElementById('option3').value = '';
            document.getElementById('option4').value = '';
            document.getElementById('correctAnswer').value = '1';
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
    const setId = parseInt(document.getElementById('questionSetFilter')?.value || 0);
    const confirmMsg = setId > 0
        ? 'Are you sure you want to clear all questions in the selected set?'
        : 'Are you sure you want to clear ALL questions?';
    if (!confirm(confirmMsg)) return;

    try {
        const response = await fetch('php/questions.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            credentials: 'same-origin',
            body: `action=clear_all&set_id=${setId}`
        });

        const result = await response.json();

        if (result.success) {
            try {
                switchAdminScreen('questionsScreen');
                initQuestionTabs();
                const section = document.querySelector('.questions-section');
                if (section) {
                    const listBtn = section.querySelector('.tab-btn[data-tab="listQuestions"]');
                    if (listBtn) listBtn.click();
                }
            } catch (e) {
                console.warn('Error switching to questions screen:', e);
            }
            await renderQuestionsList();
            showAdminMessage('Questions cleared!', 'success');
        } else {
            showAdminMessage('Error: ' + (result.message || 'Failed to clear questions'), 'error');
        }
    } catch (error) {
        showAdminMessage('Error clearing questions: ' + error.message, 'error');
    }
}

async function clearResults() {
    showCustomConfirm(
        'Are you sure you want to clear all Candidate Results? This action cannot be undone.',
        async () => {
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
                    updateDashboardStats();
                } else {
                    showAdminMessage('Error: ' + (result.message || 'Failed to clear results'), 'error');
                }
            } catch (error) {
                showAdminMessage('Error clearing results: ' + error.message, 'error');
            }
        }
    );
}

async function deleteResult(studentId, name) {
    showCustomConfirm(
        `Are you sure you want to delete results for "${name}"? This action cannot be undone.`,
        async () => {
            try {
                const response = await fetch('php/results.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    credentials: 'same-origin',
                    body: `action=delete_individual&student_id=${studentId}`
                });

                const result = await response.json();

                if (result.success) {
                    await renderResultsTable();
                    showAdminMessage('Result deleted successfully!', 'success');
                    updateDashboardStats();
                } else {
                    showAdminMessage('Error: ' + (result.message || 'Failed to delete result'), 'error');
                }
            } catch (error) {
                showAdminMessage('Error deleting result: ' + error.message, 'error');
            }
        }
    );
}

async function deleteQuestion(id) {
    showCustomConfirm(
        'Are you sure you want to delete this question? This cannot be undone.',
        async () => {
            try {
                const resp = await fetch('php/questions.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ action: 'delete', id })
                });
                const result = await resp.json();
                if (result.success) {
                    showAdminMessage('Question deleted', 'success');
                    await renderQuestionsList();
                    updateDashboardStats();
                } else {
                    showAdminMessage('Error: ' + (result.message || 'Failed to delete'), 'error');
                }
            } catch (e) {
                showAdminMessage('Network error: ' + e.message, 'error');
            }
        }
    );
}

async function bulkDeleteQuestions() {
    const checks = document.querySelectorAll('.question-checkbox:checked');
    if (checks.length === 0) return;

    const ids = Array.from(checks).map(c => parseInt(c.dataset.id));

    showCustomConfirm(
        `Are you sure you want to delete ${ids.length} selected questions? This cannot be undone.`,
        async () => {
            try {
                const resp = await fetch('php/questions.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ action: 'bulk_delete', ids })
                });
                const result = await resp.json();
                if (result.success) {
                    showAdminMessage(`${result.count || ids.length} questions deleted!`, 'success');
                    await renderQuestionsList();
                    updateDashboardStats();
                } else {
                    showAdminMessage('Error: ' + (result.message || 'Failed to delete'), 'error');
                }
            } catch (e) {
                showAdminMessage('Network error: ' + e.message, 'error');
            }
        }
    );
}

function updateBulkActionsUI() {
    const checks = document.querySelectorAll('.question-checkbox:checked');
    const container = document.getElementById('bulkActionsContainer');
    const countEl = document.getElementById('selectedCount');
    const selectAllCheck = document.getElementById('selectAllQuestions');
    const totalChecks = document.querySelectorAll('.question-checkbox').length;

    if (checks.length > 0) {
        if (container) container.style.display = 'block';
        if (countEl) countEl.textContent = checks.length;
        if (selectAllCheck) selectAllCheck.checked = (checks.length === totalChecks);
    } else {
        if (container) container.style.display = 'none';
        if (selectAllCheck) selectAllCheck.checked = false;
    }
}

async function loadQuestionsFromDB() {
    try {
        const setId = parseInt(document.getElementById('questionSetFilter')?.value || 0);
        const url = 'php/questions.php?_=' + Date.now();
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            credentials: 'same-origin',
            body: `action=get_all_admin&set_id=${setId}`
        });
        return await response.json();
    } catch (error) {
        console.error('Error loading questions:', error);
        return [];
    }
}

async function renderQuestionsList() {
    const questionsList = document.getElementById('questionsList');
    const bulkActions = document.getElementById('bulkActionsContainer');
    const selectAllContainer = document.getElementById('selectAllContainer');
    const selectAllCheck = document.getElementById('selectAllQuestions');

    if (bulkActions) bulkActions.style.display = 'none';
    if (selectAllCheck) selectAllCheck.checked = false;

    try {
        const questions = await loadQuestionsFromDB();
        window.adminQuestions = questions;

        questionsList.innerHTML = '';

        if (questions.length === 0) {
            questionsList.innerHTML = '<p>No questions in this set yet.</p>';
            if (selectAllContainer) selectAllContainer.style.display = 'none';
            return;
        }

        if (selectAllContainer) selectAllContainer.style.display = 'flex';

        questions.forEach((question, index) => {
            const questionItem = document.createElement('div');
            questionItem.className = 'question-item';
            questionItem.style.position = 'relative';

            questionItem.innerHTML = `
                <div style="position:absolute; top:15px; left:15px; z-index:2;">
                    <input type="checkbox" class="question-checkbox" data-id="${question.id}" style="width:20px; height:20px; cursor:pointer;">
                </div>
                <div style="padding-left:35px;">
                    <h4 style="margin-top:0;">${index + 1}. ${escapeHtml(question.question)}</h4>
                    <ol type="A">
                        ${question.options.map((option, i) =>
                `<li class="${i === question.correctAnswer ? 'correct-option' : ''}">${escapeHtml(option)}</li>`
            ).join('')}
                    </ol>
                    <div class="question-actions">
                        <button class="btn" onclick="editQuestion(${question.id})">Edit</button>
                        <button class="btn btn-danger-outline" onclick="deleteQuestion(${question.id})">Delete</button>
                    </div>
                </div>
            `;

            // Listen for checkbox changes
            const check = questionItem.querySelector('.question-checkbox');
            check.addEventListener('change', updateBulkActionsUI);

            // Clicking the card itself (optional improvement: click to toggle)
            // questionItem.addEventListener('click', (e) => {
            //     if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') {
            //         check.checked = !check.checked;
            //         updateBulkActionsUI();
            //     }
            // });

            questionsList.appendChild(questionItem);
        });
    } catch (error) {
        questionsList.innerHTML = '<p>Error loading questions.</p>';
        if (selectAllContainer) selectAllContainer.style.display = 'none';
        console.error('Error rendering questions:', error);
    }
}

// ===== RESULTS =====

function sortResults(field) {
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

        if (!response.ok) {
            if (response.status === 401) {
                if (window.resultsRefreshInterval) {
                    clearInterval(window.resultsRefreshInterval);
                    window.resultsRefreshInterval = null;
                }
                showAdminMessage('Admin session required. Please log in.', 'error');
                if (typeof showScreen === 'function') showScreen('adminLoginScreen');
            }
            throw new Error('Failed to fetch results: ' + response.status);
        }

        const results = await response.json();

        if (!Array.isArray(results) || results.length === 0) {
            resultsTableContainer.innerHTML = '<p>No Candidate Results yet.</p>';
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
                <h4>Candidate Results (${results.length} total)</h4>
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
                        <th style="text-align:right;">Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;

        results.forEach(result => {
            const scoreColor = result.percentage >= 80 ? 'green' : result.percentage >= 60 ? 'orange' : 'red';

            tableHTML += `
                <tr>
                    <td>${escapeHtml(result.name)}</td>
                    <td>${escapeHtml(result.email)}</td>
                    <td>${escapeHtml(result.phone)}</td>
                    <td>${result.score}/${result.total_questions}</td>
                    <td style="color:${scoreColor}; font-weight:bold;">${result.percentage}%</td>
                    <td>${new Date(result.completion_date).toLocaleDateString()} ${new Date(result.completion_date).toLocaleTimeString()}</td>
                    <td style="text-align:right; white-space:nowrap;">
                        <button class="btn btn-sm" style="padding:4px 10px;font-size:0.8rem;" onclick="viewResultDetail(${result.student_id}, '${escapeHtml(result.name).replace(/'/g, "\\'")}')">🔍 Details</button>
                        <button class="btn btn-sm btn-danger-outline" style="padding:4px 10px;font-size:0.8rem; margin-left:4px;" title="Delete Result" onclick="deleteResult(${result.student_id}, '${escapeHtml(result.name).replace(/'/g, "\\'")}')">🗑️</button>
                    </td>
                </tr>
            `;
        });

        tableHTML += `</tbody></table>`;
        resultsTableContainer.innerHTML = tableHTML;
    } catch (error) {
        resultsTableContainer.innerHTML = '<p>Error loading results.</p>';
        console.error('Error rendering results:', error);
    }
}

// ===== RESULT DETAIL MODAL =====

async function viewResultDetail(studentId) {
    const modal = document.getElementById('resultDetailModal');
    const content = document.getElementById('resultDetailContent');
    if (!modal || !content) return;

    // Reset scroll & show
    modal.scrollTop = 0;
    modal.style.display = 'flex';
    content.innerHTML = `
        <div style="text-align:center;padding:60px 20px;">
            <div style="font-size:2.5rem;animation:spin 1s linear infinite;display:inline-block;">⏳</div>
            <p style="margin-top:16px;color:#64748b;font-size:0.95rem;">Loading candidate details…</p>
        </div>`;

    try {
        const resp = await fetch('php/results.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            credentials: 'same-origin',
            body: `action=get_detail&student_id=${studentId}`
        });
        const data = await resp.json();

        if (!data.success) {
            content.innerHTML = `<div style="padding:32px;text-align:center;color:#ef4444;">⚠️ ${escapeHtml(data.message || 'Failed to load details')}</div>`;
            return;
        }

        const pct = parseFloat(data.percentage);
        const pctColor = pct >= 80 ? '#16a34a' : pct >= 60 ? '#d97706' : '#dc2626';
        const pctBg = pct >= 80 ? '#f0fdf4' : pct >= 60 ? '#fffbeb' : '#fef2f2';
        const grade = pct >= 80 ? 'Excellent' : pct >= 60 ? 'Good' : pct >= 40 ? 'Fair' : 'Needs Work';
        const date = new Date(data.completion_date).toLocaleString();

        // Score ring percentage for CSS
        const ring = Math.round(pct);

        let html = `
        <div class="rd-header">
            <div class="rd-header-top">
                <div class="rd-student-info">
                    <div class="rd-name">${escapeHtml(data.student.name)}</div>
                    <div class="rd-meta">
                        <span>📧 ${escapeHtml(data.student.email)}</span>
                        <span>📞 ${escapeHtml(data.student.phone)}</span>
                        <span>🗓️ ${date}</span>
                    </div>
                </div>
                <div class="rd-score-badge" style="--pct-color:${pctColor};background:${pctBg};border-color:${pctColor};">
                    <div class="rd-score-num" style="color:${pctColor};">${pct}%</div>
                    <div class="rd-score-label">${data.score}/${data.total} correct</div>
                    <div class="rd-grade" style="color:${pctColor};">${grade}</div>
                </div>
            </div>
            <div class="rd-progress-bar-wrap">
                <div class="rd-progress-fill" style="width:${ring}%;background:${pctColor};"></div>
            </div>
        </div>
        <div class="rd-body">
            <h3 class="rd-section-title">Question Breakdown <span class="rd-q-count">${data.details ? data.details.length : 0} questions</span></h3>
        `;

        if (!data.details || data.details.length === 0) {
            html += `<div class="rd-empty">No question details available. Questions may have changed since this exam was taken.</div>`;
        } else {
            const correct = data.details.filter(d => d.is_correct).length;
            const wrong = data.details.filter(d => !d.is_correct && !d.skipped).length;
            const skipped = data.details.filter(d => d.skipped).length;

            html += `
            <div class="rd-summary-chips" style="display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; gap:12px;">
                    <span class="rd-chip rd-chip-correct">✅ ${correct} Correct</span>
                    <span class="rd-chip rd-chip-wrong">❌ ${wrong} Wrong</span>
                    <span class="rd-chip rd-chip-skip">⏭️ ${skipped} Skipped</span>
                </div>
                <div class="rd-filter-group" style="display:flex; align-items:center; background:#f1f5f9; padding:4px; border-radius:12px; border:1px solid #e2e8f0;">
                    <button class="rd-filter-btn active" data-filter="all" onclick="filterResultDetails(this, 'all')">All</button>
                    <button class="rd-filter-btn" data-filter="correct" onclick="filterResultDetails(this, 'correct')">Correct</button>
                    <button class="rd-filter-btn" data-filter="wrong" onclick="filterResultDetails(this, 'wrong')">Wrong</button>
                </div>
            </div>
            <div class="rd-questions-list">`;

            data.details.forEach(d => {
                const stateClass = d.skipped ? 'rd-q-skip' : (d.is_correct ? 'rd-q-correct' : 'rd-q-wrong');
                const statusIcon = d.skipped ? '⏭️' : (d.is_correct ? '✅' : '❌');

                html += `
                <div class="rd-question-card ${stateClass}">
                    <div class="rd-q-header">
                        <span class="rd-q-num">Q${d.question_num}</span>
                        <span class="rd-q-status-icon">${statusIcon}</span>
                        <span class="rd-q-text">${escapeHtml(d.question)}</span>
                    </div>
                    <div class="rd-options">`;

                d.options.forEach((opt, i) => {
                    const isUserPick = (i === d.user_answer_index);
                    const isCorrect = (i === d.correct_answer_index);
                    let cls = 'rd-option';
                    let badge = '';
                    if (isCorrect && isUserPick) {
                        cls += ' rd-opt-correct-picked';
                        badge = '<span class="rd-opt-badge rd-opt-badge-correct">Candidate\'s Answer ✓</span>';
                    } else if (isCorrect) {
                        cls += ' rd-opt-correct';
                        badge = '<span class="rd-opt-badge rd-opt-badge-correct">Correct Answer</span>';
                    } else if (isUserPick) {
                        cls += ' rd-opt-wrong-picked';
                        badge = '<span class="rd-opt-badge rd-opt-badge-wrong">Candidate\'s Answer ✗</span>';
                    }
                    const label = String.fromCharCode(65 + i);
                    html += `<div class="${cls}"><span class="rd-opt-label">${label}</span><span class="rd-opt-text">${escapeHtml(opt)}</span>${badge}</div>`;
                });

                if (d.skipped) {
                    html += `<div class="rd-option rd-opt-skipped"><span class="rd-opt-label">—</span><span class="rd-opt-text" style="color:#94a3b8;font-style:italic;">Not answered / Skipped</span></div>`;
                }

                html += `</div></div>`;
            });

            html += `</div>`; // rd-questions-list
        }

        html += `</div>`; // rd-body
        content.innerHTML = html;

        // CRITICAL: Force modal-inner to handle vertical overflow correctly
        const modalInner = modal.querySelector('.rd-modal-inner');
        if (modalInner) {
            modalInner.scrollTop = 0;
            modalInner.style.overflowY = 'hidden'; // Header/Body are internal scrolls
        }

        // Ensure rd-body fills remaining space and scrolls
        const rdBody = content.querySelector('.rd-body');
        if (rdBody) rdBody.scrollTop = 0;

    } catch (e) {
        content.innerHTML = `<div style="padding:32px;text-align:center;color:#ef4444;">Network error: ${escapeHtml(e.message)}</div>`;
    }
}

function closeResultDetailModal() {
    const modal = document.getElementById('resultDetailModal');
    if (modal) modal.style.display = 'none';
}

function filterResultDetails(btn, type) {
    // Update button states
    const container = btn.parentElement;
    container.querySelectorAll('.rd-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const cards = document.querySelectorAll('.rd-question-card');
    let visibleCount = 0;

    cards.forEach(card => {
        let show = false;
        if (type === 'all') {
            show = true;
        } else if (type === 'correct') {
            show = card.classList.contains('rd-q-correct');
        } else if (type === 'wrong') {
            show = card.classList.contains('rd-q-wrong');
        }

        card.style.display = show ? 'block' : 'none';
        if (show) visibleCount++;
    });

    const emptyMsgId = 'rd-filter-empty-msg';
    let emptyMsg = document.getElementById(emptyMsgId);

    if (visibleCount === 0) {
        if (!emptyMsg) {
            emptyMsg = document.createElement('div');
            emptyMsg.id = emptyMsgId;
            emptyMsg.className = 'rd-empty';
            document.querySelector('.rd-questions-list').appendChild(emptyMsg);
        }
        emptyMsg.textContent = type === 'wrong' ? 'No wrong answers to display! 🎉' :
            type === 'correct' ? 'No correct answers yet. 😔' : 'No questions found.';
        emptyMsg.style.display = 'block';
    } else if (emptyMsg) {
        emptyMsg.style.display = 'none';
    }
}

// Close modal on overlay click
document.addEventListener('DOMContentLoaded', function () {
    const modal = document.getElementById('resultDetailModal');
    if (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target === modal) closeResultDetailModal();
        });
    }
});



// ===== QUESTIONS EDIT =====

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
    document.getElementById('correctAnswer').value = (q.correctAnswer !== undefined) ? (q.correctAnswer + 1) : 1;

    const addBtn = document.getElementById('addQuestionBtn');
    if (addBtn) addBtn.textContent = 'Update Question';
    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) cancelBtn.style.display = 'inline-block';

    const addQuestionTab = document.querySelector('.tab-btn[data-tab="addQuestion"]');
    if (addQuestionTab) addQuestionTab.click();

    const questionTextEl = document.getElementById('questionText');
    if (questionTextEl) {
        setTimeout(() => {
            questionTextEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            questionTextEl.focus();
        }, 100);
    }
}

async function bulkUploadQuestions() {
    const fileInput = document.getElementById('bulkUploadFile');
    if (!fileInput.files || fileInput.files.length === 0) {
        showAdminMessage('Please select a JSON file', 'error');
        return;
    }

    const file = fileInput.files[0];
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        showAdminMessage('Please upload a valid JSON file', 'error');
        return;
    }

    const set_id = parseInt(document.getElementById('bulkSetSelect')?.value || 0);

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!Array.isArray(data.questions) || data.questions.length === 0) {
                showAdminMessage('Invalid JSON format. Expected { "questions": [...] }', 'error');
                return;
            }

            for (const q of data.questions) {
                if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || q.correctAnswer === undefined) {
                    showAdminMessage('Invalid question format. Each must have: question, options (4 items), correctAnswer', 'error');
                    return;
                }
            }

            const response = await fetch('php/questions.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ action: 'bulk_add', questions: data.questions, set_id })
            });

            const result = await response.json();
            if (result.success) {
                showAdminMessage(`Successfully imported ${result.count} questions!`, 'success');
                fileInput.value = '';
                await renderQuestionsList();
            } else {
                showAdminMessage('Error: ' + (result.message || 'Failed to import questions'), 'error');
            }
        } catch (error) {
            showAdminMessage('Error parsing JSON: ' + error.message, 'error');
        }
    };
    reader.onerror = () => { showAdminMessage('Error reading file', 'error'); };
    reader.readAsText(file);
}

// ===== SETTINGS =====

function saveInterviewTime() {
    const interviewTimeInput = document.getElementById('interviewTime');
    if (!interviewTimeInput) return;

    const value = parseInt(interviewTimeInput.value, 10);
    if (isNaN(value) || value < 5 || value > 120) {
        showAdminMessage('Interview time must be between 5 and 120 minutes', 'error');
        interviewTimeInput.value = '';
        return;
    }

    fetch('php/settings.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        credentials: 'same-origin',
        body: `action=update_interview_time&time=${value}`
    })
        .then(res => res.json())
        .then(result => {
            if (result.success) {
                showAdminMessage('Interview time updated', 'success');
                if (window.opener && !window.opener.closed) {
                    window.opener.postMessage({ type: 'update-interview-time', value }, '*');
                }
            } else {
                showAdminMessage('Error: ' + (result.message || ''), 'error');
            }
        })
        .catch(err => { showAdminMessage('Network error saving interview time', 'error'); });
}

function initializeAdminPanel() {
    const interviewTimeInput = document.getElementById('interviewTime');
    if (interviewTimeInput) {
        fetch('php/settings.php?action=get_interview_time')
            .then(res => res.json())
            .then(result => {
                interviewTimeInput.value = result.success && result.interview_time ? result.interview_time : '30';
            })
            .catch(() => { interviewTimeInput.value = '30'; });
    }

    if (window.resultsRefreshInterval) clearInterval(window.resultsRefreshInterval);
    renderResultsTable();
    window.resultsRefreshInterval = setInterval(renderResultsTable, 3000);
}

async function loadSettings() {
    try {
        const response = await fetch('php/settings.php?action=get_interview_time', { credentials: 'same-origin' });
        const result = await response.json();

        if (result.success) {
            document.getElementById('interviewTime').value = result.interview_time;
            document.getElementById('examStatusToggle').checked = result.exam_status;
        } else {
            showAdminMessage('Error loading settings: ' + (result.message || ''), 'error');
        }
    } catch (error) {
        showAdminMessage('Error loading settings: ' + error.message, 'error');
    }

    await loadWelcomeContent();
}

async function saveExamStatus(status) {
    try {
        const statusValue = status ? 1 : 0;
        const response = await fetch('php/settings.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            credentials: 'same-origin',
            body: `action=update_interview_time&time=${document.getElementById('interviewTime').value}&exam_status=${statusValue}`
        });
        const result = await response.json();

        if (result.success) {
            showAdminMessage('Exam status updated: ' + (status ? 'Running' : 'Not Running'), 'success');
            updateDashboardStats();
        } else {
            showAdminMessage('Error updating exam status: ' + (result.message || ''), 'error');
        }
    } catch (error) {
        showAdminMessage('Error updating exam status: ' + error.message, 'error');
    }
}

// ===== WELCOME CONTENT MANAGEMENT =====

async function loadWelcomeContent() {
    try {
        const response = await fetch('php/settings.php?action=get_welcome_content', { credentials: 'same-origin' });
        const result = await response.json();

        if (result.success && result.welcome_content) {
            const content = result.welcome_content;
            document.getElementById('platformName').value = content.platform_name || '';
            document.getElementById('headerSubtitle').value = content.header_subtitle || '';
            document.getElementById('welcomeTitle').value = content.title || '';
            document.getElementById('welcomeDescription').value = content.description || '';
            document.getElementById('welcomeInstructions').value = content.instructions || '';
        } else {
            document.getElementById('platformName').value = 'Interview Platform';
            document.getElementById('headerSubtitle').value = 'Test your knowledge';
            document.getElementById('welcomeTitle').value = 'Welcome to the Interview';
            document.getElementById('welcomeDescription').value = 'This quiz will test your knowledge. The interview will automatically close if you switch tabs or click outside the browser window.';
            document.getElementById('welcomeInstructions').value = 'There are multiple-choice questions\nSelect one answer for each question\nYou cannot go back to previous questions\nThe interview will close if you switch tabs or click outside\nComplete the interview within the time limit';
        }
    } catch (error) {
        console.error('Error loading welcome content:', error);
    }
}

async function saveWelcomeContent() {
    const platform_name = document.getElementById('platformName').value.trim();
    const header_subtitle = document.getElementById('headerSubtitle').value.trim();
    const title = document.getElementById('welcomeTitle').value.trim();
    const description = document.getElementById('welcomeDescription').value.trim();
    const instructions = document.getElementById('welcomeInstructions').value.trim();

    try {
        const response = await fetch('php/settings.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            credentials: 'same-origin',
            body: `action=save_welcome_content&title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}&instructions=${encodeURIComponent(instructions)}&platform_name=${encodeURIComponent(platform_name)}&header_subtitle=${encodeURIComponent(header_subtitle)}`
        });

        const result = await response.json();

        if (result.success) {
            showAdminMessage('Home screen content saved successfully!', 'success', 'welcomeContentMessage');
        } else {
            showAdminMessage('Error saving content: ' + (result.message || ''), 'error', 'welcomeContentMessage');
        }
    } catch (error) {
        showAdminMessage('Network error: ' + error.message, 'error', 'welcomeContentMessage');
    }
}

// ===== UTILITY =====

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}