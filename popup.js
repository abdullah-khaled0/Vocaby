document.addEventListener('DOMContentLoaded', () => {
  const wordInput = document.getElementById('wordInput');
  const generateBtn = document.getElementById('generateBtn');
  const searchInput = document.getElementById('searchInput');
  const chatContainer = document.getElementById('chatContainer');
  const vocabGroups = document.getElementById('vocabGroups');
  const loadingDiv = document.getElementById('loading');
  const quizGroupSelect = document.getElementById('quizGroupSelect');
  const startQuizBtn = document.getElementById('startQuizBtn');
  const quizModal = document.getElementById('quizModal');
  const quizScore = document.getElementById('quizScore');
  const quizQuestion = document.getElementById('quizQuestion');
  const quizAnswer = document.getElementById('quizAnswer');
  const submitQuizBtn = document.getElementById('submitQuizBtn');
  const quizFeedback = document.getElementById('quizFeedback');
  const nextQuizBtn = document.getElementById('nextQuizBtn');
  const closeQuizBtn = document.getElementById('closeQuizBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const notificationPeriod = document.getElementById('notificationPeriod');
  const notificationsEnabled = document.getElementById('notificationsEnabled');
  const testNotificationBtn = document.getElementById('testNotificationBtn');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const notificationMessage = document.getElementById('notificationMessage');
  const notificationContent = document.getElementById('notificationContent');
  const closeNotificationBtn = document.getElementById('closeNotificationBtn');

  let vocabData = [];
  let quizWords = [];
  let currentQuizIndex = 0;
  let currentQuestion = '';
  let currentCorrectAnswer = '';
  let quizScoreCorrect = 0;
  let quizScoreTotal = 0;

  // Check if chrome.storage is available
  if (!chrome.storage || !chrome.storage.local) {
    appendMessage('bot', 'Error: Chrome storage API is unavailable.', null);
    console.error('Chrome storage API is not available.');
    return;
  }

  // Load settings
  function loadSettings() {
    chrome.storage.local.get(['settings'], (data) => {
      const settings = data.settings || { apiKey: '', notificationPeriod: 3600000, notificationsEnabled: false };
      apiKeyInput.value = settings.apiKey;
      notificationPeriod.value = settings.notificationPeriod;
      notificationsEnabled.checked = settings.notificationsEnabled;
    });
  }

  // Load and render vocab groups
  function loadVocab() {
    chrome.storage.local.get(['vocab'], (data) => {
      vocabData = data.vocab || [];
      renderVocabGroups(vocabData);
      updateQuizGroupOptions();
    });
  }

  // Render vocab groups
  function renderVocabGroups(vocab) {
    vocabGroups.innerHTML = '';
    const groupedVocab = vocab.reduce((acc, item) => {
      (acc[item.date] = acc[item.date] || []).push(item);
      return acc;
    }, {});

    // Sort dates in ascending order (oldest to newest)
    Object.keys(groupedVocab).sort().forEach(date => {
      const groupDiv = document.createElement('div');
      groupDiv.className = 'group';
      groupDiv.dataset.date = date;
      
      // Add isToday class if the group is from today
      const isToday = date === new Date().toISOString().split('T')[0];
      if (isToday) {
        groupDiv.classList.add('today');
      }
      
      groupDiv.innerHTML = `
        <div class="group-header ${isToday ? 'today' : ''}" data-date="${date}">
          <div class="group-header-content">
            <span class="group-date">${new Date(date).toLocaleDateString('en-US', { 
              weekday: 'short', 
              month: 'short', 
              day: 'numeric',
              year: new Date(date).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
            })}</span>
            ${isToday ? '<span class="today-badge">Today</span>' : ''}
          </div>
          <button class="delete-btn" data-date="${date}" title="Delete group">
            <span class="delete-icon">×</span>
          </button>
        </div>
        <ul class="chat-messages"></ul>
      `;
      
      const messagesUl = groupDiv.querySelector('.chat-messages');
      groupedVocab[date].forEach(({ word, phrase, arabic, explanation }) => {
        appendMessage('user', word, messagesUl);
        appendMessage('bot explanation', explanation.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>'), messagesUl);
        appendMessage('bot phrase', phrase.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>'), messagesUl);
        appendMessage('bot arabic', arabic.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>'), messagesUl);
      });
      vocabGroups.appendChild(groupDiv);

      // Toggle group visibility with animation
      const header = groupDiv.querySelector('.group-header');
      const toggleGroup = (e) => {
        if (e.target.closest('.delete-btn')) return;
        
        messagesUl.style.height = messagesUl.scrollHeight + 'px';
        if (messagesUl.classList.contains('hidden')) {
          messagesUl.classList.remove('hidden');
          requestAnimationFrame(() => {
            messagesUl.style.height = messagesUl.scrollHeight + 'px';
          });
        } else {
          messagesUl.style.height = '0';
          messagesUl.addEventListener('transitionend', () => {
            if (messagesUl.style.height === '0px') {
              messagesUl.classList.add('hidden');
            }
          }, { once: true });
        }
      };
      
      header.addEventListener('click', toggleGroup);

      // Add delete button listener
      const deleteBtn = groupDiv.querySelector('.delete-btn');
      deleteBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete this group?')) {
          chrome.storage.local.get(['vocab'], (data) => {
            const updatedVocab = (data.vocab || []).filter(item => item.date !== date);
            chrome.storage.local.set({ vocab: updatedVocab }, () => {
              groupDiv.style.opacity = '0';
              groupDiv.style.transform = 'translateX(-20px)';
              setTimeout(() => {
                loadVocab();
                updateQuizGroupOptions();
              }, 300);
            });
          });
        }
      });
    });

    scrollToBottom();
  }

  // Generate phrase
  generateBtn.addEventListener('click', () => {
    const word = wordInput.value.trim().toLowerCase();
    if (!word) {
      appendMessage('bot', 'Please enter a word.', null);
      scrollToBottom();
      return;
    }

    // Check if word exists
    if (vocabData.some(item => item.word.toLowerCase() === word)) {
      appendMessage('bot', `The word "${word}" is already in your vocabulary.`, null);
      scrollToBottom();
      wordInput.value = '';
      return;
    }

    loadingDiv.classList.remove('hidden');
    appendMessage('user', word, null);
    scrollToBottom();

    chrome.runtime.sendMessage({ action: 'generatePhrase', word }, (response) => {
      loadingDiv.classList.add('hidden');

      if (chrome.runtime.lastError) {
        appendMessage('bot', 'Error: Failed to communicate with background script.', null);
        console.error(chrome.runtime.lastError);
        scrollToBottom();
        return;
      }
      if (response.error) {
        appendMessage('bot', `Error: ${response.error}`, null);
        scrollToBottom();
        return;
      }

      const { phrase, arabic, explanation } = response;
      appendMessage('bot explanation', explanation.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>'), null);
      appendMessage('bot phrase', phrase.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>'), null);
      appendMessage('bot arabic', arabic.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>'), null);
      scrollToBottom();

      // Save word, phrase, Arabic translation, explanation, and date
      chrome.storage.local.get(['vocab'], (data) => {
        const vocab = data.vocab || [];
        vocab.push({ word, phrase, arabic, explanation, date: new Date().toISOString().split('T')[0] });
        chrome.storage.local.set({ vocab }, loadVocab);
      });

      wordInput.value = '';
    });
  });

  // Search functionality
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    const filteredVocab = query
      ? vocabData.filter(item =>
          item.word.toLowerCase().includes(query) ||
          item.phrase.toLowerCase().includes(query) ||
          item.arabic.toLowerCase().includes(query) ||
          item.explanation.toLowerCase().includes(query)
        )
      : vocabData;
    renderVocabGroups(filteredVocab);
  });

  // Quiz functionality
  startQuizBtn.addEventListener('click', () => {
    const selectedDate = quizGroupSelect.value;
    if (!selectedDate) {
      appendMessage('bot', 'Please select a group to start the quiz.', null);
      scrollToBottom();
      return;
    }

    quizWords = vocabData.filter(item => item.date === selectedDate);
    if (quizWords.length === 0) {
      appendMessage('bot', 'No words found for the selected group.', null);
      scrollToBottom();
      return;
    }

    currentQuizIndex = 0;
    quizScoreCorrect = 0;
    quizScoreTotal = 0;
    quizScore.textContent = `Score: ${quizScoreCorrect}/${quizScoreTotal}`;
    startQuizQuestion();
    quizModal.classList.remove('hidden');
  });

  function startQuizQuestion() {
    if (currentQuizIndex >= quizWords.length) {
      quizQuestion.textContent = 'Quiz completed!';
      quizAnswer.classList.add('hidden');
      submitQuizBtn.classList.add('hidden');
      nextQuizBtn.classList.add('hidden');
      quizFeedback.textContent = `Final Score: ${quizScoreCorrect}/${quizScoreTotal}`;
      return;
    }

    const vocab = quizWords[currentQuizIndex];
    chrome.runtime.sendMessage({ action: 'generateQuizQuestion', vocab }, (response) => {
      if (response.error) {
        quizQuestion.textContent = 'Error generating quiz question.';
        quizFeedback.textContent = response.error;
        quizAnswer.classList.add('hidden');
        submitQuizBtn.classList.add('hidden');
        nextQuizBtn.classList.add('hidden');
        return;
      }

      currentQuestion = response.question;
      currentCorrectAnswer = response.answer;
      quizQuestion.textContent = currentQuestion;
      quizAnswer.value = '';
      quizAnswer.classList.remove('hidden');
      quizAnswer.classList.remove('close');
      quizFeedback.textContent = '';
      submitQuizBtn.classList.remove('hidden');
      nextQuizBtn.classList.add('hidden');
    });
  }

  submitQuizBtn.addEventListener('click', () => {
    const userAnswer = quizAnswer.value.trim();
    if (!userAnswer) {
      quizFeedback.textContent = 'Please enter an answer.';
      return;
    }

    quizScoreTotal++;
    chrome.runtime.sendMessage({
      action: 'correctQuizAnswer',
      question: currentQuestion,
      userAnswer,
      correctAnswer: currentCorrectAnswer
    }, (response) => {
      if (response.error) {
        quizFeedback.textContent = response.error;
        return;
      }

      if (response.correct) {
        quizScoreCorrect++;
        quizFeedback.textContent = response.feedback;
      } else if (response.close) {
        quizAnswer.classList.add('close');
        quizFeedback.textContent = response.feedback;
      } else {
        quizFeedback.textContent = response.feedback;
      }

      quizScore.textContent = `Score: ${quizScoreCorrect}/${quizScoreTotal}`;
      submitQuizBtn.classList.add('hidden');
      nextQuizBtn.classList.remove('hidden');
    });
  });

  nextQuizBtn.addEventListener('click', () => {
    currentQuizIndex++;
    startQuizQuestion();
  });

  closeQuizBtn.addEventListener('click', () => {
    quizModal.classList.add('hidden');
    quizWords = [];
    currentQuizIndex = 0;
    quizScoreCorrect = 0;
    quizScoreTotal = 0;
  });

  // Settings functionality
  settingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
  });

  testNotificationBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'testNotification' }, (response) => {
      if (response.error) {
        appendMessage('bot', `Error: ${response.error}`, null);
      } else {
        appendMessage('bot', 'Test notification triggered. Check your notifications.', null);
      }
      scrollToBottom();
    });
  });

  saveSettingsBtn.addEventListener('click', () => {
    const settings = {
      apiKey: apiKeyInput.value.trim(),
      notificationPeriod: parseInt(notificationPeriod.value, 10),
      notificationsEnabled: notificationsEnabled.checked
    };
    chrome.storage.local.set({ settings }, () => {
      chrome.runtime.sendMessage({ action: 'updateSettings', settings }, (response) => {
        if (response.success) {
          settingsModal.classList.add('hidden');
          appendMessage('bot', 'Settings saved successfully.', null);
          scrollToBottom();
        }
      });
    });
  });

  closeSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
  });

  // Notification message handling
  function showNotificationMessage(message) {
    notificationContent.textContent = message;
    notificationMessage.classList.add('visible');
    closeNotificationBtn.classList.remove('hidden');
  }

  closeNotificationBtn.addEventListener('click', () => {
    notificationMessage.classList.remove('visible');
    closeNotificationBtn.classList.add('hidden');
    notificationContent.textContent = '';
  });

  // Handle notification click message
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openPopupWithNotification') {
      chrome.runtime.sendMessage({ action: 'getLastNotificationMessage' }, (response) => {
        if (response.message) {
          showNotificationMessage(response.message);
        }
      });
    }
  });

  // Check for notification message on load
  chrome.runtime.sendMessage({ action: 'getLastNotificationMessage' }, (response) => {
    if (response.message) {
      showNotificationMessage(response.message);
    }
  });

  // Enable keyboard navigation
  wordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      generateBtn.click();
    }
  });

  quizAnswer.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      submitQuizBtn.click();
    }
  });

  apiKeyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveSettingsBtn.click();
    }
  });

  // Helper function to append messages
  function appendMessage(type, text, ul) {
    const li = document.createElement('li');
    li.className = `chat-message ${type}`;
    li.innerHTML = text;
    if (ul) {
      ul.appendChild(li);
    } else {
      const today = new Date().toISOString().split('T')[0];
      let lastGroup = vocabGroups.querySelector(`.group[data-date="${today}"] .chat-messages`);
      if (!lastGroup) {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'group';
        groupDiv.dataset.date = today;
        groupDiv.innerHTML = `
          <div class="group-header" data-date="${today}">
            <span>${new Date(today).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            <button class="delete-btn" data-date="${today}">Delete</button>
          </div>
          <ul class="chat-messages"></ul>
        `;
        vocabGroups.insertBefore(groupDiv, vocabGroups.firstChild);
        lastGroup = groupDiv.querySelector('.chat-messages');
        groupDiv.querySelector('.group-header').addEventListener('click', (e) => {
          if (e.target.className !== 'delete-btn') {
            lastGroup.classList.toggle('hidden');
          }
        });
        groupDiv.querySelector('.delete-btn').addEventListener('click', () => {
          chrome.storage.local.get(['vocab'], (data) => {
            const updatedVocab = (data.vocab || []).filter(item => item.date !== today);
            chrome.storage.local.set({ vocab: updatedVocab }, () => {
              loadVocab();
              updateQuizGroupOptions();
            });
          });
        });
      }
      lastGroup.appendChild(li);
    }
  }

  // Helper function to scroll to bottom
  function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  // Update quiz group options
  function updateQuizGroupOptions() {
    quizGroupSelect.innerHTML = '<option value="">Select a group for quiz</option>';
    const dates = [...new Set(vocabData.map(item => item.date))].sort().reverse();
    dates.forEach(date => {
      const option = document.createElement('option');
      option.value = date;
      option.textContent = new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      quizGroupSelect.appendChild(option);
    });
  }

  // Initial load
  loadVocab();
  loadSettings();
});