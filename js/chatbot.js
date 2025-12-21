// Chatbot Widget Implementation
(function() {
  'use strict';

  const STORAGE_KEY = 'chatbot-history';
  // Use local server if running on localhost, otherwise use production
  const API_ENDPOINT = (typeof window !== 'undefined' && 
                        window.location && 
                        (window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1')) 
                        ? 'http://localhost:3001/api/chat' 
                        : '/api/chat';

  function initChatbot() {
    console.log('Chatbot: Initializing...');
    const chatbot = document.getElementById('chatbot');
    if (!chatbot) {
      console.warn('Chatbot: Element #chatbot not found');
      return;
    }
    console.log('Chatbot: Element found');

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
    if (!inputForm) {
      console.error('Chatbot: Form element not found');
      return;
    }
    
    if (!input) {
      console.error('Chatbot: Input element not found');
      return;
    }
    
    console.log('Chatbot: Attaching form submit listener');
    inputForm.addEventListener('submit', async (e) => {
      console.log('Chatbot: Form submit event triggered');
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      if (isProcessing || !input.value.trim()) return;
      
      const messageText = input.value.trim();
      input.value = '';
      autoResizeTextarea(input);
      
      // Call sendMessage - errors are handled inside
      try {
        await sendMessage(messageText);
      } catch (error) {
        console.error('Chatbot form submit error:', error);
        showError('Failed to send message. Please try again.');
      }
    });

    // Auto-resize textarea
    input.addEventListener('input', () => {
      autoResizeTextarea(input);
    });

    // Enter to send (Shift+Enter for new line)
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Chatbot: Enter key pressed, dispatching submit');
        inputForm.dispatchEvent(new Event('submit', { bubbles: false, cancelable: true }));
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
        // Log the request for debugging
        const requestBody = {
          message: message,
          history: conversationHistory.slice(-10), // Last 10 messages for context
        };
        
        // Use absolute URL if on Vercel to avoid path resolution issues
        let endpoint = API_ENDPOINT;
        if (!endpoint.startsWith('http')) {
          // Try to get origin, fallback to relative path if not available
          if (typeof window !== 'undefined' && window.location && window.location.origin) {
            endpoint = window.location.origin + API_ENDPOINT;
          }
          // If still relative, use as-is (browser will resolve it)
        }
        
        // Try the fetch with error handling
        // Use cache: 'no-store' to bypass service worker cache
        let response;
        try {
          response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
            mode: 'cors',
            credentials: 'omit',
            cache: 'no-store', // Bypass any caching
          });
        } catch (fetchError) {
          // Try one more time with a slight delay in case of timing issues
          await new Promise(resolve => setTimeout(resolve, 100));
          try {
            response = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestBody),
              mode: 'cors',
              credentials: 'omit',
              cache: 'no-store',
            });
          } catch (retryError) {
            throw fetchError; // Throw original error
          }
        }

        if (!response.ok) {
          let errorText = '';
          try {
            errorText = await response.text();
          } catch (e) {
            errorText = `HTTP ${response.status}`;
          }
          
          // Check if it's a 401 with HTML (Vercel auth page or function not found)
          if (response.status === 401 && errorText.includes('<!doctype html>')) {
            throw new Error('API authentication failed. Please check that OPENAI_API_KEY is set in Vercel environment variables.');
          }
          
          throw new Error(`Server error (${response.status}): ${errorText.substring(0, 100)}`);
        }

        let data;
        try {
          data = await response.json();
        } catch (jsonError) {
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
        hideTypingIndicator(typingId);
        
        // Log error for debugging (minimal, production-safe)
        console.error('Chatbot error:', error.message || error);
        
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
        // Silently fail if history can't be loaded
      }
      return [];
    }

    function saveHistory() {
      try {
        // Limit history to last 50 messages to avoid localStorage size issues
        const limitedHistory = conversationHistory.slice(-50);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedHistory));
      } catch (error) {
        // If storage is full, clear old history
        if (error.name === 'QuotaExceededError') {
          conversationHistory = conversationHistory.slice(-25);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(conversationHistory));
          } catch (e) {
            // Silently fail if still can't save
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
  
  // Global error handler - log errors but don't prevent them
  window.addEventListener('error', (e) => {
    if (e.message && e.message.includes('chatbot')) {
      console.error('Chatbot global error:', e.message, e.filename, e.lineno);
      // Don't prevent default - let errors show in console
    }
  });
  
  // Log unhandled promise rejections for debugging
  window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    // Don't prevent default - let errors show in console
  });
})();

