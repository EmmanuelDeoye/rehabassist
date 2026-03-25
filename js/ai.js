// js/ai.js - With proper timestamps
document.addEventListener('DOMContentLoaded', function() {
  console.log('AI Assistant loaded – with proper timestamps');

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

  // Helper function to format timestamp
  function formatTimestamp(timestamp) {
    if (!timestamp) return 'Just now';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // For very recent messages
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    // For older messages, show date and time
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

  // Enhanced addMessageToUI with timestamp parameter
  function addMessageToUI(content, role, fileInfo = null, isTemp = false, timestamp = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    // Use provided timestamp or generate current time for temp messages
    const messageTime = timestamp || (isTemp ? null : new Date().toISOString());
    const timeDisplay = messageTime ? formatTimestamp(messageTime) : (isTemp ? 'Processing...' : 'Just now');

    let fileHtml = '';
    if (fileInfo) {
      fileHtml = `<div class="message-file"><span>📎</span> ${escapeHtml(fileInfo.name)}</div>`;
    }

    if (role === 'assistant') {
      const formattedContent = formatAssistantMessage(content);
      messageDiv.innerHTML = `
        <div class="message-content formatted">
          ${formattedContent}
          ${fileHtml}
          <span class="message-time">${timeDisplay}</span>
        </div>
      `;
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
    
    // Store timestamp as data attribute for reference
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
    const convRef = database.ref(`assistant_conversations/${currentUser.uid}/${currentConversationId}`);
    const conversation = {
      id: currentConversationId,
      title: currentMessages[0]?.content?.substring(0, 40) || 'New conversation',
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
    const now = new Date().toISOString();
    const welcomeMsg = {
      role: 'assistant',
      content: "Hello! I'm your rehabilitation AI assistant. How can I help you today?",
      timestamp: now
    };
    currentMessages.push(welcomeMsg);
    addMessageToUI(welcomeMsg.content, 'assistant', null, false, welcomeMsg.timestamp);
    await saveCurrentConversation();
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
          addMessageToUI(msg.content, msg.role, msg.fileInfo, false, msg.timestamp);
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
      const date = new Date(conv.updatedAt);
      const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
      const preview = conv.messages && conv.messages.length > 1 ? conv.messages[1]?.content?.substring(0, 80) : '';
      return `
        <div class="history-item" data-id="${conv.id}">
          <div class="history-item-title">${escapeHtml(conv.title || 'Conversation')}</div>
          <div class="history-item-date">${formattedDate}</div>
          <div class="history-item-preview">${escapeHtml(preview)}</div>
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

  // ========== SEND MESSAGE WITH PROPER TIMESTAMPS ==========

  async function sendUserMessage(userText) {
    if ((!userText || !userText.trim()) && !processedFileData) return;
    
    if (isProcessingFile) {
      showToast('Please wait, file still processing', true);
      return;
    }

    let finalMessage = userText || '';
    let fileInfo = null;
    let useVisionAPI = false;
    let imageDataForAPI = null;
    const userTimestamp = new Date().toISOString();

    if (processedFileData && pendingFile) {
      fileInfo = { name: pendingFile.name, type: pendingFile.type };
      
      if (processedFileType === 'audio') {
        finalMessage = `Transcription: "${processedFileData}"\n\nUser request: ${userText || 'Summarize and interpret this audio.'}`;
      } 
      else if (processedFileType === 'image') {
        useVisionAPI = true;
        imageDataForAPI = processedFileData;
        finalMessage = userText || 'Please analyze this image and describe what you see. Provide relevant rehabilitation insights if applicable.';
      } 
      else if (processedFileType === 'document') {
        finalMessage = `Document content:\n${processedFileData}\n\nUser request: ${userText || 'Summarize this document and provide key insights.'}`;
      }
    }

    // Add user message to UI with timestamp
    const displayText = userText || (pendingFile ? `Uploaded ${pendingFile.name}` : '');
    addMessageToUI(displayText, 'user', fileInfo, false, userTimestamp);
    
    const userMsgObj = {
      role: 'user',
      content: displayText,
      timestamp: userTimestamp,
      fileInfo: fileInfo
    };
    currentMessages.push(userMsgObj);
    await saveCurrentConversation();

    messageInput.value = '';
    hideFilePreview();

    // Add thinking indicator (temp message with no timestamp)
    addMessageToUI('Thinking...', 'assistant', null, true);

    try {
      const assistantTimestamp = new Date().toISOString();
      let reply = '';
      
      if (useVisionAPI && imageDataForAPI) {
        console.log('Calling Vision API with image...');
        reply = await callVisionAPI(finalMessage, imageDataForAPI);
      } else {
        reply = await callChatAPI(finalMessage);
      }
      
      // Remove thinking message
      removeTempMessage();
      
      // Add assistant reply with timestamp
      addMessageToUI(reply, 'assistant', null, false, assistantTimestamp);
      
      const assistantMsgObj = {
        role: 'assistant',
        content: reply,
        timestamp: assistantTimestamp
      };
      currentMessages.push(assistantMsgObj);
      await saveCurrentConversation();
      
    } catch (error) {
      console.error('Send message error:', error);
      removeTempMessage();
      addMessageToUI(`Sorry, I encountered an error: ${error.message || 'Please try again.'}`, 'assistant', null, false, new Date().toISOString());
    } finally {
      pendingFile = null;
      processedFileData = null;
      processedFileType = null;
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
      if (!currentConversationId && conversations.length === 0) {
        await createNewConversation();
      } else if (conversations.length > 0 && !currentConversationId) {
        await loadConversation(conversations[0].id);
      } else if (currentConversationId) {
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