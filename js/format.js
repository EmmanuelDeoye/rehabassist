// js/format.js - Complete Assessment Format Generator with Side Drawer
// Updated with PRINTABLE medical assessment form generation

// Global variables
let githubToken = '';
let apiEndpoint = '';
let currentUser = null;
let historyItems = [];

document.addEventListener('DOMContentLoaded', async function() {
  console.log('Format.js loaded');
  
  // DOM elements - Form
  const form = document.getElementById('assessmentForm');
  const generateBtn = document.getElementById('generateBtn');
  const clearBtn = document.getElementById('clearBtn');
  const toast = document.getElementById('toast');
  
  // DOM elements - Preview Card
  const resultPreviewCard = document.getElementById('resultPreviewCard');
  const resultPreview = document.getElementById('resultPreview');
  const viewFullBtn = document.getElementById('viewFullBtn');
  
  // DOM elements - History Drawer
  const historyNavBtn = document.getElementById('historyNavBtn');
  const historyDrawer = document.getElementById('historyDrawer');
  const closeDrawer = document.getElementById('closeDrawer');
  const historyList = document.getElementById('historyList');
  const historySearch = document.getElementById('historySearch');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  const totalCountSpan = document.getElementById('totalCount');
  const latestDateSpan = document.getElementById('latestDate');
  
  // DOM elements - Download Modal
  const downloadModal = document.getElementById('downloadModal');
  const downloadWordOption = document.getElementById('downloadWordOption');
  const downloadPdfOption = document.getElementById('downloadPdfOption');
  const cancelDownload = document.getElementById('cancelDownload');
  
  // DOM elements - Delete Confirmation
  const deleteConfirmModal = document.getElementById('deleteConfirmModal');
  const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  let itemToDelete = null;

  // ===== LOCALSTORAGE PERSISTENCE FUNCTIONS =====
  
  // Form field IDs to persist
  const formFields = [
    'patientName',
    'patientAge',
    'patientGender',
    'patientDiagnosis',
    'assessmentType',
    'categorySelect',
    'deptSelect',
    'pageCount',
    'clinicalNotes',
    'includeStandardSections'
  ];

  // Load saved form data from localStorage
  function loadFormFromStorage() {
    try {
      const savedData = localStorage.getItem('rehab_assessment_form');
      if (savedData) {
        const formData = JSON.parse(savedData);
        
        // Apply saved values to form fields
        formFields.forEach(fieldId => {
          const element = document.getElementById(fieldId);
          if (element && formData[fieldId] !== undefined) {
            if (element.type === 'checkbox') {
              element.checked = formData[fieldId];
            } else {
              element.value = formData[fieldId];
            }
          }
        });
        
        // Update page count display
        const pageVal = document.getElementById('pageVal');
        if (pageVal && formData.pageCount) {
          pageVal.textContent = formData.pageCount;
        }
        
        console.log('Form data loaded from localStorage');
      }
    } catch (error) {
      console.error('Error loading form from localStorage:', error);
    }
  }

  // Save form data to localStorage
  function saveFormToStorage() {
    try {
      const formData = {};
      
      formFields.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
          if (element.type === 'checkbox') {
            formData[fieldId] = element.checked;
          } else {
            formData[fieldId] = element.value;
          }
        }
      });
      
      localStorage.setItem('rehab_assessment_form', JSON.stringify(formData));
    } catch (error) {
      console.error('Error saving form to localStorage:', error);
    }
  }

  // Clear saved form data
  function clearFormStorage() {
    localStorage.removeItem('rehab_assessment_form');
  }

  // Auto-save on any form input change
  formFields.forEach(fieldId => {
    const element = document.getElementById(fieldId);
    if (element) {
      element.addEventListener('input', saveFormToStorage);
      element.addEventListener('change', saveFormToStorage);
    }
  });

  // Load saved data on page load
  loadFormFromStorage();

  // Check if Firebase is initialized
  if (typeof firebase === 'undefined') {
    console.error('Firebase SDK not loaded!');
    showToast('Firebase not initialized. Please check your connection.', true);
    return;
  }

  // Get database reference
  const database = firebase.database();

  // Fetch tokens from Firebase
  const tokens = await fetchTokens();
  if (tokens) {
    githubToken = tokens.token;
    apiEndpoint = tokens.endpoint;
    console.log('API credentials loaded');
  } else {
    showToast('Failed to load API credentials. Please try again.', true);
  }

  // Check authentication state
  firebase.auth().onAuthStateChanged((user) => {
    currentUser = user;
    if (user) {
      console.log('User logged in:', user.email);
      loadUserHistory();
    } else {
      console.log('User logged out');
      historyItems = [];
      updateHistoryUI();
    }
  });

  // ===== Helper Functions =====
  
  function showToast(message, isError = false, duration = 3000) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('hidden');
    toast.style.background = isError ? '#dc2626' : 'var(--accent)';
    
    setTimeout(() => {
      toast.classList.add('hidden');
    }, duration);
  }

  async function fetchTokens() {
    try {
      const snapshot = await database.ref('tokens/openAI').once('value');
      const data = snapshot.val();
      
      if (data) {
        return {
          token: data.openai_token,
          endpoint: data.github_endpoint
        };
      }
      return null;
    } catch (error) {
      console.error("Credential Error:", error);
      return null;
    }
  }

  // ===== Clean HTML Function =====
  function cleanHtml(html) {
    // Remove any markdown code fences
    html = html.replace(/```html?/g, '').replace(/```/g, '');
    // Remove any extra whitespace at start/end
    html = html.trim();
    return html;
  }

  // ===== UPDATED BUILD PROMPT - Your exact version =====
  function buildPrompt(data) {
    const sections = data.includeSections
      ? "SOAP notes may be included if clinically relevant."
      : "";

    return `Generate a professional PRINTABLE medical assessment form.

CONTEXT:
- Patient: ${data.name} (${data.age} years, ${data.gender})
- Diagnosis: ${data.diagnosis || "Not specified"}
- Assessment Type: ${data.assessmentType}
- Department: ${data.department}
- Category: ${data.category}
- Clinical Notes: ${data.notes || "None"}

REQUIREMENTS:
1. Return ONLY pure HTML. No markdown, no code fences.
2. The form MUST be PRINT-FRIENDLY (A4 layout).
3. DO NOT use interactive elements like select, radio, or contenteditable.

4. CRITICAL: TEXTAREA STRUCTURE - NO LABELS
   - Textareas MUST NOT have visible labels or placeholders above, inside or beside them
   - Example: <textarea rows="7"></textarea>
   - Do NOT write: <label>Psychiatric History:</label> <textarea></textarea>
   - The heading/subheading serves as the label, textarea is directly below it

5. CRITICAL: AUTO-EXPANDING TEXTAREAS
   - ALL textareas must have the following attributes and JavaScript for auto-expansion:
     - Add: oninput="this.style.height = ''; this.style.height = Math.min(this.scrollHeight, 400) + 'px'"
     - Set initial rows="10" but allow growth up to max-height
   - Full textarea code example:
     <textarea rows="7" 
               style="width:100%; resize:vertical; min-height:150px; max-height:500px; overflow-y:auto;" 
               placeholder="Enter observations here..."
               oninput="this.style.height = ''; this.style.height = Math.min(this.scrollHeight, 400) + 'px'"></textarea>

6. HISTORY SECTION FORMAT - SUBHEADINGS WITH AUTO-EXPAND TEXTAREAS:
   - Each history category must be a subheading (<h4> or <strong>) with a textarea directly below
   - No labels, only placeholder text
   - Format history sections like this:
     <h4>Psychiatric History</h4>
     <textarea rows="4" 
               style="width:100%; resize:vertical; min-height:80px; max-height:400px; overflow-y:auto;" 
               placeholder="Enter psychiatric history, including diagnoses, hospitalizations, medications..."
               oninput="this.style.height = ''; this.style.height = Math.min(this.scrollHeight, 400) + 'px'"></textarea>
     
     <h4>Medical History</h4>
     <textarea rows="4" 
               style="width:100%; resize:vertical; min-height:80px; max-height:400px; overflow-y:auto;" 
               placeholder="Enter medical history, including chronic conditions, surgeries, allergies..."
               oninput="this.style.height = ''; this.style.height = Math.min(this.scrollHeight, 400) + 'px'"></textarea>
     
     <h4>Family History</h4>
     <textarea rows="4" 
               style="width:100%; resize:vertical; min-height:80px; max-height:400px; overflow-y:auto;" 
               placeholder="Enter family history of relevant conditions..."
               oninput="this.style.height = ''; this.style.height = Math.min(this.scrollHeight, 400) + 'px'"></textarea>
     
     <h4>Social History</h4>
     <textarea rows="4" 
               style="width:100%; resize:vertical; min-height:80px; max-height:400px; overflow-y:auto;" 
               placeholder="Enter social history (occupation, living situation, habits, support system)..."
               oninput="this.style.height = ''; this.style.height = Math.min(this.scrollHeight, 400) + 'px'"></textarea>
     
     <h4>Previous Interventions</h4>
     <textarea rows="4" 
               style="width:100%; resize:vertical; min-height:80px; max-height:400px; overflow-y:auto;" 
               placeholder="Enter previous treatments, therapies, medications, and their outcomes..."
               oninput="this.style.height = ''; this.style.height = Math.min(this.scrollHeight, 400) + 'px'"></textarea>

7. STANDARD SECTIONS - ALL WITH AUTO-EXPAND TEXTAREAS:
   For all narrative sections, use subheadings with auto-expand textareas:
   
   <h4>Presenting Complaint & Referral Reason</h4>
   <textarea rows="5" 
             style="width:100%; resize:vertical; min-height:100px; max-height:400px; overflow-y:auto;" 
             placeholder="Describe the main presenting complaint, reason for referral, and relevant context..."
             oninput="this.style.height = ''; this.style.height = Math.min(this.scrollHeight, 400) + 'px'"></textarea>
   
   <h4>Clinical Observations</h4>
   <textarea rows="7" 
             style="width:100%; resize:vertical; min-height:140px; max-height:400px; overflow-y:auto;" 
             placeholder="Record behavioral observations, appearance, mood, affect, engagement, etc..."
             oninput="this.style.height = ''; this.style.height = Math.min(this.scrollHeight, 400) + 'px'"></textarea>
   
   <h4>Assessment Findings</h4>
   <textarea rows="7" 
             style="width:100%; resize:vertical; min-height:140px; max-height:400px; overflow-y:auto;" 
             placeholder="Summarize key assessment findings, test results, and clinical impressions..."
             oninput="this.style.height = ''; this.style.height = Math.min(this.scrollHeight, 400) + 'px'"></textarea>
   
   <h4>Treatment Plan & Recommendations</h4>
   <textarea rows="7" 
             style="width:100%; resize:vertical; min-height:140px; max-height:400px; overflow-y:auto;" 
             placeholder="Outline treatment goals, interventions, referrals, and recommendations..."
             oninput="this.style.height = ''; this.style.height = Math.min(this.scrollHeight, 400) + 'px'"></textarea>

8. USE TABLES ONLY FOR STRUCTURED DATA:
   - Tables should ONLY be used for numerical/structured data like:
     * Range of Motion (ROM) measurements
     * Muscle strength grading
     * Standardized test scores
   - Example: ROM table with joints, movements, and values
   - Do NOT use tables for narrative content or history sections

9. Department-specific guidance:
${getPrintableDepartmentContent(data.department, data.category)}

10. Final Section - Standardized Assessment Tools:
    You must List 5 REAL standardized assessment tools relevant to "${data.diagnosis}" with:
    - Tool name (as heading)
    - Short clinical purpose (small text)
    - Clickable link (<a href="" target="_blank">)
    - Space for score/result (use auto-expand textarea with placeholder "Score/Result")

11. DESIGN RULES:
    - Clean black-and-white professional layout
    - Proper spacing, alignment, and margins
    - Avoid clutter
    - Ensure readability when printed
    - All textareas should be full width (width:100%)
    - Textareas should auto-expand as user types

12. PRINT STYLING:
    - Use CSS with @media print
    - Avoid page breaks inside sections
    - Ensure margins are print-safe
    - Textareas should show their content fully when printed

13. CLINICAL INTELLIGENCE:
    - Be flexible and adaptive
    - Do NOT follow a rigid template
    - Tailor the form to the specific clinical scenario
    - Make it feel like a real-world hospital assessment document

${sections}

Return ONLY the HTML.`;
}

  function getPrintableDepartmentContent(department, category) {

    switch(department) {

      case 'Occupational Therapy':
        return `
- Include areas related to functional performance and independence.
- ADLs may be presented using checkboxes with space for comments.
- Provide space to document motor skills (fine/gross), coordination, and functional use.
- Include sensory processing observations where relevant (e.g., tactile, vestibular, proprioceptive).
- Allow space for cognitive and perceptual observations.
- Use tables or structured layouts where helpful, but keep flexibility.
`;

      case 'Physiotherapy':
        return `
- Include musculoskeletal and functional assessment components.
- Range of Motion (ROM) can be presented in table format with space for values and remarks.
- Muscle strength or performance may be documented in structured form.
- Include observational areas such as posture, gait, and mobility.
- Provide space for special tests and clinical interpretation.
`;

      case 'Speech Therapy':
        return `
- Include communication and speech-related components.
- Provide space for expressive and receptive language observations.
- Oral motor structure and function can be documented in a simple table or listed format.
- Include areas for voice, fluency, and articulation where relevant.
- Provide space for swallowing/feeding observations if applicable.
`;

      case 'Clinical Psychology':
        return `
- Include mental and behavioral assessment components.
- Provide structured areas for mental status observations (appearance, mood, thought, cognition).
- Include space for emotional and behavioral observations.
- Risk-related observations may be included where relevant.
- Allow room for narrative clinical impressions.
`;

      case 'Paediatric':
        return `
- Include developmental and functional assessment areas.
- Developmental milestones can be documented in a flexible table or notes format.
- Include caregiver concerns and observational notes.
- Provide space for play, social interaction, and learning-related observations.
- Ensure the structure is adaptable to different age groups.
`;

      default:
        return `
- Include general clinical assessment areas relevant to the case.
- Provide space for observations, findings, and interpretation.
- Include structured areas where necessary, but keep flexibility.
- Allow room for clinical judgment and notes.
`;
    }
  }

  // ===== History Functions =====
  
  async function loadUserHistory() {
    if (!currentUser) return;
    
    try {
      const snapshot = await database.ref(`history/${currentUser.uid}`).once('value');
      const data = snapshot.val();
      
      historyItems = [];
      if (data) {
        // Convert object to array and sort by date (newest first)
        historyItems = Object.entries(data).map(([id, item]) => ({
          id: id,
          ...item
        })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      }
      
      updateHistoryUI();
    } catch (error) {
      console.error('Error loading history:', error);
      showToast('Failed to load history', true);
    }
  }

  async function saveToHistory(assessmentData, generatedHtml) {
    if (!currentUser) {
      showToast('Please login to save history', true);
      return null;
    }

    try {
      const historyItem = {
        patientName: assessmentData.name,
        patientAge: assessmentData.age,
        patientGender: assessmentData.gender,
        diagnosis: assessmentData.diagnosis || '',
        assessmentType: assessmentData.assessmentType,
        category: assessmentData.category,
        department: assessmentData.department,
        pageCount: assessmentData.pageCount,
        notes: assessmentData.notes || '',
        includeSections: assessmentData.includeSections,
        generatedText: generatedHtml,
        preview: generatedHtml.replace(/<[^>]*>/g, ' ').substring(0, 150).replace(/\n/g, ' '),
        timestamp: new Date().toISOString(),
        userId: currentUser.uid
      };

      // Save to Firebase
      const newHistoryRef = database.ref(`history/${currentUser.uid}`).push();
      await newHistoryRef.set(historyItem);
      const newId = newHistoryRef.key;
      
      // Add to local array
      historyItems.unshift({
        id: newId,
        ...historyItem
      });
      
      updateHistoryUI();
      showToast('Assessment saved to history');
      return newId;
      
    } catch (error) {
      console.error('Error saving to history:', error);
      showToast('Failed to save to history', true);
      return null;
    }
  }

  async function deleteHistoryItem(itemId) {
    if (!currentUser || !itemId) return;
    
    try {
      await database.ref(`history/${currentUser.uid}/${itemId}`).remove();
      historyItems = historyItems.filter(item => item.id !== itemId);
      updateHistoryUI();
      showToast('Item deleted from history');
    } catch (error) {
      console.error('Error deleting history item:', error);
      showToast('Failed to delete item', true);
    }
  }

  async function clearAllHistory() {
    if (!currentUser) return;
    
    try {
      await database.ref(`history/${currentUser.uid}`).remove();
      historyItems = [];
      updateHistoryUI();
      showToast('All history cleared');
      deleteConfirmModal.classList.remove('show');
    } catch (error) {
      console.error('Error clearing history:', error);
      showToast('Failed to clear history', true);
    }
  }

  function retrieveHistoryItem(item) {
    // Open result page with the item ID as a query parameter
    window.open(`formatresult.html?id=${item.id}`, '_blank');
  }

  function updateHistoryUI(searchTerm = '') {
    if (!historyList) return;
    
    // Update stats
    if (totalCountSpan) {
      totalCountSpan.textContent = historyItems.length;
    }
    
    if (latestDateSpan && historyItems.length > 0) {
      const latest = new Date(historyItems[0].timestamp);
      latestDateSpan.textContent = latest.toLocaleDateString();
    } else if (latestDateSpan) {
      latestDateSpan.textContent = '-';
    }
    
    // Filter items based on search
    let filteredItems = historyItems;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filteredItems = historyItems.filter(item => 
        item.patientName?.toLowerCase().includes(term) ||
        item.assessmentType?.toLowerCase().includes(term) ||
        item.department?.toLowerCase().includes(term) ||
        item.category?.toLowerCase().includes(term) ||
        item.diagnosis?.toLowerCase().includes(term) ||
        item.preview?.toLowerCase().includes(term)
      );
    }
    
    if (filteredItems.length === 0) {
      historyList.innerHTML = `
        <div class="empty-history">
          <p>${searchTerm ? 'No matching history items' : 'No history yet'}</p>
          <small>${searchTerm ? 'Try a different search term' : 'Generate your first assessment to see it here'}</small>
        </div>
      `;
      return;
    }
    
    // Render history items
    historyList.innerHTML = filteredItems.map(item => {
      const date = new Date(item.timestamp);
      const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
      const previewText = item.preview || formatTextForPreview(item.generatedText);
      
      return `
        <div class="history-item" data-id="${item.id}">
          <div class="history-item-header">
            <span class="history-item-title">${item.patientName || 'Unknown Patient'}</span>
            <span class="history-item-date">${formattedDate}</span>
          </div>
          <div class="history-item-details">
            <span class="history-item-badge">${item.assessmentType || 'Assessment'}</span>
            
          </div>
          
          <div class="history-item-actions">
            <button class="history-item-btn retrieve" onclick="window.retrieveItem('${item.id}')">
              <span>📂</span> Retrieve
            </button>
            <button class="history-item-btn delete" onclick="window.deleteItem('${item.id}')">
              <span>🗑️</span> Delete
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  function formatTextForPreview(text) {
    if (!text) return '';
    // Strip HTML tags for preview
    return text.replace(/<[^>]*>/g, ' ').substring(0, 150) + '...';
  }

  // Make functions globally available for history buttons
  window.retrieveItem = (itemId) => {
    const item = historyItems.find(i => i.id === itemId);
    if (item) retrieveHistoryItem(item);
  };

  window.deleteItem = (itemId) => {
    itemToDelete = itemId;
    deleteConfirmModal.classList.add('show');
  };

  // ===== Preview Card Functions =====
  
  function showPreviewCard(html, formData) {
    // Create a preview by stripping HTML tags
    const textPreview = html.replace(/<[^>]*>/g, ' ').substring(0, 200);
    
    resultPreview.innerHTML = `
      <div style="margin-bottom: 0.5rem;">
        <strong>${formData.assessmentType} for ${formData.name}</strong>
      </div>
      <div>${textPreview}...</div>
    `;
    
    resultPreviewCard.style.display = 'block';
    
    // Store the full HTML for later use
    window.currentGeneratedText = html;
    window.currentFormData = formData;
  }

  // ===== Form Submission =====
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!githubToken || !apiEndpoint) {
      showToast('API credentials not loaded. Please refresh and try again.', true);
      return;
    }

    // Collect form data
    const formData = {
      name: document.getElementById('patientName').value.trim(),
      age: document.getElementById('patientAge').value,
      gender: document.getElementById('patientGender').value,
      diagnosis: document.getElementById('patientDiagnosis')?.value.trim() || '',
      assessmentType: document.getElementById('assessmentType').value,
      category: document.getElementById('categorySelect').value,
      department: document.getElementById('deptSelect').value,
      pageCount: document.getElementById('pageCount').value,
      notes: document.getElementById('clinicalNotes').value.trim(),
      includeSections: document.getElementById('includeStandardSections').checked
    };

    // Validate required fields
    if (!formData.name || !formData.age || !formData.gender || !formData.assessmentType || !formData.department || !formData.pageCount) {
      showToast('Please fill in all required fields.', true);
      return;
    }

    if (formData.age <= 0 || formData.age > 150) {
      showToast('Please enter a valid age.', true);
      return;
    }

    // Show loading state on button
    generateBtn.disabled = true;
    const btnText = generateBtn.querySelector('.btn-text');
    const spinner = generateBtn.querySelector('.loading-spinner-small');
    btnText.textContent = 'Generating...';
    spinner.style.display = 'inline-block';

    try {
      const prompt = buildPrompt(formData);
      
      const response = await fetch(`${apiEndpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${githubToken}`
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'You are a senior rehabilitation therapist. You always return clean, printable HTML forms. Never use Markdown or code fences.' },
            { role: 'user', content: prompt }
          ],
          model: 'openai/gpt-4.1',
          temperature: 0.7,
          max_tokens: 4000
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid API response structure');
      }

      let html = data.choices[0].message.content;
      
      // Clean the HTML
      html = cleanHtml(html);

      if (!html) {
        throw new Error('Empty response from API');
      }

      // Show preview card
      showPreviewCard(html, formData);
      
      // Save to history and get the new ID
      const newId = await saveToHistory(formData, html);
      
      // Store the ID for later use
      if (newId) {
        window.currentAssessmentId = newId;
      }
      
      showToast('Assessment format generated successfully!');
    } catch (error) {
      console.error('Generation error:', error);
      showToast('Failed to generate. Please try again.', true);
    } finally {
      generateBtn.disabled = false;
      btnText.textContent = 'Generate Format';
      spinner.style.display = 'none';
    }
  });

  // ===== View Full Assessment - Redirect to formatresult.html with ID =====
  
  if (viewFullBtn) {
    viewFullBtn.addEventListener('click', async () => {
      if (window.currentGeneratedText && window.currentFormData) {
        // If we have an ID, use it, otherwise save first
        if (window.currentAssessmentId) {
          window.open(`formatresult.html?id=${window.currentAssessmentId}`, '_blank');
        } else {
          // Save to history first
          const newId = await saveToHistory(window.currentFormData, window.currentGeneratedText);
          if (newId) {
            window.open(`formatresult.html?id=${newId}`, '_blank');
          } else {
            showToast('Error saving assessment', true);
          }
        }
      } else {
        showToast('No assessment to view', true);
      }
    });
  }

  // ===== Download Functions =====
  
  if (downloadWordOption) {
    downloadWordOption.addEventListener('click', () => {
      downloadModal.classList.remove('show');
      if (!window.currentGeneratedText || !window.currentFormData) {
        showToast('No assessment to download', true);
        return;
      }
      downloadAsWord(window.currentGeneratedText, window.currentFormData);
    });
  }

  function downloadAsWord(html, formData) {
    const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Assessment - ${formData.name}</title>
  <style>
    body { 
      font-family: 'Arial', 'Helvetica', sans-serif; 
      line-height: 1.6; 
      padding: 2rem; 
      max-width: 1200px; 
      margin: 0 auto;
    }
    h1, h2, h3 { color: #00695c; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
    th { background-color: #f5f5f5; }
    textarea { width: 100%; min-height: 100px; margin: 0.5rem 0; padding: 8px; }
    input[type="checkbox"] { margin: 0.5rem; }
    @media print {
      body { padding: 0.5in; }
      textarea { border: 1px solid #ccc; }
    }
  </style>
</head>
<body>
  <div style="text-align: center; margin-bottom: 2rem;">
    <h1>rehab.ai Assessment</h1>
    <p>Generated: ${new Date().toLocaleString()}</p>
    <hr>
  </div>
  ${html}
  <hr>
  <p style="font-size: 0.8rem; color: #666;">Generated by rehab.ai - Intelligent Rehabilitation Tools</p>
</body>
</html>`;
    
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assessment_${formData.name}_${new Date().toISOString().slice(0,10)}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Word document downloaded successfully!');
  }

  function downloadAsPdf(html, formData) {
    const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Assessment - ${formData.name}</title>
  <style>
    body { 
      font-family: 'Arial', 'Helvetica', sans-serif; 
      line-height: 1.6; 
      padding: 2rem; 
      max-width: 1200px; 
      margin: 0 auto;
    }
    h1, h2, h3 { color: #00695c; }
    table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
    th { background-color: #f5f5f5; }
    textarea { width: 100%; min-height: 100px; margin: 0.5rem 0; padding: 8px; }
    input[type="checkbox"] { margin: 0.5rem; }
    @media print {
      body { padding: 0.5in; }
      textarea { border: 1px solid #ccc; }
    }
  </style>
</head>
<body>
  <div style="text-align: center; margin-bottom: 2rem;">
    <h1>rehab.ai Assessment</h1>
    <p>Generated: ${new Date().toLocaleString()}</p>
    <hr>
  </div>
  ${html}
  <hr>
  <p style="font-size: 0.8rem; color: #666;">Generated by rehab.ai - Intelligent Rehabilitation Tools</p>
</body>
</html>`;

    const win = window.open('', '_blank');
    win.document.write(fullHtml);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  }

  if (cancelDownload) {
    cancelDownload.addEventListener('click', () => {
      downloadModal.classList.remove('show');
    });
  }

  // ===== Clear Form =====
  
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      form.reset();
      // Reset page count display
      const pageVal = document.getElementById('pageVal');
      if (pageVal) pageVal.textContent = '2';
      resultPreviewCard.style.display = 'none';
      
      // Clear localStorage as well
      clearFormStorage();
      
      delete window.currentGeneratedText;
      delete window.currentFormData;
      delete window.currentAssessmentId;
      showToast('Form cleared');
    });
  }

  // ===== History Drawer Controls =====
  
  if (historyNavBtn) {
    historyNavBtn.addEventListener('click', () => {
      if (!currentUser) {
        showToast('Please login to view history', true);
        return;
      }
      loadUserHistory();
      historyDrawer.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  }

  if (closeDrawer) {
    closeDrawer.addEventListener('click', () => {
      historyDrawer.classList.remove('open');
      document.body.style.overflow = '';
    });
  }

  // Click outside to close drawer
  document.addEventListener('click', (e) => {
    if (historyDrawer && historyNavBtn && 
        !historyDrawer.contains(e.target) && 
        !historyNavBtn.contains(e.target) && 
        historyDrawer.classList.contains('open')) {
      historyDrawer.classList.remove('open');
      document.body.style.overflow = '';
    }
  });

  if (historySearch) {
    historySearch.addEventListener('input', (e) => {
      updateHistoryUI(e.target.value);
    });
  }

  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
      if (historyItems.length === 0) {
        showToast('No history to clear', true);
        return;
      }
      itemToDelete = 'all';
      deleteConfirmModal.classList.add('show');
    });
  }

  // ===== Delete Confirmation =====
  
  if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener('click', () => {
      deleteConfirmModal.classList.remove('show');
      itemToDelete = null;
    });
  }

  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener('click', async () => {
      if (itemToDelete === 'all') {
        await clearAllHistory();
      } else if (itemToDelete) {
        await deleteHistoryItem(itemToDelete);
      }
      deleteConfirmModal.classList.remove('show');
      itemToDelete = null;
    });
  }

  // Close modals on outside click
  [downloadModal, deleteConfirmModal].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('show');
          if (modal === deleteConfirmModal) itemToDelete = null;
        }
      });
    }
  });

  // ===== Range Slider Display Update =====
  const pageCount = document.getElementById('pageCount');
  const pageVal = document.getElementById('pageVal');
  if (pageCount && pageVal) {
    pageCount.addEventListener('input', () => {
      pageVal.textContent = pageCount.value;
      // Also save to storage on range change
      saveFormToStorage();
    });
  }

  // ===== Keyboard Shortcuts =====
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (historyDrawer && historyDrawer.classList.contains('open')) {
        historyDrawer.classList.remove('open');
        document.body.style.overflow = '';
      }
      if (downloadModal && downloadModal.classList.contains('show')) {
        downloadModal.classList.remove('show');
      }
      if (deleteConfirmModal && deleteConfirmModal.classList.contains('show')) {
        deleteConfirmModal.classList.remove('show');
        itemToDelete = null;
      }
    }
  });

  // Ctrl+Enter to submit form
  if (form) {
    form.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        form.dispatchEvent(new Event('submit'));
      }
    });
  }

  console.log('Format.js fully initialized with printable medical assessment form generation');
});
