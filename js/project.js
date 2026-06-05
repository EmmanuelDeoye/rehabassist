// js/project.js – Academic Project Maker v2.3.0
// With subscription limits, smarter AI supervisor, floating modify button, sticky toggles

if (typeof marked !== 'undefined') {
  marked.setOptions({ breaks: true, gfm: true, headerIds: false, mangle: false });
}

document.addEventListener('DOMContentLoaded', async () => {

  // ===== DOM Elements =====
  const chaptersList = document.getElementById('chaptersList');
  const sectionEditor = document.getElementById('sectionEditor');
  const currentSectionTitle = document.getElementById('currentSectionTitle');
  const aiGenerateSectionBtn = document.getElementById('aiGenerateSectionBtn');
  const aiChatMessages = document.getElementById('aiChatMessages');
  const aiMessageInput = document.getElementById('aiMessageInput');
  const aiSendBtn = document.getElementById('aiSendBtn');
  const saveSectionBtn = document.getElementById('saveSectionBtn');
  const exportWordBtn = document.getElementById('exportWordBtn');
  const exportPdfBtn = document.getElementById('exportPdfBtn');
  const toggleChaptersBtn = document.getElementById('toggleChaptersBtn');
  const toggleAIPanelBtn = document.getElementById('toggleAIPanelBtn');
  const chaptersSidebar = document.getElementById('chaptersSidebar');
  const aiPanel = document.getElementById('aiPanel');
  const closeChaptersBtn = document.getElementById('closeChaptersBtn');
  const closeAIPanelBtn = document.getElementById('closeAIPanelBtn');
  const projectModal = document.getElementById('projectModal');
  const closeProjectModalBtn = document.getElementById('closeProjectModal');
  const createProjectBtn = document.getElementById('createProjectBtn');
  const projectTitleInput = document.getElementById('projectTitle');
  const projectTypeSelect = document.getElementById('projectType');
  const projectDeptSelect = document.getElementById('projectDept');
  const projectApproachSelect = document.getElementById('projectApproach');
  const historyDrawer = document.getElementById('historyDrawer');
  const historyNavBtn = document.getElementById('historyNavBtn');
  const closeDrawerBtn = document.getElementById('closeDrawerBtn');
  const historyList = document.getElementById('historyList');
  const createNewProjectFromDrawer = document.getElementById('createNewProjectFromDrawer');
  const currentProjectSelect = document.getElementById('currentProjectSelect');
  const newProjectBtn = document.getElementById('newProjectBtn');
  const aiProgressModal = document.getElementById('aiProgressModal');
  const cancelGenerateBtn = document.getElementById('cancelGenerateBtn');
  const closeProgressModal = document.getElementById('closeProgressModal');
  const progressStage = document.getElementById('progressStage');
  const aiToneSelect = document.getElementById('aiToneSelect');
  const modificationInput = document.getElementById('modificationInput');
  const modificationArea = document.getElementById('modificationArea');
  const writingProfileSelect = document.getElementById('writingProfileSelect');
  const saveVersionBtn = document.getElementById('saveVersionBtn');
  const versionList = document.getElementById('versionList');
  const aiScoreDisplay = document.getElementById('aiScoreDisplay');
  const humanizationScoreEl = document.getElementById('humanizationScore');
  const scoreFillEl = document.getElementById('scoreFill');
  const scoreSentenceVarEl = document.getElementById('scoreSentenceVar');
  const scorePredictabilityEl = document.getElementById('scorePredictability');
  const scoreAILikelyEl = document.getElementById('scoreAILikely');
  const toastContainer = document.getElementById('toast-container');

  // Generation options
  const wordCountSelect = document.getElementById('wordCountSelect');
  const customWordCountInput = document.getElementById('customWordCount');
  const referenceStyleSelect = document.getElementById('referenceStyleSelect');
  const exportScopeSelect = document.getElementById('exportScopeSelect');

  // Rich text formatting buttons
  const formatBtns = document.querySelectorAll('.format-btn');
  const fontFamilySelect = document.getElementById('fontFamilySelect');
  const fontSizeSelect = document.getElementById('fontSizeSelect');

  // ===== State =====
  let currentUser = null;
  let projects = {};
  let currentProjectId = null;
  let currentProject = null;
  let currentChapter = null;
  let currentSection = null;
  let aiConfig = { token: null, endpoint: 'https://api.deepseek.com/v1', model: 'deepseek-chat' };
  let aiAbortController = null;
  let autoSaveTimer = null;
  const database = firebase.database();

  // Plan gating state
  let currentPlan = 'free';
  let projectCreationCount = 0;
  let creationResetDate = null;
  const FREE_PROJECT_LIMIT = 1;
  const LIMIT_DAYS = 30;

  // ===== Chapter Structures =====
  const quantitativeChapters = {
    chapter1: {
      title: 'Chapter 1: Introduction',
      sections: [
        'Background of Study',
        'Statement of Problem',
        'Aim & Objectives',
        'Research Questions',
        'Significance of Study',
        'Scope of Study',
        'Operational Definitions'
      ]
    },
    chapter2: {
      title: 'Chapter 2: Literature Review',
      sections: [
        'Theoretical Framework',
        'Empirical Review',
        'Conceptual Framework',
        'Summary of Literature'
      ]
    },
    chapter3: {
      title: 'Chapter 3: Methodology',
      sections: [
        'Research Design',
        'Population of Study',
        'Sample & Sampling Technique',
        'Instrumentation',
        'Data Collection Procedure',
        'Data Analysis'
      ]
    },
    chapter4: {
      title: 'Chapter 4: Results',
      sections: [
        'Data Presentation',
        'Analysis of Results',
        'Interpretation of Findings'
      ]
    },
    chapter5: {
      title: 'Chapter 5: Discussion & Conclusion',
      sections: [
        'Discussion of Findings',
        'Conclusion',
        'Recommendations',
        'Limitations of Study'
      ]
    },
    references: { title: 'References', sections: [] },
    questionnaire: { title: 'Questionnaire', sections: [] },
    abstract: { title: 'Abstract', sections: [] },
    appendix: { title: 'Appendix', sections: [] },
    defense_prep: { title: 'Defense Preparation', sections: [] }
  };

  const qualitativeChapters = {
    chapter1: {
      title: 'Chapter 1: Introduction',
      sections: [
        'Background of Study',
        'Statement of Problem',
        'Aim & Objectives',
        'Research Questions',
        'Significance of Study',
        'Scope of Study'
      ]
    },
    chapter2: {
      title: 'Chapter 2: Literature Review',
      sections: [
        'Theoretical Framework',
        'Review of Related Studies',
        'Conceptual Framework',
        'Summary'
      ]
    },
    chapter3: {
      title: 'Chapter 3: Methodology',
      sections: [
        'Research Design',
        'Case Selection / Participant Profile',
        'Data Collection Methods',
        'Data Analysis Approach',
        'Ethical Considerations'
      ]
    },
    chapter4: {
      title: 'Chapter 4: Findings',
      sections: [
        'Case Presentation',
        'Thematic Analysis',
        'Interpretation of Findings'
      ]
    },
    chapter5: {
      title: 'Chapter 5: Discussion & Conclusion',
      sections: [
        'Discussion of Findings',
        'Conclusion',
        'Recommendations',
        'Limitations of Study'
      ]
    },
    references: { title: 'References', sections: [] },
    abstract: { title: 'Abstract', sections: [] },
    appendix: { title: 'Appendix', sections: [] },
    defense_prep: { title: 'Defense Preparation', sections: [] }
  };

  function getChaptersStructure() {
    if (!currentProject) return quantitativeChapters;
    return currentProject.approach === 'qualitative' ? qualitativeChapters : quantitativeChapters;
  }

  // =========================================================================
  // PLAN GATING FUNCTIONS
  // =========================================================================
  function loadPlanData() {
    try {
      const data = JSON.parse(localStorage.getItem('rehab_project_plan_data') || '{}');
      projectCreationCount = data.count || 0;
      creationResetDate = data.resetDate ? new Date(data.resetDate) : null;
      const now = new Date();
      if (!creationResetDate || (now - creationResetDate) >= LIMIT_DAYS * 86400000) {
        projectCreationCount = 0;
        creationResetDate = now;
        savePlanData();
      }
    } catch (e) {
      projectCreationCount = 0;
      creationResetDate = new Date();
      savePlanData();
    }
  }

  function savePlanData() {
    localStorage.setItem('rehab_project_plan_data', JSON.stringify({
      count: projectCreationCount,
      resetDate: creationResetDate ? creationResetDate.toISOString() : new Date().toISOString()
    }));
  }

  function canCreateProject() {
    if (currentPlan === 'student' || currentPlan === 'pro') return true;
    loadPlanData();
    const now = new Date();
    if (!creationResetDate || (now - creationResetDate) >= LIMIT_DAYS * 86400000) {
      projectCreationCount = 0;
      creationResetDate = now;
      savePlanData();
      return true;
    }
    return projectCreationCount < FREE_PROJECT_LIMIT;
  }

  function incrementProjectCount() {
    if (currentPlan === 'student' || currentPlan === 'pro') return;
    projectCreationCount++;
    savePlanData();
    updatePlanUI();
  }

  function canAccessAISupervisor() {
    return currentPlan === 'student' || currentPlan === 'pro';
  }

  function canGenerateChapter(chapterKey) {
    if (currentPlan === 'student' || currentPlan === 'pro') return true;
    return chapterKey === 'chapter1';
  }

  function canRegenerate() {
    return currentPlan === 'student' || currentPlan === 'pro';
  }

  function getDaysUntilReset() {
    if (!creationResetDate) return 0;
    const now = new Date();
    const diffTime = LIMIT_DAYS * 86400000 - (now - creationResetDate);
    return Math.max(0, Math.ceil(diffTime / 86400000));
  }

  function goToSubscription() {
    window.location.href = 'sub.html';
  }

  // =========================================================================
  // PLAN UI - Notice inside History Drawer
  // =========================================================================
  function updatePlanUI() {
    const existingNotice = document.getElementById('projectPlanNotice');
    if (existingNotice) existingNotice.remove();

    if (currentPlan === 'student' || currentPlan === 'pro') return;

    const notice = document.createElement('div');
    notice.id = 'projectPlanNotice';
    const remaining = FREE_PROJECT_LIMIT - projectCreationCount;
    const daysLeft = getDaysUntilReset();

    notice.style.cssText = `
      background: #fef3c7;
      border: 2px solid #fbbf24;
      border-radius: 1rem;
      padding: 0.8rem 1rem;
      margin: 0 0 0.75rem 0;
      text-align: center;
      font-size: 0.82rem;
      color: #92400e;
      animation: fadeIn 0.4s ease;
    `;

    notice.innerHTML = `
      <div style="font-weight: 600; font-size: 0.9rem; margin-bottom: 0.25rem;">⚡ Free Plan</div>
      <div style="margin-bottom: 0.25rem; font-size: 0.78rem;">
        <strong>${FREE_PROJECT_LIMIT}</strong> project/month · Chapter 1 only · No AI Supervisor
      </div>
      ${remaining <= 0 ? `<div style="color: #dc2626; font-size: 0.75rem; margin-bottom: 0.3rem;">Resets in <strong>${daysLeft}</strong> days</div>` : ''}
      <button id="upgradeProjectBtn" style="
        margin-top: 0.3rem;
        padding: 0.4rem 1.2rem;
        border-radius: 2rem;
        background: linear-gradient(135deg, #f59e0b, #d97706);
        color: white;
        border: none;
        cursor: pointer;
        font-weight: 600;
        font-size: 0.8rem;
        transition: all 0.2s ease;
        font-family: inherit;
      " onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(245,158,11,0.4)';"
         onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='none';">
        ⚡ Upgrade for Full Access
      </button>
    `;

    // Place inside history drawer, above the history content
    const historyContent = document.getElementById('historyList');
    if (historyContent && historyContent.parentElement) {
      historyContent.parentElement.insertBefore(notice, historyContent);
    }

    const upgradeBtn = document.getElementById('upgradeProjectBtn');
    if (upgradeBtn) {
      upgradeBtn.addEventListener('click', goToSubscription);
    }
  }

  // =========================================================================
  // FLOATING MODIFY BUTTON - Hidden when drawers are open
  // =========================================================================
  function initModifyButton() {
    const existing = document.getElementById('floatingModifyBtn');
    if (existing) existing.remove();

    const btn = document.createElement('button');
    btn.id = 'floatingModifyBtn';
    btn.className = 'floating-modify-btn';
    btn.innerHTML = '<span class="btn-icon">✏️</span> <span class="btn-text">Modify</span>';
    btn.title = 'Scroll to AI controls';
    btn.addEventListener('click', () => {
      const target = document.querySelector('.ai-controls');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    document.body.appendChild(btn);

    const controlsEl = document.querySelector('.ai-controls');
    if (!controlsEl) return;

    // Function to check if button should be visible
    function updateButtonVisibility() {
      // Check if AI panel or chapters sidebar is open (mobile)
      const aiPanelOpen = aiPanel && aiPanel.classList.contains('open');
      const chaptersOpen = chaptersSidebar && chaptersSidebar.classList.contains('open');
      
      // Check if AI controls are in view
      const controlsRect = controlsEl.getBoundingClientRect();
      const controlsVisible = controlsRect.top < window.innerHeight && controlsRect.bottom > 0;
      
      if (aiPanelOpen || chaptersOpen || controlsVisible) {
        btn.style.opacity = '0';
        btn.style.pointerEvents = 'none';
      } else {
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
      }
    }

    // Use IntersectionObserver for the controls element
    const observer = new IntersectionObserver((entries) => {
      updateButtonVisibility();
    }, { threshold: 0.1 });
    observer.observe(controlsEl);

    // Also observe sidebar toggles for mobile
    if (toggleChaptersBtn) {
      toggleChaptersBtn.addEventListener('click', () => {
        setTimeout(updateButtonVisibility, 300); // Wait for animation
      });
    }
    if (toggleAIPanelBtn) {
      toggleAIPanelBtn.addEventListener('click', () => {
        setTimeout(updateButtonVisibility, 300); // Wait for animation
      });
    }
    if (closeChaptersBtn) {
      closeChaptersBtn.addEventListener('click', () => {
        setTimeout(updateButtonVisibility, 300);
      });
    }
    if (closeAIPanelBtn) {
      closeAIPanelBtn.addEventListener('click', () => {
        setTimeout(updateButtonVisibility, 300);
      });
    }

    // Initial check
    updateButtonVisibility();
  }

  // =========================================================================
  // HELPERS
  // =========================================================================
  function showToast(message, type = 'success', duration = 3500) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
  }

  async function fetchTokens() {
    try {
      const snap = await database.ref('tokens/deepseek').once('value');
      const data = snap.val();
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

  function extractPlainText(html) {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  function extractKeyTerms(text) {
    const terms = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g) || [];
    const unique = [...new Set(terms)].filter(t => t.length > 10 && t.length < 80);
    return unique.slice(0, 8);
  }

  // =========================================================================
  // RICH TEXT FORMATTING
  // =========================================================================
  function execFormatCmd(command, value = null) {
    document.execCommand(command, false, value);
    sectionEditor.focus();
  }

  formatBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const cmd = btn.dataset.command;
      if (cmd === 'createLink') {
        const url = prompt('Enter URL:', 'https://');
        if (url) execFormatCmd('createLink', url);
      } else if (cmd === 'unlink') {
        execFormatCmd('unlink');
      } else if (cmd === 'undo') {
        document.execCommand('undo');
        sectionEditor.focus();
      } else if (cmd === 'redo') {
        document.execCommand('redo');
        sectionEditor.focus();
      } else {
        execFormatCmd(cmd);
      }
    });
  });

  if (fontFamilySelect) fontFamilySelect.addEventListener('change', () => execFormatCmd('fontName', fontFamilySelect.value));
  if (fontSizeSelect) fontSizeSelect.addEventListener('change', () => execFormatCmd('fontSize', fontSizeSelect.value));

  // =========================================================================
  // CONTEXT MEMORY v2 — deep extraction with number consistency enforcement
  // =========================================================================
  function buildContextSummary() {
    const summary = [];

    if (currentProject) {
      summary.push(`PROJECT TITLE: "${currentProject.title}"`);
      summary.push(`DEPARTMENT: ${currentProject.department || 'Healthcare'}`);
      summary.push(`PROJECT TYPE: ${currentProject.type || 'Academic Project'}`);
      summary.push(`RESEARCH APPROACH: ${currentProject.approach === 'qualitative' ? 'Qualitative (Case Study)' : 'Quantitative'}`);
      summary.push(`WRITING PROFILE: ${currentProject.writingProfile || 'undergraduate'}`);
    }

    if (!currentProject?.chapters) return summary.join('\n');

    // Chapter 1 — extract all key sections with larger windows
    const ch1 = currentProject.chapters.chapter1;
    if (ch1) {
      const background  = extractPlainText(ch1.sections?.[0] || '');
      const statement   = extractPlainText(ch1.sections?.[1] || '');
      const objectives  = extractPlainText(ch1.sections?.[2] || '');
      const questions   = extractPlainText(ch1.sections?.[3] || '');
      const significance= extractPlainText(ch1.sections?.[4] || '');
      if (background)   summary.push('BACKGROUND: ' + background.substring(0, 800));
      if (statement)    summary.push('PROBLEM STATEMENT: ' + statement.substring(0, 600));
      if (objectives)   summary.push('AIM & OBJECTIVES: ' + objectives.substring(0, 600));
      if (questions)    summary.push('RESEARCH QUESTIONS: ' + questions.substring(0, 500));
      if (significance) summary.push('SIGNIFICANCE: ' + significance.substring(0, 400));
    }

    // Chapter 2 — theoretical and empirical foundation
    const ch2 = currentProject.chapters.chapter2;
    if (ch2) {
      const framework  = extractPlainText(ch2.sections?.[0] || '');
      const empirical  = extractPlainText(ch2.sections?.[1] || '');
      const conceptual = extractPlainText(ch2.sections?.[2] || '');
      if (framework)  summary.push('THEORETICAL FRAMEWORK: ' + framework.substring(0, 600));
      if (empirical)  summary.push('EMPIRICAL REVIEW KEY POINTS: ' + empirical.substring(0, 500));
      if (conceptual) summary.push('CONCEPTUAL FRAMEWORK: ' + conceptual.substring(0, 400));
    }

    // Chapter 3 — CRITICAL: every methodology detail must be captured exactly
    const ch3 = currentProject.chapters.chapter3;
    if (ch3) {
      const design       = extractPlainText(ch3.sections?.[0] || '');
      const population   = extractPlainText(ch3.sections?.[1] || '');
      const sampling     = extractPlainText(ch3.sections?.[2] || '');
      const instrument   = extractPlainText(ch3.sections?.[3] || '');
      const dataCollect  = extractPlainText(ch3.sections?.[4] || '');
      const dataAnalysis = extractPlainText(ch3.sections?.[5] || '');
      if (design)       summary.push('RESEARCH DESIGN (MUST MATCH IN ALL CHAPTERS): ' + design.substring(0, 500));
      if (population)   summary.push('POPULATION & SAMPLE SIZE (USE THESE EXACT NUMBERS IN CHAPTERS 4 & 5): ' + population.substring(0, 600));
      if (sampling)     summary.push('SAMPLING TECHNIQUE: ' + sampling.substring(0, 400));
      if (instrument)   summary.push('INSTRUMENTS/TOOLS (MUST MATCH IN RESULTS & DISCUSSION): ' + instrument.substring(0, 500));
      if (dataCollect)  summary.push('DATA COLLECTION PROCEDURE: ' + dataCollect.substring(0, 400));
      if (dataAnalysis) summary.push('DATA ANALYSIS METHOD: ' + dataAnalysis.substring(0, 400));
    }

    // Chapter 4 — results already written must be referenced consistently in Ch5
    const ch4 = currentProject.chapters.chapter4;
    if (ch4) {
      const dataPres    = extractPlainText(ch4.sections?.[0] || ch4.content || '');
      const analysis    = extractPlainText(ch4.sections?.[1] || '');
      const interp      = extractPlainText(ch4.sections?.[2] || '');
      if (dataPres)  summary.push('RESULTS — DATA PRESENTATION (must be consistent with Discussion): ' + dataPres.substring(0, 700));
      if (analysis)  summary.push('RESULTS — ANALYSIS (do not contradict these findings): ' + analysis.substring(0, 500));
      if (interp)    summary.push('RESULTS — INTERPRETATION: ' + interp.substring(0, 400));
    }

    // Scan ALL chapters for numbers and statistics — these must not change
    const allText = extractPlainText(JSON.stringify(currentProject.chapters));

    const numberPatterns = allText.match(
      /\bn\s*=\s*\d+|\d+\s*participants?|\d+\s*patients?|\d+\.\d+\s*\(SD[\s=]*[\d.]+\)|\bp\s*[<=>]\s*[\d.]+|mean\s*(?:score\s*)?(?:was|of|=)\s*[\d.]+|Cohen'?s\s*d\s*=\s*[\d.]+|t\s*\(\s*\d+\s*\)\s*=\s*[\d.]+/gi
    ) || [];
    const uniqueNumbers = [...new Set(numberPatterns.map(s => s.trim()))].slice(0, 15);
    if (uniqueNumbers.length > 0) {
      summary.push(
        '⚠️ CONSISTENCY CRITICAL — USE THESE EXACT FIGURES (do not invent or change any): ' +
        uniqueNumbers.join(' | ')
      );
    }

    // Key terminology for consistent naming
    const keyTerms = extractKeyTerms(allText);
    if (keyTerms.length > 0) {
      summary.push('KEY TERMS (use consistently, same spelling throughout): ' + keyTerms.join(', '));
    }

    return summary.join('\n\n');
  }

  // =========================================================================
  // POST-GENERATION CONSISTENCY CHECKER
  // =========================================================================
  function checkConsistency() {
    if (!currentProject?.chapters) return;

    const allText = extractPlainText(JSON.stringify(currentProject.chapters));

    // Check for conflicting sample sizes (n=X patterns)
    const sampleMatches = allText.match(/\bn\s*=\s*(\d+)/gi) || [];
    const sizes = [...new Set(sampleMatches.map(m => m.replace(/\s/g, '').toLowerCase()))];
    if (sizes.length > 1) {
      showToast(
        `⚠️ Sample size conflict detected: ${sizes.join(', ')} found across chapters. Fix before submission.`,
        'warning',
        7000
      );
    }

    // Check for conflicting participant counts
    const participantMatches = allText.match(/(\d+)\s*participants?/gi) || [];
    const pCounts = [...new Set(participantMatches.map(m => m.replace(/\s/g, '').toLowerCase()))];
    if (pCounts.length > 1) {
      showToast(
        `⚠️ Participant count conflict: ${pCounts.join(', ')} found. Ensure all chapters use the same number.`,
        'warning',
        7000
      );
    }
  }

  // =========================================================================
  // HUMANIZATION ENGINE (v2 — no hardcoded repetitive phrases)
  // =========================================================================
  function buildHumanizationPrompt() {
    return `
HUMANIZATION REQUIREMENTS — READ ALL CAREFULLY:

1. SENTENCE VARIETY (most important signal of human writing):
   - Mix sentence lengths naturally: some short (under 10 words), most medium (15-25 words), occasional long (30+).
   - Do NOT start consecutive sentences with the same word or phrase.
   - Vary paragraph length: some only 2 sentences, some up to 6.
   - Occasionally use a question to transition between ideas.

2. VOCABULARY:
   - Use natural clinical language — how a healthcare professional actually talks, not how a textbook reads.
   - BANNED words/phrases (never use these): moreover, furthermore, notably, consequently, thus, hence,
     therein, hereby, whereby, aforementioned, it is imperative, it should be noted that,
     it is worth mentioning, the findings revealed that, the results indicated that,
     it can be argued that, it is evident that, needless to say, it must be emphasized.
   - Prefer direct simple verbs: "shows" not "demonstrates", "helps" not "facilitates",
     "used" not "utilized", "about" not "pertaining to", "end" not "culminate".

3. STUDENT VOICE — SPECIFIC PERSONAL TOUCHES:
   - Include 1-2 genuine personal reflections grounded in a SPECIFIC clinical detail.
   - Each reflection must be DIFFERENT in phrasing and situation — never reuse the same opener.
   - Good examples of variety:
       "At LUTH, I remember a patient who..."
       "One thing that surprised me during my clinicals was..."
       "My supervisor once pointed out that..."
       "A patient I worked with during my rotation..."
   - BAD (never use these exact phrases):
       "I found this particularly relevant because in my clinical experience"
       "But there is more to it than that"
       "What this means is" (as a paragraph opener — more than once)
       "It is hard to say for sure, but"
       "Basically," more than once

4. CRITICAL — ZERO REPETITIVE TEMPLATES:
   - If a transitional phrase appears once, it must NOT appear again in the same document.
   - Do not end multiple paragraphs with summary-style sentences that restate the paragraph.
   - Do not begin multiple paragraphs with "So," or "So what does this mean?"
   - Each paragraph must open differently from the previous one.

5. NATURAL IMPERFECTION (subtle, not mechanical):
   - One slightly informal sentence per 4-5 paragraphs is fine.
   - One genuine digression that comes back to the point adds authenticity.
   - Do NOT inject imperfections artificially on every paragraph — that pattern is itself an AI tell.

6. NIGERIAN HEALTHCARE CONTEXT (where relevant):
   - Reference local settings and challenges naturally, not as a box-ticking exercise.
   - Only mention Nigerian context where it genuinely adds meaning to the argument.`;
  }

  // =========================================================================
  // STUDENT WRITING PROFILES
  // =========================================================================
  function getProfileGuidance(profile) {
    const profiles = {
      undergraduate: `
        - Vocabulary: Basic to intermediate clinical terminology
        - Sentence complexity: Moderate, mix of simple and compound sentences
        - Tone: Curious, still learning, occasionally uncertain
        - Style: Explains concepts as if still understanding them
        - Occasional minor errors in advanced terminology are acceptable`,
      final_year: `
        - Vocabulary: Solid clinical terminology, some advanced concepts
        - Sentence complexity: Good variety, occasional complex sentences
        - Tone: Confident but not expert-level
        - Style: Demonstrates growing clinical reasoning
        - Shows integration of theory and practice`,
      msc: `
        - Vocabulary: Advanced clinical and research terminology
        - Sentence complexity: Sophisticated with clear logical flow
        - Tone: Confident, analytical
        - Style: Evidence-based reasoning, critical analysis
        - Demonstrates deep understanding of research methodology`,
      phd: `
        - Vocabulary: Expert-level, specialized terminology
        - Sentence complexity: Highly sophisticated, nuanced argumentation
        - Tone: Scholarly, authoritative
        - Style: Original critical thinking, theoretical depth
        - Demonstrates contribution to knowledge`,
      nigerian_ug: `
        - Vocabulary: Nigerian English academic style
        - Sentence complexity: Moderate, with local academic expressions
        - Tone: Respectful, slightly formal with local flavor
        - Style: Nigerian undergraduate writing patterns
        - May include references to Nigerian healthcare system
        - Uses expressions like "in the Nigerian context", "our healthcare system"
        - Occasional British English spellings (colour, organise)`
    };
    return profiles[profile] || profiles.undergraduate;
  }

  // =========================================================================
  // AI DETECTION SCORING
  // =========================================================================
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

    // 2. Predictability score (lower is better)
    const bannedPhrases = [
      'moreover', 'furthermore', 'notably', 'consequently', 'thus', 'hence',
      'therein', 'hereby', 'whereby', 'aforementioned', 'heretofore',
      'in conclusion', 'it is imperative to note', 'it is worth mentioning',
      'it should be noted that', 'as previously stated', 'in summary',
      'the findings revealed that', 'the results indicated that',
      'it can be argued that', 'it is evident that', 'needless to say',
      'but there is more to it than that',
      'i found this particularly relevant',
      'what this means is',
      'it is hard to say for sure'
    ];

    let predictablePatterns = 0;
    const totalSentences = sentences.length;

    bannedPhrases.forEach(phrase => {
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

    // 3. AI likelihood (0-100, lower is better)
    const aiIndicators = [
      /it is (important|essential|crucial|necessary) to/gi,
      /(moreover|furthermore|consequently|thus|hence)/gi,
      /in (conclusion|summary|essence)/gi,
      /the (findings|results) (revealed|indicated|demonstrated|showed) that/gi,
      /it (can|could|should|must) be (noted|argued|stated|mentioned)/gi,
      /(significant|substantial|considerable) (impact|effect|influence|role)/gi,
      /but there is more to it than that/gi,
      /i found this particularly relevant/gi
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

  function displayHumanizationScore() {
    if (!aiScoreDisplay) return;

    const score = calculateHumanizationScore(sectionEditor.innerHTML);

    if (!score) {
      aiScoreDisplay.style.display = 'none';
      return;
    }

    aiScoreDisplay.style.display = 'block';

    if (humanizationScoreEl) humanizationScoreEl.textContent = `${score.overall}%`;
    if (scoreFillEl) {
      scoreFillEl.style.width = `${score.overall}%`;
      scoreFillEl.style.background = score.overall >= 70 ? '#10b981' :
                                      score.overall >= 50 ? '#f59e0b' : '#dc2626';
    }
    if (scoreSentenceVarEl) scoreSentenceVarEl.textContent = `Sentence Variation: ${score.variation}%`;
    if (scorePredictabilityEl) scorePredictabilityEl.textContent = `Predictability: ${score.predictability}%`;
    if (scoreAILikelyEl) scoreAILikelyEl.textContent = `AI-Likelihood: ${score.aiLikelihood}%`;
  }

  // =========================================================================
  // VERSION HISTORY
  // =========================================================================
  const MAX_VERSIONS = 10;

  async function saveVersion() {
    if (!currentProject || !currentChapter) return;

    saveCurrentSection();

    const ch = getChaptersStructure()[currentChapter];
    const content = ch && ch.sections && ch.sections.length > 0
      ? currentProject.chapters[currentChapter]?.sections?.[currentSection]
      : currentProject.chapters[currentChapter]?.content;

    if (!content || content.trim().length < 50) return;

    if (!currentProject._versions) currentProject._versions = {};
    if (!currentProject._versions[currentChapter]) currentProject._versions[currentChapter] = {};
    if (!currentProject._versions[currentChapter][currentSection]) {
      currentProject._versions[currentChapter][currentSection] = [];
    }

    const versions = currentProject._versions[currentChapter][currentSection];

    if (versions.length > 0 && versions[0].content === content) return;

    versions.unshift({
      content: content,
      timestamp: Date.now(),
      date: new Date().toLocaleString()
    });

    if (versions.length > MAX_VERSIONS) versions.length = MAX_VERSIONS;

    await saveToFirebase();
    updateVersionList();
  }

  function updateVersionList() {
    if (!versionList || !currentProject?._versions) return;

    const versions = currentProject._versions?.[currentChapter]?.[currentSection] || [];

    if (versions.length === 0) {
      versionList.innerHTML = '<small style="color:var(--text-secondary);">No previous versions</small>';
      return;
    }

    versionList.innerHTML = versions.map((v, i) => `
      <div class="version-item">
        <span>${v.date}</span>
        <button class="restore-version-btn" data-index="${i}">Restore</button>
      </div>
    `).join('');

    document.querySelectorAll('.restore-version-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        restoreVersion(index);
      });
    });
  }

  function restoreVersion(index) {
    const versions = currentProject?._versions?.[currentChapter]?.[currentSection];
    if (!versions || !versions[index]) return;

    if (!confirm('Restore this version? Current content will be saved as a new version first.')) return;

    saveVersion();

    sectionEditor.innerHTML = versions[index].content;
    saveCurrentSection();
    saveToFirebase();
    displayHumanizationScore();
    updateVersionList();
    showToast('Version restored', 'success');
  }

  if (saveVersionBtn) {
    saveVersionBtn.addEventListener('click', () => {
      saveVersion();
      showToast('Version saved', 'success');
    });
  }

  // =========================================================================
  // MODIFICATION AREA TOGGLE
  // =========================================================================
  function updateModificationArea() {
    if (!currentProject || !currentChapter) {
      if (modificationArea) modificationArea.style.display = 'none';
      return;
    }

    const ch = getChaptersStructure()[currentChapter];
    let hasContent = false;

    if (ch && ch.sections && ch.sections.length > 0) {
      hasContent = currentProject.chapters?.[currentChapter]?.sections?.[currentSection]?.trim().length > 0;
    } else if (ch) {
      hasContent = currentProject.chapters?.[currentChapter]?.content?.trim().length > 0;
    }

    if (modificationArea) {
      modificationArea.style.display = hasContent ? 'block' : 'none';
    }

    if (aiGenerateSectionBtn) {
      aiGenerateSectionBtn.innerHTML = hasContent
        ? '<i class="fas fa-redo"></i> Regenerate Section'
        : '<i class="fas fa-magic"></i> AI Generate This Section';
    }
  }

  // =========================================================================
  // GENERATION OPTIONS: Word Count + Reference Style
  // =========================================================================
  if (wordCountSelect) {
    wordCountSelect.addEventListener('change', () => {
      if (wordCountSelect.value === 'custom') {
        customWordCountInput.style.display = 'inline-block';
        customWordCountInput.focus();
      } else {
        customWordCountInput.style.display = 'none';
      }
      if (currentProject) {
        currentProject.wordCountPref = wordCountSelect.value;
        if (wordCountSelect.value === 'custom') {
          currentProject.customWordCount = parseInt(customWordCountInput.value) || 500;
        }
        saveToFirebase();
      }
    });
  }

  if (customWordCountInput) {
    customWordCountInput.addEventListener('change', () => {
      if (currentProject) {
        currentProject.customWordCount = parseInt(customWordCountInput.value) || 500;
        saveToFirebase();
      }
    });
  }

  if (referenceStyleSelect) {
    referenceStyleSelect.addEventListener('change', () => {
      if (currentProject) {
        currentProject.referenceStyle = referenceStyleSelect.value;
        saveToFirebase();
      }
    });
  }

  function getTargetWordCount() {
    let targetWordCount = 500;
    if (wordCountSelect) {
      if (wordCountSelect.value === 'custom') {
        const custom = parseInt(customWordCountInput?.value, 10);
        if (custom && custom >= 100 && custom <= 5000) {
          targetWordCount = custom;
        }
      } else {
        targetWordCount = parseInt(wordCountSelect.value, 10);
      }
    }
    return targetWordCount;
  }

  function getReferenceStyle() {
    return referenceStyleSelect ? referenceStyleSelect.value : 'APA 7th';
  }

  // =========================================================================
  // PROJECT MANAGEMENT
  // =========================================================================
  async function loadProjects() {
    if (!currentUser) return;

    try {
      const snap = await database.ref(`projects/${currentUser.uid}`).once('value');
      projects = snap.val() || {};
      renderHistoryList();
      updateProjectSelector();
    } catch (error) {
      console.error('Error loading projects:', error);
      showToast('Failed to load projects', 'error');
    }
  }

  function renderHistoryList() {
    if (!historyList) return;

    const entries = Object.entries(projects).sort((a, b) =>
      (b[1].updatedAt || b[1].createdAt || 0) - (a[1].updatedAt || a[1].createdAt || 0)
    );

    if (entries.length === 0) {
      historyList.innerHTML = `
        <div class="empty-state">
          <i class='bx bx-folder-open'></i>
          <p>No projects yet</p>
          <small>Create your first academic project</small>
        </div>`;
      return;
    }

    historyList.innerHTML = entries.map(([id, proj]) => {
      const date = proj.createdAt
        ? new Date(proj.createdAt).toLocaleDateString()
        : 'Unknown date';

      const chStruct = proj.approach === 'qualitative' ? qualitativeChapters : quantitativeChapters;
      let totalSections = 0;
      let completedSections = 0;

      if (proj.chapters) {
        for (const [key, ch] of Object.entries(chStruct)) {
          if (ch.sections && ch.sections.length > 0) {
            ch.sections.forEach((_, i) => {
              totalSections++;
              if (proj.chapters[key]?.sections?.[i]?.trim().length > 0) completedSections++;
            });
          } else {
            totalSections++;
            if (proj.chapters[key]?.content?.trim().length > 0) completedSections++;
          }
        }
      }

      const progress = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;
      const approachLabel = proj.approach === 'qualitative' ? '📋 Qualitative' : '📊 Quantitative';

      return `
        <div class="history-item" data-id="${id}">
          <button class="delete-btn" data-id="${id}" title="Delete project">
            <i class="fas fa-trash-alt"></i>
          </button>
          <span class="history-title">${escapeHtml(proj.title || 'Untitled Project')}</span>
          <div class="history-meta">
            <span><i class="far fa-calendar-alt"></i> ${date}</span>
            <span>${escapeHtml(proj.type || 'N/A')}</span>
            <span>${approachLabel}</span>
            <span>${escapeHtml(proj.department || 'N/A')}</span>
          </div>
          <div class="progress-bar-mini" style="margin-top: 0.5rem;">
            <div class="progress-fill" style="width: ${progress}%; background: var(--project-accent);"></div>
          </div>
          <small style="color: var(--text-secondary); font-size: 0.7rem;">${progress}% complete</small>
        </div>`;
    }).join('');

    document.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('.delete-btn')) return;
        const id = item.dataset.id;
        switchToProject(id);
        historyDrawer.classList.remove('active');
        document.body.style.overflow = '';
      });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        const id = btn.dataset.id;
        if (confirm('Permanently delete this project? This cannot be undone.')) {
          try {
            await database.ref(`projects/${currentUser.uid}/${id}`).remove();
            delete projects[id];

            if (currentProjectId === id) {
              currentProjectId = null;
              currentProject = null;
              sectionEditor.innerHTML = '';
              chaptersList.innerHTML = '';
              currentSectionTitle.textContent = 'Select a section';
              if (modificationArea) modificationArea.style.display = 'none';
              if (aiScoreDisplay) aiScoreDisplay.style.display = 'none';
            }

            renderHistoryList();
            updateProjectSelector();
            showToast('Project deleted', 'success');
          } catch (error) {
            showToast('Failed to delete project', 'error');
          }
        }
      });
    });
  }

  function updateProjectSelector() {
    if (!currentProjectSelect) return;

    const ids = Object.keys(projects);
    if (ids.length === 0) {
      currentProjectSelect.innerHTML = '<option value="">No projects</option>';
      return;
    }

    currentProjectSelect.innerHTML = ids.map(id => {
      const p = projects[id];
      return `<option value="${id}" ${id === currentProjectId ? 'selected' : ''}>${escapeHtml(p.title || 'Untitled')}</option>`;
    }).join('');
  }

  async function switchToProject(id) {
    if (!projects[id]) {
      showToast('Project not found', 'error');
      return;
    }

    if (currentProjectId && currentProject) {
      saveCurrentSection();
      await saveToFirebase();
    }

    currentProjectId = id;
    currentProject = projects[id];
    currentChapter = 'chapter1';
    currentSection = 0;

    if (currentProject.wordCountPref && wordCountSelect) {
      wordCountSelect.value = currentProject.wordCountPref;
      if (currentProject.wordCountPref === 'custom') {
        customWordCountInput.style.display = 'inline-block';
        customWordCountInput.value = currentProject.customWordCount || 500;
      } else {
        customWordCountInput.style.display = 'none';
      }
    }
    if (currentProject.referenceStyle && referenceStyleSelect) {
      referenceStyleSelect.value = currentProject.referenceStyle;
    }

    renderChapters();
    loadSectionContent();
    updateProjectSelector();
    updateModificationArea();
    updateVersionList();

    // Load chat history for this project
    const hasChatHistory = await loadChatHistory();
    if (!hasChatHistory) {
      clearChatHistory();
    }

    showToast(`Switched to "${currentProject.title}"`, 'info');
  }

  async function createNewProject() {
    if (!canCreateProject()) {
      const daysLeft = getDaysUntilReset();
      showToast(`⚠️ Free plan: 1 project/month. You've used yours. Resets in ${daysLeft} days. Upgrade for unlimited.`, 'error', 6000);
      goToSubscription();
      return;
    }

    projectModal.classList.add('active');
    if (projectTitleInput) projectTitleInput.value = '';
    if (projectTypeSelect) projectTypeSelect.selectedIndex = 0;
    if (projectDeptSelect) projectDeptSelect.selectedIndex = 0;
    if (projectApproachSelect) projectApproachSelect.value = 'quantitative';
    if (projectTitleInput) projectTitleInput.focus();
  }

  createProjectBtn.addEventListener('click', async () => {
    const title = projectTitleInput ? projectTitleInput.value.trim() : '';
    if (!title) {
      showToast('Please enter a project title', 'error');
      if (projectTitleInput) projectTitleInput.focus();
      return;
    }

    const newProject = {
      title: title,
      type: projectTypeSelect ? projectTypeSelect.value : 'Undergraduate Project',
      department: projectDeptSelect ? projectDeptSelect.value : 'Occupational Therapy',
      approach: projectApproachSelect ? projectApproachSelect.value : 'quantitative',
      writingProfile: 'undergraduate',
      wordCountPref: '500',
      customWordCount: 500,
      referenceStyle: 'APA 7th',
      chapters: {},
      _versions: {},
      createdAt: firebase.database.ServerValue.TIMESTAMP,
      updatedAt: firebase.database.ServerValue.TIMESTAMP
    };

    try {
      const ref = await database.ref(`projects/${currentUser.uid}`).push(newProject);
      const id = ref.key;
      newProject.id = id;
      projects[id] = newProject;

      currentProjectId = id;
      currentProject = newProject;
      currentChapter = 'chapter1';
      currentSection = 0;

      incrementProjectCount();

      projectModal.classList.remove('active');
      renderChapters();
      loadSectionContent();
      renderHistoryList();
      updateProjectSelector();
      updateModificationArea();
      clearChatHistory();

      showToast('Project created successfully! Start writing.', 'success');
    } catch (error) {
      console.error('Error creating project:', error);
      showToast('Failed to create project', 'error');
    }
  });

  if (closeProjectModalBtn) closeProjectModalBtn.addEventListener('click', () => projectModal.classList.remove('active'));
  if (createNewProjectFromDrawer) createNewProjectFromDrawer.addEventListener('click', () => { historyDrawer.classList.remove('active'); document.body.style.overflow = ''; createNewProject(); });
  if (newProjectBtn) newProjectBtn.addEventListener('click', createNewProject);
  if (currentProjectSelect) currentProjectSelect.addEventListener('change', (e) => { if (e.target.value && e.target.value !== currentProjectId) switchToProject(e.target.value); });
  if (projectModal) projectModal.addEventListener('click', (e) => { if (e.target === projectModal) projectModal.classList.remove('active'); });

  // =========================================================================
  // CHAPTERS & SECTIONS
  // =========================================================================
  function renderChapters() {
    if (!currentProject || !chaptersList) return;

    const chStruct = getChaptersStructure();
    let html = '';

    for (const [key, ch] of Object.entries(chStruct)) {
      html += `
        <div class="chapter-item ${currentChapter === key ? 'active' : ''}" data-chapter="${key}">
          <i class="fas fa-${currentChapter === key ? 'folder-open' : 'folder'}"></i> ${ch.title}
        </div>`;

      if (currentChapter === key && ch.sections && ch.sections.length > 0) {
        ch.sections.forEach((sec, i) => {
          const hasContent = currentProject.chapters?.[key]?.sections?.[i] &&
                             currentProject.chapters[key].sections[i].trim().length > 0;
          html += `
            <div class="section-item ${currentSection === i ? 'active' : ''}" data-section="${i}">
              <i class="fas fa-${hasContent ? 'check-circle' : 'circle'}"
                 style="font-size: 0.6rem; opacity: ${hasContent ? '1' : '0.3'};"></i>
              ${sec}
            </div>`;
        });
      } else if (currentChapter === key) {
        const hasContent = currentProject.chapters?.[key]?.content &&
                           currentProject.chapters[key].content.trim().length > 0;
        html += `
          <div class="section-item active" data-section="0">
            <i class="fas fa-${hasContent ? 'check-circle' : 'circle'}"
               style="font-size: 0.6rem; opacity: ${hasContent ? '1' : '0.3'};"></i>
            Content
          </div>`;
      }
    }

    chaptersList.innerHTML = html;

    document.querySelectorAll('.chapter-item').forEach(el => {
      el.addEventListener('click', (e) => {
        const ch = e.target.closest('.chapter-item').dataset.chapter;
        if (currentChapter === ch) return;
        saveCurrentSection();
        saveToFirebase();
        currentChapter = ch;
        currentSection = 0;
        loadSectionContent();
        renderChapters();
        updateModificationArea();
        updateVersionList();
      });
    });

    document.querySelectorAll('.section-item').forEach(el => {
      el.addEventListener('click', (e) => {
        const sec = parseInt(e.target.closest('.section-item').dataset.section);
        if (currentSection === sec) return;
        saveCurrentSection();
        saveToFirebase();
        currentSection = sec;
        loadSectionContent();
        renderChapters();
        updateModificationArea();
        updateVersionList();
      });
    });
  }

  function loadSectionContent() {
    if (!currentProject || !currentChapter) return;

    const ch = getChaptersStructure()[currentChapter];

    if (ch && ch.sections && ch.sections.length > 0) {
      currentSectionTitle.textContent = ch.sections[currentSection];
      sectionEditor.innerHTML = currentProject.chapters?.[currentChapter]?.sections?.[currentSection] || '';
    } else if (ch) {
      currentSectionTitle.textContent = ch.title;
      sectionEditor.innerHTML = currentProject.chapters?.[currentChapter]?.content || '';
    }

    sectionEditor.focus();
    updateModificationArea();
    updateVersionList();
    setTimeout(displayHumanizationScore, 300);

    if (writingProfileSelect && currentProject?.writingProfile) {
      writingProfileSelect.value = currentProject.writingProfile;
    }
  }

  function saveCurrentSection() {
    if (!currentProject || !currentChapter) return;

    if (!currentProject.chapters) currentProject.chapters = {};
    if (!currentProject.chapters[currentChapter]) {
      currentProject.chapters[currentChapter] = { sections: {} };
    }

    const ch = getChaptersStructure()[currentChapter];
    if (ch && ch.sections && ch.sections.length > 0) {
      currentProject.chapters[currentChapter].sections[currentSection] = sectionEditor.innerHTML;
    } else if (ch) {
      currentProject.chapters[currentChapter].content = sectionEditor.innerHTML;
    }

    currentProject.updatedAt = firebase.database.ServerValue.TIMESTAMP;
  }

  async function saveToFirebase() {
    if (!currentUser || !currentProjectId || !currentProject) return;

    try {
      await database.ref(`projects/${currentUser.uid}/${currentProjectId}`).update({
        chapters: currentProject.chapters,
        _versions: currentProject._versions || {},
        writingProfile: currentProject.writingProfile || 'undergraduate',
        wordCountPref: currentProject.wordCountPref || '500',
        customWordCount: currentProject.customWordCount || 500,
        referenceStyle: currentProject.referenceStyle || 'APA 7th',
        updatedAt: firebase.database.ServerValue.TIMESTAMP
      });
      projects[currentProjectId] = { ...currentProject };
    } catch (error) {
      console.error('Save error:', error);
    }
  }

  sectionEditor.addEventListener('input', () => {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(async () => {
      saveCurrentSection();
      await saveToFirebase();
      displayHumanizationScore();
    }, 3000);
  });

  sectionEditor.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveCurrentSection();
      saveToFirebase();
      showToast('Saved', 'success', 1500);
    }
  });

  // =========================================================================
  // AI MULTI-PASS GENERATION v2
  // — Pass 1: Academic draft with strict consistency rules
  // — Pass 2: Humanization (conservative temp — style only, not facts)
  // — Pass 3: Polish & format
  // =========================================================================
  function updateProgressStage(message) {
    if (progressStage) progressStage.textContent = message;
  }

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
      signal: aiAbortController.signal
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

  aiGenerateSectionBtn.addEventListener('click', async () => {
    if (!currentProject || !currentChapter) {
      showToast('Select a chapter and section first', 'error');
      return;
    }

    // Check plan access for chapter generation
    if (!canGenerateChapter(currentChapter)) {
      showToast('🔒 Free plan: Only Chapter 1 generation is available. Upgrade for full access.', 'error', 5000);
      goToSubscription();
      return;
    }

    // Check if regeneration is allowed
    const ch = getChaptersStructure()[currentChapter];
    const hasContent = ch?.sections?.length > 0
      ? currentProject.chapters?.[currentChapter]?.sections?.[currentSection]?.trim().length > 0
      : currentProject.chapters?.[currentChapter]?.content?.trim().length > 0;
    
    if (hasContent && !canRegenerate()) {
      showToast('🔒 Regeneration requires Student or Pro plan. Upgrade for full access.', 'error', 5000);
      goToSubscription();
      return;
    }

    if (!aiConfig.token) {
      const ok = await fetchTokens();
      if (!ok) {
        showToast('AI service not configured', 'error');
        return;
      }
    }

    // Save current version before regenerating
    await saveVersion();

    const sectionName = ch && ch.sections && ch.sections.length > 0
      ? ch.sections[currentSection]
      : (ch ? ch.title : 'Section');

    const tone          = aiToneSelect ? aiToneSelect.value : 'imperfect';
    const modification  = modificationInput ? modificationInput.value.trim() : '';
    const approach      = currentProject.approach === 'qualitative'
      ? 'qualitative (single case study / small sample / interview-based)'
      : 'quantitative (multiple cases / statistics / questionnaires)';
    const profile          = currentProject.writingProfile || 'undergraduate';
    const contextSummary   = buildContextSummary();
    const profileGuidance  = getProfileGuidance(profile);
    const humanizationRules= buildHumanizationPrompt();
    const targetWordCount  = getTargetWordCount();
    const referenceStyle   = getReferenceStyle();

    // Show progress modal
    aiProgressModal.classList.add('active');
    aiGenerateSectionBtn.disabled = true;
    aiAbortController = new AbortController();

    try {

      // ===== PASS 1: Academic Draft with Strict Consistency =====
      updateProgressStage('Pass 1/3: Generating academic draft...');

      const pass1SystemPrompt = `You are a knowledgeable academic writer specializing in healthcare education.
Write well-structured academic content with proper HTML formatting and ${referenceStyle} citations.
You MUST stay strictly on the provided project topic and use ONLY the facts, numbers, and methodology details provided in the context.
NEVER invent sample sizes, participant counts, statistics, or instruments not mentioned in the context.`;

      const pass1UserPrompt = `⚠️ CONSISTENCY RULES — NON-NEGOTIABLE:
- The project title is "${currentProject.title}". Every sentence must relate to THIS specific topic.
- Use ONLY the sample sizes, participant counts, and statistics stated in the context below. Do not invent new ones.
- If Chapter 3 context specifies a sample of n=X participants, ALL results and discussion must use n=X.
- Do not introduce new research instruments, designs, or theoretical frameworks not already established.
- Maintain exactly the same research approach (${approach}) throughout.

Write the "${sectionName}" section for:
PROJECT: "${currentProject.title}"
DEPARTMENT: ${currentProject.department}

FULL PROJECT CONTEXT (all established facts — follow exactly):
${contextSummary}

RESEARCH APPROACH: ${approach}
REFERENCE STYLE: ${referenceStyle} — use proper in-text citations throughout.
TARGET LENGTH: approximately ${targetWordCount} words.
${modification ? '\nSPECIAL INSTRUCTIONS FROM STUDENT: ' + modification : ''}

Write comprehensive, well-argued academic content using HTML structure (h2/h3 headings, paragraphs, lists).
Return ONLY the HTML. No markdown fences. No preamble.`;

      const pass1Response = await callAIWithCancel(
        pass1SystemPrompt,
        pass1UserPrompt,
        2000, 0.6, 0.9, 0.1, 0.1
      );
      let content = cleanAIResponse(pass1Response.choices[0].message.content);

      // ===== PASS 2: Humanization (conservative — style only, facts preserved) =====
      updateProgressStage('Pass 2/3: Humanizing content...');

      const pass2SystemPrompt = `You are an expert at rewriting academic text to sound naturally human-written.
Your job is to change STYLE and VOICE only — never change facts, numbers, sample sizes, statistics, or citations.
The student's name is implied; write in first-person student voice.`;

      const pass2UserPrompt = `REWRITE the text below to sound like a real ${profile} healthcare student wrote it.
The project is about: "${currentProject.title}"

⚠️ STRICT RULES FOR THIS PASS:
- Change ONLY the writing style, voice, and phrasing.
- Do NOT change any numbers, statistics, sample sizes, participant counts, or citations.
- Do NOT remove or add any factual claims.
- Do NOT change which instruments or methods are mentioned.
- Preserve all ${referenceStyle} citations exactly as written.

WRITING PROFILE TO MATCH:
${profileGuidance}

WRITING TONE: ${tone}
TARGET LENGTH: Keep close to ${targetWordCount} words.

${humanizationRules}

TEXT TO REWRITE:
${content.substring(0, 3500)}

Return ONLY the rewritten HTML. No markdown fences. No preamble.`;

      const pass2Response = await callAIWithCancel(
        pass2SystemPrompt,
        pass2UserPrompt,
        2500, 0.75, 0.92, 0.25, 0.2
      );
      content = cleanAIResponse(pass2Response.choices[0].message.content);

      // ===== PASS 3: Polish, Format & Final Consistency Check =====
      updateProgressStage('Pass 3/3: Polishing and checking consistency...');

      const pass3SystemPrompt = `You are a careful academic editor. Polish text for quality while preserving all facts, numbers, and the natural human voice.`;

      const pass3UserPrompt = `POLISH the text below. Fix grammar and formatting. Preserve all facts and human tone.

RULES:
- Fix any awkward sentences or unclear transitions.
- Ensure proper HTML heading structure (h2 for main sections, h3 for subsections).
- Do NOT increase formality — keep the student voice.
- Do NOT change any numbers, sample sizes, statistics, or citations.
- Remove any repeated phrases (e.g. if "but there is more to it than that" appears more than once, remove extras).
- Remove any repeated sentence openers used consecutively.
- Target final length: ~${targetWordCount} words.
- All ${referenceStyle} citations must be correctly formatted.

TEXT TO POLISH:
${content}

Return ONLY the polished HTML. No markdown fences.`;

      const pass3Response = await callAIWithCancel(
        pass3SystemPrompt,
        pass3UserPrompt,
        1500, 0.4, 0.9, 0.1, 0.1
      );
      content = cleanAIResponse(pass3Response.choices[0].message.content);

      // Insert into editor
      sectionEditor.innerHTML = content;
      saveCurrentSection();
      await saveToFirebase();

      if (modificationInput) modificationInput.value = '';

      showToast('Section generated successfully', 'success');
      renderChapters();
      updateModificationArea();
      displayHumanizationScore();
      updateVersionList();

      // Run consistency check across all chapters
      setTimeout(checkConsistency, 500);

    } catch (err) {
      if (err.name === 'AbortError') {
        showToast('Generation cancelled', 'info');
      } else {
        console.error('AI generation error:', err);
        showToast(`Generation failed: ${err.message}`, 'error', 5000);
      }
    } finally {
      aiProgressModal.classList.remove('active');
      aiGenerateSectionBtn.disabled = false;
      aiAbortController = null;
    }
  });

  if (cancelGenerateBtn) {
    cancelGenerateBtn.addEventListener('click', () => {
      if (aiAbortController) {
        aiAbortController.abort();
      }
    });
  }

  if (closeProgressModal) {
    closeProgressModal.addEventListener('click', () => {
      if (aiAbortController) {
        aiAbortController.abort();
      }
      aiProgressModal.classList.remove('active');
    });
  }

  // =========================================================================
  // WRITING PROFILE SELECTOR
  // =========================================================================
  if (writingProfileSelect) {
    writingProfileSelect.addEventListener('change', () => {
      if (currentProject) {
        currentProject.writingProfile = writingProfileSelect.value;
        saveToFirebase();
      }
    });
  }

  // =========================================================================
  // AI SUPERVISOR CHAT - with persistence, prompt cleanup, and scroll to top
  // =========================================================================
  
  // Save chat messages to Firebase
  async function saveChatHistory() {
    if (!currentUser || !currentProjectId) return;
    
    try {
      const messages = [];
      const messageElements = aiChatMessages.querySelectorAll('.ai-message');
      messageElements.forEach(el => {
        const isUser = el.classList.contains('user');
        const clone = el.cloneNode(true);
        const timeEl = clone.querySelector('div[style*="font-size: 0.65rem"]');
        if (timeEl) timeEl.remove();
        const promptsEl = clone.querySelector('.suggested-prompts');
        if (promptsEl) promptsEl.remove();
        
        messages.push({
          role: isUser ? 'user' : 'assistant',
          content: clone.innerHTML || clone.textContent,
          timestamp: Date.now()
        });
      });
      
      if (messages.length > 0 && !aiChatMessages.querySelector('.ai-empty-state')) {
        await database.ref(`projects/${currentUser.uid}/${currentProjectId}/chatHistory`).set({
          messages: messages.slice(-100),
          updatedAt: firebase.database.ServerValue.TIMESTAMP
        });
      }
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  }

  // Load chat history from Firebase
  async function loadChatHistory() {
    if (!currentUser || !currentProjectId) return false;
    
    try {
      const snap = await database.ref(`projects/${currentUser.uid}/${currentProjectId}/chatHistory`).once('value');
      const data = snap.val();
      
      if (data && data.messages && data.messages.length > 0) {
        aiChatMessages.innerHTML = '';
        
        data.messages.forEach(msg => {
          const div = document.createElement('div');
          div.className = `ai-message ${msg.role}`;
          div.innerHTML = msg.content;
          
          const time = document.createElement('div');
          time.style.cssText = 'font-size: 0.65rem; color: var(--text-secondary); margin-top: 0.2rem;';
          time.textContent = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
          div.appendChild(time);
          
          aiChatMessages.appendChild(div);
        });
        
        aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
        return true;
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
    return false;
  }

  // Clear chat history when switching projects
  function clearChatHistory() {
    aiChatMessages.innerHTML = `
      <div class="ai-empty-state">
        <i class="fas fa-robot"></i>
        <p>Your AI supervisor is ready</p>
        <small>Ask for guidance, corrections, or suggestions about your project</small>
      </div>`;
    showSuggestedPrompts(false);
  }

  function showSuggestedPrompts(isFollowUp = false) {
    // Remove any existing prompts first
    const existing = aiChatMessages.querySelector('.suggested-prompts');
    if (existing) existing.remove();

    const promptsDiv = document.createElement('div');
    promptsDiv.className = 'suggested-prompts';
    const prompts = isFollowUp ? [
      'Can you explain that in simpler terms?',
      'How does this relate to my research objectives?',
      'Suggest a better way to phrase this',
      'What references could support this point?'
    ] : [
      'Review my current section for clarity',
      'Suggest improvements for this chapter',
      'Help me with my methodology approach',
      'What key points should I cover in this section?'
    ];

    prompts.forEach(text => {
      const chip = document.createElement('span');
      chip.className = 'suggested-prompt-chip';
      chip.textContent = text;
      chip.addEventListener('click', () => {
        // Remove ALL suggested prompts when one is clicked
        const allPrompts = aiChatMessages.querySelectorAll('.suggested-prompts');
        allPrompts.forEach(p => p.remove());
        
        aiMessageInput.value = text;
        aiSendBtn.click();
      });
      promptsDiv.appendChild(chip);
    });

    aiChatMessages.appendChild(promptsDiv);
    aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
  }

  function addAIMessage(role, content) {
    const div = document.createElement('div');
    div.className = `ai-message ${role}`;

    if (role === 'assistant') {
      div.innerHTML = marked.parse(content);
      // Add follow-up prompts after each assistant reply
      const followUpDiv = document.createElement('div');
      followUpDiv.className = 'suggested-prompts';
      ['Can you elaborate?', 'Give me an example', 'How does this apply to my project?'].forEach(t => {
        const chip = document.createElement('span');
        chip.className = 'suggested-prompt-chip';
        chip.textContent = t;
        chip.addEventListener('click', () => {
          // Remove ALL suggested prompts when one is clicked
          const allPrompts = aiChatMessages.querySelectorAll('.suggested-prompts');
          allPrompts.forEach(p => p.remove());
          
          aiMessageInput.value = t;
          aiSendBtn.click();
        });
        followUpDiv.appendChild(chip);
      });
      div.appendChild(followUpDiv);
    } else {
      div.textContent = content;
    }

    const time = document.createElement('div');
    time.style.cssText = 'font-size: 0.65rem; color: var(--text-secondary); margin-top: 0.2rem;';
    time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    div.appendChild(time);

    // Remove empty state if present
    const emptyState = aiChatMessages.querySelector('.ai-empty-state');
    if (emptyState) emptyState.remove();

    aiChatMessages.appendChild(div);
    
    // Smooth scroll to the beginning of the new message
    div.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    // Auto-save chat history
    saveChatHistory();
  }

  aiSendBtn.addEventListener('click', async () => {
    if (!canAccessAISupervisor()) {
      showToast('🔒 AI Supervisor requires Student or Pro plan. Upgrade for full access.', 'error', 5000);
      goToSubscription();
      return;
    }

    const text = aiMessageInput.value.trim();
    if (!text) return;

    // Remove suggested prompts when sending a message
    const allPrompts = aiChatMessages.querySelectorAll('.suggested-prompts');
    allPrompts.forEach(p => p.remove());

    addAIMessage('user', text);
    aiMessageInput.value = '';
    aiMessageInput.style.height = 'auto';

    try {
      const reply = await callAISupervisor(text);
      addAIMessage('assistant', reply);
    } catch (err) {
      addAIMessage('assistant', 'Sorry, I encountered an error. Please try again.');
    }
  });

  aiMessageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      aiSendBtn.click();
    }
  });

  aiMessageInput.addEventListener('input', () => {
    aiMessageInput.style.height = 'auto';
    aiMessageInput.style.height = Math.min(aiMessageInput.scrollHeight, 120) + 'px';
  });

  function getSectionContent(chKey, secIndex) {
    const chStruct = getChaptersStructure();
    if (chStruct[chKey]?.sections?.length) {
      return currentProject?.chapters?.[chKey]?.sections?.[secIndex] || '';
    } else {
      return currentProject?.chapters?.[chKey]?.content || '';
    }
  }

  async function callAISupervisor(userMessage) {
    if (!aiConfig.token) {
      const ok = await fetchTokens();
      if (!ok) throw new Error('AI not configured');
    }

    // Build context: current section content and project context
    let context = '';
    if (currentProject && currentChapter) {
      const chStruct = getChaptersStructure();
      const ch = chStruct[currentChapter];
      if (ch) {
        const secTitle = ch.sections ? ch.sections[currentSection] : ch.title;
        const content = getSectionContent(currentChapter, currentSection);
        context = `Current Chapter: ${ch.title}\nCurrent Section: ${secTitle}\n\nContent of this section:\n${extractPlainText(content).substring(0, 1500)}`;
      }
      // Add whole project summary if needed
      if (userMessage.toLowerCase().includes('entire project') || userMessage.toLowerCase().includes('whole project')) {
        context += '\n\nFull project context:\n' + buildContextSummary();
      }
      // If user mentions a specific chapter, include that chapter's content
      const mentionedChapter = Object.keys(getChaptersStructure()).find(k => userMessage.toLowerCase().includes(k.replace('chapter', '')));
      if (mentionedChapter && currentProject.chapters[mentionedChapter]) {
        context += `\n\nContent of ${getChaptersStructure()[mentionedChapter].title}:\n${extractPlainText(getSectionContent(mentionedChapter, 0)).substring(0, 1000)}`;
      }
    }

    const systemPrompt = `You are an experienced academic supervisor helping a healthcare student with their project titled "${currentProject?.title || 'N/A'}".

**Project Context:**
- Title: ${currentProject?.title || 'N/A'}
- Type: ${currentProject?.type || 'N/A'}
- Department: ${currentProject?.department || 'N/A'}
- Approach: ${currentProject?.approach === 'qualitative' ? 'Qualitative (Case Study)' : 'Quantitative'}
- Current Chapter: ${getChaptersStructure()[currentChapter]?.title || 'N/A'}
- Current Section: ${getChaptersStructure()[currentChapter]?.sections?.[currentSection] || getChaptersStructure()[currentChapter]?.title || 'N/A'}
- Reference Style: ${currentProject?.referenceStyle || 'APA 7th'}

**Context from student's work:**
${context}

**Your Role:**
1. Give constructive academic guidance specific to this project's topic.
2. Flag any inconsistencies you notice (e.g. conflicting sample sizes or methods).
3. Suggest improvements to structure, argumentation, or writing quality.
4. Help with research methodology questions.
5. Be encouraging but honest and direct.
6. Keep responses concise and actionable — bullet points are fine.

Respond as a supportive but rigorous university supervisor.`;

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
          { role: 'user', content: userMessage }
        ],
        max_tokens: 600,
        temperature: 0.7
      })
    });

    if (!response.ok) throw new Error('API error');
    const data = await response.json();
    return data.choices[0].message.content;
  }

  // =========================================================================
  // PROFESSIONAL EXPORT — section / chapter / full project scope
  // =========================================================================
  function buildExportHtml(scope) {
    const title        = currentProject?.title || 'Academic Project';
    const department   = currentProject?.department || '';
    const type         = currentProject?.type || '';
    const approach     = currentProject?.approach === 'qualitative' ? 'Qualitative Study' : 'Quantitative Study';
    const refStyle     = currentProject?.referenceStyle || 'APA 7th';
    const chStruct     = getChaptersStructure();

    let bodyHtml    = '';
    let tocHtml     = '';
    let chapterTitle= '';

    if (scope === 'section') {
      const ch     = chStruct[currentChapter];
      const secName= ch.sections?.[currentSection] || ch.title;
      chapterTitle = ch.title;
      bodyHtml     = `<h2>${escapeHtml(secName)}</h2>\n${getSectionContent(currentChapter, currentSection)}`;

    } else if (scope === 'chapter') {
      const ch = chStruct[currentChapter];
      chapterTitle = ch.title;
      bodyHtml = `<h2>${escapeHtml(ch.title)}</h2>\n`;
      if (ch.sections?.length) {
        ch.sections.forEach((sec, i) => {
          bodyHtml += `<h3>${escapeHtml(sec)}</h3>\n${getSectionContent(currentChapter, i)}\n`;
        });
      } else {
        bodyHtml += getSectionContent(currentChapter, 0);
      }
      tocHtml = '<h2>Table of Contents</h2><ol>';
      tocHtml += `<li><strong>${escapeHtml(ch.title)}</strong></li>`;
      if (ch.sections?.length) {
        tocHtml += '<ul>';
        ch.sections.forEach(sec => { tocHtml += `<li>${escapeHtml(sec)}</li>`; });
        tocHtml += '</ul>';
      }
      tocHtml += '</ol>';

    } else {
      // Full project
      for (const [key, ch] of Object.entries(chStruct)) {
        if (!ch.sections?.length) {
          bodyHtml += `<h2>${escapeHtml(ch.title)}</h2>\n${getSectionContent(key, 0)}\n`;
        } else {
          bodyHtml += `<h2>${escapeHtml(ch.title)}</h2>\n`;
          ch.sections.forEach((sec, i) => {
            bodyHtml += `<h3>${escapeHtml(sec)}</h3>\n${getSectionContent(key, i)}\n`;
          });
        }
      }
      tocHtml = '<h2>Table of Contents</h2><ol>';
      for (const [key, ch] of Object.entries(chStruct)) {
        tocHtml += `<li><strong>${escapeHtml(ch.title)}</strong>`;
        if (ch.sections?.length) {
          tocHtml += '<ul>';
          ch.sections.forEach(sec => { tocHtml += `<li>${escapeHtml(sec)}</li>`; });
          tocHtml += '</ul>';
        }
        tocHtml += '</li>';
      }
      tocHtml += '</ol>';
    }

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <style>
    @page {
      size: A4;
      margin: 2.5cm 2cm 2.5cm 2cm;
      @bottom-center {
        content: "Page " counter(page);
        font-size: 9pt;
        color: #666;
      }
    }
    body {
      font-family: 'Times New Roman', Georgia, serif;
      line-height: 1.8;
      font-size: 12pt;
      color: #222;
      counter-reset: page;
    }
    .cover-page {
      text-align: center;
      padding-top: 30%;
      page-break-after: always;
    }
    .cover-page h1 { font-size: 22pt; color: #00695c; margin-bottom: 0.5rem; }
    .cover-page .subtitle { font-size: 14pt; color: #555; margin-bottom: 2rem; }
    .cover-page .meta { font-size: 11pt; color: #777; line-height: 2; }
    .toc-page { page-break-after: always; }
    .toc-page h2 { color: #00695c; border-bottom: 2px solid #00695c; padding-bottom: 0.3rem; }
    .content-page { page-break-before: ${scope === 'section' ? 'auto' : 'always'}; }
    h1, h2, h3 { color: #00695c; }
    h2 { border-bottom: 1px solid #ddd; padding-bottom: 0.3rem; margin-top: 2rem; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    th, td { border: 1px solid #666; padding: 8px; text-align: left; }
    th { background: #f0f0f0; }
    .reference-note {
      font-size: 10pt;
      color: #666;
      font-style: italic;
      margin-top: 0.5rem;
      border-top: 1px solid #ddd;
      padding-top: 0.5rem;
    }
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  ${scope === 'project' ? `
  <div class="cover-page">
    <h1>${escapeHtml(title)}</h1>
    <p class="subtitle">${escapeHtml(approach)}</p>
    <div class="meta">
      <p><strong>Department:</strong> ${escapeHtml(department)}</p>
      <p><strong>Type:</strong> ${escapeHtml(type)}</p>
      <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <p><strong>Reference Style:</strong> ${escapeHtml(refStyle)}</p>
      <p style="margin-top: 3rem;"><em>Generated by rehablix Academic Project Maker</em></p>
    </div>
  </div>
  <div class="toc-page">${tocHtml}</div>
  ` : (scope === 'chapter' ? `<div class="toc-page">${tocHtml}</div>` : '')}
  <div class="content-page">
    ${scope === 'chapter' ? `<h1>${escapeHtml(chapterTitle)}</h1>` : ''}
    ${bodyHtml}
    ${scope === 'section' ? `<p class="reference-note">Reference Style: ${escapeHtml(refStyle)}</p>` : ''}
  </div>
</body>
</html>`;
  }

  // Save button
  saveSectionBtn.addEventListener('click', async () => {
    saveCurrentSection();
    await saveToFirebase();
    showToast('Saved successfully', 'success');
  });

  // Word export
  exportWordBtn.addEventListener('click', async () => {
    saveCurrentSection();
    await saveToFirebase();

    const scope = exportScopeSelect ? exportScopeSelect.value : 'section';
    const title = currentProject?.title || 'Academic Project';
    const fullHtml = buildExportHtml(scope);

    const blob = new Blob([fullHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
    a.download = `${safeName}_${scope}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    const scopeLabel = scope === 'section' ? 'Section' : scope === 'chapter' ? 'Chapter' : 'Project';
    showToast(`${scopeLabel} exported as Word`, 'success');
  });

  // PDF export
  exportPdfBtn.addEventListener('click', () => {
    saveCurrentSection();
    saveToFirebase();

    const scope = exportScopeSelect ? exportScopeSelect.value : 'section';
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write(buildExportHtml(scope));
    printWindow.document.close();
    printWindow.focus();

    printWindow.onload = function () {
      printWindow.print();
      printWindow.onafterprint = function () {
        printWindow.close();
      };
    };

    setTimeout(() => {
      printWindow.print();
      printWindow.onafterprint = function () {
        printWindow.close();
      };
    }, 500);
  });

  // =========================================================================
  // MOBILE TOGGLES
  // =========================================================================
  if (toggleChaptersBtn) toggleChaptersBtn.addEventListener('click', () => chaptersSidebar.classList.toggle('open'));
  if (toggleAIPanelBtn) toggleAIPanelBtn.addEventListener('click', () => aiPanel.classList.toggle('open'));
  if (closeChaptersBtn) closeChaptersBtn.addEventListener('click', () => chaptersSidebar.classList.remove('open'));
  if (closeAIPanelBtn) closeAIPanelBtn.addEventListener('click', () => aiPanel.classList.remove('open'));

  // =========================================================================
  // HISTORY DRAWER
  // =========================================================================
  if (historyNavBtn) {
    historyNavBtn.addEventListener('click', () => {
      if (!currentUser) {
        showToast('Please log in to view your projects', 'error');
        return;
      }
      historyDrawer.classList.add('active');
      document.body.style.overflow = 'hidden';
      loadProjects();
    });
  }

  if (closeDrawerBtn) {
    closeDrawerBtn.addEventListener('click', () => {
      historyDrawer.classList.remove('active');
      document.body.style.overflow = '';
    });
  }

  document.addEventListener('click', (e) => {
    if (historyDrawer?.classList.contains('active') &&
        !historyDrawer.contains(e.target) &&
        e.target !== historyNavBtn &&
        !historyNavBtn?.contains(e.target)) {
      historyDrawer.classList.remove('active');
      document.body.style.overflow = '';
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && historyDrawer?.classList.contains('active')) {
      historyDrawer.classList.remove('active');
      document.body.style.overflow = '';
    }
  });

  // =========================================================================
  // PLAN UPDATE LISTENER
  // =========================================================================
  document.addEventListener('planUpdated', (e) => {
    const newPlan = e.detail?.plan || 'free';
    if (newPlan !== currentPlan) {
      currentPlan = newPlan;
      console.log('[PROJECT] Plan updated to:', currentPlan);
      loadPlanData();
      updatePlanUI();
      updateSupervisorAccess();
    }
  });

  if (window.rehabPlans) {
    currentPlan = window.rehabPlans.getCurrentPlan() || 'free';
    console.log('[PROJECT] Initial plan:', currentPlan);
  }

  function updateSupervisorAccess() {
    if (aiMessageInput && aiSendBtn) {
      const access = canAccessAISupervisor();
      aiMessageInput.disabled = !access;
      aiSendBtn.disabled = !access;
      if (!access) {
        aiMessageInput.placeholder = '🔒 Upgrade to Student or Pro for AI Supervisor';
      } else {
        aiMessageInput.placeholder = 'Ask your supervisor...';
      }
    }
  }

  // =========================================================================
  // AUTH & INIT
  // =========================================================================
  firebase.auth().onAuthStateChanged(async (user) => {
    currentUser = user;

    if (user) {
      console.log('[AUTH] User logged in:', user.email);
      if (historyNavBtn) historyNavBtn.style.display = 'block';

      await fetchTokens();
      await loadProjects();

      const keys = Object.keys(projects);
      if (keys.length > 0 && !currentProjectId) {
        const sorted = keys.sort((a, b) =>
          (projects[b].updatedAt || projects[b].createdAt || 0) -
          (projects[a].updatedAt || projects[a].createdAt || 0)
        );
        switchToProject(sorted[0]);
      } else if (keys.length === 0 && !currentProjectId && currentPlan !== 'free') {
        createNewProject();
      }
    } else {
      console.log('[AUTH] User logged out');
      if (historyNavBtn) historyNavBtn.style.display = 'none';
      currentProjectId = null;
      currentProject = null;
      if (chaptersList) chaptersList.innerHTML = '';
      if (sectionEditor) sectionEditor.innerHTML = '';
      if (currentSectionTitle) currentSectionTitle.textContent = 'Select a section';
      if (modificationArea) modificationArea.style.display = 'none';
      if (aiScoreDisplay) aiScoreDisplay.style.display = 'none';
    }
  });

  async function initialize() {
    console.log('[INIT] Academic Project Maker v2.3.0 starting...');

    loadPlanData();
    updatePlanUI();
    updateSupervisorAccess();
    initModifyButton();

    // Show suggested prompts when chat is empty
    if (aiChatMessages && aiChatMessages.querySelector('.ai-empty-state')) {
      showSuggestedPrompts(false);
    }

    if (writingProfileSelect) {
      writingProfileSelect.addEventListener('change', () => {
        if (currentProject) {
          currentProject.writingProfile = writingProfileSelect.value;
          saveToFirebase();
        }
      });
    }

    console.log('[INIT] Ready - Plan:', currentPlan);
  }

  initialize();

  console.log('Academic Project Maker v2.3.0 initialized with subscription gating');
});