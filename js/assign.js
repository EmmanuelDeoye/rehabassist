// js/assign.js – Modern Assignment Maker with Modal Upload, Outline, Preview Modal, History, Export

if (typeof marked !== 'undefined') {
  marked.setOptions({ breaks: true, gfm: true, headerIds: false, mangle: false });
}

document.addEventListener('DOMContentLoaded', async () => {

  // ===== DOM Elements =====
  const topicInput = document.getElementById('topicInput');
  const attachBtn = document.getElementById('attachBtn');
  const fileInput = document.getElementById('fileInput');
  const cameraInput = document.getElementById('cameraInput');
  const fileInfo = document.getElementById('fileInfo');
  const courseInput = document.getElementById('courseInput');
  const assignmentType = document.getElementById('assignmentType');
  const volumeCount = document.getElementById('volumeCount');
  const volumeType = document.getElementById('volumeType');
  const toneSelect = document.getElementById('toneSelect');
  const instructionsInput = document.getElementById('instructionsInput');
  const generateBtn = document.getElementById('generateBtn');

  // Outline
  const hasOutlineCheckbox = document.getElementById('hasOutline');
  const outlineInput = document.getElementById('outlineInput');
  const outlineHint = document.getElementById('outlineHint');

  // Upload Modal
  const uploadModal = document.getElementById('uploadModal');
  const closeUploadModalBtn = document.getElementById('closeUploadModal');
  const uploadOptions = document.querySelectorAll('.upload-option');

  // Results
  const resultsContainer = document.getElementById('resultsContainer');
  const resultsLoading = document.getElementById('resultsLoading');
  const resultEditor = document.getElementById('resultEditor');
  const resultDate = document.getElementById('resultDate');
  const copyResultBtn = document.getElementById('copyResultBtn');
  const downloadWordBtn = document.getElementById('downloadWordBtn');
  const downloadPdfBtn = document.getElementById('downloadPdfBtn');
  const regenerateBtn = document.getElementById('regenerateBtn');

  // Preview Modal
  const previewModal = document.getElementById('previewModal');
  const previewClose = document.getElementById('previewClose');
  const previewCloseBtn = document.getElementById('previewCloseBtn');
  const previewDate = document.getElementById('previewDate');
  const previewTopic = document.getElementById('previewTopic');
  const previewCourse = document.getElementById('previewCourse');
  const previewOutlineBadge = document.getElementById('previewOutlineBadge');
  const viewFullAssignmentBtn = document.getElementById('viewFullAssignmentBtn');

  // History
  const historyDrawer = document.getElementById('historyDrawer');
  const historyNavBtn = document.getElementById('historyNavBtn');
  const closeDrawerBtn = document.getElementById('closeDrawerBtn');
  const historyList = document.getElementById('historyList');
  const historySearchInput = document.getElementById('historySearchInput');

  // Toast
  const toastContainer = document.getElementById('toast-container');

  // ===== State =====
  let currentUser = null;
  let aiConfig = { token: null, endpoint: 'https://api.deepseek.com/v1', model: 'deepseek-chat' };
  let uploadedFileText = '';
  let uploadedFileName = '';
  let generatedHtml = '';
  let currentHistoryId = null;
  let isGenerating = false;
  let allHistoryEntries = [];

  const database = firebase.database();

  // ===== Helpers =====
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

  // ===== Form Validation =====
  function validateForm() {
    const hasTopic = topicInput.value.trim() !== '';
    const hasCourse = courseInput.value.trim() !== '';
    generateBtn.disabled = !(hasTopic && hasCourse) || isGenerating;
  }

  topicInput.addEventListener('input', validateForm);
  courseInput.addEventListener('input', validateForm);

  // ===== Outline Toggle =====
  hasOutlineCheckbox.addEventListener('change', () => {
    const show = hasOutlineCheckbox.checked;
    outlineInput.style.display = show ? 'block' : 'none';
    outlineHint.style.display = show ? 'flex' : 'none';
    if (show) {
      outlineInput.focus();
    }
  });

  // ===== Upload Modal =====
  function openUploadModal() {
    uploadModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeUploadModalFn() {
    uploadModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  attachBtn.addEventListener('click', (e) => {
    e.preventDefault();
    openUploadModal();
  });

  closeUploadModalBtn.addEventListener('click', closeUploadModalFn);
  document.querySelector('.upload-modal-overlay')?.addEventListener('click', closeUploadModalFn);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && uploadModal.classList.contains('active')) {
      closeUploadModalFn();
    }
  });

  uploadOptions.forEach(option => {
    option.addEventListener('click', () => {
      const action = option.dataset.action;
      closeUploadModalFn();
      if (action === 'camera') {
        cameraInput.click();
      } else if (action === 'photo') {
        fileInput.accept = 'image/*';
        fileInput.click();
      } else if (action === 'document') {
        fileInput.accept = '.pdf,.docx,.txt,.doc';
        fileInput.click();
      }
    });
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) {
      handleFileUpload(fileInput.files[0]);
    }
    fileInput.value = '';
  });

  cameraInput.addEventListener('change', () => {
    if (cameraInput.files.length) {
      handleFileUpload(cameraInput.files[0]);
    }
    cameraInput.value = '';
  });

  async function handleFileUpload(file) {
    if (!file) return;
    
    // Show loading feedback
    attachBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    attachBtn.disabled = true;
    
    try {
      const text = await extractText(file);
      uploadedFileText = text.substring(0, 15000);
      uploadedFileName = file.name;
      showFileChip(file.name);
      showToast('Reference document attached', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      attachBtn.innerHTML = '<i class="fas fa-plus"></i>';
      attachBtn.disabled = false;
    }
  }

  function showFileChip(name) {
    fileInfo.style.display = 'inline-flex';
    fileInfo.innerHTML = `
      <i class="fas fa-paperclip"></i>
      <span>${escapeHtml(name.length > 30 ? name.substring(0, 30) + '…' : name)}</span>
      <button class="remove-file" id="removeFile">&times;</button>`;
    document.getElementById('removeFile').addEventListener('click', () => {
      uploadedFileText = '';
      uploadedFileName = '';
      fileInfo.style.display = 'none';
    });
  }

  async function extractText(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    
    if (ext === 'txt') {
      const reader = new FileReader();
      return new Promise((resolve, reject) => {
        reader.onload = e => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Could not read the text file.'));
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
        const maxPages = Math.min(pdf.numPages, 20);
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
        throw new Error('Could not read this Word document. Please ensure it is not corrupted.');
      }
    }

    if (ext === 'doc') {
      throw new Error('Old .doc files are not supported. Please save as .docx or convert to PDF.');
    }

    if (file.type.startsWith('image/')) {
      return `[Image attached: ${file.name} - OCR not available in this version]`;
    }

    throw new Error('Unsupported file type. Please upload PDF, DOCX, TXT, or an image.');
  }

  async function loadMammoth() {
    if (window.mammoth) return window.mammoth;
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
      script.onload = () => resolve(window.mammoth);
      script.onerror = () => reject(new Error('Failed to load document converter.'));
      document.head.appendChild(script);
    });
  }

  // ===== Build Prompt =====
  function buildPrompt(topic, course, type, volume, unit, tone, instructions, fileContent) {
    const hasOutline = hasOutlineCheckbox.checked;
    const outlineText = outlineInput.value.trim();

    let outlineInstruction = '';
    if (hasOutline && outlineText) {
      outlineInstruction = `
STRUCTURE REQUIREMENT (CRITICAL):
You MUST follow this exact outline provided by the teacher/supervisor. Do NOT deviate from this structure:

${outlineText}

Follow this outline precisely while writing naturally within each section. Use the outline headings as your section headings.`;
    }

    return `Write a student assignment on "${topic}" for a ${course} course. It is a ${type} assignment.

Requirements:
- Length: approximately ${volume} ${unit}.
- Tone: ${tone}.
${instructions ? `- Additional instructions: ${instructions}` : ''}
${outlineInstruction}
${fileContent ? `- Reference material (use for background understanding only, do NOT copy directly): ${fileContent}` : ''}

CRITICAL WRITING STYLE INSTRUCTIONS:
1. Write in a genuinely human, student-like voice. Sound like a real healthcare student – use natural phrasing, occasional minor imperfections, personal reflections ("I observed that…", "I found this interesting because…", "In my experience…"), and vary sentence length. Avoid overly polished, robotic perfection.
2. Use markdown for structure (## headings, - bullet points). Do NOT wrap the entire output in a code block or HTML tags.
3. Start directly with the assignment title and content. Do NOT include any meta-commentary like "Here is the assignment" or "I have written the following".
4. Include some personal opinions and reflections where appropriate to sound more human.
5. The text must pass as human-written to both lecturers and AI detection tools.
6. Use natural transitions between sections – avoid formulaic phrases like "In conclusion" every time.`;
  }

  // ===== Generate Assignment =====
  generateBtn.addEventListener('click', async () => {
    if (isGenerating) return;

    // Validate outline if checkbox is checked
    if (hasOutlineCheckbox.checked && !outlineInput.value.trim()) {
      showToast('Please paste your outline or uncheck the outline option', 'error');
      outlineInput.focus();
      return;
    }

    if (!aiConfig.token) {
      const ok = await fetchTokens();
      if (!ok) {
        showToast('AI service not configured. Please try again later.', 'error');
        return;
      }
    }

    isGenerating = true;
    generateBtn.disabled = true;
    const originalBtnHtml = generateBtn.innerHTML;
    generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Generating…</span>';

    resultsContainer.style.display = 'none';
    resultsLoading.style.display = 'block';
    resultsLoading.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const topic = topicInput.value.trim();
    const course = courseInput.value.trim();
    const type = assignmentType.options[assignmentType.selectedIndex].text;
    const volume = volumeCount.value;
    const unit = volumeType.value === 'pages' ? 'pages' : 'words';
    const tone = toneSelect.options[toneSelect.selectedIndex].text;
    const instructions = instructionsInput.value.trim();
    const fileContent = uploadedFileText ? `\n\nReference material:\n${uploadedFileText}` : '';

    const prompt = buildPrompt(topic, course, type, volume, unit, tone, instructions, fileContent);

    try {
      const startTime = Date.now();
      
      const response = await fetch(`${aiConfig.endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aiConfig.token}`
        },
        body: JSON.stringify({
          model: aiConfig.model,
          messages: [
            { 
              role: 'system', 
              content: 'You are a skilled academic writer helping a healthcare student. You write naturally and authentically, never revealing that you are an AI. Your writing sounds human and passes AI detection.' 
            },
            { role: 'user', content: prompt }
          ],
          max_tokens: 3000,
          temperature: 0.8,
          top_p: 0.95
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error('[AI] API error:', errData);
        
        if (response.status === 401) {
          throw new Error('Authentication failed. Please contact support.');
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
      let raw = data.choices[0].message.content;
      
      // Clean up any code fences
      raw = raw.replace(/```html?/g, '').replace(/```/g, '').trim();
      generatedHtml = raw;

      // Update results editor
      resultEditor.innerHTML = generatedHtml;
      resultDate.textContent = new Date().toLocaleString();

      resultsLoading.style.display = 'none';
      resultsContainer.style.display = 'block';

      // Save to history if logged in
      if (currentUser) {
        currentHistoryId = await saveToHistory(generatedHtml);
      }

      // Show preview modal
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      showPreviewModal();
      showToast(`Assignment generated in ${elapsed}s`, 'success');

    } catch (err) {
      console.error('[GENERATE] Error:', err);
      
      let errorMessage = err.message;
      if (errorMessage.includes('API key') || errorMessage.includes('token')) {
        errorMessage = 'The AI service is not configured correctly. Please contact support.';
      } else if (errorMessage.toLowerCase().includes('rate')) {
        errorMessage = 'Too many requests. Please wait a moment and try again.';
      } else if (errorMessage.includes('busy') || errorMessage.includes('503')) {
        errorMessage = 'The service is temporarily busy. Please try again in a few minutes.';
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      
      showToast(`Error: ${errorMessage}`, 'error', 5000);
      resultsLoading.style.display = 'none';
    } finally {
      isGenerating = false;
      generateBtn.disabled = false;
      generateBtn.innerHTML = originalBtnHtml;
      validateForm();
    }
  });

  // ===== Preview Modal =====
  function showPreviewModal() {
    previewTopic.textContent = topicInput.value.trim();
    previewCourse.textContent = courseInput.value.trim();
    previewDate.textContent = new Date().toLocaleString();
    
    // Show outline badge if outline was used
    if (hasOutlineCheckbox.checked && outlineInput.value.trim()) {
      previewOutlineBadge.style.display = 'block';
    } else {
      previewOutlineBadge.style.display = 'none';
    }
    
    previewModal.style.display = 'flex';
    previewModal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closePreviewModal() {
    previewModal.style.display = 'none';
    previewModal.classList.remove('active');
    document.body.style.overflow = '';
    
    // Scroll to results
    setTimeout(() => {
      resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  if (previewClose) {
    previewClose.addEventListener('click', closePreviewModal);
  }
  
  if (previewCloseBtn) {
    previewCloseBtn.addEventListener('click', closePreviewModal);
  }
  
  const previewOverlay = document.querySelector('.preview-overlay');
  if (previewOverlay) {
    previewOverlay.addEventListener('click', closePreviewModal);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && previewModal.classList.contains('active')) {
      closePreviewModal();
    }
  });

  if (viewFullAssignmentBtn) {
    viewFullAssignmentBtn.addEventListener('click', () => {
      // Save the current assignment to localStorage for answer.html to read
      const assignmentData = {
        topic: topicInput.value.trim(),
        course: courseInput.value.trim(),
        type: assignmentType.options[assignmentType.selectedIndex].text,
        tone: toneSelect.options[toneSelect.selectedIndex].text,
        volume: volumeCount.value,
        volumeUnit: volumeType.value,
        hasOutline: hasOutlineCheckbox.checked,
        outline: hasOutlineCheckbox.checked ? outlineInput.value.trim() : '',
        html: resultEditor.innerHTML,
        historyId: currentHistoryId,
        generatedAt: new Date().toISOString()
      };
      localStorage.setItem('rehab_assignment_current', JSON.stringify(assignmentData));
      
      closePreviewModal();
      
      // Open answer.html
      if (currentHistoryId) {
        window.open(`answer.html?id=${currentHistoryId}`, '_blank');
      } else {
        window.open('answer.html', '_blank');
      }
    });
  }

  // ===== Save to History =====
  async function saveToHistory(html) {
    if (!currentUser) return null;
    
    try {
      const ref = await database.ref(`history/${currentUser.uid}/assignments`).push({
        topic: topicInput.value.trim(),
        course: courseInput.value.trim(),
        type: assignmentType.value,
        typeLabel: assignmentType.options[assignmentType.selectedIndex].text,
        tone: toneSelect.value,
        toneLabel: toneSelect.options[toneSelect.selectedIndex].text,
        volume: volumeCount.value,
        volumeUnit: volumeType.value,
        hasOutline: hasOutlineCheckbox.checked,
        outline: hasOutlineCheckbox.checked ? outlineInput.value.trim() : '',
        instructions: instructionsInput.value.trim(),
        html: html,
        plainPreview: resultEditor.innerText.substring(0, 200),
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString()
      });
      return ref.key;
    } catch (error) {
      console.error('Error saving to history:', error);
      return null;
    }
  }

  // ===== Toolbar Actions =====
  if (copyResultBtn) {
    copyResultBtn.addEventListener('click', () => {
      const text = resultEditor.innerText;
      navigator.clipboard.writeText(text)
        .then(() => {
          showToast('Copied to clipboard', 'success');
          // Visual feedback
          const icon = copyResultBtn.querySelector('i');
          if (icon) {
            const originalClass = icon.className;
            icon.className = 'fas fa-check';
            setTimeout(() => { icon.className = originalClass; }, 2000);
          }
        })
        .catch(() => showToast('Failed to copy', 'error'));
    });
  }

  if (downloadWordBtn) {
    downloadWordBtn.addEventListener('click', () => {
      const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Assignment - ${escapeHtml(topicInput.value || 'Untitled')}</title>
  <style>
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      line-height: 1.7;
      max-width: 800px;
      margin: 2rem auto;
      padding: 0 1.5rem;
      color: #222;
    }
    h1, h2, h3 { color: #00695c; margin-top: 1.5em; }
    p { margin: 0.8em 0; }
    ul, ol { padding-left: 1.5rem; margin: 0.5em 0; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f5f5f5; }
    blockquote { border-left: 4px solid #00695c; padding-left: 1rem; margin-left: 0; color: #555; }
    hr { border: none; border-top: 1px solid #ddd; margin: 2rem 0; }
    @media print { body { padding: 0.5in; } }
  </style>
</head>
<body>
  ${resultEditor.innerHTML}
  <hr>
  <p style="font-size: 0.8rem; color: #999; text-align: center;">
    Generated by rehablix Assignment Maker — ${new Date().toLocaleString()}
  </p>
</body>
</html>`;
      
      const blob = new Blob([fullHtml], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (topicInput.value || 'Assignment').slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_');
      a.download = `${safeName}_${new Date().toISOString().slice(0, 10)}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Downloaded as Word document', 'success');
    });
  }

  if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener('click', () => {
      window.print();
    });
  }

  if (regenerateBtn) {
    regenerateBtn.addEventListener('click', () => {
      if (isGenerating) {
        showToast('Please wait for the current generation to finish', 'error');
        return;
      }
      resultsContainer.style.display = 'none';
      generateBtn.click();
    });
  }

  // Auto-save on edit
  let autoSaveTimeout;
  resultEditor.addEventListener('input', () => {
    if (currentUser && currentHistoryId) {
      clearTimeout(autoSaveTimeout);
      autoSaveTimeout = setTimeout(() => {
        database.ref(`history/${currentUser.uid}/assignments/${currentHistoryId}`).update({
          html: resultEditor.innerHTML,
          plainPreview: resultEditor.innerText.substring(0, 200)
        });
        console.log('Assignment auto-saved');
      }, 2000);
    }
  });

  // ===== History Functions =====
  function loadHistoryList() {
    if (!currentUser) return;
    
    database.ref(`history/${currentUser.uid}/assignments`)
      .orderByChild('timestamp')
      .on('value', snap => {
        const data = snap.val();
        if (!historyList) return;
        
        historyList.innerHTML = '';
        
        if (!data) {
          historyList.innerHTML = `
            <div class="empty-state">
              <i class='bx bx-folder-open'></i>
              <p>No assignments yet</p>
              <small>Generated assignments will appear here</small>
            </div>`;
          return;
        }

        const entries = Object.entries(data)
          .sort((a, b) => (b[1].timestamp || 0) - (a[1].timestamp || 0));

        const searchTerm = historySearchInput?.value.toLowerCase().trim() || '';
        const filtered = entries.filter(([_, item]) => {
          if (!searchTerm) return true;
          return (item.topic || '').toLowerCase().includes(searchTerm) ||
                 (item.course || '').toLowerCase().includes(searchTerm) ||
                 (item.typeLabel || '').toLowerCase().includes(searchTerm);
        });

        if (filtered.length === 0) {
          historyList.innerHTML = `
            <div class="empty-state">
              <i class='bx bx-search'></i>
              <p>No matching assignments</p>
            </div>`;
          return;
        }

        filtered.forEach(([id, item]) => {
          const div = document.createElement('div');
          div.className = 'history-item';
          
          const outlineIndicator = item.hasOutline ? 
            '<span style="font-size: 0.65rem; background: #e0f2f1; color: #00695c; padding: 2px 6px; border-radius: 4px; margin-left: 6px;">outline</span>' : '';
          
          div.innerHTML = `
            <button class="delete-btn" data-id="${id}" title="Delete assignment">
              <i class="fas fa-trash-alt"></i>
            </button>
            <span class="history-title">${escapeHtml(item.topic || 'Untitled')}${outlineIndicator}</span>
            <div class="history-meta">
              <span><i class="far fa-calendar-alt"></i> ${escapeHtml(item.date || '')}</span>
              <span><i class="far fa-clock"></i> ${escapeHtml(item.time || '')}</span>
              <span>${escapeHtml(item.course || '')}</span>
              <span>${escapeHtml(item.toneLabel || '')}</span>
            </div>
            <div style="margin-top: 0.5rem;">
              <button class="retrieve-btn" data-id="${id}">
                📂 Open in Editor
              </button>
            </div>`;

          // Click on the whole item (except delete and retrieve buttons)
          div.addEventListener('click', (e) => {
            if (e.target.closest('.delete-btn') || e.target.closest('.retrieve-btn')) return;
            localStorage.setItem('rehab_assignment_current_id', id);
            window.open(`answer.html?id=${id}`, '_blank');
            historyDrawer.classList.remove('active');
            document.body.style.overflow = '';
          });

          // Delete button
          div.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            deleteAssignment(id);
          });

          // Retrieve button
          div.querySelector('.retrieve-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            localStorage.setItem('rehab_assignment_current_id', id);
            window.open(`answer.html?id=${id}`, '_blank');
            historyDrawer.classList.remove('active');
            document.body.style.overflow = '';
          });

          historyList.appendChild(div);
        });
      }, error => {
        console.error('History load error:', error);
        if (historyList) {
          historyList.innerHTML = `
            <div class="empty-state">
              <i class='bx bx-error'></i>
              <p>Failed to load history</p>
            </div>`;
        }
      });
  }

  async function loadAssignment(id) {
    if (!currentUser) return;
    
    try {
      const snap = await database.ref(`history/${currentUser.uid}/assignments/${id}`).once('value');
      const item = snap.val();
      
      if (item) {
        // Restore form fields
        topicInput.value = item.topic || '';
        courseInput.value = item.course || '';
        assignmentType.value = item.type || 'classwork';
        toneSelect.value = item.tone || 'professional';
        volumeCount.value = item.volume || 3;
        volumeType.value = item.volumeUnit || 'pages';
        instructionsInput.value = item.instructions || '';
        
        // Restore outline
        if (item.hasOutline) {
          hasOutlineCheckbox.checked = true;
          outlineInput.value = item.outline || '';
          outlineInput.style.display = 'block';
          outlineHint.style.display = 'flex';
        } else {
          hasOutlineCheckbox.checked = false;
          outlineInput.value = '';
          outlineInput.style.display = 'none';
          outlineHint.style.display = 'none';
        }

        // Restore result
        resultEditor.innerHTML = item.html || '';
        generatedHtml = item.html || '';
        currentHistoryId = id;
        resultDate.textContent = `${item.date || ''} ${item.time || ''}`;
        
        resultsContainer.style.display = 'block';
        resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        historyDrawer.classList.remove('active');
        document.body.style.overflow = '';
        
        showToast('Assignment loaded', 'success');
        validateForm();
      }
    } catch (error) {
      console.error('Load error:', error);
      showToast('Failed to load assignment', 'error');
    }
  }

  async function deleteAssignment(id) {
    if (!currentUser) return;
    if (!confirm('Permanently delete this assignment?')) return;
    
    try {
      await database.ref(`history/${currentUser.uid}/assignments/${id}`).remove();
      
      if (currentHistoryId === id) {
        currentHistoryId = null;
        resultsContainer.style.display = 'none';
        resultEditor.innerHTML = '';
      }
      
      showToast('Assignment deleted', 'success');
    } catch (error) {
      console.error('Delete error:', error);
      showToast('Failed to delete assignment', 'error');
    }
  }

  // ===== History Drawer Controls =====
  if (historyNavBtn) {
    historyNavBtn.addEventListener('click', () => {
      if (!currentUser) {
        showToast('Please log in to view history', 'error');
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) loginBtn.click();
        return;
      }
      historyDrawer.classList.add('active');
      document.body.style.overflow = 'hidden';
      loadHistoryList();
    });
  }

  if (closeDrawerBtn) {
    closeDrawerBtn.addEventListener('click', () => {
      historyDrawer.classList.remove('active');
      document.body.style.overflow = '';
    });
  }

  // Close drawer when clicking outside
  document.addEventListener('click', (e) => {
    if (historyDrawer?.classList.contains('active') &&
        !historyDrawer.contains(e.target) &&
        e.target !== historyNavBtn &&
        !historyNavBtn?.contains(e.target)) {
      historyDrawer.classList.remove('active');
      document.body.style.overflow = '';
    }
  });

  // Close drawer with Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && historyDrawer?.classList.contains('active')) {
      historyDrawer.classList.remove('active');
      document.body.style.overflow = '';
    }
  });

  // History search
  if (historySearchInput) {
    historySearchInput.addEventListener('input', () => {
      const term = historySearchInput.value.toLowerCase().trim();
      const items = document.querySelectorAll('.history-item');
      items.forEach(item => {
        const title = item.querySelector('.history-title')?.textContent.toLowerCase() || '';
        const meta = item.querySelector('.history-meta')?.textContent.toLowerCase() || '';
        const match = !term || title.includes(term) || meta.includes(term);
        item.style.display = match ? '' : 'none';
      });
    });
  }

  // ===== Auth State =====
  firebase.auth().onAuthStateChanged(user => {
    currentUser = user;
    if (user) {
      console.log('[AUTH] User logged in:', user.email);
      if (historyNavBtn) historyNavBtn.style.display = 'block';
      loadHistoryList();
    } else {
      console.log('[AUTH] User logged out');
      if (historyNavBtn) historyNavBtn.style.display = 'none';
      currentHistoryId = null;
    }
  });

  // ===== Initialize =====
  async function initialize() {
    console.log('[INIT] Starting Assignment Maker...');
    await fetchTokens();
    validateForm();
    console.log('[INIT] Assignment Maker ready');
  }

  initialize();
});