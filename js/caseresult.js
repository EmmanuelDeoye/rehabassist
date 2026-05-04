// js/caseresult.js - Case Result Editor (presentation / report / documentation)

// Configure marked for proper rendering
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
    const casePatientNameSpan = document.getElementById('casePatientName');
    const caseDateSpan = document.getElementById('caseDate');
    const caseProfessionSpan = document.getElementById('caseProfession');
    const caseDiagnosisSpan = document.getElementById('caseDiagnosis');
    const caseLastEditedSpan = document.getElementById('caseLastEdited');
    const wordCountSpan = document.getElementById('wordCount');
    const charCountSpan = document.getElementById('charCount');
    const saveStatusSpan = document.getElementById('saveStatus');
    const toastContainer = document.getElementById('toast-container');
    const pageModeLabel = document.getElementById('pageModeLabel');
    
    // Title element
    const pageTitle = document.querySelector('head title');
    const headerTitle = document.querySelector('.case-header-content h1');
    
    // Action Buttons
    const shareBtn = document.getElementById('shareBtn');
    const copyBtn = document.getElementById('copyBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const pdfBtn = document.getElementById('pdfBtn');
    const printBtn = document.getElementById('printBtn');
    const saveEditBtn = document.getElementById('saveEditBtn');
    const closeCaseBtn = document.getElementById('closeCaseBtn');
    
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
    let analysisData = null;
    let historyId = null;
    let autoSaveTimer = null;
    let isSaving = false;
    let currentIsOwner = false;
    
    const database = firebase.database();
    
    const urlParams = new URLSearchParams(window.location.search);
    historyId = urlParams.get('id');
    
    if (!historyId) {
        showToast('No document ID provided', 'error');
        editor.innerHTML = '<div class="loading-editor"><i class="fas fa-exclamation-circle"></i> No document found. Please generate one first.</div>';
        return;
    }
    
    // =========================================================================
    // Helper: mode display name
    // =========================================================================
    function getModeLabel(mode) {
        const labels = {
            presentation: 'Case Presentation',
            report: 'Clinical Report',
            documentation: 'Documentation'
        };
        return labels[mode] || 'Clinical Document';
    }
    
    function getModeShort(mode) {
        const shorts = {
            presentation: 'case presentation',
            report: 'report',
            documentation: 'documentation'
        };
        return shorts[mode] || 'document';
    }
    
    // =========================================================================
    // Helper Functions
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
            saveStatusSpan.style.color = 'var(--case-accent)';
        } else {
            saveStatusSpan.style.color = 'var(--case-accent)';
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
        if (currentIsOwner && analysisData) {
            publicToggleContainer.style.display = 'flex';
            publicToggle.checked = analysisData.isPublic === true;
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
            await database.ref(`users/${currentUser.uid}/caseHistory/${historyId}`).update(updates);
            analysisData.isPublic = isChecked;
    
            if (isChecked) {
                const publicData = {
                    ...analysisData,
                    ownerId: currentUser.uid,
                    lastEdited: firebase.database.ServerValue.TIMESTAMP,
                    lastEditedDate: new Date().toLocaleString()
                };
                await database.ref(`publicAnalysis/${historyId}`).set(publicData);
                showToast('✅ Document is now public. Anyone with the link can view it.', 'success');
            } else {
                await database.ref(`publicAnalysis/${historyId}`).remove();
                showToast('🔒 Document is now private.', 'success');
            }
            
            if (caseLastEditedSpan) {
                caseLastEditedSpan.textContent = new Date().toLocaleString();
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
            const markdown = htmlToMarkdown(htmlContent);
            
            const updates = {
                resultsMarkdown: markdown,
                resultsHtml: htmlContent,
                lastEdited: firebase.database.ServerValue.TIMESTAMP,
                lastEditedDate: new Date().toLocaleString()
            };
            
            await database.ref(`users/${currentUser.uid}/caseHistory/${historyId}`).update(updates);
            
            if (analysisData) {
                analysisData.resultsMarkdown = markdown;
                analysisData.resultsHtml = htmlContent;
                analysisData.lastEditedDate = new Date().toLocaleString();
            }
            
            if (analysisData && analysisData.isPublic) {
                const publicData = {
                    ...analysisData,
                    ownerId: currentUser.uid,
                    lastEdited: firebase.database.ServerValue.TIMESTAMP,
                    lastEditedDate: new Date().toLocaleString()
                };
                await database.ref(`publicAnalysis/${historyId}`).set(publicData);
            }
            
            updateSaveStatus('Saved');
            showToast('Changes saved successfully', 'success');
            
            if (caseLastEditedSpan) {
                caseLastEditedSpan.textContent = analysisData?.lastEditedDate || new Date().toLocaleString();
            }
        } catch (error) {
            console.error('Save error:', error);
            updateSaveStatus('Save failed', true);
            showToast('Failed to save changes', 'error');
        } finally {
            isSaving = false;
        }
    }
    
    function htmlToMarkdown(html) {
        let text = html;
        
        text = text.replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n');
        text = text.replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n');
        text = text.replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n');
        text = text.replace(/<h4>(.*?)<\/h4>/gi, '#### $1\n\n');
        
        text = text.replace(/<strong>(.*?)<\/strong>/gi, '**$1**');
        text = text.replace(/<b>(.*?)<\/b>/gi, '**$1**');
        text = text.replace(/<em>(.*?)<\/em>/gi, '*$1*');
        text = text.replace(/<i>(.*?)<\/i>/gi, '*$1*');
        
        text = text.replace(/<ul>(.*?)<\/ul>/gis, (match, content) => {
            return content.replace(/<li>(.*?)<\/li>/gi, '- $1\n');
        });
        text = text.replace(/<ol>(.*?)<\/ol>/gis, (match, content) => {
            let i = 1;
            return content.replace(/<li>(.*?)<\/li>/gi, () => `${i++}. $1\n`);
        });
        
        text = text.replace(/<br\s*\/?>/gi, '\n');
        text = text.replace(/<p>(.*?)<\/p>/gi, '$1\n\n');
        
        text = text.replace(/<[^>]*>/g, '');
        
        const textarea = document.createElement('textarea');
        textarea.innerHTML = text;
        text = textarea.value;
        
        return text.trim();
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
    // Load Analysis
    // =========================================================================
    async function loadAnalysis() {
        try {
            let data = null;
            let ownerId = null;
            currentIsOwner = false;
            
            if (currentUser) {
                const snapshot = await database.ref(`users/${currentUser.uid}/caseHistory/${historyId}`).once('value');
                data = snapshot.val();
                if (data) {
                    ownerId = currentUser.uid;
                    currentIsOwner = true;
                    console.log('Loaded as owner');
                }
            }
            
            if (!data) {
                const publicSnapshot = await database.ref(`publicAnalysis/${historyId}`).once('value');
                data = publicSnapshot.val();
                if (data) {
                    ownerId = data.ownerId;
                    currentIsOwner = currentUser && currentUser.uid === ownerId;
                    console.log('Loaded from public, isOwner:', currentIsOwner);
                }
            }
            
            // Accept presentation, report, documentation
            const validTypes = ['presentation', 'report', 'documentation'];
            if (!data || !validTypes.includes(data.contentType)) {
                throw new Error('Document not found or is private');
            }
            
            analysisData = data;
            const mode = data.contentType; // 'presentation', 'report', 'documentation'
            const modeLabel = getModeLabel(mode);
            const modeShort = getModeShort(mode);
            
            // Update page title & header & nav subtitle
            if (pageTitle) pageTitle.textContent = `rehablix · ${modeLabel}`;
            if (headerTitle) headerTitle.textContent = modeLabel;
            if (pageModeLabel) pageModeLabel.textContent = modeShort;
            
            // Update metadata
            if (casePatientNameSpan) {
                const age = data.patientAge || '';
                const gender = data.patientGender || '';
                const details = [age, gender].filter(Boolean).join(', ');
                casePatientNameSpan.textContent = details 
                    ? `${data.patientName || 'Patient'} (${details})` 
                    : (data.patientName || 'Patient');
            }
            if (caseDateSpan) {
                caseDateSpan.textContent = data.date || new Date().toLocaleDateString();
            }
            if (caseProfessionSpan) {
                caseProfessionSpan.textContent = data.profession || 'Healthcare Professional';
            }
            if (caseDiagnosisSpan) {
                caseDiagnosisSpan.textContent = data.diagnosis || 'Not specified';
            }
            if (caseLastEditedSpan) {
                caseLastEditedSpan.textContent = data.lastEditedDate || data.date || '-';
            }
            
            let content = '';
            if (data.resultsHtml && data.resultsHtml.trim().length > 0) {
                content = data.resultsHtml;
            } else if (data.resultsMarkdown && data.resultsMarkdown.trim().length > 0) {
                content = marked.parse(data.resultsMarkdown);
            } else if (data.results && data.results.trim().length > 0) {
                content = marked.parse(data.results);
            } else {
                content = '<p>No content available</p>';
            }
            
            editor.innerHTML = content;
            updateWordAndCharCount();
            setEditorReadOnly(!currentIsOwner);
            updatePublicToggleVisibility();
            
            console.log(`${modeLabel} loaded successfully`);
            
        } catch (err) {
            console.error('Load error:', err);
            showToast('Failed to load document: ' + err.message, 'error');
            editor.innerHTML = '<div class="loading-editor"><i class="fas fa-exclamation-circle"></i> Error loading document. It may be private or does not exist.</div>';
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
                
                const patientName = analysisData?.patientName || 'Patient';
                const profession = analysisData?.profession || '';
                const diagnosis = analysisData?.diagnosis || '';
                const mode = analysisData?.contentType || 'presentation';
                const modeLabel = getModeLabel(mode);
                
                const doc = new docx.Document({
                    sections: [{
                        children: [
                            new docx.Paragraph({ 
                                text: `${modeLabel} - ${patientName}`, 
                                heading: docx.HeadingLevel.HEADING_1 
                            }),
                            new docx.Paragraph({ 
                                text: `Date: ${new Date().toLocaleString()}` 
                            }),
                            new docx.Paragraph({ 
                                text: `Clinician: ${profession}` 
                            }),
                            new docx.Paragraph({ 
                                text: `Diagnosis: ${diagnosis}` 
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
                a.download = `${modeLabel.replace(/\s+/g, '_')}_${patientName.replace(/\s+/g, '_')}_${Date.now()}.docx`;
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
            const patientName = analysisData?.patientName || 'patient';
            const mode = analysisData?.contentType || 'presentation';
            const modeLabel = getModeLabel(mode);
            
            const opt = {
                margin: [0.5, 0.5, 0.5, 0.5],
                filename: `${modeLabel.replace(/\s+/g, '_')}_${patientName.replace(/\s+/g, '_')}_${Date.now()}.pdf`,
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
            const patientName = analysisData?.patientName || 'Patient';
            const profession = analysisData?.profession || 'N/A';
            const diagnosis = analysisData?.diagnosis || 'N/A';
            const mode = analysisData?.contentType || 'presentation';
            const modeLabel = getModeLabel(mode);
            
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${modeLabel} - ${patientName}</title>
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
                    <h1>${modeLabel} - ${patientName}</h1>
                    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
                    <p><strong>Clinician:</strong> ${profession}</p>
                    <p><strong>Diagnosis:</strong> ${diagnosis}</p>
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
    
    if (closeCaseBtn) {
        closeCaseBtn.addEventListener('click', () => {
            window.location.href = 'presentation.html';
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
            const mode = analysisData?.contentType || 'presentation';
            const modeLabel = getModeLabel(mode);
            const subject = encodeURIComponent(`${modeLabel}: ${analysisData?.patientName || 'Patient'}`);
            const body = encodeURIComponent(`Check out this ${modeLabel.toLowerCase()}: ${shareLink.value}`);
            window.location.href = `mailto:?subject=${subject}&body=${body}`;
        });
    }
    
    if (shareWhatsAppBtn) {
        shareWhatsAppBtn.addEventListener('click', () => {
            const mode = analysisData?.contentType || 'presentation';
            const modeLabel = getModeLabel(mode);
            const text = encodeURIComponent(`Check out this ${modeLabel.toLowerCase()}: ${shareLink.value}`);
            window.open(`https://wa.me/?text=${text}`, '_blank');
        });
    }
    
    if (shareTwitterBtn) {
        shareTwitterBtn.addEventListener('click', () => {
            const mode = analysisData?.contentType || 'presentation';
            const modeLabel = getModeLabel(mode);
            const text = encodeURIComponent(`${modeLabel}: ${shareLink.value}`);
            window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
        });
    }
    
    // =========================================================================
    // Auth & Init
    // =========================================================================
    firebase.auth().onAuthStateChanged(async (user) => {
        currentUser = user;
        console.log('Auth state changed, user:', user?.email || 'none');
        await loadAnalysis();
    });
    
    updateWordAndCharCount();
    console.log('Case Result Editor initialized (multi-mode)');
});