// js/ppt.js - AI-Powered PowerPoint Export with DeepSeek Integration
// Enhanced version with charts, layouts, images, and speaker notes

// =====================================================================
// THEME DEFINITIONS (only if not already defined)
// =====================================================================
if (typeof THEMES === 'undefined') {
    var THEMES = [{
        id: 'tranquil',
        name: 'Tranquil',
        desc: 'Soft greens and blues, calming vibe',
        colors: {
            primary: '#009688',
            primaryDark: '#00796b',
            secondary: '#4db6ac',
            accent: '#e0f2f1',
            background: '#ffffff',
            text: '#1f2933',
            slideBg: '#f5f9f8',
            titleColor: '#009688',
            headingColor: '#00796b',
            bulletColor: '#009688',
            accentBar: '#009688',
            gradientStart: '#009688',
            gradientEnd: '#4db6ac',
            chartColors: ['#009688', '#4db6ac', '#26a69a', '#80cbc4', '#b2dfdb']
        },
        previewColors: ['#009688', '#4db6ac', '#e0f2f1']
    }, {
        id: 'cigar',
        name: 'Cigar',
        desc: 'Warm browns and golds, sophisticated',
        colors: {
            primary: '#8d6e63',
            primaryDark: '#6d4c41',
            secondary: '#d7ccc8',
            accent: '#f5e6d3',
            background: '#ffffff',
            text: '#3e2723',
            slideBg: '#faf0e6',
            titleColor: '#6d4c41',
            headingColor: '#5d4037',
            bulletColor: '#8d6e63',
            accentBar: '#8d6e63',
            gradientStart: '#8d6e63',
            gradientEnd: '#d7ccc8',
            chartColors: ['#8d6e63', '#a1887f', '#bcaaa4', '#d7ccc8', '#efebe9']
        },
        previewColors: ['#8d6e63', '#d7ccc8', '#f5e6d3']
    }, {
        id: 'ocean',
        name: 'Ocean',
        desc: 'Deep blues and teals, professional',
        colors: {
            primary: '#0277bd',
            primaryDark: '#01579b',
            secondary: '#4fc3f7',
            accent: '#e1f5fe',
            background: '#ffffff',
            text: '#01579b',
            slideBg: '#f0f8ff',
            titleColor: '#0277bd',
            headingColor: '#01579b',
            bulletColor: '#0277bd',
            accentBar: '#0277bd',
            gradientStart: '#0277bd',
            gradientEnd: '#4fc3f7',
            chartColors: ['#0277bd', '#0288d1', '#039be5', '#4fc3f7', '#81d4fa']
        },
        previewColors: ['#0277bd', '#4fc3f7', '#e1f5fe']
    }, {
        id: 'forest',
        name: 'Forest',
        desc: 'Earthy greens, natural and fresh',
        colors: {
            primary: '#2e7d32',
            primaryDark: '#1b5e20',
            secondary: '#81c784',
            accent: '#e8f5e9',
            background: '#ffffff',
            text: '#1b3a1b',
            slideBg: '#f5faf5',
            titleColor: '#2e7d32',
            headingColor: '#1b5e20',
            bulletColor: '#2e7d32',
            accentBar: '#2e7d32',
            gradientStart: '#2e7d32',
            gradientEnd: '#81c784',
            chartColors: ['#2e7d32', '#388e3c', '#43a047', '#66bb6a', '#a5d6a7']
        },
        previewColors: ['#2e7d32', '#81c784', '#e8f5e9']
    }, {
        id: 'sunset',
        name: 'Sunset',
        desc: 'Warm oranges and pinks, energetic',
        colors: {
            primary: '#e65100',
            primaryDark: '#bf360c',
            secondary: '#ffab91',
            accent: '#fbe9e7',
            background: '#ffffff',
            text: '#4e2a1a',
            slideBg: '#fff5f0',
            titleColor: '#d84315',
            headingColor: '#bf360c',
            bulletColor: '#e65100',
            accentBar: '#e65100',
            gradientStart: '#e65100',
            gradientEnd: '#ffab91',
            chartColors: ['#e65100', '#f57c00', '#fb8c00', '#ffab91', '#ffccbc']
        },
        previewColors: ['#e65100', '#ffab91', '#fbe9e7']
    }, {
        id: 'monochrome',
        name: 'Monochrome',
        desc: 'Black, white, and grays, timeless',
        colors: {
            primary: '#424242',
            primaryDark: '#212121',
            secondary: '#bdbdbd',
            accent: '#f5f5f5',
            background: '#ffffff',
            text: '#212121',
            slideBg: '#fafafa',
            titleColor: '#424242',
            headingColor: '#424242',
            bulletColor: '#616161',
            accentBar: '#424242',
            gradientStart: '#424242',
            gradientEnd: '#bdbdbd',
            chartColors: ['#424242', '#616161', '#757575', '#9e9e9e', '#bdbdbd']
        },
        previewColors: ['#424242', '#bdbdbd', '#f5f5f5']
    }, {
        id: 'royal',
        name: 'Royal',
        desc: 'Deep purples and golds, elegant',
        colors: {
            primary: '#6a1b9a',
            primaryDark: '#4a148c',
            secondary: '#ce93d8',
            accent: '#f3e5f5',
            background: '#ffffff',
            text: '#311b92',
            slideBg: '#f8f4fc',
            titleColor: '#6a1b9a',
            headingColor: '#4a148c',
            bulletColor: '#6a1b9a',
            accentBar: '#6a1b9a',
            gradientStart: '#6a1b9a',
            gradientEnd: '#ce93d8',
            chartColors: ['#6a1b9a', '#7b1fa2', '#8e24aa', '#ab47bc', '#ce93d8']
        },
        previewColors: ['#6a1b9a', '#ce93d8', '#f3e5f5']
    }, {
        id: 'clinical',
        name: 'Clinical',
        desc: 'Clean whites and medical blues',
        colors: {
            primary: '#0d47a1',
            primaryDark: '#0d47a1',
            secondary: '#64b5f6',
            accent: '#e3f2fd',
            background: '#ffffff',
            text: '#0d1b2a',
            slideBg: '#f5f9ff',
            titleColor: '#0d47a1',
            headingColor: '#0d47a1',
            bulletColor: '#1565c0',
            accentBar: '#0d47a1',
            gradientStart: '#0d47a1',
            gradientEnd: '#64b5f6',
            chartColors: ['#0d47a1', '#1565c0', '#1e88e5', '#42a5f5', '#64b5f6']
        },
        previewColors: ['#0d47a1', '#64b5f6', '#e3f2fd']
    }];
}

// =====================================================================
// STATE
// =====================================================================
let selectedTheme = THEMES[0];
let selectedArtStyle = 'photo';
let selectedLayout = 'freeform';
let selectedStructure = 'headings';
let selectedChartStyle = 'modern';
let enableImageGeneration = false;
let fontSizePreference = 'medium';
let slideDensity = 'balanced';
let includeSpeakerNotes = true;
let includeCharts = 'auto';
let contentData = null;
let aiConfig = { token: null, endpoint: 'https://api.deepseek.com/v1', model: 'deepseek-chat' };
let structuredSlides = null;
let currentUser = null;
let isInitialized = false;

