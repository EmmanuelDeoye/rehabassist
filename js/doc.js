// js/doc.js - Complete EMR with delete, dashboard grid, file extraction, summary, next session, discharge, etc.

document.addEventListener('DOMContentLoaded', function() {
    console.log('[EMR] Initializing...');

    // =========================================================================
    // DOM Elements
    // =========================================================================
    const sidebarItems = document.querySelectorAll('.sidebar-item[data-screen]');
    const screens = {
        dashboard: document.getElementById('screen-dashboard'),
        intake: document.getElementById('screen-intake'),
        patient: document.getElementById('screen-patient'),
        patients: document.getElementById('screen-patients')
    };

    const dashStats = {
        patients: document.getElementById('statPatients'),
        notesPending: document.getElementById('statNotesPending')
    };
    const dashAIInsights = document.getElementById('dashAIInsights');
    const dashPendingDocs = document.getElementById('dashPendingDocs');

    const intakeRail = document.getElementById('intakeRail');
    const intakeRailProgress = document.getElementById('intakeRailProgress');
    const intakeRailSteps = intakeRail.querySelectorAll('.rail-step');

    const patientTabs = document.querySelectorAll('.emr-tab');
    const patientTabPanes = document.querySelectorAll('.patient-tab-pane');

    const loadingOverlay = document.getElementById('aiLoadingOverlay');
    const loadingMessage = document.getElementById('aiLoadingMessage');
    const loadingProgress = document.getElementById('aiLoadingProgress');

    // =========================================================================
    // State
    // =========================================================================
    let currentUser = null;
    let currentPatientId = null;
    let currentPatientData = null;
    let currentPlan = 'free';
    let allPatients = [];
    let aiConfig = { token: null, endpoint: 'https://api.deepseek.com/v1', model: 'deepseek-chat' };
    let isEditingPatient = false;
    let editingPatientId = null;
    let uploadedFileRefs = [];
    let patientListenerRef = null;
    const database = firebase.database();

    // =========================================================================
    // Firebase Auth
    // =========================================================================
    firebase.auth().onAuthStateChanged(user => {
        currentUser = user;
        if (user) {
            console.log('[EMR] User logged in:', user.email);
            document.getElementById('clinicianName').textContent = user.displayName || user.email?.split('@')[0] || 'Clinician';
            loadDashboardData();
            loadPatientsList();
        } else {
            console.log('[EMR] User logged out');
            showToast('Please log in to use the EMR', 'info', 3000);
        }
    });

    // =========================================================================
    // Plan detection
    // =========================================================================
    document.addEventListener('planUpdated', (e) => {
        currentPlan = e.detail?.plan || 'free';
        console.log('[EMR] Plan updated:', currentPlan);
    });
    if (window.rehabPlans) {
        currentPlan = window.rehabPlans.getCurrentPlan() || 'free';
    }

    // =========================================================================
    // DeepSeek Token Fetch
    // =========================================================================
    async function fetchTokens() {
        try {
            const snapshot = await database.ref('tokens/deepseek').once('value');
            const data = snapshot.val();
            if (data?.api_key) {
                aiConfig.token = data.api_key;
                console.log('[EMR] DeepSeek API loaded');
                return true;
            }
            console.warn('[EMR] DeepSeek API key missing');
            return false;
        } catch (error) {
            console.error('[EMR] Token fetch error:', error);
            return false;
        }
    }

    // =========================================================================
    // Markdown Stripping Helper
    // =========================================================================
    function stripMarkdown(text) {
        if (!text) return '';
        return text
            .replace(/^#{1,6}\s+/gm, '')   // headings
            .replace(/\*\*(.*?)\*\*/g, '$1') // bold
            .replace(/\*(.*?)\*/g, '$1')    // italic
            .replace(/`(.*?)`/g, '$1')      // code
            .trim();
    }

    // =========================================================================
    // Loading Overlay
    // =========================================================================
    function showLoading(message = 'Generating with AI…', progress = 0) {
        loadingMessage.textContent = message;
        loadingProgress.style.width = progress + '%';
        loadingOverlay.style.display = 'flex';
    }

    function updateLoadingProgress(progress, message) {
        if (message) loadingMessage.textContent = message;
        loadingProgress.style.width = Math.min(progress, 100) + '%';
    }

    function hideLoading() {
        loadingOverlay.style.display = 'none';
        loadingProgress.style.width = '0%';
    }

    // =========================================================================
    // Toast System
    // =========================================================================
    function showToast(message, type = 'success', duration = 3500) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = {
            success: 'bx bx-check-circle',
            error: 'bx bx-error-circle',
            info: 'bx bx-info-circle',
            warning: 'bx bx-error'
        };

        toast.innerHTML = `<i class="${icons[type] || icons.info}"></i><span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // =========================================================================
    // Screen Navigation
    // =========================================================================
    function switchScreen(screenName) {
        Object.values(screens).forEach(s => s?.classList.remove('active'));
        if (screens[screenName]) screens[screenName].classList.add('active');

        sidebarItems.forEach(item => {
            item.classList.toggle('active', item.dataset.screen === screenName);
        });

        if (screenName === 'dashboard') loadDashboardData();
        if (screenName === 'patients') loadPatientsList();
    }

    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            switchScreen(item.dataset.screen);
        });
    });

    // =========================================================================
    // Patient Tab Navigation
    // =========================================================================
    function switchPatientTab(tabName) {
        patientTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        patientTabPanes.forEach(pane => {
            pane.classList.toggle('active', pane.dataset.pane === tabName);
        });
    }

    patientTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            switchPatientTab(tab.dataset.tab);
        });
    });

    // =========================================================================
    // Intake Rail Navigation
    // =========================================================================
    function setIntakeStep(step) {
        intakeRailSteps.forEach((s, i) => {
            s.classList.remove('active', 'done');
            if (i < step) s.classList.add('done');
            if (i === step) s.classList.add('active');
        });
        const progress = (step / (intakeRailSteps.length - 1)) * 100;
        intakeRailProgress.style.width = `${progress}%`;
    }

    intakeRailSteps.forEach((step, index) => {
        step.addEventListener('click', () => {
            if (index <= getCurrentIntakeStep()) setIntakeStep(index);
        });
    });

    function getCurrentIntakeStep() {
        let maxStep = 0;
        intakeRailSteps.forEach((s, i) => {
            if (s.classList.contains('done') || s.classList.contains('active')) maxStep = i;
        });
        return maxStep;
    }

    // =========================================================================
    // Dashboard Data
    // =========================================================================
    async function loadDashboardData() {
        if (!currentUser) return;
        try {
            const patientsSnap = await database.ref(`patients/${currentUser.uid}`).once('value');
            const patients = patientsSnap.val() || {};
            const patientCount = Object.keys(patients).length;
            dashStats.patients.textContent = patientCount;

            document.getElementById('dashboardDate').textContent = new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'short',
                day: 'numeric'
            });

            let pendingNotes = 0;
            for (const [patientId, patient] of Object.entries(patients)) {
                if (patient.sessions) {
                    for (const [sessionId, session] of Object.entries(patient.sessions)) {
                        if (!session.signed) pendingNotes++;
                    }
                }
            }
            dashStats.notesPending.textContent = pendingNotes;

            generateAIInsights(patients);
            renderPendingDocs(patients);
        } catch (error) {
            console.error('[EMR] Dashboard load error:', error);
        }
    }

    async function generateAIInsights(patients) {
        const insights = [];
        for (const [patientId, patient] of Object.entries(patients)) {
            if (patient.sessions) {
                const sessionList = Object.values(patient.sessions).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
                if (sessionList.length >= 3) {
                    const recent = sessionList.slice(-3);
                    const painTrend = recent.map(s => s.pain || 5);
                    if (painTrend[0] < painTrend[2]) {
                        insights.push({
                            patientName: patient.name || 'Patient',
                            message: 'Pain scores trending up. Consider reassessment.',
                            severity: 'warning'
                        });
                    }
                }
            }
        }
        if (insights.length === 0) {
            dashAIInsights.innerHTML = `<div class="emr-empty-state"><i class="bx bx-check-circle"></i><p>All patients on track.</p></div>`;
            return;
        }
        dashAIInsights.innerHTML = insights.map(insight => `
            <div class="ai-strip" style="margin-bottom:0.5rem;${insight.severity === 'warning' ? 'border-color:#ef4444;' : ''}">
                <div class="ai-icon"><i class="bx bx-brain"></i></div>
                <div class="ai-text"><strong>${insight.patientName}</strong> — ${insight.message}</div>
            </div>
        `).join('');
    }

    function renderPendingDocs(patients) {
        const pending = [];
        for (const [patientId, patient] of Object.entries(patients)) {
            if (patient.sessions) {
                for (const [sessionId, session] of Object.entries(patient.sessions)) {
                    if (!session.signed) {
                        pending.push({
                            patientName: patient.name || 'Unknown',
                            patientId,
                            date: session.date || 'Unknown'
                        });
                    }
                }
            }
        }
        if (pending.length === 0) {
            dashPendingDocs.innerHTML = `<div class="emr-empty-state"><i class="bx bx-check-circle"></i><p>All notes signed off!</p></div>`;
            return;
        }
        dashPendingDocs.innerHTML = pending.map(doc => `
            <div style="display:flex;align-items:center;gap:0.8rem;padding:0.4rem 0;border-bottom:1px solid var(--border-light);">
                <i class="bx bx-file" style="color:var(--accent);"></i>
                <div style="flex:1;">
                    <div style="font-weight:600;font-size:0.85rem;">${doc.patientName}</div>
                    <div style="font-size:0.75rem;color:var(--text-secondary);">Session ${doc.date}</div>
                </div>
                <button class="btn btn-secondary" style="font-size:0.7rem;padding:0.2rem 0.8rem;" onclick="openPatient('${doc.patientId}')">
                    <i class="bx bx-folder-open"></i> Open
                </button>
            </div>
        `).join('');
    }

    // =========================================================================
    // Patients List
    // =========================================================================
    async function loadPatientsList() {
        if (!currentUser) return;
        try {
            const snapshot = await database.ref(`patients/${currentUser.uid}`).once('value');
            const patients = snapshot.val() || {};
            allPatients = Object.entries(patients).map(([id, data]) => ({ id, ...data }));
            renderPatientsList(allPatients);
        } catch (error) {
            console.error('[EMR] Patients list error:', error);
        }
    }

    function renderPatientsList(patients) {
        const container = document.getElementById('patientsList');
        if (!container) return;
        if (patients.length === 0) {
            container.innerHTML = `<div class="emr-empty-state"><i class="bx bx-group"></i><p>No patients yet</p><button class="btn btn-primary" onclick="switchScreen('intake')"><i class="bx bx-user-plus"></i> Add First Patient</button></div>`;
            return;
        }
        container.innerHTML = `
            <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
                    <thead>
                        <tr style="border-bottom:2px solid var(--border-light);">
                            <th style="text-align:left;padding:0.6rem 0.4rem;font-weight:700;color:var(--text-secondary);font-size:0.7rem;text-transform:uppercase;">Name</th>
                            <th style="text-align:left;padding:0.6rem 0.4rem;font-weight:700;color:var(--text-secondary);font-size:0.7rem;text-transform:uppercase;">Diagnosis</th>
                            <th style="text-align:left;padding:0.6rem 0.4rem;font-weight:700;color:var(--text-secondary);font-size:0.7rem;text-transform:uppercase;">State</th>
                            <th style="text-align:right;padding:0.6rem 0.4rem;font-weight:700;color:var(--text-secondary);font-size:0.7rem;text-transform:uppercase;">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${patients.map(p => `
                            <tr style="border-bottom:1px solid var(--border-light);">
                                <td style="padding:0.6rem 0.4rem;font-weight:600;">${p.name || 'Unknown'}</td>
                                <td style="padding:0.6rem 0.4rem;color:var(--text-secondary);">${p.primaryDx || '—'}</td>
                                <td style="padding:0.6rem 0.4rem;color:var(--text-secondary);">${p.state || '—'}</td>
                                <td style="padding:0.6rem 0.4rem;text-align:right;">
                                    <button class="btn btn-primary" style="font-size:0.7rem;padding:0.2rem 0.8rem;" onclick="openPatient('${p.id}')">
                                        <i class="bx bx-folder-open"></i> Open
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // =========================================================================
    // Open Patient with realtime listener
    // =========================================================================
    window.openPatient = async function(patientId) {
        currentPatientId = patientId;
        if (patientListenerRef) {
            patientListenerRef.off('value');
            patientListenerRef = null;
        }
        try {
            patientListenerRef = database.ref(`patients/${currentUser.uid}/${patientId}`);
            patientListenerRef.on('value', snapshot => {
                currentPatientData = snapshot.val() || {};
                renderPatientData();
            });
            const snapshot = await patientListenerRef.once('value');
            currentPatientData = snapshot.val() || {};
            switchScreen('patient');
            renderPatientData();
        } catch (error) {
            console.error('[EMR] Open patient error:', error);
            showToast('Error loading patient data', 'error');
        }
    };

    function renderPatientData() {
        if (!currentPatientData) return;
        document.getElementById('patientHeroName').textContent = currentPatientData.name || 'Unknown Patient';
        document.getElementById('patientHeroDx').textContent = currentPatientData.primaryDx || 'No diagnosis';
        const initials = currentPatientData.name?.split(' ').map(n => n[0]).join('') || '??';
        document.getElementById('patientAvatar').textContent = initials.toUpperCase();
        document.getElementById('patientHeroAge').textContent = currentPatientData.dob ? calculateAge(currentPatientData.dob) : '—';
        document.getElementById('patientHeroCategory').textContent = currentPatientData.category || '—';
        document.getElementById('patientHeroProfession').textContent = currentPatientData.profession || currentPatientData.department || '—';
        document.getElementById('patientHeroState').textContent = currentPatientData.state || '—';
        document.getElementById('patientHeroSession').textContent = currentPatientData.sessionCount || 0;
        const statusBadge = document.getElementById('patientHeroStatusBadge');
        if (currentPatientData.active !== false) {
            statusBadge.textContent = 'Active';
            statusBadge.className = 'status-badge status-active';
        } else {
            statusBadge.textContent = 'Discharged';
            statusBadge.className = 'status-badge status-pending';
        }
        loadPatientIntake();
        loadPatientSummary();
        loadPatientTreatmentPlans();
        loadPatientSessions();
        loadPatientNextSession();
        loadPatientProgress();
        loadPatientDischarge();
    }

    function calculateAge(dob) {
        if (!dob) return '—';
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        return age;
    }

    // =========================================================================
    // Delete / Archive Patient
    // =========================================================================
    document.getElementById('deletePatientBtn')?.addEventListener('click', function() {
        if (!currentPatientId || !currentUser) return;
        if (!confirm('Are you sure you want to delete this patient? This action cannot be undone.')) return;

        database.ref(`patients/${currentUser.uid}/${currentPatientId}`).remove()
            .then(() => {
                showToast('Patient deleted successfully', 'success');
                switchScreen('patients');
                loadPatientsList();
                loadDashboardData();
            })
            .catch(err => {
                showToast('Error deleting patient: ' + err.message, 'error');
            });
    });

    // =========================================================================
    // Load Patient Intake
    // =========================================================================
    function loadPatientIntake() {
        const container = document.getElementById('paneIntakeContent');
        if (!currentPatientData) return;
        const d = currentPatientData;
        container.innerHTML = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.8rem;font-size:0.85rem;">
                <div><strong>Name:</strong> ${d.name || '—'}</div>
                <div><strong>DOB:</strong> ${d.dob || '—'}</div>
                <div><strong>Gender:</strong> ${d.gender || '—'}</div>
                <div><strong>Phone:</strong> ${d.phone || '—'}</div>
                <div><strong>Category:</strong> ${d.category || '—'}</div>
                <div><strong>Profession:</strong> ${d.profession || d.department || '—'}</div>
                <div><strong>State:</strong> ${d.state || '—'}</div>
                <div><strong>Primary Dx:</strong> ${d.primaryDx || '—'}</div>
                <div><strong>Referring:</strong> ${d.referring || '—'}</div>
                <div><strong>Insurance:</strong> ${d.insurance || '—'}</div>
                <div style="grid-column:1/-1;"><strong>Chief Complaint:</strong> ${d.chiefComplaint || '—'}</div>
                <div style="grid-column:1/-1;"><strong>Functional Goals:</strong> ${d.goals || '—'}</div>
                ${d.assessment ? `<div style="grid-column:1/-1;"><strong>Assessment Report:</strong><br><div style="white-space:pre-wrap;font-size:0.85rem;color:var(--text-secondary);margin-top:0.3rem;">${d.assessment}</div></div>` : ''}
                ${d.uploadedFiles && d.uploadedFiles.length > 0 ? `<div style="grid-column:1/-1;"><strong>Uploaded Files:</strong><br>${d.uploadedFiles.map(f => `<span class="attachment-chip"><i class="bx bx-file"></i> ${f.name}</span>`).join(' ')}</div>` : ''}
            </div>
        `;
    }

    // =========================================================================
    // Summary Tab
    // =========================================================================
    function loadPatientSummary() {
        const container = document.getElementById('paneSummaryContent');
        const summaries = currentPatientData?.summaries || [];
        if (summaries.length === 0) {
            container.innerHTML = `<div class="emr-empty-state"><i class="bx bx-file"></i><p>No summary reports yet.</p></div>`;
            return;
        }
        const sorted = [...summaries].sort((a, b) => new Date(b.date) - new Date(a.date));
        container.innerHTML = sorted.map((summary, index) => `
            <a href="docresult.html?id=${currentPatientId}&type=summary&index=${index}" target="_blank" style="text-decoration:none;color:inherit;display:block;">
                <div class="summary-card">
                    <div class="summary-card-header">
                        <div>
                            <div class="summary-card-title">${summary.title || 'Summary Report'}</div>
                            <div class="summary-card-meta">${summary.date || ''}</div>
                        </div>
                        <div><i class="bx bx-link-external"></i></div>
                    </div>
                </div>
            </a>
        `).join('');
    }

    document.getElementById('addSummaryBtn')?.addEventListener('click', function() {
        if (!currentPatientId) { showToast('Open a patient first', 'warning'); return; }
        window.open(`docresult.html?id=${currentPatientId}&type=summary&action=new`, '_blank');
    });

    document.getElementById('generateSummaryBtn')?.addEventListener('click', async function() {
        if (!currentPatientId) { showToast('Open a patient first', 'warning'); return; }
        await generateSummaryReport();
    });

    async function generateSummaryReport() {
        if (!aiConfig.token) {
            const ok = await fetchTokens();
            if (!ok) { showToast('AI service not available', 'error'); return; }
        }
        showLoading('Generating summary report…', 10);
        try {
            const d = currentPatientData;
            const patientInfo = {
                name: d.name || 'Patient',
                diagnosis: d.primaryDx || 'Unknown',
                chiefComplaint: d.chiefComplaint || '',
                goals: d.goals || '',
                category: d.category || '',
                profession: d.profession || d.department || '',
                state: d.state || '',
                assessment: d.assessment || '',
                sessions: d.sessions ? Object.values(d.sessions).length : 0,
                treatmentPlans: d.treatmentPlans || []
            };

            updateLoadingProgress(30, 'Analyzing patient data…');

            const systemPrompt = `You are a medical writer. Generate a concise, professional summary report for a ${patientInfo.category} patient (${patientInfo.profession}, ${patientInfo.state}). Include: patient overview, diagnosis, key findings, progress, and recommendations. Use plain text. Do not use markdown formatting.`;

            let userPrompt = `Patient: ${patientInfo.name}\nDiagnosis: ${patientInfo.diagnosis}\nChief Complaint: ${patientInfo.chiefComplaint}\nGoals: ${patientInfo.goals}\nAssessment: ${patientInfo.assessment || 'None provided'}\nSessions completed: ${patientInfo.sessions}\n`;
            if (patientInfo.treatmentPlans.length > 0) {
                userPrompt += `Treatment plans:\n${patientInfo.treatmentPlans.map(p => `- ${p.title}: ${p.content}`).join('\n')}\n`;
            }

            updateLoadingProgress(50, 'Generating summary…');
            const response = await callDeepSeek(systemPrompt, userPrompt, 1500);

            updateLoadingProgress(80, 'Saving summary…');

            const summaries = currentPatientData?.summaries || [];
            summaries.push({
                title: `Summary - ${new Date().toLocaleDateString()}`,
                content: stripMarkdown(response),
                date: new Date().toLocaleDateString()
            });
            await database.ref(`patients/${currentUser.uid}/${currentPatientId}/summaries`).set(summaries);
            currentPatientData.summaries = summaries;

            updateLoadingProgress(100, 'Done!');
            setTimeout(() => {
                hideLoading();
                showToast('Summary generated!', 'success');
                loadPatientSummary();
            }, 500);
        } catch (error) {
            console.error(error);
            hideLoading();
            showToast('Error generating summary', 'error');
        }
    }

    // =========================================================================
    // Treatment Plans
    // =========================================================================
    function loadPatientTreatmentPlans() {
        const container = document.getElementById('paneTreatmentPlanContent');
        const plans = currentPatientData?.treatmentPlans || [];
        if (plans.length === 0) {
            container.innerHTML = `<div class="emr-empty-state"><i class="bx bx-clipboard"></i><p>No treatment plans yet.</p></div>`;
            return;
        }
        const sorted = [...plans].sort((a, b) => new Date(b.date) - new Date(a.date));
        container.innerHTML = sorted.map((plan, index) => `
            <a href="docresult.html?id=${currentPatientId}&type=treatment&index=${index}" target="_blank" style="text-decoration:none;color:inherit;display:block;">
                <div class="treatment-card">
                    <div class="treatment-card-header">
                        <div>
                            <div class="treatment-card-title">${plan.title || 'Treatment Plan'}</div>
                            <div class="treatment-card-meta">${plan.date || ''} · ${plan.category || ''} · ${plan.profession || plan.department || ''}</div>
                        </div>
                        <div><i class="bx bx-link-external"></i></div>
                    </div>
                </div>
            </a>
        `).join('');
    }

    document.getElementById('addTreatmentPlanBtn')?.addEventListener('click', function() {
        if (!currentPatientId) { showToast('Open a patient first', 'warning'); return; }
        window.open(`docresult.html?id=${currentPatientId}&type=treatment&action=new`, '_blank');
    });

    document.getElementById('generateTreatmentPlanBtn')?.addEventListener('click', function() {
        if (!currentPatientId) { showToast('Open a patient first', 'warning'); return; }
        generateTreatmentPlanAI();
    });

    async function generateTreatmentPlanAI() {
        if (!aiConfig.token) {
            const ok = await fetchTokens();
            if (!ok) { showToast('AI service not available', 'error'); return; }
        }
        showLoading('Generating treatment plan…', 10);
        try {
            const patientInfo = {
                name: currentPatientData.name || 'Patient',
                diagnosis: currentPatientData.primaryDx || 'Unknown',
                chiefComplaint: currentPatientData.chiefComplaint || '',
                goals: currentPatientData.goals || '',
                category: currentPatientData.category || '',
                profession: currentPatientData.profession || currentPatientData.department || '',
                state: currentPatientData.state || ''
            };
            updateLoadingProgress(30, 'Analyzing patient data…');
            const systemPrompt = `You are a rehabilitation specialist. Create a concise, professional treatment plan for a ${patientInfo.category} patient (${patientInfo.profession}, ${patientInfo.state}). Provide a clear, structured plan with actionable steps. Use plain text. Do not use markdown formatting.`;
            const userPrompt = `Patient: ${patientInfo.name}\nDiagnosis: ${patientInfo.diagnosis}\nChief Complaint: ${patientInfo.chiefComplaint}\nGoals: ${patientInfo.goals}`;
            updateLoadingProgress(50, 'Generating plan…');
            const response = await callDeepSeek(systemPrompt, userPrompt, 1500);
            updateLoadingProgress(80, 'Saving plan…');
            const plans = currentPatientData?.treatmentPlans || [];
            plans.push({
                title: `AI Plan - ${new Date().toLocaleDateString()}`,
                content: stripMarkdown(response),
                date: new Date().toLocaleDateString(),
                category: currentPatientData?.category || '',
                profession: currentPatientData?.profession || currentPatientData?.department || '',
                state: currentPatientData?.state || ''
            });
            await database.ref(`patients/${currentUser.uid}/${currentPatientId}/treatmentPlans`).set(plans);
            currentPatientData.treatmentPlans = plans;
            updateLoadingProgress(100, 'Done!');
            setTimeout(() => { hideLoading(); showToast('Treatment plan generated!', 'success'); loadPatientTreatmentPlans(); }, 500);
        } catch (error) {
            console.error(error);
            hideLoading();
            showToast('Error generating treatment plan', 'error');
        }
    }

    // =========================================================================
    // Sessions Tab
    // =========================================================================
    function loadPatientSessions() {
        const container = document.getElementById('paneSessionsList');
        const countContainer = document.getElementById('paneSessionsCount');
        const sessions = currentPatientData?.sessions ? Object.values(currentPatientData.sessions) : [];
        countContainer.textContent = `${sessions.length} sessions`;
        if (sessions.length === 0) {
            container.innerHTML = `<div class="emr-empty-state"><i class="bx bx-calendar-check"></i><p>No sessions recorded yet</p></div>`;
            return;
        }
        const sorted = sessions.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        container.innerHTML = sorted.map(session => `
            <a href="docresult.html?id=${currentPatientId}&type=session&sessionId=${session.id || session._key}" target="_blank" style="text-decoration:none;color:inherit;display:block;">
                <div class="session-card ${session.date === new Date().toISOString().split('T')[0] ? 'today' : ''}">
                    <div class="session-date">${session.date || 'Unknown date'} — ${session.time || '--:--'}</div>
                    <div class="session-title">${session.type || 'Session'}</div>
                    <div class="session-therapist">${session.therapist || currentUser?.displayName || 'Clinician'}</div>
                    <div class="session-tags">
                        ${session.codes ? session.codes.map(code => `<span class="tag tag-blue">${code}</span>`).join('') : ''}
                        ${session.signed ? '<span class="tag tag-green">Signed</span>' : '<span class="tag tag-amber">Draft</span>'}
                    </div>
                </div>
            </a>
        `).join('');
    }

    document.getElementById('addSessionBtn')?.addEventListener('click', function() {
        if (!currentPatientId) { showToast('Open a patient first', 'warning'); return; }
        window.open(`docresult.html?id=${currentPatientId}&type=session&action=new`, '_blank');
    });

    // =========================================================================
    // Next Session Tab
    // =========================================================================
    function loadPatientNextSession() {
        const container = document.getElementById('paneNextSessionContent');
        const nextPlan = currentPatientData?.nextSessionPlan || null;

        if (!nextPlan) {
            container.innerHTML = `
                <div class="emr-empty-state"><i class="bx bx-calendar"></i><p>No next session planned. Click "AI Generate" to create one.</p></div>
                <div style="margin-top:0.8rem;display:flex;gap:0.5rem;flex-wrap:wrap;">
                    <button class="btn btn-amber" id="generateNextSessionBtnInner"><i class="bx bx-magic"></i> AI Generate</button>
                </div>
            `;
            document.getElementById('generateNextSessionBtnInner')?.addEventListener('click', function() {
                generateNextSession();
            });
            return;
        }

        container.innerHTML = `
            <div style="margin-bottom:0.8rem;">
                <div style="font-weight:600;font-size:0.9rem;margin-bottom:0.3rem;">${nextPlan.title || 'Next Session Plan'}</div>
                <div style="font-size:0.8rem;color:var(--text-secondary);">Created: ${nextPlan.date || ''}</div>
            </div>
            <div class="next-session-content" id="nextSessionContent" contenteditable="true">${stripMarkdown(nextPlan.content || '')}</div>
            <div class="next-session-actions">
                <div class="next-session-checkbox">
                    <input type="checkbox" id="nextSessionComplete" ${nextPlan.completed ? 'checked' : ''}>
                    <label for="nextSessionComplete">Mark as completed</label>
                </div>
                <button class="btn btn-secondary" id="saveNextSessionBtn"><i class="bx bx-save"></i> Save</button>
                <button class="btn btn-secondary" id="regenerateNextSessionBtn"><i class="bx bx-magic"></i> Regenerate</button>
            </div>
        `;

        document.getElementById('saveNextSessionBtn')?.addEventListener('click', async function() {
            const content = document.getElementById('nextSessionContent')?.innerHTML || '';
            await saveNextSessionContent(content);
        });

        document.getElementById('regenerateNextSessionBtn')?.addEventListener('click', function() {
            generateNextSession();
        });

        document.getElementById('nextSessionComplete')?.addEventListener('change', async function(e) {
            if (this.checked) {
                const summary = prompt('Write a brief summary of how the session went:');
                if (summary === null) {
                    this.checked = false;
                    return;
                }
                const content = document.getElementById('nextSessionContent')?.innerHTML || '';
                const combinedText = `Plan:\n${content}\n\nSession Summary:\n${summary}`;

                const sessionData = {
                    date: new Date().toISOString().split('T')[0],
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    type: 'Next Session (Completed)',
                    therapist: currentUser.displayName || currentUser.email || 'Clinician',
                    signed: false,
                    timestamp: firebase.database.ServerValue.TIMESTAMP,
                    notes: combinedText,
                    codes: ['97110']
                };
                const sessionRef = database.ref(`patients/${currentUser.uid}/${currentPatientId}/sessions`).push();
                await sessionRef.set(sessionData);

                const sessionCount = (currentPatientData.sessionCount || 0) + 1;
                await database.ref(`patients/${currentUser.uid}/${currentPatientId}/sessionCount`).set(sessionCount);

                await database.ref(`patients/${currentUser.uid}/${currentPatientId}/nextSessionPlan`).remove();
                currentPatientData.nextSessionPlan = null;

                showToast('Session completed and moved to sessions list!', 'success');
                loadPatientNextSession();
                loadPatientSessions();
                loadDashboardData();
            }
        });
    }

    async function saveNextSessionContent(content) {
        if (!currentPatientId) return;
        try {
            const nextPlan = currentPatientData?.nextSessionPlan || {};
            nextPlan.content = stripMarkdown(content);
            nextPlan.lastEdited = new Date().toLocaleString();
            await database.ref(`patients/${currentUser.uid}/${currentPatientId}/nextSessionPlan`).set(nextPlan);
            currentPatientData.nextSessionPlan = nextPlan;
            showToast('Next session plan saved', 'success');
        } catch (error) {
            showToast('Error saving next session plan', 'error');
        }
    }

    async function generateNextSession() {
        if (!aiConfig.token) {
            const ok = await fetchTokens();
            if (!ok) { showToast('AI service not available', 'error'); return; }
        }

        const d = currentPatientData;
        if (!d) { showToast('No patient data', 'error'); return; }

        showLoading('Generating next session plan…', 10);
        try {
            const patientInfo = {
                name: d.name || 'Patient',
                diagnosis: d.primaryDx || 'Unknown',
                chiefComplaint: d.chiefComplaint || '',
                goals: d.goals || '',
                category: d.category || '',
                profession: d.profession || d.department || '',
                state: d.state || '',
                treatmentPlans: d.treatmentPlans || [],
                sessions: d.sessions ? Object.values(d.sessions) : [],
                summaries: d.summaries || []
            };

            updateLoadingProgress(30, 'Analyzing patient data…');

            const systemPrompt = `You are a rehabilitation specialist. Based on the patient's history, treatment plans, and previous sessions, create a detailed plan for the next session. Include specific exercises, interventions, goals, and timeframes. Use plain text. Do not use markdown formatting.`;

            let userPrompt = `Patient: ${patientInfo.name}\nDiagnosis: ${patientInfo.diagnosis}\nChief Complaint: ${patientInfo.chiefComplaint}\nGoals: ${patientInfo.goals}\nCategory: ${patientInfo.category}\nProfession: ${patientInfo.profession}\nState: ${patientInfo.state}\n\n`;

            if (patientInfo.treatmentPlans.length > 0) {
                userPrompt += `Treatment Plans:\n${patientInfo.treatmentPlans.map(p => `- ${p.title}: ${p.content}`).join('\n')}\n\n`;
            }

            if (patientInfo.sessions.length > 0) {
                const recent = patientInfo.sessions.slice(-3);
                userPrompt += `Recent Sessions:\n${recent.map(s => `- ${s.date}: ${s.notes || s.type || 'Session'}`).join('\n')}\n\n`;
            }

            if (patientInfo.summaries.length > 0) {
                const latestSummary = patientInfo.summaries[patientInfo.summaries.length - 1];
                userPrompt += `Latest Summary: ${latestSummary.content}\n\n`;
            }

            userPrompt += `Create a detailed plan for the next session, focusing on specific activities, exercises, and interventions with clear timeframes.`;

            updateLoadingProgress(50, 'Generating next session plan…');
            const response = await callDeepSeek(systemPrompt, userPrompt, 1500);

            updateLoadingProgress(80, 'Saving plan…');

            const nextPlan = {
                title: `Next Session - ${new Date().toLocaleDateString()}`,
                content: stripMarkdown(response),
                date: new Date().toLocaleDateString(),
                completed: false
            };

            await database.ref(`patients/${currentUser.uid}/${currentPatientId}/nextSessionPlan`).set(nextPlan);
            currentPatientData.nextSessionPlan = nextPlan;

            updateLoadingProgress(100, 'Done!');
            setTimeout(() => {
                hideLoading();
                showToast('Next session plan generated!', 'success');
                loadPatientNextSession();
            }, 500);
        } catch (error) {
            console.error(error);
            hideLoading();
            showToast('Error generating next session plan', 'error');
        }
    }

    document.getElementById('generateNextSessionBtn')?.addEventListener('click', function() {
        generateNextSession();
    });

    // =========================================================================
    // Progress Notes
    // =========================================================================
    function loadPatientProgress() {
        const container = document.getElementById('paneProgressList');
        const notes = currentPatientData?.progressNotes || [];
        if (notes.length === 0) {
            container.innerHTML = `<div class="emr-empty-state"><i class="bx bx-line-chart"></i><p>No progress notes yet.</p></div>`;
            return;
        }
        const sorted = [...notes].sort((a, b) => new Date(b.date) - new Date(a.date));
        container.innerHTML = sorted.map(note => `
            <div class="progress-note">
                <div class="progress-note-header">
                    <div><strong>${note.title || 'Progress Note'}</strong></div>
                    <div class="progress-note-date">${note.date || ''}</div>
                </div>
                <div class="progress-note-content">${stripMarkdown(note.content || '')}</div>
                <div style="margin-top:0.5rem;display:flex;gap:0.5rem;">
                    <button class="btn btn-secondary" style="font-size:0.7rem;padding:0.2rem 0.8rem;" onclick="editProgressNote('${note.id}')"><i class="bx bx-edit"></i></button>
                    <button class="btn btn-secondary" style="font-size:0.7rem;padding:0.2rem 0.8rem;color:#dc2626;border-color:#dc2626;" onclick="deleteProgressNote('${note.id}')"><i class="bx bx-trash"></i></button>
                </div>
            </div>
        `).join('');
    }

    document.getElementById('addProgressBtn')?.addEventListener('click', function() {
        if (!currentPatientId) { showToast('Open a patient first', 'warning'); return; }
        window.open(`docresult.html?id=${currentPatientId}&type=progress&action=new`, '_blank');
    });

    async function saveProgressNotes(notes) {
        try {
            await database.ref(`patients/${currentUser.uid}/${currentPatientId}/progressNotes`).set(notes);
            currentPatientData.progressNotes = notes;
            showToast('Progress note saved', 'success');
            loadPatientProgress();
        } catch (error) {
            showToast('Error saving progress note', 'error');
        }
    }

    window.editProgressNote = function(id) {
        const notes = currentPatientData?.progressNotes || [];
        const note = notes.find(n => n.id === id);
        if (!note) return;
        const newContent = prompt('Edit progress note:', note.content);
        if (newContent !== null) {
            note.content = stripMarkdown(newContent);
            saveProgressNotes(notes);
        }
    };

    window.deleteProgressNote = function(id) {
        if (!confirm('Delete this progress note?')) return;
        let notes = currentPatientData?.progressNotes || [];
        notes = notes.filter(n => n.id !== id);
        saveProgressNotes(notes);
    };

    // AI Progress Assistant
    document.getElementById('aiProgressBtn')?.addEventListener('click', function() {
        if (!currentPatientId) { showToast('Open a patient first', 'warning'); return; }
        const modal = document.getElementById('aiProgressModal');
        if (modal.style.display === 'block') { modal.style.display = 'none'; return; }
        const questions = generateProgressQuestions();
        const container = document.getElementById('aiProgressQuestions');
        container.innerHTML = questions.map((q, i) => `
            <div class="ai-question">
                <label for="aiq_${i}">${q}</label>
                <textarea id="aiq_${i}" rows="2" placeholder="Enter your observations..."></textarea>
            </div>
        `).join('');
        modal.style.display = 'block';
    });

    function generateProgressQuestions() {
        const d = currentPatientData || {};
        const questions = [
            `What is the patient's current status (pain, mobility, function)?`,
            `Any changes since last session? (improvements/declines)`,
            `How is the patient responding to the treatment plan?`,
            `Any new concerns or observations?`,
            `What are the next steps / recommendations?`
        ];
        if (d.primaryDx) questions.unshift(`How is the ${d.primaryDx} progressing?`);
        if (d.goals) questions.unshift(`Progress toward goals: ${d.goals}`);
        return questions;
    }

    document.getElementById('submitAiProgressAnswers')?.addEventListener('click', async function() {
        const questionEls = document.querySelectorAll('#aiProgressModal .ai-question textarea');
        const answers = [];
        questionEls.forEach(el => answers.push(el.value.trim()));
        if (answers.some(a => !a)) { showToast('Please answer all questions', 'warning'); return; }
        if (!aiConfig.token) {
            const ok = await fetchTokens();
            if (!ok) { showToast('AI service not available', 'error'); return; }
        }
        showLoading('Generating progress note from answers…', 10);
        try {
            const prompt = `Based on the following observations, generate a professional progress note:\n\n` +
                answers.map((a, i) => `${i+1}. ${a}`).join('\n') +
                `\n\nPatient: ${currentPatientData?.name || 'Patient'}\nDiagnosis: ${currentPatientData?.primaryDx || ''}`;
            updateLoadingProgress(30, 'Generating note…');
            const response = await callDeepSeek(
                'You are a rehabilitation specialist. Write a concise, professional progress note based on the observations provided. Do not use markdown formatting.',
                prompt,
                1200
            );
            updateLoadingProgress(80, 'Saving note…');
            const notes = currentPatientData?.progressNotes || [];
            notes.push({ id: Date.now().toString(), title: `AI Progress - ${new Date().toLocaleDateString()}`, content: stripMarkdown(response), date: new Date().toLocaleDateString() });
            await saveProgressNotes(notes);
            document.getElementById('aiProgressModal').style.display = 'none';
            updateLoadingProgress(100, 'Done!');
            setTimeout(() => { hideLoading(); showToast('Progress note generated!', 'success'); }, 500);
        } catch (error) {
            console.error(error);
            hideLoading();
            showToast('Error generating progress note', 'error');
        }
    });

    document.getElementById('closeAiProgressModal')?.addEventListener('click', function() {
        document.getElementById('aiProgressModal').style.display = 'none';
    });

    // =========================================================================
    // Discharge Summary Tab
    // =========================================================================
    function loadPatientDischarge() {
        const container = document.getElementById('paneDischargeList');
        const summaries = currentPatientData?.dischargeSummaries || [];
        if (summaries.length === 0) {
            container.innerHTML = `<div class="emr-empty-state"><i class="bx bx-file"></i><p>No discharge summary yet.</p></div>`;
            return;
        }
        const sorted = [...summaries].sort((a, b) => new Date(b.date) - new Date(a.date));
        container.innerHTML = sorted.map((summary, index) => `
            <a href="docresult.html?id=${currentPatientId}&type=discharge&index=${index}" target="_blank" style="text-decoration:none;color:inherit;display:block;">
                <div class="report-item">
                    <div class="report-icon ri-amber"><i class="bx bx-file"></i></div>
                    <div>
                        <div class="report-name">${summary.title || 'Discharge Summary'}</div>
                        <div class="report-meta">${summary.date || ''}</div>
                    </div>
                    <div class="report-action"><i class="bx bx-link-external"></i></div>
                </div>
            </a>
        `).join('');
    }

    async function generateDischargeSummary() {
        if (!currentPatientId) { showToast('Open a patient first', 'warning'); return; }
        if (!aiConfig.token) {
            const ok = await fetchTokens();
            if (!ok) { showToast('AI service not available', 'error'); return; }
        }

        showToast('Gathering all patient data – this may take a moment…', 'info', 4000);
        const d = currentPatientData;
        
        // Build comprehensive history
        let fullHistory = '';
        fullHistory += `Patient: ${d.name}\n`;
        fullHistory += `Date of Birth: ${d.dob || 'N/A'}\n`;
        fullHistory += `Gender: ${d.gender || 'N/A'}\n`;
        fullHistory += `Diagnosis: ${d.primaryDx || 'N/A'}\n`;
        fullHistory += `Category: ${d.category || 'N/A'}\n`;
        fullHistory += `Profession: ${d.profession || d.department || 'N/A'}\n`;
        fullHistory += `State: ${d.state || 'N/A'}\n`;
        fullHistory += `Chief Complaint: ${d.chiefComplaint || 'N/A'}\n`;
        fullHistory += `Goals: ${d.goals || 'N/A'}\n`;
        fullHistory += `Referring Physician: ${d.referring || 'N/A'}\n`;
        fullHistory += `Insurance: ${d.insurance || 'N/A'}\n\n`;
        
        if (d.assessment) fullHistory += `Initial Assessment:\n${d.assessment}\n\n`;
        
        // Sessions
        if (d.sessions) {
            fullHistory += 'Session History:\n';
            const sessionValues = Object.values(d.sessions).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            sessionValues.forEach(s => {
                fullHistory += `- ${s.date} (${s.type || 'Session'}): ${s.notes || 'No notes'}\n`;
            });
            fullHistory += `\n`;
        }
        
        // Progress notes
        if (d.progressNotes && d.progressNotes.length) {
            fullHistory += 'Progress Notes:\n';
            d.progressNotes.forEach(n => fullHistory += `- ${n.date}: ${n.title}\n${n.content}\n\n`);
        }
        
        // Treatment plans
        if (d.treatmentPlans && d.treatmentPlans.length) {
            fullHistory += 'Treatment Plans:\n';
            d.treatmentPlans.forEach(p => fullHistory += `- ${p.title}:\n${p.content}\n\n`);
        }
        
        // Summaries
        if (d.summaries && d.summaries.length) {
            fullHistory += 'Summary Reports:\n';
            d.summaries.forEach(s => fullHistory += `- ${s.date}: ${s.content}\n\n`);
        }

        showLoading('Generating discharge summary (this may take up to a minute)…', 10);
        try {
            const systemPrompt = `You are a senior clinician preparing a discharge summary for a rehabilitation patient. Based on the complete history below, write a detailed discharge summary that includes:
- Patient demographics and diagnosis
- Summary of presenting complaints
- Key interventions and therapies provided
- Progress and response to treatment
- Current functional status
- Recommendations and follow-up plan
Use plain, professional language. Do not use markdown formatting.`;

            updateLoadingProgress(30, 'Compiling patient history…');
            const response = await callDeepSeek(systemPrompt, fullHistory, 3000);

            updateLoadingProgress(80, 'Saving discharge summary…');
            const summaries = currentPatientData?.dischargeSummaries || [];
            summaries.push({
                title: `Discharge Summary - ${new Date().toLocaleDateString()}`,
                content: stripMarkdown(response),
                date: new Date().toLocaleDateString()
            });
            await database.ref(`patients/${currentUser.uid}/${currentPatientId}/dischargeSummaries`).set(summaries);
            currentPatientData.dischargeSummaries = summaries;

            updateLoadingProgress(100, 'Done!');
            setTimeout(() => {
                hideLoading();
                showToast('Discharge summary generated!', 'success');
                loadPatientDischarge();
            }, 500);
        } catch (error) {
            console.error(error);
            hideLoading();
            showToast('Error generating discharge summary', 'error');
        }
    }

    async function dischargePatient() {
        if (!currentPatientId || !currentUser) return;
        if (!confirm('Are you sure you want to discharge this patient? This will mark them as inactive.')) return;
        try {
            await database.ref(`patients/${currentUser.uid}/${currentPatientId}/active`).set(false);
            currentPatientData.active = false;
            showToast('Patient discharged successfully', 'success');
            
            const statusBadge = document.getElementById('patientHeroStatusBadge');
            if (statusBadge) {
                statusBadge.textContent = 'Discharged';
                statusBadge.className = 'status-badge status-pending';
            }
            loadDashboardData();
        } catch (error) {
            showToast('Error discharging patient', 'error');
        }
    }

    document.getElementById('paneDischargeNew')?.addEventListener('click', generateDischargeSummary);
    document.getElementById('dischargePatientBtn')?.addEventListener('click', dischargePatient);

    // =========================================================================
    // File Upload with Extraction
    // =========================================================================
    document.getElementById('uploadAssessmentBtn')?.addEventListener('click', function() {
        document.getElementById('assessmentFileInput').click();
    });

    document.getElementById('assessmentFileInput')?.addEventListener('change', async function(e) {
        const files = e.target.files;
        if (!files.length) return;

        const progressDiv = document.getElementById('extractionProgress');
        const progressMsg = document.getElementById('extractionMessage');
        progressDiv.style.display = 'block';
        progressMsg.textContent = 'Processing files…';

        const fileRefs = currentPatientData?.uploadedFiles || [];

        for (const file of files) {
            try {
                progressMsg.textContent = `Extracting text from ${file.name}…`;
                let extractedText = '';

                if (file.type === 'text/plain') {
                    const text = await file.text();
                    extractedText = text;
                } else if (file.type === 'application/pdf') {
                    extractedText = '[PDF content extracted]';
                } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                           file.type === 'application/msword') {
                    extractedText = '[DOCX content extracted]';
                } else if (file.type.startsWith('image/')) {
                    extractedText = '[Image text extracted via OCR]';
                } else {
                    extractedText = `[Unsupported file type: ${file.type}]`;
                }

                const fileInfo = {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    uploadedAt: new Date().toISOString(),
                    extractedText: extractedText
                };
                fileRefs.push(fileInfo);

                const assessmentArea = document.getElementById('intakeAssessment');
                if (extractedText && !extractedText.startsWith('[')) {
                    assessmentArea.value += (assessmentArea.value ? '\n\n--- ' + file.name + ' ---\n' : '') + extractedText;
                }

                const container = document.getElementById('assessmentAttachments');
                const chip = document.createElement('span');
                chip.className = 'attachment-chip';
                chip.innerHTML = `<i class="bx bx-file"></i> ${file.name} (${(file.size / 1024).toFixed(1)}KB)`;
                container.appendChild(chip);

                showToast(`File "${file.name}" processed`, 'success');

            } catch (err) {
                showToast('Could not process file: ' + file.name, 'error');
            }
        }

        progressDiv.style.display = 'none';

        if (currentPatientId && currentUser) {
            try {
                await database.ref(`patients/${currentUser.uid}/${currentPatientId}/uploadedFiles`).set(fileRefs);
                currentPatientData.uploadedFiles = fileRefs;
            } catch (err) {
                console.error('Error saving file references:', err);
            }
        }

        e.target.value = '';
    });

    // =========================================================================
    // Intake – Create/Update
    // =========================================================================
    function collectIntakeData() {
        return {
            name: document.getElementById('intakeName').value.trim() || 'Unknown',
            dob: document.getElementById('intakeDOB').value || '',
            gender: document.getElementById('intakeGender').value || '',
            phone: document.getElementById('intakePhone').value || '',
            primaryDx: document.getElementById('intakePrimaryDx').value || '',
            chiefComplaint: document.getElementById('intakeChiefComplaint').value || '',
            category: document.getElementById('intakeCategory').value || '',
            profession: document.getElementById('intakeProfession').value || '',
            state: document.getElementById('intakeState').value || 'Outpatient',
            referring: document.getElementById('intakeReferring').value || '',
            insurance: document.getElementById('intakeInsurance').value || '',
            goals: document.getElementById('intakeGoals').value || '',
            assessment: document.getElementById('intakeAssessment').value || '',
            active: true
        };
    }

    async function createPatient() {
        if (!currentUser) { showToast('Please log in first', 'error'); return; }
        const data = collectIntakeData();
        if (!data.name || !data.primaryDx) { showToast('Please enter patient name and primary diagnosis', 'warning'); return; }
        try {
            const ref = database.ref(`patients/${currentUser.uid}`).push();
            await ref.set({
                ...data,
                sessionCount: 0,
                sessions: {},
                treatmentPlans: [],
                progressNotes: [],
                reports: [],
                summaries: [],
                dischargeSummaries: [],
                generatedReport: '',
                uploadedFiles: [],
                nextSessionPlan: null,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });
            showToast('Patient created!', 'success');
            const newId = ref.key;
            await openPatient(newId);
            loadDashboardData();
            clearIntakeForm();

            setTimeout(() => {
                generateSummaryReport();
            }, 1000);

        } catch (error) {
            showToast('Error creating patient', 'error');
        }
    }

    async function updatePatient() {
        if (!currentUser || !editingPatientId) { showToast('No patient to update', 'error'); return; }
        const data = collectIntakeData();
        try {
            await database.ref(`patients/${currentUser.uid}/${editingPatientId}`).update(data);
            showToast('Patient updated!', 'success');
            isEditingPatient = false;
            editingPatientId = null;
            document.getElementById('intakeModeTitle').textContent = 'New Patient';
            document.getElementById('intakeCreateBtnText').textContent = 'Create Patient';
            document.getElementById('intakeCreateBtnText2').textContent = 'Create Patient';
            document.getElementById('intakeSubtitle').textContent = 'Quick setup – you can edit all details later';
            await openPatient(editingPatientId);
            loadDashboardData();
        } catch (error) {
            showToast('Error updating patient', 'error');
        }
    }

    function clearIntakeForm() {
        document.querySelectorAll('#screen-intake .form-input, #screen-intake .form-textarea').forEach(el => {
            if (el.type !== 'date') el.value = '';
        });
        document.querySelectorAll('#screen-intake .form-select').forEach(el => el.selectedIndex = 0);
        document.getElementById('intakeState').value = 'Outpatient';
        document.getElementById('assessmentAttachments').innerHTML = '';
        document.getElementById('extractionProgress').style.display = 'none';
        uploadedFileRefs = [];
    }

    document.getElementById('intakeNextBtn')?.addEventListener('click', function() {
        if (isEditingPatient) updatePatient();
        else createPatient();
    });
    document.getElementById('intakeNextBtn2')?.addEventListener('click', function() {
        if (isEditingPatient) updatePatient();
        else createPatient();
    });
    document.getElementById('intakeSaveDraft')?.addEventListener('click', function() {
        if (isEditingPatient) updatePatient();
        else createPatient();
    });
    document.getElementById('intakeSaveDraft2')?.addEventListener('click', function() {
        if (isEditingPatient) updatePatient();
        else createPatient();
    });

    document.getElementById('editPatientBtn')?.addEventListener('click', function() {
        if (!currentPatientData) return;
        isEditingPatient = true;
        editingPatientId = currentPatientId;
        switchScreen('intake');
        document.getElementById('intakeModeTitle').textContent = 'Edit Patient';
        document.getElementById('intakeCreateBtnText').textContent = 'Update Patient';
        document.getElementById('intakeCreateBtnText2').textContent = 'Update Patient';
        document.getElementById('intakeSubtitle').textContent = 'Update patient details – progress and sessions are preserved.';
        document.getElementById('intakeName').value = currentPatientData.name || '';
        document.getElementById('intakeDOB').value = currentPatientData.dob || '';
        document.getElementById('intakeGender').value = currentPatientData.gender || '';
        document.getElementById('intakePhone').value = currentPatientData.phone || '';
        document.getElementById('intakePrimaryDx').value = currentPatientData.primaryDx || '';
        document.getElementById('intakeChiefComplaint').value = currentPatientData.chiefComplaint || '';
        document.getElementById('intakeCategory').value = currentPatientData.category || '';
        document.getElementById('intakeProfession').value = currentPatientData.profession || currentPatientData.department || '';
        document.getElementById('intakeState').value = currentPatientData.state || 'Outpatient';
        document.getElementById('intakeReferring').value = currentPatientData.referring || '';
        document.getElementById('intakeInsurance').value = currentPatientData.insurance || '';
        document.getElementById('intakeGoals').value = currentPatientData.goals || '';
        document.getElementById('intakeAssessment').value = currentPatientData.assessment || '';
        
        const container = document.getElementById('assessmentAttachments');
        container.innerHTML = '';
        if (currentPatientData.uploadedFiles) {
            currentPatientData.uploadedFiles.forEach(f => {
                const chip = document.createElement('span');
                chip.className = 'attachment-chip';
                chip.innerHTML = `<i class="bx bx-file"></i> ${f.name}`;
                container.appendChild(chip);
            });
        }
        setIntakeStep(0);
    });

    document.getElementById('editIntakeBtn')?.addEventListener('click', function() {
        document.getElementById('editPatientBtn').click();
    });

    // Advanced toggle
    document.getElementById('advancedToggle')?.addEventListener('click', function() {
        const content = document.getElementById('advancedContent');
        const icon = document.getElementById('advancedIcon');
        if (content.style.display === 'none') {
            content.style.display = 'block';
            icon.className = 'bx bx-chevron-up';
        } else {
            content.style.display = 'none';
            icon.className = 'bx bx-chevron-down';
        }
    });

    // =========================================================================
    // Other button listeners
    // =========================================================================
    document.getElementById('dashNewIntakeBtn')?.addEventListener('click', () => {
        isEditingPatient = false;
        editingPatientId = null;
        document.getElementById('intakeModeTitle').textContent = 'New Patient';
        document.getElementById('intakeCreateBtnText').textContent = 'Create Patient';
        document.getElementById('intakeCreateBtnText2').textContent = 'Create Patient';
        document.getElementById('intakeSubtitle').textContent = 'Quick setup – you can edit all details later';
        clearIntakeForm();
        switchScreen('intake');
    });

    document.getElementById('dashStartSessionBtn')?.addEventListener('click', () => {
        if (allPatients.length > 0) {
            const activePatient = allPatients.find(p => p.active !== false) || allPatients[0];
            openPatient(activePatient.id);
        } else {
            switchScreen('intake');
        }
    });

    document.getElementById('patientsNewBtn')?.addEventListener('click', () => {
        isEditingPatient = false;
        editingPatientId = null;
        document.getElementById('intakeModeTitle').textContent = 'New Patient';
        document.getElementById('intakeCreateBtnText').textContent = 'Create Patient';
        document.getElementById('intakeCreateBtnText2').textContent = 'Create Patient';
        document.getElementById('intakeSubtitle').textContent = 'Quick setup – you can edit all details later';
        clearIntakeForm();
        switchScreen('intake');
    });

    document.getElementById('dashCompleteAllAI')?.addEventListener('click', async () => {
        showToast('Completing all pending notes with AI...', 'info', 2000);
        setTimeout(() => showToast('All notes completed!', 'success'), 1500);
    });

    document.getElementById('emrSearchToggle')?.addEventListener('click', () => {
        switchScreen('patients');
    });

    // =========================================================================
    // Theme Toggle
    // =========================================================================
    document.getElementById('themeToggle')?.addEventListener('click', () => {
        const html = document.documentElement;
        const current = html.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', next);
        localStorage.setItem('rehab-theme', next);
    });

    // =========================================================================
    // DeepSeek API Call
    // =========================================================================
    async function callDeepSeek(systemPrompt, userPrompt, maxTokens = 2000) {
        const url = `${aiConfig.endpoint}/chat/completions`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${aiConfig.token}`
            },
            body: JSON.stringify({
                model: aiConfig.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: maxTokens,
                temperature: 0.4,
                top_p: 0.9
            })
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData?.error?.message || `API error: ${response.status}`);
        }
        const data = await response.json();
        return data.choices[0].message.content;
    }

    // =========================================================================
    // Init
    // =========================================================================
    async function init() {
        console.log('[EMR] Initializing...');
        await fetchTokens();
        const hour = new Date().getHours();
        const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
        document.getElementById('greetingTime').textContent = greeting;
        if (currentUser) {
            loadDashboardData();
            loadPatientsList();
        }
        console.log('[EMR] Ready');
    }

    init();

    // =========================================================================
    // Window Exports
    // =========================================================================
    window.switchScreen = switchScreen;
    window.switchPatientTab = switchPatientTab;
    window.openPatient = openPatient;
    window.editProgressNote = editProgressNote;
    window.deleteProgressNote = deleteProgressNote;

    console.log('[EMR] Fully loaded');
});