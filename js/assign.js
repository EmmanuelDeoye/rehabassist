// js/assign.js – Modern Assignment Maker v2.0
// Humanized AI, Multi-pass Generation, AI Detection Scoring, Cancel Support

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

  // Results loading
  const resultsLoading = document.getElementById('resultsLoading');

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
  let aiAbortController = null;

  const database = firebase.database();

  // =========================================================================
  // HUMANIZATION ENGINE
  // =========================================================================
  const HUMANIZATION_PATTERNS = {
    bannedPhrases: [
      'moreover', 'furthermore', 'notably', 'consequently', 'thus', 'hence',
      'therein', 'hereby', 'whereby', 'aforementioned', 'heretofore',
      'in conclusion', 'it is imperative to note', 'it is worth mentioning',
      'it should be noted that', 'as previously stated', 'in summary',
      'the findings revealed that', 'the results indicated that',
      'it can be argued that', 'it is evident that', 'needless to say',
      'it is important to highlight', 'it must be emphasized',
      'it is crucial to understand', 'without a doubt', 'undoubtedly'
    ],
    sentenceStarters: [
      'What this means in practice is',
      'Interestingly,',
      'From what I have seen,',
      'In real-world settings,',
      'A key thing to understand is',
      'This is where it gets interesting:',
      'To put it simply,',
      'Looking at this practically,',
      'One thing that stands out is',
      'What matters most here is',
      'The real question is',
      'This brings up an important point:',
      'It is worth asking whether',
      'A practical example would be'
    ],
    reflections: [
      'I found this particularly relevant because in my clinical experience,',
      'During my placement, I noticed that',
      'This reminded me of a case where',
      'From observing patients, I have come to believe that',
      'Personally, I think this matters because',
      'In my view, what makes this important is',
      'I have always found it interesting that',
      'What struck me most about this topic is'
    ]
  };

  function buildHumanizationPrompt() {
    return `
HUMANIZATION REQUIREMENTS (FOLLOW ALL):

1. SENTENCE STRUCTURE:
   - Vary sentence length dramatically: mix short sentences (5-10 words) with medium (15-25 words) and occasional long ones (30+ words).
   - Start some sentences with "And" or "But" naturally for conversational flow.
   - Use fragments occasionally for emphasis. Like this.
   - Ask rhetorical questions sparingly to engage the reader.

2. VOCABULARY:
   - NEVER use these words/phrases: ${HUMANIZATION_PATTERNS.bannedPhrases.slice(0, 12).join(', ')}
   - Replace overly formal words with natural alternatives where appropriate.
   - Use everyday clinical language, not textbook jargon.
   - Choose Anglo-Saxon words over Latin-derived ones when possible (e.g., "help" not "facilitate", "use" not "utilize").

3. NATURAL FLOW:
   - Write as if explaining to a colleague over coffee, not lecturing from a podium.
   - Use contractions naturally (don't, it's, that's, I've, there's, wouldn't).
   - Include 1-2 minor digressions that feel authentic, then return to the point.
   - Occasionally acknowledge uncertainty: "It is hard to say for sure, but..."
   - Vary paragraph length — some short (2 sentences), some longer (5-6 sentences).

4. PERSONAL VOICE:
   - Include 2-3 genuine personal reflections using phrases like:
     ${HUMANIZATION_PATTERNS.reflections.slice(0, 3).join(' | ')}
   - Refer to personal clinical or academic experience where relevant.
   - Use "I" and "we" naturally where a real student would.

5. IMPERFECTIONS (CRITICAL FOR PASSING AI DETECTION):
   - Occasionally restate an idea in slightly different words (mild redundancy).
   - Let one or two sentences run slightly longer than ideal.
   - Use informal connectors naturally: "What this means is...", "Basically,", "So, what does this look like in practice?"
   - End one paragraph with a slightly informal transition like "But there is more to it than that."
   - Include one very short paragraph (1-2 sentences) for rhythm variation.

6. NIGERIAN HEALTHCARE CONTEXT (when applicable):
   - Reference local healthcare settings naturally where relevant.
   - Mention Nigerian health institutions, practices, or challenges where appropriate.
   - Use examples from Nigerian clinical or academic contexts.

The final text MUST read like a thoughtful, slightly imperfect student wrote it — not a professor, not a textbook, not an AI. The text should pass AI detection tools with flying colors.`;
  }

  // =========================================================================
  // AI DETECTION SCORING
  // =========================================================================
  function extractPlainText(html) {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  function calculateHumanizationScore(htmlContent) {
    const text = extractPlainText(htmlContent);
    if (!text || text.length < 100) return null;

    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 5);
    if (sentences.length < 5) return null;

    // 1. Sentence variation score (0-100)
    const lengths = sentences.map(s => s.trim().split(/\s+/).length);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length;
    const stdDev = Math.sqrt(variance);
    const variationScore = Math.min(100, Math.round((stdDev / (avgLength || 1)) * 100));

    // 2. Predictability score (0-100, lower is better)
    let predictablePatterns = 0;
    const totalSentences = sentences.length;

    HUMANIZATION_PATTERNS.bannedPhrases.forEach(phrase => {
      const regex = new RegExp(phrase, 'gi');
      const matches = text.match(regex);
      if (matches) predictablePatterns += matches.length;
    });

    const starts = sentences.map(s => s.trim().split(/\s+/).slice(0, 2).join(' ').toLowerCase());
    const uniqueStarts = new Set(starts);
    const startVariety = uniqueStarts.size / totalSentences;

    const predictabilityScore = Math.max(0, Math.round(
      (predictablePatterns / totalSentences) * 50 + (1 - startVariety) * 50
    ));

    // 3. AI likelihood score (0-100, lower is better)
    const aiIndicators = [
      /it is (important|essential|crucial|necessary) to/gi,
      /(moreover|furthermore|consequently|thus|hence)/gi,
      /in (conclusion|summary|essence)/gi,
      /the (findings|results) (revealed|indicated|demonstrated|showed) that/gi,
      /it (can|could|should|must) be (noted|argued|stated|mentioned)/gi,
      /(significant|substantial|considerable) (impact|effect|influence|role)/gi,
      /plays? a (vital|crucial|critical|key|important|significant) role/gi,
      /has (revolutionized|transformed|changed) the (way|field|landscape)/gi
    ];

    let aiIndicatorCount = 0;
    aiIndicators.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) aiIndicatorCount += matches.length;
    });

    const aiLikelihoodScore = Math.min(100, Math.round(
      (aiIndicatorCount / totalSentences) * 40 +
      (predictablePatterns / totalSentences) * 30 +
      (1 - startVariety) * 30
    ));

    // 4. Overall humanization score (0-100, higher is better)
    const overallScore = Math.round(
      (variationScore * 0.3) +
      ((100 - predictabilityScore) * 0.35) +
      ((100 - aiLikelihoodScore) * 0.35)
    );

    return {
      overall: Math.min(100, Math.max(0, overallScore)),
      variation: variationScore,
      predictability: predictabilityScore,
      aiLikelihood: aiLikelihoodScore,
      sentenceCount: totalSentences
    };
  }

  // =========================================================================
  // HELPERS
  // =========================================================================
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
    if (show) outlineInput.focus();
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
      return `[Image attached: ${file.name} - OCR not available]`;
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

  // =========================================================================
  // MULTI-PASS AI GENERATION
  // =========================================================================
  async function callAIWithCancel(systemPrompt, userPrompt, maxTokens, temp, topP, freqPenalty, presPenalty) {
    const response = await fetch(`${aiConfig.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiConfig.token}`
      },
      body: JSON.stringify({
        model: aiConfig.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: maxTokens,
        temperature: temp,
        top_p: topP,
        frequency_penalty: freqPenalty,
        presence_penalty: presPenalty
      }),
      signal: aiAbortController?.signal
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `API error (${response.status})`);
    }

    return response.json();
  }

  function cleanAIResponse(raw) {
    let cleaned = raw.replace(/```html?/g, '').replace(/```/g, '').trim();
    if (cleaned.includes('##') || cleaned.includes('**') || cleaned.includes('- ')) {
      cleaned = marked.parse(cleaned);
    }
    return cleaned;
  }

  // ===== Generate Assignment (Multi-pass with Humanization) =====
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

    const humanizationRules = buildHumanizationPrompt();
    aiAbortController = new AbortController();

    try {
      const startTime = Date.now();

      // ===== PASS 1: Academic Draft =====
      const pass1Prompt = `Write a well-structured student assignment on the topic "${topic}" for a ${course} course. This is a ${type} assignment.

REQUIREMENTS:
- Length: approximately ${volume} ${unit}.
- Tone: ${tone}.
${instructions ? `- Additional instructions: ${instructions}` : ''}
${hasOutlineCheckbox.checked && outlineInput.value.trim() ? `- CRITICAL: You MUST follow this exact outline structure:\n${outlineInput.value.trim()}` : ''}
${fileContent ? `- Reference material (use for background understanding only, do NOT copy directly):\n${fileContent}` : ''}

FORMATTING INSTRUCTIONS:
1. Start with a clear title as a level-1 heading.
2. Use proper HTML headings (h2 for main sections, h3 for subsections).
3. Use bullet points and numbered lists where appropriate.
4. Use <strong> tags for emphasis on key terms.
5. Use proper paragraph breaks between sections.
6. Each major section should have meaningful content.

Return ONLY the HTML content. No markdown code fences, no explanations.`;

      const pass1Response = await callAIWithCancel(
        'You are a knowledgeable academic writer. Write comprehensive, well-structured academic content with proper HTML formatting. Stay strictly on the provided topic.',
        pass1Prompt,
        3000, 0.6, 0.9, 0.1, 0.1
      );
      let content = cleanAIResponse(pass1Response.choices[0].message.content);

      // ===== PASS 2: Humanization =====
      const pass2Prompt = `REWRITE the following assignment to sound like a real healthcare student wrote it. The assignment is about "${topic}" for a ${course} course.

TONE: ${tone}

${humanizationRules}

ORIGINAL TEXT:
${content.substring(0, 3000)}

Rewrite this completely. Keep all the key information and academic quality, but make it sound genuinely human-written. The content MUST stay on the topic of "${topic}".
Return ONLY the rewritten HTML. No markdown fences.`;

      const pass2Response = await callAIWithCancel(
        'You are an expert at making academic text sound naturally human-written. You rewrite text to sound like a real student wrote it, while staying true to the original topic.',
        pass2Prompt,
        3500, 0.9, 0.95, 0.4, 0.4
      );
      content = cleanAIResponse(pass2Response.choices[0].message.content);

      // ===== PASS 3: Polish & Format =====
      const pass3Prompt = `POLISH the following assignment about "${topic}". 

- Fix any grammar issues
- Improve formatting and readability
- PRESERVE the natural human voice — do NOT make it sound more formal or AI-like
- Keep personal reflections and natural phrasing intact
- Ensure proper HTML structure

ORIGINAL:
${content}

Return ONLY the polished HTML. No markdown fences.`;

      const pass3Response = await callAIWithCancel(
        'You are a careful editor who polishes text while preserving its natural human quality.',
        pass3Prompt,
        2000, 0.4, 0.9, 0.1, 0.1
      );
      content = cleanAIResponse(pass3Response.choices[0].message.content);

      generatedHtml = content;

      // Calculate humanization score
      const score = calculateHumanizationScore(generatedHtml);
      console.log('[SCORE] Humanization score:', score?.overall + '%', score);

      resultsLoading.style.display = 'none';

      // Save to history if logged in
      if (currentUser) {
        currentHistoryId = await saveToHistory(generatedHtml, '');
      }

      // Store in localStorage as fallback
      const assignmentData = {
        topic: topic,
        course: course,
        type: type,
        typeLabel: type,
        tone: tone,
        toneLabel: tone,
        volume: volume,
        volumeUnit: unit,
        hasOutline: hasOutlineCheckbox.checked,
        outline: hasOutlineCheckbox.checked ? outlineInput.value.trim() : '',
        html: generatedHtml,
        markdown: '',
        historyId: currentHistoryId,
        generatedAt: new Date().toISOString(),
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        humanizationScore: score?.overall || null
      };
      localStorage.setItem('rehab_assignment_current', JSON.stringify(assignmentData));

      // Show preview modal
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      showPreviewModal();
      
      const scoreMsg = score ? ` (Human Score: ${score.overall}%)` : '';
      showToast(`Assignment generated in ${elapsed}s${scoreMsg}`, 'success');

    } catch (err) {
      console.error('[GENERATE] Error:', err);

      let errorMessage = err.message;
      if (err.name === 'AbortError') {
        errorMessage = 'Generation cancelled.';
      } else if (errorMessage.includes('API key') || errorMessage.includes('token')) {
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
      aiAbortController = null;
      validateForm();
    }
  });

  // ===== Preview Modal =====
  function showPreviewModal() {
    previewTopic.textContent = topicInput.value.trim();
    previewCourse.textContent = courseInput.value.trim();
    previewDate.textContent = new Date().toLocaleString();

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
      closePreviewModal();

      if (currentHistoryId) {
        window.open(`answer.html?id=${currentHistoryId}`, '_blank');
      } else {
        window.open('answer.html', '_blank');
      }
    });
  }

  // ===== Save to History =====
  async function saveToHistory(html, markdown) {
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
        markdown: markdown,
        plainPreview: html.replace(/<[^>]*>/g, '').substring(0, 200),
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

          // Click on the whole item (except buttons) opens answer.html
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

  async function deleteAssignment(id) {
    if (!currentUser) return;
    if (!confirm('Permanently delete this assignment?')) return;

    try {
      await database.ref(`history/${currentUser.uid}/assignments/${id}`).remove();
      try { await database.ref(`publicAssignments/${id}`).remove(); } catch (e) { /* ignore */ }
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
    console.log('[INIT] Starting Assignment Maker v2.0...');
    await fetchTokens();
    validateForm();
    console.log('[INIT] Assignment Maker ready with multi-pass humanization engine');
  }

  initialize();
});