// docresult.js - Complete document editor with full synchronization to doc.html

document.addEventListener('DOMContentLoaded', async function() {
    // =========================================================================
    // DOM Elements
    // =========================================================================
    const editor = document.getElementById('editorContent');
    const docTitle = document.getElementById('docTitle');
    const docFileNameSpan = document.getElementById('docFileName');
    const docDateSpan = document.getElementById('docDate');
    const docTypeSpan = document.getElementById('docType');
    const docLastEditedSpan = document.getElementById('docLastEdited');
    const wordCountSpan = document.getElementById('wordCount');
    const charCountSpan = document.getElementById('charCount');
    const saveStatusSpan = document.getElementById('saveStatus');
    const toastContainer = document.getElementById('toast-container');

    // Action Buttons
    const shareBtn = document.getElementById('shareBtn');
    const copyBtn = document.getElementById('copyBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const pdfBtn = document.getElementById('pdfBtn');
    const printBtn = document.getElementById('printBtn');
    const saveEditBtn = document.getElementById('saveEditBtn');
    const closeDocBtn = document.getElementById('closeDocBtn');
    const regenerateBtn = document.getElementById('regenerateBtn');
    const deleteBtn = document.getElementById('deleteBtn');

    // Regenerate Modal
    const regenerateModal = document.getElementById('regenerateModal');
    const regenerateInstructions = document.getElementById('regenerateInstructions');
    const confirmRegenerate = document.getElementById('confirmRegenerate');
    const cancelRegenerate = document.getElementById('cancelRegenerate');
    const closeRegenerateModal = document.getElementById('closeRegenerateModal');

    // Share Modal
    const shareModal = document.getElementById('shareModal');
    const shareLink = document.getElementById('shareLink');
    const copyLinkBtn = document.getElementById('copyLinkBtn');
    const shareEmailBtn = document.getElementById('shareEmailBtn');
    const shareWhatsAppBtn = document.getElementById('shareWhatsAppBtn');
    const shareTwitterBtn = document.getElementById('shareTwitterBtn');

    // Formatting elements
    const fontFamilySelect = document.getElementById('fontFamilySelect');
    const fontSizeSelect = document.getElementById('fontSizeSelect');

    // Public toggle
    const publicToggleContainer = document.getElementById('publicToggleContainer');
    const publicToggle = document.getElementById('publicToggle');

    // =========================================================================
    // State
    // =========================================================================
    let currentUser = null;
    let documentData = null;
    let docId = null;
    let docType = null; // 'summary', 'treatment', 'session', 'report', 'nextsession'
    let docIndex = null; // For arrays
    let sessionId = null; // For sessions object
    let reportId = null; // For reports array
    let action = null; // 'new' or 'edit'
    let autoSaveTimer = null;
    let isSaving = false;
    let currentIsOwner = true;
    let currentOwnerId = null;
    let docPath = null;
    let aiConfig = { token: null, endpoint: 'https://api.deepseek.com/v1', model: 'deepseek-chat' };
    let isNewDocument = false;

    // Get URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    docId = urlParams.get('id');
    docType = urlParams.get('type');
    docIndex = urlParams.get('index') !== null ? parseInt(urlParams.get('index')) : null;
    sessionId = urlParams.get('sessionId');
    reportId = urlParams.get('reportId');
    action = urlParams.get('action');

    const database = firebase.database();

    // =========================================================================
    // Helper Functions
    // =========================================================================
    function showToast(message, type = 'success', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), duration);
    }

    function updateWordAndCharCount() {
        const text = editor.innerText || '';
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const chars = text.length;
        wordCountSpan.textContent = `${words} word${words !== 1 ? 's' : ''}`;
        charCountSpan.textContent = `${chars} character${chars !== 1 ? 's' : ''}`;
    }

    function updateSaveStatus(status, isError = false) {
        saveStatusSpan.textContent = status;
        saveStatusSpan.className = '';
        if (isError) {
            saveStatusSpan.style.color = '#dc2626';
        } else if (status === 'Saving...') {
            saveStatusSpan.style.color = '#f59e0b';
            saveStatusSpan.className = 'saving';
        } else if (status === 'Saved') {
            saveStatusSpan.style.color = 'var(--accent)';
            saveStatusSpan.className = 'saved';
        }
    }

    function setEditorReadOnly(readOnly) {
        if (readOnly) {
            editor.setAttribute('contenteditable', 'false');
            document.querySelectorAll('.format-btn, .format-select, .action-btn[id="saveEditBtn"], .action-btn[id="regenerateBtn"], .action-btn[id="deleteBtn"]').forEach(el => {
                if (el) {
                    el.disabled = true;
                    el.style.opacity = '0.5';
                    el.style.cursor = 'not-allowed';
                }
            });
            const statusRight = document.querySelector('.status-right');
            if (statusRight) {
                let msg = document.getElementById('readOnlyMsg');
                if (!msg) {
                    msg = document.createElement('span');
                    msg.id = 'readOnlyMsg';
                    msg.textContent = ' | Read-only mode';
                    msg.style.color = '#f59e0b';
                    statusRight.appendChild(msg);
                }
            }
        } else {
            editor.setAttribute('contenteditable', 'true');
            document.querySelectorAll('.format-btn, .format-select, .action-btn[id="saveEditBtn"], .action-btn[id="regenerateBtn"], .action-btn[id="deleteBtn"]').forEach(el => {
                if (el) {
                    el.disabled = false;
                    el.style.opacity = '1';
                    el.style.cursor = 'pointer';
                }
            });
            const msg = document.getElementById('readOnlyMsg');
            if (msg) msg.remove();
        }
    }

    // =========================================================================
    // Markdown to HTML converter - properly handles markdown formatting
    // =========================================================================
    function markdownToHtml(markdown) {
        if (!markdown) return '<p>No content available</p>';
        
        // If it already looks like HTML, return as is
        if (markdown.trim().startsWith('<') && markdown.includes('>')) {
            return markdown;
        }

        let html = markdown;

        // Remove excessive markdown symbols but keep structure
        // First, handle headings - convert ### to proper HTML
        html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>');

        // Handle bold - **text** or __text__
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

        // Handle italic - *text* or _text_
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        html = html.replace(/_(.*?)_/g, '<em>$1</em>');

        // Handle strikethrough - ~~text~~
        html = html.replace(/~~(.*?)~~/g, '<del>$1</del>');

        // Handle code blocks
        html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Handle unordered lists
        html = html.replace(/^[\s]*[-*+] (.*?)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*?<\/li>)/gs, '<ul>$1</ul>');
        // Clean up duplicate ul tags
        html = html.replace(/<\/ul>\s*<ul>/g, '');

        // Handle ordered lists
        html = html.replace(/^[\s]*\d+\. (.*?)$/gm, '<li>$1</li>');
        // Wrap consecutive li in ol (only if not already wrapped)
        html = html.replace(/(<li>.*?<\/li>)/gs, '<ol>$1</ol>');
        html = html.replace(/<\/ol>\s*<ol>/g, '');

        // Handle blockquotes
        html = html.replace(/^> (.*?)$/gm, '<blockquote>$1</blockquote>');
        // Clean up blockquote stacking
        html = html.replace(/<\/blockquote>\s*<blockquote>/g, '<br>');

        // Handle horizontal rules
        html = html.replace(/^---$/gm, '<hr>');

        // Handle line breaks - convert double newlines to paragraphs
        const paragraphs = html.split('\n\n');
        if (paragraphs.length > 1) {
            html = paragraphs.map(p => {
                p = p.trim();
                if (!p) return '';
                // If it's already wrapped in a tag, leave it
                if (p.match(/^<[a-z]/i)) return p;
                return `<p>${p}</p>`;
            }).join('');
        } else {
            // Single paragraph or no double breaks
            html = html.replace(/\n/g, '<br>');
        }

        // Clean up empty paragraphs
        html = html.replace(/<p><\/p>/g, '');
        html = html.replace(/<p>\s*<\/p>/g, '');

        // Fix nested tags issue: ensure proper nesting
        // If we have <p><h3> etc, remove the outer p
        html = html.replace(/<p><(h[1-6])/g, '<$1');
        html = html.replace(/<\/(h[1-6])><\/p>/g, '</$1>');
        html = html.replace(/<p><(ul|ol|li|blockquote|pre|hr)/g, '<$1');
        html = html.replace(/<\/(ul|ol|li|blockquote|pre)><\/p>/g, '</$1>');

        // Clean up multiple spaces
        html = html.replace(/&nbsp;/g, ' ');
        html = html.replace(/ {2,}/g, ' ');

        return html || '<p>No content available</p>';
    }

    // =========================================================================
    // Firebase Token Fetch
    // =========================================================================
    async function fetchTokens() {
        try {
            const snapshot = await database.ref('tokens/deepseek').once('value');
            const data = snapshot.val();
            if (data?.api_key) {
                aiConfig.token = data.api_key;
                console.log('[docresult] DeepSeek API loaded');
                return true;
            }
            console.warn('[docresult] DeepSeek API key missing');
            return false;
        } catch (error) {
            console.error('[docresult] Token fetch error:', error);
            return false;
        }
    }

    // =========================================================================
    // DeepSeek API Call
    // =========================================================================
    async function callDeepSeek(systemPrompt, userPrompt, maxTokens = 2000) {
        if (!aiConfig.token) {
            await fetchTokens();
            if (!aiConfig.token) throw new Error('AI service not available');
        }
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
    // Save to Firebase (doc.html compatible paths)
    // =========================================================================
    async function saveToFirebase() {
        if (!currentUser || !docId || isSaving) return;
        if (!currentIsOwner) {
            showToast('You cannot edit a shared document.', 'error');
            return;
        }

        isSaving = true;
        updateSaveStatus('Saving...');

        try {
            // Get the content and also store a plain text version
            const htmlContent = editor.innerHTML;
            const plainText = editor.innerText || '';

            // Determine the correct path based on docType
            let path = `patients/${currentUser.uid}/${docId}`;
            let value = null;

            switch (docType) {
                case 'summary':
                    const summariesRef = database.ref(`${path}/summaries`);
                    const snap = await summariesRef.once('value');
                    let summaries = snap.val() || [];
                    if (isNewDocument || docIndex === null || docIndex >= summaries.length) {
                        summaries.push({
                            title: `Summary - ${new Date().toLocaleDateString()}`,
                            content: htmlContent,
                            plainText: plainText,
                            date: new Date().toLocaleDateString()
                        });
                        docIndex = summaries.length - 1;
                    } else {
                        summaries[docIndex].content = htmlContent;
                        summaries[docIndex].plainText = plainText;
                        summaries[docIndex].lastEdited = new Date().toLocaleString();
                    }
                    await summariesRef.set(summaries);
                    documentData = summaries[docIndex];
                    break;

                case 'treatment':
                    const treatmentRef = database.ref(`${path}/treatmentPlans`);
                    const snap2 = await treatmentRef.once('value');
                    let plans = snap2.val() || [];
                    if (isNewDocument || docIndex === null || docIndex >= plans.length) {
                        plans.push({
                            title: `Treatment Plan - ${new Date().toLocaleDateString()}`,
                            content: htmlContent,
                            plainText: plainText,
                            date: new Date().toLocaleDateString(),
                            category: documentData?.category || '',
                            department: documentData?.department || ''
                        });
                        docIndex = plans.length - 1;
                    } else {
                        plans[docIndex].content = htmlContent;
                        plans[docIndex].plainText = plainText;
                        plans[docIndex].lastEdited = new Date().toLocaleString();
                    }
                    await treatmentRef.set(plans);
                    documentData = plans[docIndex];
                    break;

                case 'session':
                    if (isNewDocument || !sessionId) {
                        const sessionRef = database.ref(`${path}/sessions`).push();
                        const sessionData = {
                            date: new Date().toISOString().split('T')[0],
                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            type: 'Session',
                            therapist: currentUser.displayName || currentUser.email || 'Clinician',
                            content: htmlContent,
                            plainText: plainText,
                            signed: false,
                            timestamp: firebase.database.ServerValue.TIMESTAMP
                        };
                        await sessionRef.set(sessionData);
                        sessionId = sessionRef.key;
                        const countRef = database.ref(`${path}/sessionCount`);
                        const countSnap = await countRef.once('value');
                        const count = (countSnap.val() || 0) + 1;
                        await countRef.set(count);
                        documentData = sessionData;
                    } else {
                        const sessionRef = database.ref(`${path}/sessions/${sessionId}`);
                        const snap3 = await sessionRef.once('value');
                        const existing = snap3.val() || {};
                        existing.content = htmlContent;
                        existing.plainText = plainText;
                        existing.lastEdited = new Date().toLocaleString();
                        await sessionRef.set(existing);
                        documentData = existing;
                    }
                    break;

                case 'report':
                    const reportsRef = database.ref(`${path}/reports`);
                    const snap4 = await reportsRef.once('value');
                    let reports = snap4.val() || [];
                    if (isNewDocument || !reportId) {
                        reports.push({
                            id: Date.now().toString(),
                            title: `Report - ${new Date().toLocaleDateString()}`,
                            content: htmlContent,
                            plainText: plainText,
                            date: new Date().toLocaleDateString(),
                            status: 'Draft'
                        });
                        reportId = reports[reports.length - 1].id;
                        docIndex = reports.length - 1;
                    } else {
                        const idx = reports.findIndex(r => r.id === reportId);
                        if (idx >= 0) {
                            reports[idx].content = htmlContent;
                            reports[idx].plainText = plainText;
                            reports[idx].lastEdited = new Date().toLocaleString();
                        }
                    }
                    await reportsRef.set(reports);
                    documentData = reports.find(r => r.id === reportId) || null;
                    break;

                case 'nextsession':
                    const nextRef = database.ref(`${path}/nextSessionPlan`);
                    const nextData = {
                        title: `Next Session - ${new Date().toLocaleDateString()}`,
                        content: htmlContent,
                        plainText: plainText,
                        date: new Date().toLocaleDateString(),
                        completed: false,
                        lastEdited: new Date().toLocaleString()
                    };
                    await nextRef.set(nextData);
                    documentData = nextData;
                    break;

                default:
                    throw new Error('Unknown document type: ' + docType);
            }

            updateSaveStatus('Saved');
            showToast('Changes saved successfully', 'success');

            if (docLastEditedSpan) {
                docLastEditedSpan.textContent = new Date().toLocaleString();
            }

        } catch (error) {
            console.error('Save error:', error);
            updateSaveStatus('Save failed', true);
            showToast('Failed to save changes: ' + error.message, 'error');
        } finally {
            isSaving = false;
        }
    }

    // =========================================================================
    // Load Document
    // =========================================================================
    async function loadDocument() {
        if (!docId) {
            showToast('No document ID provided', 'error');
            editor.innerHTML = '<div class="loading-editor"><i class="fas fa-exclamation-circle"></i> No document found.</div>';
            return;
        }

        try {
            let data = null;
            const path = `patients/${currentUser?.uid || ''}/${docId}`;
            let fullPath = '';

            switch (docType) {
                case 'summary':
                    fullPath = `${path}/summaries`;
                    const snap = await database.ref(fullPath).once('value');
                    const summaries = snap.val() || [];
                    if (isNewDocument || docIndex === null || docIndex >= summaries.length) {
                        data = { title: 'New Summary', content: '<p>Start writing your summary here...</p>', date: new Date().toLocaleDateString() };
                        isNewDocument = true;
                    } else {
                        data = summaries[docIndex];
                        isNewDocument = false;
                    }
                    break;

                case 'treatment':
                    fullPath = `${path}/treatmentPlans`;
                    const snap2 = await database.ref(fullPath).once('value');
                    const plans = snap2.val() || [];
                    if (isNewDocument || docIndex === null || docIndex >= plans.length) {
                        data = { title: 'New Treatment Plan', content: '<p>Start writing your treatment plan here...</p>', date: new Date().toLocaleDateString() };
                        isNewDocument = true;
                    } else {
                        data = plans[docIndex];
                        isNewDocument = false;
                    }
                    break;

                case 'session':
                    if (sessionId) {
                        fullPath = `${path}/sessions/${sessionId}`;
                        const snap3 = await database.ref(fullPath).once('value');
                        data = snap3.val();
                        isNewDocument = false;
                    } else if (action === 'new') {
                        data = { title: 'New Session', content: '<p>Start writing your session notes here...</p>', date: new Date().toLocaleDateString() };
                        isNewDocument = true;
                    } else {
                        throw new Error('No session ID provided');
                    }
                    break;

                case 'report':
                    if (reportId) {
                        fullPath = `${path}/reports`;
                        const snap4 = await database.ref(fullPath).once('value');
                        const reports = snap4.val() || [];
                        const found = reports.find(r => r.id === reportId);
                        if (found) {
                            data = found;
                            isNewDocument = false;
                        } else {
                            throw new Error('Report not found');
                        }
                    } else if (action === 'new') {
                        data = { title: 'New Report', content: '<p>Start writing your report here...</p>', date: new Date().toLocaleDateString() };
                        isNewDocument = true;
                    } else {
                        throw new Error('No report ID provided');
                    }
                    break;

                case 'nextsession':
                    fullPath = `${path}/nextSessionPlan`;
                    const snap5 = await database.ref(fullPath).once('value');
                    data = snap5.val();
                    if (!data) {
                        data = { title: 'New Next Session Plan', content: '<p>Start planning the next session here...</p>', date: new Date().toLocaleDateString() };
                        isNewDocument = true;
                    } else {
                        isNewDocument = false;
                    }
                    break;

                default:
                    throw new Error('Unknown document type: ' + docType);
            }

            if (!data) {
                throw new Error('Document data not found');
            }

            documentData = data;

            // Update metadata
            const typeLabels = {
                summary: 'Summary Report',
                treatment: 'Treatment Plan',
                session: 'Session Note',
                report: 'Clinical Report',
                nextsession: 'Next Session Plan'
            };
            const label = typeLabels[docType] || 'Document';

            if (docTitle) docTitle.textContent = `${label} Editor`;
            if (docFileNameSpan) docFileNameSpan.textContent = data.title || `${label} - ${new Date().toLocaleDateString()}`;
            if (docDateSpan) docDateSpan.textContent = data.date || new Date().toLocaleDateString();
            if (docTypeSpan) docTypeSpan.textContent = label;
            if (docLastEditedSpan) docLastEditedSpan.textContent = data.lastEdited || data.date || '-';

            // Load content with proper markdown conversion
            let content = data.content || data.resultsHtml || data.results || '';
            
            // If content is plain text with markdown, convert it
            if (content && !content.trim().startsWith('<')) {
                content = markdownToHtml(content);
            }
            
            // If still empty or just whitespace
            if (!content || content.trim() === '') {
                content = '<p>No content available</p>';
            }
            
            editor.innerHTML = content;
            updateWordAndCharCount();

            // Show edit mode
            setEditorReadOnly(false);
            publicToggleContainer.style.display = 'none';

        } catch (error) {
            console.error('Load error:', error);
            showToast('Failed to load document: ' + error.message, 'error');
            editor.innerHTML = `<div class="loading-editor"><i class="fas fa-exclamation-circle"></i> Error: ${error.message}</div>`;
        }
    }

    // =========================================================================
    // Regenerate with AI
    // =========================================================================
    async function regenerateDocument(instructions) {
        if (!currentUser) {
            showToast('Please log in to regenerate', 'error');
            return;
        }
        if (!currentIsOwner) {
            showToast('You cannot edit a shared document.', 'error');
            return;
        }

        // Collect context from patient data if available
        let patientData = null;
        try {
            const snap = await database.ref(`patients/${currentUser.uid}/${docId}`).once('value');
            patientData = snap.val();
        } catch (e) {}

        if (!patientData) {
            showToast('Patient data not found', 'error');
            return;
        }

        // Build context
        const context = {
            name: patientData.name || 'Patient',
            diagnosis: patientData.primaryDx || 'Unknown',
            chiefComplaint: patientData.chiefComplaint || '',
            goals: patientData.goals || '',
            category: patientData.category || '',
            department: patientData.department || '',
            assessment: patientData.assessment || '',
            currentContent: editor.innerText || '',
            instructions: instructions || ''
        };

        // Build system and user prompts based on docType
        let systemPrompt = '';
        let userPrompt = '';

        const typePrompts = {
            summary: {
                system: `You are a medical writer. Generate a concise, professional summary report for a ${context.category} patient (${context.department}). Include: patient overview, diagnosis, key findings, progress, and recommendations. Use ONLY plain text with minimal formatting. Do NOT use markdown symbols like ###, **, etc. Use simple line breaks for structure.`,
                user: `Patient: ${context.name}\nDiagnosis: ${context.diagnosis}\nChief Complaint: ${context.chiefComplaint}\nGoals: ${context.goals}\nAssessment: ${context.assessment || 'None provided'}\n\nCurrent summary: ${context.currentContent}\n\nInstructions: ${context.instructions || 'Improve and expand this summary.'}`
            },
            treatment: {
                system: `You are a rehabilitation specialist. Create a concise, professional treatment plan for a ${context.category} patient (${context.department}). Provide a clear, structured plan with actionable steps. Use ONLY plain text with minimal formatting. Do NOT use markdown symbols like ###, **, etc. Use simple line breaks for structure.`,
                user: `Patient: ${context.name}\nDiagnosis: ${context.diagnosis}\nChief Complaint: ${context.chiefComplaint}\nGoals: ${context.goals}\n\nCurrent plan: ${context.currentContent}\n\nInstructions: ${context.instructions || 'Improve this treatment plan.'}`
            },
            session: {
                system: `You are a rehabilitation specialist writing session notes for a ${context.category} patient. Write professional, detailed session notes. Use ONLY plain text with minimal formatting. Do NOT use markdown symbols like ###, **, etc. Use simple line breaks for structure.`,
                user: `Patient: ${context.name}\nDiagnosis: ${context.diagnosis}\nChief Complaint: ${context.chiefComplaint}\nGoals: ${context.goals}\n\nCurrent notes: ${context.currentContent}\n\nInstructions: ${context.instructions || 'Improve these session notes.'}`
            },
            report: {
                system: `You are a medical report writer. Generate a comprehensive, professional clinical report. Include: patient summary, clinical findings, diagnosis, treatment plan, and recommendations. Use ONLY plain text with minimal formatting. Do NOT use markdown symbols like ###, **, etc. Use simple line breaks for structure.`,
                user: `Patient: ${context.name}\nDiagnosis: ${context.diagnosis}\nChief Complaint: ${context.chiefComplaint}\nGoals: ${context.goals}\nAssessment: ${context.assessment || 'None provided'}\n\nCurrent report: ${context.currentContent}\n\nInstructions: ${context.instructions || 'Improve this report.'}`
            },
            nextsession: {
                system: `You are a rehabilitation specialist. Create a detailed plan for the next session for a ${context.category} patient. Include specific exercises, interventions, goals, and timeframes. Use ONLY plain text with minimal formatting. Do NOT use markdown symbols like ###, **, etc. Use simple line breaks for structure.`,
                user: `Patient: ${context.name}\nDiagnosis: ${context.diagnosis}\nChief Complaint: ${context.chiefComplaint}\nGoals: ${context.goals}\n\nCurrent plan: ${context.currentContent}\n\nInstructions: ${context.instructions || 'Create a comprehensive next session plan.'}`
            }
        };

        const prompts = typePrompts[docType] || typePrompts.summary;
        systemPrompt = prompts.system;
        userPrompt = prompts.user;

        showLoading('Regenerating document with AI…', 10);

        try {
            updateLoadingProgress(30, 'Analyzing context…');
            const response = await callDeepSeek(systemPrompt, userPrompt, 2000);

            updateLoadingProgress(80, 'Updating document…');

            // Convert the plain text response to HTML using our markdown converter
            const newContent = markdownToHtml(response);
            editor.innerHTML = newContent;
            updateWordAndCharCount();

            // Auto-save
            await saveToFirebase();

            updateLoadingProgress(100, 'Done!');
            setTimeout(() => {
                hideLoading();
                showToast('Document regenerated successfully!', 'success');
            }, 500);

        } catch (error) {
            console.error('Regenerate error:', error);
            hideLoading();
            showToast('Error regenerating document: ' + error.message, 'error');
        }
    }

    // =========================================================================
    // Delete Document
    // =========================================================================
    async function deleteDocument() {
        if (!currentUser || !docId) {
            showToast('Cannot delete: missing information', 'error');
            return;
        }
        if (!currentIsOwner) {
            showToast('You cannot delete a shared document.', 'error');
            return;
        }

        if (!confirm(`Are you sure you want to delete this ${docType || 'document'}? This action cannot be undone.`)) {
            return;
        }

        try {
            const path = `patients/${currentUser.uid}/${docId}`;

            switch (docType) {
                case 'summary':
                    const snap = await database.ref(`${path}/summaries`).once('value');
                    let summaries = snap.val() || [];
                    if (docIndex !== null && docIndex < summaries.length) {
                        summaries.splice(docIndex, 1);
                        await database.ref(`${path}/summaries`).set(summaries);
                    }
                    break;

                case 'treatment':
                    const snap2 = await database.ref(`${path}/treatmentPlans`).once('value');
                    let plans = snap2.val() || [];
                    if (docIndex !== null && docIndex < plans.length) {
                        plans.splice(docIndex, 1);
                        await database.ref(`${path}/treatmentPlans`).set(plans);
                    }
                    break;

                case 'session':
                    if (sessionId) {
                        await database.ref(`${path}/sessions/${sessionId}`).remove();
                        const countRef = database.ref(`${path}/sessionCount`);
                        const countSnap = await countRef.once('value');
                        const count = Math.max(0, (countSnap.val() || 1) - 1);
                        await countRef.set(count);
                    }
                    break;

                case 'report':
                    if (reportId) {
                        const snap4 = await database.ref(`${path}/reports`).once('value');
                        let reports = snap4.val() || [];
                        reports = reports.filter(r => r.id !== reportId);
                        await database.ref(`${path}/reports`).set(reports);
                    }
                    break;

                case 'nextsession':
                    await database.ref(`${path}/nextSessionPlan`).remove();
                    break;

                default:
                    showToast('Unknown document type for deletion', 'error');
                    return;
            }

            showToast('Document deleted successfully', 'success');
            setTimeout(() => {
                window.location.href = 'doc.html';
            }, 500);

        } catch (error) {
            console.error('Delete error:', error);
            showToast('Error deleting document: ' + error.message, 'error');
        }
    }

    // =========================================================================
    // Loading Overlay
    // =========================================================================
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'aiLoadingOverlay';
    loadingOverlay.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
        z-index: 10000; display: none;
        align-items: center; justify-content: center;
    `;
    loadingOverlay.innerHTML = `
        <div class="loading-content" style="background:var(--card-bg);backdrop-filter:blur(12px);border-radius:1.5rem;padding:2rem 3rem;max-width:400px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
            <div class="loading-spinner" style="width:48px;height:48px;border:4px solid var(--border-light);border-top-color:var(--accent);border-right-color:var(--accent);border-radius:50%;margin:0 auto 1rem;animation:spin 0.8s linear infinite;"></div>
            <p id="aiLoadingMessage" style="color:var(--text-primary);font-size:1rem;font-weight:600;margin-bottom:0.5rem;">Generating with AI…</p>
            <div class="loading-progress-bar" style="height:4px;background:var(--border-light);border-radius:2px;overflow:hidden;margin-top:0.8rem;">
                <div id="aiLoadingProgress" style="height:100%;background:linear-gradient(90deg,var(--accent),var(--accent-light));border-radius:2px;transition:width 0.3s ease;width:0%;"></div>
            </div>
        </div>
    `;
    document.body.appendChild(loadingOverlay);

    function showLoading(message = 'Generating with AI…', progress = 0) {
        document.getElementById('aiLoadingMessage').textContent = message;
        document.getElementById('aiLoadingProgress').style.width = progress + '%';
        loadingOverlay.style.display = 'flex';
    }

    function updateLoadingProgress(progress, message) {
        if (message) document.getElementById('aiLoadingMessage').textContent = message;
        document.getElementById('aiLoadingProgress').style.width = Math.min(progress, 100) + '%';
    }

    function hideLoading() {
        loadingOverlay.style.display = 'none';
        document.getElementById('aiLoadingProgress').style.width = '0%';
    }

    // =========================================================================
    // Formatting Functions
    // =========================================================================
    function execCommand(command, value = null) {
        if (!currentIsOwner) {
            showToast('Read-only mode: cannot edit', 'error', 1500);
            return;
        }
        document.execCommand(command, false, value);
        editor.focus();
        updateWordAndCharCount();
        if (autoSaveTimer) clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(() => saveToFirebase(), 3000);
    }

    document.querySelectorAll('.format-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const command = btn.dataset.command;
            if (command === 'createLink') {
                const url = prompt('Enter URL:', 'https://');
                if (url) execCommand(command, url);
            } else if (command === 'unlink') {
                execCommand('unlink');
            } else if (command === 'undo') {
                document.execCommand('undo');
                editor.focus();
            } else if (command === 'redo') {
                document.execCommand('redo');
                editor.focus();
            } else if (command === 'strikeThrough') {
                document.execCommand('strikeThrough', false, null);
            } else if (command === 'indent') {
                document.execCommand('indent', false, null);
            } else if (command === 'outdent') {
                document.execCommand('outdent', false, null);
            } else {
                execCommand(command);
            }
            updateWordAndCharCount();
        });
    });

    if (fontFamilySelect) {
        fontFamilySelect.addEventListener('change', () => {
            execCommand('fontName', fontFamilySelect.value);
        });
    }

    if (fontSizeSelect) {
        fontSizeSelect.addEventListener('change', () => {
            execCommand('fontSize', fontSizeSelect.value);
        });
    }

    // =========================================================================
    // Auto-save on input
    // =========================================================================
    editor.addEventListener('input', () => {
        if (!currentIsOwner) return;
        updateWordAndCharCount();
        if (autoSaveTimer) clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(() => saveToFirebase(), 3000);
        updateSaveStatus('Editing...');
    });

    editor.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (currentIsOwner) saveToFirebase();
            else showToast('Read-only mode: cannot save', 'error', 1500);
        }
    });

    // =========================================================================
    // Action Handlers
    // =========================================================================

    // Share
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            let shareUrl = `${window.location.origin}${window.location.pathname}?id=${docId}&type=${docType}`;
            if (docIndex !== null) shareUrl += `&index=${docIndex}`;
            if (sessionId) shareUrl += `&sessionId=${sessionId}`;
            if (reportId) shareUrl += `&reportId=${reportId}`;
            shareLink.value = shareUrl;
            shareModal.classList.add('show');
        });
    }

    // Copy
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            try {
                const text = editor.innerText;
                await navigator.clipboard.writeText(text);
                showToast('Content copied to clipboard', 'success');
            } catch (err) {
                showToast('Failed to copy', 'error');
            }
        });
    }

    // Download as Word
    if (downloadBtn) {
        downloadBtn.addEventListener('click', async () => {
            if (!window.docx) {
                showToast('Word export library not loaded', 'error');
                return;
            }
            const original = downloadBtn.innerHTML;
            downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
            try {
                const content = editor.innerText;
                const paragraphs = content.split('\n').map(line => {
                    if (line.trim() === '') return new docx.Paragraph({ text: '' });
                    return new docx.Paragraph({ text: line });
                });
                const doc = new docx.Document({
                    sections: [{
                        properties: {},
                        children: [
                            new docx.Paragraph({
                                text: documentData?.title || 'rehablix Document',
                                heading: docx.HeadingLevel.HEADING_1
                            }),
                            new docx.Paragraph({
                                text: `Date: ${new Date().toLocaleString()}`
                            }),
                            new docx.Paragraph({ text: '' }),
                            ...paragraphs
                        ]
                    }]
                });
                const blob = await docx.Packer.toBlob(doc);
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `rehablix_document_${Date.now()}.docx`;
                a.click();
                URL.revokeObjectURL(url);
                showToast('Document downloaded successfully', 'success');
            } catch (err) {
                console.error('Download error:', err);
                showToast('Export failed', 'error');
            } finally {
                downloadBtn.innerHTML = original;
            }
        });
    }

    // PDF
    if (pdfBtn) {
        pdfBtn.addEventListener('click', () => {
            if (!window.html2pdf) {
                showToast('PDF library not loaded', 'error');
                return;
            }
            const original = pdfBtn.innerHTML;
            pdfBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating PDF...';
            const element = document.getElementById('editorContent');
            const opt = {
                margin: [0.5, 0.5, 0.5, 0.5],
                filename: `rehablix_document_${Date.now()}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, letterRendering: true },
                jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
            };
            html2pdf().set(opt).from(element).save()
                .then(() => showToast('PDF generated successfully', 'success'))
                .catch((err) => { console.error('PDF error:', err);
                    showToast('PDF generation failed', 'error'); })
                .finally(() => { pdfBtn.innerHTML = original; });
        });
    }

    // Print
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head><title>rehablix Document</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; padding: 2rem; max-width: 800px; margin: 0 auto; }
                    h1 { color: #00695c; border-bottom: 2px solid #00695c; padding-bottom: 0.5rem; }
                    h2 { color: #00695c; margin-top: 1.5rem; }
                    @media print { body { margin: 0; padding: 0.5in; } }
                </style>
                </head>
                <body>
                    <h1>${documentData?.title || 'rehablix Document'}</h1>
                    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
                    <hr>
                    ${editor.innerHTML}
                    <hr>
                    <p style="font-size: 0.8rem; color: #666;">Generated by rehablix - Intelligent Rehabilitation Tools</p>
                </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.print();
        });
    }

    // Save Edit
    if (saveEditBtn) {
        saveEditBtn.addEventListener('click', () => {
            if (currentIsOwner) saveToFirebase();
            else showToast('Read-only mode: cannot save', 'error');
        });
    }

    // Regenerate
    if (regenerateBtn) {
        regenerateBtn.addEventListener('click', () => {
            if (!currentIsOwner) {
                showToast('Read-only mode: cannot regenerate', 'error');
                return;
            }
            regenerateInstructions.value = '';
            regenerateModal.style.display = 'flex';
        });
    }

    // Close Regenerate Modal
    if (closeRegenerateModal) {
        closeRegenerateModal.addEventListener('click', () => {
            regenerateModal.style.display = 'none';
        });
    }

    if (cancelRegenerate) {
        cancelRegenerate.addEventListener('click', () => {
            regenerateModal.style.display = 'none';
        });
    }

    if (regenerateModal) {
        regenerateModal.addEventListener('click', (e) => {
            if (e.target === regenerateModal) regenerateModal.style.display = 'none';
        });
    }

    // Confirm Regenerate
    if (confirmRegenerate) {
        confirmRegenerate.addEventListener('click', async () => {
            const instructions = regenerateInstructions.value.trim();
            regenerateModal.style.display = 'none';
            await regenerateDocument(instructions);
        });
    }

    // Delete
    if (deleteBtn) {
        deleteBtn.addEventListener('click', deleteDocument);
    }

    // Close
    if (closeDocBtn) {
        closeDocBtn.addEventListener('click', () => {
            window.location.href = 'doc.html';
        });
    }

    // =========================================================================
    // Share Modal Handlers
    // =========================================================================
    function closeShareModal() {
        shareModal.classList.remove('show');
    }

    document.querySelectorAll('.share-close, .modal-close').forEach(btn => {
        if (btn) btn.addEventListener('click', closeShareModal);
    });

    if (shareModal) {
        shareModal.addEventListener('click', (e) => {
            if (e.target === shareModal) closeShareModal();
        });
    }

    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(shareLink.value);
                showToast('Link copied to clipboard', 'success');
            } catch (err) {
                showToast('Failed to copy link', 'error');
            }
        });
    }

    if (shareEmailBtn) {
        shareEmailBtn.addEventListener('click', () => {
            const subject = encodeURIComponent(`rehablix Document: ${documentData?.title || 'Document'}`);
            const body = encodeURIComponent(`Check out this document: ${shareLink.value}`);
            window.location.href = `mailto:?subject=${subject}&body=${body}`;
        });
    }

    if (shareWhatsAppBtn) {
        shareWhatsAppBtn.addEventListener('click', () => {
            const text = encodeURIComponent(`Check out this rehablix document: ${shareLink.value}`);
            window.open(`https://wa.me/?text=${text}`, '_blank');
        });
    }

    if (shareTwitterBtn) {
        shareTwitterBtn.addEventListener('click', () => {
            const text = encodeURIComponent(`Check out this rehablix document: ${shareLink.value}`);
            window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
        });
    }

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
    // Auth & Initialization
    // =========================================================================
    firebase.auth().onAuthStateChanged(async (user) => {
        currentUser = user;
        await fetchTokens();
        await loadDocument();
    });
});