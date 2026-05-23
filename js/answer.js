// js/answer.js – Assignment Result Editor (mirrors caseresult.js)

if (typeof marked !== 'undefined') {
    marked.setOptions({
        breaks: true,
        gfm: true,
        headerIds: false,
        mangle: false
    });
}

document.addEventListener('DOMContentLoaded', async function() {
    // =========================================================================
    // DOM Elements
    // =========================================================================
    const editor = document.getElementById('editorContent');
    const assignmentTopicSpan = document.getElementById('assignmentTopic');
    const assignmentCourseSpan = document.getElementById('assignmentCourse');
    const assignmentTypeSpan = document.getElementById('assignmentType');
    const assignmentVolumeSpan = document.getElementById('assignmentVolume');
    const assignmentToneSpan = document.getElementById('assignmentTone');
    const assignmentDateSpan = document.getElementById('assignmentDate');
    const assignmentLastEditedSpan = document.getElementById('assignmentLastEdited');
    const wordCountSpan = document.getElementById('wordCount');
    const charCountSpan = document.getElementById('charCount');
    const saveStatusSpan = document.getElementById('saveStatus');
    const toastContainer = document.getElementById('toast-container');
    const pageModeLabel = document.getElementById('pageModeLabel');

    const pageTitle = document.querySelector('head title');
    const headerTitle = document.querySelector('.answer-header-content h1');

    // Action Buttons
    const shareBtn = document.getElementById('shareBtn');
    const copyBtn = document.getElementById('copyBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const pdfBtn = document.getElementById('pdfBtn');
    const printBtn = document.getElementById('printBtn');
    const saveEditBtn = document.getElementById('saveEditBtn');
    const closeAssignmentBtn = document.getElementById('closeAssignmentBtn');

    // Share Modal
    const shareModal = document.getElementById('shareModal');
    const shareLink = document.getElementById('shareLink');
    const copyLinkBtn = document.getElementById('copyLinkBtn');
    const shareEmailBtn = document.getElementById('shareEmailBtn');
    const shareWhatsAppBtn = document.getElementById('shareWhatsAppBtn');
    const shareTwitterBtn = document.getElementById('shareTwitterBtn');

    // Formatting
    const fontFamilySelect = document.getElementById('fontFamilySelect');
    const fontSizeSelect = document.getElementById('fontSizeSelect');

    // Public toggle
    const publicToggleContainer = document.getElementById('publicToggleContainer');
    const publicToggle = document.getElementById('publicToggle');

    // =========================================================================
    // State
    // =========================================================================
    let currentUser = null;
    let assignmentData = null;
    let historyId = null;
    let autoSaveTimer = null;
    let isSaving = false;
    let currentIsOwner = false;

    const database = firebase.database();

    // Get historyId from URL query parameter
    const urlParams = new URLSearchParams(window.location.search);
    historyId = urlParams.get('id');

    if (!historyId) {
        showToast('No assignment ID provided', 'error');
        editor.innerHTML = '<div class="loading-editor"><i class="fas fa-exclamation-circle"></i> No assignment found. Please generate one first.</div>';
        return;
    }

    // =========================================================================
    // Helpers
    // =========================================================================
    function showToast(message, type = 'success', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i><span>${message}</span>`;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), duration);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
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
        if (isError) {
            saveStatusSpan.style.color = '#dc2626';
        } else if (status === 'Saving...') {
            saveStatusSpan.style.color = '#f59e0b';
        } else if (status === 'Saved') {
            saveStatusSpan.style.color = 'var(--answer-accent)';
        } else {
            saveStatusSpan.style.color = 'var(--answer-accent)';
        }
    }

    function setEditorReadOnly(readOnly) {
        if (readOnly) {
            editor.setAttribute('contenteditable', 'false');
            document.querySelectorAll('.format-btn, .format-select, .action-btn[id="saveEditBtn"]').forEach(el => {
                el.disabled = true;
                el.style.opacity = '0.5';
                el.style.cursor = 'not-allowed';
            });
            const editModeSpan = document.getElementById('editMode');
            if (editModeSpan) editModeSpan.textContent = 'Read-only Mode';
            showToast('📖 You are viewing a shared document (read-only)', 'info', 3000);
        } else {
            editor.setAttribute('contenteditable', 'true');
            document.querySelectorAll('.format-btn, .format-select, .action-btn[id="saveEditBtn"]').forEach(el => {
                el.disabled = false;
                el.style.opacity = '1';
                el.style.cursor = 'pointer';
            });
            const editModeSpan = document.getElementById('editMode');
            if (editModeSpan) editModeSpan.textContent = 'Editing Mode';
        }
    }

    function updatePublicToggleVisibility() {
        if (!publicToggleContainer || !publicToggle) return;
        if (currentIsOwner && assignmentData) {
            publicToggleContainer.style.display = 'flex';
            publicToggle.checked = assignmentData.isPublic === true;
        } else {
            publicToggleContainer.style.display = 'none';
        }
    }

    async function togglePublic(event) {
        const isChecked = event.target.checked;
        if (!currentUser || !historyId || !currentIsOwner) {
            showToast('You are not the owner of this document.', 'error');
            event.target.checked = !isChecked;
            return;
        }

        try {
            const updates = {
                isPublic: isChecked,
                lastEdited: firebase.database.ServerValue.TIMESTAMP,
                lastEditedDate: new Date().toLocaleString()
            };
            await database.ref(`history/${currentUser.uid}/assignments/${historyId}`).update(updates);
            assignmentData.isPublic = isChecked;

            if (isChecked) {
                const publicData = {
                    ...assignmentData,
                    ownerId: currentUser.uid,
                    lastEdited: firebase.database.ServerValue.TIMESTAMP,
                    lastEditedDate: new Date().toLocaleString()
                };
                await database.ref(`publicAssignments/${historyId}`).set(publicData);
                showToast('✅ Assignment is now public. Anyone with the link can view it.', 'success');
            } else {
                await database.ref(`publicAssignments/${historyId}`).remove();
                showToast('🔒 Assignment is now private.', 'success');
            }

            if (assignmentLastEditedSpan) {
                assignmentLastEditedSpan.textContent = new Date().toLocaleString();
            }
        } catch (error) {
            console.error('Error toggling public status:', error);
            showToast('Failed to update sharing setting', 'error');
            event.target.checked = !isChecked;
        }
    }

    async function saveToFirebase() {
        if (!currentUser || !historyId || isSaving) return;
        if (!currentIsOwner) {
            showToast('You cannot edit a shared document.', 'error');
            return;
        }

        isSaving = true;
        updateSaveStatus('Saving...');

        try {
            const htmlContent = editor.innerHTML;

            const updates = {
                html: htmlContent,
                plainPreview: editor.innerText.substring(0, 200),
                lastEdited: firebase.database.ServerValue.TIMESTAMP,
                lastEditedDate: new Date().toLocaleString()
            };

            await database.ref(`history/${currentUser.uid}/assignments/${historyId}`).update(updates);

            if (assignmentData) {
                assignmentData.html = htmlContent;
                assignmentData.lastEditedDate = new Date().toLocaleString();
            }

            if (assignmentData && assignmentData.isPublic) {
                const publicData = {
                    ...assignmentData,
                    ownerId: currentUser.uid,
                    lastEdited: firebase.database.ServerValue.TIMESTAMP,
                    lastEditedDate: new Date().toLocaleString()
                };
                await database.ref(`publicAssignments/${historyId}`).set(publicData);
            }

            updateSaveStatus('Saved');
            showToast('Changes saved successfully', 'success');

            if (assignmentLastEditedSpan) {
                assignmentLastEditedSpan.textContent = assignmentData?.lastEditedDate || new Date().toLocaleString();
            }
        } catch (error) {
            console.error('Save error:', error);
            updateSaveStatus('Save failed', true);
            showToast('Failed to save changes', 'error');
        } finally {
            isSaving = false;
        }
    }

    // =========================================================================
    // Formatting
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
        updateSaveStatus('Editing...');
    }

    document.querySelectorAll('.format-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const command = btn.dataset.command;

            if (command === 'createLink') {
                const url = prompt('Enter URL:', 'https://');
                if (url) execCommand('createLink', url);
            } else if (command === 'unlink') {
                execCommand('unlink');
            } else if (command === 'undo') {
                document.execCommand('undo');
                editor.focus();
                updateWordAndCharCount();
            } else if (command === 'redo') {
                document.execCommand('redo');
                editor.focus();
                updateWordAndCharCount();
            } else if (command === 'strikeThrough') {
                execCommand('strikeThrough');
            } else if (command === 'indent') {
                execCommand('indent');
            } else if (command === 'outdent') {
                execCommand('outdent');
            } else {
                execCommand(command);
            }
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
    // Load Assignment
    // =========================================================================
    async function loadAssignment() {
        try {
            let data = null;
            let ownerId = null;
            currentIsOwner = false;

            // Try loading from user's own history
            if (currentUser) {
                const snapshot = await database.ref(`history/${currentUser.uid}/assignments/${historyId}`).once('value');
                data = snapshot.val();
                if (data) {
                    ownerId = currentUser.uid;
                    currentIsOwner = true;
                    console.log('Loaded as owner');
                }
            }

            // If not owner, try public
            if (!data) {
                const publicSnapshot = await database.ref(`publicAssignments/${historyId}`).once('value');
                data = publicSnapshot.val();
                if (data) {
                    ownerId = data.ownerId;
                    currentIsOwner = currentUser && currentUser.uid === ownerId;
                    console.log('Loaded from public, isOwner:', currentIsOwner);
                }
            }

            // If still no data, try localStorage fallback
            if (!data) {
                const stored = localStorage.getItem('rehab_assignment_current');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (parsed.historyId === historyId) {
                        data = parsed;
                        currentIsOwner = true; // localStorage is always owner
                        console.log('Loaded from localStorage');
                    }
                }
            }

            if (!data) {
                throw new Error('Assignment not found or is private');
            }

            assignmentData = data;

            // Update metadata
            if (assignmentTopicSpan) {
                assignmentTopicSpan.textContent = data.topic || 'Untitled Assignment';
            }
            if (assignmentCourseSpan) {
                assignmentCourseSpan.textContent = data.course || 'N/A';
            }
            if (assignmentTypeSpan) {
                assignmentTypeSpan.textContent = data.typeLabel || data.type || 'N/A';
            }
            if (assignmentVolumeSpan) {
                assignmentVolumeSpan.textContent = data.volume && data.volumeUnit 
                    ? `${data.volume} ${data.volumeUnit}` 
                    : '-';
            }
            if (assignmentToneSpan) {
                assignmentToneSpan.textContent = data.toneLabel || data.tone || '-';
            }
            if (assignmentDateSpan) {
                assignmentDateSpan.textContent = data.date || new Date().toLocaleDateString();
            }
            if (assignmentLastEditedSpan) {
                assignmentLastEditedSpan.textContent = data.lastEditedDate || data.date || '-';
            }

            let content = '';
            if (data.html && data.html.trim().length > 0) {
                content = data.html;
            } else {
                content = '<p>No content available</p>';
            }

            editor.innerHTML = content;
            updateWordAndCharCount();
            setEditorReadOnly(!currentIsOwner);
            updatePublicToggleVisibility();

            console.log('Assignment loaded successfully');

        } catch (err) {
            console.error('Load error:', err);
            showToast('Failed to load assignment: ' + err.message, 'error');
            editor.innerHTML = '<div class="loading-editor"><i class="fas fa-exclamation-circle"></i> Error loading assignment. It may be private or does not exist.</div>';
        }
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
            if (currentIsOwner) {
                saveToFirebase();
            } else {
                showToast('Read-only mode: cannot save', 'error', 1500);
            }
        }
    });

    // =========================================================================
    // Action Handlers
    // =========================================================================
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            const shareUrl = `${window.location.origin}${window.location.pathname}?id=${historyId}`;
            shareLink.value = shareUrl;
            shareModal.classList.add('show');
        });
    }

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

                const topic = assignmentData?.topic || 'Assignment';
                const course = assignmentData?.course || '';

                const doc = new docx.Document({
                    sections: [{
                        children: [
                            new docx.Paragraph({ 
                                text: `Assignment: ${topic}`, 
                                heading: docx.HeadingLevel.HEADING_1 
                            }),
                            new docx.Paragraph({ 
                                text: `Course: ${course}` 
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
                a.download = `Assignment_${topic.replace(/\s+/g, '_')}_${Date.now()}.docx`;
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

    if (pdfBtn) {
        pdfBtn.addEventListener('click', () => {
            if (!window.html2pdf) {
                showToast('PDF library not loaded', 'error');
                return;
            }

            const original = pdfBtn.innerHTML;
            pdfBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating PDF...';

            const element = document.getElementById('editorContent');
            const topic = assignmentData?.topic || 'assignment';

            const opt = {
                margin: [0.5, 0.5, 0.5, 0.5],
                filename: `Assignment_${topic.replace(/\s+/g, '_')}_${Date.now()}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, letterRendering: true },
                jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
            };

            html2pdf().set(opt).from(element).save()
                .then(() => showToast('PDF generated successfully', 'success'))
                .catch(err => {
                    console.error('PDF error:', err);
                    showToast('PDF generation failed', 'error');
                })
                .finally(() => {
                    pdfBtn.innerHTML = original;
                });
        });
    }

    if (printBtn) {
        printBtn.addEventListener('click', () => {
            const printWindow = window.open('', '_blank');
            const topic = assignmentData?.topic || 'Assignment';
            const course = assignmentData?.course || 'N/A';

            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Assignment - ${topic}</title>
                    <style>
                        body { 
                            font-family: Arial, sans-serif; 
                            line-height: 1.6; 
                            padding: 2rem; 
                            max-width: 800px; 
                            margin: 0 auto;
                        }
                        h1 { color: #009688; border-bottom: 2px solid #009688; padding-bottom: 0.5rem; }
                        h2 { color: #009688; margin-top: 1.5rem; }
                        h3 { color: #4f46e5; }
                        table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background: #f5f5f5; }
                        ul, ol { margin: 0.5rem 0; padding-left: 1.5rem; }
                        @media print {
                            body { margin: 0; padding: 0.5in; }
                        }
                    </style>
                </head>
                <body>
                    <h1>Assignment: ${topic}</h1>
                    <p><strong>Course:</strong> ${course}</p>
                    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
                    <hr>
                    ${editor.innerHTML}
                    <hr>
                    <p style="font-size: 0.8rem; color: #666;">Generated by rehablix</p>
                </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.print();
        });
    }

    if (saveEditBtn) {
        saveEditBtn.addEventListener('click', () => {
            if (currentIsOwner) {
                saveToFirebase();
            } else {
                showToast('Read-only mode: cannot save', 'error');
            }
        });
    }

    if (closeAssignmentBtn) {
        closeAssignmentBtn.addEventListener('click', () => {
            window.location.href = 'assignment.html';
        });
    }

    if (publicToggle) {
        publicToggle.addEventListener('change', togglePublic);
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
            const topic = assignmentData?.topic || 'assignment';
            const subject = encodeURIComponent(`Assignment: ${topic}`);
            const body = encodeURIComponent(`Check out this assignment: ${shareLink.value}`);
            window.location.href = `mailto:?subject=${subject}&body=${body}`;
        });
    }

    if (shareWhatsAppBtn) {
        shareWhatsAppBtn.addEventListener('click', () => {
            const topic = assignmentData?.topic || 'assignment';
            const text = encodeURIComponent(`Assignment: ${topic} - ${shareLink.value}`);
            window.open(`https://wa.me/?text=${text}`, '_blank');
        });
    }

    if (shareTwitterBtn) {
        shareTwitterBtn.addEventListener('click', () => {
            const topic = assignmentData?.topic || 'assignment';
            const text = encodeURIComponent(`Assignment: ${topic} ${shareLink.value}`);
            window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
        });
    }

    // =========================================================================
    // Auth & Init
    // =========================================================================
    firebase.auth().onAuthStateChanged(async (user) => {
        currentUser = user;
        console.log('Auth state changed, user:', user?.email || 'none');
        await loadAssignment();
    });

    updateWordAndCharCount();
    console.log('Assignment Editor initialized');
});