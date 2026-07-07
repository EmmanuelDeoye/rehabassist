// js/ppt.js - PowerPoint Export Logic

// =====================================================================
// DATA
// =====================================================================
const THEMES = [{
    id: 'tranquil',
    name: 'Tranquil',
    desc: 'Soft greens and blues, calming vibe',
    colors: {
        primary: '#009688',
        secondary: '#4db6ac',
        accent: '#e0f2f1',
        background: '#ffffff',
        text: '#1f2933',
        slideBg: '#f5f9f8',
        titleColor: '#009688'
    },
    previewColors: ['#009688', '#4db6ac', '#e0f2f1']
}, {
    id: 'cigar',
    name: 'Cigar',
    desc: 'Warm browns and golds, sophisticated',
    colors: {
        primary: '#8d6e63',
        secondary: '#d7ccc8',
        accent: '#f5e6d3',
        background: '#ffffff',
        text: '#3e2723',
        slideBg: '#faf0e6',
        titleColor: '#6d4c41'
    },
    previewColors: ['#8d6e63', '#d7ccc8', '#f5e6d3']
}, {
    id: 'ocean',
    name: 'Ocean',
    desc: 'Deep blues and teals, professional',
    colors: {
        primary: '#0277bd',
        secondary: '#4fc3f7',
        accent: '#e1f5fe',
        background: '#ffffff',
        text: '#01579b',
        slideBg: '#f0f8ff',
        titleColor: '#0277bd'
    },
    previewColors: ['#0277bd', '#4fc3f7', '#e1f5fe']
}, {
    id: 'forest',
    name: 'Forest',
    desc: 'Earthy greens, natural and fresh',
    colors: {
        primary: '#2e7d32',
        secondary: '#81c784',
        accent: '#e8f5e9',
        background: '#ffffff',
        text: '#1b3a1b',
        slideBg: '#f5faf5',
        titleColor: '#2e7d32'
    },
    previewColors: ['#2e7d32', '#81c784', '#e8f5e9']
}, {
    id: 'sunset',
    name: 'Sunset',
    desc: 'Warm oranges and pinks, energetic',
    colors: {
        primary: '#e65100',
        secondary: '#ffab91',
        accent: '#fbe9e7',
        background: '#ffffff',
        text: '#4e2a1a',
        slideBg: '#fff5f0',
        titleColor: '#d84315'
    },
    previewColors: ['#e65100', '#ffab91', '#fbe9e7']
}, {
    id: 'monochrome',
    name: 'Monochrome',
    desc: 'Black, white, and grays, timeless',
    colors: {
        primary: '#424242',
        secondary: '#bdbdbd',
        accent: '#f5f5f5',
        background: '#ffffff',
        text: '#212121',
        slideBg: '#fafafa',
        titleColor: '#424242'
    },
    previewColors: ['#424242', '#bdbdbd', '#f5f5f5']
}, {
    id: 'royal',
    name: 'Royal',
    desc: 'Deep purples and golds, elegant',
    colors: {
        primary: '#6a1b9a',
        secondary: '#ce93d8',
        accent: '#f3e5f5',
        background: '#ffffff',
        text: '#311b92',
        slideBg: '#f8f4fc',
        titleColor: '#6a1b9a'
    },
    previewColors: ['#6a1b9a', '#ce93d8', '#f3e5f5']
}, {
    id: 'clinical',
    name: 'Clinical',
    desc: 'Clean whites and medical blues',
    colors: {
        primary: '#0d47a1',
        secondary: '#64b5f6',
        accent: '#e3f2fd',
        background: '#ffffff',
        text: '#0d1b2a',
        slideBg: '#f5f9ff',
        titleColor: '#0d47a1'
    },
    previewColors: ['#0d47a1', '#64b5f6', '#e3f2fd']
}];

// =====================================================================
// STATE
// =====================================================================
let selectedTheme = THEMES[0];
let selectedArtStyle = 'photo';
let selectedLayout = 'freeform';
let selectedStructure = 'headings';
let contentData = null;

// =====================================================================
// DOM REFS
// =====================================================================
const themeCarousel = document.getElementById('themeCarousel');
const generateBtn = document.getElementById('generatePptBtn');
const slideCountSpan = document.getElementById('slideCount');
const toastContainer = document.getElementById('toast-container');
const pptInstructions = document.getElementById('pptInstructions');
const themePrev = document.getElementById('themePrev');
const themeNext = document.getElementById('themeNext');

// =====================================================================
// TOAST
// =====================================================================
function showToast(msg, type = 'success') {
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
    }, 4000);
}

