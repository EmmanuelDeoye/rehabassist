// js/gait.js - Complete with history, 30s limit, and video persistence
document.addEventListener('DOMContentLoaded', async () => {
  // =========================================================================
  // 1. DOM ELEMENTS
  // =========================================================================
  // Stages
  const stageRecord = document.getElementById('stageRecord');
  const stageAnalyze = document.getElementById('stageAnalyze');
  const stageResults = document.getElementById('stageResults');
  const steps = document.querySelectorAll('.step');
  
  // Camera elements
  const cameraPreview = document.getElementById('cameraPreview');
  const cameraPlaceholder = document.getElementById('cameraPlaceholder');
  const startCameraBtn = document.getElementById('startCameraBtn');
  const recordBtn = document.getElementById('recordBtn');
  const recordingTimer = document.getElementById('recordingTimer');
  const timerDisplay = document.getElementById('timerDisplay');
  const videoPreview = document.getElementById('videoPreview');
  const recordedVideo = document.getElementById('recordedVideo');
  const reRecordBtn = document.getElementById('reRecordBtn');
  const proceedBtn = document.getElementById('proceedToAnalysisBtn');
  const gaitViewSelect = document.getElementById('gaitViewSelect');
  const gaitNotes = document.getElementById('gaitNotes');
  
  // Analysis elements
  const analysisStatus = document.getElementById('analysisStatus');
  const progressBar = document.getElementById('analysisProgressBar');
  
  // Results elements
  const gaitResultsContent = document.getElementById('gaitResultsContent');
  const resultDate = document.getElementById('resultDate');
  const downloadGaitReport = document.getElementById('downloadGaitReport');
  const newGaitBtn = document.getElementById('newGaitBtn');
  
  // History drawer elements
  const historyDrawer = document.getElementById('historyDrawer');
  const historyNavBtn = document.getElementById('historyNavBtn');
  const closeDrawerBtn = document.getElementById('closeDrawerBtn');
  const historyList = document.getElementById('historyList');
  
  // Toast container (will be created if missing)
  let toastContainer = document.getElementById('toast-container');
  
  // =========================================================================
  // 2. STATE VARIABLES
  // =========================================================================
  let stream = null;
  let mediaRecorder = null;
  let recordedChunks = [];
  let recordedVideoURL = null;
  let recordingStartTime = null;
  let timerInterval = null;
  let maxRecordTimeout = null;       // NEW: 30-second limit timeout
  let aiConfig = { token: null, endpoint: null, model: 'openai/gpt-4.1' };
  let currentUser = null;
  let analysisResults = null;
  let isCameraActive = false;
  let isRecording = false;
  let videoBlob = null;
  
  const database = firebase.database();
  
  // IndexedDB setup for video persistence
  const DB_NAME = 'GaitMonitorDB';
  const STORE_NAME = 'videos';
  let db = null;
  
  // =========================================================================
  // 3. UTILITY FUNCTIONS
  // =========================================================================
  
  // Ensure toast container exists
  function ensureToastContainer() {
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      document.body.appendChild(toastContainer);
    }
    return toastContainer;
  }
  
  function showToast(message, type = 'success', duration = 3500) {
    const container = ensureToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
  }
  
  async function fetchTokens() {
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
  // 4. INDEXEDDB FOR VIDEO PERSISTENCE
  // =========================================================================
  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        db = request.result;
        resolve(db);
      };
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
    });
  }
  
  async function saveVideoToStorage(blob) {
    try {
      if (!db) await openDatabase();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(blob, 'currentVideo');
        request.onsuccess = () => {
          console.log('Video saved to IndexedDB');
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.error('Failed to save video:', err);
    }
  }
  
  async function loadVideoFromStorage() {
    try {
      if (!db) await openDatabase();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get('currentVideo');
        request.onsuccess = () => {
          resolve(request.result); // Blob or undefined
        };
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.error('Failed to load video:', err);
      return null;
    }
  }
  
  async function clearVideoFromStorage() {
    try {
      if (!db) await openDatabase();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete('currentVideo');
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.error('Failed to clear video:', err);
    }
  }
  
  // =========================================================================
  // 5. STAGE MANAGEMENT
  // =========================================================================
  function setStage(stageNum) {
    [stageRecord, stageAnalyze, stageResults].forEach(s => s.classList.remove('active'));
    if (stageNum === 1) stageRecord.classList.add('active');
    else if (stageNum === 2) stageAnalyze.classList.add('active');
    else if (stageNum === 3) stageResults.classList.add('active');
    
    steps.forEach((step, idx) => {
      step.classList.remove('active', 'completed');
      if (idx < stageNum - 1) step.classList.add('completed');
      if (idx === stageNum - 1) step.classList.add('active');
    });
  }
  
  // =========================================================================
  // 6. CAMERA FUNCTIONS
  // =========================================================================
  async function startCamera() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: false 
      });
      
      cameraPreview.srcObject = stream;
      cameraPlaceholder.style.display = 'none';
      cameraPreview.style.display = 'block';
      
      const scanOverlay = document.querySelector('.scan-overlay');
      if (scanOverlay) scanOverlay.style.display = 'block';
      
      startCameraBtn.style.display = 'none';
      recordBtn.disabled = false;
      isCameraActive = true;
      
      showToast('Camera ready - Position patient and record gait (max 30s)', 'success');
      
    } catch (err) {
      console.error('Camera error:', err);
      showToast('Camera access denied or not available', 'error');
      startCameraBtn.style.display = 'block';
      startCameraBtn.disabled = false;
    }
  }
  
  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    
    cameraPreview.srcObject = null;
    cameraPreview.style.display = 'none';
    cameraPlaceholder.style.display = 'flex';
    
    const scanOverlay = document.querySelector('.scan-overlay');
    if (scanOverlay) scanOverlay.style.display = 'none';
    
    isCameraActive = false;
    startCameraBtn.style.display = 'block';
    startCameraBtn.disabled = false;
    recordBtn.disabled = true;
  }
  
  // =========================================================================
  // 7. RECORDING FUNCTIONS (with 30s limit and persistence)
  // =========================================================================
  function startRecording() {
    if (!stream) return;
    
    recordedChunks = [];
    videoBlob = null;
    
    const options = { mimeType: 'video/webm;codecs=vp9,opus' };
    try {
      mediaRecorder = new MediaRecorder(stream, options);
    } catch (e) {
      mediaRecorder = new MediaRecorder(stream);
    }
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };
    
    mediaRecorder.onstop = async () => {
      videoBlob = new Blob(recordedChunks, { type: 'video/webm' });
      recordedVideoURL = URL.createObjectURL(videoBlob);
      recordedVideo.src = recordedVideoURL;
      videoPreview.style.display = 'block';
      proceedBtn.disabled = false;
      stopCamera();
      
      // Save video to IndexedDB for persistence
      await saveVideoToStorage(videoBlob);
      
      showToast('Recording complete! Ready for analysis.', 'success');
      
      // Clear max record timeout if it exists
      if (maxRecordTimeout) {
        clearTimeout(maxRecordTimeout);
        maxRecordTimeout = null;
      }
    };
    
    mediaRecorder.start();
    isRecording = true;
    
    recordBtn.classList.add('recording');
    recordBtn.innerHTML = '<i class="fas fa-stop"></i> Stop Recording';
    
    recordingTimer.style.display = 'flex';
    recordingStartTime = Date.now();
    
    timerInterval = setInterval(updateTimer, 1000);
    
    // Set 30-second auto-stop
    maxRecordTimeout = setTimeout(() => {
      if (isRecording) {
        showToast('Maximum recording time (30 seconds) reached', 'info');
        stopRecording();
      }
    }, 30000);
    
    showToast('Recording started - 30s max', 'info');
  }
  
  function stopRecording() {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      isRecording = false;
      
      recordBtn.classList.remove('recording');
      recordBtn.innerHTML = '<i class="fas fa-circle"></i> Record';
      
      recordingTimer.style.display = 'none';
      clearInterval(timerInterval);
      
      if (maxRecordTimeout) {
        clearTimeout(maxRecordTimeout);
        maxRecordTimeout = null;
      }
    }
  }
  
  function updateTimer() {
    const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
    const remaining = 30 - elapsed;
    const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const secs = (elapsed % 60).toString().padStart(2, '0');
    timerDisplay.textContent = `${mins}:${secs} (max 30s)`;
    
    // Visual warning when less than 5 seconds remain
    if (remaining <= 5 && remaining > 0) {
      timerDisplay.style.color = '#dc2626';
    } else {
      timerDisplay.style.color = '';
    }
  }
  
  async function resetRecording() {
    if (recordedVideoURL) {
      URL.revokeObjectURL(recordedVideoURL);
      recordedVideoURL = null;
    }
    recordedVideo.src = '';
    videoBlob = null;
    recordedChunks = [];
    videoPreview.style.display = 'none';
    proceedBtn.disabled = true;
    
    // Clear stored video from IndexedDB
    await clearVideoFromStorage();
  }
  
  // =========================================================================
  // 8. RESTORE SAVED VIDEO ON PAGE LOAD
  // =========================================================================
  async function restoreSavedVideo() {
    try {
      const savedBlob = await loadVideoFromStorage();
      if (savedBlob) {
        videoBlob = savedBlob;
        recordedVideoURL = URL.createObjectURL(videoBlob);
        recordedVideo.src = recordedVideoURL;
        videoPreview.style.display = 'block';
        proceedBtn.disabled = false;
        showToast('Previous recording restored', 'info', 2000);
        console.log('Restored saved video from IndexedDB');
      }
    } catch (err) {
      console.warn('Could not restore video:', err);
    }
  }
  
  // =========================================================================
  // 9. AI ANALYSIS
  // =========================================================================
  async function extractVideoFrames(videoBlob, frameCount = 5) {
    return new Promise((resolve, reject) => {
      const videoUrl = URL.createObjectURL(videoBlob);
      const video = document.createElement('video');
      video.src = videoUrl;
      video.crossOrigin = 'anonymous';
      video.muted = true;
      
      video.onloadedmetadata = async () => {
        const duration = video.duration;
        const interval = duration / (frameCount + 1);
        const frames = [];
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = 640;
        canvas.height = 360;
        
        try {
          for (let i = 1; i <= frameCount; i++) {
            const time = interval * i;
            await seekTo(video, time);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            frames.push(dataUrl);
          }
          URL.revokeObjectURL(videoUrl);
          resolve(frames);
        } catch (err) {
          URL.revokeObjectURL(videoUrl);
          reject(err);
        }
      };
      
      video.onerror = () => {
        URL.revokeObjectURL(videoUrl);
        reject(new Error('Failed to load video'));
      };
    });
  }
  
  function seekTo(video, time) {
    return new Promise((resolve) => {
      video.currentTime = time;
      video.onseeked = resolve;
    });
  }
  
  async function analyzeGait() {
    if (!aiConfig.token) {
      const success = await fetchTokens();
      if (!success) throw new Error('AI service unavailable. Please try again.');
    }
    
    const frames = await extractVideoFrames(videoBlob, 5);
    
    const view = gaitViewSelect.options[gaitViewSelect.selectedIndex].text;
    const notes = gaitNotes.value.trim() || 'No additional notes provided';
    
    const systemPrompt = `You are rehablix Gait Monitor, a clinical AI specialized in gait analysis for rehabilitation professionals.
Analyze the provided video frames showing a patient walking (${view} view).

Provide a comprehensive clinical gait analysis including:
1. **Observed Gait Pattern** - Identify pattern type (antalgic, Trendelenburg, steppage, etc.)
2. **Key Deviations** - Note abnormalities in:
   - Stride length and cadence
   - Arm swing symmetry
   - Pelvic tilt and rotation
   - Foot clearance and strike pattern
   - Trunk stability
3. **Likely Impairments** - Probable underlying issues based on observed deviations
4. **Clinical Recommendations** - Suggested interventions or further assessments

Format your response with clear headings (## for sections), bullet points for observations, and professional clinical language. Do NOT use tables.`;
    
    const userContent = `Gait Analysis Request
View: ${view}
Additional Notes: ${notes}

The video frames show a patient walking. Please analyze the gait pattern and provide clinical insights.`;
    
    const messages = [
      { role: "system", content: systemPrompt },
      { 
        role: "user", 
        content: [
          { type: "text", text: userContent },
          ...frames.map(url => ({ type: "image_url", image_url: { url } }))
        ]
      }
    ];
    
    const url = `${aiConfig.endpoint.replace(/\/$/, '')}/chat/completions`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${aiConfig.token}` 
      },
      body: JSON.stringify({ 
        model: aiConfig.model, 
        messages: messages, 
        max_tokens: 2000, 
        temperature: 0.3 
      })
    });
    
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'API error');
    }
    
    const data = await response.json();
    return data.choices[0].message.content;
  }
  
  async function saveToHistory(result) {
    if (!currentUser) return null;
    
    try {
      const view = gaitViewSelect.options[gaitViewSelect.selectedIndex].text;
      const notes = gaitNotes.value.trim() || 'No notes';
      
      const newRef = await database.ref(`users/${currentUser.uid}/analysisHistory`).push({
        contentType: 'gait',
        fileName: `Gait Analysis - ${view}`,
        documentType: 'Gait Analysis',
        request: `Analyze gait pattern from video (${view} view). Notes: ${notes}`,
        results: result,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        date: new Date().toLocaleDateString(),
        view: view,
        notes: notes
      });
      
      showToast('Analysis saved to history', 'info', 2000);
      return newRef.key;
    } catch (error) {
      console.error('Error saving to history:', error);
      return null;
    }
  }
  
  // =========================================================================
  // 10. HISTORY DRAWER FUNCTIONS
  // =========================================================================
  function loadGaitHistory() {
    if (!currentUser) return;
    
    database.ref(`users/${currentUser.uid}/analysisHistory`)
      .orderByChild('timestamp')
      .on('value', (snapshot) => {
        historyList.innerHTML = '';
        const data = snapshot.val();
        
        if (!data) {
          historyList.innerHTML = '<div class="empty-state"><i class="bx bx-folder-open"></i><p>No gait history found</p></div>';
          return;
        }
        
        const entries = Object.entries(data)
          .filter(([_, item]) => item.contentType === 'gait')
          .sort((a, b) => b[1].timestamp - a[1].timestamp);
        
        if (entries.length === 0) {
          historyList.innerHTML = '<div class="empty-state"><i class="bx bx-folder-open"></i><p>No gait history found</p></div>';
          return;
        }
        
        entries.forEach(([key, item]) => {
          const div = document.createElement('div');
          div.className = 'history-item';
          div.innerHTML = `
            <div class="history-info">
              <span class="history-name">${escapeHtml(item.fileName || 'Gait Analysis')}</span>
              <div class="history-meta">
                <span class="meta-tag"><i class="bx bx-walk"></i> Gait</span>
                <span>${escapeHtml(item.date)}</span>
                ${item.view ? `<span>${escapeHtml(item.view)}</span>` : ''}
              </div>
            </div>
            <button class="view-btn" data-key="${key}"><i class="bx bx-chevron-right"></i></button>
          `;
          
          div.querySelector('.view-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            analysisResults = item.results;
            gaitResultsContent.innerHTML = marked.parse(item.results);
            resultDate.textContent = item.date;
            setStage(3);
            historyDrawer.classList.remove('active');
            showToast('Analysis loaded from history', 'success');
          });
          
          div.addEventListener('click', () => {
            analysisResults = item.results;
            gaitResultsContent.innerHTML = marked.parse(item.results);
            resultDate.textContent = item.date;
            setStage(3);
            historyDrawer.classList.remove('active');
            showToast('Analysis loaded from history', 'success');
          });
          
          historyList.appendChild(div);
        });
      });
  }
  
  function toggleHistoryDrawer() {
    if (!currentUser) {
      showToast('Please login to view history', 'error');
      const loginBtn = document.getElementById('loginBtn');
      if (loginBtn) loginBtn.click();
      return;
    }
    loadGaitHistory();
    historyDrawer.classList.add('active');
  }
  
  // =========================================================================
  // 11. EVENT LISTENERS
  // =========================================================================
  startCameraBtn.addEventListener('click', startCamera);
  
  recordBtn.addEventListener('click', () => {
    if (!isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  });
  
  reRecordBtn.addEventListener('click', async () => {
    await resetRecording();
    startCamera();
  });
  
  proceedBtn.addEventListener('click', async () => {
    if (!videoBlob) {
      showToast('No video recorded', 'error');
      return;
    }
    
    if (!currentUser) {
      showToast('Please login to analyze', 'error');
      const loginBtn = document.getElementById('loginBtn');
      if (loginBtn) loginBtn.click();
      return;
    }
    
    setStage(2);
    analysisStatus.textContent = 'Extracting frames from video...';
    progressBar.style.width = '25%';
    
    try {
      analysisStatus.textContent = 'Analyzing gait pattern with AI...';
      progressBar.style.width = '50%';
      
      const result = await analyzeGait();
      
      progressBar.style.width = '100%';
      analysisResults = result;
      
      await saveToHistory(result);
      
      gaitResultsContent.innerHTML = marked.parse(result);
      resultDate.textContent = new Date().toLocaleString();
      
      // Clear saved video after successful analysis (optional)
      await clearVideoFromStorage();
      
      setStage(3);
      showToast('Gait analysis complete!', 'success');
      
    } catch (err) {
      console.error('Analysis error:', err);
      let errorMsg = err.message;
      if (errorMsg.includes('token') || errorMsg.includes('API')) {
        errorMsg = 'AI service temporarily unavailable. Please try again.';
      }
      showToast('Analysis failed: ' + errorMsg, 'error');
      setStage(1);
    } finally {
      progressBar.style.width = '0%';
    }
  });
  
  newGaitBtn.addEventListener('click', async () => {
    await resetRecording();
    setStage(1);
    startCameraBtn.style.display = 'block';
    startCameraBtn.disabled = false;
    recordBtn.disabled = true;
    recordingTimer.style.display = 'none';
    clearInterval(timerInterval);
    isRecording = false;
    recordBtn.classList.remove('recording');
    recordBtn.innerHTML = '<i class="fas fa-circle"></i> Record';
    if (maxRecordTimeout) {
      clearTimeout(maxRecordTimeout);
      maxRecordTimeout = null;
    }
  });
  
  downloadGaitReport.addEventListener('click', async () => {
    if (!analysisResults) {
      showToast('No analysis results to export', 'warning');
      return;
    }
    
    downloadGaitReport.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    
    try {
      const { Document, Packer, Paragraph, HeadingLevel } = docx;
      
      const lines = analysisResults.split('\n');
      const children = [];
      
      lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) {
          children.push(new Paragraph({ text: '' }));
        } else if (trimmed.startsWith('# ')) {
          children.push(new Paragraph({ 
            text: trimmed.substring(2), 
            heading: HeadingLevel.HEADING_1 
          }));
        } else if (trimmed.startsWith('## ')) {
          children.push(new Paragraph({ 
            text: trimmed.substring(3), 
            heading: HeadingLevel.HEADING_2 
          }));
        } else if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
          children.push(new Paragraph({ 
            text: trimmed, 
            bullet: { level: 0 } 
          }));
        } else {
          children.push(new Paragraph({ text: trimmed }));
        }
      });
      
      const doc = new Document({
        sections: [{
          children: [
            new Paragraph({
              text: 'rehablix Gait Analysis Report',
              heading: HeadingLevel.TITLE
            }),
            new Paragraph({
              text: `Generated: ${new Date().toLocaleString()}`,
              spacing: { after: 300 }
            }),
            new Paragraph({
              text: `View: ${gaitViewSelect.options[gaitViewSelect.selectedIndex]?.text || 'N/A'}`,
              spacing: { after: 200 }
            }),
            new Paragraph({ text: '' }),
            ...children
          ]
        }]
      });
      
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Gait_Analysis_${Date.now()}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      
      showToast('Report exported successfully', 'success');
    } catch (err) {
      console.error('Export error:', err);
      showToast('Export failed', 'error');
    } finally {
      downloadGaitReport.innerHTML = '<i class="fas fa-file-pdf"></i> Export Report';
    }
  });
  
  // History drawer events
  historyNavBtn.addEventListener('click', toggleHistoryDrawer);
  
  closeDrawerBtn.addEventListener('click', () => {
    historyDrawer.classList.remove('active');
  });
  
  document.addEventListener('click', (e) => {
    if (historyDrawer && historyDrawer.classList.contains('active') &&
        !historyDrawer.contains(e.target) &&
        e.target !== historyNavBtn &&
        !historyNavBtn.contains(e.target)) {
      historyDrawer.classList.remove('active');
    }
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && historyDrawer && historyDrawer.classList.contains('active')) {
      historyDrawer.classList.remove('active');
    }
  });
  
  // =========================================================================
  // 12. THEME & INITIALIZATION
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
  
  // =========================================================================
  // 13. AUTH STATE LISTENER
  // =========================================================================
  firebase.auth().onAuthStateChanged((user) => {
    currentUser = user;
    if (user) {
      console.log('User logged in:', user.email);
      loadGaitHistory();
    } else {
      console.log('User logged out');
    }
  });
  
  // =========================================================================
  // 14. INITIAL SETUP
  // =========================================================================
  async function initialize() {
    // Ensure toast container exists
    ensureToastContainer();
    
    // Open IndexedDB
    await openDatabase();
    
    // Restore any saved video
    await restoreSavedVideo();
    
    fetchTokens();
    setStage(1);
    startCameraBtn.disabled = false;
    
    const scanOverlay = document.querySelector('.scan-overlay');
    if (scanOverlay) {
      scanOverlay.style.display = 'none';
    }
  }
  
  initialize();
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }
    if (recordedVideoURL) {
      URL.revokeObjectURL(recordedVideoURL);
    }
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    if (maxRecordTimeout) {
      clearTimeout(maxRecordTimeout);
    }
  });
  
  console.log('Gait Monitor initialized');
});