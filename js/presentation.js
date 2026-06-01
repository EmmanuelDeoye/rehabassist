// js/presentation.js – Multi‑mode (Presentation/Report/Documentation), Multi‑file, Camera, DOCX, OCR
// Updated with Content Fidelity control (Strict vs Flexible)

// Marked configuration
if (typeof marked !== 'undefined') {
    marked.setOptions({
        breaks: true,
        gfm: true,
        headerIds: false,
        mangle: false
    });
}

document.addEventListener('DOMContentLoaded', async () => {

    // =========================================================================
    // DOM Elements
    // =========================================================================
    const textInput = document.getElementById('textInput');
    const textWordCount = document.getElementById('textWordCount');
    const clearTextBtn = document.getElementById('clearTextBtn');

    const multiDropZone = document.getElementById('multiDropZone');
    const multiFileInput = document.getElementById('multiFileInput');
    const cameraInput = document.getElementById('cameraInput');
    const attachmentsList = document.getElementById('attachmentsList');

    // Upload Modal
    const uploadModal = document.getElementById('uploadModal');
    const closeUploadModalBtn = document.getElementById('closeUploadModal');
    const uploadModalOverlay = document.querySelector('.upload-modal-overlay');
    const uploadOptions = document.querySelectorAll('.upload-option');

    // Patient form
    const patientName = document.getElementById('patientName');
    const patientAge = document.getElementById('patientAge');
    const patientGender = document.getElementById('patientGender');
    const patientMRN = document.getElementById('patientMRN');
    const patientDiagnosis = document.getElementById('patientDiagnosis');
    const professionSelect = document.getElementById('professionSelect');

    // Mode tabs
    const modeTabs = document.querySelectorAll('.mode-tab');
    
    // Config sections (mode-dependent)
    const configSections = document.querySelectorAll('.config-mode-section');
    
    // Outline radio groups for each mode
    const outlineRadiosPresentation = document.querySelectorAll('input[name="outlinePresentation"]');
    const outlineRadiosReport = document.querySelectorAll('input[name="outlineReport"]');
    const outlineRadiosDocumentation = document.querySelectorAll('input[name="outlineDocumentation"]');
    
    // Custom outline textareas and hints for each mode
    const customOutlinePresentation = document.getElementById('customOutlinePresentation');
    const customOutlineHintPresentation = document.getElementById('customOutlineHintPresentation');
    const customOutlineReport = document.getElementById('customOutlineReport');
    const customOutlineHintReport = document.getElementById('customOutlineHintReport');
    const customOutlineDocumentation = document.getElementById('customOutlineDocumentation');
    const customOutlineHintDocumentation = document.getElementById('customOutlineHintDocumentation');

    // Additional
    const additionalInstructions = document.getElementById('additionalInstructions');
    const generateBtn = document.getElementById('generateBtn');
    const generateBtnText = document.getElementById('generateBtnText');

    // Suggested instruction chips
    const suggestionChips = document.getElementById('suggestionChips');

    // Output size radios
    const outputSizeRadios = document.getElementsByName('outputSize');

    // Content fidelity radios
    const contentFidelityRadios = document.getElementsByName('contentFidelity');

    // Hidden history ID
    const currentHistoryIdInput = document.getElementById('currentHistoryId');

    // History drawer
    const historyDrawer = document.getElementById('historyDrawer');
    const historyNavBtn = document.getElementById('historyNavBtn');
    const closeDrawerBtn = document.getElementById('closeDrawerBtn');
    const historyList = document.getElementById('historyList');
    const historySearchInput = document.getElementById('historySearchInput');

    // Toast
    const toastContainer = document.getElementById('toast-container');

    // =========================================================================
    // State & helpers
    // =========================================================================
    let currentUser = null;
    let aiConfig = { token: null, endpoint: 'https://api.deepseek.com/v1', model: 'deepseek-chat' };
    let attachments = [];   // { type, name, textContent?, dataURL?, ocrText?, ocrProcessing?, processing? }
    let isRestoring = false;
    let saveTimeout = null;
    let currentMode = 'presentation'; // 'presentation' | 'report' | 'documentation'
    const STORAGE_KEY = 'rehab_presentation_state_v4';

    const database = firebase.database();

    function showToast(message, type = 'success', duration = 3500) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i><span>${message}</span>`;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
    }

    async function fetchTokens() {
        try {
            const snapshot = await database.ref('tokens/deepseek').once('value');
            const data = snapshot.val();
            if (data?.api_key) {
                aiConfig.token = data.api_key;
                console.log('DeepSeek API loaded');
                return true;
            }
            console.warn('DeepSeek API key missing');
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
        const hasText = textInput.value.trim() !== '';
        const hasFiles = attachments.length > 0;
        const hasProfession = professionSelect.value !== '';
        const hasPatientName = patientName.value.trim() !== '';
        generateBtn.disabled = !((hasText || hasFiles) && hasProfession && hasPatientName);
    }

    // =========================================================================
    // Mode Switching
    // =========================================================================
    function switchMode(mode) {
        if (mode === currentMode) return;
        
        currentMode = mode;
        
        // Update active tab styling
        modeTabs.forEach(t => {
            t.classList.toggle('active', t.dataset.mode === mode);
        });
        
        // Show/hide config sections
        configSections.forEach(section => {
            section.style.display = section.dataset.mode === mode ? 'block' : 'none';
        });
        
        // Update generate button text
        const buttonLabels = {
            presentation: 'Generate Presentation',
            report: 'Generate Report',
            documentation: 'Generate Documentation'
        };
        if (generateBtnText) {
            generateBtnText.textContent = buttonLabels[mode] || 'Generate';
        }
        
        // Reset custom outline visibility for the new mode
        if (mode === 'presentation') {
            const checked = document.querySelector('input[name="outlinePresentation"]:checked');
            const isCustom = checked?.value === 'custom';
            if (customOutlinePresentation) customOutlinePresentation.style.display = isCustom ? 'block' : 'none';
            if (customOutlineHintPresentation) customOutlineHintPresentation.style.display = isCustom ? 'flex' : 'none';
        } else if (mode === 'report') {
            const checked = document.querySelector('input[name="outlineReport"]:checked');
            const isCustom = checked?.value === 'custom';
            if (customOutlineReport) customOutlineReport.style.display = isCustom ? 'block' : 'none';
            if (customOutlineHintReport) customOutlineHintReport.style.display = isCustom ? 'flex' : 'none';
        } else if (mode === 'documentation') {
            const checked = document.querySelector('input[name="outlineDocumentation"]:checked');
            const isCustom = checked?.value === 'custom';
            if (customOutlineDocumentation) customOutlineDocumentation.style.display = isCustom ? 'block' : 'none';
            if (customOutlineHintDocumentation) customOutlineHintDocumentation.style.display = isCustom ? 'flex' : 'none';
        }
        
        validateForm();
        saveProgress();
    }

    modeTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            switchMode(tab.dataset.mode);
        });
    });

    // =========================================================================
    // Upload Modal Management
    // =========================================================================
    function openUploadModal() {
        uploadModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeUploadModalFn() {
        uploadModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    multiDropZone.addEventListener('click', (e) => {
        if (e.target.closest('.attachment-chip')) return;
        openUploadModal();
    });

    closeUploadModalBtn.addEventListener('click', closeUploadModalFn);
    uploadModalOverlay.addEventListener('click', closeUploadModalFn);

    uploadOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = option.dataset.action;
            closeUploadModalFn();
            switch (action) {
                case 'camera':
                    cameraInput.click();
                    break;
                case 'photo':
                    multiFileInput.accept = 'image/*';
                    multiFileInput.click();
                    break;
                case 'document':
                    multiFileInput.accept = '.pdf,.docx,.txt,.doc';
                    multiFileInput.click();
                    break;
            }
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && uploadModal.classList.contains('active')) {
            closeUploadModalFn();
        }
    });

    // =========================================================================
    // Suggestion chips click handler
    // =========================================================================
    if (suggestionChips) {
        suggestionChips.addEventListener('click', (e) => {
            const chip = e.target.closest('.suggestion-chip');
            if (!chip) return;
            const text = chip.dataset.text;
            if (text && additionalInstructions) {
                // Toggle active state on chips
                const wasActive = chip.classList.contains('active');
                suggestionChips.querySelectorAll('.suggestion-chip').forEach(c => c.classList.remove('active'));
                
                if (!wasActive) {
                    chip.classList.add('active');
                    additionalInstructions.value = text;
                } else {
                    additionalInstructions.value = '';
                }
                
                saveProgress();
                validateForm();
                showToast(wasActive ? 'Instruction removed' : 'Instruction added', 'info');
            }
        });
    }

    // =========================================================================
    // Output size helper
    // =========================================================================
    function getSelectedOutputSize() {
        const selected = document.querySelector('input[name="outputSize"]:checked');
        return selected ? parseInt(selected.value, 10) : 5000; // default Detailed
    }

    // =========================================================================
    // Content Fidelity helper
    // =========================================================================
    function getContentFidelity() {
        const selected = document.querySelector('input[name="contentFidelity"]:checked');
        return selected ? selected.value : 'strict'; // default Strict
    }

    // =========================================================================
    // Outline helper functions
    // =========================================================================
    function setupOutlineToggle(radios, customTextarea, customHint) {
        radios.forEach(radio => {
            radio.addEventListener('change', () => {
                const isCustom = radio.value === 'custom';
                if (customTextarea) customTextarea.style.display = isCustom ? 'block' : 'none';
                if (customHint) customHint.style.display = isCustom ? 'flex' : 'none';
                saveProgress();
            });
        });
    }

    // Setup outline toggles for all three modes
    setupOutlineToggle(outlineRadiosPresentation, customOutlinePresentation, customOutlineHintPresentation);
    setupOutlineToggle(outlineRadiosReport, customOutlineReport, customOutlineHintReport);
    setupOutlineToggle(outlineRadiosDocumentation, customOutlineDocumentation, customOutlineHintDocumentation);

    function getSelectedOutline() {
        let selectedRadio;
        let customText = '';
        
        if (currentMode === 'presentation') {
            selectedRadio = document.querySelector('input[name="outlinePresentation"]:checked');
            customText = customOutlinePresentation?.value.trim() || '';
        } else if (currentMode === 'report') {
            selectedRadio = document.querySelector('input[name="outlineReport"]:checked');
            customText = customOutlineReport?.value.trim() || '';
        } else if (currentMode === 'documentation') {
            selectedRadio = document.querySelector('input[name="outlineDocumentation"]:checked');
            customText = customOutlineDocumentation?.value.trim() || '';
        }

        if (!selectedRadio) return 'SOAP format';

        const value = selectedRadio.value;
        if (value === 'custom') return customText || 'Custom outline';

        // Define template outlines per mode
        const outlines = {
            presentation: {
                soap: 'SOAP format: Subjective (patient report), Objective (findings), Assessment, Plan',
                full: 'Full assessment: Relevant History, Examination findings, Functional status, Recommendations',
                quick: 'Quick update: Key changes since last review, Current status, Next steps'
            },
            report: {
                progress: 'Progress Note structure: Interval history, Current status, Plan for next period',
                discharge: 'Discharge Summary structure: Admission diagnosis, Course, Condition at discharge, Follow‑up plan',
                consult: 'Consultation Note structure: Reason for consult, History, Findings, Recommendations'
            },
            documentation: {
                soap: 'SOAP note: Subjective, Objective, Assessment, Plan',
                admission: 'Admission note: History of present illness, Review of systems, Physical exam, Impression, Plan',
                daily: 'Daily progress note: Events, Vitals, Physical exam, Lab results, Plan'
            }
        };

        return outlines[currentMode]?.[value] || 'Standard clinical note structure';
    }

    // =========================================================================
    // Attachment rendering and file processing (DOCX, OCR)
    // =========================================================================
    function renderAttachments() {
        if (attachments.length === 0) {
            attachmentsList.style.display = 'none';
            attachmentsList.innerHTML = '';
            return;
        }
        attachmentsList.style.display = 'flex';
        attachmentsList.innerHTML = '';

        attachments.forEach((att, index) => {
            const chip = document.createElement('div');
            chip.className = 'attachment-chip';

            if (att.type === 'image' && att.dataURL) {
                const img = document.createElement('img');
                img.src = att.dataURL;
                img.alt = att.name;
                chip.appendChild(img);
            } else {
                const iconDiv = document.createElement('div');
                iconDiv.className = 'file-icon';
                iconDiv.innerHTML = '<i class="fas fa-file-alt"></i>';
                chip.appendChild(iconDiv);
            }

            const nameSpan = document.createElement('span');
            nameSpan.textContent = att.name.length > 20 ? att.name.substring(0, 20) + '...' : att.name;
            nameSpan.title = att.name;
            chip.appendChild(nameSpan);

            // Show processing indicator for documents
            if (att.processing) {
                const spinner = document.createElement('span');
                spinner.className = 'attachment-processing';
                spinner.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
                spinner.style.fontSize = '0.75rem';
                spinner.style.color = 'var(--text-secondary)';
                spinner.style.marginLeft = '0.25rem';
                chip.appendChild(spinner);
            }

            // Show OCR processing indicator for images
            if (att.ocrProcessing) {
                const spinner = document.createElement('span');
                spinner.className = 'attachment-processing';
                spinner.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Extracting text...';
                spinner.style.fontSize = '0.75rem';
                spinner.style.color = 'var(--text-secondary)';
                spinner.style.marginLeft = '0.25rem';
                chip.appendChild(spinner);
            }

            // Show OCR completed indicator
            if (att.type === 'image' && !att.ocrProcessing && att.ocrText !== undefined) {
                const checkIcon = document.createElement('span');
                checkIcon.className = 'attachment-ocr-done';
                checkIcon.innerHTML = att.ocrText ? '✓ Text found' : '⚠ No text';
                checkIcon.style.fontSize = '0.7rem';
                checkIcon.style.color = att.ocrText ? '#10b981' : '#f59e0b';
                checkIcon.style.marginLeft = '0.25rem';
                chip.appendChild(checkIcon);
            }

            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-attachment';
            removeBtn.innerHTML = '&times;';
            removeBtn.title = 'Remove attachment';
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                attachments.splice(index, 1);
                renderAttachments();
                validateForm();
                saveProgress();
            });
            chip.appendChild(removeBtn);

            attachmentsList.appendChild(chip);
        });
    }

    // Load mammoth for DOCX
    async function loadMammoth() {
        if (window.mammoth) return window.mammoth;
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
            script.onload = () => resolve(window.mammoth);
            script.onerror = () => reject(new Error('Failed to load the document converter. Please check your internet connection.'));
            document.head.appendChild(script);
        });
    }

    // Load Tesseract.js for OCR
    async function loadTesseract() {
        if (window.Tesseract) return window.Tesseract;
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/tesseract.js@v5.0.0/dist/tesseract.min.js';
            script.onload = () => resolve(window.Tesseract);
            script.onerror = () => reject(new Error('Failed to load image text extractor. Please check your internet connection.'));
            document.head.appendChild(script);
        });
    }

    // OCR on a data URL image
    async function runOCR(dataURL) {
        try {
            const Tesseract = await loadTesseract();
            const result = await Tesseract.recognize(dataURL, 'eng', {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        console.log('OCR progress:', Math.round(m.progress * 100) + '%');
                    }
                }
            });
            return result.data.text.trim();
        } catch (err) {
            console.warn('OCR failed:', err);
            return '';
        }
    }

    async function extractTextFromFile(file) {
        const ext = file.name.split('.').pop().toLowerCase();

        if (ext === 'txt') {
            const reader = new FileReader();
            return new Promise((resolve, reject) => {
                reader.onload = e => resolve(e.target.result);
                reader.onerror = () => reject(new Error('Could not read the text file. It might be corrupted.'));
                reader.readAsText(file);
            });
        }

        if (ext === 'pdf') {
            try {
                const pdfjsLib = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs');
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                let fullText = '';
                const maxPages = Math.min(pdf.numPages, 30);
                for (let i = 1; i <= maxPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    fullText += content.items.map(item => item.str).join(' ') + '\n';
                }
                if (pdf.numPages > maxPages) {
                    fullText += `\n[Note: Document has ${pdf.numPages} pages, only first ${maxPages} processed.]`;
                }
                return fullText;
            } catch (err) {
                throw new Error('Could not read this PDF. It may be encrypted or damaged.');
            }
        }

        if (ext === 'docx') {
            try {
                const mammoth = await loadMammoth();
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.extractRawText({ arrayBuffer });
                return result.value;
            } catch (err) {
                throw new Error('Could not read this Word document (.docx). Please make sure the file is not corrupted.');
            }
        }

        if (ext === 'doc') {
            throw new Error('Old .doc files are not supported. Please save the file as .docx (Word 2007 or newer) or convert to PDF.');
        }

        throw new Error('This file type is not supported. Please upload a PDF, Word (.docx), or plain text file.');
    }

    // Compress image and return data URL
    async function compressImageIfNeeded(dataURL) {
        if (!dataURL || dataURL.length < 500 * 1024) return dataURL;
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

    async function processFile(file) {
        const ext = file.name.split('.').pop().toLowerCase();

        if (['pdf', 'docx', 'doc', 'txt'].includes(ext)) {
            const idx = attachments.push({
                type: 'document',
                name: file.name,
                textContent: null,
                processing: true
            }) - 1;
            renderAttachments();
            showToast('Processing document…', 'info', 2000);
            try {
                const text = await extractTextFromFile(file);
                attachments[idx].textContent = text.substring(0, 15000);
                attachments[idx].processing = false;
                renderAttachments();
                showToast('Document added successfully', 'success');
            } catch (err) {
                attachments.splice(idx, 1);
                renderAttachments();
                showToast(err.message, 'error');
                return;
            }
        } else if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            const dataURL = await new Promise(resolve => {
                reader.onload = e => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
            const compressed = await compressImageIfNeeded(dataURL);

            const attObj = {
                type: 'image',
                name: file.name,
                dataURL: compressed,
                ocrText: '',
                ocrProcessing: true
            };
            const idx = attachments.push(attObj) - 1;
            renderAttachments();
            showToast('Image added, extracting text…', 'info', 2000);

            runOCR(compressed)
                .then(ocrResult => {
                    attachments[idx].ocrText = ocrResult || '';
                    attachments[idx].ocrProcessing = false;
                    renderAttachments();
                    if (ocrResult) {
                        showToast('Text extracted from image', 'success', 2000);
                    } else {
                        showToast('No text found in image, it will be included as a note.', 'info', 2500);
                    }
                    saveProgress();
                })
                .catch(err => {
                    console.warn('OCR error', err);
                    attachments[idx].ocrText = '';
                    attachments[idx].ocrProcessing = false;
                    renderAttachments();
                    saveProgress();
                });
        } else {
            showToast(`File type not supported: ${file.name}`, 'error');
            return;
        }

        validateForm();
        saveProgress();
    }

    function handleFiles(files) {
        if (!files || files.length === 0) return;
        const maxFiles = 10 - attachments.length;
        if (files.length > maxFiles) {
            showToast(`You can add up to ${maxFiles} more file${maxFiles !== 1 ? 's' : ''} (max 10 total)`, 'warning');
            return;
        }
        Array.from(files).forEach(f => processFile(f));
        multiFileInput.accept = '.pdf,.docx,.txt,.doc,image/*';
    }

    multiFileInput.addEventListener('change', () => {
        if (multiFileInput.files.length) {
            handleFiles(multiFileInput.files);
            multiFileInput.value = '';
        }
    });

    cameraInput.addEventListener('change', () => {
        if (cameraInput.files.length) {
            handleFiles(cameraInput.files);
            cameraInput.value = '';
        }
    });

    multiDropZone.addEventListener('dragover', e => {
        e.preventDefault();
        multiDropZone.style.borderColor = 'var(--presentation-accent)';
    });

    multiDropZone.addEventListener('dragleave', () => {
        multiDropZone.style.borderColor = 'var(--border-light)';
    });

    multiDropZone.addEventListener('drop', e => {
        e.preventDefault();
        multiDropZone.style.borderColor = 'var(--border-light)';
        handleFiles(e.dataTransfer.files);
    });

    clearTextBtn.addEventListener('click', () => {
        if (textInput.value.trim() && !confirm('Clear all text?')) return;
        textInput.value = '';
        updateWordCount();
        validateForm();
        saveProgress();
        showToast('Text cleared', 'info');
    });

    textInput.addEventListener('input', () => {
        updateWordCount();
        validateForm();
    });

    // =========================================================================
    // Auto‑save
    // =========================================================================
    async function saveProgress() {
        if (isRestoring) return;
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            const state = {
                version: 5,
                mode: currentMode,
                textContent: textInput.value,
                attachmentMeta: attachments.map(a => ({
                    type: a.type,
                    name: a.name,
                    ocrText: a.ocrText || ''
                })),
                patientName: patientName.value,
                patientAge: patientAge.value,
                patientGender: patientGender.value,
                patientMRN: patientMRN.value,
                patientDiagnosis: patientDiagnosis.value,
                profession: professionSelect.value,
                outlinePresentation: document.querySelector('input[name="outlinePresentation"]:checked')?.value || 'soap',
                outlineReport: document.querySelector('input[name="outlineReport"]:checked')?.value || 'progress',
                outlineDocumentation: document.querySelector('input[name="outlineDocumentation"]:checked')?.value || 'soap',
                customOutlinePresentation: customOutlinePresentation?.value || '',
                customOutlineReport: customOutlineReport?.value || '',
                customOutlineDocumentation: customOutlineDocumentation?.value || '',
                additionalInstructions: additionalInstructions.value,
                outputSize: document.querySelector('input[name="outputSize"]:checked')?.value || '5000',
                contentFidelity: getContentFidelity(),
                timestamp: Date.now()
            };
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
                console.log('Progress saved');
            } catch (e) {
                // If storage is full, try without attachment data
                const { attachmentMeta, ...rest } = state;
                try { localStorage.setItem(STORAGE_KEY, JSON.stringify(rest)); } catch (e2) { /* ignore */ }
            }
        }, 300);
    }

    async function loadProgress() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return false;
        try {
            isRestoring = true;
            const state = JSON.parse(saved);
            
            // Restore mode first
            if (state.mode && state.mode !== currentMode) {
                switchMode(state.mode);
            }
            
            if (state.textContent) {
                textInput.value = state.textContent;
                updateWordCount();
            }
            if (state.attachmentMeta?.length) {
                attachments = state.attachmentMeta.map(m => ({
                    type: m.type,
                    name: m.name,
                    ocrText: m.ocrText || '',
                    ocrProcessing: false,
                    textContent: m.type === 'document' ? null : undefined,
                    dataURL: null
                }));
                renderAttachments();
                showToast('Previously attached files shown below. Some may need re‑upload.', 'warning', 4000);
            }
            if (state.patientName) patientName.value = state.patientName;
            if (state.patientAge) patientAge.value = state.patientAge;
            if (state.patientGender) patientGender.value = state.patientGender;
            if (state.patientMRN) patientMRN.value = state.patientMRN;
            if (state.patientDiagnosis) patientDiagnosis.value = state.patientDiagnosis;
            if (state.profession) professionSelect.value = state.profession;
            
            // Restore presentation outline
            if (state.outlinePresentation) {
                const radio = document.querySelector(`input[name="outlinePresentation"][value="${state.outlinePresentation}"]`);
                if (radio) {
                    radio.checked = true;
                    if (state.outlinePresentation === 'custom') {
                        if (customOutlinePresentation) customOutlinePresentation.style.display = 'block';
                        if (customOutlineHintPresentation) customOutlineHintPresentation.style.display = 'flex';
                    }
                }
            }
            
            // Restore report outline
            if (state.outlineReport) {
                const radio = document.querySelector(`input[name="outlineReport"][value="${state.outlineReport}"]`);
                if (radio) {
                    radio.checked = true;
                    if (state.outlineReport === 'custom') {
                        if (customOutlineReport) customOutlineReport.style.display = 'block';
                        if (customOutlineHintReport) customOutlineHintReport.style.display = 'flex';
                    }
                }
            }
            
            // Restore documentation outline
            if (state.outlineDocumentation) {
                const radio = document.querySelector(`input[name="outlineDocumentation"][value="${state.outlineDocumentation}"]`);
                if (radio) {
                    radio.checked = true;
                    if (state.outlineDocumentation === 'custom') {
                        if (customOutlineDocumentation) customOutlineDocumentation.style.display = 'block';
                        if (customOutlineHintDocumentation) customOutlineHintDocumentation.style.display = 'flex';
                    }
                }
            }
            
            if (state.customOutlinePresentation) customOutlinePresentation.value = state.customOutlinePresentation;
            if (state.customOutlineReport) customOutlineReport.value = state.customOutlineReport;
            if (state.customOutlineDocumentation) customOutlineDocumentation.value = state.customOutlineDocumentation;
            if (state.additionalInstructions) additionalInstructions.value = state.additionalInstructions;
            
            if (state.outputSize) {
                const sizeRadio = document.querySelector(`input[name="outputSize"][value="${state.outputSize}"]`);
                if (sizeRadio) sizeRadio.checked = true;
            }

            // Restore content fidelity
            if (state.contentFidelity) {
                const fidelityRadio = document.querySelector(`input[name="contentFidelity"][value="${state.contentFidelity}"]`);
                if (fidelityRadio) fidelityRadio.checked = true;
            }
            
            validateForm();
            isRestoring = false;
            return true;
        } catch (e) {
            console.error('Restore error:', e);
            isRestoring = false;
            return false;
        }
    }

    // Attach save triggers to form elements
    [textInput, patientName, patientAge, patientMRN, patientDiagnosis, additionalInstructions,
     customOutlinePresentation, customOutlineReport, customOutlineDocumentation]
        .forEach(el => el?.addEventListener('input', saveProgress));
    
    patientGender?.addEventListener('change', saveProgress);
    professionSelect?.addEventListener('change', saveProgress);
    
    // Save on outline radio changes for all modes
    [outlineRadiosPresentation, outlineRadiosReport, outlineRadiosDocumentation].forEach(group => {
        group.forEach(r => r.addEventListener('change', saveProgress));
    });
    
    // Save output size selection
    if (outputSizeRadios.length) {
        outputSizeRadios.forEach(r => r.addEventListener('change', saveProgress));
    }

    // Save content fidelity selection
    if (contentFidelityRadios.length) {
        contentFidelityRadios.forEach(r => r.addEventListener('change', saveProgress));
    }

    // Additional form validation triggers
    [patientName, patientAge, patientDiagnosis].forEach(el => el?.addEventListener('input', validateForm));
    patientGender?.addEventListener('change', validateForm);
    professionSelect?.addEventListener('change', validateForm);

    // =========================================================================
    // AI Generation – Mode‑adaptive prompts with Content Fidelity control
    // =========================================================================
    async function generatePresentation() {
        if (!aiConfig.token) {
            const ok = await fetchTokens();
            if (!ok) throw new Error('The AI service is not set up. Please contact support.');
        }

        // Gather text from the editor
        let combinedText = textInput.value.trim();

        // Append text from documents
        const docTexts = attachments
            .filter(a => a.type === 'document' && a.textContent)
            .map(a => a.textContent)
            .join('\n\n');
        if (docTexts) {
            combinedText += (combinedText ? '\n\n--- Document Content ---\n\n' : '') + docTexts;
        }

        // Append OCR text from images
        const imageOcrTexts = attachments
            .filter(a => a.type === 'image' && a.ocrText)
            .map(a => a.ocrText)
            .join('\n\n');
        if (imageOcrTexts) {
            combinedText += (combinedText ? '\n\n--- Text Extracted from Images ---\n\n' : '') + imageOcrTexts;
        }

        if (!combinedText && attachments.length === 0) {
            throw new Error('No content to generate from.');
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
        const instructions = additionalInstructions.value.trim() || 'None provided';
        const maxTokens = getSelectedOutputSize();
        const fidelityMode = getContentFidelity();
        const isStrict = fidelityMode === 'strict';

        // Mode-specific labels and descriptions
        const modeLabels = {
            presentation: 'Ward Round Case Presentation',
            report: 'Clinical Report',
            documentation: 'Clinical Documentation'
        };
        const modeText = modeLabels[currentMode] || 'Clinical Document';
        
        const modeContext = {
            presentation: 'a multidisciplinary team ward round meeting',
            report: 'a formal clinical report for the medical record',
            documentation: 'clinical documentation for the patient chart'
        };
        const contextText = modeContext[currentMode] || 'clinical review';

        // Build the fidelity rule
        const fidelityRule = isStrict
            ? `0. **FIDELITY RULE (STRICT):** You MUST NOT invent, assume, or add ANY clinical information, history, examination findings, or patient details that are not explicitly stated in the provided clinical notes. If a section lacks data, state clearly that the information is "not provided" or "not documented". Do NOT fabricate plausible details. Only organise and format what is given.`
            : `0. **FIDELITY RULE (FLEXIBLE):** You may expand the provided information with plausible, clinically appropriate details where necessary to create a coherent document, but clearly indicate any inferred or typical findings as "likely" or "based on typical presentation". However, do not invent specific patient history events.`;

        const systemPrompt = `You are an expert clinical assistant helping a ${profession} prepare a comprehensive **${modeText}**.

Your task is to create a **thorough, detailed, and professional** ${modeText.toLowerCase()} that demonstrates deep clinical reasoning and provides actionable insights, appropriate for ${contextText}.

**CRITICAL INSTRUCTIONS:**

${fidelityRule}

1. **Follow this outline structure exactly:** ${outline}

2. **Be comprehensive and detailed:**
   - Each section should contain **substantial content** (not just 1-2 lines)
   - Include **specific clinical details**, measurements, observations, and findings
   - Provide **clear clinical reasoning** for assessments and decisions
   - Give **actionable, specific recommendations** with rationale
   - The total output should be appropriate for the token limit provided

3. **Format requirements:**
   - Use markdown headings: ## for main sections, ### for subsections
   - Use bullet points (-) for lists
   - Use **bold** for emphasis on key findings or critical items
   - Use professional clinical language appropriate for ${currentMode === 'documentation' ? 'medical records' : currentMode === 'report' ? 'formal reports' : 'multidisciplinary presentations'}
   - Do NOT use tables
   - Maintain clear section separation

4. **Quality standards:**
   - Write at the level expected for ${contextText}
   - Include relevant functional assessments (mobility, ADLs, cognition, communication, etc.)
   - Consider holistic patient needs (physical, psychological, social)
   - Reference evidence-based practice where appropriate
   - Highlight risks, precautions, and safety considerations
   - Include measurable goals and outcome measures where possible

5. **Tone:** Professional, objective, and patient-centered. Be specific rather than vague.

Make this **${modeText}** worthy of a senior clinician's review.`;

        let userContent = `**TASK:** Create a ${modeText.toLowerCase()} for the following patient.

**PATIENT INFORMATION:**
- Name: ${patientInfo.name}
- Age: ${patientInfo.age}
- Gender: ${patientInfo.gender}
- MRN: ${patientInfo.mrn}
- Primary Diagnosis: ${patientInfo.diagnosis}

**CLINICIAN ROLE:** ${profession}

**ADDITIONAL INSTRUCTIONS:** ${instructions}

**FIDELITY MODE:** ${isStrict ? 'STRICT – Use only provided information. Do NOT fabricate or assume ANY details.' : 'FLEXIBLE – You may add plausible clinical details where needed, but indicate inferred findings.'}

**CLINICAL NOTES & EXTRACTED TEXT:**
${combinedText || 'No clinical notes provided.'}

---

Please create a detailed ${modeText.toLowerCase()} based on the above information. Ensure each section contains thorough clinical detail and actionable recommendations.`;

        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent }
        ];

        console.log('[AI] Sending request to DeepSeek API...');
        console.log('[AI] Mode:', currentMode, '| Fidelity:', fidelityMode, '| Text length:', combinedText.length, 'chars | Max tokens:', maxTokens);

        const url = `${aiConfig.endpoint}/chat/completions`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${aiConfig.token}`
            },
            body: JSON.stringify({
                model: aiConfig.model,
                messages,
                max_tokens: maxTokens,
                temperature: 0.3,
                top_p: 0.9
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            console.error('[AI] API error:', errData);
            
            if (response.status === 401) {
                throw new Error('Authentication failed. Please check your API key.');
            } else if (response.status === 429) {
                throw new Error('Too many requests. Please wait a moment and try again.');
            } else if (response.status === 503) {
                throw new Error('The AI service is temporarily busy. Please try again in a few minutes.');
            } else {
                const msg = errData?.error?.message || `Service error (${response.status})`;
                throw new Error(msg);
            }
        }

        const data = await response.json();
        console.log('[AI] Response received, tokens used:', data.usage?.total_tokens || 'N/A');
        
        return data.choices[0].message.content;
    }

    async function saveToHistory(rawMarkdown, htmlContent) {
        if (!currentUser) return null;
        
        const modeLabels = {
            presentation: 'Case Presentation',
            report: 'Clinical Report',
            documentation: 'Documentation'
        };
        const docType = modeLabels[currentMode] || 'Clinical Document';
        
        try {
            const ref = await database.ref(`history/${currentUser.uid}/caseHistory`).push({
                contentType: currentMode,
                fileName: `${docType} - ${patientName.value || 'Patient'}`,
                documentType: docType,
                patientName: patientName.value.trim(),
                patientAge: patientAge.value,
                patientGender: patientGender.value,
                patientMRN: patientMRN.value.trim(),
                diagnosis: patientDiagnosis.value.trim(),
                profession: professionSelect.value,
                results: rawMarkdown,
                resultsMarkdown: rawMarkdown,
                resultsHtml: htmlContent,
                outputSize: getSelectedOutputSize(),
                contentFidelity: getContentFidelity(),
                mode: currentMode,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                date: new Date().toLocaleDateString(),
                time: new Date().toLocaleTimeString()
            });
            return ref.key;
        } catch (error) {
            showToast('Could not save to history. Check your connection.', 'error');
            return null;
        }
    }

    // =========================================================================
    // Preview Modal
    // =========================================================================
    function showPreviewModal(htmlContent, historyId) {
        const exist = document.querySelector('.preview-modal');
        if (exist) exist.remove();
        
        const patient = patientName.value.trim() || 'Patient';
        const dateStr = new Date().toLocaleString();
        const professionText = professionSelect.options[professionSelect.selectedIndex]?.text || '';
        
        const modeLabels = {
            presentation: 'Presentation',
            report: 'Report',
            documentation: 'Documentation'
        };
        const modeLabel = modeLabels[currentMode] || 'Document';

        const fidelityLabel = getContentFidelity() === 'strict' 
            ? '🔒 Strict (no fabricated content)' 
            : '⚠️ Flexible (may include inferred details)';

        const modalHtml = `
            <div class="preview-modal">
                <div class="preview-overlay"></div>
                <div class="preview-card">
                    <div class="preview-card-header">
                        <div class="preview-icon">📋</div>
                        <h3>${modeLabel} Ready</h3>
                        <button class="preview-close">&times;</button>
                    </div>
                    <div class="preview-card-body">
                        <div class="preview-info">
                            <span class="preview-badge">✅ Generated Successfully</span>
                            <span class="preview-date">${dateStr}</span>
                        </div>
                        <p class="preview-description">
                            ${modeLabel} for <strong>${escapeHtml(patient)}</strong> 
                            ${professionText ? `(${escapeHtml(professionText)})` : ''} 
                            has been generated and saved to your history.
                        </p>
                        <div style="margin-bottom: 16px; padding: 8px 12px; background: ${getContentFidelity() === 'strict' ? '#f0fdf4' : '#fefce8'}; border-radius: 8px; font-size: 0.8rem; color: ${getContentFidelity() === 'strict' ? '#15803d' : '#854d0e'};">
                            ${fidelityLabel}
                        </div>
                        <div class="preview-actions">
                            <button class="preview-btn primary" id="viewFullPresentationBtn">
                                📖 View Full ${modeLabel}
                            </button>
                            <button class="preview-btn secondary" id="closePreviewBtn">
                                ✕ Close
                            </button>
                        </div>
                        <div class="preview-note">
                            <small>The full ${modeLabel.toLowerCase()} will open in a new tab with editing and export options.</small>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = document.querySelector('.preview-modal');
        
        const close = () => {
            modal.style.opacity = '0';
            modal.style.transition = 'opacity 0.2s ease';
            setTimeout(() => modal.remove(), 200);
        };
        
        modal.querySelector('.preview-close').addEventListener('click', close);
        modal.querySelector('#closePreviewBtn').addEventListener('click', close);
        modal.querySelector('.preview-overlay').addEventListener('click', close);
        
        modal.querySelector('#viewFullPresentationBtn').addEventListener('click', () => {
            if (historyId) {
                window.open(`caseresult.html?id=${historyId}`, '_blank');
                close();
            } else {
                showToast('Document ID missing', 'error');
            }
        });
        
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') { 
                close(); 
                document.removeEventListener('keydown', escHandler); 
            }
        });
    }

    // =========================================================================
    // Generate button handler
    // =========================================================================
    generateBtn.addEventListener('click', async () => {
        if (!currentUser) {
            showToast('Please log in first', 'error');
            document.getElementById('loginBtn')?.click();
            return;
        }
        
        if (!patientName.value.trim()) { 
            showToast('Please enter the patient\'s name', 'error'); 
            patientName.focus(); 
            return; 
        }
        
        if (!professionSelect.value) { 
            showToast('Please select your profession', 'error'); 
            professionSelect.focus(); 
            return; 
        }
        
        if (!textInput.value.trim() && attachments.length === 0) {
            showToast('Enter some notes or attach files', 'error');
            textInput.focus();
            return;
        }

        const ocrPending = attachments.some(a => a.type === 'image' && a.ocrProcessing);
        if (ocrPending) {
            showToast('Still extracting text from images. Please wait a moment.', 'info', 3000);
            return;
        }

        const origHTML = generateBtn.innerHTML;
        generateBtn.disabled = true;
        
        const loadingLabels = {
            presentation: 'Generating Presentation…',
            report: 'Generating Report…',
            documentation: 'Generating Documentation…'
        };
        generateBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${loadingLabels[currentMode] || 'Generating…'}`;

        try {
            const start = Date.now();
            const rawMarkdown = await generatePresentation();
            const htmlContent = marked.parse(rawMarkdown);
            const historyId = await saveToHistory(rawMarkdown, htmlContent);
            currentHistoryIdInput.value = historyId || '';
            localStorage.removeItem(STORAGE_KEY);
            showPreviewModal(htmlContent, historyId);
            const secs = ((Date.now() - start) / 1000).toFixed(1);
            showToast(`Generated in ${secs}s`, 'success');
        } catch (err) {
            console.error('[GENERATE] Error:', err);
            
            let msg = err.message;
            if (msg.includes('API key') || msg.includes('token') || msg.includes('not set up'))
                msg = 'The AI service is not configured correctly. Please contact support.';
            else if (msg.toLowerCase().includes('rate'))
                msg = 'Too many requests. Please wait a moment and try again.';
            else if (msg.includes('busy') || msg.includes('503'))
                msg = 'The service is temporarily busy. Please try again in a few minutes.';
            else if (msg.includes('network') || msg.includes('fetch'))
                msg = 'Network error. Please check your internet connection.';
            
            showToast(`Error: ${msg}`, 'error', 5000);
        } finally {
            generateBtn.disabled = false;
            generateBtn.innerHTML = origHTML;
            validateForm();
        }
    });

    // =========================================================================
    // History drawer
    // =========================================================================
    let allHistoryEntries = [];

    async function deleteHistoryItem(key, event) {
        event.stopPropagation();
        if (!currentUser) return showToast('Log in to manage history', 'error');
        if (!confirm('Permanently delete this document?')) return;
        try {
            await database.ref(`history/${currentUser.uid}/caseHistory/${key}`).remove();
            try { await database.ref(`publicAnalysis/${key}`).remove(); } catch (e) { }
            showToast('Deleted', 'success');
            loadHistory();
        } catch (error) {
            showToast('Failed to delete. Try again.', 'error');
        }
    }

    function renderHistory(entries) {
        if (!historyList) return;
        historyList.innerHTML = '';
        if (!entries.length) {
            historyList.innerHTML = `
                <div class="empty-state">
                    <i class="bx bx-folder-open"></i>
                    <p>No document history found</p>
                    <small>Generate your first document to see it here</small>
                </div>
            `;
            return;
        }
        entries.forEach(([key, item]) => {
            const div = document.createElement('div');
            div.className = 'history-item';
            
            const modeLabel = item.mode === 'report' ? 'Report' : 
                             item.mode === 'documentation' ? 'Documentation' : 'Presentation';
            
            const fidelityTag = item.contentFidelity === 'flexible' 
                ? '<span style="font-size: 0.7rem; background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; margin-left: 6px;">Flexible</span>' 
                : '';
            
            div.innerHTML = `
                <div class="history-info" style="flex:1;">
                    <span class="history-name">${escapeHtml(item.patientName || 'Unknown Patient')}${fidelityTag}</span>
                    <span style="font-size: 0.85rem; color: var(--text-secondary);">${escapeHtml(modeLabel)}</span>
                    <div class="history-meta">
                        <span><i class="far fa-calendar-alt"></i> ${escapeHtml(item.date || '')}</span>
                        <span><i class="far fa-clock"></i> ${escapeHtml(item.time || '')}</span>
                        ${item.profession ? `<span><i class="fas fa-user-md"></i> ${escapeHtml(item.profession)}</span>` : ''}
                    </div>
                </div>
                <div class="history-actions">
                    <button class="delete-btn" data-key="${key}" title="Delete Document" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 1.1rem; padding: 6px; border-radius: 50%; transition: all 0.2s;">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
            
            const deleteBtn = div.querySelector('.delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => deleteHistoryItem(key, e));
            }
            
            div.addEventListener('click', (e) => {
                if (!e.target.closest('button')) window.open(`caseresult.html?id=${key}`, '_blank');
            });
            
            historyList.appendChild(div);
        });
    }

    function filterHistory(term) {
        const s = term.toLowerCase().trim();
        if (!s) renderHistory(allHistoryEntries);
        else {
            const filtered = allHistoryEntries.filter(([_, item]) =>
                (item.patientName || '').toLowerCase().includes(s) ||
                (item.profession || '').toLowerCase().includes(s) ||
                (item.diagnosis || '').toLowerCase().includes(s) ||
                (item.documentType || '').toLowerCase().includes(s) ||
                (item.mode || '').toLowerCase().includes(s)
            );
            renderHistory(filtered);
        }
    }

    function loadHistory() {
        if (!currentUser) return;
        database.ref(`history/${currentUser.uid}/caseHistory`)
            .orderByChild('timestamp')
            .on('value', snapshot => {
                const data = snapshot.val();
                if (!data) { allHistoryEntries = []; renderHistory([]); return; }
                allHistoryEntries = Object.entries(data)
                    .filter(([_, item]) => ['presentation', 'report', 'documentation'].includes(item.contentType))
                    .sort((a, b) => (b[1].timestamp || 0) - (a[1].timestamp || 0));
                filterHistory(historySearchInput?.value || '');
            }, error => {
                console.error('History load error:', error);
                allHistoryEntries = [];
                renderHistory([]);
            });
    }

    // History drawer controls
    if (historyNavBtn) {
        historyNavBtn.addEventListener('click', () => {
            if (!currentUser) { 
                showToast('Please log in to view history', 'error'); 
                const loginBtn = document.getElementById('loginBtn');
                if (loginBtn) loginBtn.click();
                return; 
            }
            historyDrawer.classList.add('active');
            loadHistory();
        });
    }
    
    if (closeDrawerBtn) {
        closeDrawerBtn.addEventListener('click', () => historyDrawer.classList.remove('active'));
    }
    
    document.addEventListener('click', e => {
        if (historyDrawer?.classList.contains('active') && 
            !historyDrawer.contains(e.target) &&
            e.target !== historyNavBtn && 
            !historyNavBtn?.contains(e.target)) {
            historyDrawer.classList.remove('active');
        }
    });
    
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && historyDrawer?.classList.contains('active')) {
            historyDrawer.classList.remove('active');
        }
    });
    
    if (historySearchInput) {
        historySearchInput.addEventListener('input', e => filterHistory(e.target.value));
    }

    // =========================================================================
    // Auth & initialization
    // =========================================================================
    firebase.auth().onAuthStateChanged(user => {
        currentUser = user;
        if (user) { 
            console.log('[AUTH] User logged in:', user.email);
            historyNavBtn.style.display = 'block'; 
            loadHistory(); 
        } else { 
            console.log('[AUTH] User logged out');
            historyNavBtn.style.display = 'none'; 
        }
        validateForm();
    });

    // Initialize app
    async function initialize() {
        console.log('[INIT] Starting Multi‑mode Clinical Assistant...');
        
        await fetchTokens();
        updateWordCount();
        validateForm();
        
        setTimeout(async () => { 
            const restored = await loadProgress();
            if (!restored) console.log('[INIT] Fresh session started');
            
            // Ensure correct mode section visibility after restore
            configSections.forEach(section => {
                section.style.display = section.dataset.mode === currentMode ? 'block' : 'none';
            });
        }, 100);
        
        console.log('[INIT] Multi‑mode assistant ready (Presentation, Report, Documentation)');
        console.log('[INIT] Content Fidelity default:', getContentFidelity());
    }

    initialize();
});
