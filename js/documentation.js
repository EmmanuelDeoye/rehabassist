// documentation.js - Enhanced with image upload, removable files, full persistence, and scroll indicators
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
    const toastContainer = document.getElementById('toast-container');

    // =========================================================================
    // 2. STATE & CONFIG
    // =========================================================================
    let aiConfig = { token: null, endpoint: null, model: "openai/gpt-4.1" };
    let currentUser = null;
    let activeMode = 'text'; // 'text', 'document', 'audio', 'image'
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
    const STORAGE_KEY = 'rehab_doc_assistant_state';
    
    // Token limit settings
    const MAX_TOKENS_PER_REQUEST = 4000;
    const MAX_CONTENT_LENGTH = 10000;

    // Firebase init
    const database = firebase.database();

    // =========================================================================
    // 3. UTILITIES
    // =========================================================================
    function showToast(message, type = 'success', duration = 3000) {
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

    function updateAnalyzeButtonState() {
        let hasContent = false;
        if (activeMode === 'text') {
            hasContent = plainTextInput.value.trim().length > 0;
        } else if (activeMode === 'document') {
            hasContent = (uploadedFile !== null) || (extractedDocumentText.length > 0);
        } else if (activeMode === 'audio') {
            hasContent = audioTranscript.length > 0;
        } else if (activeMode === 'image') {
            hasContent = imageDataURL !== null;
        }
        const hasType = documentType !== null;
        const hasRequest = activeMode === 'audio' ? true : analysisTextarea.value.trim().length > 0;
        const shouldEnable = hasContent && hasType && hasRequest && !isTranscribing;
        analyzeBtn.disabled = !shouldEnable;
    }

    // =========================================================================
    // 3.5. SCROLL INDICATORS FOR HORIZONTAL TABS
    // =========================================================================
    function initScrollIndicators() {
        const uploadContainer = document.querySelector('.upload-type-container');
        if (uploadContainer) {
            function updateScrollIndicators() {
                const isScrollable = uploadContainer.scrollWidth > uploadContainer.clientWidth;
                if (isScrollable) {
                    const isAtStart = uploadContainer.scrollLeft <= 10;
                    const isAtEnd = uploadContainer.scrollLeft + uploadContainer.clientWidth >= uploadContainer.scrollWidth - 10;
                    
                    if (isAtStart) {
                        uploadContainer.classList.remove('is-scrollable-start');
                    } else {
                        uploadContainer.classList.add('is-scrollable-start');
                    }
                    
                    if (isAtEnd) {
                        uploadContainer.classList.remove('is-scrollable-end');
                    } else {
                        uploadContainer.classList.add('is-scrollable-end');
                    }
                } else {
                    uploadContainer.classList.remove('is-scrollable-start', 'is-scrollable-end');
                }
            }
            
            uploadContainer.addEventListener('scroll', updateScrollIndicators);
            window.addEventListener('resize', updateScrollIndicators);
            updateScrollIndicators();
        }
    }

    // =========================================================================
    // 4. STATE PERSISTENCE (Save & Load) - ENHANCED WITH LOGGING
    // =========================================================================
    function saveProgressImmediate() {
        const state = {
            activeMode: activeMode,
            documentType: documentType,
            analysisRequest: analysisTextarea.value,
            plainText: plainTextInput.value,
            extractedDocumentText: extractedDocumentText,
            fileName: uploadedFile ? uploadedFile.name : null,
            audioTranscript: audioTranscript,
            audioFileName: uploadedAudioFile ? uploadedAudioFile.name : null,
            imageDataURL: imageDataURL,
            imageFileName: uploadedImageFile ? uploadedImageFile.name : null,
            analysisResults: analysisResults,
            reportDate: reportDate.textContent,
            timestamp: Date.now()
        };
        
        console.log('[SAVE] Saving state:', {
            mode: state.activeMode,
            docType: state.documentType,
            plainTextLength: state.plainText?.length,
            hasDoc: !!state.fileName,
            hasAudio: !!state.audioFileName,
            hasImage: !!state.imageFileName,
            timestamp: state.timestamp
        });
        
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            console.log('[SAVE] Success');
        } catch (e) {
            console.error('[SAVE] Error:', e);
            if (e.name === 'QuotaExceededError') {
                showToast('Storage limit reached. Large images may not persist after reload.', 'warning');
                const stateWithoutImage = { ...state, imageDataURL: null };
                localStorage.setItem(STORAGE_KEY, JSON.stringify(stateWithoutImage));
            }
        }
    }

    // Debounced save to avoid excessive writes during rapid typing
    function saveProgress() {
        if (saveTimeout) {
            clearTimeout(saveTimeout);
        }
        saveTimeout = setTimeout(() => {
            saveProgressImmediate();
        }, 300);
    }

    function restoreModeContent(state) {
        // This function restores content specific to the current activeMode
        // It is called after the mode is set to ensure the correct section is visible
        if (activeMode === 'text') {
            if (state.plainText) {
                plainTextInput.value = state.plainText;
                updateWordCount();
                console.log('[LOAD] Restored text content');
            }
        } else if (activeMode === 'document') {
            if (state.fileName) {
                uploadedFile = { name: state.fileName, mock: true };
                displayFileInfo(uploadedFile);
                if (state.extractedDocumentText) {
                    extractedDocumentText = state.extractedDocumentText;
                }
                console.log('[LOAD] Restored document');
            }
        } else if (activeMode === 'audio') {
            if (state.audioFileName) {
                uploadedAudioFile = { name: state.audioFileName, mock: true };
                displayAudioFileInfo(uploadedAudioFile);
            }
            if (state.audioTranscript) {
                audioTranscript = state.audioTranscript;
                audioTranscriptPreview.style.display = 'block';
                transcriptPreviewText.textContent = audioTranscript;
                console.log('[LOAD] Restored audio transcript');
            }
        } else if (activeMode === 'image') {
            if (state.imageDataURL && state.imageFileName) {
                uploadedImageFile = { name: state.imageFileName };
                imageDataURL = state.imageDataURL;
                displayImagePreview(imageDataURL, state.imageFileName);
                console.log('[LOAD] Restored image');
            }
        }
        updateAnalyzeButtonState();
    }

    function loadProgress() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) {
            console.log('[LOAD] No saved state found');
            return;
        }
        try {
            const state = JSON.parse(saved);
            console.log('[LOAD] Loaded state:', {
                mode: state.activeMode,
                docType: state.documentType,
                plainTextLength: state.plainText?.length,
                hasDoc: !!state.fileName,
                hasAudio: !!state.audioFileName,
                hasImage: !!state.imageFileName,
                timestamp: state.timestamp
            });
            
            // Restore active mode (this will change UI)
            if (state.activeMode) {
                const targetBtn = document.querySelector(`.switch-btn[data-type="${state.activeMode}"]`);
                if (targetBtn) {
                    targetBtn.click();
                    // After mode switch, restore content for that mode
                    setTimeout(() => {
                        restoreModeContent(state);
                    }, 50);
                } else {
                    restoreModeContent(state);
                }
            } else {
                restoreModeContent(state);
            }
            
            // Restore document type (independent of mode)
            if (state.documentType) {
                documentType = state.documentType;
                chipBtns.forEach(btn => {
                    if (btn.dataset.type === state.documentType) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                });
                console.log('[LOAD] Restored document type:', documentType);
            }
            
            // Restore analysis request textarea
            if (state.analysisRequest) {
                analysisTextarea.value = state.analysisRequest;
                console.log('[LOAD] Restored analysis request');
            }
            
            // Restore analysis results if present
            if (state.analysisResults) {
                analysisResults = state.analysisResults;
                displayResults(analysisResults);
                reportDate.textContent = state.reportDate || new Date().toLocaleString();
                console.log('[LOAD] Restored analysis results');
            }
            
            updateAnalyzeButtonState();
            console.log('[LOAD] Restoration complete');
        } catch (e) {
            console.error('[LOAD] Error:', e);
        }
    }

    function updateWordCount() {
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
        textUploadSection.style.display = mode === 'text' ? 'block' : 'none';
        documentUploadSection.style.display = mode === 'document' ? 'block' : 'none';
        audioUploadSection.style.display = mode === 'audio' ? 'block' : 'none';
        imageUploadSection.style.display = mode === 'image' ? 'block' : 'none';
        updateAnalyzeButtonState();
        saveProgress(); // Save mode change
    }

    switchBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            switchBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            setActiveMode(btn.dataset.type);
        });
    });

    // =========================================================================
    // 6. TEXT MODE - SAVE ON EVERY INPUT
    // =========================================================================
    plainTextInput.addEventListener('input', () => {
        updateWordCount();
        saveProgress(); // Save on every keystroke
        updateAnalyzeButtonState();
    });
    
    clearTextBtn.addEventListener('click', () => {
        plainTextInput.value = '';
        updateWordCount();
        saveProgress(); // Save after clearing
        updateAnalyzeButtonState();
        showToast('Text cleared', 'info');
    });

    // =========================================================================
    // 7. DOCUMENT MODE (with remove functionality)
    // =========================================================================
    function displayFileInfo(file) {
        fileInfo.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-file-alt" style="color: var(--accent);"></i>
                    <strong>${file.name}</strong>
                    ${!file.mock ? `<span style="font-size:0.8rem;">(${(file.size / 1024).toFixed(1)} KB)</span>` : ''}
                </div>
                <button class="remove-file-btn" id="removeDocumentBtn" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 1.2rem; padding: 5px;" title="Remove document">
                    <i class="fas fa-times-circle"></i>
                </button>
            </div>
        `;
        fileInfo.style.display = 'block';
        
        const removeBtn = document.getElementById('removeDocumentBtn');
        if (removeBtn) {
            removeBtn.addEventListener('click', removeDocument);
        }
    }

    function removeDocument() {
        uploadedFile = null;
        extractedDocumentText = "";
        fileInfo.style.display = 'none';
        fileInfo.innerHTML = '';
        updateAnalyzeButtonState();
        saveProgress(); // Save after removal
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
            saveProgress(); // Save after extraction
            updateAnalyzeButtonState();
            showToast('Document loaded successfully', 'success');
        }).catch(err => {
            console.error(err);
            showToast('Failed to extract text from document', 'error');
        });
        updateAnalyzeButtonState();
    }

    function readFileAsText(file) {
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
                if (pdf.numPages > maxPages) {
                    fullText += `\n\n[Note: Document has ${pdf.numPages} pages. Only first ${maxPages} pages were processed due to length limits.]`;
                }
                resolve(fullText);
            } catch (err) {
                reject(err);
            }
        });
    }

    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.style.borderColor = 'var(--accent)'; });
    dropZone.addEventListener('dragleave', () => { dropZone.style.borderColor = 'var(--border-light)'; });
    dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--border-light)';
        if (e.dataTransfer.files.length) handleFileUpload(e.dataTransfer.files[0]);
    });
    dropZone.addEventListener('click', () => fileInput.click());
    browseDocumentBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => { if (fileInput.files.length) handleFileUpload(fileInput.files[0]); });

    // =========================================================================
    // 8. AUDIO MODE (with remove functionality)
    // =========================================================================
    function displayAudioFileInfo(file) {
        audioFileInfo.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-file-audio" style="color: var(--accent);"></i>
                    <strong>${file.name}</strong>
                    ${!file.mock ? `<span>(${(file.size / 1024).toFixed(1)} KB)</span>` : ''}
                </div>
                <button class="remove-file-btn" id="removeAudioBtn" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 1.2rem; padding: 5px;" title="Remove audio">
                    <i class="fas fa-times-circle"></i>
                </button>
            </div>
        `;
        audioFileInfo.style.display = 'block';
        
        const removeBtn = document.getElementById('removeAudioBtn');
        if (removeBtn) {
            removeBtn.addEventListener('click', removeAudio);
        }
    }

    function removeAudio() {
        uploadedAudioFile = null;
        audioTranscript = "";
        audioFileInfo.style.display = 'none';
        audioFileInfo.innerHTML = '';
        audioTranscriptPreview.style.display = 'none';
        transcriptPreviewText.textContent = '';
        updateAnalyzeButtonState();
        saveProgress(); // Save after removal
        showToast('Audio file removed', 'info');
    }

    function showTranscriptionLoading() {
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'transcriptionLoading';
        loadingDiv.className = 'transcription-loading';
        loadingDiv.innerHTML = `
            <div class="spinner-small"></div>
            <span>Transcribing audio... please wait</span>
        `;
        const existing = document.getElementById('transcriptionLoading');
        if (existing) existing.remove();
        audioTranscriptPreview.insertAdjacentElement('afterend', loadingDiv);
        audioTranscriptPreview.style.display = 'none';
        audioFileInfo.style.display = 'block';
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
        audioTranscriptPreview.style.display = 'none';
        isTranscribing = true;
        updateAnalyzeButtonState();
        
        showTranscriptionLoading();
        
        try {
            const transcript = await transcribeAudio(file);
            audioTranscript = truncateContent(transcript);
            transcriptPreviewText.textContent = audioTranscript;
            audioTranscriptPreview.style.display = 'block';
            hideTranscriptionLoading();
            saveProgress(); // Save after transcription
            showToast('Transcription complete! Ready for analysis.', 'success');
            if (!analysisTextarea.value.trim()) {
                analysisTextarea.value = "Analyze this session transcript and provide key insights, clinical observations, and recommendations.";
                updateAnalyzeButtonState();
                saveProgress();
            }
        } catch (err) {
            console.error('Transcription error:', err);
            hideTranscriptionLoading();
            showToast(`Transcription failed: ${err.message}`, 'error');
            audioTranscript = "";
            audioTranscriptPreview.style.display = 'none';
        } finally {
            isTranscribing = false;
            updateAnalyzeButtonState();
            saveProgress();
        }
    }

    audioDropZone.addEventListener('dragover', e => { e.preventDefault(); audioDropZone.style.borderColor = 'var(--accent)'; });
    audioDropZone.addEventListener('dragleave', () => { audioDropZone.style.borderColor = 'var(--border-light)'; });
    audioDropZone.addEventListener('drop', e => {
        e.preventDefault();
        audioDropZone.style.borderColor = 'var(--border-light)';
        if (e.dataTransfer.files.length) handleAudioUpload(e.dataTransfer.files[0]);
    });
    audioDropZone.addEventListener('click', () => audioFileInput.click());
    browseAudioBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        audioFileInput.click();
    });
    audioFileInput.addEventListener('change', () => { 
        if (audioFileInput.files && audioFileInput.files.length) {
            handleAudioUpload(audioFileInput.files[0]);
        }
        audioFileInput.value = '';
    });

    // =========================================================================
    // 9. IMAGE MODE (with camera, gallery, and remove functionality)
    // =========================================================================
    function displayImagePreview(dataURL, fileName) {
        previewImage.src = dataURL;
        imageFileInfo.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-image" style="color: var(--accent);"></i>
                    <strong>${fileName}</strong>
                </div>
                <button class="remove-file-btn" id="removeImageBtn" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 1.2rem; padding: 5px;" title="Remove image">
                    <i class="fas fa-times-circle"></i>
                </button>
            </div>
        `;
        imageFileInfo.style.display = 'block';
        imagePreview.style.display = 'block';
        
        const removeBtn = document.getElementById('removeImageBtn');
        if (removeBtn) {
            removeBtn.addEventListener('click', removeImage);
        }
    }

    function removeImage() {
        uploadedImageFile = null;
        imageDataURL = null;
        imageFileInfo.style.display = 'none';
        imagePreview.style.display = 'none';
        previewImage.src = '';
        updateAnalyzeButtonState();
        saveProgress(); // Save after removal
        showToast('Image removed', 'info');
    }

    async function handleImageUpload(file) {
        if (!file.type.startsWith('image/')) {
            showToast('Please select an image file', 'error');
            return;
        }
        
        uploadedImageFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            imageDataURL = e.target.result;
            displayImagePreview(imageDataURL, file.name);
            saveProgress(); // Save after image load
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
            
            // Create a temporary canvas to capture the photo
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Stop all tracks
            stream.getTracks().forEach(track => track.stop());
            
            // Convert to blob and create file
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
            const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
            
            handleImageUpload(file);
        } catch (err) {
            console.error('Camera error:', err);
            showToast('Unable to access camera. Please check permissions.', 'error');
        }
    }

    imageDropZone.addEventListener('dragover', e => { e.preventDefault(); imageDropZone.style.borderColor = 'var(--accent)'; });
    imageDropZone.addEventListener('dragleave', () => { imageDropZone.style.borderColor = 'var(--border-light)'; });
    imageDropZone.addEventListener('drop', e => {
        e.preventDefault();
        imageDropZone.style.borderColor = 'var(--border-light)';
        if (e.dataTransfer.files.length) handleImageUpload(e.dataTransfer.files[0]);
    });
    
    if (cameraBtn) {
        cameraBtn.addEventListener('click', capturePhoto);
    }
    
    if (galleryBtn) {
        galleryBtn.addEventListener('click', () => imageFileInput.click());
    }
    
    imageFileInput.addEventListener('change', () => { 
        if (imageFileInput.files && imageFileInput.files.length) {
            handleImageUpload(imageFileInput.files[0]);
        }
        imageFileInput.value = '';
    });

    // =========================================================================
    // 10. ANALYSIS (AI CALL) - Supports text, document, audio, and image
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
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${aiConfig.token}`
            },
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
            systemPrompt = `You are rehab.ai, a medical AI assistant specializing in session analysis. Analyze the following session transcript and provide:
1. Key clinical observations and themes
2. Notable quotes or exchanges
3. Clinical recommendations
4. Areas for follow-up
Use bullet points, numbered lists, and headings only.`;
        } else if (activeMode === 'image') {
            systemPrompt = `You are rehab.ai, a medical AI assistant specializing in medical image analysis. Analyze the provided medical image (X-ray, wound, posture, etc.) and provide:
1. Key observations and findings
2. Clinical significance
3. Recommendations for further action
4. Any notable features or abnormalities
Format your response with clear headings and bullet points.`;
        }
        
        let userContent = `**User Request:** ${userRequest || 'Please analyze this content thoroughly.'}\n\n`;
        
        if (activeMode === 'image') {
            // For images, we need a special structure
            return [
                { role: "system", content: systemPrompt },
                { 
                    role: "user", 
                    content: [
                        { type: "text", text: userContent },
                        { type: "image_url", image_url: { url: imageDataURL } }
                    ]
                }
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
        if (activeMode === 'text') {
            content = plainTextInput.value.trim();
        } else if (activeMode === 'document') {
            content = extractedDocumentText;
        } else if (activeMode === 'audio') {
            content = audioTranscript;
        } else if (activeMode === 'image') {
            if (!imageDataURL) throw new Error('No image to analyze');
        }
        
        if (activeMode !== 'image' && !content) throw new Error('No content to analyze');
        
        let userRequest = analysisTextarea.value.trim();
        if (activeMode === 'audio' && !userRequest) {
            userRequest = "Analyze this session transcript and provide key clinical insights, observations, and recommendations.";
        }
        
        const messages = buildMessages(content, documentType, userRequest);
        return await analyzeWithOpenAI(messages);
    }

    function startAnalysisUI() {
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
        const resultsContainer = document.getElementById('analysisResultsContainer');
        resultsContainer.style.display = 'block';
        loadingIndicator.style.display = 'flex';
        reportContentArea.style.display = 'none';
        loadingIndicator.classList.add('enhanced-loading');
    }

    function resetAnalyzeButton() {
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = '<span>Analyze</span><i class="fas fa-magic"></i>';
        updateAnalyzeButtonState();
    }

    function displayResults(results) {
        if (!resultsContent) return;
        // Convert markdown to HTML using marked
        const htmlContent = marked.parse(results);
        resultsContent.innerHTML = htmlContent;
        reportDate.textContent = new Date().toLocaleString();
        reportContentArea.style.display = 'block';
    }

    function showPreviewCard(fullText, historyKey) {
        const resultsContainer = document.getElementById('analysisResultsContainer');
        let previewCard = document.getElementById('previewCard');
        
        if (!previewCard) {
            const cardHtml = `
                <div id="previewCard" class="preview-card glass-card" style="display: none;">
                    <div class="preview-header">
                        <h3><i class="fas fa-file-alt"></i> Analysis Complete</h3>
                        <span class="preview-badge">Ready</span>
                    </div>
                    <div class="preview-content"></div>
                    <div class="preview-footer">
                        <button class="btn-primary preview-view-btn" id="viewFullBtn">
                            <i class="fas fa-external-link-alt"></i> View Full Analysis
                        </button>
                        <button class="btn-secondary preview-download-btn" id="previewDownloadBtn">
                            <i class="fas fa-download"></i> Download
                        </button>
                    </div>
                </div>
            `;
            resultsContainer.insertAdjacentHTML('afterend', cardHtml);
            previewCard = document.getElementById('previewCard');
        }
        
        const previewContent = previewCard.querySelector('.preview-content');
        const viewBtn = document.getElementById('viewFullBtn');
        const downloadBtn = document.getElementById('previewDownloadBtn');
        
        const previewText = fullText.replace(/<[^>]*>/g, ' ').substring(0, 200) + '...';
        previewContent.innerHTML = `<p>${previewText}</p>`;
        
        viewBtn.onclick = () => {
            window.open(`docresult.html?id=${historyKey}`, '_blank');
        };
        
        downloadBtn.onclick = async () => {
            if (!analysisResults) return;
            const original = downloadBtn.innerHTML;
            downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
            try {
                const paragraphs = markdownToDocxParagraphs(analysisResults);
                const doc = new docx.Document({
                    sections: [{
                        children: [
                            new docx.Paragraph({ text: "rehab.ai Analysis Report", heading: docx.HeadingLevel.HEADING_1 }),
                            new docx.Paragraph({ text: `Date: ${new Date().toLocaleString()}` }),
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
                downloadBtn.innerHTML = original;
            }
        };
        
        previewCard.style.display = 'block';
        if (resultsContainer) resultsContainer.style.display = 'none';
    }

    function markdownToDocxParagraphs(markdown) {
        const lines = markdown.split('\n');
        const paragraphs = [];
        let inList = false;
        let listItems = [];

        for (let line of lines) {
            line = line.trim();
            if (line === '') {
                if (inList && listItems.length) {
                    const listPara = new docx.Paragraph({
                        children: listItems.map(item => new docx.TextRun({ text: `• ${item}`, break: 1 })),
                        spacing: { after: 200 }
                    });
                    paragraphs.push(listPara);
                    listItems = [];
                    inList = false;
                }
                continue;
            }

            if (line.startsWith('# ')) {
                const text = line.substring(2);
                paragraphs.push(new docx.Paragraph({
                    text: text,
                    heading: docx.HeadingLevel.HEADING_1,
                    spacing: { before: 400, after: 200 }
                }));
            } else if (line.startsWith('## ')) {
                const text = line.substring(3);
                paragraphs.push(new docx.Paragraph({
                    text: text,
                    heading: docx.HeadingLevel.HEADING_2,
                    spacing: { before: 300, after: 150 }
                }));
            } else if (line.startsWith('### ')) {
                const text = line.substring(4);
                paragraphs.push(new docx.Paragraph({
                    text: text,
                    heading: docx.HeadingLevel.HEADING_3,
                    spacing: { before: 200, after: 100 }
                }));
            }
            else if (line.match(/^[\*\-\+]\s/)) {
                const content = line.substring(2);
                if (!inList) inList = true;
                listItems.push(content);
            }
            else if (line.match(/^\d+\.\s/)) {
                const content = line.replace(/^\d+\.\s/, '');
                if (!inList) inList = true;
                listItems.push(content);
            }
            else {
                if (inList && listItems.length) {
                    const listPara = new docx.Paragraph({
                        children: listItems.map(item => new docx.TextRun({ text: `• ${item}`, break: 1 })),
                        spacing: { after: 200 }
                    });
                    paragraphs.push(listPara);
                    listItems = [];
                    inList = false;
                }
                const clean = line.replace(/\*\*/g, '').replace(/\*/g, '');
                paragraphs.push(new docx.Paragraph({
                    text: clean,
                    spacing: { after: 200 }
                }));
            }
        }
        
        if (inList && listItems.length) {
            const listPara = new docx.Paragraph({
                children: listItems.map(item => new docx.TextRun({ text: `• ${item}`, break: 1 })),
                spacing: { after: 200 }
            });
            paragraphs.push(listPara);
        }
        
        return paragraphs;
    }

    async function autoSaveToHistory(contentType, fileName, results, transcription = null) {
        if (!currentUser) return null;
        const userId = currentUser.uid;
        const newRef = await database.ref(`users/${userId}/analysisHistory`).push({
            contentType,
            fileName: fileName || (contentType === 'text' ? 'Pasted Text' : (contentType === 'audio' ? 'Audio Session' : (contentType === 'image' ? 'Image Analysis' : 'Document'))),
            documentType,
            request: analysisTextarea.value || (contentType === 'audio' ? 'Session Analysis' : (contentType === 'image' ? 'Image Analysis' : 'Text Analysis')),
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
    // 11. ANALYZE BUTTON CLICK HANDLER
    // =========================================================================
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
                activeMode === 'text' ? 'Text Input' : 
                (activeMode === 'document' ? uploadedFile?.name : 
                (activeMode === 'audio' ? uploadedAudioFile?.name : uploadedImageFile?.name)), 
                result, 
                activeMode === 'audio' ? audioTranscript : null);
            
            loadingIndicator.style.display = 'none';
            showPreviewCard(result, key);
            
            window.currentAnalysisResult = result;
            
            saveProgress(); // Save results
        } catch (err) {
            console.error(err);
            let errorMsg = err.message;
            if (errorMsg.includes('max_tokens') || errorMsg.includes('token limit')) {
                errorMsg = 'The content is too long. Please try a shorter document or audio file.';
            }
            showToast('Analysis failed: ' + errorMsg, 'error');
            const resultsContainer = document.getElementById('analysisResultsContainer');
            if (resultsContainer) resultsContainer.style.display = 'none';
            const previewCard = document.getElementById('previewCard');
            if (previewCard) previewCard.style.display = 'none';
        } finally {
            resetAnalyzeButton();
        }
    });

    if (downloadReport) {
        downloadReport.addEventListener('click', async () => {
            if (!analysisResults) return;
            const original = downloadReport.innerHTML;
            downloadReport.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
            try {
                const paragraphs = markdownToDocxParagraphs(analysisResults);
                const doc = new docx.Document({
                    sections: [{
                        children: [
                            new docx.Paragraph({ text: "rehab.ai Analysis Report", heading: docx.HeadingLevel.HEADING_1 }),
                            new docx.Paragraph({ text: `Date: ${reportDate.textContent}` }),
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
                downloadReport.innerHTML = original;
            }
        });
    }

    if (closeResultsBtn) {
        closeResultsBtn.addEventListener('click', () => {
            const previewCard = document.getElementById('previewCard');
            if (previewCard) previewCard.style.display = 'none';
            const resultsContainer = document.getElementById('analysisResultsContainer');
            if (resultsContainer) resultsContainer.style.display = 'none';
            analysisResults = null;
            saveProgress(); // Save after clearing results
        });
    }

    // =========================================================================
    // 12. HISTORY
    // =========================================================================
    function loadHistory() {
        if (!currentUser) return;
        const historyList = document.getElementById('historyList');
        database.ref(`users/${currentUser.uid}/analysisHistory`).orderByChild('timestamp').on('value', (snapshot) => {
            if (!historyList) return;
            historyList.innerHTML = '';
            const data = snapshot.val();
            if (!data) {
                historyList.innerHTML = '<div class="empty-state"><i class="bx bx-folder-open"></i><p>No history found</p></div>';
                return;
            }
            const entries = Object.entries(data).sort((a,b) => b[1].timestamp - a[1].timestamp);
            entries.forEach(([key, item]) => {
                const div = document.createElement('div');
                div.className = 'history-item';
                div.innerHTML = `
                    <div class="history-info">
                        <span class="history-name">${item.fileName || 'Untitled'}</span>
                        <div class="history-meta">
                            <span class="meta-tag"><i class="bx ${item.contentType === 'audio' ? 'bx-microphone' : (item.contentType === 'document' ? 'bx-file' : (item.contentType === 'image' ? 'bx-image' : 'bx-edit'))}"></i> ${item.documentType || 'General'}</span>
                            <span>${item.date}</span>
                        </div>
                    </div>
                    <button class="view-btn" data-key="${key}"><i class="bx bx-chevron-right"></i></button>
                `;
                div.querySelector('.view-btn').addEventListener('click', () => {
                    window.open(`docresult.html?id=${key}`, '_blank');
                });
                historyList.appendChild(div);
            });
        });
    }

    function toggleHistoryDrawer() {
        historyDrawer.classList.toggle('active');
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
    
    if (closeDrawerBtn) {
        closeDrawerBtn.addEventListener('click', toggleHistoryDrawer);
    }

    // =========================================================================
    // 13. DOCUMENT TYPE SELECTION - SAVE ON SELECT
    // =========================================================================
    chipBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            chipBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            documentType = btn.dataset.type;
            updateAnalyzeButtonState();
            saveProgress(); // Save document type preference immediately
            console.log('Document type saved:', documentType);
        });
    });

    // =========================================================================
    // 14. ANALYSIS REQUEST - SAVE ON INPUT
    // =========================================================================
    if (analysisTextarea) {
        analysisTextarea.addEventListener('input', () => {
            updateAnalyzeButtonState();
            saveProgress(); // Save analysis request as user types
        });
    }

    // =========================================================================
    // 15. QUICK TAGS - SAVE AFTER ADDING
    // =========================================================================
    tags.forEach(tag => {
        tag.addEventListener('click', () => {
            const requestText = tag.dataset.request;
            const currentText = analysisTextarea.value;
            const newText = currentText ? currentText + "\n" + requestText : requestText;
            analysisTextarea.value = newText;
            updateAnalyzeButtonState();
            saveProgress(); // Save after adding tag
            // Trigger input event to ensure UI updates
            analysisTextarea.dispatchEvent(new Event('input'));
        });
    });

    // =========================================================================
    // 16. AUTH & INIT
    // =========================================================================
    firebase.auth().onAuthStateChanged(async (user) => {
        currentUser = user;
        if (user) {
            await fetchAPITokens();
            loadProgress();
            loadHistory();
            console.log('User logged in, progress loaded');
        } else {
            // Clear saved state on logout
            localStorage.removeItem(STORAGE_KEY);
            console.log('User logged out, state cleared');
        }
        updateAnalyzeButtonState();
    });

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

    // Initialize scroll indicators
    initScrollIndicators();
    
    setActiveMode('text');
    updateWordCount();
    
    console.log('Documentation assistant initialized with full auto-save and logging');
});