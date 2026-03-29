// documentation.js - Enhanced with audio loading, table-free AI, improved export, auto-scroll
document.addEventListener('DOMContentLoaded', function() {
    // =========================================================================
    // 1. DOM ELEMENTS
    // =========================================================================
    const switchBtns = document.querySelectorAll('.switch-btn');
    const textUploadSection = document.getElementById('textUploadSection');
    const documentUploadSection = document.getElementById('documentUploadSection');
    const audioUploadSection = document.getElementById('audioUploadSection');
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
    let activeMode = 'text'; // 'text', 'document', 'audio'
    let documentType = null;
    let uploadedFile = null;
    let extractedDocumentText = "";
    let uploadedAudioFile = null;
    let audioTranscript = "";
    let analysisResults = null;
    let isTranscribing = false;
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
        }
        const hasType = documentType !== null;
        const hasRequest = activeMode === 'audio' ? true : analysisTextarea.value.trim().length > 0;
        const shouldEnable = hasContent && hasType && hasRequest && !isTranscribing;
        analyzeBtn.disabled = !shouldEnable;
    }

    function saveProgress() {
        const state = {
            activeMode: activeMode,
            documentType: documentType,
            analysisRequest: analysisTextarea.value,
            plainText: plainTextInput.value,
            extractedDocumentText: extractedDocumentText,
            fileName: uploadedFile ? uploadedFile.name : null,
            audioTranscript: audioTranscript,
            audioFileName: uploadedAudioFile ? uploadedAudioFile.name : null,
            analysisResults: analysisResults,
            reportDate: reportDate.textContent
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function loadProgress() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return;
        try {
            const state = JSON.parse(saved);
            if (state.activeMode) {
                const targetBtn = document.querySelector(`.switch-btn[data-type="${state.activeMode}"]`);
                if (targetBtn) targetBtn.click();
            }
            if (state.documentType) {
                documentType = state.documentType;
                chipBtns.forEach(btn => {
                    if (btn.dataset.type === state.documentType) btn.classList.add('active');
                    else btn.classList.remove('active');
                });
            }
            if (state.analysisRequest) analysisTextarea.value = state.analysisRequest;
            if (state.plainText) plainTextInput.value = state.plainText;
            if (state.extractedDocumentText) extractedDocumentText = state.extractedDocumentText;
            if (state.fileName) {
                uploadedFile = { name: state.fileName, mock: true };
                displayFileInfo(uploadedFile);
            }
            if (state.audioTranscript) {
                audioTranscript = state.audioTranscript;
                if (audioTranscript) {
                    audioTranscriptPreview.style.display = 'block';
                    transcriptPreviewText.textContent = audioTranscript;
                }
            }
            if (state.audioFileName) {
                uploadedAudioFile = { name: state.audioFileName, mock: true };
                displayAudioFileInfo(uploadedAudioFile);
            }
            if (state.analysisResults) {
                analysisResults = state.analysisResults;
                displayResults(analysisResults);
                reportDate.textContent = state.reportDate || new Date().toLocaleString();
            }
            updateWordCount();
            updateAnalyzeButtonState();
        } catch (e) { console.error('Load error', e); }
    }

    function updateWordCount() {
        const text = plainTextInput.value.trim();
        const words = text ? text.split(/\s+/).length : 0;
        textWordCount.textContent = `${words} word${words !== 1 ? 's' : ''}`;
        updateAnalyzeButtonState();
    }

    // =========================================================================
    // 4. MODE SWITCHING
    // =========================================================================
    function setActiveMode(mode) {
        activeMode = mode;
        textUploadSection.style.display = mode === 'text' ? 'block' : 'none';
        documentUploadSection.style.display = mode === 'document' ? 'block' : 'none';
        audioUploadSection.style.display = mode === 'audio' ? 'block' : 'none';
        updateAnalyzeButtonState();
        saveProgress();
    }

    switchBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            switchBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            setActiveMode(btn.dataset.type);
        });
    });

    // =========================================================================
    // 5. TEXT MODE
    // =========================================================================
    plainTextInput.addEventListener('input', () => {
        updateWordCount();
        saveProgress();
        updateAnalyzeButtonState();
    });
    
    clearTextBtn.addEventListener('click', () => {
        plainTextInput.value = '';
        updateWordCount();
        saveProgress();
        updateAnalyzeButtonState();
        showToast('Text cleared', 'info');
    });

    // =========================================================================
    // 6. DOCUMENT MODE
    // =========================================================================
    function displayFileInfo(file) {
        fileInfo.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-file-alt" style="color: var(--accent);"></i>
                <strong>${file.name}</strong>
                ${!file.mock ? `<span style="font-size:0.8rem;">(${(file.size / 1024).toFixed(1)} KB)</span>` : ''}
            </div>
        `;
        fileInfo.style.display = 'block';
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
    // 7. AUDIO MODE - Enhanced with loading animation
    // =========================================================================
    function displayAudioFileInfo(file) {
        audioFileInfo.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-file-audio" style="color: var(--accent);"></i>
                <strong>${file.name}</strong>
                ${!file.mock ? `<span>(${(file.size / 1024).toFixed(1)} KB)</span>` : ''}
            </div>
        `;
        audioFileInfo.style.display = 'block';
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
    // 8. ANALYSIS (AI CALL) - Table‑free prompt
    // =========================================================================
    async function analyzeWithOpenAI(messages) {
        if (!aiConfig.token || !aiConfig.endpoint) throw new Error('API not ready');
        
        let totalLength = JSON.stringify(messages).length;
        if (totalLength > 50000) {
            const userMsg = messages.find(m => m.role === 'user');
            if (userMsg && userMsg.content.length > 15000) {
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
        const safeContent = truncateContent(content);
        let systemPrompt = `You are rehab.ai, a medical AI assistant. Analyze the following ${docType} content. Provide professional, structured output with headings, bullet points, and lists. Do NOT use tables. Use clear section titles (e.g., "Key Findings", "Recommendations") and format content for easy reading.`;
        
        if (activeMode === 'audio') {
            systemPrompt = `You are rehab.ai, a medical AI assistant specializing in session analysis. Analyze the following session transcript and provide:
1. Key clinical observations and themes
2. Notable quotes or exchanges
3. Clinical recommendations
4. Areas for follow-up
Use tables when necessary. Use bullet points, numbered lists, and headings only.`;
        }
        
        let userContent = `**User Request:** ${userRequest || 'Please analyze this content thoroughly.'}\n\n**Content:**\n${safeContent}`;
        
        return [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent.substring(0, 50000) }
        ];
    }

    async function performAnalysis() {
        let content = "";
        if (activeMode === 'text') {
            content = plainTextInput.value.trim();
        } else if (activeMode === 'document') {
            content = extractedDocumentText;
        } else if (activeMode === 'audio') {
            content = audioTranscript;
        }
        if (!content) throw new Error('No content to analyze');
        
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
        // Show loading state in the results container
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

    // Function to show preview card instead of full results
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
        
        // Show a truncated preview (strip HTML tags)
        const previewText = fullText.replace(/<[^>]*>/g, ' ').substring(0, 200) + '...';
        previewContent.innerHTML = `<p>${previewText}</p>`;
        
        // View full button opens docresult.html with the history key
        viewBtn.onclick = () => {
            window.open(`docresult.html?id=${historyKey}`, '_blank');
        };
        
        // Download button: directly download the result as docx
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
        // Hide the old results container
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

    // Modified autoSaveToHistory to return the key
    async function autoSaveToHistory(contentType, fileName, results, transcription = null) {
        if (!currentUser) return null;
        const userId = currentUser.uid;
        const newRef = await database.ref(`users/${userId}/analysisHistory`).push({
            contentType,
            fileName: fileName || (contentType === 'text' ? 'Pasted Text' : (contentType === 'audio' ? 'Audio Session' : 'Document')),
            documentType,
            request: analysisTextarea.value || (contentType === 'audio' ? 'Session Analysis' : 'Text Analysis'),
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
    // 9. ANALYZE BUTTON CLICK HANDLER (Updated for preview card)
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
            
            // Save to history and get the key
            const key = await autoSaveToHistory(activeMode, 
                activeMode === 'text' ? 'Text Input' : 
                (activeMode === 'document' ? uploadedFile?.name : uploadedAudioFile?.name), 
                result, 
                activeMode === 'audio' ? audioTranscript : null);
            
            // Show preview card instead of full results
            loadingIndicator.style.display = 'none';
            showPreviewCard(result, key);
            
            // Optionally store the current analysis in a global variable
            window.currentAnalysisResult = result;
            
            saveProgress();
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

    // Keep the downloadReport handler for legacy (though not used in new flow)
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

    // Modified closeResultsBtn to hide preview card and clear results
    if (closeResultsBtn) {
        closeResultsBtn.addEventListener('click', () => {
            const previewCard = document.getElementById('previewCard');
            if (previewCard) previewCard.style.display = 'none';
            const resultsContainer = document.getElementById('analysisResultsContainer');
            if (resultsContainer) resultsContainer.style.display = 'none';
            analysisResults = null;
            saveProgress();
        });
    }

    // =========================================================================
    // 10. HISTORY
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
                            <span class="meta-tag"><i class="bx ${item.contentType === 'audio' ? 'bx-microphone' : (item.contentType === 'document' ? 'bx-file' : 'bx-edit')}"></i> ${item.documentType || 'General'}</span>
                            <span>${item.date}</span>
                        </div>
                    </div>
                    <button class="view-btn" data-key="${key}"><i class="bx bx-chevron-right"></i></button>
                `;
                div.querySelector('.view-btn').addEventListener('click', () => {
                    const selected = data[key];
                    // Open in docresult.html instead of showing inline
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
    // 11. AUTH & INIT
    // =========================================================================
    firebase.auth().onAuthStateChanged(async (user) => {
        currentUser = user;
        if (user) {
            await fetchAPITokens();
            loadProgress();
            loadHistory();
        } else {
            localStorage.removeItem(STORAGE_KEY);
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

    setActiveMode('text');
    updateWordCount();
    
    if (analysisTextarea) {
        analysisTextarea.addEventListener('input', () => {
            updateAnalyzeButtonState();
            saveProgress();
        });
    }
    
    chipBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            chipBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            documentType = btn.dataset.type;
            updateAnalyzeButtonState();
            saveProgress();
        });
    });
    
    tags.forEach(tag => {
        tag.addEventListener('click', () => {
            const requestText = tag.dataset.request;
            analysisTextarea.value += (analysisTextarea.value ? "\n" : "") + requestText;
            updateAnalyzeButtonState();
            saveProgress();
        });
    });
});
