// js/ask.js – AI Chat with History, Copy, Download, Regenerate, and Suggested Questions

// Marked configuration
if (typeof marked !== 'undefined') {
  marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: false,
    mangle: false
  });
}

document.addEventListener('DOMContentLoaded', async () => {

  // =========================================================================
  // DOM Elements
  // =========================================================================
  const chatMessages = document.getElementById('chatMessages');
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');
  const newChatBtn = document.getElementById('newChatBtn');

  const historyDrawer = document.getElementById('historyDrawer');
  const historyNavBtn = document.getElementById('historyNavBtn');
  const closeDrawerBtn = document.getElementById('closeDrawerBtn');
  const historyList = document.getElementById('historyList');
  const historySearchInput = document.getElementById('historySearchInput');

  const toastContainer = document.getElementById('toast-container');

  // =========================================================================
  // State
  // =========================================================================
  let currentUser = null;
  let aiConfig = { token: null, endpoint: 'https://api.deepseek.com/v1', model: 'deepseek-chat' };
  let currentConversationId = null;
  let messages = [];                     // [{role, content, timestamp}]
  let isWaiting = false;

  const database = firebase.database();

  // =========================================================================
  // Helpers
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

  // =========================================================================
  // Generate suggested follow‑up questions
  // =========================================================================
  async function generateSuggestions(lastUserMessage, lastAiResponse) {
    if (!aiConfig.token) {
      const ok = await fetchTokens();
      if (!ok) return [];
    }

    const systemPrompt = `You are a helpful assistant that generates short, natural follow‑up questions based on a conversation.

Given the user's last question and the AI's response, suggest exactly 3 follow‑up questions the user might want to ask next. The questions should:
- Be concise (one sentence each, max 15 words)
- Cover different aspects of the topic
- Sound natural and conversational
- Not repeat the original question

Return ONLY a JSON array of strings. Example format:
["What are the common causes of this condition?","How long does recovery typically take?","Are there any exercises I should avoid?"]

Do NOT include any other text, explanations, or markdown. Return ONLY the JSON array.`;

    try {
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
            { role: 'user', content: `User asked: "${lastUserMessage}"\n\nAI responded: "${lastAiResponse.substring(0, 500)}"\n\nGenerate 3 follow‑up questions as a JSON array.` }
          ],
          max_tokens: 200,
          temperature: 0.8,
          top_p: 0.95
        })
      });

      if (!response.ok) return [];

      const data = await response.json();
      const content = data.choices[0].message.content.trim();

      // Try to parse the JSON array
      const jsonMatch = content.match(/\[.*\]/s);
      if (jsonMatch) {
        const suggestions = JSON.parse(jsonMatch[0]);
        if (Array.isArray(suggestions) && suggestions.length > 0) {
          return suggestions.slice(0, 3);
        }
      }

      // Fallback: extract lines that look like questions
      const lines = content.split('\n')
        .map(l => l.replace(/^[\d.\-•*]+\s*/, '').replace(/^["']|["']$/g, '').trim())
        .filter(l => l.length > 10 && l.endsWith('?'))
        .slice(0, 3);

      return lines.length > 0 ? lines : [];
    } catch (error) {
      console.warn('Failed to generate suggestions:', error);
      return [];
    }
  }

  // =========================================================================
  // Render messages (with action buttons and suggestions on AI replies)
  // =========================================================================
  function renderMessages() {
    chatMessages.innerHTML = '';
    if (messages.length === 0) {
      chatMessages.innerHTML = `
        <div class="empty-chat">
          <div class="empty-chat-icon">💬</div>
          <p>Ask me anything about rehabilitation, conditions, assignments, or clinical reasoning.</p>
          <p class="empty-chat-hint">Your conversation will be saved automatically when you're logged in.</p>
        </div>
      `;
      return;
    }

    messages.forEach((msg, index) => {
      const msgDiv = document.createElement('div');
      msgDiv.className = `message ${msg.role}`;
      msgDiv.setAttribute('data-index', index);
      if (msg.role === 'assistant') {
        msgDiv.setAttribute('data-raw-content', msg.content);
      }

      // Bubble
      const bubble = document.createElement('div');
      bubble.className = 'message-bubble';
      if (msg.role === 'assistant') {
        bubble.innerHTML = marked.parse(msg.content);
      } else {
        bubble.textContent = msg.content;
      }
      msgDiv.appendChild(bubble);

      // Action buttons + Suggestions (AI only)
      if (msg.role === 'assistant') {
        // Action buttons
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'message-actions';
        actionsDiv.innerHTML = `
          <button class="action-btn copy-btn" title="Copy response"><i class="fas fa-copy"></i> Copy</button>
          <button class="action-btn download-btn" title="Download as Word document"><i class="fas fa-download"></i> Word</button>
          <button class="action-btn regenerate-btn" title="Regenerate response"><i class="fas fa-redo"></i> Regenerate</button>
        `;
        msgDiv.appendChild(actionsDiv);

        // Suggested follow‑up questions (only on the last AI message)
        const isLastAiMessage = index === messages.length - 1 && msg.role === 'assistant';
        if (isLastAiMessage && msg.suggestions && msg.suggestions.length > 0) {
          const suggestionsDiv = document.createElement('div');
          suggestionsDiv.className = 'suggestions-container';
          
          const suggestionsLabel = document.createElement('p');
          suggestionsLabel.className = 'suggestions-label';
          suggestionsLabel.textContent = '💡 Suggested follow‑up questions:';
          suggestionsDiv.appendChild(suggestionsLabel);

          const suggestionsRow = document.createElement('div');
          suggestionsRow.className = 'suggestions-row';

          msg.suggestions.forEach(suggestion => {
            const chip = document.createElement('button');
            chip.className = 'suggestion-chip';
            chip.textContent = suggestion;
            chip.title = 'Click to ask this question';
            chip.addEventListener('click', () => {
              if (isWaiting) return;
              messageInput.value = suggestion;
              handleSend();
            });
            suggestionsRow.appendChild(chip);
          });

          suggestionsDiv.appendChild(suggestionsRow);
          msgDiv.appendChild(suggestionsDiv);
        }
      }

      // Timestamp
      const time = document.createElement('div');
      time.className = 'message-time';
      if (msg.timestamp) {
        const date = new Date(msg.timestamp);
        time.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      msgDiv.appendChild(time);

      chatMessages.appendChild(msgDiv);
    });

    // Scroll to the start of the last AI message
    setTimeout(() => {
      const lastAssistantMsg = chatMessages.querySelector('.message.assistant:last-of-type');
      if (lastAssistantMsg) {
        lastAssistantMsg.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    }, 50);
  }

  // =========================================================================
  // Event delegation for action buttons (Copy, Download, Regenerate)
  // =========================================================================
  chatMessages.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    // Ignore suggestion chips (they have their own handlers)
    if (btn.classList.contains('suggestion-chip')) return;

    const messageDiv = btn.closest('.message.assistant');
    if (!messageDiv) return;

    const index = parseInt(messageDiv.getAttribute('data-index'), 10);
    if (isNaN(index) || !messages[index]) return;

    // --- COPY ---
    if (btn.classList.contains('copy-btn')) {
      const rawContent = messageDiv.getAttribute('data-raw-content') || messages[index].content;
      navigator.clipboard.writeText(rawContent)
        .then(() => {
          btn.classList.add('copied');
          const icon = btn.querySelector('i');
          if (icon) {
            icon.className = 'fas fa-check';
          }
          showToast('Copied to clipboard', 'success');
          setTimeout(() => {
            btn.classList.remove('copied');
            if (icon) {
              icon.className = 'fas fa-copy';
            }
          }, 2000);
        })
        .catch(() => showToast('Copy failed', 'error'));
    }

    // --- DOWNLOAD AS WORD ---
    if (btn.classList.contains('download-btn')) {
      const rawContent = messageDiv.getAttribute('data-raw-content') || messages[index].content;
      const htmlContent = marked.parse(rawContent);
      const fullHtml = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>AI Response - rehablix</title>
<style>
  body{font-family:Arial,sans-serif;line-height:1.6;max-width:800px;margin:2rem auto;padding:0 1rem;color:#333;}
  h1,h2,h3,h4{color:#009688;margin-top:1.5em;}
  pre{background:#f5f5f5;padding:1rem;border-radius:0.5rem;overflow-x:auto;}
  code{font-family:monospace;font-size:0.9em;}
  table{border-collapse:collapse;width:100%;margin:1rem 0;}
  th,td{border:1px solid #ddd;padding:8px;text-align:left;}
  th{background:#f5f5f5;}
  blockquote{border-left:4px solid #009688;padding-left:1rem;margin-left:0;color:#666;}
  hr{border:none;border-top:1px solid #ddd;margin:2rem 0;}
</style></head>
<body>${htmlContent}
<p style="margin-top:2rem;font-size:0.8rem;color:#999;">Generated by rehablix Ask AI</p>
</body></html>`;
      const blob = new Blob([fullHtml], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rehablix_AI_Response_${new Date().toISOString().slice(0,10)}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Downloaded as Word document', 'success');
    }

    // --- REGENERATE ---
    if (btn.classList.contains('regenerate-btn')) {
      if (isWaiting) {
        showToast('Please wait for the current response to finish', 'error');
        return;
      }
      
      // Find the user message that prompted this AI response
      let userMessageIndex = index - 1;
      while (userMessageIndex >= 0 && messages[userMessageIndex].role !== 'user') {
        userMessageIndex--;
      }
      
      if (userMessageIndex < 0) {
        showToast('No previous user message to regenerate from', 'error');
        return;
      }
      
      const userMessageContent = messages[userMessageIndex].content;
      
      // Remove the AI response
      messages.splice(index, 1);
      renderMessages();
      if (currentUser) saveConversation();

      // Trigger regeneration
      isWaiting = true;
      sendBtn.disabled = true;
      showTyping();

      callAI(userMessageContent)
        .then(async (reply) => {
          removeTyping();
          const assistantMsg = { role: 'assistant', content: reply, timestamp: Date.now() };
          
          // Generate suggestions for the regenerated response
          const suggestions = await generateSuggestions(userMessageContent, reply);
          assistantMsg.suggestions = suggestions;
          
          messages.push(assistantMsg);
          renderMessages();
          if (currentUser) saveConversation();
          showToast('Response regenerated', 'success');
        })
        .catch(err => {
          removeTyping();
          showToast(`Regenerate failed: ${err.message}`, 'error', 5000);
        })
        .finally(() => {
          isWaiting = false;
          sendBtn.disabled = false;
        });
    }
  });

  // =========================================================================
  // Typing indicator
  // =========================================================================
  function showTyping() {
    const existingTyping = document.getElementById('typingIndicator');
    if (existingTyping) existingTyping.remove();
    
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.id = 'typingIndicator';
    typingDiv.innerHTML = '<span></span><span></span><span></span>';
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function removeTyping() {
    const el = document.getElementById('typingIndicator');
    if (el) el.remove();
  }

  // =========================================================================
  // AI Call
  // =========================================================================
  async function callAI(userMessage) {
    if (!aiConfig.token) {
      const ok = await fetchTokens();
      if (!ok) throw new Error('AI service is not configured.');
    }

    const recentMessages = messages.slice(-20);
    const apiMessages = [
      { 
        role: 'system', 
        content: 'You are a knowledgeable rehabilitation assistant. You provide accurate, evidence‑based answers about rehabilitation, medical conditions, treatments, and can help with assignments for healthcare students. Use clear language and markdown for formatting when helpful. Be concise but thorough. Always structure your answers in a readable format with appropriate headings, bullet points, and emphasis.' 
      },
      ...recentMessages.map(m => ({ role: m.role, content: m.content }))
    ];

    console.log('[AI] Sending request, message count:', apiMessages.length);

    const url = `${aiConfig.endpoint}/chat/completions`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aiConfig.token}`
      },
      body: JSON.stringify({
        model: aiConfig.model,
        messages: apiMessages,
        max_tokens: 1500,
        temperature: 0.7,
        top_p: 0.9
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const msg = errData?.error?.message || `API error (${response.status})`;
      throw new Error(msg);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  // =========================================================================
  // Conversation persistence
  // =========================================================================
  async function saveConversation() {
    if (!currentUser || messages.length === 0) return;
    
    // Strip suggestions before saving (they're regenerated on load)
    const cleanMessages = messages.map(m => {
      const { suggestions, ...rest } = m;
      return rest;
    });
    
    const title = messages[0].content.substring(0, 60).replace(/\n/g, ' ') + (messages[0].content.length > 60 ? '...' : '');
    
    try {
      if (currentConversationId) {
        await database.ref(`history/${currentUser.uid}/askConversations/${currentConversationId}`).update({
          title,
          messages: cleanMessages,
          updatedAt: firebase.database.ServerValue.TIMESTAMP
        });
      } else {
        const ref = await database.ref(`history/${currentUser.uid}/askConversations`).push({
          title,
          messages: cleanMessages,
          createdAt: firebase.database.ServerValue.TIMESTAMP,
          updatedAt: firebase.database.ServerValue.TIMESTAMP
        });
        currentConversationId = ref.key;
      }
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  }

  async function loadConversation(convId) {
    if (!currentUser) return;
    try {
      const snap = await database.ref(`history/${currentUser.uid}/askConversations/${convId}`).once('value');
      const data = snap.val();
      if (data) {
        currentConversationId = convId;
        messages = data.messages || [];
        
        // Generate suggestions for the last AI message if applicable
        if (messages.length >= 2) {
          const lastAi = messages[messages.length - 1];
          const lastUser = messages[messages.length - 2];
          if (lastAi.role === 'assistant' && lastUser.role === 'user') {
            const suggestions = await generateSuggestions(lastUser.content, lastAi.content);
            lastAi.suggestions = suggestions;
          }
        }
        
        renderMessages();
        historyDrawer.classList.remove('active');
        showToast('Conversation loaded', 'success');
      }
    } catch (error) {
      showToast('Failed to load conversation', 'error');
    }
  }

  async function deleteConversation(convId, event) {
    event.stopPropagation();
    if (!currentUser) return;
    if (!confirm('Delete this conversation?')) return;
    try {
      await database.ref(`history/${currentUser.uid}/askConversations/${convId}`).remove();
      if (currentConversationId === convId) {
        newChat();
      }
      loadHistoryList();
      showToast('Conversation deleted', 'success');
    } catch (error) {
      showToast('Failed to delete', 'error');
    }
  }

  function newChat() {
    currentConversationId = null;
    messages = [];
    renderMessages();
    messageInput.focus();
  }

  // =========================================================================
  // History list
  // =========================================================================
  let allConversations = [];

  async function loadHistoryList() {
    if (!currentUser) return;
    try {
      const snap = await database.ref(`history/${currentUser.uid}/askConversations`).orderByChild('updatedAt').once('value');
      const data = snap.val();
      allConversations = [];
      if (data) {
        allConversations = Object.entries(data).map(([id, item]) => ({ id, ...item }));
        allConversations.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
      }
      renderHistoryList(allConversations);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  }

  function renderHistoryList(conversations) {
    if (!historyList) return;
    historyList.innerHTML = '';
    if (conversations.length === 0) {
      historyList.innerHTML = `
        <div class="empty-state">
          <i class='bx bx-folder-open'></i>
          <p>No conversations yet</p>
        </div>
      `;
      return;
    }
    
    const searchTerm = historySearchInput?.value.toLowerCase().trim() || '';
    const filtered = conversations.filter(c => 
      !searchTerm || (c.title || '').toLowerCase().includes(searchTerm)
    );

    if (filtered.length === 0) {
      historyList.innerHTML = `
        <div class="empty-state">
          <i class='bx bx-search'></i>
          <p>No matching conversations</p>
        </div>
      `;
      return;
    }

    filtered.forEach(conv => {
      const div = document.createElement('div');
      div.className = 'history-item';
      const date = new Date(conv.updatedAt || conv.createdAt);
      div.innerHTML = `
        <button class="delete-btn" data-id="${conv.id}" title="Delete conversation">
          <i class="fas fa-trash-alt"></i>
        </button>
        <span class="history-title">${escapeHtml(conv.title || 'Untitled')}</span>
        <div class="history-meta">
          <span><i class="far fa-calendar-alt"></i> ${date.toLocaleDateString()}</span>
          <span><i class="far fa-clock"></i> ${date.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
          <span>${conv.messages?.length || 0} messages</span>
        </div>
      `;
      
      div.addEventListener('click', (e) => {
        if (e.target.closest('.delete-btn')) return;
        loadConversation(conv.id);
      });
      
      div.querySelector('.delete-btn').addEventListener('click', (e) => deleteConversation(conv.id, e));
      
      historyList.appendChild(div);
    });
  }

  // =========================================================================
  // Send message
  // =========================================================================
  async function handleSend() {
    const text = messageInput.value.trim();
    if (!text || isWaiting) return;

    if (!currentUser) {
      showToast('Log in to save your conversation', 'info');
    }

    isWaiting = true;
    sendBtn.disabled = true;
    messageInput.disabled = true;

    // Clear suggestions from previous AI messages before adding new user message
    messages.forEach(m => {
      if (m.role === 'assistant') {
        delete m.suggestions;
      }
    });

    const userMsg = { role: 'user', content: text, timestamp: Date.now() };
    messages.push(userMsg);
    renderMessages();
    messageInput.value = '';
    messageInput.style.height = 'auto';

    if (currentUser) await saveConversation();

    showTyping();

    try {
      const reply = await callAI(text);
      removeTyping();
      
      const assistantMsg = { role: 'assistant', content: reply, timestamp: Date.now() };
      
      // Generate follow‑up suggestions
      const suggestions = await generateSuggestions(text, reply);
      assistantMsg.suggestions = suggestions;
      
      messages.push(assistantMsg);
      renderMessages();
      if (currentUser) await saveConversation();
    } catch (error) {
      removeTyping();
      const errorMsg = error.message.includes('Service error') ? 'AI service error. Please try again.' : error.message;
      showToast(`Error: ${errorMsg}`, 'error', 5000);
      messages.pop();
      renderMessages();
      if (currentUser) saveConversation();
    } finally {
      isWaiting = false;
      sendBtn.disabled = false;
      messageInput.disabled = false;
      messageInput.focus();
    }
  }

  // =========================================================================
  // Event listeners
  // =========================================================================
  
  // Auto-resize textarea
  messageInput.addEventListener('input', () => {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 150) + 'px';
    sendBtn.disabled = messageInput.value.trim() === '' || isWaiting;
  });

  // Send on Enter (Shift+Enter for new line)
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // Send button
  sendBtn.addEventListener('click', handleSend);

  // New chat button
  newChatBtn.addEventListener('click', () => {
    if (messages.length > 0 && !confirm('Start a new chat? Current conversation will be saved.')) return;
    newChat();
    showToast('New conversation started', 'info');
  });

  // =========================================================================
  // History drawer controls
  // =========================================================================
  if (historyNavBtn) {
    historyNavBtn.addEventListener('click', () => {
      if (!currentUser) {
        showToast('Please log in to view history', 'error');
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) loginBtn.click();
        return;
      }
      historyDrawer.classList.add('active');
      loadHistoryList();
    });
  }

  if (closeDrawerBtn) {
    closeDrawerBtn.addEventListener('click', () => {
      historyDrawer.classList.remove('active');
    });
  }

  // Close drawer when clicking outside
  document.addEventListener('click', (e) => {
    if (historyDrawer?.classList.contains('active') &&
        !historyDrawer.contains(e.target) &&
        e.target !== historyNavBtn &&
        !historyNavBtn?.contains(e.target)) {
      historyDrawer.classList.remove('active');
    }
  });

  // Close drawer with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && historyDrawer?.classList.contains('active')) {
      historyDrawer.classList.remove('active');
    }
  });

  // History search filter
  if (historySearchInput) {
    historySearchInput.addEventListener('input', () => renderHistoryList(allConversations));
  }

  // =========================================================================
  // Auth & initialization
  // =========================================================================
  firebase.auth().onAuthStateChanged(user => {
    currentUser = user;
    if (user) {
      console.log('[AUTH] User logged in:', user.email);
      historyNavBtn.style.display = 'block';
      loadHistoryList();
    } else {
      console.log('[AUTH] User logged out');
      historyNavBtn.style.display = 'none';
    }
  });

  async function initialize() {
    console.log('[INIT] Starting Ask AI...');
    await fetchTokens();
    renderMessages();
    messageInput.focus();
    console.log('[INIT] Ask AI ready with Copy, Download, Regenerate, and Suggestions');
  }

  initialize();
});