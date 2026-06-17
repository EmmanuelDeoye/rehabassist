// js/rom.js – Enhanced ROM Analyzer with Video Recording, Review Stage, Fullscreen, and Plan Limits
document.addEventListener('DOMContentLoaded', async () => {

  // =========================================================================
  // 1. DOM ELEMENTS
  // =========================================================================
  const stageScan = document.getElementById('stageScan');
  const stageReview = document.getElementById('stageReview');
  const stageAnalyze = document.getElementById('stageAnalyze');
  const stageResults = document.getElementById('stageResults');
  const steps = document.querySelectorAll('.step');
  
  const cameraView = document.getElementById('cameraView');
  const cameraPreview = document.getElementById('cameraPreview');
  const cameraPlaceholder = document.getElementById('cameraPlaceholder');
  const cameraControlsOutside = document.getElementById('cameraControlsOutside');
  const startCameraBtn = document.getElementById('startCameraBtn');
  const stopCameraBtn = document.getElementById('stopCameraBtn');
  const toggleScanFxBtn = document.getElementById('toggleScanFxBtn');
  const expandCameraBtn = document.getElementById('expandCameraBtn');
  const scanOverlay = document.getElementById('scanOverlay');
  const recordingIndicator = document.getElementById('recordingIndicator');
  const recordingTime = document.getElementById('recordingTime');
  const jointSelect = document.getElementById('jointSelect');
  const movementInstruction = document.getElementById('movementInstruction');
  
  const movementPromptBox = document.getElementById('movementPromptBox');
  const currentPrompt = document.getElementById('currentPrompt');
  const promptStep = document.getElementById('promptStep');
  const requiredFramesSpan = document.getElementById('requiredFrames');
  
  const captureBtnContainer = document.getElementById('captureBtnContainer');
  const captureFrameBtn = document.getElementById('captureFrameBtn');
  const recordVideoBtn = document.getElementById('recordVideoBtn');
  const undoFrameBtn = document.getElementById('undoFrameBtn');
  
  const capturePreview = document.getElementById('capturePreview');
  const thumbnailContainer = document.getElementById('thumbnailContainer');
  const frameCountSpan = document.getElementById('frameCount');
  const proceedBtn = document.getElementById('proceedToAnalysisBtn');
  
  const queueNavigation = document.getElementById('queueNavigation');
  const prevMovementBtn = document.getElementById('prevMovementBtn');
  const nextMovementBtn = document.getElementById('nextMovementBtn');
  const queueDots = document.getElementById('queueDots');
  const queueMovementName = document.getElementById('queueMovementName');
  
  const reviewFramesContainer = document.getElementById('reviewFrames');
  const reviewVideo = document.getElementById('reviewVideo');
  const timelineSlider = document.getElementById('timelineSlider');
  const scrubberMarkers = document.getElementById('scrubberMarkers');
  const playPauseBtn = document.getElementById('playPauseBtn');
  const timelineTime = document.getElementById('timelineTime');
  const retakeVideoBtn = document.getElementById('retakeVideoBtn');
  const confirmReviewBtn = document.getElementById('confirmReviewBtn');
  const manualCaptureBtn = document.getElementById('manualCaptureBtn');
  const reviewInstruction = document.getElementById('reviewInstruction');
  
  const analysisStatus = document.getElementById('analysisStatus');
  const progressBar = document.getElementById('analysisProgressBar');
  const analysisSteps = document.getElementById('analysisSteps');
  
  const romResultsContent = document.getElementById('romResultsContent');
  const resultDate = document.getElementById('resultDate');
  const downloadRomReport = document.getElementById('downloadRomReport');
  const copyResultsBtn = document.getElementById('copyResultsBtn');
  const newScanBtn = document.getElementById('newScanBtn');
  
  const historyDrawer = document.getElementById('historyDrawer');
  const toggleHistoryBtn = document.getElementById('toggleHistoryBtn');
  const closeDrawerBtn = document.getElementById('closeDrawerBtn');
  const historyList = document.getElementById('historyList');
  const historySearchInput = document.getElementById('historySearchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  
  const usageGauge = document.getElementById('usageGauge');
  const gaugeLabel = document.getElementById('gaugeLabel');
  const gaugeFill = document.getElementById('gaugeFill');
  const gaugeRemaining = document.getElementById('gaugeRemaining');
  
  const limitModal = document.getElementById('limitModal');
  const limitMessage = document.getElementById('limitMessage');
  const limitDetails = document.getElementById('limitDetails');
  const upgradeFromLimitBtn = document.getElementById('upgradeFromLimitBtn');
  const closeLimitModalBtn = document.getElementById('closeLimitModal');
  
  const onboardingTooltip = document.getElementById('onboardingTooltip');
  const tooltipText = document.getElementById('tooltipText');
  const tooltipDots = document.getElementById('tooltipDots');
  const tooltipNext = document.getElementById('tooltipNext');
  const tooltipSkip = document.getElementById('tooltipSkip');
  
  const toastContainer = document.getElementById('toast-container');
  
  const radioIsolate = document.querySelector('input[value="isolate"]');
  const radioFull = document.querySelector('input[value="full"]');
  
  const database = firebase.database();

  // =========================================================================
  // 2. MOVEMENT PROMPTS & JOINT GROUPS
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
    shoulder_extension: { 
      name: 'Shoulder Extension', 
      prompts: [
        'Position 1: Arm at side',
        'Position 2: Extend arm backward',
        'Position 3: Hold at maximum extension'
      ], 
      requiredFrames: 3 
    },
    shoulder_abduction: { 
      name: 'Shoulder Abduction', 
      prompts: [
        'Position 1: Arm at side',
        'Position 2: Lift arm sideways to 90°',
        'Position 3: Continue to full abduction',
        'Position 4: Hold at maximum range'
      ], 
      requiredFrames: 4 
    },
    shoulder_adduction: { 
      name: 'Shoulder Adduction', 
      prompts: [
        'Position 1: Arm abducted to 90°',
        'Position 2: Bring arm across body toward midline',
        'Position 3: Hold at maximum adduction'
      ], 
      requiredFrames: 3 
    },
    shoulder_internal_rotation: { 
      name: 'Shoulder Internal Rotation', 
      prompts: [
        'Position 1: Arm at side, elbow flexed 90°',
        'Position 2: Rotate forearm inward toward abdomen',
        'Position 3: Hold at maximum internal rotation'
      ], 
      requiredFrames: 3 
    },
    shoulder_external_rotation: { 
      name: 'Shoulder External Rotation', 
      prompts: [
        'Position 1: Arm at side, elbow flexed 90°',
        'Position 2: Rotate forearm outward away from body',
        'Position 3: Hold at maximum external rotation'
      ], 
      requiredFrames: 3 
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
    elbow_extension: { 
      name: 'Elbow Extension', 
      prompts: [
        'Position 1: Elbow fully flexed',
        'Position 2: Straighten arm to neutral',
        'Position 3: Extend as far as possible (if hyperextension)',
        'Position 4: Hold at end range'
      ], 
      requiredFrames: 4 
    },
    wrist_flexion: { 
      name: 'Wrist Flexion', 
      prompts: [
        'Position 1: Wrist neutral, forearm supported',
        'Position 2: Bend wrist downward (palm toward forearm)',
        'Position 3: Hold at maximum flexion'
      ], 
      requiredFrames: 3 
    },
    wrist_extension: { 
      name: 'Wrist Extension', 
      prompts: [
        'Position 1: Wrist neutral',
        'Position 2: Bend wrist upward (back of hand toward forearm)',
        'Position 3: Hold at maximum extension'
      ], 
      requiredFrames: 3 
    },
    wrist_radial_deviation: { 
      name: 'Wrist Radial Deviation', 
      prompts: [
        'Position 1: Wrist neutral',
        'Position 2: Tilt hand toward thumb side',
        'Position 3: Hold at maximum radial deviation'
      ], 
      requiredFrames: 3 
    },
    wrist_ulnar_deviation: { 
      name: 'Wrist Ulnar Deviation', 
      prompts: [
        'Position 1: Wrist neutral',
        'Position 2: Tilt hand toward little finger side',
        'Position 3: Hold at maximum ulnar deviation'
      ], 
      requiredFrames: 3 
    },
    finger_flexion: { 
      name: 'Finger Flexion', 
      prompts: [
        'Position 1: Fingers fully extended',
        'Position 2: Make a fist (flex MCP, PIP, DIP)',
        'Position 3: Hold full flexion'
      ], 
      requiredFrames: 3 
    },
    finger_extension: { 
      name: 'Finger Extension', 
      prompts: [
        'Position 1: Fingers relaxed in flexion',
        'Position 2: Extend all fingers straight',
        'Position 3: Hold full extension'
      ], 
      requiredFrames: 3 
    },
    thumb_abduction: { 
      name: 'Thumb Abduction', 
      prompts: [
        'Position 1: Thumb against index finger',
        'Position 2: Move thumb away from palm (hitchhiker position)',
        'Position 3: Hold maximum abduction'
      ], 
      requiredFrames: 3 
    },
    thumb_opposition: { 
      name: 'Thumb Opposition', 
      prompts: [
        'Position 1: Hand open, thumb extended',
        'Position 2: Touch thumb tip to little finger base',
        'Position 3: Hold opposition position'
      ], 
      requiredFrames: 3 
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
    hip_extension: { 
      name: 'Hip Extension', 
      prompts: [
        'Position 1: Stand upright',
        'Position 2: Extend leg backward without arching back',
        'Position 3: Hold at maximum extension'
      ], 
      requiredFrames: 3 
    },
    hip_abduction: { 
      name: 'Hip Abduction', 
      prompts: [
        'Position 1: Stand with feet together',
        'Position 2: Lift leg out to side',
        'Position 3: Hold at maximum abduction'
      ], 
      requiredFrames: 3 
    },
    hip_adduction: { 
      name: 'Hip Adduction', 
      prompts: [
        'Position 1: Leg abducted',
        'Position 2: Bring leg back toward midline',
        'Position 3: Cross midline if possible'
      ], 
      requiredFrames: 3 
    },
    hip_internal_rotation: { 
      name: 'Hip Internal Rotation', 
      prompts: [
        'Position 1: Seated, knee flexed 90°',
        'Position 2: Rotate lower leg outward (foot moves inward)',
        'Position 3: Hold maximum internal rotation'
      ], 
      requiredFrames: 3 
    },
    hip_external_rotation: { 
      name: 'Hip External Rotation', 
      prompts: [
        'Position 1: Seated, knee flexed 90°',
        'Position 2: Rotate lower leg inward (foot moves outward)',
        'Position 3: Hold maximum external rotation'
      ], 
      requiredFrames: 3 
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
    knee_extension: { 
      name: 'Knee Extension', 
      prompts: [
        'Position 1: Knee flexed (seated)',
        'Position 2: Straighten leg to neutral',
        'Position 3: Extend to full available range',
        'Position 4: Hold end range'
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
    ankle_plantarflexion: { 
      name: 'Ankle Plantarflexion', 
      prompts: [
        'Position 1: Foot flat',
        'Position 2: Point toes downward',
        'Position 3: Hold maximum plantarflexion'
      ], 
      requiredFrames: 3 
    },
    cervical_flexion: { 
      name: 'Cervical Flexion', 
      prompts: [
        'Position 1: Head neutral',
        'Position 2: Tuck chin to chest',
        'Position 3: Hold maximum flexion'
      ], 
      requiredFrames: 3 
    },
    cervical_extension: { 
      name: 'Cervical Extension', 
      prompts: [
        'Position 1: Head neutral',
        'Position 2: Look upward, extend neck',
        'Position 3: Hold maximum extension'
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
    cervical_lateral_flexion: { 
      name: 'Cervical Lateral Flexion', 
      prompts: [
        'Position 1: Head neutral',
        'Position 2: Tilt ear toward right shoulder',
        'Position 3: Return to center',
        'Position 4: Tilt ear toward left shoulder',
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
    },
    lumbar_extension: { 
      name: 'Lumbar Extension', 
      prompts: [
        'Position 1: Stand upright',
        'Position 2: Lean backward, support hips',
        'Position 3: Hold maximum extension'
      ], 
      requiredFrames: 3 
    },
    lumbar_lateral_flexion: { 
      name: 'Lumbar Lateral Flexion', 
      prompts: [
        'Position 1: Stand upright',
        'Position 2: Slide hand down right thigh, bend sideways',
        'Position 3: Return to center',
        'Position 4: Repeat on left side'
      ], 
      requiredFrames: 4 
    }
  };

  const jointGroups = {
    shoulder: ['shoulder_flexion', 'shoulder_extension', 'shoulder_abduction', 'shoulder_adduction', 'shoulder_internal_rotation', 'shoulder_external_rotation'],
    elbow: ['elbow_flexion', 'elbow_extension'],
    wrist: ['wrist_flexion', 'wrist_extension', 'wrist_radial_deviation', 'wrist_ulnar_deviation'],
    hand: ['finger_flexion', 'finger_extension', 'thumb_abduction', 'thumb_opposition'],
    hip: ['hip_flexion', 'hip_extension', 'hip_abduction', 'hip_adduction', 'hip_internal_rotation', 'hip_external_rotation'],
    knee: ['knee_flexion', 'knee_extension'],
    ankle: ['ankle_dorsiflexion', 'ankle_plantarflexion'],
    cervical: ['cervical_flexion', 'cervical_extension', 'cervical_rotation', 'cervical_lateral_flexion'],
    lumbar: ['lumbar_flexion', 'lumbar_extension', 'lumbar_lateral_flexion']
  };

  // =========================================================================
  // 3. ONBOARDING STEPS
  // =========================================================================
  const onboardingSteps = [
    {
      target: '.assessment-mode',
      text: 'Choose Isolate Joint for single movement analysis or Full Assessment for complete joint evaluation.',
      position: 'bottom'
    },
    {
      target: '.capture-mode-toggle',
      text: 'Photo mode captures individual frames. Video mode records motion and auto-extracts key positions.',
      position: 'bottom'
    },
    {
      target: '.joint-selection',
      text: 'Select the joint or movement you want to analyze from the dropdown.',
      position: 'bottom'
    },
    {
      target: '#cameraView',
      text: 'Start the camera here. Use the expand button (bottom-right) to go fullscreen while recording.',
      position: 'top'
    }
  ];
  let currentOnboardingStep = 0;

  // =========================================================================
  // 4. STATE VARIABLES
  // =========================================================================
  let stream = null;
  let capturedFrames = [];
  let aiConfig = { token: null, endpoint: null, model: 'openai/gpt-4.1' };
  let currentUser = null;
  let analysisResults = null;
  let currentMovement = null;
  let promptIndex = 0;
  let isCameraActive = false;
  
  let assessmentMode = 'isolate';
  let captureMode = 'photo';
  let movementQueue = [];
  let currentQueueIndex = 0;
  let allCapturedFrames = {};

  let mediaRecorder = null;
  let recordedChunks = [];
  let videoBlob = null;
  let reviewFrames = [];
  let isRecording = false;
  let recordingTimer = null;
  let recordingDuration = 0;
  let selectedReviewFrameIndex = -1;
  let isScanFxVisible = true;
  let isCameraFullscreen = false;

  let currentPlan = 'free';
  let generationCount = 0;
  let generationResetDate = null;
  const FREE_LIMIT = 3;
  const STUDENT_LIMIT = 10;
  const LIMIT_DAYS = 30;

  // =========================================================================
  // 5. UTILITY FUNCTIONS
  // =========================================================================
  function showToast(message, type = 'success', duration = 3500) {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = {
      success: 'check-circle',
      error: 'exclamation-circle',
      warning: 'exclamation-triangle',
      info: 'info-circle'
    };
    toast.innerHTML = `<i class="fas fa-${icons[type] || icons.info}"></i><span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  async function fetchTokens() {
    try {
      const snapshot = await database.ref('tokens/openAI').once('value');
      const data = snapshot.val();
      if (data && data.openai_token && data.github_endpoint) {
        aiConfig.token = data.openai_token;
        aiConfig.endpoint = data.github_endpoint;
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
  
  function setStage(stageNum) {
    [stageScan, stageReview, stageAnalyze, stageResults].forEach(s => {
      if (s) s.classList.remove('active');
    });
    
    if (stageNum === 1) stageScan.classList.add('active');
    else if (stageNum === 2) stageReview.classList.add('active');
    else if (stageNum === 3) stageAnalyze.classList.add('active');
    else if (stageNum === 4) stageResults.classList.add('active');
    
    steps.forEach((step, idx) => {
      step.classList.remove('active', 'completed');
      if (idx < stageNum - 1) step.classList.add('completed');
      if (idx === stageNum - 1) step.classList.add('active');
    });
    
    const activeStage = document.querySelector('.stage-container.active');
    if (activeStage) {
      setTimeout(() => {
        activeStage.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }

  // =========================================================================
  // 6. IMAGE BRIGHTNESS CHECK
  // =========================================================================
  function checkImageBrightness(dataUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          let totalBrightness = 0;
          let pixelCount = 0;
          
          for (let i = 0; i < data.length; i += 16) {
            const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            totalBrightness += brightness;
            pixelCount++;
          }
          
          const avgBrightness = totalBrightness / pixelCount;
          resolve(avgBrightness);
        } catch (e) {
          resolve(128);
        }
      };
      img.onerror = () => resolve(128);
      img.src = dataUrl;
    });
  }

  async function validateImageQuality(frames) {
    if (!frames || frames.length === 0) return { valid: false, reason: 'No frames to analyze' };
    
    let darkFrames = 0;
    const DARKNESS_THRESHOLD = 40;
    
    for (let frame of frames) {
      const brightness = await checkImageBrightness(frame);
      if (brightness < DARKNESS_THRESHOLD) darkFrames++;
    }
    
    const darkPercentage = (darkFrames / frames.length) * 100;
    
    if (darkPercentage > 50) {
      return { valid: false, reason: `Images appear too dark (${Math.round(darkPercentage)}% of frames). Please ensure proper lighting.`, warning: true };
    }
    
    if (darkPercentage > 25) {
      return { valid: true, warning: true, reason: `Some images are dark. Consider improving lighting for better accuracy.` };
    }
    
    return { valid: true, warning: false };
  }

  // =========================================================================
  // 7. GENERATION TRACKING & PLAN LIMITS
  // =========================================================================
  function loadGenerationData() {
    try {
      const data = JSON.parse(localStorage.getItem('rehab_rom_gen_data') || '{}');
      generationCount = data.count || 0;
      generationResetDate = data.resetDate ? new Date(data.resetDate) : null;
      
      const now = new Date();
      if (!generationResetDate || (now - generationResetDate) >= (LIMIT_DAYS * 24 * 60 * 60 * 1000)) {
        generationCount = 0;
        generationResetDate = now;
        saveGenerationData();
      }
    } catch (e) {
      generationCount = 0;
      generationResetDate = new Date();
      saveGenerationData();
    }
  }

  function saveGenerationData() {
    const data = {
      count: generationCount,
      resetDate: generationResetDate ? generationResetDate.toISOString() : new Date().toISOString()
    };
    localStorage.setItem('rehab_rom_gen_data', JSON.stringify(data));
  }

  function getMonthlyLimit() {
    if (currentPlan === 'pro') return Infinity;
    if (currentPlan === 'student') return STUDENT_LIMIT;
    return FREE_LIMIT;
  }

  function canGenerateMore() {
    if (currentPlan === 'pro') return true;
    const limit = getMonthlyLimit();
    const now = new Date();
    
    if (!generationResetDate || (now - generationResetDate) >= (LIMIT_DAYS * 24 * 60 * 60 * 1000)) {
      generationCount = 0;
      generationResetDate = now;
      saveGenerationData();
      return true;
    }
    return generationCount < limit;
  }

  function getRemaining() {
    if (currentPlan === 'pro') return Infinity;
    return Math.max(0, getMonthlyLimit() - generationCount);
  }

  function getDaysUntilReset() {
    if (!generationResetDate) return 0;
    const now = new Date();
    const diffTime = (LIMIT_DAYS * 24 * 60 * 60 * 1000) - (now - generationResetDate);
    return Math.max(0, Math.ceil(diffTime / (24 * 60 * 60 * 1000)));
  }

  function incrementGenerationCount() {
    if (currentPlan === 'pro') return;
    generationCount++;
    saveGenerationData();
    updateUsageGauge();
  }

  function canUseIsolateMode() {
    return currentPlan === 'student' || currentPlan === 'pro';
  }

  function goToSubscription() {
    window.open('sub.html', '_blank');
  }

  function updateUsageGauge() {
    if (!usageGauge) return;
    
    if (currentPlan === 'pro') {
      usageGauge.style.display = 'none';
      return;
    }
    
    usageGauge.style.display = 'flex';
    const remaining = getRemaining();
    const limit = getMonthlyLimit();
    const used = limit - remaining;
    const percentage = Math.min(100, (used / limit) * 100);
    
    gaugeLabel.textContent = `${used}/${limit} analyses this month`;
    gaugeFill.style.width = `${percentage}%`;
    
    if (remaining === 0) {
      gaugeRemaining.textContent = 'Limit reached';
      gaugeRemaining.style.color = '#dc2626';
      gaugeFill.style.background = 'linear-gradient(90deg, #f59e0b, #dc2626)';
    } else {
      gaugeRemaining.textContent = `${remaining} remaining`;
      gaugeRemaining.style.color = 'var(--text-secondary)';
      gaugeFill.style.background = 'linear-gradient(90deg, var(--rom-accent), #00b8a9)';
    }
  }

  function showLimitModal() {
    if (!limitModal) return;
    const daysLeft = getDaysUntilReset();
    const limit = getMonthlyLimit();
    
    limitMessage.textContent = `You've used all ${limit} analyses for this month.`;
    limitDetails.textContent = `Resets in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Upgrade to Pro for unlimited analyses.`;
    limitModal.style.display = 'flex';
  }

  function hideLimitModal() {
    if (limitModal) limitModal.style.display = 'none';
  }

  function updatePlanUI() {
    if (radioIsolate && radioFull) {
      if (!canUseIsolateMode()) {
        radioIsolate.disabled = true;
        radioIsolate.parentElement.style.opacity = '0.5';
        radioIsolate.parentElement.style.cursor = 'not-allowed';
        radioIsolate.parentElement.title = 'Student plan or above required for Isolate Joint mode';
        
        let badge = radioIsolate.parentElement.querySelector('.plan-badge');
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'plan-badge';
          badge.textContent = 'STUDENT+';
          badge.style.cssText = `
            background: linear-gradient(135deg, #0ea5e9, #0284c7);
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.65rem;
            font-weight: 700;
            margin-left: 6px;
            vertical-align: middle;
          `;
          radioIsolate.parentElement.appendChild(badge);
        }
        
        if (radioIsolate.checked) {
          radioFull.checked = true;
          assessmentMode = 'full';
          populateJointSelect('full');
          jointSelect.value = '';
          startCameraBtn.disabled = true;
          movementPromptBox.style.display = 'none';
        }
      } else {
        radioIsolate.disabled = false;
        radioIsolate.parentElement.style.opacity = '1';
        radioIsolate.parentElement.style.cursor = 'pointer';
        radioIsolate.parentElement.title = '';
        
        const badge = radioIsolate.parentElement.querySelector('.plan-badge');
        if (badge) badge.remove();
      }
    }

    updateUsageGauge();

    const existingNotice = document.getElementById('planNoticeRom');
    if (existingNotice) existingNotice.remove();

    if (currentPlan === 'pro') return;

    const notice = document.createElement('div');
    notice.id = 'planNoticeRom';
    
    const remaining = getRemaining();
    const limit = getMonthlyLimit();
    const daysLeft = getDaysUntilReset();
    const isFree = currentPlan === 'free';
    
    notice.style.cssText = `
      background: ${isFree ? '#fef3c7' : '#e0f2fe'};
      border: 2px solid ${isFree ? '#fbbf24' : '#38bdf8'};
      border-radius: 1rem;
      padding: 0.9rem 1.1rem;
      margin: 1rem 0;
      font-size: 0.85rem;
      text-align: center;
      color: ${isFree ? '#92400e' : '#075985'};
      animation: fadeSlideDown 0.4s ease;
    `;

    const planLabel = isFree ? 'Free Plan' : 'Student Plan';
    
    notice.innerHTML = `
      <div style="font-weight: 600; font-size: 0.95rem; margin-bottom: 0.3rem;">${planLabel}</div>
      <div style="margin-bottom: 0.3rem;">
        <strong>${remaining === Infinity ? 'Unlimited' : remaining}</strong> analyses remaining · <strong>${limit}</strong>/month
      </div>
      ${remaining <= 0 ? `<div style="color: #dc2626; font-size: 0.8rem; margin-bottom: 0.4rem;">Resets in <strong>${daysLeft}</strong> days</div>` : ''}
      <button id="upgradeRomBtn" style="
        margin-top: 0.5rem;
        padding: 0.5rem 1.5rem;
        border-radius: 2rem;
        background: linear-gradient(135deg, #f59e0b, #d97706);
        color: white;
        border: none;
        cursor: pointer;
        font-weight: 600;
        font-size: 0.85rem;
        transition: all 0.2s ease;
        font-family: inherit;
      " onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(245,158,11,0.4)';"
         onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='none';">
        ⚡ Upgrade Now
      </button>
    `;

    const assessmentDiv = document.querySelector('.assessment-mode');
    if (assessmentDiv) {
      assessmentDiv.insertAdjacentElement('afterend', notice);
    }

    const upgradeBtn = document.getElementById('upgradeRomBtn');
    if (upgradeBtn) upgradeBtn.addEventListener('click', goToSubscription);
  }

  function populateJointSelect(mode) {
    jointSelect.innerHTML = '<option value="">-- Choose ' + (mode === 'isolate' ? 'movement' : 'joint region') + ' --</option>';
    
    if (mode === 'isolate') {
      const groups = {
        Shoulder: ['shoulder_flexion', 'shoulder_extension', 'shoulder_abduction', 'shoulder_adduction', 'shoulder_internal_rotation', 'shoulder_external_rotation'],
        Elbow: ['elbow_flexion', 'elbow_extension'],
        Wrist: ['wrist_flexion', 'wrist_extension', 'wrist_radial_deviation', 'wrist_ulnar_deviation'],
        'Hand/Fingers': ['finger_flexion', 'finger_extension', 'thumb_abduction', 'thumb_opposition'],
        Hip: ['hip_flexion', 'hip_extension', 'hip_abduction', 'hip_adduction', 'hip_internal_rotation', 'hip_external_rotation'],
        Knee: ['knee_flexion', 'knee_extension'],
        Ankle: ['ankle_dorsiflexion', 'ankle_plantarflexion'],
        Cervical: ['cervical_flexion', 'cervical_extension', 'cervical_rotation', 'cervical_lateral_flexion'],
        Lumbar: ['lumbar_flexion', 'lumbar_extension', 'lumbar_lateral_flexion']
      };
      for (const [groupName, keys] of Object.entries(groups)) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = groupName;
        keys.forEach(key => {
          const opt = document.createElement('option');
          opt.value = key;
          opt.textContent = movementPrompts[key].name;
          optgroup.appendChild(opt);
        });
        jointSelect.appendChild(optgroup);
      }
    } else {
      const groups = [
        { label: 'Shoulder Complex', value: 'shoulder' },
        { label: 'Elbow', value: 'elbow' },
        { label: 'Wrist', value: 'wrist' },
        { label: 'Hand & Fingers', value: 'hand' },
        { label: 'Hip Complex', value: 'hip' },
        { label: 'Knee', value: 'knee' },
        { label: 'Ankle', value: 'ankle' },
        { label: 'Cervical Spine', value: 'cervical' },
        { label: 'Lumbar Spine', value: 'lumbar' }
      ];
      groups.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g.value;
        opt.textContent = g.label;
        jointSelect.appendChild(opt);
      });
    }
  }

  function onModeChange() {
    const newMode = document.querySelector('input[name="assessmentMode"]:checked').value;
    
    if (newMode === 'isolate' && !canUseIsolateMode()) {
      showToast('🎓 Isolate Joint mode requires Student plan or above. Switching to Full Joint Assessment.', 'warning', 5000);
      radioFull.checked = true;
      return;
    }
    
    assessmentMode = newMode;
    populateJointSelect(assessmentMode);
    jointSelect.value = '';
    startCameraBtn.disabled = true;
    movementPromptBox.style.display = 'none';
    queueNavigation.style.display = 'none';
    movementInstruction.textContent = assessmentMode === 'isolate' ? 'Select a movement to begin' : 'Select a joint region for full assessment';
    resetCapture();
  }
  
  if (radioIsolate) radioIsolate.addEventListener('change', onModeChange);
  if (radioFull) radioFull.addEventListener('change', onModeChange);
  
  document.querySelectorAll('.capture-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      captureMode = btn.dataset.mode;
      document.querySelectorAll('.capture-mode-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      updateCaptureUI();
      
      if (captureMode === 'video') {
        showToast('📹 Video mode: Record movement and AI will extract key frames', 'info', 3000);
      }
    });
  });

  function updateCaptureUI() {
    if (captureMode === 'photo') {
      captureFrameBtn.style.display = 'inline-flex';
      recordVideoBtn.style.display = 'none';
      if (proceedBtn) proceedBtn.style.display = 'block';
    } else {
      captureFrameBtn.style.display = 'none';
      recordVideoBtn.style.display = 'inline-flex';
      if (proceedBtn) proceedBtn.style.display = 'none';
    }

    if (isCameraActive) {
      captureBtnContainer.style.display = 'flex';
    } else {
      captureBtnContainer.style.display = 'none';
    }
    
    undoFrameBtn.disabled = capturedFrames.length === 0;
  }
  
  // =========================================================================
  // FULLSCREEN CAMERA TOGGLE
  // =========================================================================
  if (expandCameraBtn) {
    expandCameraBtn.addEventListener('click', toggleCameraFullscreen);
  }

  function toggleCameraFullscreen() {
    isCameraFullscreen = !isCameraFullscreen;
    
    if (cameraView) {
      cameraView.classList.toggle('fullscreen', isCameraFullscreen);
    }
    
    if (expandCameraBtn) {
      expandCameraBtn.innerHTML = isCameraFullscreen ? '<i class="fas fa-compress"></i>' : '<i class="fas fa-expand"></i>';
      expandCameraBtn.title = isCameraFullscreen ? 'Exit fullscreen' : 'Enter fullscreen';
      expandCameraBtn.setAttribute('aria-label', isCameraFullscreen ? 'Exit fullscreen' : 'Enter fullscreen');
    }
    
    if (isCameraFullscreen) {
      document.body.classList.add('camera-fullscreen-active');
      moveControlsToFullscreen();
    } else {
      document.body.classList.remove('camera-fullscreen-active');
      moveControlsOutside();
    }
    
    updateCaptureUI();
  }

  function moveControlsToFullscreen() {
    // Remove existing floating controls if any
    const existingFloating = document.getElementById('floatingControls');
    if (existingFloating) existingFloating.remove();
    
    // Create floating controls container
    const floatingControls = document.createElement('div');
    floatingControls.className = 'camera-fullscreen-controls';
    floatingControls.id = 'floatingControls';
    
    if (isCameraActive) {
      // 1. Scan toggle button (LEFT)
      const scanClone = document.createElement('button');
      scanClone.className = 'icon-btn-sm';
      scanClone.innerHTML = isScanFxVisible ? '<i class="fas fa-magic"></i>' : '<i class="fas fa-magic" style="opacity:0.5;"></i>';
      scanClone.title = isScanFxVisible ? 'Hide scan effect' : 'Show scan effect';
      scanClone.addEventListener('click', () => {
        isScanFxVisible = !isScanFxVisible;
        if (scanOverlay) {
          scanOverlay.style.display = isScanFxVisible ? 'block' : 'none';
        }
        scanClone.innerHTML = isScanFxVisible ? '<i class="fas fa-magic"></i>' : '<i class="fas fa-magic" style="opacity:0.5;"></i>';
      });
      floatingControls.appendChild(scanClone);
      
      // 2. Record/Capture button (CENTER)
      if (captureMode === 'photo') {
        const captureClone = document.createElement('button');
        captureClone.className = 'btn-accent';
        captureClone.innerHTML = '<i class="fas fa-camera"></i> Capture';
        captureClone.addEventListener('click', captureCurrentFrame);
        floatingControls.appendChild(captureClone);
      } else {
        const recordClone = document.createElement('button');
        recordClone.className = 'btn-record';
        recordClone.innerHTML = '<i class="fas fa-circle"></i>';
        if (isRecording) {
          recordClone.classList.add('recording');
          recordClone.innerHTML = '<i class="fas fa-stop"></i>';
        }
        recordClone.addEventListener('click', () => {
          if (!isRecording) {
            startRecording();
            recordClone.classList.add('recording');
            recordClone.innerHTML = '<i class="fas fa-stop"></i>';
          } else {
            stopRecording();
            recordClone.classList.remove('recording');
            recordClone.innerHTML = '<i class="fas fa-circle"></i>';
          }
        });
        floatingControls.appendChild(recordClone);
      }
      
      // 3. Stop button (RIGHT) - icon only
      const stopClone = document.createElement('button');
      stopClone.className = 'btn-secondary';
      stopClone.innerHTML = '<i class="fas fa-stop"></i>';
      stopClone.title = 'Stop Camera';
      stopClone.addEventListener('click', () => {
        if (isRecording) {
          if (confirm('Stop recording and discard?')) {
            stopRecording();
            stopCamera();
          }
        } else {
          stopCamera();
        }
      });
      floatingControls.appendChild(stopClone);
    }
    
    document.body.appendChild(floatingControls);
  }

  function moveControlsOutside() {
    const floatingControls = document.getElementById('floatingControls');
    if (floatingControls) floatingControls.remove();
    
    if (isCameraActive) {
      startCameraBtn.style.display = 'none';
      stopCameraBtn.style.display = 'inline-flex';
      toggleScanFxBtn.style.display = 'inline-flex';
      expandCameraBtn.style.display = 'flex';
      captureBtnContainer.style.display = 'flex';
    } else {
      startCameraBtn.style.display = 'block';
      stopCameraBtn.style.display = 'none';
      toggleScanFxBtn.style.display = 'none';
      expandCameraBtn.style.display = 'none';
      captureBtnContainer.style.display = 'none';
    }
    
    updateCaptureUI();
  }
  
  // =========================================================================
  // JOINT SELECTION & QUEUE SETUP
  // =========================================================================
  function updateForJointSelection(value) {
    if (!value) {
      startCameraBtn.disabled = true;
      movementPromptBox.style.display = 'none';
      queueNavigation.style.display = 'none';
      return;
    }
    
    startCameraBtn.disabled = false;
    
    if (assessmentMode === 'isolate') {
      currentMovement = movementPrompts[value];
      movementQueue = [value];
      currentQueueIndex = 0;
      requiredFramesSpan.textContent = currentMovement.requiredFrames;
      movementInstruction.textContent = `Prepare for ${currentMovement.name}`;
      movementPromptBox.style.display = 'flex';
      currentPrompt.textContent = currentMovement.prompts[0];
      promptStep.textContent = `0/${currentMovement.requiredFrames}`;
      promptIndex = 0;
      queueNavigation.style.display = 'none';
    } else {
      const groupKey = value;
      movementQueue = jointGroups[groupKey] || [];
      if (movementQueue.length === 0) {
        showToast('No movements defined for this joint', 'error');
        return;
      }
      currentQueueIndex = 0;
      currentMovement = movementPrompts[movementQueue[0]];
      requiredFramesSpan.textContent = currentMovement.requiredFrames;
      movementInstruction.textContent = `Full Assessment: ${currentMovement.name} (1/${movementQueue.length})`;
      movementPromptBox.style.display = 'flex';
      currentPrompt.textContent = currentMovement.prompts[0];
      promptStep.textContent = `Movement 1/${movementQueue.length} · 0/${currentMovement.requiredFrames} frames`;
      promptIndex = 0;
      allCapturedFrames = {};
      showQueueNavigation();
    }
    
    capturedFrames = [];
    updateThumbnails();
    proceedBtn.disabled = true;
    undoFrameBtn.disabled = true;
  }
  
  jointSelect.addEventListener('change', (e) => updateForJointSelection(e.target.value));
  
  function showQueueNavigation() {
    if (assessmentMode !== 'full') {
      queueNavigation.style.display = 'none';
      return;
    }
    queueNavigation.style.display = 'flex';
    updateQueueDots();
    updateQueueButtons();
  }

  function updateQueueDots() {
    queueDots.innerHTML = '';
    movementQueue.forEach((key, i) => {
      const dot = document.createElement('span');
      dot.className = 'dot';
      if (i < currentQueueIndex) dot.classList.add('completed');
      if (i === currentQueueIndex) dot.classList.add('filled');
      if (allCapturedFrames[key] && allCapturedFrames[key].length > 0) dot.classList.add('captured');
      queueDots.appendChild(dot);
    });
    queueMovementName.textContent = currentMovement ? currentMovement.name : '';
  }

  function updateQueueButtons() {
    prevMovementBtn.disabled = currentQueueIndex === 0;
    nextMovementBtn.disabled = currentQueueIndex >= movementQueue.length - 1;
  }

  function moveQueue(direction) {
    const newIndex = currentQueueIndex + direction;
    if (newIndex < 0 || newIndex >= movementQueue.length) return;
    
    allCapturedFrames[movementQueue[currentQueueIndex]] = [...capturedFrames];
    
    currentQueueIndex = newIndex;
    currentMovement = movementPrompts[movementQueue[currentQueueIndex]];
    capturedFrames = allCapturedFrames[movementQueue[currentQueueIndex]] || [];
    promptIndex = capturedFrames.length;
    
    requiredFramesSpan.textContent = currentMovement.requiredFrames;
    movementInstruction.textContent = `Full Assessment: ${currentMovement.name} (${currentQueueIndex+1}/${movementQueue.length})`;
    
    if (capturedFrames.length >= currentMovement.requiredFrames) {
      currentPrompt.textContent = '✓ Complete';
      movementPromptBox.style.borderLeftColor = '#10b981';
    } else {
      currentPrompt.textContent = currentMovement.prompts[promptIndex] || currentMovement.prompts[0];
      movementPromptBox.style.borderLeftColor = 'var(--rom-accent)';
    }
    
    promptStep.textContent = `Movement ${currentQueueIndex+1}/${movementQueue.length} · ${promptIndex}/${currentMovement.requiredFrames} frames`;
    
    updateThumbnails();
    updateQueueDots();
    updateQueueButtons();
    
    undoFrameBtn.disabled = capturedFrames.length === 0;
    
    if (captureMode === 'photo') {
      captureFrameBtn.disabled = !isCameraActive || capturedFrames.length >= currentMovement.requiredFrames;
    }
  }

  if (prevMovementBtn) prevMovementBtn.addEventListener('click', () => moveQueue(-1));
  if (nextMovementBtn) nextMovementBtn.addEventListener('click', () => moveQueue(1));
  
  // =========================================================================
  // CAMERA FUNCTIONS
  // =========================================================================
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
      
      if (scanOverlay && isScanFxVisible) {
        scanOverlay.style.display = 'block';
      }
      
      startCameraBtn.style.display = 'none';
      stopCameraBtn.style.display = 'inline-flex';
      toggleScanFxBtn.style.display = 'inline-flex';
      expandCameraBtn.style.display = 'flex';
      captureBtnContainer.style.display = 'flex';
      
      isCameraActive = true;
      updateCaptureUI();
      
      capturedFrames = [];
      promptIndex = 0;
      updateThumbnails();
      
      if (currentMovement) {
        currentPrompt.textContent = currentMovement.prompts[0];
        
        if (assessmentMode === 'full') {
          promptStep.textContent = `Movement ${currentQueueIndex+1}/${movementQueue.length} · 0/${currentMovement.requiredFrames} frames`;
        } else {
          promptStep.textContent = `0/${currentMovement.requiredFrames}`;
        }
      }
      
      proceedBtn.disabled = true;
      undoFrameBtn.disabled = true;
      
      showToast('Camera ready - ' + (captureMode === 'video' ? 'Press Record to start' : 'Capture each position'), 'success');
      
      drawGuideOverlay();
      
      setTimeout(() => {
        cameraView.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
      
    } catch (err) {
      console.error('Camera error:', err);
      showToast('Camera access denied or not available', 'error');
      stopCamera();
    }
  }
  
  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    
    if (isRecording) {
      stopRecording();
    }
    
    if (isCameraFullscreen) {
      toggleCameraFullscreen();
    }
    
    cameraPreview.srcObject = null;
    cameraPreview.style.display = 'none';
    cameraPlaceholder.style.display = 'flex';
    
    if (scanOverlay) scanOverlay.style.display = 'none';
    recordingIndicator.style.display = 'none';
    
    isCameraActive = false;
    
    startCameraBtn.style.display = 'block';
    stopCameraBtn.style.display = 'none';
    toggleScanFxBtn.style.display = 'none';
    expandCameraBtn.style.display = 'none';
    captureBtnContainer.style.display = 'none';
    startCameraBtn.disabled = !currentMovement;
  }

  function drawGuideOverlay() {
    const canvas = document.getElementById('guideCanvas');
    if (!canvas || !currentMovement) return;
    
    const overlay = document.getElementById('guideOverlay');
    if (!overlay) return;
    
    canvas.width = overlay.offsetWidth || 300;
    canvas.height = overlay.offsetHeight || 400;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.strokeStyle = 'rgba(0, 150, 136, 0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    
    ctx.beginPath();
    ctx.arc(cx, cy - 50, 20, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(cx, cy - 30);
    ctx.lineTo(cx, cy + 30);
    ctx.stroke();
    
    ctx.setLineDash([]);
  }
  
  // =========================================================================
  // PHOTO MODE CAPTURE
  // =========================================================================
  function captureFrame() {
    if (!stream || !cameraPreview.videoWidth) return null;
    
    const canvas = document.createElement('canvas');
    canvas.width = cameraPreview.videoWidth;
    canvas.height = cameraPreview.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(cameraPreview, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.9);
  }
  
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
    
    const dataUrl = captureFrame();
    if (!dataUrl) {
      showToast('Failed to capture frame', 'error');
      return;
    }
    
    captureFrameBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
    captureFrameBtn.disabled = true;
    
    const compressed = await compressImage(dataUrl, 0.8);
    capturedFrames.push(compressed);
    updateThumbnails();
    
    if (navigator.vibrate) navigator.vibrate(50);
    
    promptIndex = capturedFrames.length;
    undoFrameBtn.disabled = false;
    
    if (assessmentMode === 'full') {
      promptStep.textContent = `Movement ${currentQueueIndex+1}/${movementQueue.length} · ${promptIndex}/${currentMovement.requiredFrames} frames`;
    } else {
      promptStep.textContent = `${promptIndex}/${currentMovement.requiredFrames}`;
    }
    
    if (capturedFrames.length >= currentMovement.requiredFrames) {
      allCapturedFrames[movementQueue[currentQueueIndex]] = [...capturedFrames];
      
      if (assessmentMode === 'full' && currentQueueIndex < movementQueue.length - 1) {
        currentQueueIndex++;
        currentMovement = movementPrompts[movementQueue[currentQueueIndex]];
        capturedFrames = allCapturedFrames[movementQueue[currentQueueIndex]] || [];
        promptIndex = capturedFrames.length;
        
        requiredFramesSpan.textContent = currentMovement.requiredFrames;
        movementInstruction.textContent = `Full Assessment: ${currentMovement.name} (${currentQueueIndex+1}/${movementQueue.length})`;
        currentPrompt.textContent = capturedFrames.length >= currentMovement.requiredFrames ? '✓ Complete' : currentMovement.prompts[promptIndex];
        promptStep.textContent = `Movement ${currentQueueIndex+1}/${movementQueue.length} · ${promptIndex}/${currentMovement.requiredFrames} frames`;
        updateThumbnails();
        updateQueueDots();
        updateQueueButtons();
        
        showToast(`✓ ${movementPrompts[movementQueue[currentQueueIndex-1]].name} complete. Next: ${currentMovement.name}`, 'success');
        
        captureFrameBtn.disabled = !isCameraActive;
        captureFrameBtn.innerHTML = '<i class="fas fa-camera"></i> Capture Position';
        return;
      } else {
        currentPrompt.textContent = '✓ All positions captured!';
        movementPromptBox.style.borderLeftColor = '#10b981';
        const totalMovements = assessmentMode === 'full' ? movementQueue.length : 1;
        showToast(`✅ Assessment complete! ${totalMovements} movement(s) captured. Ready for analysis.`, 'success');
        stopCamera();
        proceedBtn.disabled = false;
        capturePreview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    } else {
      currentPrompt.textContent = currentMovement.prompts[promptIndex];
      showToast(`Position ${promptIndex} captured!`, 'success', 2000);
      captureFrameBtn.disabled = false;
      captureFrameBtn.innerHTML = '<i class="fas fa-camera"></i> Capture Next Position';
    }
    
    setTimeout(() => {
      movementPromptBox.style.borderLeftColor = 'var(--rom-accent)';
    }, 2000);
  }

  function deleteFrame(index) {
    capturedFrames.splice(index, 1);
    updateThumbnails();
    promptIndex = capturedFrames.length;
    
    if (capturedFrames.length > 0) {
      currentPrompt.textContent = currentMovement.prompts[promptIndex] || currentMovement.prompts[0];
    } else {
      currentPrompt.textContent = currentMovement.prompts[0];
    }
    
    if (assessmentMode === 'full') {
      promptStep.textContent = `Movement ${currentQueueIndex+1}/${movementQueue.length} · ${promptIndex}/${currentMovement.requiredFrames} frames`;
      allCapturedFrames[movementQueue[currentQueueIndex]] = [...capturedFrames];
    } else {
      promptStep.textContent = `${promptIndex}/${currentMovement.requiredFrames}`;
    }
    
    undoFrameBtn.disabled = capturedFrames.length === 0;
    proceedBtn.disabled = true;
    
    if (captureFrameBtn) {
      captureFrameBtn.disabled = !isCameraActive || capturedFrames.length >= currentMovement.requiredFrames;
    }
    
    movementPromptBox.style.borderLeftColor = 'var(--rom-accent)';
    showToast('Frame removed', 'info', 1500);
  }

  function undoLastFrame() {
    if (capturedFrames.length > 0) {
      deleteFrame(capturedFrames.length - 1);
    }
  }
  
  function updateThumbnails() {
    thumbnailContainer.innerHTML = '';
    capturedFrames.forEach((url, i) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'thumbnail-wrapper';
      
      const img = document.createElement('img');
      img.src = url;
      img.className = 'thumbnail';
      img.alt = `Position ${i + 1}`;
      img.title = `Position ${i + 1} - Click to view full size`;
      img.addEventListener('click', () => window.open(url, '_blank'));
      
      const label = document.createElement('span');
      label.className = 'frame-index';
      label.textContent = i + 1;
      
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'thumbnail-delete';
      deleteBtn.innerHTML = '×';
      deleteBtn.title = 'Remove this frame';
      deleteBtn.setAttribute('aria-label', `Delete position ${i + 1}`);
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteFrame(i);
      });
      
      wrapper.appendChild(img);
      wrapper.appendChild(label);
      wrapper.appendChild(deleteBtn);
      thumbnailContainer.appendChild(wrapper);
    });
    
    frameCountSpan.textContent = capturedFrames.length;
    capturePreview.style.display = capturedFrames.length ? 'block' : 'none';
  }
  
  function resetCapture() {
    capturedFrames = [];
    reviewFrames = [];
    videoBlob = null;
    recordedChunks = [];
    updateThumbnails();
    proceedBtn.disabled = true;
    capturePreview.style.display = 'none';
    undoFrameBtn.disabled = true;
    
    if (currentMovement) {
      promptIndex = 0;
      currentPrompt.textContent = currentMovement.prompts[0];
      if (assessmentMode === 'full') {
        promptStep.textContent = `Movement ${currentQueueIndex+1}/${movementQueue.length} · 0/${currentMovement.requiredFrames} frames`;
      } else {
        promptStep.textContent = `0/${currentMovement.requiredFrames}`;
      }
      movementPromptBox.style.borderLeftColor = 'var(--rom-accent)';
    }
    
    if (captureFrameBtn) {
      captureFrameBtn.disabled = !isCameraActive;
      captureFrameBtn.innerHTML = '<i class="fas fa-camera"></i> Capture Position';
    }
    if (recordVideoBtn) {
      recordVideoBtn.classList.remove('recording');
      recordVideoBtn.innerHTML = '<i class="fas fa-circle"></i>';
    }
    
    if (isCameraFullscreen) {
      moveControlsToFullscreen();
    }
  }
  
  // =========================================================================
  // VIDEO RECORDING FUNCTIONS
  // =========================================================================
  function startRecording() {
    if (!stream) return;
    
    recordedChunks = [];
    try {
      mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
    } catch (e) {
      try {
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      } catch (e2) {
        mediaRecorder = new MediaRecorder(stream);
      }
    }
    
    mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) recordedChunks.push(e.data);
    };
    mediaRecorder.onstop = handleVideoStop;
    mediaRecorder.onerror = (e) => {
      console.error('MediaRecorder error:', e);
      showToast('Recording error occurred', 'error');
      stopRecording();
    };
    
    mediaRecorder.start(100);
    isRecording = true;
    recordingDuration = 0;
    
    updateRecordButtonState(true);
    recordingIndicator.style.display = 'flex';
    recordingTime.textContent = '00:00';
    
    recordingTimer = setInterval(() => {
      recordingDuration++;
      recordingTime.textContent = formatTime(recordingDuration);
    }, 1000);
    
    showToast('🔴 Recording... Perform the movement now', 'info', 2000);
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    clearInterval(recordingTimer);
    isRecording = false;
    updateRecordButtonState(false);
    recordingIndicator.style.display = 'none';
  }

  function handleVideoStop() {
    clearInterval(recordingTimer);
    isRecording = false;
    updateRecordButtonState(false);
    recordingIndicator.style.display = 'none';
    
    videoBlob = new Blob(recordedChunks, { type: 'video/webm' });
    console.log('Video recorded:', (videoBlob.size / 1024 / 1024).toFixed(2) + 'MB');
    
    showToast('Processing video...', 'info', 2000);
    
    extractKeyFrames(videoBlob).then(frames => {
      reviewFrames = frames;
      if (reviewFrames.length === 0) {
        showToast('No frames could be extracted. Please retake the video.', 'error');
        return;
      }
      showReviewStage();
    }).catch(err => {
      console.error('Frame extraction error:', err);
      showToast('Frame extraction failed: ' + err.message, 'error');
    });
  }

  function updateRecordButtonState(recording) {
    if (recording) {
      recordVideoBtn.classList.add('recording');
      recordVideoBtn.innerHTML = '<i class="fas fa-stop"></i>';
      recordVideoBtn.setAttribute('aria-label', 'Stop recording');
    } else {
      recordVideoBtn.classList.remove('recording');
      recordVideoBtn.innerHTML = '<i class="fas fa-circle"></i>';
      recordVideoBtn.setAttribute('aria-label', 'Start recording');
    }
    
    if (isCameraFullscreen) {
      moveControlsToFullscreen();
    }
  }

  // =========================================================================
  // FRAME EXTRACTION FROM VIDEO (FIXED)
  // =========================================================================
  async function extractKeyFrames(blob) {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(blob);
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    
    await new Promise((resolve, reject) => {
      video.onloadedmetadata = () => {
        video.currentTime = 0;
        resolve();
      };
      video.onerror = reject;
      video.load();
    });

    await new Promise(resolve => {
      if (video.readyState >= 2) resolve();
      else video.oncanplay = resolve;
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;
    canvas.width = videoWidth;
    canvas.height = videoHeight;

    const frames = [];
    const duration = video.duration || 0;
    
    // FIX: Check for non-finite duration
    if (!isFinite(duration) || duration <= 0) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push({
        dataUrl: canvas.toDataURL('image/jpeg', 0.9),
        time: 0,
        label: 'Frame'
      });
      URL.revokeObjectURL(video.src);
      return frames;
    }

    let prevFrameData = null;
    let stableCount = 0;
    const STABILITY_THRESHOLD = 0.04;
    const STABILITY_FRAMES = 15;
    const MIN_FRAMES = 3;
    const MAX_FRAMES = 6;

    const step = Math.max(0.05, duration / 200);
    let lastCaptureTime = -1;
    const MIN_CAPTURE_GAP = 0.5;

    for (let t = 0; t <= duration; t += step) {
      if (frames.length >= MAX_FRAMES) break;
      if (!isFinite(t)) break; // FIX: guard against non-finite t
      
      video.currentTime = Math.min(t, duration);
      await new Promise(r => {
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked);
          r();
        };
        video.addEventListener('seeked', onSeeked);
      });
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      if (prevFrameData) {
        const diff = frameDifference(prevFrameData, imageData);
        
        if (diff < STABILITY_THRESHOLD) {
          stableCount++;
          if (stableCount >= STABILITY_FRAMES && (t - lastCaptureTime) >= MIN_CAPTURE_GAP) {
            frames.push({
              dataUrl: canvas.toDataURL('image/jpeg', 0.85),
              time: t,
              label: getFrameLabel(frames.length)
            });
            lastCaptureTime = t;
            stableCount = 0;
          }
        } else {
          stableCount = 0;
        }
      }
      prevFrameData = imageData;
    }
    
    // Ensure minimum frames
    if (frames.length < MIN_FRAMES) {
      video.currentTime = 0;
      await new Promise(r => { video.onseeked = r; });
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const first = {
        dataUrl: canvas.toDataURL('image/jpeg', 0.9),
        time: 0,
        label: 'Start'
      };
      
      const endTime = duration - 0.1;
      if (isFinite(endTime) && endTime > 0) {
        video.currentTime = endTime;
        await new Promise(r => { video.onseeked = r; });
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const last = {
          dataUrl: canvas.toDataURL('image/jpeg', 0.9),
          time: duration,
          label: 'End'
        };
        
        if (duration > 1) {
          const midTime = duration / 2;
          if (isFinite(midTime)) {
            video.currentTime = midTime;
            await new Promise(r => { video.onseeked = r; });
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            frames.length = 0;
            frames.push(first);
            frames.push({
              dataUrl: canvas.toDataURL('image/jpeg', 0.9),
              time: duration / 2,
              label: 'Mid'
            });
            frames.push(last);
          }
        } else {
          frames.length = 0;
          frames.push(first);
          if (duration > 0.3) frames.push(last);
        }
      } else {
        frames.length = 0;
        frames.push(first);
      }
    }
    
    URL.revokeObjectURL(video.src);
    return frames;
  }

  function getFrameLabel(index) {
    const labels = ['Start', 'Early', 'Mid', 'Late', 'End Range', 'Return'];
    return labels[index] || `Frame ${index + 1}`;
  }

  function frameDifference(dataA, dataB) {
    const pixelsA = dataA.data;
    const pixelsB = dataB.data;
    let diff = 0;
    const sampleStep = 16;
    for (let i = 0; i < pixelsA.length; i += sampleStep) {
      diff += Math.abs(pixelsA[i] - pixelsB[i]) +
              Math.abs(pixelsA[i+1] - pixelsB[i+1]) +
              Math.abs(pixelsA[i+2] - pixelsB[i+2]);
    }
    return diff / (pixelsA.length / sampleStep) / 765;
  }

  // =========================================================================
  // REVIEW STAGE LOGIC
  // =========================================================================
  function showReviewStage() {
    stopCamera();
    setStage(2);
    
    reviewFramesContainer.innerHTML = '';
    selectedReviewFrameIndex = -1;
    
    if (reviewFrames.length === 0) {
      reviewInstruction.textContent = 'No frames were extracted. Please retake the video.';
      confirmReviewBtn.disabled = true;
      return;
    }
    
    reviewInstruction.textContent = `${reviewFrames.length} key positions extracted. Review and confirm before analysis.`;
    confirmReviewBtn.disabled = false;
    
    reviewFrames.forEach((frame, idx) => {
      const div = document.createElement('div');
      div.className = 'review-frame';
      div.innerHTML = `
        <img src="${frame.dataUrl}" alt="${frame.label}">
        <span class="frame-label">${frame.label}</span>
        <span class="frame-time">${formatTime(Math.floor(frame.time))}</span>
      `;
      div.addEventListener('click', () => selectReviewFrame(idx));
      div.setAttribute('role', 'button');
      div.setAttribute('tabindex', '0');
      div.setAttribute('aria-label', `${frame.label} at ${formatTime(Math.floor(frame.time))}`);
      reviewFramesContainer.appendChild(div);
    });
    
    reviewVideo.src = URL.createObjectURL(videoBlob);
    reviewVideo.load();
    
    reviewVideo.onloadedmetadata = () => {
      timelineSlider.max = reviewVideo.duration || 10;
      timelineTime.textContent = `0:00 / ${formatTime(Math.floor(reviewVideo.duration || 0))}`;
    };
    
    timelineSlider.addEventListener('input', (e) => {
      reviewVideo.currentTime = parseFloat(e.target.value);
      updateTimelineTime();
    });
    
    reviewVideo.addEventListener('timeupdate', () => {
      if (!timelineSlider.matches(':active')) {
        timelineSlider.value = reviewVideo.currentTime;
        updateTimelineTime();
      }
    });
    
    playPauseBtn.addEventListener('click', togglePlayPause);
    reviewVideo.addEventListener('ended', () => {
      playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    });
    
    updateScrubberMarkers();
    
    manualCaptureBtn.style.display = 'inline-flex';
    manualCaptureBtn.onclick = manualCaptureFromVideo;
    
    setTimeout(() => {
      stageReview.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  function updateTimelineTime() {
    const current = formatTime(Math.floor(reviewVideo.currentTime || 0));
    const total = formatTime(Math.floor(reviewVideo.duration || 0));
    timelineTime.textContent = `${current} / ${total}`;
  }

  function togglePlayPause() {
    if (reviewVideo.paused) {
      reviewVideo.play();
      playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    } else {
      reviewVideo.pause();
      playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
    }
  }

  function updateScrubberMarkers() {
    scrubberMarkers.innerHTML = '';
    const duration = reviewVideo.duration || 10;
    reviewFrames.forEach(frame => {
      const marker = document.createElement('div');
      marker.className = 'scrubber-marker';
      const left = (frame.time / duration) * 100;
      marker.style.left = `${left}%`;
      marker.title = frame.label;
      marker.addEventListener('click', () => {
        reviewVideo.currentTime = frame.time;
        timelineSlider.value = frame.time;
      });
      scrubberMarkers.appendChild(marker);
    });
  }

  function selectReviewFrame(index) {
    selectedReviewFrameIndex = index;
    const frameElements = reviewFramesContainer.querySelectorAll('.review-frame');
    frameElements.forEach((el, i) => {
      el.classList.toggle('selected', i === index);
    });
    
    if (reviewFrames[index]) {
      reviewVideo.currentTime = reviewFrames[index].time;
      timelineSlider.value = reviewFrames[index].time;
    }
  }

  function manualCaptureFromVideo() {
    if (!reviewVideo.src) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = reviewVideo.videoWidth || 640;
    canvas.height = reviewVideo.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(reviewVideo, 0, 0, canvas.width, canvas.height);
    
    const newFrame = {
      dataUrl: canvas.toDataURL('image/jpeg', 0.9),
      time: reviewVideo.currentTime,
      label: 'Manual'
    };
    
    const insertIndex = reviewFrames.findIndex(f => f.time > newFrame.time);
    if (insertIndex === -1) {
      reviewFrames.push(newFrame);
    } else {
      reviewFrames.splice(insertIndex, 0, newFrame);
    }
    
    showReviewStage();
    showToast('Manual frame added', 'success', 1500);
  }

  // =========================================================================
  // AI ANALYSIS
  // =========================================================================
  async function analyzeROM() {
    if (!aiConfig.token) {
      const success = await fetchTokens();
      if (!success) throw new Error('AI service unavailable. Please try again.');
    }
    
    let jointDescription, framesToSend;
    
    if (captureMode === 'video') {
      framesToSend = reviewFrames.map(f => f.dataUrl);
      jointDescription = currentMovement ? currentMovement.name : 'Unknown Movement';
    } else if (assessmentMode === 'isolate') {
      jointDescription = currentMovement.name;
      framesToSend = capturedFrames;
    } else {
      const selectedOption = jointSelect.options[jointSelect.selectedIndex];
      jointDescription = `Full ${selectedOption.text} Assessment`;
      framesToSend = [];
      movementQueue.forEach(key => {
        if (allCapturedFrames[key]) {
          framesToSend = framesToSend.concat(allCapturedFrames[key]);
        }
      });
    }
    
    updateAnalysisStep('upload', 'active');
    updateAnalysisStep('analyze', 'pending');
    updateAnalysisStep('compare', 'pending');
    updateAnalysisStep('generate', 'pending');
    
    const systemPrompt = `You are rehablix ROM Analyzer, a clinical AI specialized in range of motion assessment for rehabilitation professionals.

IMPORTANT: First, verify that the provided images clearly show a human subject performing the specified movement (${jointDescription}). The joint/body part must be visible and adequately lit. If the images do NOT show a visible human joint (e.g., empty room, darkness, blurred, or no person), respond with exactly:
"ERROR: No joint detected in the provided images. Please ensure proper lighting and that the joint is clearly visible."
Do not provide any analysis or additional text in that case.

If a joint IS clearly visible, provide a comprehensive clinical analysis including:
1. **Estimated Range of Motion** (in degrees) based on visual assessment of the movement sequence
2. **Movement Quality Observations** - note any compensations, asymmetries, or deviations
3. **Comparison to Normative Values** - typical ROM for this joint
4. **Clinical Recommendations** - suggested interventions or further assessments

Format your response with clear headings (## for sections), bullet points for observations, and professional clinical language. Do NOT use tables.`;
    
    const userContent = `Joint/Movement: ${jointDescription}
Movement Sequence: ${assessmentMode === 'full' && captureMode !== 'video' ? 'Full Assessment - Multiple movements' : currentMovement ? currentMovement.prompts.join(' → ') : 'Video recorded movement'}

The images show the progression from start position through full range of motion. Please analyze the patient's ROM and movement quality.`;
    
    const messages = [
      { role: "system", content: systemPrompt },
      { 
        role: "user", 
        content: [
          { type: "text", text: userContent },
          ...framesToSend.map(url => ({ type: "image_url", image_url: { url } }))
        ]
      }
    ];
    
    const url = `${aiConfig.endpoint.replace(/\/$/, '')}/chat/completions`;
    
    updateAnalysisStep('upload', 'completed');
    updateAnalysisStep('analyze', 'active');
    progressBar.style.width = '35%';
    
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
    
    updateAnalysisStep('analyze', 'completed');
    updateAnalysisStep('compare', 'active');
    progressBar.style.width = '65%';
    
    const data = await response.json();
    const result = data.choices[0].message.content;
    
    updateAnalysisStep('compare', 'completed');
    updateAnalysisStep('generate', 'active');
    progressBar.style.width = '90%';
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    updateAnalysisStep('generate', 'completed');
    progressBar.style.width = '100%';
    
    return result;
  }

  function updateAnalysisStep(stepName, status) {
    if (!analysisSteps) return;
    const step = analysisSteps.querySelector(`[data-step="${stepName}"]`);
    if (!step) return;
    
    step.classList.remove('active', 'completed', 'pending');
    step.classList.add(status);
    
    if (status === 'active') {
      step.style.opacity = '1';
      step.style.fontWeight = '600';
    } else if (status === 'completed') {
      step.style.opacity = '0.7';
      step.style.fontWeight = '400';
      const icons = { upload: '✅', analyze: '✅', compare: '✅', generate: '✅' };
      const oldIcons = { upload: '⬆️', analyze: '🔍', compare: '📊', generate: '📝' };
      step.innerHTML = step.innerHTML.replace(oldIcons[stepName], icons[stepName]);
    }
  }
  
  async function saveToHistory(result) {
    if (!currentUser) return null;
    
    try {
      const jointName = assessmentMode === 'isolate' ? 
        (currentMovement ? currentMovement.name : 'ROM Analysis') : 
        `Full ${jointSelect.options[jointSelect.selectedIndex]?.text || 'Joint'} Assessment`;
      
      const totalFrames = captureMode === 'video' ? 
        reviewFrames.length : 
        (assessmentMode === 'isolate' ? capturedFrames.length : Object.values(allCapturedFrames).flat().length);
      
      const newRef = await database.ref(`history/${currentUser.uid}/analysisHistory`).push({
        contentType: 'rom',
        fileName: `ROM - ${jointName}`,
        documentType: 'ROM Analysis',
        request: `Analyze ${jointName} range of motion`,
        results: result,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        date: new Date().toLocaleDateString(),
        frameCount: totalFrames,
        assessmentMode: assessmentMode,
        captureMode: captureMode
      });
      
      showToast('Analysis saved to history', 'info', 2000);
      return newRef.key;
    } catch (error) {
      console.error('Error saving to history:', error);
      return null;
    }
  }
  
  function showPreviewModal(result, historyKey) {
    const existingModal = document.querySelector('.preview-modal');
    if (existingModal) existingModal.remove();

    const jointName = assessmentMode === 'isolate' ? 
      (currentMovement ? currentMovement.name : 'ROM Analysis') : 
      `Full ${jointSelect.options[jointSelect.selectedIndex]?.text || 'Joint'} Assessment`;
    const dateStr = new Date().toLocaleString();

    const modalHtml = `
      <div class="preview-modal" role="dialog" aria-modal="true" aria-label="Analysis Complete">
        <div class="preview-overlay"></div>
        <div class="preview-card">
          <div class="preview-card-header">
            <div class="preview-icon">📋</div>
            <h3>ROM Analysis Complete</h3>
            <button class="preview-close" aria-label="Close">&times;</button>
          </div>
          <div class="preview-card-body">
            <div class="preview-info">
              <span class="preview-badge">✅ Ready to view</span>
              <span class="preview-date">${dateStr}</span>
            </div>
            <p class="preview-description">
              Your analysis of <strong>${escapeHtml(jointName)}</strong> has been generated successfully.
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
              <small>🔒 The full report will open in a new tab for printing or saving.</small>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = document.querySelector('.preview-modal');
    
    const closeModal = () => {
      modal.remove();
      progressBar.style.width = '0%';
      resetAnalysisSteps();
    };
    
    modal.querySelector('.preview-close').addEventListener('click', closeModal);
    modal.querySelector('#closePreviewBtn').addEventListener('click', closeModal);
    modal.querySelector('.preview-overlay').addEventListener('click', closeModal);
    
    modal.querySelector('#viewFullAnalysisBtn').addEventListener('click', () => {
      if (historyKey) {
        window.open(`romresult.html?id=${historyKey}`, '_blank');
        closeModal();
      } else {
        showToast('Error: Analysis ID not found', 'error');
      }
    });
    
    modal.querySelector('.preview-close').focus();
  }

  function resetAnalysisSteps() {
    if (!analysisSteps) return;
    const stepsElements = analysisSteps.querySelectorAll('.analysis-step');
    stepsElements.forEach(step => {
      step.classList.remove('active', 'completed');
      step.classList.add('pending');
      step.style.opacity = '0.5';
      step.style.fontWeight = '400';
      const oldIcons = { upload: '⬆️', analyze: '🔍', compare: '📊', generate: '📝' };
      const stepName = step.dataset.step;
      if (oldIcons[stepName]) {
        step.innerHTML = step.innerHTML.replace('✅', oldIcons[stepName]);
      }
    });
  }
  
  // =========================================================================
  // HISTORY DRAWER
  // =========================================================================
  function loadRomHistory() {
    if (!currentUser) return;
    
    database.ref(`history/${currentUser.uid}/analysisHistory`)
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
        
        filterHistoryEntries(entries);
      });
  }

  function filterHistoryEntries(entries) {
    const searchTerm = (historySearchInput?.value || '').toLowerCase();
    historyList.innerHTML = '';
    
    const filtered = entries.filter(([_, item]) => {
      const name = (item.fileName || 'ROM Analysis').toLowerCase();
      return name.includes(searchTerm);
    });
    
    if (filtered.length === 0) {
      historyList.innerHTML = '<div class="empty-state"><i class="bx bx-search"></i><p>No matching results</p></div>';
      return;
    }
    
    filtered.forEach(([key, item]) => {
      const div = document.createElement('div');
      div.className = 'history-item';
      div.setAttribute('tabindex', '0');
      div.setAttribute('role', 'button');
      div.setAttribute('aria-label', `View ${item.fileName || 'ROM Analysis'}`);
      
      div.innerHTML = `
        <div class="history-info">
          <span class="history-name">${escapeHtml(item.fileName || 'ROM Analysis')}</span>
          <div class="history-meta">
            <span class="meta-tag"><i class="bx bx-run"></i> ROM</span>
            <span>${escapeHtml(item.date || '')}</span>
            ${item.frameCount ? `<span>${item.frameCount} frames</span>` : ''}
            ${item.assessmentMode === 'full' ? '<span class="meta-tag">Full</span>' : ''}
            ${item.captureMode === 'video' ? '<span class="meta-tag">📹 Video</span>' : ''}
          </div>
        </div>
        <div class="history-actions">
          <button class="view-btn" data-key="${key}" title="View analysis" aria-label="View analysis">
            <i class="bx bx-chevron-right"></i>
          </button>
          <button class="delete-history-btn" data-key="${key}" title="Delete" aria-label="Delete analysis">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `;
      
      div.querySelector('.view-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        window.open(`romresult.html?id=${key}`, '_blank');
      });
      
      div.querySelector('.delete-history-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Delete this analysis? This cannot be undone.')) {
          database.ref(`history/${currentUser.uid}/analysisHistory/${key}`).remove()
            .then(() => showToast('Analysis deleted', 'info'))
            .catch(() => showToast('Failed to delete', 'error'));
        }
      });
      
      div.addEventListener('click', () => {
        window.open(`romresult.html?id=${key}`, '_blank');
      });
      
      historyList.appendChild(div);
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
    setTimeout(() => {
      historySearchInput?.focus();
    }, 300);
  }
  
  // =========================================================================
  // ONBOARDING WITH SCROLLING FIX
  // =========================================================================
  function showOnboarding() {
    if (localStorage.getItem('rom-onboarded') === 'true') return;
    if (!onboardingTooltip) return;
    
    currentOnboardingStep = 0;
    onboardingTooltip.style.display = 'block';
    updateOnboardingStep();
  }

  function updateOnboardingStep() {
    if (currentOnboardingStep >= onboardingSteps.length) {
      onboardingTooltip.style.display = 'none';
      localStorage.setItem('rom-onboarded', 'true');
      const lastTarget = document.querySelector(onboardingSteps[onboardingSteps.length - 1]?.target);
      if (lastTarget) {
        lastTarget.style.boxShadow = '';
        lastTarget.style.zIndex = '';
      }
      return;
    }
    
    const step = onboardingSteps[currentOnboardingStep];
    const target = document.querySelector(step.target);
    
    if (!target) {
      currentOnboardingStep++;
      updateOnboardingStep();
      return;
    }
    
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    setTimeout(() => {
      tooltipText.textContent = step.text;
      
      tooltipDots.innerHTML = '';
      onboardingSteps.forEach((_, i) => {
        const dot = document.createElement('span');
        dot.className = 'tooltip-dot' + (i === currentOnboardingStep ? ' active' : '');
        tooltipDots.appendChild(dot);
      });
      
      const rect = target.getBoundingClientRect();
      const tooltipRect = onboardingTooltip.getBoundingClientRect();
      
      let top, left;
      
      if (step.position === 'bottom') {
        top = rect.bottom + window.scrollY + 12;
        left = rect.left + rect.width / 2 - tooltipRect.width / 2;
      } else {
        top = rect.top + window.scrollY - tooltipRect.height - 12;
        left = rect.left + rect.width / 2 - tooltipRect.width / 2;
      }
      
      left = Math.max(10, Math.min(left, window.innerWidth - tooltipRect.width - 10));
      
      if (top < 10) {
        top = rect.bottom + window.scrollY + 12;
      }
      if (top + tooltipRect.height > window.innerHeight + window.scrollY - 10) {
        top = rect.top + window.scrollY - tooltipRect.height - 12;
      }
      
      onboardingTooltip.style.top = top + 'px';
      onboardingTooltip.style.left = left + 'px';
      
      target.style.boxShadow = '0 0 0 4px var(--rom-accent)';
      target.style.zIndex = '1001';
      target.style.position = target.style.position || 'relative';
      
      tooltipNext.textContent = currentOnboardingStep === onboardingSteps.length - 1 ? 'Got it!' : 'Next';
    }, 400);
  }

  function nextOnboardingStep() {
    const currentTarget = document.querySelector(onboardingSteps[currentOnboardingStep]?.target);
    if (currentTarget) {
      currentTarget.style.boxShadow = '';
      currentTarget.style.zIndex = '';
    }
    
    currentOnboardingStep++;
    updateOnboardingStep();
  }

  function skipOnboarding() {
    const currentTarget = document.querySelector(onboardingSteps[currentOnboardingStep]?.target);
    if (currentTarget) {
      currentTarget.style.boxShadow = '';
      currentTarget.style.zIndex = '';
    }
    
    onboardingTooltip.style.display = 'none';
    localStorage.setItem('rom-onboarded', 'true');
  }

  if (tooltipNext) tooltipNext.addEventListener('click', nextOnboardingStep);
  if (tooltipSkip) tooltipSkip.addEventListener('click', skipOnboarding);
  
  // =========================================================================
  // EVENT LISTENERS
  // =========================================================================
  startCameraBtn.addEventListener('click', startCamera);
  
  stopCameraBtn.addEventListener('click', () => {
    if (isRecording) {
      if (confirm('Stop recording and discard?')) {
        stopRecording();
        stopCamera();
      }
    } else {
      stopCamera();
    }
  });
  
  toggleScanFxBtn.addEventListener('click', () => {
    isScanFxVisible = !isScanFxVisible;
    if (scanOverlay) {
      scanOverlay.style.display = isScanFxVisible ? 'block' : 'none';
    }
    toggleScanFxBtn.innerHTML = isScanFxVisible ? 
      '<i class="fas fa-magic"></i>' : 
      '<i class="fas fa-magic" style="opacity: 0.5;"></i>';
    toggleScanFxBtn.setAttribute('aria-label', isScanFxVisible ? 'Hide scan effect' : 'Show scan effect');
    showToast(isScanFxVisible ? 'Scanning effect: ON' : 'Scanning effect: OFF', 'info', 1500);
  });
  
  captureFrameBtn.addEventListener('click', captureCurrentFrame);
  
  recordVideoBtn.addEventListener('click', () => {
    if (!isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  });
  
  undoFrameBtn.addEventListener('click', undoLastFrame);
  
  proceedBtn.addEventListener('click', () => handleProceedToAnalysis());
  
  async function handleProceedToAnalysis() {
    let framesToCheck;
    if (captureMode === 'video') {
      framesToCheck = reviewFrames.map(f => f.dataUrl);
    } else if (assessmentMode === 'isolate') {
      framesToCheck = capturedFrames;
    } else {
      framesToCheck = Object.values(allCapturedFrames).flat();
    }
    
    const totalFrames = framesToCheck.length;
    
    if (totalFrames === 0) {
      showToast('No frames captured', 'error');
      return;
    }
    
    if (!currentUser) {
      showToast('Please login to analyze', 'error');
      const loginBtn = document.getElementById('loginBtn');
      if (loginBtn) loginBtn.click();
      return;
    }
    
    if (!canGenerateMore()) {
      showLimitModal();
      return;
    }
    
    const qualityCheck = await validateImageQuality(framesToCheck);
    if (!qualityCheck.valid) {
      showToast(qualityCheck.reason, 'error', 5000);
      return;
    }
    if (qualityCheck.warning) {
      showToast(qualityCheck.reason, 'warning', 4000);
    }
    
    setStage(3);
    analysisStatus.textContent = 'Sending frames to AI...';
    progressBar.style.width = '15%';
    resetAnalysisSteps();
    
    try {
      analysisStatus.textContent = 'Analyzing range of motion...';
      progressBar.style.width = '30%';
      
      const result = await analyzeROM();
      
      if (result.startsWith('ERROR:')) {
        const errorMessage = result.substring(6).trim();
        showToast(errorMessage, 'error', 6000);
        setStage(captureMode === 'video' ? 2 : 1);
        progressBar.style.width = '0%';
        return;
      }
      
      progressBar.style.width = '100%';
      analysisResults = result;
      
      const historyKey = await saveToHistory(result);
      
      incrementGenerationCount();
      
      showPreviewModal(result, historyKey);
      
      setStage(1);
      resetCapture();
      
      if (currentMovement) {
        promptIndex = 0;
        currentPrompt.textContent = currentMovement.prompts[0];
        if (assessmentMode === 'full') {
          promptStep.textContent = `Movement 1/${movementQueue.length} · 0/${currentMovement.requiredFrames} frames`;
        } else {
          promptStep.textContent = `0/${currentMovement.requiredFrames}`;
        }
      }
      
      startCameraBtn.disabled = !currentMovement;
      startCameraBtn.style.display = 'block';
      stopCameraBtn.style.display = 'none';
      toggleScanFxBtn.style.display = 'none';
      expandCameraBtn.style.display = 'none';
      captureBtnContainer.style.display = 'none';
      
      showToast('Analysis complete! View full report in new tab.', 'success');
      
    } catch (err) {
      console.error('Analysis error:', err);
      showToast('Analysis failed: ' + err.message, 'error');
      setStage(captureMode === 'video' ? 2 : 1);
    } finally {
      progressBar.style.width = '0%';
      resetAnalysisSteps();
    }
  }
  
  confirmReviewBtn.addEventListener('click', () => {
    capturedFrames = reviewFrames.map(f => f.dataUrl);
    setStage(3);
    analysisStatus.textContent = 'Sending frames to AI...';
    progressBar.style.width = '15%';
    resetAnalysisSteps();
    handleProceedToAnalysis();
  });
  
  retakeVideoBtn.addEventListener('click', () => {
    if (reviewVideo.src) {
      URL.revokeObjectURL(reviewVideo.src);
    }
    reviewFrames = [];
    videoBlob = null;
    recordedChunks = [];
    setStage(1);
    startCamera();
    showToast('Camera restarted. Record a new video.', 'info');
  });
  
  newScanBtn.addEventListener('click', () => {
    resetCapture();
    setStage(1);
    analysisResults = null;
    romResultsContent.innerHTML = '';
    
    if (currentMovement) {
      promptIndex = 0;
      currentPrompt.textContent = currentMovement.prompts[0];
      if (assessmentMode === 'full') {
        promptStep.textContent = `Movement 1/${movementQueue.length} · 0/${currentMovement.requiredFrames} frames`;
        movementInstruction.textContent = `Full Assessment: ${currentMovement.name} (1/${movementQueue.length})`;
      } else {
        promptStep.textContent = `0/${currentMovement.requiredFrames}`;
        movementInstruction.textContent = `Prepare for ${currentMovement.name}`;
      }
    }
    
    startCameraBtn.disabled = !currentMovement;
    startCameraBtn.style.display = 'block';
    stopCameraBtn.style.display = 'none';
    toggleScanFxBtn.style.display = 'none';
    expandCameraBtn.style.display = 'none';
    captureBtnContainer.style.display = 'none';
  });
  
  copyResultsBtn.addEventListener('click', () => {
    if (analysisResults) {
      navigator.clipboard.writeText(analysisResults)
        .then(() => showToast('Results copied to clipboard', 'success'))
        .catch(() => showToast('Failed to copy', 'error'));
    }
  });
  
  if (downloadRomReport) {
    downloadRomReport.style.display = 'none';
  }
  
  if (toggleHistoryBtn) {
    toggleHistoryBtn.addEventListener('click', toggleHistoryDrawer);
  }
  
  if (closeDrawerBtn) {
    closeDrawerBtn.addEventListener('click', () => {
      historyDrawer.classList.remove('active');
    });
  }
  
  historySearchInput.addEventListener('input', () => {
    clearSearchBtn.style.display = historySearchInput.value ? 'inline-flex' : 'none';
    loadRomHistory();
  });
  
  clearSearchBtn.addEventListener('click', () => {
    historySearchInput.value = '';
    clearSearchBtn.style.display = 'none';
    loadRomHistory();
    historySearchInput.focus();
  });
  
  document.addEventListener('click', (e) => {
    if (historyDrawer && historyDrawer.classList.contains('active') &&
        !historyDrawer.contains(e.target) &&
        e.target !== toggleHistoryBtn &&
        !toggleHistoryBtn?.contains(e.target)) {
      historyDrawer.classList.remove('active');
    }
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (isCameraFullscreen) {
        toggleCameraFullscreen();
        return;
      }
      if (historyDrawer && historyDrawer.classList.contains('active')) {
        historyDrawer.classList.remove('active');
      }
      if (limitModal && limitModal.style.display === 'flex') {
        hideLimitModal();
      }
    }
    
    if (e.key === ' ' && isCameraActive && captureMode === 'photo' && 
        !e.target.closest('input, textarea, select, button')) {
      e.preventDefault();
      captureCurrentFrame();
    }
  });
  
  upgradeFromLimitBtn.addEventListener('click', () => {
    hideLimitModal();
    goToSubscription();
  });
  
  closeLimitModalBtn.addEventListener('click', hideLimitModal);
  
  limitModal.addEventListener('click', (e) => {
    if (e.target === limitModal) hideLimitModal();
  });
  
  // =========================================================================
  // PLAN UPDATE LISTENER
  // =========================================================================
  document.addEventListener('planUpdated', (e) => {
    const newPlan = e.detail?.plan || 'free';
    if (newPlan !== currentPlan) {
      currentPlan = newPlan;
      console.log('[ROM] Plan updated to:', currentPlan);
      
      loadGenerationData();
      updatePlanUI();
      
      if (assessmentMode === 'isolate' && !canUseIsolateMode()) {
        assessmentMode = 'full';
        radioFull.checked = true;
        populateJointSelect('full');
        jointSelect.value = '';
        startCameraBtn.disabled = true;
        movementPromptBox.style.display = 'none';
        queueNavigation.style.display = 'none';
        resetCapture();
      }
    }
  });

  if (window.rehabPlans) {
    currentPlan = window.rehabPlans.getCurrentPlan() || 'free';
    console.log('[ROM] Initial plan:', currentPlan);
  }
  
  // =========================================================================
  // THEME
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
  // AUTH STATE LISTENER
  // =========================================================================
  firebase.auth().onAuthStateChanged((user) => {
    currentUser = user;
    if (user) {
      console.log('User logged in:', user.email);
      loadRomHistory();
      if (toggleHistoryBtn) toggleHistoryBtn.style.display = 'block';
    } else {
      console.log('User logged out');
      if (toggleHistoryBtn) toggleHistoryBtn.style.display = 'none';
    }
  });
  
  // =========================================================================
  // INITIALIZATION
  // =========================================================================
  async function initialize() {
    console.log('[ROM] Initializing...');
    
    loadGenerationData();
    
    if (!canUseIsolateMode()) {
      assessmentMode = 'full';
      if (radioFull) radioFull.checked = true;
    } else {
      assessmentMode = 'isolate';
      if (radioIsolate) radioIsolate.checked = true;
    }
    
    populateJointSelect(assessmentMode);
    setStage(1);
    resetCapture();
    
    updatePlanUI();
    
    startCameraBtn.style.display = 'block';
    stopCameraBtn.style.display = 'none';
    toggleScanFxBtn.style.display = 'none';
    expandCameraBtn.style.display = 'none';
    captureBtnContainer.style.display = 'none';
    
    if (scanOverlay) {
      scanOverlay.style.display = 'none';
    }
    if (recordingIndicator) {
      recordingIndicator.style.display = 'none';
    }
    
    if (toggleHistoryBtn) toggleHistoryBtn.style.display = 'none';
    
    fetchTokens();
    
    setTimeout(showOnboarding, 1000);
    
    console.log('[ROM] Initialized - Plan:', currentPlan, '| Mode:', assessmentMode, '| Capture:', captureMode);
  }
  
  initialize();
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
    }
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
    }
    if (reviewVideo && reviewVideo.src) {
      URL.revokeObjectURL(reviewVideo.src);
    }
    clearInterval(recordingTimer);
    
    if (isCameraFullscreen) {
      document.body.classList.remove('camera-fullscreen-active');
    }
  });
  
  console.log('ROM Analyzer initialized with fixes: non-finite duration, fullscreen body class, icon-only stop button, floating bar order');
});