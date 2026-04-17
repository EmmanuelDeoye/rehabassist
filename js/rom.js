// js/rom.js - Updated: Start button hide/show, capture button visibility
document.addEventListener('DOMContentLoaded', async () => {
  // =========================================================================
  // 1. DOM ELEMENTS
  // =========================================================================
  // Stages
  const stageScan = document.getElementById('stageScan');
  const stageAnalyze = document.getElementById('stageAnalyze');
  const stageResults = document.getElementById('stageResults');
  const steps = document.querySelectorAll('.step');
  
  // Camera elements
  const cameraPreview = document.getElementById('cameraPreview');
  const cameraPlaceholder = document.getElementById('cameraPlaceholder');
  const startCameraBtn = document.getElementById('startCameraBtn');
  const jointSelect = document.getElementById('jointSelect');
  const movementInstruction = document.getElementById('movementInstruction');
  
  // Movement prompt elements
  const movementPromptBox = document.getElementById('movementPromptBox');
  const currentPrompt = document.getElementById('currentPrompt');
  const promptStep = document.getElementById('promptStep');
  const requiredFramesSpan = document.getElementById('requiredFrames');
  
  // Capture preview
  const capturePreview = document.getElementById('capturePreview');
  const thumbnailContainer = document.getElementById('thumbnailContainer');
  const frameCountSpan = document.getElementById('frameCount');
  const proceedBtn = document.getElementById('proceedToAnalysisBtn');
  
  // Analysis elements
  const analysisStatus = document.getElementById('analysisStatus');
  const progressBar = document.getElementById('analysisProgressBar');
  
  // Results elements
  const romResultsContent = document.getElementById('romResultsContent');
  const resultDate = document.getElementById('resultDate');
  const downloadRomReport = document.getElementById('downloadRomReport');
  const newScanBtn = document.getElementById('newScanBtn');
  
  // History drawer
  const historyDrawer = document.getElementById('historyDrawer');
  const toggleHistoryBtn = document.getElementById('toggleHistoryBtn');
  const closeDrawerBtn = document.getElementById('closeDrawerBtn');
  const historyList = document.getElementById('historyList');
  
  // Toast
  const toastContainer = document.getElementById('toast-container');

  // Create Capture Button (add dynamically)
  let captureFrameBtn = null;
  let captureBtnContainer = null;
  
  // =========================================================================
  // 2. MOVEMENT PROMPTS CONFIGURATION
  // =========================================================================
  const movementPrompts = {
    shoulder_flexion: {
      name: 'Shoulder Flexion',
      prompts: [
        'Position 1: Arm relaxed at side (starting position)',
        'Position 2: Raise arm forward to 90°',
        'Position 3: Continue to full flexion overhead',
        'Position 4: Hold at maximum range'
      ],
      requiredFrames: 4
    },
    shoulder_abduction: {
      name: 'Shoulder Abduction',
      prompts: [
        'Position 1: Arm at side (starting position)',
        'Position 2: Lift arm sideways to 90°',
        'Position 3: Continue to full abduction',
        'Position 4: Hold at maximum range'
      ],
      requiredFrames: 4
    },
    elbow_flexion: {
      name: 'Elbow Flexion',
      prompts: [
        'Position 1: Arm fully extended',
        'Position 2: Bend elbow to 90°',
        'Position 3: Continue to full flexion',
        'Position 4: Hold at maximum range'
      ],
      requiredFrames: 4
    },
    hip_flexion: {
      name: 'Hip Flexion',
      prompts: [
        'Position 1: Stand in neutral position',
        'Position 2: Lift knee toward chest',
        'Position 3: Continue to maximum flexion',
        'Position 4: Hold at maximum range'
      ],
      requiredFrames: 4
    },
    knee_flexion: {
      name: 'Knee Flexion',
      prompts: [
        'Position 1: Stand with leg straight',
        'Position 2: Bend knee to 90°',
        'Position 3: Continue to full flexion',
        'Position 4: Hold at maximum range'
      ],
      requiredFrames: 4
    },
    ankle_dorsiflexion: {
      name: 'Ankle Dorsiflexion',
      prompts: [
        'Position 1: Foot flat on ground',
        'Position 2: Lift toes up (dorsiflex)',
        'Position 3: Hold at maximum range'
      ],
      requiredFrames: 3
    },
    cervical_rotation: {
      name: 'Cervical Rotation',
      prompts: [
        'Position 1: Head in neutral position',
        'Position 2: Rotate head to the right',
        'Position 3: Return to center',
        'Position 4: Rotate head to the left',
        'Position 5: Return to center'
      ],
      requiredFrames: 5
    },
    lumbar_flexion: {
      name: 'Lumbar Flexion',
      prompts: [
        'Position 1: Stand upright',
        'Position 2: Bend forward slowly',
        'Position 3: Reach toward toes',
        'Position 4: Hold at maximum flexion'
      ],
      requiredFrames: 4
    }
  };
  
  // =========================================================================
  // 3. STATE VARIABLES
  // =========================================================================
  let stream = null;
  let capturedFrames = [];
  let aiConfig = { token: null, endpoint: null, model: 'openai/gpt-4.1' };
  let currentUser = null;
  let analysisResults = null;
  let currentMovement = null;
  let promptIndex = 0;
  let isCameraActive = false;
  
  const database = firebase.database();
  
  // =========================================================================
  // 4. UTILITY FUNCTIONS
  // =========================================================================
  function showToast(message, type = 'success', duration = 3500) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i><span>${message}</span>`;
    toastContainer.appendChild(toast);
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
  
  async function compressImage(dataUrl, maxSizeMB = 1) {
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
        while (result.length > maxSizeMB * 1024 * 1024 && quality > 0.3) {
          quality -= 0.1;
          result = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(result);
      };
      img.src = dataUrl;
    });
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
  // 5. STAGE MANAGEMENT
  // =========================================================================
  function setStage(stageNum) {
    [stageScan, stageAnalyze, stageResults].forEach(s => s.classList.remove('active'));
    if (stageNum === 1) stageScan.classList.add('active');
    else if (stageNum === 2) stageAnalyze.classList.add('active');
    else if (stageNum === 3) stageResults.classList.add('active');
    
    steps.forEach((step, idx) => {
      step.classList.remove('active', 'completed');
      if (idx < stageNum - 1) step.classList.add('completed');
      if (idx === stageNum - 1) step.classList.add('active');
    });
  }
  
  // =========================================================================
  // 6. JOINT SELECTION & PROMPTS
  // =========================================================================
  function updateForJointSelection(jointValue) {
    if (!jointValue) {
      startCameraBtn.disabled = true;
      movementPromptBox.style.display = 'none';
      movementInstruction.textContent = 'Select a joint to begin';
      requiredFramesSpan.textContent = '0';
      currentMovement = null;
      return;
    }
    
    startCameraBtn.disabled = false;
    currentMovement = movementPrompts[jointValue];
    requiredFramesSpan.textContent = currentMovement.requiredFrames;
    movementInstruction.textContent = `Prepare for ${currentMovement.name}`;
    movementPromptBox.style.display = 'flex';
    currentPrompt.textContent = currentMovement.prompts[0];
    promptStep.textContent = `0/${currentMovement.requiredFrames}`;
    promptIndex = 0;
    
    // Reset captured frames when changing joint
    capturedFrames = [];
    updateThumbnails();
    proceedBtn.disabled = true;
    
    // Update capture button text if it exists
    if (captureFrameBtn) {
      captureFrameBtn.disabled = !isCameraActive;
    }
  }
  
  jointSelect.addEventListener('change', (e) => {
    updateForJointSelection(e.target.value);
  });
  
  // =========================================================================
  // 7. CAMERA FUNCTIONS
  // =========================================================================
  function createCaptureButton() {
    // Remove existing button if any
    const existingContainer = document.querySelector('.capture-btn-container');
    if (existingContainer) existingContainer.remove();
    
    // Create container
    captureBtnContainer = document.createElement('div');
    captureBtnContainer.className = 'capture-btn-container';
    captureBtnContainer.style.cssText = 'display: none; justify-content: center; margin: 1rem 0;';
    
    // Create capture button
    captureFrameBtn = document.createElement('button');
    captureFrameBtn.id = 'captureFrameBtn';
    captureFrameBtn.className = 'btn-accent';
    captureFrameBtn.innerHTML = '<i class="fas fa-camera"></i> Capture Current Position';
    captureFrameBtn.style.cssText = 'padding: 1rem 2.5rem; font-size: 1.1rem;';
    
    captureFrameBtn.addEventListener('click', captureCurrentFrame);
    
    captureBtnContainer.appendChild(captureFrameBtn);
    
    // Insert after camera controls
    const cameraControls = document.querySelector('.camera-controls');
    cameraControls.insertAdjacentElement('afterend', captureBtnContainer);
  }
  
  function showCaptureButton() {
    if (captureBtnContainer) {
      captureBtnContainer.style.display = 'flex';
    }
  }
  
  function hideCaptureButton() {
    if (captureBtnContainer) {
      captureBtnContainer.style.display = 'none';
    }
  }
  
  async function startCamera() {
    if (!currentMovement) {
      showToast('Please select a joint first', 'warning');
      return;
    }
    
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
      
      // Show scanning line
      const scanOverlay = document.querySelector('.scan-overlay');
      if (scanOverlay) scanOverlay.style.display = 'block';
      
      // Hide start button
      startCameraBtn.style.display = 'none';
      
      // Show capture button
      showCaptureButton();
      
      isCameraActive = true;
      
      // Enable capture button
      if (captureFrameBtn) {
        captureFrameBtn.disabled = false;
        captureFrameBtn.innerHTML = '<i class="fas fa-camera"></i> Capture Current Position';
      }
      
      // Reset capture state for new session
      capturedFrames = [];
      promptIndex = 0;
      updateThumbnails();
      currentPrompt.textContent = currentMovement.prompts[0];
      promptStep.textContent = `0/${currentMovement.requiredFrames}`;
      proceedBtn.disabled = true;
      
      showToast('Camera ready - Position patient and capture each position', 'success');
      
    } catch (err) {
      console.error('Camera error:', err);
      showToast('Camera access denied or not available', 'error');
      startCameraBtn.style.display = 'block';
      hideCaptureButton();
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
    
    // Hide scanning line
    const scanOverlay = document.querySelector('.scan-overlay');
    if (scanOverlay) scanOverlay.style.display = 'none';
    
    isCameraActive = false;
    
    // Show start button
    startCameraBtn.style.display = 'block';
    startCameraBtn.disabled = !currentMovement;
    
    // Hide capture button
    hideCaptureButton();
  }
  
  function captureFrame() {
    if (!stream || !cameraPreview.videoWidth) return null;
    
    const canvas = document.createElement('canvas');
    canvas.width = cameraPreview.videoWidth;
    canvas.height = cameraPreview.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(cameraPreview, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.9);
  }
  
  // =========================================================================
  // 8. MANUAL FRAME CAPTURE
  // =========================================================================
  async function captureCurrentFrame() {
    if (!isCameraActive) {
      showToast('Camera is not active', 'error');
      return;
    }
    
    if (!currentMovement) {
      showToast('No movement selected', 'error');
      return;
    }
    
    if (capturedFrames.length >= currentMovement.requiredFrames) {
      showToast(`All ${currentMovement.requiredFrames} positions already captured`, 'warning');
      return;
    }
    
    // Capture frame
    const dataUrl = captureFrame();
    if (!dataUrl) {
      showToast('Failed to capture frame', 'error');
      return;
    }
    
    // Visual feedback
    if (captureFrameBtn) {
      captureFrameBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
      captureFrameBtn.disabled = true;
    }
    
    // Compress and save
    const compressed = await compressImage(dataUrl, 0.8);
    capturedFrames.push(compressed);
    updateThumbnails();
    
    // Haptic feedback if supported
    if (navigator.vibrate) navigator.vibrate(50);
    
    // Update prompt index
    promptIndex = capturedFrames.length;
    promptStep.textContent = `${promptIndex}/${currentMovement.requiredFrames}`;
    
    // Check if all frames captured
    if (capturedFrames.length >= currentMovement.requiredFrames) {
      // All frames captured
      currentPrompt.textContent = '✓ All positions captured!';
      movementPromptBox.style.borderLeftColor = '#10b981';
      
      showToast(`✅ All ${currentMovement.requiredFrames} positions captured! Ready for analysis.`, 'success');
      
      // Stop camera automatically
      stopCamera();
      
      // Enable proceed button
      proceedBtn.disabled = false;
      
      // Scroll to preview
      capturePreview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      
    } else {
      // Update prompt for next position
      currentPrompt.textContent = currentMovement.prompts[promptIndex];
      showToast(`Position ${promptIndex} captured! Next: ${currentMovement.prompts[promptIndex]}`, 'success');
      
      // Re-enable capture button with updated text
      if (captureFrameBtn) {
        captureFrameBtn.disabled = false;
        captureFrameBtn.innerHTML = '<i class="fas fa-camera"></i> Capture Next Position';
      }
    }
    
    // Reset border color after animation
    setTimeout(() => {
      movementPromptBox.style.borderLeftColor = 'var(--rom-accent)';
    }, 2000);
  }
  
  function updateThumbnails() {
    thumbnailContainer.innerHTML = '';
    capturedFrames.forEach((url, i) => {
      const wrapper = document.createElement('div');
      wrapper.style.position = 'relative';
      wrapper.style.display = 'inline-block';
      
      const img = document.createElement('img');
      img.src = url;
      img.className = 'thumbnail';
      img.alt = `Position ${i + 1}`;
      img.addEventListener('click', () => {
        window.open(url, '_blank');
      });
      
      // Add position label
      const label = document.createElement('span');
      label.textContent = `${i + 1}`;
      label.style.cssText = `
        position: absolute;
        top: -8px;
        right: -8px;
        background: var(--rom-accent);
        color: white;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: bold;
      `;
      
      wrapper.appendChild(img);
      wrapper.appendChild(label);
      thumbnailContainer.appendChild(wrapper);
    });
    
    frameCountSpan.textContent = capturedFrames.length;
    capturePreview.style.display = capturedFrames.length ? 'block' : 'none';
  }
  
  function resetCapture() {
    capturedFrames = [];
    updateThumbnails();
    proceedBtn.disabled = true;
    capturePreview.style.display = 'none';
    
    // Reset prompt index
    if (currentMovement) {
      promptIndex = 0;
      currentPrompt.textContent = currentMovement.prompts[0];
      promptStep.textContent = `0/${currentMovement.requiredFrames}`;
      movementPromptBox.style.borderLeftColor = 'var(--rom-accent)';
    }
    
    // Reset capture button
    if (captureFrameBtn) {
      captureFrameBtn.disabled = !isCameraActive;
      captureFrameBtn.innerHTML = '<i class="fas fa-camera"></i> Capture Current Position';
    }
  }
  
  // =========================================================================
  // 9. AI ANALYSIS
  // =========================================================================
  async function analyzeROM() {
    if (!aiConfig.token) {
      const success = await fetchTokens();
      if (!success) throw new Error('AI service unavailable. Please try again.');
    }
    
    const jointName = currentMovement.name;
    const movementDescription = currentMovement.prompts.join(' → ');
    
    const systemPrompt = `You are rehablix ROM Analyzer, a clinical AI specialized in range of motion assessment for rehabilitation professionals. 
Analyze the provided sequence of images showing a patient performing ${jointName}.

Provide a comprehensive clinical analysis including:
1. **Estimated Range of Motion** (in degrees) based on visual assessment of the movement sequence
2. **Movement Quality Observations** - note any compensations, asymmetries, or deviations
3. **Comparison to Normative Values** - typical ROM for this joint
4. **Clinical Recommendations** - suggested interventions or further assessments

Format your response with clear headings (## for sections), bullet points for observations, and professional clinical language. Do NOT use tables.`;
    
    const userContent = `Joint/Movement: ${jointName}
Movement Sequence: ${movementDescription}

The images show the progression from start position through full range of motion. Please analyze the patient's ROM and movement quality.`;
    
    const messages = [
      { role: "system", content: systemPrompt },
      { 
        role: "user", 
        content: [
          { type: "text", text: userContent },
          ...capturedFrames.map(url => ({ type: "image_url", image_url: { url } }))
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
      const jointName = currentMovement.name;
      const newRef = await database.ref(`users/${currentUser.uid}/analysisHistory`).push({
        contentType: 'rom',
        fileName: `ROM - ${jointName}`,
        documentType: 'ROM Analysis',
        request: `Analyze ${jointName} range of motion from ${capturedFrames.length} captured frames`,
        results: result,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        date: new Date().toLocaleDateString(),
        frameCount: capturedFrames.length
      });
      
      showToast('Analysis saved to history', 'info', 2000);
      return newRef.key;
    } catch (error) {
      console.error('Error saving to history:', error);
      return null;
    }
  }
  
  // =========================================================================
  // 10. HISTORY DRAWER
  // =========================================================================
  function loadRomHistory() {
    if (!currentUser) return;
    
    database.ref(`users/${currentUser.uid}/analysisHistory`)
      .orderByChild('timestamp')
      .on('value', (snapshot) => {
        historyList.innerHTML = '';
        const data = snapshot.val();
        
        if (!data) {
          historyList.innerHTML = '<div class="empty-state"><i class="bx bx-folder-open"></i><p>No ROM history found</p></div>';
          return;
        }
        
        const entries = Object.entries(data)
          .filter(([_, item]) => item.contentType === 'rom')
          .sort((a, b) => b[1].timestamp - a[1].timestamp);
        
        if (entries.length === 0) {
          historyList.innerHTML = '<div class="empty-state"><i class="bx bx-folder-open"></i><p>No ROM history found</p></div>';
          return;
        }
        
        entries.forEach(([key, item]) => {
          const div = document.createElement('div');
          div.className = 'history-item';
          div.innerHTML = `
            <div class="history-info">
              <span class="history-name">${escapeHtml(item.fileName || 'ROM Analysis')}</span>
              <div class="history-meta">
                <span class="meta-tag"><i class="bx bx-run"></i> ROM</span>
                <span>${escapeHtml(item.date)}</span>
                ${item.frameCount ? `<span>${item.frameCount} frames</span>` : ''}
              </div>
            </div>
            <button class="view-btn" data-key="${key}"><i class="bx bx-chevron-right"></i></button>
          `;
          
          div.querySelector('.view-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            analysisResults = item.results;
            romResultsContent.innerHTML = marked.parse(item.results);
            resultDate.textContent = item.date;
            setStage(3);
            historyDrawer.classList.remove('active');
            showToast('Analysis loaded from history', 'success');
          });
          
          div.addEventListener('click', () => {
            analysisResults = item.results;
            romResultsContent.innerHTML = marked.parse(item.results);
            resultDate.textContent = item.date;
            setStage(3);
            historyDrawer.classList.remove('active');
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
    loadRomHistory();
    historyDrawer.classList.add('active');
  }
  
  // =========================================================================
  // 11. EVENT LISTENERS
  // =========================================================================
  startCameraBtn.addEventListener('click', startCamera);
  
  proceedBtn.addEventListener('click', async () => {
    if (capturedFrames.length === 0) {
      showToast('No frames captured', 'error');
      return;
    }
    
    if (!currentUser) {
      showToast('Please login to analyze', 'error');
      const loginBtn = document.getElementById('loginBtn');
      if (loginBtn) loginBtn.click();
      return;
    }
    
    setStage(2);
    analysisStatus.textContent = 'Sending frames to AI...';
    progressBar.style.width = '25%';
    
    try {
      analysisStatus.textContent = 'Analyzing range of motion...';
      progressBar.style.width = '50%';
      
      const result = await analyzeROM();
      
      progressBar.style.width = '100%';
      analysisResults = result;
      
      await saveToHistory(result);
      
      romResultsContent.innerHTML = marked.parse(result);
      resultDate.textContent = new Date().toLocaleString();
      
      setStage(3);
      showToast('Analysis complete!', 'success');
      
    } catch (err) {
      console.error('Analysis error:', err);
      showToast('Analysis failed: ' + err.message, 'error');
      setStage(1);
    } finally {
      progressBar.style.width = '0%';
    }
  });
  
  newScanBtn.addEventListener('click', () => {
    resetCapture();
    setStage(1);
    
    if (currentMovement) {
      promptIndex = 0;
      currentPrompt.textContent = currentMovement.prompts[0];
      promptStep.textContent = `0/${currentMovement.requiredFrames}`;
      movementInstruction.textContent = `Prepare for ${currentMovement.name}`;
    }
    
    startCameraBtn.disabled = !currentMovement;
    startCameraBtn.style.display = 'block';
    hideCaptureButton();
  });
  
  downloadRomReport.addEventListener('click', async () => {
    if (!analysisResults) {
      showToast('No analysis results to export', 'warning');
      return;
    }
    
    downloadRomReport.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
    
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
              text: 'rehablix ROM Analysis Report',
              heading: HeadingLevel.TITLE
            }),
            new Paragraph({
              text: `Generated: ${new Date().toLocaleString()}`,
              spacing: { after: 300 }
            }),
            new Paragraph({
              text: `Movement: ${currentMovement?.name || 'ROM Analysis'}`,
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
      a.download = `ROM_Analysis_${Date.now()}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      
      showToast('Report exported successfully', 'success');
    } catch (err) {
      console.error('Export error:', err);
      showToast('Export failed', 'error');
    } finally {
      downloadRomReport.innerHTML = '<i class="fas fa-file-pdf"></i> Export Report';
    }
  });
  
  toggleHistoryBtn.addEventListener('click', toggleHistoryDrawer);
  
  closeDrawerBtn.addEventListener('click', () => {
    historyDrawer.classList.remove('active');
  });
  
  document.addEventListener('click', (e) => {
    if (historyDrawer.classList.contains('active') &&
        !historyDrawer.contains(e.target) &&
        e.target !== toggleHistoryBtn &&
        !toggleHistoryBtn.contains(e.target)) {
      historyDrawer.classList.remove('active');
    }
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && historyDrawer.classList.contains('active')) {
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
      loadRomHistory();
    } else {
      console.log('User logged out');
    }
  });
  
  // =========================================================================
  // 14. INITIAL SETUP
  // =========================================================================
  fetchTokens();
  setStage(1);
  updateForJointSelection('');
  resetCapture();
  createCaptureButton();
  
  // Ensure start button is visible initially
  startCameraBtn.style.display = 'block';
  
  // Ensure scanning line is hidden initially
  const scanOverlay = document.querySelector('.scan-overlay');
  if (scanOverlay) {
    scanOverlay.style.display = 'none';
  }
  
  window.addEventListener('beforeunload', () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }
  });
  
  console.log('ROM Analyzer initialized - Manual capture mode');
});