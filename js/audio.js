// js/audio.js — Audio Transcription: live recording or file upload, chunked
// Whisper transcription, a careful non-hallucinating AI cleanup pass, and
// local-first persistence so a reload/crash/background-tab never loses
// a recording in progress.

document.addEventListener('DOMContentLoaded', () => {
  const database = firebase.database();

  // =========================================================================
  // CONSTANTS
  // =========================================================================
  const DB_NAME = 'rehablix_audio_db';
  const DB_VERSION = 1;
  const STORE_SESSIONS = 'sessions';
  const STORE_CHUNKS = 'chunks';
  const CHUNK_INTERVAL_MS = 60000; // record in ~1 minute segments
  const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // Whisper's practical file-size ceiling
  const CLEANUP_CHUNK_CHARS = 6000; // split very long transcripts before the AI cleanup pass

  // =========================================================================
  // DOM REFS
  // =========================================================================
  const $ = (id) => document.getElementById(id);

  const resumeBanner = $('resumeBanner');
  const resumeBannerText = $('resumeBannerText');
  const resumeSessionBtn = $('resumeSessionBtn');
  const discardSessionBtn = $('discardSessionBtn');

  const stageSetup = $('stageSetup');
  const stageRecord = $('stageRecord');
  const stageProcessing = $('stageProcessing');
  const stageResult = $('stageResult');
  const progressSteps = document.querySelectorAll('.progress-step');

  const sessionTitleInput = $('sessionTitle');
  const sessionTypeSelect = $('sessionType');
  const sourceModeTabs = $('sourceModeTabs');
  const liveSetupPanel = $('liveSetupPanel');
  const uploadSetupPanel = $('uploadSetupPanel');
  const startSetupBtn = $('startSetupBtn');

  const uploadDropzone = $('uploadDropzone');
  const audioFileInput = $('audioFileInput');
  const uploadFileInfo = $('uploadFileInfo');
  const transcribeUploadBtn = $('transcribeUploadBtn');

  const recIndicator = $('recIndicator');
  const recStatusText = $('recStatusText');
  const recTimer = $('recTimer');
  const waveformCanvas = $('waveformCanvas');
  const pauseResumeBtn = $('pauseResumeBtn');
  const stopRecordingBtn = $('stopRecordingBtn');
  const liveTranscriptText = $('liveTranscriptText');

  const processingTitle = $('processingTitle');
  const processingStatus = $('processingStatus');
  const processingProgressFill = $('processingProgressFill');

  const resultTitle = $('resultTitle');
  const resultMeta = $('resultMeta');
  const newSessionBtn = $('newSessionBtn');
  const viewCleanedBtn = $('viewCleanedBtn');
  const viewRawBtn = $('viewRawBtn');
  const transcriptTextarea = $('transcriptTextarea');
  const copyTranscriptBtn = $('copyTranscriptBtn');
  const downloadTranscriptBtn = $('downloadTranscriptBtn');
  const downloadAudioBtn = $('downloadAudioBtn');
  const saveTranscriptBtn = $('saveTranscriptBtn');

  const toggleHistoryBtn = $('toggleHistoryBtn');
  const historyDrawer = $('historyDrawer');
  const closeDrawerBtn = $('closeDrawerBtn');
  const historyList = $('historyList');

  // =========================================================================
  // STATE
  // =========================================================================
  let currentUser = null;
  let scopeUid = null; // center owner's uid for center members, own uid otherwise
  let aiConfig = { token: null, endpoint: null, model: 'openai/gpt-4.1' };
  let idb = null;

  let sourceMode = 'live'; // 'live' | 'upload'
  let localSessionId = null;
  let sessionMeta = null; // { title, sessionType, sourceType, startedAt, pausedAccumMs, mimeType }
  let mediaStream = null;
  let mediaRecorder = null;
  let chunkIndex = 0;
  let isPaused = false;
  let timerInterval = null;
  let pauseStartedAt = null;
  let wakeLockSentinel = null;
  let transcriptionQueue = [];
  let queueRunning = false;
  let pendingQueueCount = 0;
  let rawSegments = []; // ordered array of transcribed text per chunk index
  let cleanedTranscript = '';
  let audioContext = null, analyser = null, waveformRAF = null;
  let uploadedFile = null;
  let firebaseAudioId = null; // once saved, the history record's key
  let currentView = 'cleaned';
  let recordedMimeType = 'audio/webm';

  // =========================================================================
  // TOAST (self-contained, matches the rest of the app's look)
  // =========================================================================
  function showToast(message, type = 'success', duration = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = 'background:var(--surface,#222);color:var(--text-primary,#fff);padding:0.7rem 1.1rem;border-radius:0.6rem;margin-top:0.5rem;box-shadow:0 6px 20px rgba(0,0,0,0.2);font-size:0.85rem;border-left:4px solid ' +
      (type === 'error' ? '#ef4444' : type === 'info' ? '#3b82f6' : '#22c55e');
    container.appendChild(toast);
    setTimeout(() => toast.remove(), duration);
  }

  // =========================================================================
  // INDEXEDDB — local-first persistence so nothing is lost on reload/crash
  // =========================================================================
  function openIDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => { idb = request.result; resolve(idb); };
      request.onupgradeneeded = (e) => {
        const d = e.target.result;
        if (!d.objectStoreNames.contains(STORE_SESSIONS)) d.createObjectStore(STORE_SESSIONS, { keyPath: 'id' });
        if (!d.objectStoreNames.contains(STORE_CHUNKS)) d.createObjectStore(STORE_CHUNKS, { keyPath: 'key' });
      };
    });
  }

  async function idbPutSession(session) {
    if (!idb) await openIDB();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction([STORE_SESSIONS], 'readwrite');
      tx.objectStore(STORE_SESSIONS).put(session);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function idbGetSession(id) {
    if (!idb) await openIDB();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction([STORE_SESSIONS], 'readonly');
      const req = tx.objectStore(STORE_SESSIONS).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbGetAllSessions() {
    if (!idb) await openIDB();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction([STORE_SESSIONS], 'readonly');
      const req = tx.objectStore(STORE_SESSIONS).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbDeleteSession(id) {
    if (!idb) await openIDB();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction([STORE_SESSIONS], 'readwrite');
      tx.objectStore(STORE_SESSIONS).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function idbPutChunk(sessionId, index, blob) {
    if (!idb) await openIDB();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction([STORE_CHUNKS], 'readwrite');
      tx.objectStore(STORE_CHUNKS).put({ key: `${sessionId}_${index}`, sessionId, index, blob });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function idbGetChunksForSession(sessionId) {
    if (!idb) await openIDB();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction([STORE_CHUNKS], 'readonly');
      const req = tx.objectStore(STORE_CHUNKS).getAll();
      req.onsuccess = () => {
        const all = (req.result || []).filter(c => c.sessionId === sessionId);
        all.sort((a, b) => a.index - b.index);
        resolve(all);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async function idbDeleteChunksForSession(sessionId) {
    const chunks = await idbGetChunksForSession(sessionId);
    if (!idb) await openIDB();
    return new Promise((resolve, reject) => {
      const tx = idb.transaction([STORE_CHUNKS], 'readwrite');
      const store = tx.objectStore(STORE_CHUNKS);
      chunks.forEach(c => store.delete(c.key));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  function newSessionId() {
    return 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
  }

  // =========================================================================
  // STAGE SWITCHING
  // =========================================================================
  function setStage(n) {
    [stageSetup, stageRecord, stageProcessing, stageResult].forEach(s => s.classList.remove('active'));
    [stageSetup, stageRecord, stageProcessing, stageResult][n - 1].classList.add('active');
    progressSteps.forEach(step => {
      const stepNum = parseInt(step.dataset.step, 10);
      step.classList.toggle('active', stepNum === Math.min(n, 3));
      step.classList.toggle('completed', stepNum < n);
    });
  }

  // =========================================================================
  // SOURCE MODE TABS (Record Live vs Upload File)
  // =========================================================================
  sourceModeTabs.querySelectorAll('.source-mode-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      sourceModeTabs.querySelectorAll('.source-mode-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      sourceMode = btn.dataset.source;
      liveSetupPanel.style.display = sourceMode === 'live' ? 'block' : 'none';
      uploadSetupPanel.style.display = sourceMode === 'upload' ? 'block' : 'none';
    });
  });

  // =========================================================================
  // UPLOAD FLOW
  // =========================================================================
  uploadDropzone.addEventListener('click', () => audioFileInput.click());
  uploadDropzone.addEventListener('dragover', (e) => { e.preventDefault(); uploadDropzone.classList.add('dragover'); });
  uploadDropzone.addEventListener('dragleave', () => uploadDropzone.classList.remove('dragover'));
  uploadDropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadDropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFileSelected(e.dataTransfer.files[0]);
  });
  audioFileInput.addEventListener('change', () => {
    if (audioFileInput.files[0]) handleFileSelected(audioFileInput.files[0]);
  });

  function handleFileSelected(file) {
    if (!file.type.startsWith('audio/') && !/\.(mp3|wav|m4a|webm|ogg|aac|flac)$/i.test(file.name)) {
      showToast('Please choose an audio file', 'error');
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      showToast('That file is over 25MB. Please trim it or split it into shorter clips.', 'error', 5000);
      return;
    }
    uploadedFile = file;
    uploadFileInfo.style.display = 'flex';
    uploadFileInfo.innerHTML = `<i class="fas fa-file-audio"></i> ${escapeHtml(file.name)} (${(file.size / 1024 / 1024).toFixed(1)}MB)`;
    transcribeUploadBtn.disabled = false;
  }

  transcribeUploadBtn.addEventListener('click', async () => {
    if (!uploadedFile || !currentUser) return;
    if (scopeUid === null) { showToast('Your access to Audio Transcription has been turned off by your center admin.', 'error', 6000); return; }

    localSessionId = newSessionId();
    sessionMeta = {
      id: localSessionId,
      title: sessionTitleInput.value.trim() || defaultTitle(),
      sessionType: sessionTypeSelect.value,
      sourceType: 'upload',
      status: 'transcribing',
      startedAt: new Date().toISOString(),
      elapsedSeconds: 0,
      rawSegments: [],
      cleanedTranscript: '',
      mimeType: uploadedFile.type || 'audio/mpeg'
    };
    await idbPutSession(sessionMeta);

    setStage(3);
    showProcessing('Transcribing your file…', 'This can take a moment for longer recordings.', 10);

    try {
      const text = await transcribeBlob(uploadedFile);
      rawSegments = [text || ''];
      sessionMeta.rawSegments = rawSegments;
      await idbPutSession(sessionMeta);
      await finalizeSession();
    } catch (err) {
      console.error(err);
      showToast('Transcription failed: ' + err.message, 'error', 5000);
      setStage(1);
    }
  });

  // =========================================================================
  // LIVE RECORDING FLOW
  // =========================================================================
  startSetupBtn.addEventListener('click', startNewRecording);

  async function startNewRecording() {
    if (!currentUser) { showToast('Please log in first', 'error'); return; }
    if (scopeUid === null) { showToast('Your access to Audio Transcription has been turned off by your center admin.', 'error', 6000); return; }

    if (!window.isSecureContext) {
      showToast('Microphone access needs a secure connection (https://). This page must be opened via your website URL, not a local file.', 'error', 7000);
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showToast('This browser doesn\'t support microphone recording. Please try an up-to-date Chrome, Safari, or Firefox.', 'error', 6000);
      return;
    }

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.error('getUserMedia failed:', err.name, err.message);
      const messages = {
        NotAllowedError: 'Microphone permission was denied for this site. Check your browser\'s site settings (not just the app-level OS permission) and allow microphone access for rehablix, then reload.',
        PermissionDeniedError: 'Microphone permission was denied for this site. Check your browser\'s site settings and allow microphone access for rehablix, then reload.',
        NotFoundError: 'No microphone was found on this device.',
        NotReadableError: 'Your microphone is being used by another app. Close other apps using it and try again.',
        OverconstrainedError: 'No microphone matches the requested settings.',
        SecurityError: 'Microphone access was blocked for security reasons on this page.'
      };
      showToast(messages[err.name] || `Couldn't access the microphone (${err.name || 'unknown error'}). Please check your browser's site permissions.`, 'error', 7000);
      return;
    }

    localSessionId = newSessionId();
    chunkIndex = 0;
    rawSegments = [];
    isPaused = false;

    recordedMimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm'
      : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4'
      : '';

    sessionMeta = {
      id: localSessionId,
      title: sessionTitleInput.value.trim() || defaultTitle(),
      sessionType: sessionTypeSelect.value,
      sourceType: 'live',
      status: 'recording',
      startedAt: new Date().toISOString(),
      elapsedSeconds: 0,
      rawSegments: [],
      cleanedTranscript: '',
      mimeType: recordedMimeType || 'audio/webm'
    };
    await idbPutSession(sessionMeta);

    beginRecorder();
  }

  function beginRecorder() {
    mediaRecorder = recordedMimeType
      ? new MediaRecorder(mediaStream, { mimeType: recordedMimeType })
      : new MediaRecorder(mediaStream);

    mediaRecorder.ondataavailable = async (e) => {
      if (!e.data || e.data.size === 0) return;
      const idx = chunkIndex++;
      await idbPutChunk(localSessionId, idx, e.data);
      enqueueTranscription(idx, e.data);
    };

    mediaRecorder.onstop = () => {
      if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
      releaseWakeLock();
    };

    mediaRecorder.start(CHUNK_INTERVAL_MS);
    requestWakeLock();
    setupWaveform();
    startTimer();

    recIndicator.classList.remove('paused');
    recStatusText.textContent = 'Recording';
    pauseResumeBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
    liveTranscriptText.innerHTML = '<span class="transcript-placeholder">Your words will appear here as each segment finishes transcribing…</span>';

    setStage(2);
    showToast('Recording started — you can switch tabs, it keeps going.', 'info', 3500);
  }

  pauseResumeBtn.addEventListener('click', async () => {
    if (!mediaRecorder) return;
    if (isPaused) {
      mediaRecorder.resume();
      isPaused = false;
      recIndicator.classList.remove('paused');
      recStatusText.textContent = 'Recording';
      pauseResumeBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
      if (pauseStartedAt) {
        sessionMeta.pausedAccumMs = (sessionMeta.pausedAccumMs || 0) + (Date.now() - pauseStartedAt);
        pauseStartedAt = null;
      }
      startTimer();
      requestWakeLock();
    } else {
      mediaRecorder.pause();
      isPaused = true;
      pauseStartedAt = Date.now();
      recIndicator.classList.add('paused');
      recStatusText.textContent = 'Paused';
      pauseResumeBtn.innerHTML = '<i class="fas fa-play"></i> Resume';
      stopTimer();
      sessionMeta.status = 'paused';
      idbPutSession(sessionMeta);
      releaseWakeLock();
    }
  });

  stopRecordingBtn.addEventListener('click', async () => {
    if (!mediaRecorder) return;
    stopTimer();
    stopWaveform();
    sessionMeta.status = 'transcribing';
    await idbPutSession(sessionMeta);

    mediaRecorder.stop();

    showProcessing('Finishing up transcription…', 'Wrapping up the last few segments.', 40);
    setStage(3);

    // Give the final ondataavailable a moment to fire and enqueue, then wait for the queue.
    setTimeout(async () => {
      await waitForTranscriptionQueue();
      sessionMeta.rawSegments = rawSegments;
      await idbPutSession(sessionMeta);
      await finalizeSession();
    }, 400);
  });

  // ---- Timer (drift-proof: computed from real timestamps, not just tick count) ----
  function startTimer() {
    stopTimer();
    const baseStartedAt = new Date(sessionMeta.startedAt).getTime();
    timerInterval = setInterval(() => {
      const pausedMs = sessionMeta.pausedAccumMs || 0;
      const elapsedMs = Date.now() - baseStartedAt - pausedMs;
      const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000));
      sessionMeta.elapsedSeconds = totalSeconds;
      recTimer.textContent = formatTime(totalSeconds);
    }, 500);
  }

  function stopTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  }

  function formatTime(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  }

  // ---- Waveform visualizer (cosmetic; pauses automatically if tab is hidden) ----
  function setupWaveform() {
    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(mediaStream);
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      drawWaveform();
    } catch (err) {
      console.warn('Waveform visualizer unavailable:', err);
    }
  }

  function drawWaveform() {
    if (!analyser || document.hidden) { waveformRAF = requestAnimationFrame(drawWaveform); return; }
    const ctx = waveformCanvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    const w = waveformCanvas.width = waveformCanvas.clientWidth;
    const h = waveformCanvas.height;
    ctx.clearRect(0, 0, w, h);
    const barWidth = (w / bufferLength) * 2.5;
    let x = 0;
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--audio-accent').trim() || '#7c3aed';
    ctx.fillStyle = accent;
    for (let i = 0; i < bufferLength; i++) {
      const barHeight = (dataArray[i] / 255) * h;
      ctx.fillRect(x, h - barHeight, barWidth, barHeight);
      x += barWidth + 1;
    }
    waveformRAF = requestAnimationFrame(drawWaveform);
  }

  function stopWaveform() {
    if (waveformRAF) cancelAnimationFrame(waveformRAF);
    waveformRAF = null;
    if (audioContext) { audioContext.close().catch(() => {}); audioContext = null; }
    analyser = null;
  }

  // ---- Wake Lock: keep the screen on while actively recording, where supported ----
  async function requestWakeLock() {
    try {
      if ('wakeLock' in navigator) {
        wakeLockSentinel = await navigator.wakeLock.request('screen');
      }
    } catch (err) {
      // Not fatal — recording still continues, the screen may just dim/lock.
      console.warn('Wake lock unavailable:', err);
    }
  }

  function releaseWakeLock() {
    if (wakeLockSentinel) {
      wakeLockSentinel.release().catch(() => {});
      wakeLockSentinel = null;
    }
  }

  document.addEventListener('visibilitychange', () => {
    // Re-acquire the wake lock if the tab regains visibility mid-recording
    // (the OS releases it automatically when a tab is hidden).
    if (document.visibilityState === 'visible' && mediaRecorder && mediaRecorder.state === 'recording') {
      requestWakeLock();
    }
  });

  // =========================================================================
  // TRANSCRIPTION QUEUE — chunks are transcribed one at a time, in the
  // background, as they're recorded, so the transcript grows "live" and a
  // stop doesn't leave a mountain of untranscribed audio behind.
  // =========================================================================
  function enqueueTranscription(index, blob) {
    transcriptionQueue.push({ index, blob });
    pendingQueueCount++;
    if (!queueRunning) runQueue();
  }

  async function runQueue() {
    queueRunning = true;
    while (transcriptionQueue.length > 0) {
      const { index, blob } = transcriptionQueue.shift();
      try {
        const text = await transcribeBlob(blob);
        rawSegments[index] = text || '';
        appendLiveTranscript(text);
        sessionMeta.rawSegments = rawSegments;
        idbPutSession(sessionMeta); // fire-and-forget autosave of progress
      } catch (err) {
        console.error('Chunk transcription failed:', err);
        rawSegments[index] = rawSegments[index] || '';
      }
      pendingQueueCount = Math.max(0, pendingQueueCount - 1);
    }
    queueRunning = false;
  }

  function waitForTranscriptionQueue() {
    return new Promise((resolve) => {
      const check = () => {
        if (!queueRunning && transcriptionQueue.length === 0) resolve();
        else setTimeout(check, 250);
      };
      check();
    });
  }

  function appendLiveTranscript(text) {
    if (!text) return;
    const placeholder = liveTranscriptText.querySelector('.transcript-placeholder');
    if (placeholder) placeholder.remove();
    const span = document.createElement('span');
    span.className = 'transcript-segment';
    span.textContent = (liveTranscriptText.textContent ? ' ' : '') + text;
    liveTranscriptText.appendChild(span);
    liveTranscriptText.scrollTop = liveTranscriptText.scrollHeight;
  }

  // =========================================================================
  // WHISPER TRANSCRIPTION (single blob/file -> text)
  // =========================================================================
  async function transcribeBlob(blob) {
    if (!aiConfig.token) await loadAiConfig();
    if (!aiConfig.token) throw new Error('Transcription service is not configured right now.');

    const formData = new FormData();
    const filename = blob.name || `audio.${(blob.type || 'audio/webm').split('/')[1]?.split(';')[0] || 'webm'}`;
    formData.append('file', blob, filename);
    formData.append('model', 'whisper-1');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${aiConfig.token}` },
      body: formData
    });

    if (!response.ok) {
      let msg = 'Transcription request failed';
      try { const err = await response.json(); msg = err.error?.message || msg; } catch (e) {}
      throw new Error(msg);
    }
    const data = await response.json();
    return (data.text || '').trim();
  }

  async function loadAiConfig() {
    try {
      const tokens = await window.fetchTokens();
      if (tokens) {
        aiConfig.token = tokens.token;
        aiConfig.endpoint = tokens.endpoint;
      }
    } catch (err) {
      console.error('Could not load AI config:', err);
    }
  }

  // =========================================================================
  // AI CLEANUP PASS — punctuation/paragraphs/filler removal ONLY. No
  // rewriting, no summarizing, no invented content. Long transcripts are
  // split into pieces so nothing gets silently truncated by the model.
  // =========================================================================
  const CLEANUP_SYSTEM_PROMPT = `You are a transcript formatter, not a writer. You will receive a raw speech-to-text transcript from a clinical, therapy, or classroom audio recording. It may contain filler words, false starts, stutters, and missing punctuation.

Your ONLY job is to:
1. Add appropriate punctuation and paragraph breaks.
2. Remove obvious filler words (um, uh, you know, like) and exact word repetitions caused by stuttering or the speech engine.
3. Fix clear transcription artifacts (e.g. mis-joined or duplicated words from chunk boundaries).

You must NOT:
- Rephrase sentences or change word choice.
- Summarize, shorten, or omit content.
- Add information, explanations, or headings that were not spoken.
- Correct grammar beyond what's listed above — if a sentence is grammatically imperfect but its meaning is clear, leave it as spoken.
- Alter clinical, technical, or proper-noun terminology in any way.

Output ONLY the cleaned transcript text. No commentary, no preamble, no markdown formatting.`;

  function splitForCleanup(text) {
    if (text.length <= CLEANUP_CHUNK_CHARS) return [text];
    const pieces = [];
    let remaining = text;
    while (remaining.length > CLEANUP_CHUNK_CHARS) {
      let splitAt = remaining.lastIndexOf('. ', CLEANUP_CHUNK_CHARS);
      if (splitAt < CLEANUP_CHUNK_CHARS * 0.5) splitAt = CLEANUP_CHUNK_CHARS; // no good sentence break found
      pieces.push(remaining.slice(0, splitAt + 1));
      remaining = remaining.slice(splitAt + 1);
    }
    if (remaining.trim()) pieces.push(remaining);
    return pieces;
  }

  async function cleanupTranscript(rawText, onProgress) {
    if (!rawText || !rawText.trim()) return '';
    if (!aiConfig.token) await loadAiConfig();
    if (!aiConfig.token || !aiConfig.endpoint) return rawText; // graceful fallback: show raw text rather than fail entirely

    const pieces = splitForCleanup(rawText);
    const cleanedPieces = [];

    for (let i = 0; i < pieces.length; i++) {
      if (onProgress) onProgress(i, pieces.length);
      try {
        const url = `${aiConfig.endpoint.replace(/\/$/, '')}/chat/completions`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aiConfig.token}` },
          body: JSON.stringify({
            model: aiConfig.model,
            messages: [
              { role: 'system', content: CLEANUP_SYSTEM_PROMPT },
              { role: 'user', content: pieces[i] }
            ],
            max_tokens: 4000,
            temperature: 0.1
          })
        });
        if (!response.ok) throw new Error('Cleanup request failed');
        const data = await response.json();
        cleanedPieces.push(data.choices?.[0]?.message?.content?.trim() || pieces[i]);
      } catch (err) {
        console.error('Cleanup pass failed for a section, keeping raw text for it:', err);
        cleanedPieces.push(pieces[i]); // never lose content — fall back to raw for that piece
      }
    }
    return cleanedPieces.join('\n\n');
  }

  // =========================================================================
  // FINALIZE: run cleanup, save to Firebase history, update local state,
  // show the result screen.
  // =========================================================================
  async function finalizeSession() {
    const rawText = rawSegments.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

    showProcessing('Cleaning up the transcript…', 'Formatting punctuation and paragraphs — not changing your words.', 70);
    cleanedTranscript = await cleanupTranscript(rawText, (i, total) => {
      const pct = 70 + Math.round(((i + 1) / total) * 25);
      updateProcessingProgress(pct, `Cleaning section ${i + 1} of ${total}…`);
    });

    sessionMeta.rawTranscript = rawText;
    sessionMeta.cleanedTranscript = cleanedTranscript;
    sessionMeta.status = 'done';
    await idbPutSession(sessionMeta);

    showProcessing('Saving…', 'Almost done.', 95);
    try {
      const payload = {
        title: sessionMeta.title,
        sessionType: sessionMeta.sessionType,
        sourceType: sessionMeta.sourceType,
        createdAt: sessionMeta.startedAt,
        updatedAt: new Date().toISOString(),
        durationSeconds: sessionMeta.elapsedSeconds || 0,
        rawTranscript: rawText,
        cleanedTranscript: cleanedTranscript,
        isPublic: false
      };
      const ref = await database.ref(`history/${scopeUid}/audio`).push(payload);
      firebaseAudioId = ref.key;

      if (window.RehablixCenter) {
        window.RehablixCenter.logActivity('audio', 'Transcribed session', sessionMeta.title).catch(() => {});
      }
    } catch (err) {
      console.error('Could not save transcript to history:', err);
      showToast('Transcript ready, but saving to history failed — your text is still safe below.', 'error', 5000);
    }

    updateProcessingProgress(100, 'Done!');
    setTimeout(() => showResult(), 300);
  }

  function showProcessing(title, status, progressPct) {
    processingTitle.textContent = title;
    processingStatus.textContent = status;
    processingProgressFill.style.width = progressPct + '%';
  }

  function updateProcessingProgress(pct, status) {
    processingProgressFill.style.width = pct + '%';
    if (status) processingStatus.textContent = status;
  }

  function showResult() {
    resultTitle.textContent = sessionMeta.title;
    const dateStr = new Date(sessionMeta.startedAt).toLocaleString();
    resultMeta.textContent = `${capitalize(sessionMeta.sessionType)} · ${formatTime(sessionMeta.elapsedSeconds || 0)} · ${dateStr}`;
    currentView = 'cleaned';
    viewCleanedBtn.classList.add('active');
    viewRawBtn.classList.remove('active');
    transcriptTextarea.value = sessionMeta.cleanedTranscript || sessionMeta.rawTranscript || '';

    downloadAudioBtn.style.display = (sessionMeta.sourceType === 'live' && localSessionId) ? 'inline-flex' : 'none';

    setStage(4);
  }

  viewCleanedBtn.addEventListener('click', () => {
    currentView = 'cleaned';
    viewCleanedBtn.classList.add('active');
    viewRawBtn.classList.remove('active');
    transcriptTextarea.value = sessionMeta.cleanedTranscript || '';
  });

  viewRawBtn.addEventListener('click', () => {
    currentView = 'raw';
    viewRawBtn.classList.add('active');
    viewCleanedBtn.classList.remove('active');
    transcriptTextarea.value = sessionMeta.rawTranscript || '';
  });

  transcriptTextarea.addEventListener('input', () => {
    if (currentView === 'cleaned') sessionMeta.cleanedTranscript = transcriptTextarea.value;
    else sessionMeta.rawTranscript = transcriptTextarea.value;
  });

  copyTranscriptBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(transcriptTextarea.value)
      .then(() => showToast('Copied to clipboard', 'success'))
      .catch(() => showToast('Could not copy', 'error'));
  });

  downloadTranscriptBtn.addEventListener('click', () => {
    const blob = new Blob([transcriptTextarea.value], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(sessionMeta.title || 'transcript').replace(/[^\w\- ]/g, '')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  });

  downloadAudioBtn.addEventListener('click', async () => {
    try {
      const chunks = await idbGetChunksForSession(localSessionId);
      if (!chunks.length) { showToast('Audio is no longer available locally', 'error'); return; }
      const blob = new Blob(chunks.map(c => c.blob), { type: sessionMeta.mimeType || 'audio/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(sessionMeta.title || 'recording').replace(/[^\w\- ]/g, '')}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast('Could not prepare audio download', 'error');
    }
  });

  saveTranscriptBtn.addEventListener('click', async () => {
    if (!firebaseAudioId) { showToast('Nothing to save yet', 'error'); return; }
    try {
      await database.ref(`history/${scopeUid}/audio/${firebaseAudioId}`).update({
        cleanedTranscript: sessionMeta.cleanedTranscript,
        rawTranscript: sessionMeta.rawTranscript,
        title: sessionMeta.title,
        updatedAt: new Date().toISOString()
      });
      showToast('Saved', 'success');
      if (window.RehablixCenter) {
        window.RehablixCenter.logActivity('audio', 'Edited transcript', sessionMeta.title).catch(() => {});
      }
      // Local copy no longer needs to be kept once safely saved.
      if (localSessionId) {
        await idbDeleteChunksForSession(localSessionId);
        await idbDeleteSession(localSessionId);
      }
      loadHistory();
    } catch (err) {
      showToast('Save failed: ' + err.message, 'error');
    }
  });

  newSessionBtn.addEventListener('click', resetToSetup);

  function resetToSetup() {
    localSessionId = null;
    sessionMeta = null;
    rawSegments = [];
    cleanedTranscript = '';
    uploadedFile = null;
    firebaseAudioId = null;
    chunkIndex = 0;
    transcriptionQueue = [];
    uploadFileInfo.style.display = 'none';
    transcribeUploadBtn.disabled = true;
    audioFileInput.value = '';
    sessionTitleInput.value = '';
    setStage(1);
  }

  // =========================================================================
  // RESUME BANNER — an interrupted session (reload/crash mid-recording)
  // =========================================================================
  async function checkForInterruptedSession() {
    const all = await idbGetAllSessions();
    const interrupted = all.find(s => s.status === 'recording' || s.status === 'paused' || s.status === 'transcribing');
    if (!interrupted) return;

    localSessionId = interrupted.id;
    sessionMeta = interrupted;
    rawSegments = interrupted.rawSegments || [];

    const when = new Date(interrupted.startedAt).toLocaleString();
    resumeBannerText.textContent = `You have an unfinished recording ("${interrupted.title}") from ${when}.`;
    resumeBanner.style.display = 'flex';
  }

  resumeSessionBtn.addEventListener('click', async () => {
    resumeBanner.style.display = 'none';
    showProcessing('Picking up where you left off…', 'Finishing transcription of what was already recorded.', 30);
    setStage(3);
    await finalizeSession();
  });

  discardSessionBtn.addEventListener('click', async () => {
    if (sessionMeta) {
      await idbDeleteChunksForSession(sessionMeta.id);
      await idbDeleteSession(sessionMeta.id);
    }
    resumeBanner.style.display = 'none';
    resetToSetup();
    showToast('Discarded', 'info');
  });

  // Warn before leaving mid-recording — browsers show their own generic text.
  window.addEventListener('beforeunload', (e) => {
    if (sessionMeta && (sessionMeta.status === 'recording' || sessionMeta.status === 'paused')) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // =========================================================================
  // HISTORY DRAWER
  // =========================================================================
  toggleHistoryBtn.addEventListener('click', () => {
    if (!currentUser) { showToast('Please log in to view history', 'error'); document.getElementById('loginBtn')?.click(); return; }
    loadHistory();
    historyDrawer.classList.add('active');
  });
  closeDrawerBtn.addEventListener('click', () => historyDrawer.classList.remove('active'));

  async function loadHistory() {
    if (!scopeUid) return;
    try {
      const snap = await database.ref(`history/${scopeUid}/audio`).limitToLast(50).once('value');
      const val = snap.val() || {};
      const items = Object.keys(val).map(key => ({ key, ...val[key] })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      if (!items.length) {
        historyList.innerHTML = `<div class="empty-state"><i class='bx bx-folder-open'></i><p>No history found</p></div>`;
        return;
      }
      historyList.innerHTML = items.map(item => `
        <div class="audio-history-item" data-key="${item.key}">
          <div class="ahi-title">${escapeHtml(item.title || 'Untitled')}</div>
          <div class="ahi-meta">${capitalize(item.sessionType || '')} · ${formatTime(item.durationSeconds || 0)} · ${new Date(item.createdAt).toLocaleDateString()}</div>
        </div>
      `).join('');

      historyList.querySelectorAll('.audio-history-item').forEach(el => {
        el.addEventListener('click', () => openHistoryItem(el.dataset.key, val[el.dataset.key]));
      });
    } catch (err) {
      console.error('Could not load history:', err);
    }
  }

  function openHistoryItem(key, data) {
    firebaseAudioId = key;
    localSessionId = null; // no local audio for a re-opened saved item
    sessionMeta = {
      title: data.title,
      sessionType: data.sessionType,
      sourceType: data.sourceType,
      startedAt: data.createdAt,
      elapsedSeconds: data.durationSeconds,
      rawTranscript: data.rawTranscript,
      cleanedTranscript: data.cleanedTranscript
    };
    downloadAudioBtn.style.display = 'none';
    historyDrawer.classList.remove('active');
    showResult();
  }

  // =========================================================================
  // HELPERS
  // =========================================================================
  function defaultTitle() {
    const typeLabel = capitalize(sessionTypeSelect.value);
    return `${typeLabel} – ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  // =========================================================================
  // AUTH + SCOPE RESOLUTION + INIT
  // =========================================================================
  firebase.auth().onAuthStateChanged(async (user) => {
    currentUser = user;
    if (!user) {
      toggleHistoryBtn.style.display = 'none';
      return;
    }

    if (window.RehablixCenter && typeof window.RehablixCenter.getEffectiveScopeUid === 'function') {
      try { scopeUid = await window.RehablixCenter.getEffectiveScopeUid('audio'); }
      catch (err) { scopeUid = user.uid; }
    } else {
      scopeUid = user.uid;
    }

    if (scopeUid === null) {
      showToast('Your access to Audio Transcription has been turned off by your center admin.', 'error', 6000);
    } else if (scopeUid !== user.uid) {
      showToast('Working on your center\'s shared transcripts', 'info', 3000);
    }

    toggleHistoryBtn.style.display = 'block';
    await loadAiConfig();
    loadHistory();
  });

  openIDB().then(checkForInterruptedSession).catch(err => console.warn('IndexedDB unavailable:', err));
});
