// js/project.js – Academic Project Maker v2.0.1
// FIXED: Project title now included in AI prompts and context memory.
// Humanized AI, Multi-pass Generation, Student Profiles, Context Memory,
// AI Detection Scoring, Version History, Streaming Support, Professional Export

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
      'it is important to highlight', 'it must be emphasized'
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
   - Vary sentence length: mix short sentences (5-10 words) with medium (15-25 words) and occasional long ones (30+ words).
   - Start some sentences with "And" or "But" naturally.
   - Use fragments occasionally for emphasis. Like this.
   - Ask rhetorical questions sparingly.

2. VOCABULARY:
   - NEVER use these words/phrases: ${HUMANIZATION_PATTERNS.bannedPhrases.slice(0, 10).join(', ')}
   - Replace formal words with natural alternatives where appropriate.
   - Use everyday clinical language, not textbook jargon.
   - Choose Anglo-Saxon words over Latin-derived ones when possible (e.g., "help" not "facilitate").

3. NATURAL FLOW:
   - Write as if explaining to a colleague over coffee, not lecturing from a podium.
   - Use contractions naturally (don't, it's, that's, I've, there's).
   - Include 1-2 minor digressions that feel authentic, then return to the point.
   - Occasionally acknowledge uncertainty: "It is hard to say for sure, but..."

4. PERSONAL VOICE:
   - Include 2-3 genuine personal reflections using phrases like:
     ${HUMANIZATION_PATTERNS.reflections.slice(0, 3).join(' | ')}
   - Refer to personal clinical experience where relevant.
   - Use "I" and "we" naturally where a student would.

5. IMPERFECTIONS (CRITICAL):
   - Occasionally restate an idea in slightly different words (mild redundancy).
   - Let one or two sentences run slightly longer than ideal.
   - Use informal connectors: "What this means is...", "Basically,", "So, what does this look like in practice?"
   - End one paragraph with a slightly informal transition like "But there is more to it than that."

6. NIGERIAN HEALTHCARE CONTEXT (when applicable):
   - Reference local healthcare settings naturally where relevant.
   - Mention Nigerian health institutions, practices, or challenges where appropriate.
   - Use examples from Nigerian clinical contexts.

The final text MUST read like a thoughtful, slightly imperfect student wrote it — not a professor, not a textbook, not an AI.`;
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
  // CONTEXT MEMORY (analyze previous chapters + project title as anchor)
  // =========================================================================
  function buildContextSummary() {
    const summary = [];

    // CRITICAL FIX: Always include project title as the first line of context
    if (currentProject) {
      summary.push(`PROJECT TITLE: "${currentProject.title}"`);
      summary.push(`DEPARTMENT: ${currentProject.department || 'Healthcare'}`);
      summary.push(`PROJECT TYPE: ${currentProject.type || 'Academic Project'}`);
      summary.push(`RESEARCH APPROACH: ${currentProject.approach === 'qualitative' ? 'Qualitative (Case Study)' : 'Quantitative'}`);
      summary.push(`WRITING PROFILE: ${currentProject.writingProfile || 'undergraduate'}`);
    }

    if (!currentProject || !currentProject.chapters) return summary.join('\n');

    // Chapter 1: Extract background, objectives, research questions
    if (currentProject.chapters.chapter1) {
      const ch1 = currentProject.chapters.chapter1;
      const background = ch1.sections?.[0] || '';
      const objectives = ch1.sections?.[2] || '';
      const questions = ch1.sections?.[3] || '';

      if (background && background.trim().length > 0) {
        summary.push('BACKGROUND (from Chapter 1): ' + extractPlainText(background).substring(0, 500));
      }
      if (objectives && objectives.trim().length > 0) {
        summary.push('AIM & OBJECTIVES: ' + extractPlainText(objectives).substring(0, 300));
      }
      if (questions && questions.trim().length > 0) {
        summary.push('RESEARCH QUESTIONS: ' + extractPlainText(questions).substring(0, 300));
      }
    }

    // Chapter 2: Extract theoretical framework
    if (currentProject.chapters.chapter2) {
      const theoretical = currentProject.chapters.chapter2.sections?.[0] || '';
      if (theoretical && theoretical.trim().length > 0) {
        summary.push('THEORETICAL FRAMEWORK KEY POINTS: ' + extractPlainText(theoretical).substring(0, 400));
      }
    }

    // Chapter 3: Extract methodology details
    if (currentProject.chapters.chapter3) {
      const ch3 = currentProject.chapters.chapter3;
      const design = ch3.sections?.[0] || '';
      const population = ch3.sections?.[1] || '';
      const instrument = ch3.sections?.[3] || '';

      if (design && design.trim().length > 0) {
        summary.push('RESEARCH DESIGN: ' + extractPlainText(design).substring(0, 200));
      }
      if (population && population.trim().length > 0) {
        summary.push('POPULATION/SAMPLE: ' + extractPlainText(population).substring(0, 200));
      }
      if (instrument && instrument.trim().length > 0) {
        summary.push('INSTRUMENTS: ' + extractPlainText(instrument).substring(0, 200));
      }
    }

    // Extract key terminology for consistency
    const allText = extractPlainText(JSON.stringify(currentProject.chapters));
    const keyTerms = extractKeyTerms(allText);
    if (keyTerms.length > 0) {
      summary.push('KEY TERMINOLOGY (use consistently throughout): ' + keyTerms.join(', '));
    }

    return summary.join('\n\n');
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

    // 2. Predictability score (lower is better, 0-100)
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

    // 3. AI likelihood (0-100, lower is better)
    const aiIndicators = [
      /it is (important|essential|crucial|necessary) to/gi,
      /(moreover|furthermore|consequently|thus|hence)/gi,
      /in (conclusion|summary|essence)/gi,
      /the (findings|results) (revealed|indicated|demonstrated|showed) that/gi,
      /it (can|could|should|must) be (noted|argued|stated|mentioned)/gi,
      /(significant|substantial|considerable) (impact|effect|influence|role)/gi
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

    // Don't save if identical to last version
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

    renderChapters();
    loadSectionContent();
    updateProjectSelector();
    updateModificationArea();
    updateVersionList();

    showToast(`Switched to "${currentProject.title}"`, 'info');
  }

  async function createNewProject() {
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

      projectModal.classList.remove('active');
      renderChapters();
      loadSectionContent();
      renderHistoryList();
      updateProjectSelector();
      updateModificationArea();

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
  // AI MULTI-PASS GENERATION (FIXED: project title now anchors all prompts)
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

    if (!aiConfig.token) {
      const ok = await fetchTokens();
      if (!ok) {
        showToast('AI service not configured', 'error');
        return;
      }
    }

    // Save current version before regenerating
    await saveVersion();

    const ch = getChaptersStructure()[currentChapter];
    const sectionName = ch && ch.sections && ch.sections.length > 0
      ? ch.sections[currentSection]
      : (ch ? ch.title : 'Section');
    const tone = aiToneSelect ? aiToneSelect.value : 'imperfect';
    const modification = modificationInput ? modificationInput.value.trim() : '';
    const approach = currentProject.approach === 'qualitative'
      ? 'qualitative (single case study / small sample / interview-based)'
      : 'quantitative (multiple cases / statistics / questionnaires)';
    const profile = currentProject.writingProfile || 'undergraduate';
    const contextSummary = buildContextSummary();  // now includes project title as first line
    const profileGuidance = getProfileGuidance(profile);
    const humanizationRules = buildHumanizationPrompt();

    // Show progress modal
    aiProgressModal.classList.add('active');
    aiGenerateSectionBtn.disabled = true;
    aiAbortController = new AbortController();

    try {
      // ===== PASS 1: Academic Draft =====
      updateProgressStage('Pass 1/3: Generating academic draft...');
      const pass1Response = await callAIWithCancel(
        'You are a knowledgeable academic writer. Write comprehensive, well-structured academic content with proper HTML formatting. Stay strictly on the provided project topic.',
        `Write the "${sectionName}" section for the academic project titled "${currentProject.title}" in the ${currentProject.department} department.

PROJECT DETAILS:
${contextSummary}

RESEARCH APPROACH: ${approach}
${modification ? 'SPECIAL MODIFICATION INSTRUCTIONS: ' + modification : ''}

Write comprehensive academic content that is specifically about "${currentProject.title}".
Use proper HTML structure with h2/h3 headings, paragraphs, and lists where appropriate.
Return ONLY the HTML content. No markdown fences, no explanations.`,
        2000, 0.6, 0.9, 0.1, 0.1
      );
      let content = cleanAIResponse(pass1Response.choices[0].message.content);

      // ===== PASS 2: Humanization =====
      updateProgressStage('Pass 2/3: Humanizing content...');
      const pass2Response = await callAIWithCancel(
        'You are an expert at making academic text sound naturally human-written. You rewrite text to sound like a real student wrote it, while staying true to the original topic.',
        `REWRITE the following academic text to sound like a real ${profile} healthcare student wrote it about "${currentProject.title}".

WRITING PROFILE:
${profileGuidance}

WRITING TONE: ${tone}

${humanizationRules}

ORIGINAL TEXT:
${content.substring(0, 3000)}

Rewrite this completely. Keep all the key information about "${currentProject.title}" and maintain academic quality, but make it sound genuinely human-written.
Return ONLY the rewritten HTML. No markdown fences.`,
        2500, 0.9, 0.95, 0.4, 0.4
      );
      content = cleanAIResponse(pass2Response.choices[0].message.content);

      // ===== PASS 3: Polish & Format =====
      updateProgressStage('Pass 3/3: Polishing and formatting...');
      const pass3Response = await callAIWithCancel(
        'You are a careful editor who polishes text while preserving its natural human quality and staying true to the original topic.',
        `POLISH the following text about "${currentProject.title}". Fix any grammar issues, improve formatting, but PRESERVE the natural human voice.

- Ensure proper HTML structure with appropriate headings
- Fix any awkward transitions or unclear sentences
- Keep the human, student-like quality intact
- Do NOT make it sound more formal or AI-like
- Preserve personal reflections and natural phrasing
- Ensure the content remains focused on "${currentProject.title}"

ORIGINAL:
${content}

Return ONLY the polished HTML. No markdown fences.`,
        1500, 0.4, 0.9, 0.1, 0.1
      );
      content = cleanAIResponse(pass3Response.choices[0].message.content);

      // Insert into editor
      sectionEditor.innerHTML = content;
      saveCurrentSection();
      await saveToFirebase();

      if (modificationInput) modificationInput.value = '';

      showToast('Section generated with multi-pass humanization', 'success');
      renderChapters();
      updateModificationArea();
      displayHumanizationScore();
      updateVersionList();

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
  // AI SUPERVISOR CHAT
  // =========================================================================
  aiSendBtn.addEventListener('click', async () => {
    const text = aiMessageInput.value.trim();
    if (!text) return;

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

  async function callAISupervisor(userMessage) {
    if (!aiConfig.token) {
      const ok = await fetchTokens();
      if (!ok) throw new Error('AI not configured');
    }

    const ch = getChaptersStructure()[currentChapter];
    const sectionName = ch && ch.sections && ch.sections.length > 0
      ? ch.sections[currentSection]
      : (ch ? ch.title : 'N/A');

    const systemPrompt = `You are an experienced academic supervisor helping a healthcare student with their academic project titled "${currentProject?.title || 'N/A'}".

**Project Context:**
- Title: ${currentProject?.title || 'N/A'}
- Type: ${currentProject?.type || 'N/A'}
- Department: ${currentProject?.department || 'N/A'}
- Approach: ${currentProject?.approach === 'qualitative' ? 'Qualitative (Case Study)' : 'Quantitative'}
- Current Chapter: ${ch ? ch.title : 'N/A'}
- Current Section: ${sectionName}

**Your Role:**
1. Provide constructive academic guidance specific to this project topic
2. Suggest improvements to writing
3. Help with research methodology
4. Explain corrections professionally
5. Be encouraging but honest
6. Keep responses concise and actionable

Respond as a supportive university supervisor would.`;

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

  function addAIMessage(role, content) {
    const div = document.createElement('div');
    div.className = `ai-message ${role}`;

    if (role === 'assistant') {
      div.innerHTML = marked.parse(content);
    } else {
      div.textContent = content;
    }

    const time = document.createElement('div');
    time.style.cssText = 'font-size: 0.65rem; color: var(--text-secondary); margin-top: 0.2rem;';
    time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    div.appendChild(time);

    aiChatMessages.appendChild(div);
    aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
  }

  // =========================================================================
  // PROFESSIONAL EXPORT
  // =========================================================================
  saveSectionBtn.addEventListener('click', async () => {
    saveCurrentSection();
    await saveToFirebase();
    showToast('Saved successfully', 'success');
  });

  exportWordBtn.addEventListener('click', async () => {
    saveCurrentSection();
    await saveToFirebase();

    const title = currentProject?.title || 'Academic Project';
    const department = currentProject?.department || '';
    const type = currentProject?.type || '';
    const approach = currentProject?.approach === 'qualitative' ? 'Qualitative Study' : 'Quantitative Study';

    const chStruct = getChaptersStructure();
    let tocHtml = '<h2>Table of Contents</h2><ol>';
    for (const [key, ch] of Object.entries(chStruct)) {
      tocHtml += `<li><strong>${ch.title}</strong>`;
      if (ch.sections && ch.sections.length > 0) {
        tocHtml += '<ul>';
        ch.sections.forEach(sec => {
          tocHtml += `<li>${sec}</li>`;
        });
        tocHtml += '</ul>';
      }
      tocHtml += '</li>';
    }
    tocHtml += '</ol>';

    const fullHtml = `<!DOCTYPE html>
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
    .content-page { page-break-before: always; }
    h1, h2, h3 { color: #00695c; }
    h2 { border-bottom: 1px solid #ddd; padding-bottom: 0.3rem; margin-top: 2rem; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    th, td { border: 1px solid #666; padding: 8px; text-align: left; }
    th { background: #f0f0f0; }
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="cover-page">
    <h1>${escapeHtml(title)}</h1>
    <p class="subtitle">${escapeHtml(approach)}</p>
    <div class="meta">
      <p><strong>Department:</strong> ${escapeHtml(department)}</p>
      <p><strong>Type:</strong> ${escapeHtml(type)}</p>
      <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <p style="margin-top: 3rem;"><em>Generated by rehablix Academic Project Maker</em></p>
    </div>
  </div>
  <div class="toc-page">
    ${tocHtml}
  </div>
  <div class="content-page">
    ${sectionEditor.innerHTML}
  </div>
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
    a.download = `${safeName}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Professional document downloaded', 'success');
  });

  exportPdfBtn.addEventListener('click', () => {
    window.print();
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
      } else if (keys.length === 0 && !currentProjectId) {
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

  console.log('[INIT] Academic Project Maker v2.0.1 ready – Fixed project title anchoring in all AI prompts');
});