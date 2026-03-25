// js/standardized.js - Updated with preview card and PDF viewer

// Global variables
let githubToken = '';
let apiEndpoint = '';
let currentUser = null;
let generatedContent = '';
let generatedToolName = '';
let generatedHtmlContent = '';
let historyItems = [];

document.addEventListener('DOMContentLoaded', async function() {
  console.log('Standardized.js loaded');

  // DOM elements
  const form = document.getElementById('toolForm');
  const generateBtn = document.getElementById('generateBtn');
  const clearBtn = document.getElementById('clearBtn');
  const toolNameInput = document.getElementById('toolName');
  const includeGuidesCheck = document.getElementById('includeGuides');
  const resultCard = document.getElementById('resultCard');
  const resultContent = document.getElementById('resultContent');
  const downloadPdfBtn = document.getElementById('downloadPdfBtn');
  const toast = document.getElementById('toast');
  
  // History elements
  const historySection = document.getElementById('historySection');
  const historyList = document.getElementById('historyList');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  const totalCountSpan = document.getElementById('totalCount');
  const latestDateSpan = document.getElementById('latestDate');

  // Check Firebase
  if (typeof firebase === 'undefined') {
    console.error('Firebase SDK not loaded!');
    showToast('Firebase not initialized. Please check your connection.', true);
    return;
  }

  const database = firebase.database();

  // Fetch tokens
  const tokens = await fetchTokens();
  if (tokens) {
    githubToken = tokens.token;
    apiEndpoint = tokens.endpoint;
    console.log('API credentials loaded');
  } else {
    showToast('Failed to load API credentials. Please try again.', true);
  }

  // Auth state
  firebase.auth().onAuthStateChanged((user) => {
    currentUser = user;
    if (user) {
      console.log('User logged in:', user.email);
      loadHistoryFromStorage();
    } else {
      console.log('User logged out');
      loadHistoryFromStorage(); // Still load localStorage even if logged out
    }
  });

  // Toast helper
  function showToast(message, isError = false) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('hidden');
    toast.style.background = isError ? '#dc2626' : 'var(--accent)';
    setTimeout(() => toast.classList.add('hidden'), 3000);
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

  // ===== NEW FUNCTION: Create and open PDF in viewer =====
  function openInPDFViewer(htmlContent, toolName) {
    // Create a full HTML document with print styling
    const fullHtml = `<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${toolName} - rehab.ai</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
          padding: 40px 20px;
          background: white;
          color: #1f2933;
          line-height: 1.6;
        }
        
        .container {
          max-width: 1200px;
          margin: 0 auto;
          background: white;
        }
        
        /* Print styles */
        @media print {
          body {
            padding: 0;
          }
          
          .no-print {
            display: none !important;
          }
          
          .print-header {
            margin-bottom: 20px;
            border-bottom: 2px solid #009688;
            padding-bottom: 10px;
          }
        }
        
        /* Table styles */
        table {
          border-collapse: collapse;
          width: 100%;
          margin: 20px 0;
          background: white;
        }
        
        th {
          background: #009688;
          color: white;
          padding: 12px;
          text-align: left;
          font-weight: 600;
        }
        
        td {
          border: 1px solid #ddd;
          padding: 10px;
          vertical-align: top;
        }
        
        tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        
        /* Content styles */
        h1 {
          color: #009688;
          margin-bottom: 20px;
          font-size: 28px;
        }
        
        h2 {
          margin-top: 30px;
          margin-bottom: 15px;
          color: #2c3e50;
          font-size: 24px;
        }
        
        h3 {
          margin-top: 20px;
          margin-bottom: 10px;
          color: #34495e;
          font-size: 20px;
        }
        
        p {
          margin-bottom: 15px;
        }
        
        ul, ol {
          margin: 15px 0;
          padding-left: 30px;
        }
        
        li {
          margin: 5px 0;
        }
        
        /* Print button */
        .print-btn {
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: #009688;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 50px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          transition: all 0.3s ease;
          z-index: 1000;
        }
        
        .print-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.2);
        }
        
        .download-btn {
          position: fixed;
          bottom: 20px;
          right: 160px;
          background: #2c3e50;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 50px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          transition: all 0.3s ease;
          z-index: 1000;
        }
        
        .download-btn:hover {
          transform: translateY(-2px);
          background: #1a2632;
        }
        
        @media (max-width: 768px) {
          .print-btn, .download-btn {
            padding: 8px 16px;
            font-size: 14px;
          }
          
          .download-btn {
            right: 120px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="print-header no-print">
          <h1>${toolName}</h1>
          <p>Generated by rehab.ai • ${new Date().toLocaleString()}</p>
        </div>
        ${htmlContent}
      </div>
      
      <button class="print-btn no-print" onclick="window.print()">
        🖨️ Print / Save as PDF
      </button>
      <button class="download-btn no-print" onclick="downloadAsPDF()">
        ⬇️ Download PDF
      </button>
      
      <script>
        function downloadAsPDF() {
          // Trigger print dialog which allows saving as PDF
          window.print();
        }
        
        // Auto-trigger print dialog (optional - uncomment if you want auto open)
        // setTimeout(() => window.print(), 500);
      </script>
    </body>
    </html>`;
    
    // Create a blob and open in new window
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const newWindow = window.open(url, '_blank');
    
    // Clean up after a delay
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
    
    return newWindow;
  }

  // ===== NEW FUNCTION: Show preview card =====
  function showPreviewCard(toolName, includeGuides, content) {
    // Create preview modal/card
    const previewModal = document.createElement('div');
    previewModal.className = 'preview-modal';
    previewModal.innerHTML = `
      <div class="preview-overlay"></div>
      <div class="preview-card">
        <div class="preview-card-header">
          <div class="preview-icon">📄</div>
          <h3>${escapeHtml(toolName)}</h3>
          <button class="preview-close" onclick="this.closest('.preview-modal').remove()">&times;</button>
        </div>
        <div class="preview-card-body">
          <div class="preview-info">
            <span class="preview-badge">✅ Ready to view</span>
            <span class="preview-date">${new Date().toLocaleString()}</span>
          </div>
          <p class="preview-description">
            Your ${escapeHtml(toolName)} assessment has been generated successfully.
            Click below to open it in your device's PDF viewer.
          </p>
          <div class="preview-actions">
            <button class="preview-btn primary" id="openPdfBtn">
              📖 Open in PDF Viewer
            </button>
           
          </div>
          <div class="preview-note">
            <small>💡 Tip: Use your browser's print dialog to save as PDF</small>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(previewModal);
    
    // Add styles for preview modal
    const style = document.createElement('style');
    style.textContent = `
      .preview-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.3s ease;
      }
      
      .preview-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
      }
      
      .preview-card {
        position: relative;
        background: var(--surface, white);
        border-radius: 24px;
        max-width: 500px;
        width: 90%;
        margin: 20px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        animation: slideUp 0.3s ease;
        overflow: hidden;
      }
      
      .preview-card-header {
        background: linear-gradient(135deg, var(--accent, #009688), #00695c);
        padding: 20px 24px;
        display: flex;
        align-items: center;
        gap: 12px;
        color: white;
      }
      
      .preview-icon {
        font-size: 32px;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
      }
      
      .preview-card-header h3 {
        margin: 0;
        flex: 1;
        font-size: 1.25rem;
        font-weight: 600;
      }
      
      .preview-close {
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        font-size: 28px;
        cursor: pointer;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }
      
      .preview-close:hover {
        background: rgba(255,255,255,0.3);
        transform: scale(1.1);
      }
      
      .preview-card-body {
        padding: 24px;
      }
      
      .preview-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        flex-wrap: wrap;
        gap: 12px;
      }
      
      .preview-badge {
        background: var(--accent-soft, #e0f2f1);
        color: var(--accent, #009688);
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 0.85rem;
        font-weight: 600;
      }
      
      .preview-date {
        font-size: 0.8rem;
        color: var(--text-secondary, #666);
      }
      
      .preview-description {
        margin-bottom: 24px;
        line-height: 1.6;
        color: var(--text-primary, #333);
      }
      
      .preview-actions {
        display: flex;
        gap: 12px;
        margin-bottom: 16px;
      }
      
      .preview-btn {
        flex: 1;
        padding: 12px 20px;
        border-radius: 40px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
      }
      
      .preview-btn.primary {
        background: var(--accent, #009688);
        color: white;
      }
      
      .preview-btn.primary:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(0, 150, 136, 0.3);
      }
      
      .preview-btn.secondary {
        background: var(--surface, #f0f0f0);
        color: var(--text-primary, #333);
        border: 1px solid var(--border-light, #ddd);
      }
      
      .preview-btn.secondary:hover {
        background: var(--border-light, #e0e0e0);
      }
      
      .preview-note {
        text-align: center;
        color: var(--text-secondary, #666);
        font-size: 0.8rem;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      [data-theme="dark"] .preview-card {
        background: #1e2a32;
      }
      
      [data-theme="dark"] .preview-btn.secondary {
        background: #2e3b45;
        color: #eef2f6;
        border-color: #3e4b55;
      }
    `;
    
    document.head.appendChild(style);
    
    // Handle open PDF button
    const openPdfBtn = previewModal.querySelector('#openPdfBtn');
    openPdfBtn.addEventListener('click', () => {
      openInPDFViewer(content, toolName);
      previewModal.remove();
    });
    
    // Handle close button
    const closePreviewBtn = previewModal.querySelector('#closePreviewBtn');
    if (closePreviewBtn) {
      closePreviewBtn.addEventListener('click', () => previewModal.remove());
    }
    
    // Close on overlay click
    const overlay = previewModal.querySelector('.preview-overlay');
    overlay.addEventListener('click', () => previewModal.remove());
  }
  
  // Helper to escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ===== LOCALSTORAGE HISTORY FUNCTIONS =====
  
  function loadHistoryFromStorage() {
    try {
      const savedHistory = localStorage.getItem('rehab_standardized_history');
      if (savedHistory) {
        historyItems = JSON.parse(savedHistory);
        // Sort by date (newest first)
        historyItems.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      } else {
        historyItems = [];
      }
      updateHistoryUI();
    } catch (error) {
      console.error('Error loading history:', error);
      historyItems = [];
    }
  }

  function saveHistoryToStorage() {
    try {
      localStorage.setItem('rehab_standardized_history', JSON.stringify(historyItems));
      updateHistoryUI();
    } catch (error) {
      console.error('Error saving history:', error);
    }
  }

  function addToHistory(toolName, includeGuides, content) {
    const historyItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      toolName: toolName,
      includeGuides: includeGuides,
      generatedContent: content,
      preview: content.replace(/<[^>]*>/g, '').substring(0, 150),
      timestamp: new Date().toISOString(),
      userId: currentUser ? currentUser.uid : 'local'
    };

    historyItems.unshift(historyItem);
    
    // Keep only last 50 items to prevent storage overflow
    if (historyItems.length > 50) {
      historyItems = historyItems.slice(0, 50);
    }
    
    saveHistoryToStorage();
    return historyItem.id;
  }

  function removeFromHistory(id) {
    historyItems = historyItems.filter(item => item.id !== id);
    saveHistoryToStorage();
  }

  function clearAllHistory() {
    if (historyItems.length === 0) {
      showToast('No history to clear', true);
      return;
    }
    
    if (confirm('Are you sure you want to clear all history?')) {
      historyItems = [];
      saveHistoryToStorage();
      showToast('All history cleared');
    }
  }

  function retrieveFromHistory(id) {
    const item = historyItems.find(item => item.id === id);
    if (item) {
      // Show preview card instead of direct display
      showPreviewCard(item.toolName, item.includeGuides, item.generatedContent);
      
      // Fill form with the tool name (optional)
      toolNameInput.value = item.toolName;
      includeGuidesCheck.checked = item.includeGuides;
      
      showToast(`Opened: ${item.toolName}`);
    }
  }

  function updateHistoryUI() {
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
    
    if (historyItems.length === 0) {
      historyList.innerHTML = `
        <div class="empty-history">
          <p>No history yet</p>
          <small>Generate your first standardized tool to see it here</small>
        </div>
      `;
      return;
    }
    
    // Render history items
    historyList.innerHTML = historyItems.map(item => {
      const date = new Date(item.timestamp);
      const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
      
      return `
        <div class="history-item" data-id="${item.id}">
          <div class="history-item-header">
            <span class="history-item-title">${escapeHtml(item.toolName || 'Unknown Tool')}</span>
            <span class="history-item-date">${formattedDate}</span>
          </div>
          <div class="history-item-actions">
            <button class="history-item-btn retrieve" onclick="window.retrieveHistoryItem('${item.id}')">
              <span>📖</span> View PDF
            </button>
            <button class="history-item-btn delete" onclick="window.deleteHistoryItem('${item.id}')">
              <span>🗑️</span> Delete
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // Make functions globally available for history buttons
  window.retrieveHistoryItem = (id) => {
    retrieveFromHistory(id);
  };

  window.deleteHistoryItem = (id) => {
    if (confirm('Delete this item from history?')) {
      removeFromHistory(id);
      showToast('Item deleted');
    }
  };

  // Build prompt for the AI
  function buildPrompt(toolName, includeGuides) {
    const guides = includeGuides 
      ? "Include detailed administration instructions and interpretation guidelines in separate sections."
      : "Provide only the assessment items and scoring criteria.";

    return `You are an expert in standardized clinical assessments.

Generate the complete content for the **${toolName}** assessment tool as a **self-contained HTML document**.

Requirements:
- Use proper HTML structure with <h2>, <h3>, <p>, <ul>, <ol>.
- Present any tables as proper HTML <table> with borders and alternating row colors for readability.
- Include the full name of the tool and its purpose at the top.
- List all items/questions exactly as they appear in the original tool.
- Include scoring instructions and interpretation (if available).
- If the tool has subscales, present them clearly.
- Use a clean, professional style suitable for printing.
- Do NOT include any extra commentary outside the tool content.
- Return ONLY the HTML (no markdown, no explanations).`;
  }

  // Handle form submission - MODIFIED to show preview card
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const toolName = toolNameInput.value.trim();
    if (!toolName) {
      showToast('Please enter a tool name', true);
      return;
    }

    if (!githubToken || !apiEndpoint) {
      showToast('API credentials not loaded', true);
      return;
    }

    // Show loading
    generateBtn.disabled = true;
    const btnText = generateBtn.querySelector('.btn-text');
    const spinner = generateBtn.querySelector('.loading-spinner-small');
    btnText.textContent = 'Generating...';
    spinner.style.display = 'inline-block';

    try {
      const includeGuides = includeGuidesCheck.checked;
      const prompt = buildPrompt(toolName, includeGuides);

      const response = await fetch(`${apiEndpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${githubToken}`
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'You output clean HTML with proper tables. No extra text.' },
            { role: 'user', content: prompt }
          ],
          model: 'openai/gpt-4.1',
          temperature: 0.3,
          max_tokens: 4000
        })
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data = await response.json();
      let content = data.choices[0].message.content;
      content = content.replace(/```html|```/g, '').trim();

      if (!content) throw new Error('Empty response');

      // Store generated content
      generatedContent = content;
      generatedToolName = toolName;
      generatedHtmlContent = content;
      
      // Hide the result card (we're using preview card instead)
      resultCard.style.display = 'none';
      
      // Show preview card instead of direct display
      showPreviewCard(toolName, includeGuides, content);

      // Save to localStorage history
      addToHistory(toolName, includeGuides, content);
      
      showToast(`${toolName} generated successfully!`);
    } catch (error) {
      console.error('Generation error:', error);
      showToast('Failed to generate. Please try again.', true);
    } finally {
      generateBtn.disabled = false;
      btnText.textContent = 'Generate Tool';
      spinner.style.display = 'none';
    }
  });

  // Clear form
  clearBtn.addEventListener('click', () => {
    toolNameInput.value = '';
    includeGuidesCheck.checked = false;
    resultCard.style.display = 'none';
    resultContent.innerHTML = '';
    generatedContent = '';
    generatedToolName = '';
    generatedHtmlContent = '';
    
    showToast('Form cleared');
  });

  // Clear history button
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', clearAllHistory);
  }

  // Optional: Keep download button for backward compatibility
  if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener('click', () => {
      if (!generatedContent) {
        showToast('No content to download', true);
        return;
      }
      openInPDFViewer(generatedContent, generatedToolName || 'Assessment');
    });
  }

  // Keyboard shortcut (Ctrl+Enter)
  form.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      form.dispatchEvent(new Event('submit'));
    }
  });

  // Load history on startup
  loadHistoryFromStorage();

  console.log('Standardized.js fully initialized with preview card and PDF viewer');
});
