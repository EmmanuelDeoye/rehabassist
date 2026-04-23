// documentation.js - Auto-Save Works Without Login with Preview Modal & Delete History
document.addEventListener('DOMContentLoaded', function() {
    // =========================================================================
    // 1. DOM ELEMENTS
    // =========================================================================
    const switchBtns = document.querySelectorAll('.switch-btn');
    const textUploadSection = document.getElementById('textUploadSection');
    const documentUploadSection = document.getElementById('documentUploadSection');
    const audioUploadSection = document.getElementById('audioUploadSection');
    const imageUploadSection = document.getElementById('imageUploadSection');
    const plainTextInput = document.getElementById('plainTextInput');
    const textWordCount = document.getElementById('textWordCount');
    const clearTextBtn = document.getElementById('clearTextBtn');

    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const browseDocumentBtn = document.getElementById('browseDocumentBtn');

    const audioDropZone = document.getElementById('audioDropZone');
    const audioFileInput = document.getElementById('audioFileInput');
    const browseAudioBtn = document.getElementById('browseAudioBtn');
    const audioFileInfo = document.getElementById('audioFileInfo');
    const audioTranscriptPreview = document.getElementById('audioTranscriptPreview');
    const transcriptPreviewText = document.getElementById('transcriptPreviewText');

    const imageDropZone = document.getElementById('imageDropZone');
    const imageFileInput = document.getElementById('imageFileInput');
    const cameraBtn = document.getElementById('cameraBtn');
    const galleryBtn = document.getElementById('galleryBtn');
    const imageFileInfo = document.getElementById('imageFileInfo');
    const imagePreview = document.getElementById('imagePreview');
    const previewImage = document.getElementById('previewImage');

    const chipBtns = document.querySelectorAll('.chip-btn');
    const tags = document.querySelectorAll('.tag');
    const analysisTextarea = document.getElementById('analysisRequest');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const historyDrawer = document.getElementById('historyDrawer');
    const toggleHistoryBtn = document.getElementById('toggleHistoryBtn');
    const closeDrawerBtn = document.getElementById('closeDrawerBtn');
    const analysisResultsContainer = document.getElementById('analysisResultsContainer');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const reportContentArea = document.getElementById('reportContentArea');
    const resultsContent = document.getElementById('resultsContent');
    const downloadReport = document.getElementById('downloadReport');
    const closeResultsBtn = document.getElementById('closeResultsBtn');
    const reportDate = document.getElementById('reportDate');
    
    // History search
    const historySearchInput = document.getElementById('historySearchInput');

    // =========================================================================
    // 2. STATE & CONFIG
    // =========================================================================
    let aiConfig = { token: null, endpoint: null, model: "openai/gpt-4.1" };
    let currentUser = null;
    let activeMode = 'text';
    let documentType = null;
    let uploadedFile = null;
    let extractedDocumentText = "";
    let uploadedAudioFile = null;
    let audioTranscript = "";
    let uploadedImageFile = null;
    let imageDataURL = null;
    let analysisResults = null;
    let isTranscribing = false;
    let saveTimeout = null;
    let isRestoring = false;
    let allHistoryEntries = []; // Store all entries for filtering
    const STORAGE_KEY = 'rehab_doc_assistant_state';
    
    const MAX_TOKENS_PER_REQUEST = 4000;
    const MAX_CONTENT_LENGTH = 10000;

    const database = firebase.database();

    // =========================================================================
    // 3. UTILITIES
    // =========================================================================
    function showToast(message, type = 'success', duration = 3000) {
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 2000;';
            document.body.appendChild(toastContainer);
        }
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i><span>${message}</span>`;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), duration);
    }

    async function fetchAPITokens() {
        try {
            const snapshot = await database.ref('tokens/openAI').once('value');
            const data = snapshot.val();
            if (data && data.openai_token && data.github_endpoint) {
                aiConfig.token = data.openai_token;
                aiConfig.endpoint = data.github_endpoint;
                console.log('AI tokens loaded');
                return true;
            }
            return false;
        } catch (error) {
            console.error('Token fetch error:', error);
            return false;
        }
    }

    function truncateContent(content, maxLength = MAX_CONTENT_LENGTH) {
        if (content.length <= maxLength) return content;
        const truncated = content.substring(0, maxLength);
        const lastPeriod = truncated.lastIndexOf('.');
        const lastNewline = truncated.lastIndexOf('\n');
        const cutPoint = Math.max(lastPeriod, lastNewline, maxLength - 500);
        return truncated.substring(0, cutPoint) + "\n\n[Content truncated due to length limits]";
    }

    function compressImageDataURL(dataURL, maxSizeMB = 1) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const maxDimension = 1024;
                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = (height / width) * maxDimension;
                        width = maxDimension;
                    } else {
                        width = (width / height) * maxDimension;
                        height = maxDimension;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                let quality = 0.8;
                let result = canvas.toDataURL('image/jpeg', quality);
                while (result.length > maxSizeMB * 1024 * 1024 && quality > 0.3) {
                    quality -= 0.1;
                    result = canvas.toDataURL('image/jpeg', quality);
                }
                resolve(result);
            };
            img.src = dataURL;
        });
    }

    function updateAnalyzeButtonState() {
        let hasContent = false;
        if (activeMode === 'text') {
            hasContent = plainTextInput && plainTextInput.value.trim().length > 0;
        } else if (activeMode === 'document') {
            hasContent = (uploadedFile !== null) || (extractedDocumentText.length > 0);
        } else if (activeMode === 'audio') {
            hasContent = audioTranscript.length > 0;
        } else if (activeMode === 'image') {
            hasContent = imageDataURL !== null;
        }
        const hasType = documentType !== null;
        const hasRequest = activeMode === 'audio' ? true : (analysisTextarea && analysisTextarea.value.trim().length > 0);
        const shouldEnable = hasContent && hasType && hasRequest && !isTranscribing;
        if (analyzeBtn) analyzeBtn.disabled = !shouldEnable;
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

    // =========================================================================
    // 3.5. SCROLL INDICATORS
    // =========================================================================
    function initScrollIndicators() {
        const uploadContainer = document.querySelector('.upload-type-container');
        if (!uploadContainer) return;
        
        function updateScrollIndicators() {
            const isScrollable = uploadContainer.scrollWidth > uploadContainer.clientWidth;
            if (isScrollable) {
                const isAtStart = uploadContainer.scrollLeft <= 10;
                const isAtEnd = uploadContainer.scrollLeft + uploadContainer.clientWidth >= uploadContainer.scrollWidth - 10;
                uploadContainer.classList.toggle('is-scrollable-start', !isAtStart);
                uploadContainer.classList.toggle('is-scrollable-end', !isAtEnd);
            } else {
                uploadContainer.classList.remove('is-scrollable-start', 'is-scrollable-end');
            }
        }
        uploadContainer.addEventListener('scroll', updateScrollIndicators);
        window.addEventListener('resize', updateScrollIndicators);
        updateScrollIndicators();
    }

    // =========================================================================
    // 4. ENHANCED STATE PERSISTENCE (Works without login)
    // =========================================================================
    async function saveProgressImmediate() {
        if (isRestoring) {
            console.log('[SAVE] Skipping save during restore');
            return;
        }
        
        let savedImageData = imageDataURL;
        if (savedImageData && savedImageData.length > 1.5 * 1024 * 1024) {
            try {
                savedImageData = await compressImageDataURL(savedImageData, 1);
                console.log('[SAVE] Image compressed for storage');
            } catch (e) {
                console.warn('[SAVE] Could not compress image, skipping', e);
                savedImageData = null;
                showToast('Image too large, will not persist after reload', 'warning');
            }
        }

        const state = {
            version: 2,
            activeMode: activeMode,
            documentType: documentType,
            analysisRequest: analysisTextarea ? analysisTextarea.value : '',
            plainText: plainTextInput ? plainTextInput.value : '',
            extractedDocumentText: extractedDocumentText,
            fileName: uploadedFile ? uploadedFile.name : null,
            audioTranscript: audioTranscript,
            audioFileName: uploadedAudioFile ? uploadedAudioFile.name : null,
            imageDataURL: savedImageData,
            imageFileName: uploadedImageFile ? uploadedImageFile.name : null,
            analysisResults: analysisResults,
            reportDate: reportDate ? reportDate.textContent : '',
            resultsVisible: analysisResultsContainer && analysisResultsContainer.style.display === 'block',
            timestamp: Date.now()
        };
        
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            console.log('[SAVE] ✓ Successfully saved to localStorage');
        } catch (e) {
            console.error('[SAVE] Error:', e);
            if (e.name === 'QuotaExceededError') {
                showToast('Storage limit reached. Large images may not persist.', 'warning');
                const { imageDataURL: _, ...stateWithoutImage } = state;
                localStorage.setItem(STORAGE_KEY, JSON.stringify(stateWithoutImage));
            }
        }
    }

    function saveProgress() {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => saveProgressImmediate(), 300);
    }

    function restoreModeContent(state) {
        if (activeMode === 'text') {
            if (state.plainText && plainTextInput) {
                plainTextInput.value = state.plainText;
                updateWordCount();
            }
        } else if (activeMode === 'document') {
            if (state.fileName) {
                uploadedFile = { name: state.fileName, mock: true };
                displayFileInfo(uploadedFile);
                if (state.extractedDocumentText) {
                    extractedDocumentText = state.extractedDocumentText;
                }
            }
        } else if (activeMode === 'audio') {
            if (state.audioFileName) {
                uploadedAudioFile = { name: state.audioFileName, mock: true };
                displayAudioFileInfo(uploadedAudioFile);
            }
            if (state.audioTranscript) {
                audioTranscript = state.audioTranscript;
                if (audioTranscriptPreview) audioTranscriptPreview.style.display = 'block';
                if (transcriptPreviewText) transcriptPreviewText.textContent = audioTranscript;
            }
        } else if (activeMode === 'image') {
            if (state.imageDataURL && state.imageFileName) {
                uploadedImageFile = { name: state.imageFileName };
                imageDataURL = state.imageDataURL;
                displayImagePreview(imageDataURL, state.imageFileName);
            }
        }
    }

    async function loadProgress() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return false;
        
        try {
            isRestoring = true;
            const state = JSON.parse(saved);
            
            if (state.activeMode) {
                const targetBtn = document.querySelector(`.switch-btn[data-type="${state.activeMode}"]`);
                if (targetBtn) {
                    targetBtn.click();
                    await new Promise(r => setTimeout(r, 100));
                    restoreModeContent(state);
                } else {
                    activeMode = state.activeMode;
                    setActiveMode(activeMode);
                    restoreModeContent(state);
                }
            } else {
                restoreModeContent(state);
            }
            
            if (state.documentType) {
                documentType = state.documentType;
                if (chipBtns) {
                    chipBtns.forEach(btn => {
                        if (btn.dataset.type === state.documentType) btn.classList.add('active');
                        else btn.classList.remove('active');
                    });
                }
            }
            if (state.analysisRequest && analysisTextarea) {
                analysisTextarea.value = state.analysisRequest;
            }
            
            if (state.analysisResults) {
                analysisResults = state.analysisResults;
                displayResults(analysisResults);
                if (state.reportDate && reportDate) reportDate.textContent = state.reportDate;
                if (state.resultsVisible && analysisResultsContainer) {
                    analysisResultsContainer.style.display = 'block';
                    if (loadingIndicator) loadingIndicator.style.display = 'none';
                    if (reportContentArea) reportContentArea.style.display = 'block';
                }
            }
            
            updateAnalyzeButtonState();
            isRestoring = false;
            return true;
        } catch (e) {
            console.error('[LOAD] Error loading state:', e);
            isRestoring = false;
            return false;
        }
    }

    function updateWordCount() {
        if (!plainTextInput || !textWordCount) return;
        const text = plainTextInput.value.trim();
        const words = text ? text.split(/\s+/).length : 0;
        textWordCount.textContent = `${words} word${words !== 1 ? 's' : ''}`;
        updateAnalyzeButtonState();
    }

    // =========================================================================
    // 5. MODE SWITCHING
    // =========================================================================
    function setActiveMode(mode) {
        activeMode = mode;
        if (textUploadSection) textUploadSection.style.display = mode === 'text' ? 'block' : 'none';
        if (documentUploadSection) documentUploadSection.style.display = mode === 'document' ? 'block' : 'none';
        if (audioUploadSection) audioUploadSection.style.display = mode === 'audio' ? 'block' : 'none';
        if (imageUploadSection) imageUploadSection.style.display = mode === 'image' ? 'block' : 'none';
        updateAnalyzeButtonState();
        saveProgress();
    }

    if (switchBtns) {
        switchBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                switchBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                setActiveMode(btn.dataset.type);
            });
        });
    }

    // =========================================================================
    // 6. TEXT MODE
    // =========================================================================
    if (plainTextInput) {
        plainTextInput.addEventListener('input', () => {
            updateWordCount();
            saveProgress();
            updateAnalyzeButtonState();
        });
    }
    if (clearTextBtn) {
        clearTextBtn.addEventListener('click', () => {
            if (plainTextInput) plainTextInput.value = '';
            updateWordCount();
            saveProgress();
            updateAnalyzeButtonState();
            showToast('Text cleared', 'info');
        });
    }

    // =========================================================================
    // 7. DOCUMENT MODE
    // =========================================================================
    function displayFileInfo(file) {
        if (!fileInfo) return;
        fileInfo.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-file-alt" style="color: var(--accent);"></i>
                    <strong>${escapeHtml(file.name)}</strong>
                    ${!file.mock ? `<span style="font-size:0.8rem;">(${(file.size / 1024).toFixed(1)} KB)</span>` : ''}
                </div>
                <button class="remove-file-btn" id="removeDocumentBtn" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 1.2rem; padding: 5px;" title="Remove document">
                    <i class="fas fa-times-circle"></i>
                </button>
            </div>
        `;
        fileInfo.style.display = 'block';
        const removeBtn = document.getElementById('removeDocumentBtn');
        if (removeBtn) removeBtn.addEventListener('click', removeDocument);
    }

    function removeDocument() {
        uploadedFile = null;
        extractedDocumentText = "";
        if (fileInfo) {
            fileInfo.style.display = 'none';
            fileInfo.innerHTML = '';
        }
        updateAnalyzeButtonState();
        saveProgress();
        showToast('Document removed', 'info');
    }

    function handleFileUpload(file) {
        const validExt = ['pdf', 'doc', 'docx', 'txt'];
        const ext = file.name.split('.').pop().toLowerCase();
        if (!validExt.includes(ext)) {
            showToast('Please upload PDF, DOCX, or TXT file.', 'error');
            return;
        }
        uploadedFile = file;
        extractedDocumentText = "";
        displayFileInfo(file);
        showToast('Extracting text from document...', 'info');
        readFileAsText(file).then(text => {
            extractedDocumentText = truncateContent(text);
            saveProgress();
            updateAnalyzeButtonState();
            showToast('Document loaded successfully', 'success');
        }).catch(err => {
            console.error(err);
            showToast('Failed to extract text from document', 'error');
        });
        updateAnalyzeButtonState();
    }

    async function readFileAsText(file) {
        return new Promise(async (resolve, reject) => {
            if (file.type !== 'application/pdf') {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.onerror = reject;
                reader.readAsText(file);
                return;
            }
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
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    fullText += pageText + '\n\n';
                    if (fullText.length > MAX_CONTENT_LENGTH) break;
                }
                if (pdf.numPages > maxPages) fullText += `\n\n[Note: Document has ${pdf.numPages} pages. Only first ${maxPages} pages were processed.]`;
                resolve(fullText);
            } catch (err) {
                reject(err);
            }
        });
    }

    if (dropZone) {
        dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.style.borderColor = 'var(--accent)'; });
        dropZone.addEventListener('dragleave', () => { if (dropZone) dropZone.style.borderColor = 'var(--border-light)'; });
        dropZone.addEventListener('drop', e => {
            e.preventDefault();
            if (dropZone) dropZone.style.borderColor = 'var(--border-light)';
            if (e.dataTransfer.files.length) handleFileUpload(e.dataTransfer.files[0]);
        });
        dropZone.addEventListener('click', () => { if (fileInput) fileInput.click(); });
    }
    if (browseDocumentBtn) {
        browseDocumentBtn.addEventListener('click', () => { if (fileInput) fileInput.click(); });
    }
    if (fileInput) {
        fileInput.addEventListener('change', () => { if (fileInput.files.length) handleFileUpload(fileInput.files[0]); });
    }

    // =========================================================================
    // 8. AUDIO MODE
    // =========================================================================
    function displayAudioFileInfo(file) {
        if (!audioFileInfo) return;
        audioFileInfo.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-file-audio" style="color: var(--accent);"></i>
                    <strong>${escapeHtml(file.name)}</strong>
                    ${!file.mock ? `<span>(${(file.size / 1024).toFixed(1)} KB)</span>` : ''}
                </div>
                <button class="remove-file-btn" id="removeAudioBtn" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 1.2rem; padding: 5px;" title="Remove audio">
                    <i class="fas fa-times-circle"></i>
                </button>
            </div>
        `;
        audioFileInfo.style.display = 'block';
        const removeBtn = document.getElementById('removeAudioBtn');
        if (removeBtn) removeBtn.addEventListener('click', removeAudio);
    }

    function removeAudio() {
        uploadedAudioFile = null;
        audioTranscript = "";
        if (audioFileInfo) {
            audioFileInfo.style.display = 'none';
            audioFileInfo.innerHTML = '';
        }
        if (audioTranscriptPreview) audioTranscriptPreview.style.display = 'none';
        if (transcriptPreviewText) transcriptPreviewText.textContent = '';
        updateAnalyzeButtonState();
        saveProgress();
        showToast('Audio file removed', 'info');
    }

    function showTranscriptionLoading() {
        let loadingDiv = document.getElementById('transcriptionLoading');
        if (!loadingDiv && audioTranscriptPreview) {
            loadingDiv = document.createElement('div');
            loadingDiv.id = 'transcriptionLoading';
            loadingDiv.className = 'transcription-loading';
            loadingDiv.innerHTML = `<div class="spinner-small"></div><span>Transcribing audio... please wait</span>`;
            audioTranscriptPreview.insertAdjacentElement('afterend', loadingDiv);
        }
        if (audioTranscriptPreview) audioTranscriptPreview.style.display = 'none';
    }

    function hideTranscriptionLoading() {
        const loadingDiv = document.getElementById('transcriptionLoading');
        if (loadingDiv) loadingDiv.remove();
    }

    async function transcribeAudio(file) {
        if (!aiConfig.token) throw new Error('API not configured');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('model', 'whisper-1');
        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${aiConfig.token}` },
            body: formData
        });
        if (!response.ok) throw new Error(`Transcription failed: ${response.status}`);
        const data = await response.json();
        return data.text;
    }

    async function handleAudioUpload(file) {
        const validTypes = ['audio/mpeg', 'audio/wav', 'audio/x-m4a', 'audio/mp4', 'audio/webm', 'audio/ogg', 'audio/aac'];
        const validExtensions = ['mp3', 'wav', 'm4a', 'mp4', 'webm', 'ogg', 'aac'];
        const ext = file.name.split('.').pop().toLowerCase();
        if (!validTypes.includes(file.type) && !validExtensions.includes(ext)) {
            showToast('Please upload an audio file (MP3, WAV, M4A, etc.)', 'error');
            return;
        }
        uploadedAudioFile = file;
        audioTranscript = "";
        displayAudioFileInfo(file);
        if (audioTranscriptPreview) audioTranscriptPreview.style.display = 'none';
        isTranscribing = true;
        updateAnalyzeButtonState();
        showTranscriptionLoading();
        try {
            const transcript = await transcribeAudio(file);
            audioTranscript = truncateContent(transcript);
            if (transcriptPreviewText) transcriptPreviewText.textContent = audioTranscript;
            if (audioTranscriptPreview) audioTranscriptPreview.style.display = 'block';
            hideTranscriptionLoading();
            saveProgress();
            showToast('Transcription complete! Ready for analysis.', 'success');
            if (analysisTextarea && !analysisTextarea.value.trim()) {
                analysisTextarea.value = "Analyze this session transcript and provide key insights, clinical observations, and recommendations.";
                updateAnalyzeButtonState();
                saveProgress();
            }
        } catch (err) {
            console.error('Transcription error:', err);
            hideTranscriptionLoading();
            showToast(`Transcription failed: ${err.message}`, 'error');
            audioTranscript = "";
            if (audioTranscriptPreview) audioTranscriptPreview.style.display = 'none';
        } finally {
            isTranscribing = false;
            updateAnalyzeButtonState();
            saveProgress();
        }
    }

    if (audioDropZone) {
        audioDropZone.addEventListener('dragover', e => { e.preventDefault(); audioDropZone.style.borderColor = 'var(--accent)'; });
        audioDropZone.addEventListener('dragleave', () => { if (audioDropZone) audioDropZone.style.borderColor = 'var(--border-light)'; });
        audioDropZone.addEventListener('drop', e => {
            e.preventDefault();
            if (audioDropZone) audioDropZone.style.borderColor = 'var(--border-light)';
            if (e.dataTransfer.files.length) handleAudioUpload(e.dataTransfer.files[0]);
        });
        audioDropZone.addEventListener('click', () => { if (audioFileInput) audioFileInput.click(); });
    }
    if (browseAudioBtn) {
        browseAudioBtn.addEventListener('click', (e) => { e.stopPropagation(); if (audioFileInput) audioFileInput.click(); });
    }
    if (audioFileInput) {
        audioFileInput.addEventListener('change', () => { if (audioFileInput.files.length) handleAudioUpload(audioFileInput.files[0]); audioFileInput.value = ''; });
    }

    // =========================================================================
    // 9. IMAGE MODE
    // =========================================================================
    function displayImagePreview(dataURL, fileName) {
        if (previewImage) previewImage.src = dataURL;
        if (imageFileInfo) {
            imageFileInfo.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-image" style="color: var(--accent);"></i>
                        <strong>${escapeHtml(fileName)}</strong>
                    </div>
                    <button class="remove-file-btn" id="removeImageBtn" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 1.2rem; padding: 5px;" title="Remove image">
                        <i class="fas fa-times-circle"></i>
                    </button>
                </div>
            `;
            imageFileInfo.style.display = 'block';
        }
        if (imagePreview) imagePreview.style.display = 'block';
        const removeBtn = document.getElementById('removeImageBtn');
        if (removeBtn) removeBtn.addEventListener('click', removeImage);
    }

    function removeImage() {
        uploadedImageFile = null;
        imageDataURL = null;
        if (imageFileInfo) {
            imageFileInfo.style.display = 'none';
            imageFileInfo.innerHTML = '';
        }
        if (imagePreview) imagePreview.style.display = 'none';
        if (previewImage) previewImage.src = '';
        updateAnalyzeButtonState();
        saveProgress();
        showToast('Image removed', 'info');
    }

    async function handleImageUpload(file) {
        if (!file.type.startsWith('image/')) {
            showToast('Please select an image file', 'error');
            return;
        }
        uploadedImageFile = file;
        const reader = new FileReader();
        reader.onload = async (e) => {
            let dataURL = e.target.result;
            if (dataURL.length > 1.5 * 1024 * 1024) {
                try {
                    dataURL = await compressImageDataURL(dataURL, 1);
                } catch (err) {
                    console.warn('Image compression failed', err);
                }
            }
            imageDataURL = dataURL;
            displayImagePreview(imageDataURL, file.name);
            saveProgress();
            updateAnalyzeButtonState();
            showToast('Image loaded successfully', 'success');
        };
        reader.readAsDataURL(file);
    }

    async function capturePhoto() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            const video = document.createElement('video');
            video.srcObject = stream;
            await video.play();
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
            stream.getTracks().forEach(track => track.stop());
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
            const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
            handleImageUpload(file);
        } catch (err) {
            console.error('Camera error:', err);
            showToast('Unable to access camera. Please check permissions.', 'error');
        }
    }

    if (imageDropZone) {
        imageDropZone.addEventListener('dragover', e => { e.preventDefault(); imageDropZone.style.borderColor = 'var(--accent)'; });
        imageDropZone.addEventListener('dragleave', () => { if (imageDropZone) imageDropZone.style.borderColor = 'var(--border-light)'; });
        imageDropZone.addEventListener('drop', e => {
            e.preventDefault();
            if (imageDropZone) imageDropZone.style.borderColor = 'var(--border-light)';
            if (e.dataTransfer.files.length) handleImageUpload(e.dataTransfer.files[0]);
        });
    }
    if (cameraBtn) cameraBtn.addEventListener('click', capturePhoto);
    if (galleryBtn) galleryBtn.addEventListener('click', () => { if (imageFileInput) imageFileInput.click(); });
    if (imageFileInput) {
        imageFileInput.addEventListener('change', () => { if (imageFileInput.files.length) handleImageUpload(imageFileInput.files[0]); imageFileInput.value = ''; });
    }

    // =========================================================================
    // 10. ANALYSIS (AI CALL)
    // =========================================================================
    async function analyzeWithOpenAI(messages) {
        if (!aiConfig.token || !aiConfig.endpoint) throw new Error('API not ready');
        let totalLength = JSON.stringify(messages).length;
        if (totalLength > 50000) {
            const userMsg = messages.find(m => m.role === 'user');
            if (userMsg && userMsg.content && typeof userMsg.content === 'string' && userMsg.content.length > 15000) {
                userMsg.content = truncateContent(userMsg.content, 15000);
            }
        }
        const url = `${aiConfig.endpoint.replace(/\/$/, '')}/chat/completions`;
        const requestBody = {
            messages: messages,
            model: aiConfig.model,
            temperature: 0.7,
            max_tokens: MAX_TOKENS_PER_REQUEST
        };
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aiConfig.token}` },
            body: JSON.stringify(requestBody)
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'API error');
        }
        const data = await response.json();
        return data.choices[0].message.content;
    }

    function buildMessages(content, docType, userRequest) {
        let systemPrompt = `You are rehab.ai, a medical AI assistant. Analyze the following ${docType} content. Provide professional, structured output with headings, bullet points, and lists. Do NOT use tables. Use clear section titles (e.g., "Key Findings", "Recommendations") and format content for easy reading.`;
        if (activeMode === 'audio') {
            systemPrompt = `You are rehab.ai, a medical AI assistant specializing in session analysis. Analyze the following session transcript and provide: 1. Key clinical observations and themes 2. Notable quotes or exchanges 3. Clinical recommendations 4. Areas for follow-up. Use bullet points, numbered lists, and headings only.`;
        } else if (activeMode === 'image') {
            systemPrompt = `You are rehab.ai, a medical AI assistant specializing in medical image analysis. Analyze the provided medical image (X-ray, wound, posture, etc.) and provide: 1. Key observations and findings 2. Clinical significance 3. Recommendations for further action 4. Any notable features or abnormalities. Format your response with clear headings and bullet points.`;
        }
        let userContent = `**User Request:** ${userRequest || 'Please analyze this content thoroughly.'}\n\n`;
        if (activeMode === 'image') {
            return [
                { role: "system", content: systemPrompt },
                { role: "user", content: [{ type: "text", text: userContent }, { type: "image_url", image_url: { url: imageDataURL } }] }
            ];
        } else {
            userContent += `**Content:**\n${content}`;
            return [
                { role: "system", content: systemPrompt },
                { role: "user", content: userContent.substring(0, 50000) }
            ];
        }
    }

    async function performAnalysis() {
        let content = "";
        if (activeMode === 'text') content = plainTextInput ? plainTextInput.value.trim() : "";
        else if (activeMode === 'document') content = extractedDocumentText;
        else if (activeMode === 'audio') content = audioTranscript;
        else if (activeMode === 'image' && !imageDataURL) throw new Error('No image to analyze');
        if (activeMode !== 'image' && !content) throw new Error('No content to analyze');
        let userRequest = analysisTextarea ? analysisTextarea.value.trim() : "";
        if (activeMode === 'audio' && !userRequest) userRequest = "Analyze this session transcript and provide key clinical insights, observations, and recommendations.";
        const messages = buildMessages(content, documentType, userRequest);
        return await analyzeWithOpenAI(messages);
    }

    function startAnalysisUI() {
        if (analyzeBtn) {
            analyzeBtn.disabled = true;
            analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
        }
        if (analysisResultsContainer) analysisResultsContainer.style.display = 'block';
        if (loadingIndicator) loadingIndicator.style.display = 'flex';
        if (reportContentArea) reportContentArea.style.display = 'none';
    }

    function resetAnalyzeButton() {
        if (analyzeBtn) {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '<span>Analyze</span><i class="fas fa-magic"></i>';
        }
        updateAnalyzeButtonState();
    }

    function displayResults(results) {
        if (!resultsContent) return;
        const htmlContent = marked.parse(results);
        resultsContent.innerHTML = htmlContent;
        if (reportDate) reportDate.textContent = new Date().toLocaleString();
        if (reportContentArea) reportContentArea.style.display = 'block';
    }

    // ===== PREVIEW MODAL =====
    function showPreviewModal(fullText, historyKey) {
        const existingModal = document.querySelector('.preview-modal');
        if (existingModal) existingModal.remove();

        let fileName = '';
        if (activeMode === 'text') fileName = 'Text Input';
        else if (activeMode === 'document') fileName = uploadedFile?.name || 'Document';
        else if (activeMode === 'audio') fileName = uploadedAudioFile?.name || 'Audio Session';
        else if (activeMode === 'image') fileName = uploadedImageFile?.name || 'Image Analysis';

        const modalHtml = `
            <div class="preview-modal">
                <div class="preview-overlay"></div>
                <div class="preview-card">
                    <div class="preview-card-header">
                        <div class="preview-icon">📄</div>
                        <h3>Analysis Complete</h3>
                        <button class="preview-close">&times;</button>
                    </div>
                    <div class="preview-card-body">
                        <div class="preview-info">
                            <span class="preview-badge">✅ Ready to view</span>
                            <span class="preview-date">${new Date().toLocaleString()}</span>
                        </div>
                        <p class="preview-description">
                            Your analysis of <strong>${escapeHtml(fileName)}</strong> (${escapeHtml(documentType || 'General')}) has been generated successfully.
                        </p>
                        <div class="preview-actions">
                            <button class="preview-btn primary" id="viewFullAnalysisBtn">
                                📖 View Full Analysis
                            </button>
                            <button class="preview-btn secondary" id="closePreviewBtn">
                                Close
                            </button>
                        </div>
                        <div class="preview-note">
                            <small>💡 The full report will open in a new tab for printing or saving as Word.</small>
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
        
        modal.querySelector('#viewFullAnalysisBtn').addEventListener('click', () => {
            if (historyKey) {
                window.open(`docresult.html?id=${historyKey}`, '_blank');
                closeModal();
            } else {
                showToast('Error: Analysis ID not found', 'error');
            }
        });
    }

    async function autoSaveToHistory(contentType, fileName, results, transcription = null) {
        if (!currentUser) return null;
        const userId = currentUser.uid;
        const newRef = await database.ref(`users/${userId}/analysisHistory`).push({
            contentType, 
            fileName: fileName || (contentType === 'text' ? 'Pasted Text' : (contentType === 'audio' ? 'Audio Session' : (contentType === 'image' ? 'Image Analysis' : 'Document'))),
            documentType, 
            request: analysisTextarea ? analysisTextarea.value : (contentType === 'audio' ? 'Session Analysis' : (contentType === 'image' ? 'Image Analysis' : 'Text Analysis')),
            results, 
            transcription, 
            timestamp: firebase.database.ServerValue.TIMESTAMP, 
            date: new Date().toLocaleDateString()
        });
        loadHistory();
        showToast('Analysis saved to history', 'info');
        return newRef.key;
    }

    // =========================================================================
    // 11. ANALYZE BUTTON HANDLER
    // =========================================================================
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', async () => {
            if (!aiConfig.token) {
                showToast('Initializing AI...', 'warning');
                await fetchAPITokens();
                if (!aiConfig.token) { 
                    showToast('AI not available. Please refresh.', 'error'); 
                    resetAnalyzeButton(); 
                    return; 
                }
            }
            if (!currentUser) { 
                showToast('Please login to analyze', 'error'); 
                resetAnalyzeButton(); 
                return; 
            }
            if (!documentType) { 
                showToast('Please select a document type', 'error'); 
                resetAnalyzeButton(); 
                return; 
            }

            startAnalysisUI();
            try {
                const result = await performAnalysis();
                analysisResults = result;
                const key = await autoSaveToHistory(activeMode, 
                    activeMode === 'text' ? 'Text Input' : (activeMode === 'document' ? uploadedFile?.name : (activeMode === 'audio' ? uploadedAudioFile?.name : uploadedImageFile?.name)), 
                    result, activeMode === 'audio' ? audioTranscript : null);
                if (loadingIndicator) loadingIndicator.style.display = 'none';
                showPreviewModal(result, key);
                window.currentAnalysisResult = result;
                saveProgress();
            } catch (err) {
                console.error(err);
                let errorMsg = err.message;
                if (errorMsg.includes('max_tokens') || errorMsg.includes('token limit')) errorMsg = 'The content is too long. Please try a shorter document or audio file.';
                showToast('Analysis failed: ' + errorMsg, 'error');
                if (analysisResultsContainer) analysisResultsContainer.style.display = 'none';
                const previewModal = document.querySelector('.preview-modal');
                if (previewModal) previewModal.remove();
            } finally {
                resetAnalyzeButton();
            }
        });
    }

    if (downloadReport) {
        downloadReport.addEventListener('click', async () => {
            if (!analysisResults) return;
            downloadReport.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
            try {
                const paragraphs = markdownToDocxParagraphs(analysisResults);
                const doc = new docx.Document({
                    sections: [{
                        children: [
                            new docx.Paragraph({ text: "rehab.ai Analysis Report", heading: docx.HeadingLevel.HEADING_1 }),
                            new docx.Paragraph({ text: `Date: ${reportDate ? reportDate.textContent : new Date().toLocaleString()}` }),
                            new docx.Paragraph({ text: "" }),
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
            } catch (err) {
                showToast('Export failed', 'error');
                console.error(err);
            } finally {
                downloadReport.innerHTML = '<i class="fas fa-file-pdf"></i> Export doc.';
            }
        });
    }

    if (closeResultsBtn) {
        closeResultsBtn.addEventListener('click', () => {
            const previewModal = document.querySelector('.preview-modal');
            if (previewModal) previewModal.remove();
            if (analysisResultsContainer) analysisResultsContainer.style.display = 'none';
            analysisResults = null;
            saveProgress();
        });
    }

    // =========================================================================
    // 12. HISTORY DRAWER WITH DELETE & SEARCH FUNCTIONALITY
    // =========================================================================
    async function deleteHistoryItem(key, event) {
        event.stopPropagation();
        
        if (!currentUser) {
            showToast('Please login to delete history', 'error');
            return;
        }
        
        if (!confirm('Are you sure you want to delete this analysis from history?')) {
            return;
        }
        
        try {
            // Delete from user's history
            await database.ref(`users/${currentUser.uid}/analysisHistory/${key}`).remove();
            
            // Also delete from public if it exists
            await database.ref(`publicAnalysis/${key}`).remove();
            
            showToast('Analysis deleted from history', 'success');
            
            // Reload history
            loadHistory();
        } catch (error) {
            console.error('Delete error:', error);
            showToast('Failed to delete analysis', 'error');
        }
    }
    
    function filterHistory(term) {
        const searchTerm = term.toLowerCase().trim();
        if (!searchTerm) {
            renderHistory(allHistoryEntries);
            return;
        }
        const filtered = allHistoryEntries.filter(([_, item]) => 
            (item.fileName || '').toLowerCase().includes(searchTerm) ||
            (item.documentType || '').toLowerCase().includes(searchTerm) ||
            (item.contentType || '').toLowerCase().includes(searchTerm)
        );
        renderHistory(filtered);
    }
    
    function renderHistory(entries) {
        const historyListElem = document.getElementById('historyList');
        if (!historyListElem) return;
        
        historyListElem.innerHTML = '';
        if (!entries.length) {
            historyListElem.innerHTML = '<div class="empty-state"><i class="bx bx-folder-open"></i><p>No history found</p></div>';
            return;
        }
        
        entries.forEach(([key, item]) => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `
                <div class="history-info" style="flex: 1;">
                    <span class="history-name">${escapeHtml(item.fileName || 'Untitled')}</span>
                    <div class="history-meta">
                        <span class="meta-tag"><i class="bx ${item.contentType === 'audio' ? 'bx-microphone' : (item.contentType === 'document' ? 'bx-file' : (item.contentType === 'image' ? 'bx-image' : 'bx-edit'))}"></i> ${escapeHtml(item.documentType || 'General')}</span>
                        <span>${escapeHtml(item.date)}</span>
                    </div>
                </div>
                <div class="history-actions" style="display: flex; gap: 8px; align-items: center;">
                    <button class="view-btn" data-key="${key}" title="View Analysis">
                        <i class="bx bx-chevron-right"></i>
                    </button>
                    <button class="delete-btn" data-key="${key}" title="Delete Analysis" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 1.2rem; padding: 5px; border-radius: 50%; transition: all 0.2s;">
                        <i class="bx bx-trash"></i>
                    </button>
                </div>
            `;
            
            // View button handler
            div.querySelector('.view-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                window.open(`docresult.html?id=${key}`, '_blank');
            });
            
            // Delete button handler
            div.querySelector('.delete-btn').addEventListener('click', (e) => {
                deleteHistoryItem(key, e);
            });
            
            // Click on the item itself (except buttons)
            div.addEventListener('click', (e) => {
                if (!e.target.closest('button')) {
                    window.open(`docresult.html?id=${key}`, '_blank');
                }
            });
            
            historyListElem.appendChild(div);
        });
    }

    function loadHistory() {
        if (!currentUser) return;
        const historyListElem = document.getElementById('historyList');
        if (!historyListElem) return;
        
        database.ref(`users/${currentUser.uid}/analysisHistory`).orderByChild('timestamp').on('value', (snapshot) => {
            const data = snapshot.val();
            if (!data) { 
                allHistoryEntries = [];
                renderHistory([]);
                return; 
            }
            const entries = Object.entries(data).sort((a, b) => b[1].timestamp - a[1].timestamp);
            allHistoryEntries = entries;
            
            // Apply search filter if input exists
            const searchInput = document.getElementById('historySearchInput');
            if (searchInput && searchInput.value) {
                filterHistory(searchInput.value);
            } else {
                renderHistory(entries);
            }
        });
    }

    function toggleHistoryDrawer() { 
        if (historyDrawer) historyDrawer.classList.toggle('active'); 
    }
    
    if (toggleHistoryBtn) {
        toggleHistoryBtn.addEventListener('click', () => { 
            if (!currentUser) { 
                showToast('Please login to view history', 'error'); 
                return; 
            } 
            loadHistory(); 
            toggleHistoryDrawer(); 
        });
    }
    if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', toggleHistoryDrawer);
    
    // History search input
    if (historySearchInput) {
        historySearchInput.addEventListener('input', (e) => {
            filterHistory(e.target.value);
        });
    }

    // =========================================================================
    // 13. DOCUMENT TYPE SELECTION
    // =========================================================================
    if (chipBtns) {
        chipBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                chipBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                documentType = btn.dataset.type;
                updateAnalyzeButtonState();
                saveProgress();
            });
        });
    }

    // =========================================================================
    // 14. ANALYSIS REQUEST
    // =========================================================================
    if (analysisTextarea) {
        analysisTextarea.addEventListener('input', () => {
            updateAnalyzeButtonState();
            saveProgress();
        });
    }

    if (tags) {
        tags.forEach(tag => {
            tag.addEventListener('click', () => {
                const requestText = tag.dataset.request;
                const currentText = analysisTextarea ? analysisTextarea.value : '';
                if (analysisTextarea) {
                    analysisTextarea.value = currentText ? currentText + "\n" + requestText : requestText;
                    updateAnalyzeButtonState();
                    saveProgress();
                    analysisTextarea.dispatchEvent(new Event('input'));
                }
            });
        });
    }

    // =========================================================================
    // 15. MARKDOWN TO DOCX HELPER
    // =========================================================================
    function markdownToDocxParagraphs(markdown) {
        const lines = markdown.split('\n');
        const paragraphs = [];
        let inList = false;
        let listItems = [];
        for (let line of lines) {
            line = line.trim();
            if (line === '') {
                if (inList && listItems.length) {
                    paragraphs.push(new docx.Paragraph({ children: listItems.map(item => new docx.TextRun({ text: `• ${item}`, break: 1 })), spacing: { after: 200 } }));
                    listItems = [];
                    inList = false;
                }
                continue;
            }
            if (line.startsWith('# ')) paragraphs.push(new docx.Paragraph({ text: line.substring(2), heading: docx.HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 } }));
            else if (line.startsWith('## ')) paragraphs.push(new docx.Paragraph({ text: line.substring(3), heading: docx.HeadingLevel.HEADING_2, spacing: { before: 300, after: 150 } }));
            else if (line.startsWith('### ')) paragraphs.push(new docx.Paragraph({ text: line.substring(4), heading: docx.HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 } }));
            else if (line.match(/^[\*\-\+]\s/)) {
                if (!inList) inList = true;
                listItems.push(line.substring(2));
            } else if (line.match(/^\d+\.\s/)) {
                if (!inList) inList = true;
                listItems.push(line.replace(/^\d+\.\s/, ''));
            } else {
                if (inList && listItems.length) {
                    paragraphs.push(new docx.Paragraph({ children: listItems.map(item => new docx.TextRun({ text: `• ${item}`, break: 1 })), spacing: { after: 200 } }));
                    listItems = [];
                    inList = false;
                }
                paragraphs.push(new docx.Paragraph({ text: line.replace(/\*\*/g, '').replace(/\*/g, ''), spacing: { after: 200 } }));
            }
        }
        if (inList && listItems.length) paragraphs.push(new docx.Paragraph({ children: listItems.map(item => new docx.TextRun({ text: `• ${item}`, break: 1 })), spacing: { after: 200 } }));
        return paragraphs;
    }

    // =========================================================================
    // 16. INITIALIZATION
    // =========================================================================
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const html = document.documentElement;
            const current = html.getAttribute('data-theme');
            const newTheme = current === 'light' ? 'dark' : 'light';
            html.setAttribute('data-theme', newTheme);
            localStorage.setItem('rehab-theme', newTheme);
        });
    }
    const savedTheme = localStorage.getItem('rehab-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    initScrollIndicators();
    setActiveMode('text');
    updateWordCount();
    
    // Load saved progress
    loadProgress().then(success => {
        if (success) {
            console.log('[INIT] Auto-save restored successfully');
            showToast('Previous session restored', 'success', 2000);
        } else {
            console.log('[INIT] No saved session found');
        }
    });
    
    // Load AI tokens
    fetchAPITokens().then(() => {
        console.log('[INIT] AI tokens loaded');
    });
    
    // Auth state change
    firebase.auth().onAuthStateChanged(async (user) => {
        currentUser = user;
        if (user) {
            console.log('[AUTH] User logged in:', user.email);
            loadHistory();
        } else {
            console.log('[AUTH] User logged out');
        }
        updateAnalyzeButtonState();
    });
});