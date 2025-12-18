// Chatbot Widget Implementation
(function() {
  'use strict';

  const STORAGE_KEY = 'chatbot-history';
  const API_ENDPOINT = '/api/chat';

  function initChatbot() {
    const chatbot = document.getElementById('chatbot');
    if (!chatbot) return;

    const button = chatbot.querySelector('.chatbot__button') || chatbot.querySelector('#chatbotToggle');
    const window = chatbot.querySelector('.chatbot__window');
    const messagesContainer = chatbot.querySelector('.chatbot__messages');
    const inputForm = chatbot.querySelector('.chatbot__input-form');
    const input = chatbot.querySelector('.chatbot__input');
    const sendButton = chatbot.querySelector('.chatbot__send');
    const closeButton = chatbot.querySelector('.chatbot__close');
    const clearHistoryButton = chatbot.querySelector('.chatbot__clear-history');

    let conversationHistory = loadHistory();
    let isProcessing = false;

    // Initialize UI
    renderHistory();
    if (conversationHistory.length === 0) {
      addWelcomeMessage();
    } else {
      // Show clear history button if there's history
      if (clearHistoryButton) {
        clearHistoryButton.style.display = 'block';
      }
    }

    // Toggle chat window
    button.addEventListener('click', () => {
      const isOpen = window.classList.contains('is-open');
      window.classList.toggle('is-open');
      button.classList.toggle('is-open');
      button.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
      window.setAttribute('aria-hidden', isOpen ? 'true' : 'false');
      if (!isOpen) {
        input.focus();
        scrollToBottom();
      }
    });

    // Close button
    closeButton.addEventListener('click', () => {
      window.classList.remove('is-open');
      button.classList.remove('is-open');
    });

    // Send message
    inputForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (isProcessing || !input.value.trim()) return;
      
      const messageText = input.value.trim();
      input.value = '';
      autoResizeTextarea(input);
      
      try {
        await sendMessage(messageText);
      } catch (error) {
        console.error('Error in form submission:', error);
        // Error is already handled in sendMessage
        // Prevent any default behavior
        return false;
      }
      return false;
    });

    // Auto-resize textarea
    input.addEventListener('input', () => {
      autoResizeTextarea(input);
    });

    // Enter to send (Shift+Enter for new line)
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        inputForm.dispatchEvent(new Event('submit'));
      }
    });

    // Clear history
    if (clearHistoryButton) {
      clearHistoryButton.addEventListener('click', () => {
        if (confirm('Clear conversation history?')) {
          clearHistory();
        }
      });
    }

    async function sendMessage(message) {
      isProcessing = true;
      sendButton.disabled = true;
      input.disabled = true;

      // Add user message
      addMessage('user', message);
      conversationHistory.push({ role: 'user', content: message });
      saveHistory();

      // Show typing indicator
      const typingId = showTypingIndicator();

      try {
        const response = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: message,
            history: conversationHistory.slice(-10), // Last 10 messages for context
          }),
          mode: 'cors', // Explicitly set CORS mode
        });

        if (!response.ok) {
          let errorText = '';
          try {
            errorText = await response.text();
            console.error('API Error Response:', response.status, errorText);
          } catch (e) {
            errorText = `HTTP ${response.status}`;
          }
          throw new Error(`Server error (${response.status}): ${errorText.substring(0, 100)}`);
        }

        let data;
        try {
          data = await response.json();
        } catch (jsonError) {
          console.error('JSON parse error:', jsonError);
          throw new Error('Invalid response from server');
        }
        
        hideTypingIndicator(typingId);

        // Check if response has error
        if (data.error) {
          throw new Error(data.error || 'API returned an error');
        }

        // Add assistant message
        if (!data.response) {
          throw new Error('No response from server');
        }
        
        addMessage('assistant', data.response);
        conversationHistory.push({ role: 'assistant', content: data.response });
        saveHistory();
        
        // Show clear history button after first message
        if (clearHistoryButton && conversationHistory.length > 1) {
          clearHistoryButton.style.display = 'block';
        }
      } catch (error) {
        console.error('Chatbot error:', error);
        hideTypingIndicator(typingId);
        
        // Remove user message from history if it failed
        if (conversationHistory.length > 0 && conversationHistory[conversationHistory.length - 1].role === 'user') {
          conversationHistory.pop();
          saveHistory();
          // Remove the last user message from UI
          const messages = messagesContainer.querySelectorAll('.chatbot__message--user');
          if (messages.length > 0) {
            messages[messages.length - 1].remove();
          }
        }
        
        let errorMessage = 'Sorry, I encountered an error. Please try again.';
        if (error.message) {
          const shortMessage = error.message.length > 80 ? error.message.substring(0, 80) + '...' : error.message;
          errorMessage = `Error: ${shortMessage}`;
        }
        showError(errorMessage);
      } finally {
        isProcessing = false;
        sendButton.disabled = false;
        input.disabled = false;
        input.focus();
      }
    }

    function addMessage(role, content) {
      const messageDiv = document.createElement('div');
      messageDiv.className = `chatbot__message chatbot__message--${role}`;

      const avatar = document.createElement('div');
      avatar.className = 'chatbot__message-avatar';
      avatar.textContent = role === 'user' ? 'You' : 'AI';

      const messageContent = document.createElement('div');
      messageContent.className = 'chatbot__message-content';
      messageContent.textContent = content;

      messageDiv.appendChild(avatar);
      messageDiv.appendChild(messageContent);
      messagesContainer.appendChild(messageDiv);

      scrollToBottom();
    }

    function showTypingIndicator() {
      const typingDiv = document.createElement('div');
      typingDiv.className = 'chatbot__message chatbot__message--assistant';
      typingDiv.id = 'typing-indicator';

      const avatar = document.createElement('div');
      avatar.className = 'chatbot__message-avatar';
      avatar.textContent = 'AI';

      const typing = document.createElement('div');
      typing.className = 'chatbot__typing';
      typing.innerHTML = `
        <div class="chatbot__typing-dot"></div>
        <div class="chatbot__typing-dot"></div>
        <div class="chatbot__typing-dot"></div>
      `;

      typingDiv.appendChild(avatar);
      typingDiv.appendChild(typing);
      messagesContainer.appendChild(typingDiv);

      scrollToBottom();
      return 'typing-indicator';
    }

    function hideTypingIndicator(id) {
      const indicator = document.getElementById(id);
      if (indicator) {
        indicator.remove();
      }
    }

    function showError(message) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'chatbot__error';
      errorDiv.textContent = message;
      messagesContainer.appendChild(errorDiv);
      scrollToBottom();

      setTimeout(() => {
        errorDiv.remove();
      }, 5000);
    }

    function addWelcomeMessage() {
      const welcome = `Hi! I'm an AI assistant for Mohammed-Taqi Jalil's portfolio. I can answer questions about his experience, projects, skills, and more. Feel free to ask me anything!`;
      addMessage('assistant', welcome);
      conversationHistory.push({ role: 'assistant', content: welcome });
      saveHistory();
    }

    function renderHistory() {
      messagesContainer.innerHTML = '';
      conversationHistory.forEach(msg => {
        if (msg.role === 'user' || msg.role === 'assistant') {
          addMessage(msg.role, msg.content);
        }
      });
    }

    function scrollToBottom() {
      setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }, 100);
    }

    function loadHistory() {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
      return [];
    }

    function saveHistory() {
      try {
        // Limit history to last 50 messages to avoid localStorage size issues
        const limitedHistory = conversationHistory.slice(-50);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedHistory));
      } catch (error) {
        console.error('Error saving chat history:', error);
        // If storage is full, clear old history
        if (error.name === 'QuotaExceededError') {
          conversationHistory = conversationHistory.slice(-25);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(conversationHistory));
          } catch (e) {
            console.error('Failed to save after clearing:', e);
          }
        }
      }
    }

    function clearHistory() {
      conversationHistory = [];
      localStorage.removeItem(STORAGE_KEY);
      messagesContainer.innerHTML = '';
      if (clearHistoryButton) {
        clearHistoryButton.style.display = 'none';
      }
      addWelcomeMessage();
    }

    function autoResizeTextarea(textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatbot);
  } else {
    initChatbot();
  }
  
  // Global error handler to prevent page refresh on unhandled errors
  window.addEventListener('error', (e) => {
    if (e.message && e.message.includes('chatbot')) {
      e.preventDefault();
      console.error('Chatbot global error:', e);
    }
  });
  
  // Prevent unhandled promise rejections from causing issues
  window.addEventListener('unhandledrejection', (e) => {
    if (e.reason && (e.reason.message && e.reason.message.includes('fetch') || e.reason.message && e.reason.message.includes('chatbot'))) {
      e.preventDefault();
      console.error('Chatbot unhandled rejection:', e.reason);
    }
  });
})();

