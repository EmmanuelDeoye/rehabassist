// docresult.js - Complete document editor with public/private sharing support

document.addEventListener('DOMContentLoaded', async function() {
    // =========================================================================
    // DOM Elements
    // =========================================================================
    const editor = document.getElementById('editorContent');
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
    let analysisData = null;
    let historyId = null;
    let autoSaveTimer = null;
    let isSaving = false;
    let currentIsOwner = false;
    let currentOwnerId = null;
    
    // Get ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    historyId = urlParams.get('id');
    
    if (!historyId) {
        showToast('No analysis ID provided', 'error');
        editor.innerHTML = '<div class="loading-editor"><i class="fas fa-exclamation-circle"></i> No analysis found. Please go back and generate an analysis first.</div>';
        return;
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
            saveStatusSpan.style.color = 'var(--accent)';
        }
        setTimeout(() => {
            if (saveStatusSpan.textContent === status && !isError) {
                saveStatusSpan.style.color = 'var(--accent)';
            }
        }, 2000);
    }
    
    // Enable/disable formatting toolbar and editor based on ownership
    function setEditorReadOnly(readOnly) {
        if (readOnly) {
            editor.setAttribute('contenteditable', 'false');
            // Disable all formatting buttons
            document.querySelectorAll('.format-btn, .format-select, .action-btn[id="saveEditBtn"]').forEach(el => {
                el.disabled = true;
                el.style.opacity = '0.5';
                el.style.cursor = 'not-allowed';
            });
            // Show a message
            const statusRight = document.querySelector('.status-right');
            if (statusRight) {
                const readOnlyMsg = document.createElement('span');
                readOnlyMsg.id = 'readOnlyMsg';
                readOnlyMsg.textContent = ' | Read-only mode';
                readOnlyMsg.style.color = '#f59e0b';
                if (!document.getElementById('readOnlyMsg')) statusRight.appendChild(readOnlyMsg);
            }
        } else {
            editor.setAttribute('contenteditable', 'true');
            document.querySelectorAll('.format-btn, .format-select, .action-btn[id="saveEditBtn"]').forEach(el => {
                el.disabled = false;
                el.style.opacity = '1';
                el.style.cursor = 'pointer';
            });
            const readOnlyMsg = document.getElementById('readOnlyMsg');
            if (readOnlyMsg) readOnlyMsg.remove();
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
    
    // Toggle public/private status
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
            await firebase.database().ref(`users/${currentUser.uid}/analysisHistory/${historyId}`).update(updates);
            analysisData.isPublic = isChecked;
    
            if (isChecked) {
                // Create a public copy
                const publicData = {
                    ...analysisData,
                    ownerId: currentUser.uid,
                    lastEdited: firebase.database.ServerValue.TIMESTAMP,
                    lastEditedDate: new Date().toLocaleString()
                };
                await firebase.database().ref(`publicAnalysis/${historyId}`).set(publicData);
                showToast('✅ Document is now public. Anyone with the link can view it.', 'success');
            } else {
                // Remove public copy
                await firebase.database().ref(`publicAnalysis/${historyId}`).remove();
                showToast('🔒 Document is now private.', 'success');
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
            
            await firebase.database().ref(`users/${currentUser.uid}/analysisHistory/${historyId}`).update(updates);
            
            // Update local data
            if (analysisData) {
                analysisData.resultsMarkdown = markdown;
                analysisData.resultsHtml = htmlContent;
                analysisData.lastEditedDate = new Date().toLocaleString();
            }
            
            // If public, update the public copy
            if (analysisData && analysisData.isPublic) {
                const publicData = {
                    ...analysisData,
                    ownerId: currentUser.uid,
                    lastEdited: firebase.database.ServerValue.TIMESTAMP,
                    lastEditedDate: new Date().toLocaleString()
                };
                await firebase.database().ref(`publicAnalysis/${historyId}`).set(publicData);
            }
            
            updateSaveStatus('Saved');
            showToast('Changes saved successfully', 'success');
            
            // Update last edited display
            if (docLastEditedSpan) {
                docLastEditedSpan.textContent = analysisData?.lastEditedDate || new Date().toLocaleString();
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
        // Simple conversion - for complex content, you might want to use a library
        // This is a basic version that preserves structure
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
        return text.trim();
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
        
        // Trigger auto-save
        if (autoSaveTimer) clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(() => saveToFirebase(), 3000);
    }
    
    // Apply formatting buttons
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
    
    // Font Family
    if (fontFamilySelect) {
        fontFamilySelect.addEventListener('change', () => {
            execCommand('fontName', fontFamilySelect.value);
        });
    }
    
    // Font Size
    if (fontSizeSelect) {
        fontSizeSelect.addEventListener('change', () => {
            execCommand('fontSize', fontSizeSelect.value);
        });
    }
    
    // =========================================================================
    // Load Analysis (with public/private support)
    // =========================================================================
    async function loadAnalysis() {
        try {
            let data = null;
            let ownerId = null;
            currentIsOwner = false;
            
            // First, try to load from current user's history (if logged in)
            if (currentUser) {
                const snapshot = await firebase.database().ref(`users/${currentUser.uid}/analysisHistory/${historyId}`).once('value');
                data = snapshot.val();
                if (data) {
                    ownerId = currentUser.uid;
                    currentIsOwner = true;
                }
            }
            
            // If not found and not owner, try public path
            if (!data) {
                const publicSnapshot = await firebase.database().ref(`publicAnalysis/${historyId}`).once('value');
                data = publicSnapshot.val();
                if (data) {
                    ownerId = data.ownerId;
                    currentIsOwner = currentUser && currentUser.uid === ownerId;
                }
            }
            
            if (!data) {
                throw new Error('Analysis not found or private');
            }
            
            analysisData = data;
            currentOwnerId = ownerId;
            
            // Update metadata
            if (docFileNameSpan) docFileNameSpan.textContent = data.fileName || 'Analysis Document';
            if (docDateSpan) docDateSpan.textContent = data.date || new Date().toLocaleDateString();
            if (docTypeSpan) docTypeSpan.textContent = data.documentType || 'General';
            if (docLastEditedSpan) docLastEditedSpan.textContent = data.lastEditedDate || data.date || '-';
            
            // Load content (prefer HTML version if exists, otherwise convert markdown)
            let content = '';
            if (data.resultsHtml) {
                content = data.resultsHtml;
            } else if (data.resultsMarkdown) {
                content = marked.parse(data.resultsMarkdown);
            } else if (data.results) {
                content = marked.parse(data.results);
            } else {
                content = '<p>No content available</p>';
            }
            
            editor.innerHTML = content;
            updateWordAndCharCount();
            
            // Set editor mode based on ownership
            if (!currentIsOwner) {
                setEditorReadOnly(true);
                showToast('📖 You are viewing a shared document (read-only).', 'info', 4000);
            } else {
                setEditorReadOnly(false);
                // Show public toggle
                updatePublicToggleVisibility();
            }
            
        } catch (err) {
            console.error('Load error:', err);
            showToast('Failed to load analysis', 'error');
            editor.innerHTML = '<div class="loading-editor"><i class="fas fa-exclamation-circle"></i> Error loading analysis. It may be private or does not exist.</div>';
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
        // Ctrl+S to save
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
            const shareUrl = `${window.location.origin}${window.location.pathname}?id=${historyId}`;
            shareLink.value = shareUrl;
            shareModal.classList.add('show');
        });
    }
    
    // Copy (to clipboard)
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
                                text: analysisData?.fileName || 'rehab.ai Analysis Report', 
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
                a.download = `rehab_analysis_${Date.now()}.docx`;
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
                filename: `rehab_analysis_${Date.now()}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, letterRendering: true },
                jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
            };
            
            html2pdf().set(opt).from(element).save()
                .then(() => {
                    showToast('PDF generated successfully', 'success');
                })
                .catch((err) => {
                    console.error('PDF error:', err);
                    showToast('PDF generation failed', 'error');
                })
                .finally(() => {
                    pdfBtn.innerHTML = original;
                });
        });
    }
    
    // Print
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>rehab.ai Analysis</title>
                    <style>
                        body { 
                            font-family: Arial, sans-serif; 
                            line-height: 1.6; 
                            padding: 2rem; 
                            max-width: 800px; 
                            margin: 0 auto;
                        }
                        h1 { color: #00695c; border-bottom: 2px solid #00695c; padding-bottom: 0.5rem; }
                        h2 { color: #00695c; margin-top: 1.5rem; }
                        table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background: #f5f5f5; }
                        @media print {
                            body { margin: 0; padding: 0.5in; }
                        }
                    </style>
                </head>
                <body>
                    <h1>${analysisData?.fileName || 'rehab.ai Analysis Report'}</h1>
                    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
                    <hr>
                    ${editor.innerHTML}
                    <hr>
                    <p style="font-size: 0.8rem; color: #666;">Generated by rehab.ai - Intelligent Rehabilitation Tools</p>
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
    
    // Close
    if (closeDocBtn) {
        closeDocBtn.addEventListener('click', () => {
            window.location.href = 'documentation.html';
        });
    }
    
    // Public toggle event
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
            const subject = encodeURIComponent(`rehab.ai Analysis: ${analysisData?.fileName || 'Document'}`);
            const body = encodeURIComponent(`Check out this analysis: ${shareLink.value}`);
            window.location.href = `mailto:?subject=${subject}&body=${body}`;
        });
    }
    
    if (shareWhatsAppBtn) {
        shareWhatsAppBtn.addEventListener('click', () => {
            const text = encodeURIComponent(`Check out this rehab.ai analysis: ${shareLink.value}`);
            window.open(`https://wa.me/?text=${text}`, '_blank');
        });
    }
    
    if (shareTwitterBtn) {
        shareTwitterBtn.addEventListener('click', () => {
            const text = encodeURIComponent(`Check out this rehab.ai analysis: ${shareLink.value}`);
            window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
        });
    }
    
    // =========================================================================
    // Auth & Initialization
    // =========================================================================
    firebase.auth().onAuthStateChanged(async (user) => {
        currentUser = user;
        // Allow loading even if not logged in (public documents)
        await loadAnalysis();
    });
});