// =====================================================================
// DOM REFS (with null checks)
// =====================================================================
let themeCarousel = null;
let generateBtn = null;
let slideCountSpan = null;
let toastContainer = null;
let pptInstructions = null;
let themePrev = null;
let themeNext = null;
let generationStatus = null;
let statusText = null;
let enableImageGenCheckbox = null;
let chartStyleRadios = null;

// =====================================================================
// GET DOM ELEMENTS SAFELY
// =====================================================================
function getDOMElements() {
    themeCarousel = document.getElementById('themeCarousel');
    generateBtn = document.getElementById('generatePptBtn');
    slideCountSpan = document.getElementById('slideCount');
    toastContainer = document.getElementById('toast-container');
    pptInstructions = document.getElementById('pptInstructions');
    themePrev = document.getElementById('themePrev');
    themeNext = document.getElementById('themeNext');
    generationStatus = document.getElementById('generationStatus');
    statusText = document.getElementById('statusText');
    enableImageGenCheckbox = document.getElementById('enableImageGeneration');
}

// =====================================================================
// WAIT FOR DOM
// =====================================================================
function waitForDOM() {
    return new Promise((resolve) => {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', resolve);
        } else {
            resolve();
        }
    });
}

// =====================================================================
// WAIT FOR FIREBASE (from config.js)
// =====================================================================
function waitForFirebase() {
    return new Promise((resolve) => {
        if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
            resolve();
            return;
        }
        let attempts = 0;
        const checkInterval = setInterval(() => {
            attempts++;
            if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
                clearInterval(checkInterval);
                resolve();
            } else if (attempts > 50) {
                clearInterval(checkInterval);
                console.warn('Firebase not loaded after 5 seconds, continuing...');
                resolve();
            }
        }, 100);
    });
}

// =====================================================================
// TOAST
// =====================================================================
function showToast(msg, type = 'success', duration = 4000) {
    if (!toastContainer) {
        console.warn('Toast container not found');
        return;
    }
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    const icon = type === 'error' ? 'exclamation-circle' :
        type === 'warning' ? 'exclamation-triangle' : 'check-circle';
    el.innerHTML = `<i class="fas fa-${icon}"></i> ${msg}`;
    toastContainer.appendChild(el);
    setTimeout(() => {
        el.style.opacity = '0';
        el.style.transition = 'opacity 0.3s';
        setTimeout(() => el.remove(), 300);
    }, duration);
}

// =====================================================================
// FETCH AI TOKEN
// =====================================================================
async function fetchTokens() {
    try {
        await waitForFirebase();
        if (typeof firebase === 'undefined' || !firebase.apps || firebase.apps.length === 0) {
            console.warn('Firebase not available, using fallback token');
            if (window.aiConfig && window.aiConfig.token) {
                aiConfig.token = window.aiConfig.token;
                console.log('Using fallback token from window');
                return true;
            }
            return false;
        }
        const database = firebase.database();
        const snapshot = await database.ref('tokens/deepseek').once('value');
        const data = snapshot.val();
        if (data?.api_key) {
            aiConfig.token = data.api_key;
            console.log('DeepSeek API loaded from Firebase');
            return true;
        }
        console.warn('DeepSeek API key missing');
        return false;
    } catch (error) {
        console.error('Token fetch error:', error);
        return false;
    }
}

// =====================================================================
// RENDER THEMES (Carousel)
// =====================================================================
function renderThemes() {
    getDOMElements();
    
    if (!themeCarousel) {
        console.error('Theme carousel element not found! Check HTML for id="themeCarousel"');
        const wrapper = document.querySelector('.theme-carousel-wrapper');
        if (wrapper) {
            const carousel = document.createElement('div');
            carousel.id = 'themeCarousel';
            carousel.className = 'theme-carousel';
            wrapper.prepend(carousel);
            themeCarousel = carousel;
            console.log('Created fallback theme carousel');
        } else {
            const container = document.querySelector('.ppt-card:first-child .theme-grid');
            if (container) {
                container.id = 'themeCarousel';
                container.className = 'theme-carousel';
                themeCarousel = container;
                console.log('Converted existing container to theme carousel');
            } else {
                console.error('Cannot find or create theme carousel');
                return;
            }
        }
    }

    themeCarousel.innerHTML = '';
    THEMES.forEach(theme => {
        const div = document.createElement('div');
        div.className = 'theme-option' + (theme.id === selectedTheme.id ? ' selected' : '');
        div.dataset.themeId = theme.id;
        const previewHtml = theme.previewColors.map(c =>
            `<span class="dot" style="background:${c}"></span>`
        ).join('');
        div.innerHTML = `
            <div class="theme-preview" style="background: ${theme.colors.primary};">
                <span style="color: #fff;">${theme.name}</span>
                ${previewHtml}
            </div>
            <div class="theme-name">${theme.name}</div>
            <div class="theme-desc">${theme.desc}</div>
            <div class="check-mark"><i class="fas fa-check"></i></div>
        `;
        div.addEventListener('click', () => {
            document.querySelectorAll('.theme-option').forEach(el => el.classList.remove('selected'));
            div.classList.add('selected');
            selectedTheme = THEMES.find(t => t.id === theme.id);
            updateSlideCount();
            updateStepIndicator(1);
        });
        themeCarousel.appendChild(div);
    });
}

// =====================================================================
// STEP INDICATOR
// =====================================================================
function updateStepIndicator(step) {
    const stepItems = document.querySelectorAll('.step-item');
    if (!stepItems.length) return;
    stepItems.forEach((item, index) => {
        const stepNum = index + 1;
        item.classList.remove('active');
        if (stepNum === step) {
            item.classList.add('active');
        } else if (stepNum < step) {
            item.classList.add('completed');
        } else {
            item.classList.remove('completed');
        }
    });
}

