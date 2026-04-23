// js/presentation.js - Ward Round Presentation with Auto-Save & Preview Modal

// Configure marked for proper rendering
if (typeof marked !== 'undefined') {
    marked.setOptions({
        breaks: true,        // Convert \n to <br>
        gfm: true,          // GitHub Flavored Markdown
        headerIds: false,   // No header IDs
        mangle: false       // Don't escape HTML
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    // =========================================================================
    // DOM Elements
    // =========================================================================
    // Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanels = {
        text: document.getElementById('textPanel'),
        document: document.getElementById('documentPanel'),
        image: document.getElementById('imagePanel')
    };
    
    // Input elements
    const textInput = document.getElementById('textInput');
    const textWordCount = document.getElementById('textWordCount');
    const clearTextBtn = document.getElementById('clearTextBtn');
    
    const docDropZone = document.getElementById('docDropZone');
    const docFileInput = document.getElementById('docFileInput');
    const browseDocBtn = document.getElementById('browseDocBtn');
    const docFileInfo = document.getElementById('docFileInfo');
    
    const imageDropZone = document.getElementById('imageDropZone');
    const imageFileInput = document.getElementById('imageFileInput');
    const browseImageBtn = document.getElementById('browseImageBtn');
    const imagePreviewArea = document.getElementById('imagePreviewArea');
    const previewImage = document.getElementById('previewImage');
    const removeImageBtn = document.getElementById('removeImageBtn');
    
    // Patient form
    const patientName = document.getElementById('patientName');
    const patientAge = document.getElementById('patientAge');
    const patientGender = document.getElementById('patientGender');
    const patientMRN = document.getElementById('patientMRN');
    const patientDiagnosis = document.getElementById('patientDiagnosis');
    const professionSelect = document.getElementById('professionSelect');
    
    // Outline
    const outlineRadios = document.querySelectorAll('input[name="outline"]');
    const customOutline = document.getElementById('customOutline');
    const customOutlineHint = document.getElementById('customOutlineHint');
    
    // Additional
    const additionalInstructions = document.getElementById('additionalInstructions');
    const generateBtn = document.getElementById('generateBtn');
    
    // Hidden history ID
    const currentHistoryIdInput = document.getElementById('currentHistoryId');
    
    // History
    const historyDrawer = document.getElementById('historyDrawer');
    const historyNavBtn = document.getElementById('historyNavBtn');
    const closeDrawerBtn = document.getElementById('closeDrawerBtn');
    const historyList = document.getElementById('historyList');
    const historySearchInput = document.getElementById('historySearchInput');
    
    // Toast
    const toastContainer = document.getElementById('toast-container');
    
    // =========================================================================
    // State & Configuration
    // =========================================================================
    let currentUser = null;
    let aiConfig = { token: null, endpoint: null, model: 'deepseek-chat' }; // Changed to DeepSeek
    let activeTab = 'text';
    let uploadedFile = null;
    let extractedText = '';
    let uploadedImage = null;
    let imageDataURL = null;
    let allHistoryEntries = [];
    let isRestoring = false;
    let saveTimeout = null;
    const STORAGE_KEY = 'rehab_presentation_state';
    
    const database = firebase.database();
    
    // =========================================================================
    // Utilities
    // =========================================================================
    function showToast(message, type = 'success', duration = 3500) {
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
    
    // UPDATED: Fetch DeepSeek API key from Firebase database
    async function fetchTokens() {
        try {
            // Read from 'tokens/deepseek' node as shown in your database screenshot
            const snapshot = await database.ref('tokens/deepseek').once('value');
            const data = snapshot.val();
            if (data && data.api_key) {
                aiConfig.token = data.api_key;
                aiConfig.endpoint = 'https://api.deepseek.com/v1'; // DeepSeek base URL
                aiConfig.model = 'deepseek-chat'; // or 'deepseek-reasoner' for chain-of-thought
                console.log('DeepSeek API loaded successfully');
                return true;
            }
            console.warn('DeepSeek API key not found at tokens/deepseek/api_key');
            return false;
        } catch (error) {
            console.error('Token fetch error:', error);
            return false;
        }
    }
    
    function updateWordCount() {
        if (textInput) {
            const words = textInput.value.trim().split(/\s+/).filter(w => w.length > 0).length;
            textWordCount.textContent = `${words} word${words !== 1 ? 's' : ''}`;
        }
    }
    
    function validateForm() {
        const hasContent = (activeTab === 'text' && textInput.value.trim()) ||
                          (activeTab === 'document' && (uploadedFile || extractedText)) ||
                          (activeTab === 'image' && imageDataURL);
        const hasProfession = professionSelect.value !== '';
        const hasPatientName = patientName.value.trim() !== '';
        generateBtn.disabled = !(hasContent && hasProfession && hasPatientName);
    }
    
    // =========================================================================
    // Auto-Save to localStorage
    // =========================================================================
    async function compressImageIfNeeded(dataURL) {
        if (!dataURL || dataURL.length < 1.5 * 1024 * 1024) return dataURL;
        return new Promise(resolve => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let w = img.width, h = img.height;
                const maxDim = 1024;
                if (w > maxDim || h > maxDim) {
                    if (w > h) { h = (h / w) * maxDim; w = maxDim; }
                    else { w = (w / h) * maxDim; h = maxDim; }
                }
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                let quality = 0.8;
                let result = canvas.toDataURL('image/jpeg', quality);
                while (result.length > 1 * 1024 * 1024 && quality > 0.3) {
                    quality -= 0.1;
                    result = canvas.toDataURL('image/jpeg', quality);
                }
                resolve(result);
            };
            img.src = dataURL;
        });
    }
    
    async function saveProgress() {
        if (isRestoring) {
            console.log('[SAVE] Skipping save during restore');
            return;
        }
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(async () => {
            const state = {
                version: 1,
                activeTab,
                textContent: textInput?.value || '',
                extractedText: extractedText,
                uploadedFileName: uploadedFile?.name || null,
                imageDataURL: await compressImageIfNeeded(imageDataURL),
                uploadedImageName: uploadedImage?.name || null,
                patientName: patientName?.value || '',
                patientAge: patientAge?.value || '',
                patientGender: patientGender?.value || '',
                patientMRN: patientMRN?.value || '',
                patientDiagnosis: patientDiagnosis?.value || '',
                profession: professionSelect?.value || '',
                outline: document.querySelector('input[name="outline"]:checked')?.value || 'soap',
                customOutline: customOutline?.value || '',
                additionalInstructions: additionalInstructions?.value || '',
                timestamp: Date.now()
            };
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
                console.log('[SAVE] Progress saved to localStorage');
            } catch (e) {
                if (e.name === 'QuotaExceededError') {
                    const { imageDataURL: _, ...stateWithoutImage } = state;
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateWithoutImage));
                    showToast('Storage limit reached. Image not saved.', 'warning');
                }
            }
        }, 300);
    }
    
    async function loadProgress() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) {
            console.log('[LOAD] No saved state found');
            return false;
        }
        try {
            isRestoring = true;
            const state = JSON.parse(saved);
            console.log('[LOAD] Restoring saved state from:', new Date(state.timestamp).toLocaleString());
            
            // Restore active tab
            if (state.activeTab) {
                const targetBtn = document.querySelector(`.tab-btn[data-tab="${state.activeTab}"]`);
                if (targetBtn) {
                    targetBtn.click();
                } else {
                    activeTab = state.activeTab;
                    // Manually show the correct panel
                    Object.values(tabPanels).forEach(p => p.classList.remove('active'));
                    tabPanels[state.activeTab]?.classList.add('active');
                    tabBtns.forEach(b => {
                        b.classList.remove('active');
                        if (b.dataset.tab === state.activeTab) b.classList.add('active');
                    });
                }
            }
            
            // Restore text
            if (state.textContent) {
                textInput.value = state.textContent;
                updateWordCount();
            }
            
            // Restore extracted document text
            if (state.extractedText) extractedText = state.extractedText;
            if (state.uploadedFileName) {
                uploadedFile = { name: state.uploadedFileName };
                docFileInfo.style.display = 'block';
                docFileInfo.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <span><i class="fas fa-file-alt"></i> ${escapeHtml(state.uploadedFileName)}</span>
                        <button id="removeDocBtn" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 1.2rem;">&times;</button>
                    </div>
                `;
                document.getElementById('removeDocBtn')?.addEventListener('click', removeDocument);
            }
            
            // Restore image
            if (state.imageDataURL && state.uploadedImageName) {
                imageDataURL = state.imageDataURL;
                previewImage.src = imageDataURL;
                imagePreviewArea.style.display = 'block';
                uploadedImage = { name: state.uploadedImageName };
            }
            
            // Restore patient form
            if (state.patientName) patientName.value = state.patientName;
            if (state.patientAge) patientAge.value = state.patientAge;
            if (state.patientGender) patientGender.value = state.patientGender;
            if (state.patientMRN) patientMRN.value = state.patientMRN;
            if (state.patientDiagnosis) patientDiagnosis.value = state.patientDiagnosis;
            if (state.profession) professionSelect.value = state.profession;
            
            // Restore outline
            if (state.outline) {
                const radio = document.querySelector(`input[name="outline"][value="${state.outline}"]`);
                if (radio) {
                    radio.checked = true;
                    customOutline.style.display = state.outline === 'custom' ? 'block' : 'none';
                    if (customOutlineHint) customOutlineHint.style.display = state.outline === 'custom' ? 'flex' : 'none';
                }
            }
            if (state.customOutline) customOutline.value = state.customOutline;
            if (state.additionalInstructions) additionalInstructions.value = state.additionalInstructions;
            
            validateForm();
            console.log('[LOAD] Progress restored successfully');
            showToast('Previous session restored', 'info', 2000);
            
            isRestoring = false;
            return true;
        } catch (e) {
            console.error('[LOAD] Restore error:', e);
            isRestoring = false;
            return false;
        }
    }
    
    // Attach save triggers to all form elements
    const saveTriggers = [
        textInput, patientName, patientAge, patientGender, patientMRN, 
        patientDiagnosis, customOutline, additionalInstructions
    ];
    saveTriggers.forEach(el => { if (el) el.addEventListener('input', saveProgress); });
    patientGender?.addEventListener('change', saveProgress);
    professionSelect?.addEventListener('change', saveProgress);
    outlineRadios.forEach(r => r.addEventListener('change', saveProgress));
    
    // =========================================================================
    // Tab Switching
    // =========================================================================
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            Object.values(tabPanels).forEach(p => p.classList.remove('active'));
            tabPanels[tab].classList.add('active');
            activeTab = tab;
            validateForm();
            saveProgress();
        });
    });
    
    // =========================================================================
    // Text Input
    // =========================================================================
    textInput.addEventListener('input', () => {
        updateWordCount();
        validateForm();
        saveProgress();
    });
    
    clearTextBtn.addEventListener('click', () => {
        textInput.value = '';
        updateWordCount();
        validateForm();
        saveProgress();
        showToast('Text cleared', 'info');
    });
    
    // =========================================================================
    // Document Upload
    // =========================================================================
    async function extractTextFromFile(file) {
        return new Promise(async (resolve, reject) => {
            const ext = file.name.split('.').pop().toLowerCase();
            
            if (ext === 'txt') {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.onerror = reject;
                reader.readAsText(file);
            } else if (ext === 'pdf') {
                try {
                    const pdfjsLib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs');
                    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';
                    const arrayBuffer = await file.arrayBuffer();
                    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                    let fullText = '';
                    const maxPages = Math.min(pdf.numPages, 30);
                    for (let i = 1; i <= maxPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        fullText += textContent.items.map(item => item.str).join(' ') + '\n';
                    }
                    if (pdf.numPages > maxPages) {
                        fullText += `\n[Note: Document has ${pdf.numPages} pages. Only first ${maxPages} pages were processed.]`;
                    }
                    resolve(fullText);
                } catch (err) {
                    reject(err);
                }
            } else if (ext === 'docx' || ext === 'doc') {
                reject(new Error('DOCX/DOC files are not supported directly. Please convert to PDF or paste as text.'));
            } else {
                reject(new Error('Unsupported file type'));
            }
        });
    }
    
    function handleDocUpload(file) {
        uploadedFile = file;
        docFileInfo.style.display = 'block';
        docFileInfo.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <span><i class="fas fa-file-alt"></i> ${escapeHtml(file.name)} (${(file.size/1024).toFixed(1)} KB)</span>
                <button id="removeDocBtn" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 1.2rem;">&times;</button>
            </div>
        `;
        document.getElementById('removeDocBtn')?.addEventListener('click', removeDocument);
        
        showToast('Extracting text from document...', 'info');
        extractTextFromFile(file).then(text => {
            extractedText = text.substring(0, 15000);
            showToast('Document loaded successfully', 'success');
            validateForm();
            saveProgress();
        }).catch(err => {
            console.error('Extraction error:', err);
            showToast('Failed to extract text: ' + err.message, 'error');
        });
    }
    
    function removeDocument() {
        uploadedFile = null;
        extractedText = '';
        docFileInfo.style.display = 'none';
        docFileInfo.innerHTML = '';
        docFileInput.value = '';
        validateForm();
        saveProgress();
        showToast('Document removed', 'info');
    }
    
    docDropZone.addEventListener('dragover', e => e.preventDefault());
    docDropZone.addEventListener('drop', e => {
        e.preventDefault();
        docDropZone.style.borderColor = 'var(--border-light)';
        if (e.dataTransfer.files.length) handleDocUpload(e.dataTransfer.files[0]);
    });
    docDropZone.addEventListener('dragenter', () => docDropZone.style.borderColor = 'var(--presentation-accent)');
    docDropZone.addEventListener('dragleave', () => docDropZone.style.borderColor = 'var(--border-light)');
    docDropZone.addEventListener('click', () => docFileInput.click());
    browseDocBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        docFileInput.click();
    });
    docFileInput.addEventListener('change', () => {
        if (docFileInput.files.length) handleDocUpload(docFileInput.files[0]);
        docFileInput.value = '';
    });
    
    // =========================================================================
    // Image Upload
    // =========================================================================
    function handleImageUpload(file) {
        if (!file.type.startsWith('image/')) {
            showToast('Please select an image file', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = e => {
            imageDataURL = e.target.result;
            previewImage.src = imageDataURL;
            imagePreviewArea.style.display = 'block';
            uploadedImage = file;
            validateForm();
            saveProgress();
            showToast('Image loaded successfully', 'success');
        };
        reader.readAsDataURL(file);
    }
    
    function removeImage() {
        imageDataURL = null;
        imagePreviewArea.style.display = 'none';
        previewImage.src = '';
        imageFileInput.value = '';
        uploadedImage = null;
        validateForm();
        saveProgress();
        showToast('Image removed', 'info');
    }
    
    imageDropZone.addEventListener('dragover', e => e.preventDefault());
    imageDropZone.addEventListener('drop', e => {
        e.preventDefault();
        imageDropZone.style.borderColor = 'var(--border-light)';
        if (e.dataTransfer.files.length) handleImageUpload(e.dataTransfer.files[0]);
    });
    imageDropZone.addEventListener('dragenter', () => imageDropZone.style.borderColor = 'var(--presentation-accent)');
    imageDropZone.addEventListener('dragleave', () => imageDropZone.style.borderColor = 'var(--border-light)');
    imageDropZone.addEventListener('click', () => imageFileInput.click());
    browseImageBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        imageFileInput.click();
    });
    imageFileInput.addEventListener('change', () => {
        if (imageFileInput.files.length) handleImageUpload(imageFileInput.files[0]);
        imageFileInput.value = '';
    });
    removeImageBtn.addEventListener('click', removeImage);
    
    // =========================================================================
    // Form Validation (additional triggers)
    // =========================================================================
    [patientName, patientAge, patientDiagnosis].forEach(el => {
        if (el) el.addEventListener('input', validateForm);
    });
    patientGender?.addEventListener('change', validateForm);
    professionSelect?.addEventListener('change', validateForm);
    
    // Outline custom toggle
    outlineRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            const isCustom = radio.value === 'custom';
            customOutline.style.display = isCustom ? 'block' : 'none';
            if (customOutlineHint) customOutlineHint.style.display = isCustom ? 'flex' : 'none';
            saveProgress();
        });
    });
    
    // =========================================================================
    // AI Generation
    // =========================================================================
    function getSelectedOutline() {
        const selected = document.querySelector('input[name="outline"]:checked')?.value || 'soap';
        if (selected === 'custom') {
            return customOutline.value.trim() || 'Custom presentation outline';
        }
        const outlines = {
            soap: 'SOAP format: Subjective (patient report), Objective (findings), Assessment, Plan',
            full: 'Full assessment: Relevant History, Examination findings, Functional status, Recommendations',
            quick: 'Quick update: Key changes since last review, Current status, Next steps'
        };
        return outlines[selected] || outlines.soap;
    }
    
    async function generatePresentation() {
        if (!aiConfig.token) {
            const success = await fetchTokens();
            if (!success) throw new Error('AI service unavailable. Please check your DeepSeek API key.');
        }
        
        let contentText = '';
        if (activeTab === 'text') {
            contentText = textInput.value.trim();
        } else if (activeTab === 'document') {
            contentText = extractedText;
        }
        
        const patientInfo = {
            name: patientName.value.trim() || 'N/A',
            age: patientAge.value || 'N/A',
            gender: patientGender.value || 'N/A',
            mrn: patientMRN.value.trim() || 'N/A',
            diagnosis: patientDiagnosis.value.trim() || 'N/A'
        };
        
        const profession = professionSelect.options[professionSelect.selectedIndex]?.text || 'Healthcare Professional';
        const outline = getSelectedOutline();
        const instructions = additionalInstructions.value.trim() || 'None';
        
        const systemPrompt = `You are a clinical presentation assistant helping a ${profession} prepare a ward round presentation.
Create a professional, concise presentation using the provided patient information and clinical notes.

Follow this outline exactly: ${outline}

Format your response with clear markdown headings (## for main sections, ### for subsections), bullet points (-) for lists, and **bold** for emphasis.
Use professional clinical language. Do NOT use tables.

Example format:
## Subjective
- Patient reports...
- Key concerns...

## Objective
- Vital signs...
- Physical exam findings...

## Assessment
- Primary diagnosis...
- Differential considerations...

## Plan
- Recommended interventions...
- Follow-up needed...`;
        
        let userContent = `Patient Information:
- Name: ${patientInfo.name}
- Age: ${patientInfo.age}
- Gender: ${patientInfo.gender}
- MRN: ${patientInfo.mrn}
- Diagnosis: ${patientInfo.diagnosis}

Clinician Role: ${profession}

Additional Instructions: ${instructions}

`;
        
        if (activeTab === 'image' && imageDataURL) {
            userContent += `Please analyze the provided image and create a ward round presentation focusing on the visible findings.`;
        } else {
            userContent += `Clinical Notes/Information:\n${contentText}`;
        }
        
        let messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent }
        ];
        
        // DeepSeek supports vision with the same OpenAI-compatible format
        if (activeTab === 'image' && imageDataURL) {
            messages = [
                { role: "system", content: systemPrompt },
                { 
                    role: "user", 
                    content: [
                        { type: "text", text: userContent },
                        { type: "image_url", image_url: { url: imageDataURL } }
                    ]
                }
            ];
        }
        
        // DeepSeek API endpoint
        const url = `${aiConfig.endpoint}/chat/completions`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${aiConfig.token}` 
            },
            body: JSON.stringify({ 
                model: aiConfig.model,  // 'deepseek-chat' or 'deepseek-reasoner'
                messages: messages, 
                max_tokens: 5000, 
                temperature: 0.3
            })
        });
        
        if (!response.ok) {
            const err = await response.json();
            console.error('DeepSeek API error:', err);
            throw new Error(err.error?.message || 'DeepSeek API error');
        }
        
        const data = await response.json();
        
        // DeepSeek returns the same format as OpenAI
        return data.choices[0].message.content;
    }
    
    async function saveToHistory(rawMarkdown, htmlContent) {
        if (!currentUser) return null;
        
        try {
            const ref = await database.ref(`users/${currentUser.uid}/caseHistory`).push({
                contentType: 'presentation',
                fileName: `Presentation - ${patientName.value || 'Patient'}`,
                documentType: 'Ward Round',
                patientName: patientName.value.trim(),
                patientAge: patientAge.value,
                patientGender: patientGender.value,
                patientMRN: patientMRN.value.trim(),
                diagnosis: patientDiagnosis.value.trim(),
                profession: professionSelect.value,
                results: rawMarkdown,
                resultsMarkdown: rawMarkdown,
                resultsHtml: htmlContent,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                date: new Date().toLocaleDateString()
            });
            
            return ref.key;
        } catch (error) {
            console.error('Error saving to history:', error);
            return null;
        }
    }
    
    // =========================================================================
    // Preview Modal
    // =========================================================================
    function showPreviewModal(htmlContent, historyId) {
        const existing = document.querySelector('.preview-modal');
        if (existing) existing.remove();
        
        const patient = patientName.value.trim() || 'Patient';
        const dateStr = new Date().toLocaleString();
        
        const modalHtml = `
            <div class="preview-modal">
                <div class="preview-overlay"></div>
                <div class="preview-card">
                    <div class="preview-card-header">
                        <div class="preview-icon">📋</div>
                        <h3>Presentation Ready</h3>
                        <button class="preview-close">&times;</button>
                    </div>
                    <div class="preview-card-body">
                        <div class="preview-info">
                            <span class="preview-badge">✅ Ready to view</span>
                            <span class="preview-date">${dateStr}</span>
                        </div>
                        <p class="preview-description">
                            Ward round presentation for <strong>${escapeHtml(patient)}</strong> has been generated successfully.
                        </p>
                        <div class="preview-actions">
                            <button class="preview-btn primary" id="viewFullPresentationBtn">
                                📖 View Full Presentation
                            </button>
                            <button class="preview-btn secondary" id="closePreviewBtn">
                                Close
                            </button>
                        </div>
                        <div class="preview-note">
                            <small>🔒 The full report will open in a new tab with editing and export options.</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = document.querySelector('.preview-modal');
        
        const closeModal = () => modal.remove();
        
        modal.querySelector('.preview-close').addEventListener('click', closeModal);
        modal.querySelector('#closePreviewBtn').addEventListener('click', closeModal);
        modal.querySelector('.preview-overlay').addEventListener('click', closeModal);
        
        modal.querySelector('#viewFullPresentationBtn').addEventListener('click', () => {
            if (historyId) {
                window.open(`caseresult.html?id=${historyId}`, '_blank');
                closeModal();
            } else {
                showToast('Error: Presentation ID not found', 'error');
            }
        });
    }
    
    // =========================================================================
    // Generate Handler (with button loading state)
    // =========================================================================
    generateBtn.addEventListener('click', async () => {
        if (!currentUser) {
            showToast('Please login to generate presentation', 'error');
            const loginBtn = document.getElementById('loginBtn');
            if (loginBtn) loginBtn.click();
            return;
        }
        
        // Validate required fields
        if (!patientName.value.trim()) {
            showToast('Please enter patient name', 'error');
            return;
        }
        if (!professionSelect.value) {
            showToast('Please select your profession', 'error');
            return;
        }
        
        const originalText = generateBtn.innerHTML;
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        
        try {
            const rawMarkdown = await generatePresentation();
            const htmlContent = marked.parse(rawMarkdown);
            
            const historyId = await saveToHistory(rawMarkdown, htmlContent);
            currentHistoryIdInput.value = historyId || '';
            
            // Clear saved progress since presentation is complete
            localStorage.removeItem(STORAGE_KEY);
            
            showPreviewModal(htmlContent, historyId);
            showToast('Presentation generated successfully!', 'success');
            
        } catch (err) {
            console.error('Generation error:', err);
            let errorMsg = err.message;
            if (errorMsg.includes('token') || errorMsg.includes('API') || errorMsg.includes('DeepSeek')) {
                errorMsg = 'AI service temporarily unavailable. Please check your DeepSeek API key or try again.';
            }
            showToast('Generation failed: ' + errorMsg, 'error');
        } finally {
            generateBtn.disabled = false;
            generateBtn.innerHTML = originalText;
            validateForm();
        }
    });
    
    // =========================================================================
    // History Drawer with Delete Functionality
    // =========================================================================
    async function deleteHistoryItem(key, event) {
        event.stopPropagation();
        
        if (!currentUser) {
            showToast('Please login to delete history', 'error');
            return;
        }
        
        if (!confirm('Are you sure you want to delete this presentation from history?')) {
            return;
        }
        
        try {
            // Delete from user's history
            await database.ref(`users/${currentUser.uid}/caseHistory/${key}`).remove();
            
            // Also delete from public if it exists
            await database.ref(`publicAnalysis/${key}`).remove();
            
            showToast('Presentation deleted from history', 'success');
            
            // Reload history
            loadHistory();
        } catch (error) {
            console.error('Delete error:', error);
            showToast('Failed to delete presentation', 'error');
        }
    }
    
    function renderHistory(entries) {
        historyList.innerHTML = '';
        if (!entries.length) {
            historyList.innerHTML = '<div class="empty-state"><i class="bx bx-folder-open"></i><p>No history found</p></div>';
            return;
        }
        
        entries.forEach(([key, item]) => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <div class="history-info" style="flex: 1;">
                    <span class="history-name">${escapeHtml(item.patientName || 'Patient')} - ${escapeHtml(item.documentType || 'Presentation')}</span>
                    <div class="history-meta">
                        <span>${escapeHtml(item.date || '')}</span>
                        <span>${escapeHtml(item.profession || '')}</span>
                    </div>
                </div>
                <div class="history-actions" style="display: flex; gap: 8px;">
                    
                    <button class="delete-btn" data-key="${key}" title="Delete Presentation" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 1.2rem; padding: 5px; border-radius: 50%; transition: all 0.2s;">
                        <i class="bx bx-trash"></i>
                    </button>
                </div>
            `;
            
            
            
            // Delete button handler
            div.querySelector('.delete-btn').addEventListener('click', (e) => {
                deleteHistoryItem(key, e);
            });
            
            // Click on the item itself (except buttons)
            div.addEventListener('click', (e) => {
                if (!e.target.closest('button')) {
                    window.open(`caseresult.html?id=${key}`, '_blank');
                }
            });
            
            historyList.appendChild(div);
        });
    }
    
    function filterHistory(term) {
        const searchTerm = term.toLowerCase().trim();
        if (!searchTerm) {
            renderHistory(allHistoryEntries);
            return;
        }
        const filtered = allHistoryEntries.filter(([_, item]) => 
            (item.patientName || '').toLowerCase().includes(searchTerm) ||
            (item.profession || '').toLowerCase().includes(searchTerm) ||
            (item.diagnosis || '').toLowerCase().includes(searchTerm)
        );
        renderHistory(filtered);
    }
    
    function loadHistory() {
        if (!currentUser) return;
        
        database.ref(`users/${currentUser.uid}/caseHistory`)
            .orderByChild('timestamp')
            .on('value', snapshot => {
                const data = snapshot.val();
                if (!data) {
                    allHistoryEntries = [];
                    renderHistory([]);
                    return;
                }
                
                const entries = Object.entries(data)
                    .filter(([_, item]) => item.contentType === 'presentation')
                    .sort((a, b) => b[1].timestamp - a[1].timestamp);
                
                allHistoryEntries = entries;
                filterHistory(historySearchInput?.value || '');
            });
    }
    
    if (historyNavBtn) {
        historyNavBtn.addEventListener('click', () => {
            if (!currentUser) {
                showToast('Please login to view history', 'error');
                const loginBtn = document.getElementById('loginBtn');
                if (loginBtn) loginBtn.click();
                return;
            }
            historyDrawer.classList.add('active');
            loadHistory();
        });
    }
    
    if (closeDrawerBtn) {
        closeDrawerBtn.addEventListener('click', () => {
            historyDrawer.classList.remove('active');
        });
    }
    
    if (historySearchInput) {
        historySearchInput.addEventListener('input', e => filterHistory(e.target.value));
    }
    
    // Close drawer on outside click
    document.addEventListener('click', (e) => {
        if (historyDrawer && historyDrawer.classList.contains('active') &&
            !historyDrawer.contains(e.target) &&
            e.target !== historyNavBtn &&
            !historyNavBtn?.contains(e.target)) {
            historyDrawer.classList.remove('active');
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && historyDrawer && historyDrawer.classList.contains('active')) {
            historyDrawer.classList.remove('active');
        }
    });
    
    // =========================================================================
    // Auth & Init
    // =========================================================================
    firebase.auth().onAuthStateChanged(user => {
        currentUser = user;
        if (user) {
            console.log('User logged in:', user.email);
            if (historyNavBtn) historyNavBtn.style.display = 'block';
            loadHistory();
        } else {
            console.log('User logged out');
            if (historyNavBtn) historyNavBtn.style.display = 'none';
        }
        validateForm();
    });
    
    // Initialize
    await fetchTokens();
    updateWordCount();
    validateForm();
    
    // Load saved progress (auto-save) - wait for DOM to be fully ready
    setTimeout(async () => {
        const restored = await loadProgress();
        if (!restored) {
            console.log('No saved session found');
        }
        
        // Ensure custom outline hint is properly initialized
        const selectedOutline = document.querySelector('input[name="outline"]:checked');
        if (selectedOutline && selectedOutline.value === 'custom') {
            customOutline.style.display = 'block';
            if (customOutlineHint) customOutlineHint.style.display = 'flex';
        }
    }, 100);
    
    console.log('Presentation Assistant initialized with DeepSeek API');
});