// =====================================================================
// RENDER THEMES (Carousel)
// =====================================================================
function renderThemes() {
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
    document.querySelectorAll('.step-item').forEach((item, index) => {
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
    const scrollAmount = 220;
    if (direction === 'next') {
        themeCarousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    } else {
        themeCarousel.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    }
}

if (themePrev) {
    themePrev.addEventListener('click', () => scrollCarousel('prev'));
}
if (themeNext) {
    themeNext.addEventListener('click', () => scrollCarousel('next'));
}

// =====================================================================
// UPDATE SLIDE COUNT
// =====================================================================
function updateSlideCount() {
    if (!contentData) {
        slideCountSpan.textContent = '0';
        return;
    }
    const content = contentData.content;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;

    let count = 0;
    if (selectedStructure === 'headings') {
        const headings = tempDiv.querySelectorAll('h1, h2, h3');
        count = Math.max(1, headings.length);
    } else if (selectedStructure === 'paragraphs') {
        const paragraphs = tempDiv.querySelectorAll('p');
        count = Math.max(1, paragraphs.length);
    } else {
        const headings = tempDiv.querySelectorAll('h1, h2, h3');
        const paragraphs = tempDiv.querySelectorAll('p');
        count = Math.max(1, headings.length + Math.ceil(paragraphs.length / 2));
    }

    // Add title slide + thank you slide
    count += 2;
    slideCountSpan.textContent = count;
}

// =====================================================================
// LOAD CONTENT FROM localStorage
// =====================================================================
function loadContent() {
    const raw = localStorage.getItem('pptExportData');
    if (!raw) {
        showToast('No document content found. Please generate a document first.', 'error');
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> No content loaded';
        return false;
    }
    try {
        contentData = JSON.parse(raw);
        updateSlideCount();
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fas fa-magic"></i> Generate PowerPoint';
        return true;
    } catch (e) {
        showToast('Error loading content.', 'error');
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error loading content';
        return false;
    }
}

// =====================================================================
// GENERATE PPTX
// =====================================================================
async function generatePPTX() {
    if (!contentData) {
        showToast('No content to export.', 'error');
        return;
    }

    generateBtn.disabled = true;
    generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';

    try {
        const pptx = new PptxGenJS();
        pptx.defineLayout({ name: 'WIDE', width: 13.33, height: 7.5 });
        pptx.layout = 'WIDE';

        const colors = selectedTheme.colors;
        const additionalInstructions = pptInstructions.value.trim();

        // --- Title Slide ---
        const slide1 = pptx.addSlide();
        slide1.background = { color: colors.slideBg };

        slide1.addShape(pptx.ShapeType.rect, {
            x: 0,
            y: 0,
            w: 13.33,
            h: 0.6,
            fill: { color: colors.primary },
            rectRadius: 0
        });

        slide1.addText(`rehablix · ${contentData.modeLabel || 'Clinical Presentation'}`, {
            x: 0.8,
            y: 1.8,
            w: 11.73,
            h: 1.2,
            fontSize: 36,
            color: colors.text,
            fontFace: 'Arial',
            bold: true,
            align: 'center'
        });

        const patientDisplay = contentData.patientName || 'N/A';
        slide1.addText(`Patient: ${patientDisplay}`, {
            x: 0.8,
            y: 3.4,
            w: 11.73,
            h: 0.8,
            fontSize: 22,
            color: colors.text,
            fontFace: 'Arial',
            align: 'center'
        });

        const meta = [
            `Clinician: ${contentData.profession || 'N/A'}`,
            `Diagnosis: ${contentData.diagnosis || 'N/A'}`,
            `Date: ${new Date().toLocaleDateString()}`
        ];
        slide1.addText(meta.join('  |  '), {
            x: 0.8,
            y: 4.6,
            w: 11.73,
            h: 0.8,
            fontSize: 16,
            color: colors.text,
            fontFace: 'Arial',
            align: 'center',
            italic: true
        });

        slide1.addText('Generated by rehablix', {
            x: 0,
            y: 7.0,
            w: 13.33,
            h: 0.5,
            fontSize: 10,
            color: colors.secondary,
            align: 'center',
            fontFace: 'Arial'
        });

        // --- Content Slides ---
        const contentHTML = contentData.content;
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = contentHTML;

        let elements = [];

        if (selectedStructure === 'headings') {
            const children = tempDiv.children;
            let currentSlide = [];
            for (let child of children) {
                if (child.tagName.match(/^H[1-3]$/i)) {
                    if (currentSlide.length > 0) {
                        elements.push(currentSlide);
                        currentSlide = [];
                    }
                    currentSlide.push(child.cloneNode(true));
                } else {
                    currentSlide.push(child.cloneNode(true));
                }
            }
            if (currentSlide.length > 0) {
                elements.push(currentSlide);
            }
        } else if (selectedStructure === 'paragraphs') {
            const children = tempDiv.children;
            let currentSlide = [];
            for (let child of children) {
                currentSlide.push(child.cloneNode(true));
                if (child.tagName === 'P' || child.tagName === 'UL' || child.tagName === 'OL') {
                    elements.push(currentSlide);
                    currentSlide = [];
                }
            }
            if (currentSlide.length > 0) {
                elements.push(currentSlide);
            }
        } else {
            const children = tempDiv.children;
            let currentSlide = [];
            for (let child of children) {
                if (child.tagName.match(/^H[1-3]$/i)) {
                    if (currentSlide.length > 0) {
                        elements.push(currentSlide);
                        currentSlide = [];
                    }
                    currentSlide.push(child.cloneNode(true));
                } else {
                    currentSlide.push(child.cloneNode(true));
                    if (currentSlide.length >= 3) {
                        elements.push(currentSlide);
                        currentSlide = [];
                    }
                }
            }
            if (currentSlide.length > 0) {
                elements.push(currentSlide);
            }
        }

        if (elements.length === 0) {
            elements = [
                [...tempDiv.children].map(c => c.cloneNode(true))
            ];
        }

        elements.forEach((slideElements, index) => {
            const slide = pptx.addSlide();
            slide.background = { color: colors.slideBg };

            slide.addShape(pptx.ShapeType.rect, {
                x: 0,
                y: 0,
                w: 13.33,
                h: 0.15,
                fill: { color: colors.primary }
            });

            let textContent = '';
            let listItems = [];
            let isList = false;
            let hasHeading = false;
            let slideTitle = '';

            slideElements.forEach(el => {
                const tag = el.tagName.toLowerCase();
                if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
                    hasHeading = true;
                    slideTitle = el.textContent.trim();
                    const level = parseInt(tag[1]);
                    const prefix = '#'.repeat(level) + ' ';
                    textContent += prefix + el.textContent.trim() + '\n';
                } else if (tag === 'ul' || tag === 'ol') {
                    const items = el.querySelectorAll('li');
                    items.forEach(li => {
                        listItems.push('• ' + li.textContent.trim());
                    });
                    isList = true;
                } else {
                    const txt = el.textContent.trim();
                    if (txt) {
                        textContent += txt + '\n\n';
                    }
                }
            });

            if (!hasHeading) {
                slideTitle = `Slide ${index + 1}`;
            } else {
                textContent = textContent.replace(/^#{1,3}\s+.+/, '').trim();
            }

            slide.addText(slideTitle, {
                x: 0.8,
                y: 0.5,
                w: 11.73,
                h: 0.8,
                fontSize: 26,
                color: colors.titleColor || colors.primary,
                fontFace: 'Arial',
                bold: true
            });

            let bodyText = textContent;
            if (isList && listItems.length > 0) {
                bodyText = listItems.join('\n');
            }

            if (bodyText.trim()) {
                slide.addText(bodyText, {
                    x: 0.8,
                    y: 1.6,
                    w: 11.73,
                    h: 5.0,
                    fontSize: 16,
                    color: colors.text,
                    fontFace: 'Arial',
                    valign: 'top',
                    lineSpacing: 26,
                    autoFit: true
                });
            } else if (!isList) {
                slide.addText('(No content)', {
                    x: 0.8,
                    y: 1.6,
                    w: 11.73,
                    h: 5.0,
                    fontSize: 14,
                    color: colors.secondary,
                    fontFace: 'Arial',
                    valign: 'top',
                    italic: true
                });
            }

            slide.addText(`Page ${index + 1} of ${elements.length}`, {
                x: 0,
                y: 7.0,
                w: 13.33,
                h: 0.5,
                fontSize: 10,
                color: colors.secondary,
                align: 'center',
                fontFace: 'Arial'
            });
        });

        // --- Thank You Slide ---
        const thanksSlide = pptx.addSlide();
        thanksSlide.background = { color: colors.slideBg };
        thanksSlide.addShape(pptx.ShapeType.rect, {
            x: 0,
            y: 0,
            w: 13.33,
            h: 0.6,
            fill: { color: colors.primary },
            rectRadius: 0
        });
        thanksSlide.addText('Thank You', {
            x: 0.8,
            y: 2.0,
            w: 11.73,
            h: 1.5,
            fontSize: 44,
            color: colors.primary,
            fontFace: 'Arial',
            bold: true,
            align: 'center'
        });
        thanksSlide.addText(`Patient: ${contentData.patientName || 'N/A'}`, {
            x: 0.8,
            y: 3.8,
            w: 11.73,
            h: 0.6,
            fontSize: 18,
            color: colors.text,
            fontFace: 'Arial',
            align: 'center'
        });
        thanksSlide.addText('Generated with rehablix', {
            x: 0.8,
            y: 4.6,
            w: 11.73,
            h: 0.6,
            fontSize: 14,
            color: colors.secondary,
            fontFace: 'Arial',
            align: 'center'
        });

        // Additional notes slide
        if (additionalInstructions) {
            const notesSlide = pptx.addSlide();
            notesSlide.background = { color: colors.slideBg };
            notesSlide.addShape(pptx.ShapeType.rect, {
                x: 0,
                y: 0,
                w: 13.33,
                h: 0.15,
                fill: { color: colors.primary }
            });
            notesSlide.addText('Additional Notes', {
                x: 0.8,
                y: 0.5,
                w: 11.73,
                h: 0.8,
                fontSize: 26,
                color: colors.titleColor || colors.primary,
                fontFace: 'Arial',
                bold: true
            });
            notesSlide.addText(additionalInstructions, {
                x: 0.8,
                y: 1.6,
                w: 11.73,
                h: 5.0,
                fontSize: 16,
                color: colors.text,
                fontFace: 'Arial',
                valign: 'top',
                lineSpacing: 26,
                autoFit: true
            });
            notesSlide.addText(`Page ${elements.length + 2} of ${elements.length + 2}`, {
                x: 0,
                y: 7.0,
                w: 13.33,
                h: 0.5,
                fontSize: 10,
                color: colors.secondary,
                align: 'center',
                fontFace: 'Arial'
            });
        }

        const fileName =
            `${contentData.patientName || 'Presentation'}_${contentData.modeLabel || 'Clinical'}_${Date.now()}.pptx`;
        await pptx.writeFile({ fileName: fileName });
        showToast('✅ PowerPoint generated successfully!');

    } catch (err) {
        console.error(err);
        showToast('Error generating PowerPoint: ' + err.message, 'error');
    } finally {
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fas fa-magic"></i> Generate PowerPoint';
    }
}

// =====================================================================
// EVENT LISTENERS
// =====================================================================
document.querySelectorAll('input[name="artStyle"]').forEach(el => {
    el.addEventListener('change', (e) => {
        selectedArtStyle = e.target.value;
        document.querySelectorAll('.style-option').forEach(opt => opt.classList.remove('selected'));
        e.target.closest('.style-option').classList.add('selected');
        updateStepIndicator(2);
    });
});

document.querySelectorAll('input[name="layoutType"]').forEach(el => {
    el.addEventListener('change', (e) => {
        selectedLayout = e.target.value;
        document.querySelectorAll('.layout-option').forEach(opt => opt.classList.remove('selected'));
        e.target.closest('.layout-option').classList.add('selected');
        updateStepIndicator(3);
    });
});

document.querySelectorAll('input[name="slideStructure"]').forEach(el => {
    el.addEventListener('change', (e) => {
        selectedStructure = e.target.value;
        document.querySelectorAll('.structure-option').forEach(opt => opt.classList.remove('selected'));
        e.target.closest('.structure-option').classList.add('selected');
        updateSlideCount();
        updateStepIndicator(3);
    });
});

generateBtn.addEventListener('click', generatePPTX);

// =====================================================================
// KEYBOARD SHORTCUTS
// =====================================================================
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && document.activeElement === generateBtn) {
        generatePPTX();
    }
    if (e.key === 'Escape') {
        document.querySelectorAll('.toast').forEach(t => t.remove());
    }
});

// =====================================================================
// SCROLL TO STEP ON CLICK
// =====================================================================
document.querySelectorAll('.step-item').forEach((item, index) => {
    item.addEventListener('click', () => {
        const cards = document.querySelectorAll('.ppt-card');
        if (cards[index]) {
            cards[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// =====================================================================
// INIT
// =====================================================================
renderThemes();
const contentLoaded = loadContent();

if (!contentLoaded) {
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> No content loaded';
}

updateStepIndicator(1);

console.log('PPT Export ready.');
console.log('Content loaded:', contentData ? 'Yes' : 'No');
console.log('Selected theme:', selectedTheme.name);