// =====================================================================
// CAROUSEL NAVIGATION
// =====================================================================
function scrollCarousel(direction) {
    getDOMElements();
    if (!themeCarousel) return;
    const scrollAmount = 220;
    if (direction === 'next') {
        themeCarousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    } else {
        themeCarousel.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
}

function setupCarouselNav() {
    getDOMElements();
    if (themePrev) {
        themePrev.addEventListener('click', () => scrollCarousel('prev'));
    }
    if (themeNext) {
        themeNext.addEventListener('click', () => scrollCarousel('next'));
    }
}

// =====================================================================
// UPDATE SLIDE COUNT
// =====================================================================
function updateSlideCount() {
    getDOMElements();
    if (structuredSlides) {
        if (slideCountSpan) slideCountSpan.textContent = structuredSlides.length + 2;
        return;
    }
    if (!contentData) {
        if (slideCountSpan) slideCountSpan.textContent = '0';
        return;
    }
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = contentData.content;
    const headings = tempDiv.querySelectorAll('h1, h2, h3');
    let count = Math.max(1, headings.length) || 5;
    if (slideCountSpan) slideCountSpan.textContent = count + 2;
}

// =====================================================================
// LOAD CONTENT
// =====================================================================
function loadContent() {
    getDOMElements();
    const raw = localStorage.getItem('pptExportData');
    if (!raw) {
        showToast('No document content found. Please generate a document first.', 'error');
        if (generateBtn) {
            generateBtn.disabled = true;
            generateBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> No content loaded';
        }
        return false;
    }
    try {
        contentData = JSON.parse(raw);
        updateSlideCount();
        if (generateBtn) {
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="fas fa-magic"></i> Generate & Download';
        }
        return true;
    } catch (e) {
        showToast('Error loading content.', 'error');
        if (generateBtn) {
            generateBtn.disabled = true;
            generateBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error loading content';
        }
        return false;
    }
}

// =====================================================================
// AI STRUCTURING OF CONTENT (ENHANCED)
// =====================================================================
async function structureContentWithAI(rawContent, modeLabel, patientName, diagnosis) {
    if (!aiConfig.token) {
        const ok = await fetchTokens();
        if (!ok) throw new Error('AI service not available. Please check your connection.');
    }

    // Get user preferences
    const layoutPreference = selectedLayout === 'dynamic' ? 'dynamic' : selectedLayout;
    const structurePreference = selectedStructure;
    const densityMap = { sparse: '3-4', balanced: '5-6', dense: '7-8' };
    const density = densityMap[slideDensity] || '5-6';
    const chartPreference = includeCharts;
    const notesPreference = includeSpeakerNotes;

    const prompt = `You are an expert presentation designer for clinical case presentations. Your task is to transform the following raw clinical content into a sophisticated, well-structured presentation.

**CRITICAL RULES:**
1. NEVER change, paraphrase, or modify the original text content. Preserve exact wording.
2. Extract key metrics, numbers, and data for charts.
3. Identify where images, charts, tables, or illustrations would enhance understanding.
4. Each slide should have 3-6 bullet points with EXACT original text.

**OUTPUT FORMAT**: Return ONLY a JSON array of slide objects. Each slide object has:

{
  "title": string (concise, informative slide title),
  "type": "title" | "content" | "chart" | "table" | "image" | "comparison" | "timeline" | "big-number" | "thankyou",
  "bullets": array of strings (EXACT original text, max ${density} per slide),
  "layout": "single" | "two-column" | "comparison" | "big-number" | "timeline",
  "chartData": { 
    "type": "bar" | "pie" | "line" | "doughnut" | "radar",
    "labels": [string],
    "datasets": [{ "label": string, "data": [number] }]
  },
  "imagePrompt": string (detailed DALL-E/Midjourney prompt if image would help),
  "notes": string (speaker notes with presentation guidance),
  "designHint": string (suggestions for visual emphasis),
  "comparisonData": { "left": [string], "right": [string] },
  "timelineData": [{ "time": string, "event": string }],
  "bigNumber": { "number": string, "label": string }
}

**LAYOUT RULES:**
- For "comparison" type, provide comparisonData with left/right columns.
- For "timeline" type, provide timelineData with time/event pairs.
- For "big-number" type, provide bigNumber with a key statistic.
- Use "two-column" layout when you have a chart or image to show alongside text.

**CHART RULES:**
${chartPreference === 'yes' ? '- ALWAYS include charts when numeric data is present.' : ''}
${chartPreference === 'no' ? '- NEVER include charts.' : '- Include charts when numeric data is present (auto-detect).'}
- Extract numbers from text like "30%", "$2.4M", "45 patients".
- Create meaningful chart labels and datasets.

**IMAGE RULES:**
${enableImageGeneration ? '- Generate detailed image prompts for relevant slides.' : '- Do NOT generate image prompts.'}
- Prompts should be specific, descriptive, and suitable for medical/clinical contexts.

**ADDITIONAL INSTRUCTIONS:**
- Layout preference: ${layoutPreference}
- Structure preference: ${structurePreference}
- ${notesPreference ? 'Include speaker notes for each slide.' : 'Do NOT include speaker notes.'}
- ${pptInstructions ? pptInstructions.value.trim() : 'No additional instructions.'}

**Raw Content:**
Title: ${modeLabel}
Patient: ${patientName}
Diagnosis: ${diagnosis}

${rawContent}

Return ONLY the JSON array, no other text.`;

    const messages = [
        { role: 'system', content: 'You are a clinical presentation designer. Return ONLY valid JSON. NEVER change the original text content. Extract numeric data for charts.' },
        { role: 'user', content: prompt }
    ];

    const url = `${aiConfig.endpoint}/chat/completions`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${aiConfig.token}`
        },
        body: JSON.stringify({
            model: aiConfig.model,
            messages,
            max_tokens: 8000,
            temperature: 0.1,
            top_p: 0.9
        })
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `AI error ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.warn('No JSON array found in AI response, using fallback');
            return createFallbackStructure(rawContent, modeLabel, patientName);
        }
        const slides = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(slides) || slides.length === 0) {
            throw new Error('Invalid slide structure');
        }
        return slides;
    } catch (e) {
        console.error('Failed to parse AI response:', e);
        return createFallbackStructure(rawContent, modeLabel, patientName);
    }
}

// =====================================================================
// FALLBACK STRUCTURE (ENHANCED)
// =====================================================================
function createFallbackStructure(rawContent, modeLabel, patientName) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = rawContent;
    const slides = [];
    const children = tempDiv.children;
    let currentTitle = 'Clinical Information';
    let currentBullets = [];

    for (let child of children) {
        const tag = child.tagName.toLowerCase();
        if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
            if (currentBullets.length > 0) {
                slides.push({ 
                    title: currentTitle, 
                    type: 'content', 
                    layout: 'single',
                    bullets: currentBullets.slice(0, 6),
                    notes: `Presentation of ${currentTitle}`
                });
                currentBullets = [];
            }
            currentTitle = child.textContent.trim();
        } else if (tag === 'ul' || tag === 'ol') {
            const items = child.querySelectorAll('li');
            items.forEach(li => {
                const text = li.textContent.trim();
                if (text) currentBullets.push(text);
            });
        } else if (tag === 'p') {
            const text = child.textContent.trim();
            if (text) currentBullets.push(text);
        } else if (tag === 'table') {
            // Try to extract table data for charts
            const rows = child.querySelectorAll('tr');
            const tableData = [];
            rows.forEach(row => {
                const cells = row.querySelectorAll('td, th');
                const rowData = [];
                cells.forEach(cell => rowData.push(cell.textContent.trim()));
                if (rowData.length > 0) tableData.push(rowData);
            });
            if (tableData.length > 1) {
                slides.push({
                    title: 'Data Table',
                    type: 'table',
                    layout: 'single',
                    bullets: [],
                    chartData: null,
                    notes: 'Data table from clinical content'
                });
            }
        }
    }
    if (currentBullets.length > 0) {
        slides.push({ 
            title: currentTitle, 
            type: 'content', 
            layout: 'single',
            bullets: currentBullets.slice(0, 6),
            notes: `Presentation of ${currentTitle}`
        });
    }

    if (slides.length === 0) {
        slides.push({
            title: 'Clinical Presentation',
            type: 'content',
            layout: 'single',
            bullets: [rawContent.substring(0, 300)],
            notes: 'Overview of clinical case'
        });
    }

    return slides;
}

