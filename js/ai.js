// js/ai.js - AI Assistant with Message Actions (Copy, Regenerate, Edit, PDF)

document.addEventListener('DOMContentLoaded', function() {
  console.log('AI Assistant loaded – with message actions');

  // DOM elements
  const chatMessages = document.getElementById('chatMessages');
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  const attachBtn = document.getElementById('attachBtn');
  const attachPopup = document.getElementById('attachPopup');
  const audioInput = document.getElementById('audioInput');
  const imageInput = document.getElementById('imageInput');
  const documentInput = document.getElementById('documentInput');
  const historyToggle = document.getElementById('historyToggle');
  const newConversationBtn = document.getElementById('newConversationBtn');
  const historyDrawer = document.getElementById('historyDrawer');
  const closeDrawer = document.getElementById('closeDrawer');
  const historySearch = document.getElementById('historySearch');
  const historyList = document.getElementById('historyList');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  const totalCountSpan = document.getElementById('totalCount');
  const latestDateSpan = document.getElementById('latestDate');
  const deleteConfirmModal = document.getElementById('deleteConfirmModal');
  const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
  const toast = document.getElementById('toast');
  const themeToggle = document.getElementById('themeToggle');
  const specialtyBtn = document.getElementById('specialtyBtn');
  const specialtyModal = document.getElementById('specialtyModal');
  const closeSpecialtyBtn = document.getElementById('closeSpecialtyBtn');
  const filePreview = document.getElementById('filePreview');
  const previewIcon = document.getElementById('previewIcon');
  const previewName = document.getElementById('previewName');
  const previewSize = document.getElementById('previewSize');
  const removeFileBtn = document.getElementById('removeFileBtn');

  // Global variables
  let githubToken = '';
  let apiEndpoint = '';
  let currentUser = null;
  let conversations = [];
  let currentConversationId = null;
  let currentMessages = [];
  let pendingFile = null;
  let processedFileData = null;
  let processedFileType = null;
  let isProcessingFile = false;
  let itemToDelete = null;
  let selectedSpecialty = localStorage.getItem('rehab-specialty') || 'physiotherapist';
  let selectedCategory = localStorage.getItem('rehab-category') || 'general';
  let isRegenerating = false;

  // Helper function to format timestamp
  function formatTimestamp(timestamp) {
    if (!timestamp) return 'Just now';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  }

  // Helper function for relative time in history cards
  function getRelativeTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  }

  // Scroll to bottom function
  function scrollToBottom(smooth = true) {
    if (!chatMessages) return;
    
    const scrollOptions = {
      top: chatMessages.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    };
    
    chatMessages.scrollTo(scrollOptions);
    
    setTimeout(() => {
      chatMessages.scrollTo({
        top: chatMessages.scrollHeight,
        behavior: 'auto'
      });
    }, 100);
  }

  // Copy message to clipboard
  async function copyMessage(content) {
    try {
      // Extract text from HTML if needed
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      const plainText = tempDiv.textContent || tempDiv.innerText;
      await navigator.clipboard.writeText(plainText);
      showToast('✅ Message copied to clipboard', false, 2000);
    } catch (err) {
      showToast('Failed to copy message', true);
    }
  }

  // Regenerate last AI response
  async function regenerateLastResponse() {
    if (isRegenerating) {
      showToast('Please wait, already regenerating...', true);
      return;
    }
    
    // Find the last user message
    let lastUserMessage = null;
    let lastUserMessageIndex = -1;
    for (let i = currentMessages.length - 1; i >= 0; i--) {
      if (currentMessages[i].role === 'user') {
        lastUserMessage = currentMessages[i];
        lastUserMessageIndex = i;
        break;
      }
    }
    
    if (!lastUserMessage) {
      showToast('No user message to regenerate response for', true);
      return;
    }
    
    // Remove the last assistant message(s) after the user message
    const messagesToKeep = currentMessages.slice(0, lastUserMessageIndex + 1);
    const removedMessages = currentMessages.slice(lastUserMessageIndex + 1);
    currentMessages = messagesToKeep;
    
    // Remove the corresponding assistant messages from UI
    const allMessages = chatMessages.children;
    const messagesToRemove = [];
    for (let i = allMessages.length - 1; i >= 0; i--) {
      const msg = allMessages[i];
      if (msg.classList.contains('assistant') && !msg.classList.contains('temp-message')) {
        messagesToRemove.push(msg);
      } else if (msg.classList.contains('user')) {
        break;
      }
    }
    messagesToRemove.forEach(msg => msg.remove());
    
    // Regenerate response
    await generateResponse(lastUserMessage.content);
  }

  // Edit and resend user message
  function editAndResendMessage(messageContent, messageElement) {
    // Populate input with the message content
    messageInput.value = messageContent;
    messageInput.focus();
    
    // Scroll to input
    messageInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Optional: Highlight the message being edited
    messageElement.style.opacity = '0.5';
    setTimeout(() => {
      messageElement.style.opacity = '';
    }, 1000);
    
    showToast('Edit the message and press send to update', false, 3000);
  }

  // Generate PDF from message
  async function generatePDF(content, messageElement) {
    if (typeof html2pdf === 'undefined') {
      showToast('PDF library not loaded', true);
      return;
    }
    
    const originalContent = messageElement.querySelector('.message-content').cloneNode(true);
    const timeElement = originalContent.querySelector('.message-time');
    if (timeElement) timeElement.remove();
    
    const actionsElement = originalContent.querySelector('.message-actions');
    if (actionsElement) actionsElement.remove();
    
    const tempDiv = document.createElement('div');
    tempDiv.style.padding = '20px';
    tempDiv.style.fontFamily = 'Arial, sans-serif';
    tempDiv.style.maxWidth = '800px';
    tempDiv.style.margin = '0 auto';
    tempDiv.innerHTML = `
      <h1 style="color: #00695c; border-bottom: 2px solid #00695c; padding-bottom: 10px;">rehab.ai Assistant Response</h1>
      <div style="margin: 20px 0;">
        ${originalContent.innerHTML}
      </div>
      <hr>
      <p style="font-size: 12px; color: #666;">Generated on ${new Date().toLocaleString()} by rehab.ai</p>
    `;
    
    const opt = {
      margin: [0.5, 0.5, 0.5, 0.5],
      filename: `rehab_ai_response_${Date.now()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, letterRendering: true },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    
    try {
      await html2pdf().set(opt).from(tempDiv).save();
      showToast('✅ PDF saved successfully', false, 2000);
    } catch (err) {
      console.error('PDF generation error:', err);
      showToast('Failed to generate PDF', true);
    }
  }

  // Enhanced addMessageToUI with action buttons for assistant messages
  function addMessageToUI(content, role, fileInfo = null, isTemp = false, timestamp = null, messageId = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    if (messageId) {
      messageDiv.dataset.messageId = messageId;
    }
    
    const messageTime = timestamp || (isTemp ? null : new Date().toISOString());
    const timeDisplay = messageTime ? formatTimestamp(messageTime) : (isTemp ? 'Processing...' : 'Just now');

    let fileHtml = '';
    if (fileInfo) {
      fileHtml = `<div class="message-file"><span>📎</span> ${escapeHtml(fileInfo.name)}</div>`;
    }

    if (role === 'assistant' && !isTemp) {
      const formattedContent = formatAssistantMessage(content);
      // Generate a unique ID for this message
      const msgId = messageId || `msg_${Date.now()}_${Math.random()}`;
      if (!messageId) messageDiv.dataset.messageId = msgId;
      
      messageDiv.innerHTML = `
        <div class="message-content formatted">
          ${formattedContent}
          ${fileHtml}
          <div class="message-actions">
            <button class="msg-action-btn copy" title="Copy message">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>Copy</span>
            </button>
            <button class="msg-action-btn regenerate" title="Regenerate response">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              <span>Regenerate</span>
            </button>
            <button class="msg-action-btn pdf" title="Save as PDF">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="12" y1="18" x2="12" y2="12"></line>
                <line x1="9" y1="15" x2="15" y2="15"></line>
              </svg>
              <span>PDF</span>
            </button>
          </div>
          <span class="message-time">${timeDisplay}</span>
        </div>
      `;
      
      // Add event listeners to action buttons
      setTimeout(() => {
        const copyBtn = messageDiv.querySelector('.msg-action-btn.copy');
        const regenerateBtn = messageDiv.querySelector('.msg-action-btn.regenerate');
        const pdfBtn = messageDiv.querySelector('.msg-action-btn.pdf');
        
        if (copyBtn) {
          copyBtn.addEventListener('click', () => copyMessage(content));
        }
        if (regenerateBtn) {
          regenerateBtn.addEventListener('click', () => regenerateLastResponse());
        }
        if (pdfBtn) {
          pdfBtn.addEventListener('click', () => generatePDF(content, messageDiv));
        }
      }, 0);
      
    } else if (role === 'user' && !isTemp) {
      const msgId = messageId || `msg_${Date.now()}_${Math.random()}`;
      if (!messageId) messageDiv.dataset.messageId = msgId;
      
      messageDiv.innerHTML = `
        <div class="message-content">
          <p>${escapeHtml(content)}</p>
          ${fileHtml}
          <div class="message-actions user-actions">
            <button class="msg-action-btn edit" title="Edit message">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 3l4 4-7 7H10v-4l7-7z"></path>
                <path d="M4 20h16"></path>
              </svg>
              <span>Edit</span>
            </button>
          </div>
          <span class="message-time">${timeDisplay}</span>
        </div>
      `;
      
      setTimeout(() => {
        const editBtn = messageDiv.querySelector('.msg-action-btn.edit');
        if (editBtn) {
          editBtn.addEventListener('click', () => editAndResendMessage(content, messageDiv));
        }
      }, 0);
      
    } else {
      messageDiv.innerHTML = `
        <div class="message-content">
          <p>${escapeHtml(content)}</p>
          ${fileHtml}
          <span class="message-time">${timeDisplay}</span>
        </div>
      `;
    }
    
    if (isTemp) messageDiv.classList.add('temp-message');
    
    if (messageTime && !isTemp) {
      messageDiv.dataset.timestamp = messageTime;
    }
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom(true);
  }

  // Check Firebase
  if (typeof firebase === 'undefined') {
    console.error('Firebase not loaded');
    showToast('Firebase not initialized', true);
    return;
  }
  const database = firebase.database();

  // Fetch tokens
  async function fetchTokens() {
    try {
      const snapshot = await database.ref('tokens/openAI').once('value');
      const data = snapshot.val();
      if (data) {
        githubToken = data.openai_token;
        apiEndpoint = data.github_endpoint;
        console.log('API credentials loaded');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token fetch error:', error);
      return false;
    }
  }

  // Toast helper
  function showToast(message, isError = false, duration = 3000) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('hidden');
    toast.style.background = isError ? '#dc2626' : 'var(--accent)';
    setTimeout(() => toast.classList.add('hidden'), duration);
  }

  // Markdown conversion
  function formatAssistantMessage(text) {
    if (typeof marked !== 'undefined') {
      return marked.parse(text);
    }
    return text;
  }

  // System prompt
  function getSystemPrompt() {
    const specialtyMap = {
      occupational: 'an occupational therapist',
      consultant: 'a consultant',
      nurse: 'a nurse',
      psychologist: 'a psychologist',
      physiotherapist: 'a physiotherapist',
      speech: 'a speech therapist',
      behavioural: 'a behavioural therapist'
    };
    const specialty = specialtyMap[selectedSpecialty] || 'a rehabilitation professional';
    return `You are ${specialty} specializing in ${selectedCategory} rehabilitation. Provide concise, professional advice. Use Markdown for formatting (headings, lists, tables) when helpful.`;
  }

  function setSendButtonDisabled(disabled) {
    sendBtn.disabled = disabled;
    sendBtn.style.opacity = disabled ? '0.5' : '1';
    sendBtn.style.cursor = disabled ? 'not-allowed' : 'pointer';
  }

  function removeTempMessage() {
    const lastMsg = chatMessages.lastChild;
    if (lastMsg && lastMsg.classList.contains('temp-message')) {
      chatMessages.removeChild(lastMsg);
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ========== CONVERSATION MANAGEMENT ==========

  async function saveCurrentConversation() {
    if (!currentUser || !currentConversationId) return;
    if (currentMessages.length === 0) return;
    
    const convRef = database.ref(`assistant_conversations/${currentUser.uid}/${currentConversationId}`);
    const conversation = {
      id: currentConversationId,
      title: currentMessages[0]?.content?.substring(0, 40) || 'Conversation',
      messages: currentMessages,
      updatedAt: new Date().toISOString(),
      createdAt: currentMessages[0]?.timestamp || new Date().toISOString()
    };
    await convRef.set(conversation);
    await loadConversations();
  }

  async function createNewConversation() {
    if (!currentUser) {
      showToast('Please login to start a conversation', true);
      return;
    }
    chatMessages.innerHTML = '';
    currentMessages = [];
    currentConversationId = Date.now().toString();
    showToast('New conversation started');
    scrollToBottom(false);
  }

  async function loadConversation(conversationId) {
    if (!currentUser) return;
    try {
      const snapshot = await database.ref(`assistant_conversations/${currentUser.uid}/${conversationId}`).once('value');
      const conv = snapshot.val();
      if (conv) {
        currentConversationId = conversationId;
        currentMessages = conv.messages || [];
        chatMessages.innerHTML = '';
        currentMessages.forEach(msg => {
          addMessageToUI(msg.content, msg.role, msg.fileInfo, false, msg.timestamp, msg.id);
        });
        
        setTimeout(() => {
          scrollToBottom(false);
        }, 100);
        
        historyDrawer.classList.remove('open');
        document.body.style.overflow = '';
      }
    } catch (error) {
      console.error('Load conversation error:', error);
      showToast('Failed to load conversation', true);
    }
  }

  async function loadConversations() {
    if (!currentUser) return;
    try {
      const snapshot = await database.ref(`assistant_conversations/${currentUser.uid}`).once('value');
      const data = snapshot.val();
      conversations = [];
      if (data) {
        conversations = Object.values(data).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      }
      updateHistoryUI();
    } catch (error) {
      console.error('Load conversations error:', error);
    }
  }

  function updateHistoryUI(searchTerm = '') {
    totalCountSpan.textContent = conversations.length;
    if (conversations.length > 0) {
      const latest = new Date(conversations[0].updatedAt);
      latestDateSpan.textContent = latest.toLocaleDateString();
    } else {
      latestDateSpan.textContent = '-';
    }

    let filtered = conversations;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = conversations.filter(c => c.title && c.title.toLowerCase().includes(term));
    }

    if (filtered.length === 0) {
      historyList.innerHTML = '<div class="empty-history">No conversations</div>';
      return;
    }

    historyList.innerHTML = filtered.map(conv => {
      const relativeTime = getRelativeTime(conv.updatedAt);
      return `
        <div class="history-item" data-id="${conv.id}">
          <div class="history-item-title">${escapeHtml(conv.title || 'Conversation')}</div>
          <div class="history-item-date">${relativeTime}</div>
          <div class="history-item-actions">
            <button class="history-item-btn load" onclick="window.loadConversationById('${conv.id}')">Load</button>
            <button class="history-item-btn delete" onclick="window.deleteConversationById('${conv.id}')">Delete</button>
          </div>
        </div>
      `;
    }).join('');
  }

  async function deleteConversationById(id) {
    if (!currentUser) return;
    try {
      await database.ref(`assistant_conversations/${currentUser.uid}/${id}`).remove();
      if (currentConversationId === id) {
        await createNewConversation();
      }
      await loadConversations();
      showToast('Conversation deleted');
    } catch (error) {
      showToast('Delete failed', true);
    }
  }

  async function clearAllHistory() {
    if (!currentUser) return;
    try {
      await database.ref(`assistant_conversations/${currentUser.uid}`).remove();
      conversations = [];
      await createNewConversation();
      updateHistoryUI();
      showToast('All history cleared');
    } catch (error) {
      showToast('Clear failed', true);
    }
  }

  // ========== FILE PROCESSING ==========

  async function processAudioFile(file) {
    if (!githubToken) {
      showToast('API not configured', true);
      return null;
    }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('model', 'whisper-1');

    try {
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${githubToken}` },
        body: formData
      });
      if (!response.ok) throw new Error('Whisper API error');
      const data = await response.json();
      return data.text;
    } catch (error) {
      console.error('Transcription error:', error);
      showToast('Audio transcription failed', true);
      return null;
    }
  }

  async function processImageFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        const mimeType = file.type;
        resolve({ base64, mimeType });
      };
      reader.onerror = () => reject(new Error('Failed to read image'));
      reader.readAsDataURL(file);
    });
  }

  async function processDocumentFile(file) {
    if (file.type === 'text/plain') {
      try {
        const text = await file.text();
        return text;
      } catch (error) {
        return null;
      }
    } else {
      showToast(`Document type ${file.type} not fully supported yet. Only text files can be extracted.`, true);
      return null;
    }
  }

  async function handleFileSelection(file) {
    if (!file) return;
    pendingFile = file;
    isProcessingFile = true;
    setSendButtonDisabled(true);
    
    if (file.type.startsWith('image/')) previewIcon.textContent = '📷';
    else if (file.type.startsWith('audio/')) previewIcon.textContent = '🎤';
    else previewIcon.textContent = '📄';
    previewName.textContent = file.name;
    previewSize.textContent = file.size ? `(${(file.size / 1024).toFixed(1)} KB)` : '';
    
    const spinnerSpan = document.createElement('span');
    spinnerSpan.className = 'preview-spinner';
    spinnerSpan.textContent = ' ⏳';
    previewName.parentNode?.appendChild(spinnerSpan);
    filePreview.style.display = 'flex';

    let processed = null;
    try {
      if (file.type.startsWith('audio/')) {
        processed = await processAudioFile(file);
        if (processed) {
          previewIcon.textContent = '🎤✓';
          processedFileType = 'audio';
          processedFileData = processed;
          showToast('Audio transcribed successfully', false, 2000);
        }
      } else if (file.type.startsWith('image/')) {
        processed = await processImageFile(file);
        if (processed) {
          previewIcon.textContent = '📷✓';
          processedFileType = 'image';
          processedFileData = processed;
          showToast('Image loaded successfully', false, 2000);
        }
      } else {
        processed = await processDocumentFile(file);
        if (processed) {
          previewIcon.textContent = '📄✓';
          processedFileType = 'document';
          processedFileData = processed;
          showToast('Document loaded successfully', false, 2000);
        }
      }
    } catch (error) {
      console.error('File processing error:', error);
      showToast('Failed to process file', true);
      hideFilePreview();
      setSendButtonDisabled(false);
      isProcessingFile = false;
      return;
    }

    if (spinnerSpan) spinnerSpan.remove();
    
    if (processed) {
      setSendButtonDisabled(false);
    } else {
      hideFilePreview();
      setSendButtonDisabled(false);
      pendingFile = null;
      processedFileData = null;
      processedFileType = null;
    }
    isProcessingFile = false;
  }

  function hideFilePreview() {
    pendingFile = null;
    processedFileData = null;
    processedFileType = null;
    filePreview.style.display = 'none';
    setSendButtonDisabled(false);
  }

  // ========== API CALLS ==========

  async function callChatAPI(prompt) {
    if (!githubToken || !apiEndpoint) throw new Error('API not configured');
    const response = await fetch(`${apiEndpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${githubToken}`
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: getSystemPrompt() },
          { role: 'user', content: prompt }
        ],
        model: 'openai/gpt-4o',
        temperature: 0.7,
        max_tokens: 1000
      })
    });
    if (!response.ok) throw new Error(`API error ${response.status}`);
    const data = await response.json();
    return data.choices[0].message.content;
  }

  async function callVisionAPI(userText, imageData) {
    if (!githubToken || !apiEndpoint) throw new Error('API not configured');
    
    const imageUrl = `data:${imageData.mimeType};base64,${imageData.base64}`;
    
    const messages = [
      { role: 'system', content: getSystemPrompt() },
      {
        role: 'user',
        content: [
          { type: 'text', text: userText || 'Please analyze this image and describe what you see in detail.' },
          { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } }
        ]
      }
    ];

    try {
      const response = await fetch(`${apiEndpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${githubToken}`
        },
        body: JSON.stringify({
          messages: messages,
          model: 'openai/gpt-4o',
          max_tokens: 1000,
          temperature: 0.7
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Vision API error response:', errorText);
        throw new Error(`Vision API error ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('Vision API call error:', error);
      throw error;
    }
  }

  // Generate response (used for both new messages and regeneration)
  async function generateResponse(userPrompt, fileData = null, fileType = null) {
    try {
      const assistantTimestamp = new Date().toISOString();
      let reply = '';
      
      if (fileData && fileType === 'image') {
        console.log('Calling Vision API with image...');
        reply = await callVisionAPI(userPrompt, fileData);
      } else {
        reply = await callChatAPI(userPrompt);
      }
      
      // Remove thinking message if it exists
      removeTempMessage();
      
      // Add assistant reply with timestamp and action buttons
      const messageId = `msg_${Date.now()}_${Math.random()}`;
      addMessageToUI(reply, 'assistant', null, false, assistantTimestamp, messageId);
      
      const assistantMsgObj = {
        id: messageId,
        role: 'assistant',
        content: reply,
        timestamp: assistantTimestamp
      };
      currentMessages.push(assistantMsgObj);
      await saveCurrentConversation();
      
    } catch (error) {
      console.error('Generate response error:', error);
      removeTempMessage();
      addMessageToUI(`Sorry, I encountered an error: ${error.message || 'Please try again.'}`, 'assistant', null, false, new Date().toISOString());
    }
  }

  // ========== SEND MESSAGE WITH PROPER TIMESTAMPS ==========

  async function sendUserMessage(userText) {
    if ((!userText || !userText.trim()) && !processedFileData) return;
    
    if (isProcessingFile) {
      showToast('Please wait, file still processing', true);
      return;
    }
    
    if (isRegenerating) {
      showToast('Please wait, response is being regenerated', true);
      return;
    }

    let finalMessage = userText || '';
    let fileInfo = null;
    let useVisionAPI = false;
    let imageDataForAPI = null;
    const userTimestamp = new Date().toISOString();
    let fileDataForResponse = null;
    let fileTypeForResponse = null;

    if (processedFileData && pendingFile) {
      fileInfo = { name: pendingFile.name, type: pendingFile.type };
      
      if (processedFileType === 'audio') {
        finalMessage = `Transcription: "${processedFileData}"\n\nUser request: ${userText || 'Summarize and interpret this audio.'}`;
        fileDataForResponse = processedFileData;
        fileTypeForResponse = 'audio';
      } 
      else if (processedFileType === 'image') {
        useVisionAPI = true;
        imageDataForAPI = processedFileData;
        finalMessage = userText || 'Please analyze this image and describe what you see. Provide relevant rehabilitation insights if applicable.';
        fileDataForResponse = processedFileData;
        fileTypeForResponse = 'image';
      } 
      else if (processedFileType === 'document') {
        finalMessage = `Document content:\n${processedFileData}\n\nUser request: ${userText || 'Summarize this document and provide key insights.'}`;
        fileDataForResponse = processedFileData;
        fileTypeForResponse = 'document';
      }
    }

    // Add user message to UI with timestamp
    const displayText = userText || (pendingFile ? `Uploaded ${pendingFile.name}` : '');
    const userMessageId = `msg_${Date.now()}_${Math.random()}`;
    addMessageToUI(displayText, 'user', fileInfo, false, userTimestamp, userMessageId);
    
    const userMsgObj = {
      id: userMessageId,
      role: 'user',
      content: displayText,
      timestamp: userTimestamp,
      fileInfo: fileInfo
    };
    currentMessages.push(userMsgObj);
    
    // Save new conversation if this is the first message
    const isNewConversation = currentMessages.length === 1;
    if (isNewConversation) {
      await saveCurrentConversation();
    } else {
      await saveCurrentConversation();
    }

    messageInput.value = '';
    hideFilePreview();

    // Add thinking indicator
    addMessageToUI('Thinking...', 'assistant', null, true);

    try {
      if (useVisionAPI && imageDataForAPI) {
        await generateResponse(finalMessage, imageDataForAPI, 'image');
      } else {
        await generateResponse(finalMessage, fileDataForResponse, fileTypeForResponse);
      }
    } finally {
      pendingFile = null;
      processedFileData = null;
      processedFileType = null;
      isRegenerating = false;
    }
  }

  // ========== AUTH & INIT ==========

  firebase.auth().onAuthStateChanged(async (user) => {
    currentUser = user;
    if (user) {
      console.log('User logged in:', user.email);
      const tokensLoaded = await fetchTokens();
      if (!tokensLoaded) {
        showToast('Failed to load API credentials', true);
      }
      await loadConversations();
      if (conversations.length === 0) {
        // Start with empty conversation, no welcome message
        chatMessages.innerHTML = '';
        currentMessages = [];
        currentConversationId = Date.now().toString();
      } else if (!currentConversationId) {
        await loadConversation(conversations[0].id);
      } else {
        await loadConversation(currentConversationId);
      }
      
      setTimeout(() => {
        scrollToBottom(false);
      }, 200);
    } else {
      console.log('User logged out');
      conversations = [];
      chatMessages.innerHTML = '';
      currentConversationId = null;
      currentMessages = [];
      updateHistoryUI();
      showToast('Please login to use the AI assistant', true);
    }
  });

  // ========== EVENT LISTENERS ==========

  sendBtn.addEventListener('click', () => sendUserMessage(messageInput.value));
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendUserMessage(messageInput.value);
    }
  });

  attachBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    attachPopup.classList.toggle('show');
  });
  
  document.addEventListener('click', (e) => {
    if (!attachPopup.contains(e.target) && e.target !== attachBtn) {
      attachPopup.classList.remove('show');
    }
  });

  document.querySelectorAll('.attach-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      attachPopup.classList.remove('show');
      if (type === 'audio') audioInput.click();
      else if (type === 'image') imageInput.click();
      else if (type === 'document') documentInput.click();
    });
  });

  audioInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFileSelection(file);
    audioInput.value = '';
  });
  
  imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFileSelection(file);
    imageInput.value = '';
  });
  
  documentInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFileSelection(file);
    documentInput.value = '';
  });
  
  removeFileBtn.addEventListener('click', () => hideFilePreview());

  newConversationBtn.addEventListener('click', async () => {
    if (!currentUser) {
      showToast('Please login to start a new conversation', true);
      return;
    }
    await createNewConversation();
  });

  historyToggle.addEventListener('click', () => {
    if (!currentUser) {
      showToast('Please login to view history', true);
      return;
    }
    loadConversations();
    historyDrawer.classList.add('open');
    document.body.style.overflow = 'hidden';
  });
  
  closeDrawer.addEventListener('click', () => {
    historyDrawer.classList.remove('open');
    document.body.style.overflow = '';
  });
  
  document.addEventListener('click', (e) => {
    if (historyDrawer && historyToggle && !historyDrawer.contains(e.target) && !historyToggle.contains(e.target) && historyDrawer.classList.contains('open')) {
      historyDrawer.classList.remove('open');
      document.body.style.overflow = '';
    }
  });

  historySearch.addEventListener('input', (e) => updateHistoryUI(e.target.value));
  
  clearHistoryBtn.addEventListener('click', () => {
    if (conversations.length === 0) {
      showToast('No history to clear', true);
      return;
    }
    itemToDelete = 'all';
    deleteConfirmModal.classList.add('show');
  });

  cancelDeleteBtn.addEventListener('click', () => {
    deleteConfirmModal.classList.remove('show');
    itemToDelete = null;
  });
  
  confirmDeleteBtn.addEventListener('click', async () => {
    if (itemToDelete === 'all') {
      await clearAllHistory();
    } else if (itemToDelete) {
      await deleteConversationById(itemToDelete);
    }
    deleteConfirmModal.classList.remove('show');
    itemToDelete = null;
  });

  // Global functions for history buttons
  window.loadConversationById = (id) => loadConversation(id);
  window.deleteConversationById = (id) => {
    itemToDelete = id;
    deleteConfirmModal.classList.add('show');
  };

  // Theme toggle
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const html = document.documentElement;
      const current = html.getAttribute('data-theme');
      let newTheme = current === 'light' ? 'dark' : 'light';
      html.setAttribute('data-theme', newTheme);
      localStorage.setItem('rehab-theme', newTheme);
    });
  }

  // Specialty modal handling
  if (specialtyBtn) {
    specialtyBtn.addEventListener('click', () => {
      specialtyModal.classList.add('show');
      document.querySelectorAll('.specialty-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.specialty === selectedSpecialty);
      });
      document.querySelectorAll('.category-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === selectedCategory);
      });
    });
  }
  
  if (closeSpecialtyBtn) {
    closeSpecialtyBtn.addEventListener('click', () => specialtyModal.classList.remove('show'));
  }
  
  document.querySelectorAll('.specialty-option').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedSpecialty = btn.dataset.specialty;
      localStorage.setItem('rehab-specialty', selectedSpecialty);
      document.querySelectorAll('.specialty-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      showToast(`Specialty set to ${btn.textContent}`);
    });
  });
  
  document.querySelectorAll('.category-option').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedCategory = btn.dataset.category;
      localStorage.setItem('rehab-category', selectedCategory);
      document.querySelectorAll('.category-option').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      showToast(`Category set to ${btn.textContent}`);
    });
  });
  
  if (specialtyModal) {
    specialtyModal.addEventListener('click', (e) => {
      if (e.target === specialtyModal) specialtyModal.classList.remove('show');
    });
  }

  // Initialize theme
  const savedTheme = localStorage.getItem('rehab-theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  
  // Observe DOM changes for scrolling
  const observer = new MutationObserver(() => {
    if (chatMessages.lastChild) {
      scrollToBottom(true);
    }
  });
  
  observer.observe(chatMessages, { childList: true, subtree: true });
});