// =====================================================================
// PREVIEW MODAL (ENHANCED)
// =====================================================================
function showPreview(slidesHtml) {
    const existing = document.querySelector('.ppt-preview-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'ppt-preview-overlay';
    overlay.innerHTML = `
        <div class="ppt-preview-modal">
            <div class="ppt-preview-header">
                <h3><i class="fas fa-eye"></i> Preview Slides</h3>
                <button class="ppt-preview-close" id="pptPreviewClose">&times;</button>
            </div>
            <div class="ppt-preview-body" id="pptPreviewBody">
                ${slidesHtml}
            </div>
            <div class="ppt-preview-footer">
                <button class="ppt-preview-btn secondary" id="pptPreviewCloseBtn">Close</button>
                <button class="ppt-preview-btn primary" id="pptPreviewDownloadBtn">
                    <i class="fas fa-download"></i> Download PowerPoint
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    const closeBtn = overlay.querySelector('#pptPreviewClose');
    const closeBtn2 = overlay.querySelector('#pptPreviewCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', close);
    if (closeBtn2) closeBtn2.addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
    });

    const downloadBtn = overlay.querySelector('#pptPreviewDownloadBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', async () => {
            close();
            await generatePPTX(true);
        });
    }
}

// =====================================================================
// GENERATE TABLE IN PPTX
// =====================================================================
function addTableToSlide(slide, data, colors, x, y, w, h) {
    if (!data || !Array.isArray(data) || data.length === 0) return;
    
    const rows = data.length;
    const cols = data[0].length;
    const cellWidth = w / cols;
    const cellHeight = Math.min(0.6, h / rows);
    
    let currentY = y;
    data.forEach((row, rowIdx) => {
        let currentX = x;
        row.forEach((cell, colIdx) => {
            const isHeader = rowIdx === 0;
            slide.addText(String(cell || ''), {
                x: currentX, y: currentY, w: cellWidth, h: cellHeight,
                fontSize: isHeader ? 14 : 12,
                color: isHeader ? '#ffffff' : colors.text,
                fontFace: 'Arial',
                bold: isHeader,
                align: 'center',
                valign: 'middle',
                fill: isHeader ? { color: colors.primary } : { color: colors.slideBg },
                border: { type: 'solid', color: '#cccccc', pt: 0.5 }
            });
            currentX += cellWidth;
        });
        currentY += cellHeight;
    });
}

// =====================================================================
// GENERATE CHART (ENHANCED - Uses PptxGenJS Native Charts)
// =====================================================================
function addChartToSlide(slide, slideData, colors) {
    if (!slideData.chartData) return;
    
    const { type, labels, datasets } = slideData.chartData;
    if (!labels || !datasets || datasets.length === 0) return;
    
    // Prepare chart data for PptxGenJS
    const chartData = [];
    
    // Header row
    const headerRow = ['Category'];
    labels.forEach(label => headerRow.push(String(label)));
    chartData.push(headerRow);
    
    // Data rows
    datasets.forEach(dataset => {
        const row = [dataset.label || 'Series'];
        dataset.data.forEach(val => {
            // Ensure numbers for charts
            row.push(typeof val === 'number' ? val : parseFloat(val) || 0);
        });
        chartData.push(row);
    });
    
    // Chart options based on user preference
    const chartColors = colors.chartColors || [colors.primary, colors.secondary, colors.accentBar, '#f59e0b', '#ec4899'];
    
    // Apply chart style preferences
    let chartOptions = {
        x: 1.0,
        y: 2.0,
        w: 9.0,
        h: 4.2,
        chartColors: chartColors,
        showTitle: true,
        title: slideData.title,
        showLegend: true,
        legendPos: 'b',
        catAxisLabelColor: colors.text,
        valAxisLabelColor: colors.text,
        catAxisLabelFontSize: 12,
        valAxisLabelFontSize: 12,
        valGridLine: { color: '#e0e0e0', style: 'dash' }
    };
    
    // Style-specific options
    switch(selectedChartStyle) {
        case 'modern':
            chartOptions.chartColors = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'];
            chartOptions.catAxisLabelFontSize = 13;
            chartOptions.valAxisLabelFontSize = 13;
            break;
        case 'classic':
            chartOptions.chartColors = ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#fef3c7'];
            chartOptions.shadow = { color: '#000000', opacity: 0.1, blur: 4 };
            break;
        case 'minimal':
            chartOptions.chartColors = ['#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb', '#f3f4f6'];
            chartOptions.valGridLine = { color: '#e5e7eb' };
            chartOptions.catAxisLabelColor = '#6b7280';
            chartOptions.valAxisLabelColor = '#6b7280';
            break;
        case 'vibrant':
            chartOptions.chartColors = ['#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e'];
            chartOptions.shadow = { color: '#000000', opacity: 0.15, blur: 6 };
            chartOptions.border = { color: '#ffffff', pt: 1 };
            break;
        default:
            // Use theme colors
            break;
    }
    
    try {
        slide.addChart(type, chartData, chartOptions);
    } catch (e) {
        console.warn('Chart generation failed, using fallback:', e);
        // Fallback: show data as text
        slide.addText('📊 ' + slideData.title, {
            x: 1, y: 2, w: 9, h: 0.8,
            fontSize: 20,
            color: colors.primary,
            align: 'center'
        });
        let yPos = 3;
        datasets.forEach(dataset => {
            slide.addText(`${dataset.label}: ${dataset.data.join(', ')}`, {
                x: 1.5, y: yPos, w: 8, h: 0.5,
                fontSize: 14,
                color: colors.text
            });
            yPos += 0.5;
        });
    }
}

// =====================================================================
// GENERATE COMPARISON SLIDE (FIXED - using strings for shape types)
// =====================================================================
function addComparisonSlide(slide, slideData, colors) {
    const left = slideData.comparisonData?.left || [];
    const right = slideData.comparisonData?.right || [];
    
    // Left column
    slide.addShape('rect', {
        x: 0.6, y: 1.8, w: 5.5, h: 4.2,
        fill: { color: colors.accent },
        rectRadius: 8,
        opacity: 0.3
    });
    slide.addText('Before', {
        x: 0.6, y: 1.8, w: 5.5, h: 0.6,
        fontSize: 18,
        color: colors.primary,
        align: 'center',
        bold: true
    });
    left.forEach((item, idx) => {
        slide.addText(`● ${item}`, {
            x: 0.9, y: 2.5 + idx * 0.5, w: 4.8, h: 0.5,
            fontSize: 14,
            color: colors.text,
            valign: 'top'
        });
    });
    
    // Right column
    slide.addShape('rect', {
        x: 6.8, y: 1.8, w: 5.5, h: 4.2,
        fill: { color: colors.accent },
        rectRadius: 8,
        opacity: 0.3
    });
    slide.addText('After', {
        x: 6.8, y: 1.8, w: 5.5, h: 0.6,
        fontSize: 18,
        color: colors.primary,
        align: 'center',
        bold: true
    });
    right.forEach((item, idx) => {
        slide.addText(`● ${item}`, {
            x: 7.1, y: 2.5 + idx * 0.5, w: 4.8, h: 0.5,
            fontSize: 14,
            color: colors.text,
            valign: 'top'
        });
    });
}

// =====================================================================
// GENERATE TIMELINE SLIDE (FIXED - using strings for shape types)
// =====================================================================
function addTimelineSlide(slide, slideData, colors) {
    const timeline = slideData.timelineData || [];
    if (timeline.length === 0) return;
    
    const numItems = timeline.length;
    const spacing = 9 / numItems;
    const yPos = 3.5;
    
    // Draw line
    slide.addShape('rect', {
        x: 1.5, y: yPos, w: 10, h: 0.04,
        fill: { color: colors.accentBar }
    });
    
    timeline.forEach((item, idx) => {
        const xPos = 1.8 + idx * spacing;
        
        // Circle marker
        slide.addShape('oval', {
            x: xPos - 0.15, y: yPos - 0.15, w: 0.3, h: 0.3,
            fill: { color: colors.primary }
        });
        
        // Time
        slide.addText(item.time || '', {
            x: xPos - 0.8, y: yPos - 1.0, w: 1.6, h: 0.6,
            fontSize: 14,
            color: colors.primary,
            align: 'center',
            bold: true
        });
        
        // Event
        slide.addText(item.event || '', {
            x: xPos - 1.2, y: yPos + 0.3, w: 2.4, h: 0.8,
            fontSize: 11,
            color: colors.text,
            align: 'center',
            valign: 'top'
        });
    });
}

// =====================================================================
// GENERATE BIG NUMBER SLIDE
// =====================================================================
function addBigNumberSlide(slide, slideData, colors) {
    const bigNum = slideData.bigNumber || { number: 'N/A', label: 'Statistic' };
    
    // Big number
    slide.addText(bigNum.number, {
        x: 0, y: 1.8, w: 13.33, h: 2.5,
        fontSize: 80,
        color: colors.primary,
        align: 'center',
        bold: true
    });
    
    // Label
    slide.addText(bigNum.label, {
        x: 0, y: 4.5, w: 13.33, h: 0.8,
        fontSize: 28,
        color: colors.text,
        align: 'center'
    });
    
    // Optional bullets
    if (slideData.bullets && slideData.bullets.length > 0) {
        let yPos = 5.5;
        slideData.bullets.slice(0, 3).forEach(bullet => {
            slide.addText(`● ${bullet}`, {
                x: 0.8, y: yPos, w: 11.73, h: 0.5,
                fontSize: 16,
                color: colors.text,
                valign: 'top'
            });
            yPos += 0.6;
        });
    }
}

// =====================================================================
// ENHANCED PPTX GENERATION
// =====================================================================
async function generatePPTX(skipPreview = false) {
    if (!contentData) {
        showToast('No content to export.', 'error');
        return;
    }

    getDOMElements();
    
    // Update status
    if (generationStatus) {
        generationStatus.style.display = 'block';
        generationStatus.className = '';
        if (statusText) statusText.textContent = 'Preparing your presentation with AI...';
    }
    
    if (generateBtn) {
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Structuring content with AI...';
    }

    try {
        const rawContent = contentData.content;
        const modeLabel = contentData.modeLabel || 'Clinical Presentation';
        const patientDisplay = contentData.patientName || 'N/A';
        const diagnosis = contentData.diagnosis || 'N/A';
        const profession = contentData.profession || 'N/A';

        if (statusText) statusText.textContent = '🧠 AI is structuring your presentation...';
        showToast('🧠 AI is structuring your presentation...', 'info', 3000);

        let slides = await structureContentWithAI(rawContent, modeLabel, patientDisplay, diagnosis);
        structuredSlides = slides;

        // Extract tables from content
        const extractedTables = [];
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = rawContent;
        const allTables = tempDiv.querySelectorAll('table');
        allTables.forEach(table => {
            const rows = [];
            const trs = table.querySelectorAll('tr');
            trs.forEach(tr => {
                const cells = [];
                tr.querySelectorAll('td, th').forEach(td => {
                    cells.push(td.textContent.trim());
                });
                if (cells.length > 0) rows.push(cells);
            });
            if (rows.length > 0) extractedTables.push(rows);
        });

        updateSlideCount();

        if (statusText) statusText.textContent = '📊 Building PowerPoint with charts and layouts...';

        const pptx = new PptxGenJS();
        pptx.defineLayout({ name: 'WIDE', width: 13.33, height: 7.5 });
        pptx.layout = 'WIDE';

        const colors = selectedTheme.colors;
        const totalSlides = slides.length + 2 + (extractedTables.length > 0 ? 1 : 0);
        const previewHtml = [];

        function addDeco(slide, type = 'top') {
            if (type === 'top') {
                slide.addShape('rect', {
                    x: 0, y: 0, w: 13.33, h: 0.25,
                    fill: { color: colors.accentBar },
                    rectRadius: 0
                });
                slide.addShape('rect', {
                    x: 0, y: 0.35, w: 13.33, h: 0.04,
                    fill: { color: colors.secondary },
                    rectRadius: 0
                });
            } else if (type === 'side') {
                slide.addShape('rect', {
                    x: 0, y: 0.4, w: 0.15, h: 6.6,
                    fill: { color: colors.accentBar },
                    rectRadius: 0
                });
            } else if (type === 'bottom') {
                slide.addShape('rect', {
                    x: 0, y: 7.0, w: 13.33, h: 0.08,
                    fill: { color: colors.accentBar },
                    rectRadius: 0
                });
            }
        }

        // --- TITLE SLIDE ---
        const slideTitle = pptx.addSlide();
        slideTitle.background = { color: colors.primary };
        slideTitle.addShape('rect', {
            x: 0, y: 0, w: 13.33, h: 7.5,
            fill: { color: colors.primary },
            rectRadius: 0,
            opacity: 0.8
        });
        slideTitle.addShape('rect', {
            x: 0, y: 6.7, w: 13.33, h: 0.8,
            fill: { color: colors.secondary },
            rectRadius: 0
        });
        slideTitle.addShape('rect', {
            x: 0, y: 6.5, w: 13.33, h: 0.05,
            fill: { color: '#ffffff' },
            rectRadius: 0,
            opacity: 0.3
        });

        slideTitle.addText(`rehablix · ${modeLabel}`, {
            x: 0.8, y: 1.3, w: 11.73, h: 1.5,
            fontSize: 44,
            color: '#ffffff',
            fontFace: 'Arial',
            bold: true,
            align: 'center'
        });
        slideTitle.addText(patientDisplay, {
            x: 0.8, y: 3.0, w: 11.73, h: 1.0,
            fontSize: 34,
            color: '#ffffff',
            fontFace: 'Arial',
            bold: true,
            align: 'center'
        });
        slideTitle.addText('Patient Presentation', {
            x: 0.8, y: 4.0, w: 11.73, h: 0.6,
            fontSize: 18,
            color: '#e0e0e0',
            fontFace: 'Arial',
            align: 'center',
            italic: true
        });
        const meta = [
            `Clinician: ${profession}`,
            `Diagnosis: ${diagnosis}`,
            `Date: ${new Date().toLocaleDateString()}`
        ];
        slideTitle.addText(meta.join('  |  '), {
            x: 0.8, y: 4.7, w: 11.73, h: 0.7,
            fontSize: 16,
            color: '#e0e0e0',
            fontFace: 'Arial',
            align: 'center',
            italic: true
        });
        slideTitle.addText('Generated by rehablix', {
            x: 0, y: 7.2, w: 13.33, h: 0.5,
            fontSize: 12,
            color: '#ffffff',
            align: 'center',
            fontFace: 'Arial'
        });

        previewHtml.push(`
            <div class="preview-slide" style="background: ${colors.primary}; color: #fff; padding: 30px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
                <div style="font-size: 0.8rem; opacity: 0.7;">rehablix · ${modeLabel}</div>
                <h2 style="margin: 10px 0; font-size: 2.2rem;">${patientDisplay}</h2>
                <p style="font-size: 1.1rem; opacity: 0.9;">${meta.join('  |  ')}</p>
                <div style="margin-top: 10px; font-size: 0.8rem; opacity: 0.6;">Generated by rehablix</div>
            </div>
        `);

        // --- CONTENT SLIDES ---
        let slideIndex = 1;
        slides.forEach((slideData, idx) => {
            const slide = pptx.addSlide();
            slide.background = { color: colors.slideBg };
            addDeco(slide, 'top');
            addDeco(slide, 'side');
            addDeco(slide, 'bottom');

            // Title
            slide.addText(slideData.title, {
                x: 0.6, y: 0.5, w: 11.73, h: 0.9,
                fontSize: 32,
                color: colors.headingColor || colors.primary,
                fontFace: 'Arial',
                bold: true,
                valign: 'middle'
            });

            slide.addShape('rect', {
                x: 0.6, y: 1.4, w: 2.5, h: 0.08,
                fill: { color: colors.accentBar },
                rectRadius: 0
            });

            // Handle different slide types
            const type = slideData.type || 'content';
            
            switch(type) {
                case 'chart':
                    // Add chart
                    if (slideData.chartData) {
                        addChartToSlide(slide, slideData, colors);
                    }
                    // Also add bullets if present
                    if (slideData.bullets && slideData.bullets.length > 0) {
                        let yPos = 2.5;
                        slideData.bullets.slice(0, 4).forEach(bullet => {
                            slide.addText(`● ${bullet}`, {
                                x: 0.8, y: yPos, w: 11.53, h: 0.5,
                                fontSize: 16,
                                color: colors.text,
                                valign: 'top'
                            });
                            yPos += 0.6;
                        });
                    }
                    break;
                    
                case 'comparison':
                    addComparisonSlide(slide, slideData, colors);
                    break;
                    
                case 'timeline':
                    addTimelineSlide(slide, slideData, colors);
                    break;
                    
                case 'big-number':
                    addBigNumberSlide(slide, slideData, colors);
                    break;
                    
                case 'table':
                    // Find table data
                    let tableData = null;
                    if (extractedTables.length > 0) {
                        tableData = extractedTables[0];
                    } else if (slideData.bullets && slideData.bullets.length > 0) {
                        const rows = slideData.bullets.map(b => b.split('|').map(s => s.trim()));
                        if (rows.length > 0 && rows[0].length > 1) {
                            tableData = rows;
                        }
                    }
                    if (tableData && tableData.length > 1) {
                        addTableToSlide(slide, tableData, colors, 1.0, 1.9, 11.33, 4.8);
                    } else if (slideData.bullets && slideData.bullets.length > 0) {
                        let yPos = 2.0;
                        slideData.bullets.forEach(bullet => {
                            slide.addText(`● ${bullet}`, {
                                x: 0.8, y: yPos, w: 11.53, h: 0.5,
                                fontSize: 16,
                                color: colors.text,
                                valign: 'top'
                            });
                            yPos += 0.6;
                        });
                    }
                    break;
                    
                case 'image':
                    // Image placeholder
                    slide.addShape('rect', {
                        x: 7.0, y: 1.8, w: 5.5, h: 4.5,
                        fill: { color: colors.accent },
                        rectRadius: 8,
                        opacity: 0.3
                    });
                    slide.addText('🖼️', {
                        x: 7.0, y: 3.0, w: 5.5, h: 1.0,
                        fontSize: 40,
                        color: colors.primary,
                        align: 'center'
                    });
                    if (slideData.imagePrompt) {
                        slide.addText(slideData.imagePrompt, {
                            x: 7.2, y: 4.2, w: 5.1, h: 1.5,
                            fontSize: 11,
                            color: colors.text,
                            align: 'center',
                            italic: true,
                            valign: 'top'
                        });
                    }
                    // Bullets on left
                    if (slideData.bullets && slideData.bullets.length > 0) {
                        let yPos = 2.0;
                        slideData.bullets.slice(0, 5).forEach(bullet => {
                            slide.addText(`● ${bullet}`, {
                                x: 0.8, y: yPos, w: 5.8, h: 0.5,
                                fontSize: 16,
                                color: colors.text,
                                valign: 'top'
                            });
                            yPos += 0.6;
                        });
                    }
                    break;
                    
                default: // content
                    if (slideData.bullets && slideData.bullets.length > 0) {
                        let yPos = 2.0;
                        const maxBullets = slideDensity === 'sparse' ? 4 : 
                                          slideDensity === 'dense' ? 8 : 6;
                        slideData.bullets.slice(0, maxBullets).forEach(bullet => {
                            slide.addText(`● ${bullet}`, {
                                x: 0.8, y: yPos, w: 11.53, h: 0.5,
                                fontSize: 17,
                                color: colors.text,
                                fontFace: 'Arial',
                                valign: 'top',
                                lineSpacing: 24,
                                autoFit: true
                            });
                            yPos += 0.65;
                        });
                    } else {
                        slide.addText('(No content)', {
                            x: 0.8, y: 2.0, w: 11.53, h: 0.6,
                            fontSize: 16,
                            color: colors.secondary,
                            fontFace: 'Arial',
                            italic: true,
                            valign: 'top'
                        });
                    }
                    break;
            }

            // Speaker notes
            if (includeSpeakerNotes && slideData.notes) {
                slide.addNotes(slideData.notes);
            }

            // Page number
            const pageNum = slideIndex + 1;
            slide.addText(`Page ${pageNum} of ${totalSlides}`, {
                x: 0, y: 7.1, w: 13.33, h: 0.4,
                fontSize: 10,
                color: colors.secondary,
                align: 'center',
                fontFace: 'Arial'
            });

            // Build preview HTML
            let previewExtra = '';
            const layoutBadge = slideData.layout ? 
                `<span class="preview-layout-badge">${slideData.layout}</span>` : '';
            
            if (type === 'chart' && slideData.chartData) {
                previewExtra = `
                    <div class="preview-chart">
                        <i class="fas fa-chart-${slideData.chartData.type || 'bar'}"></i>
                        <span class="chart-type">${slideData.chartData.type || 'Chart'}</span>
                        <span style="font-size:0.8rem; color:var(--text-secondary);">
                            ${slideData.chartData.labels ? slideData.chartData.labels.join(', ') : ''}
                        </span>
                    </div>
                `;
            } else if (type === 'image' && slideData.imagePrompt) {
                previewExtra = `
                    <div class="preview-image">
                        <i class="fas fa-image"></i>
                        <span class="image-prompt">${slideData.imagePrompt}</span>
                    </div>
                `;
            } else if (type === 'comparison') {
                previewExtra = `
                    <div class="preview-comparison">
                        <div class="col">
                            <h5>Before</h5>
                            ${(slideData.comparisonData?.left || []).map(item => 
                                `<p style="font-size:0.85rem;">• ${item}</p>`
                            ).join('')}
                        </div>
                        <div class="col">
                            <h5>After</h5>
                            ${(slideData.comparisonData?.right || []).map(item => 
                                `<p style="font-size:0.85rem;">• ${item}</p>`
                            ).join('')}
                        </div>
                    </div>
                `;
            } else if (type === 'timeline') {
                previewExtra = `
                    <div class="preview-timeline">
                        ${(slideData.timelineData || []).map(item => 
                            `<div class="item">
                                <span class="time">${item.time || ''}</span>
                                ${item.event || ''}
                            </div>`
                        ).join('')}
                    </div>
                `;
            } else if (type === 'big-number') {
                previewExtra = `
                    <div style="text-align:center; padding:10px; background:var(--bg-page); border-radius:8px; margin:5px 0;">
                        <span style="font-size:2.5rem; font-weight:700; color:${colors.primary};">${slideData.bigNumber?.number || 'N/A'}</span>
                        <p style="font-size:1rem; color:var(--text-secondary);">${slideData.bigNumber?.label || ''}</p>
                    </div>
                `;
            }

            const bulletHtml = (slideData.bullets || []).map(b => 
                `<p style="margin:4px 0; font-size:0.9rem; color:${colors.text};">
                    <span style="color:${colors.bulletColor}; font-weight:bold;">●</span> ${b}
                </p>`
            ).join('');

            const notesHtml = (includeSpeakerNotes && slideData.notes) ? 
                `<div class="preview-notes"><i class="fas fa-comment"></i> ${slideData.notes}</div>` : '';

            previewHtml.push(`
                <div class="preview-slide" style="background: ${colors.slideBg}; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                    <div style="height: 4px; background: ${colors.accentBar}; border-radius: 2px; margin-bottom: 10px;"></div>
                    <h4 style="color: ${colors.headingColor || colors.primary}; font-size: 1.3rem; margin: 0 0 4px 0;">
                        ${slideData.title}
                        ${layoutBadge}
                    </h4>
                    <hr style="width: 60px; border: 2px solid ${colors.accentBar}; margin: 0 0 10px 0;">
                    ${previewExtra}
                    ${bulletHtml || '<p style="color: ' + colors.secondary + '; font-style: italic;">No content</p>'}
                    ${notesHtml}
                    <div style="margin-top: 10px; font-size: 0.7rem; color: ${colors.secondary}; text-align: right;">Page ${pageNum} of ${totalSlides}</div>
                </div>
            `);

            slideIndex++;
        });

        // --- TABLE SLIDE ---
        if (extractedTables.length > 0) {
            const tableSlide = pptx.addSlide();
            tableSlide.background = { color: colors.slideBg };
            addDeco(tableSlide, 'top');
            addDeco(tableSlide, 'side');
            addDeco(tableSlide, 'bottom');

            tableSlide.addText('Data Table', {
                x: 0.6, y: 0.5, w: 11.73, h: 0.9,
                fontSize: 32,
                color: colors.headingColor || colors.primary,
                fontFace: 'Arial',
                bold: true,
                valign: 'middle'
            });
            tableSlide.addShape('rect', {
                x: 0.6, y: 1.4, w: 2.5, h: 0.08,
                fill: { color: colors.accentBar },
                rectRadius: 0
            });

            const tableData = extractedTables[0];
            if (tableData && tableData.length > 0) {
                addTableToSlide(tableSlide, tableData, colors, 1.0, 1.9, 11.33, 4.8);
            }

            const pageNum = slideIndex + 1;
            tableSlide.addText(`Page ${pageNum} of ${totalSlides}`, {
                x: 0, y: 7.1, w: 13.33, h: 0.4,
                fontSize: 10,
                color: colors.secondary,
                align: 'center',
                fontFace: 'Arial'
            });

            previewHtml.push(`
                <div class="preview-slide" style="background: ${colors.slideBg}; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                    <div style="height: 4px; background: ${colors.accentBar}; border-radius: 2px; margin-bottom: 10px;"></div>
                    <h4 style="color: ${colors.headingColor || colors.primary}; font-size: 1.3rem; margin: 0 0 4px 0;">Data Table</h4>
                    <hr style="width: 60px; border: 2px solid ${colors.accentBar}; margin: 0 0 10px 0;">
                    <div style="background: ${colors.accent}; opacity: 0.15; padding: 20px; border-radius: 8px; text-align: center;">
                        <span style="font-size: 2rem;">📊</span>
                        <p style="color: ${colors.text};">Table with ${tableData.length} rows</p>
                    </div>
                    <div style="margin-top: 10px; font-size: 0.7rem; color: ${colors.secondary}; text-align: right;">Page ${pageNum} of ${totalSlides}</div>
                </div>
            `);

            slideIndex++;
        }

        // --- THANK YOU SLIDE ---
        const thankSlide = pptx.addSlide();
        thankSlide.background = { color: colors.primary };
        thankSlide.addShape('rect', {
            x: 0, y: 6.7, w: 13.33, h: 0.8,
            fill: { color: colors.secondary },
            rectRadius: 0
        });
        thankSlide.addShape('rect', {
            x: 0, y: 6.5, w: 13.33, h: 0.05,
            fill: { color: '#ffffff' },
            rectRadius: 0,
            opacity: 0.3
        });
        thankSlide.addText('Thank You', {
            x: 0.8, y: 2.0, w: 11.73, h: 1.5,
            fontSize: 48,
            color: '#ffffff',
            fontFace: 'Arial',
            bold: true,
            align: 'center'
        });
        thankSlide.addText(patientDisplay, {
            x: 0.8, y: 3.8, w: 11.73, h: 0.7,
            fontSize: 24,
            color: '#e0e0e0',
            fontFace: 'Arial',
            align: 'center'
        });
        thankSlide.addText('Generated with rehablix', {
            x: 0.8, y: 4.7, w: 11.73, h: 0.6,
            fontSize: 16,
            color: '#e0e0e0',
            fontFace: 'Arial',
            align: 'center'
        });

        previewHtml.push(`
            <div class="preview-slide" style="background: ${colors.primary}; color: #fff; padding: 30px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
                <h2 style="margin: 0; font-size: 2.5rem;">Thank You</h2>
                <p style="margin: 10px 0; font-size: 1.2rem;">${patientDisplay}</p>
                <p style="font-size: 0.9rem; opacity: 0.8;">Generated with rehablix</p>
            </div>
        `);

        // --- PREVIEW OR DOWNLOAD ---
        if (!skipPreview) {
            const fullPreviewHtml = `
                <div style="max-width: 900px; margin: 0 auto; padding: 10px;">
                    ${previewHtml.join('')}
                </div>
            `;
            showPreview(fullPreviewHtml);
            if (generateBtn) {
                generateBtn.disabled = false;
                generateBtn.innerHTML = '<i class="fas fa-magic"></i> Generate & Download';
            }
            if (generationStatus) {
                generationStatus.style.display = 'none';
            }
            return;
        }

        const fileName = `${patientDisplay.replace(/\s+/g, '_')}_${modeLabel.replace(/\s+/g, '_')}_${Date.now()}.pptx`;
        await pptx.writeFile({ fileName: fileName });
        
        if (statusText) statusText.textContent = '✅ PowerPoint generated successfully!';
        if (generationStatus) {
            generationStatus.className = 'success';
        }
        showToast('✅ PowerPoint generated successfully!');

    } catch (err) {
        console.error('Generation error:', err);
        if (statusText) statusText.textContent = '❌ Error: ' + err.message;
        if (generationStatus) {
            generationStatus.className = 'error';
        }
        showToast('Error generating PowerPoint: ' + err.message, 'error');
    } finally {
        if (generateBtn) {
            generateBtn.disabled = false;
            generateBtn.innerHTML = '<i class="fas fa-magic"></i> Generate & Download';
        }
        setTimeout(() => {
            if (generationStatus) {
                generationStatus.style.display = 'none';
            }
        }, 5000);
    }
}

// =====================================================================
// EVENT LISTENERS
// =====================================================================
function setupEventListeners() {
    getDOMElements();
    
    // Art Style
    document.querySelectorAll('input[name="artStyle"]').forEach(el => {
        el.addEventListener('change', (e) => {
            selectedArtStyle = e.target.value;
            document.querySelectorAll('.style-option').forEach(opt => opt.classList.remove('selected'));
            e.target.closest('.style-option').classList.add('selected');
            updateStepIndicator(2);
        });
    });

    // Chart Style
    document.querySelectorAll('input[name="chartStyle"]').forEach(el => {
        el.addEventListener('change', (e) => {
            selectedChartStyle = e.target.value;
            document.querySelectorAll('#chartStyleOptions .style-option').forEach(opt => {
                opt.classList.remove('selected');
                if (opt.querySelector('input[value="' + selectedChartStyle + '"]')) {
                    opt.classList.add('selected');
                }
            });
        });
    });

    // Layout Type
    document.querySelectorAll('input[name="layoutType"]').forEach(el => {
        el.addEventListener('change', (e) => {
            selectedLayout = e.target.value;
            document.querySelectorAll('.layout-option').forEach(opt => opt.classList.remove('selected'));
            e.target.closest('.layout-option').classList.add('selected');
            updateStepIndicator(3);
        });
    });

    // Slide Structure
    document.querySelectorAll('input[name="slideStructure"]').forEach(el => {
        el.addEventListener('change', (e) => {
            selectedStructure = e.target.value;
            document.querySelectorAll('.structure-option').forEach(opt => opt.classList.remove('selected'));
            e.target.closest('.structure-option').classList.add('selected');
            updateSlideCount();
            updateStepIndicator(3);
        });
    });

    // Image Generation
    if (enableImageGenCheckbox) {
        enableImageGenCheckbox.addEventListener('change', (e) => {
            enableImageGeneration = e.target.checked;
        });
    }

    // Advanced Options
    const fontSizeSelect = document.getElementById('fontSizeSelect');
    if (fontSizeSelect) {
        fontSizeSelect.addEventListener('change', (e) => {
            fontSizePreference = e.target.value;
        });
    }

    const densitySelect = document.getElementById('densitySelect');
    if (densitySelect) {
        densitySelect.addEventListener('change', (e) => {
            slideDensity = e.target.value;
            updateSlideCount();
        });
    }

    const notesSelect = document.getElementById('notesSelect');
    if (notesSelect) {
        notesSelect.addEventListener('change', (e) => {
            includeSpeakerNotes = e.target.value === 'yes';
        });
    }

    const chartsSelect = document.getElementById('chartsSelect');
    if (chartsSelect) {
        chartsSelect.addEventListener('change', (e) => {
            includeCharts = e.target.value;
        });
    }

    // Generate Button
    if (generateBtn) {
        generateBtn.addEventListener('click', () => generatePPTX(false));
    }

    // Step items scroll
    document.querySelectorAll('.step-item').forEach((item, index) => {
        item.addEventListener('click', () => {
            const cards = document.querySelectorAll('.ppt-card');
            if (cards[index]) {
                cards[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

// =====================================================================
// KEYBOARD SHORTCUTS
// =====================================================================
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && document.activeElement === generateBtn) {
        generatePPTX(false);
    }
    if (e.key === 'Escape') {
        document.querySelectorAll('.toast').forEach(t => t.remove());
        const preview = document.querySelector('.ppt-preview-overlay');
        if (preview) preview.remove();
    }
});

// =====================================================================
// AUTH LISTENER
// =====================================================================
if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged((user) => {
        currentUser = user;
        if (user) {
            console.log('[PPT] User logged in:', user.email);
        } else {
            console.log('[PPT] User logged out');
        }
    });
}

// =====================================================================
// INIT
// =====================================================================
async function init() {
    console.log('[PPT] Initializing...');
    
    await waitForDOM();
    getDOMElements();
    renderThemes();
    setupCarouselNav();
    
    const contentLoaded = loadContent();
    if (!contentLoaded && generateBtn) {
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> No content loaded';
    }

    setupEventListeners();
    updateStepIndicator(1);
    await fetchTokens();

    // Set initial chart style selection
    document.querySelectorAll('#chartStyleOptions .style-option').forEach(opt => {
        const radio = opt.querySelector('input[type="radio"]');
        if (radio && radio.checked) {
            opt.classList.add('selected');
        }
    });

    isInitialized = true;
    
    console.log('[PPT] Ready!');
    console.log('[PPT] Content loaded:', contentData ? 'Yes' : 'No');
    console.log('[PPT] Selected theme:', selectedTheme.name);
    console.log('[PPT] Firebase available:', typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0);
    console.log('[PPT] Theme carousel found:', !!themeCarousel);
}

// Start the app
init();