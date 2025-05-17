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
  const toggleApiKey = document.getElementById('toggleApiKey');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const translationsContainer = document.getElementById('translationsContainer');
  const translationSearchInput = document.getElementById('translationSearchInput');
  const quizOptions = document.getElementById('quizOptions');

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
      const settings = data.settings || { apiKey: '' };
      apiKeyInput.value = settings.apiKey;
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

    Object.keys(groupedVocab).sort().forEach(date => {
      const groupDiv = document.createElement('div');
      groupDiv.className = 'group';
      groupDiv.dataset.date = date;
      
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
        
        messagesUl.style.height = messagesUl.classList.contains('expanded') ? '0' : `${messagesUl.scrollHeight}px`;
        messagesUl.classList.toggle('expanded');
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

    // Reset quiz state
    currentQuizIndex = 0;
    quizScoreCorrect = 0;
    quizScoreTotal = 0;
    quizScore.textContent = `Score: 0/0`;
    quizFeedback.textContent = '';
    quizOptions.innerHTML = '';
    
    // Show quiz modal and start first question
    quizModal.classList.remove('hidden');
    startQuizQuestion();
  });

  function startQuizQuestion() {
    if (currentQuizIndex >= quizWords.length) {
      quizQuestion.textContent = 'Quiz completed!';
      quizOptions.innerHTML = '';
      submitQuizBtn.classList.add('hidden');
      nextQuizBtn.classList.add('hidden');
      quizFeedback.textContent = `Final Score: ${quizScoreCorrect}/${quizScoreTotal}`;
      return;
    }

    // Reset button states
    submitQuizBtn.disabled = false;
    submitQuizBtn.classList.remove('btn-loading', 'hidden');
    nextQuizBtn.classList.add('hidden');
    nextQuizBtn.disabled = false;
    nextQuizBtn.classList.remove('btn-loading');

    const vocab = quizWords[currentQuizIndex];
    chrome.runtime.sendMessage({ action: 'generateQuizQuestion', vocab }, (response) => {
      if (response.error) {
        quizQuestion.textContent = 'Error generating quiz question.';
        quizFeedback.textContent = response.error;
        quizOptions.innerHTML = '';
        submitQuizBtn.classList.add('hidden');
        nextQuizBtn.classList.add('hidden');
        return;
      }

      currentQuestion = response.question;
      currentCorrectAnswer = response.answer;

      // Clear previous state
      quizOptions.innerHTML = '';
      quizFeedback.textContent = '';

      // Create and append options
      response.options.forEach((option, index) => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'quiz-option';
        optionDiv.dataset.value = option;
        optionDiv.innerHTML = `
          <div class="quiz-option-radio"></div>
          <span class="quiz-option-text">${option}</span>
        `;
        
        // Add click handler
        optionDiv.addEventListener('click', () => {
          // Remove selection from other options
          quizOptions.querySelectorAll('.quiz-option').forEach(opt => {
            opt.classList.remove('selected');
          });
          // Select this option
          optionDiv.classList.add('selected');
          // Enable submit button if disabled
          submitQuizBtn.disabled = false;
        });
        
        quizOptions.appendChild(optionDiv);
      });

      // Update question display
      quizQuestion.textContent = currentQuestion;
    });
  }

  submitQuizBtn.addEventListener('click', () => {
    const selectedOption = quizOptions.querySelector('.quiz-option.selected');
    if (!selectedOption) {
      quizFeedback.textContent = 'Please select an answer.';
      return;
    }

    // Add loading state
    submitQuizBtn.classList.add('btn-loading');
    submitQuizBtn.disabled = true;

    const userAnswer = selectedOption.dataset.value;
    quizScoreTotal++;

    chrome.runtime.sendMessage({
      action: 'correctQuizAnswer',
      question: currentQuestion,
      userAnswer,
      correctAnswer: currentCorrectAnswer
    }, (response) => {
      // Remove loading state
      submitQuizBtn.classList.remove('btn-loading');
      submitQuizBtn.disabled = false;

      if (response.error) {
        quizFeedback.textContent = response.error;
        return;
      }

      // Mark correct and incorrect options
      quizOptions.querySelectorAll('.quiz-option').forEach(option => {
        const optionValue = option.dataset.value;
        if (optionValue === currentCorrectAnswer) {
          option.classList.add('correct');
        } else if (option === selectedOption && !response.correct) {
          option.classList.add('incorrect');
        }
        // Disable all options after submission
        option.style.pointerEvents = 'none';
      });

      if (response.correct) {
        quizScoreCorrect++;
      }
      
      quizFeedback.textContent = response.feedback;
      quizScore.textContent = `Score: ${quizScoreCorrect}/${quizScoreTotal}`;
      submitQuizBtn.classList.add('hidden');
      nextQuizBtn.classList.remove('hidden');
      nextQuizBtn.focus(); // Auto-focus the next button
    });
  });

  nextQuizBtn.addEventListener('click', () => {
    // Add loading state
    nextQuizBtn.classList.add('btn-loading');
    nextQuizBtn.disabled = true;

    currentQuizIndex++;
    startQuizQuestion();

    // Remove loading state after a short delay
    setTimeout(() => {
      nextQuizBtn.classList.remove('btn-loading');
      nextQuizBtn.disabled = false;
    }, 300);
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
    apiKeyInput.focus(); // Auto-focus the API key input
  });

  // Toggle API key visibility
  toggleApiKey.addEventListener('click', () => {
    const type = apiKeyInput.type === 'password' ? 'text' : 'password';
    apiKeyInput.type = type;
    toggleApiKey.querySelector('.icon').textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
  });

  // Save settings
  saveSettingsBtn.addEventListener('click', () => {
    // Add loading state
    saveSettingsBtn.classList.add('btn-loading');
    saveSettingsBtn.disabled = true;
    closeSettingsBtn.disabled = true;

    const settings = {
      apiKey: apiKeyInput.value.trim()
    };

    chrome.storage.local.set({ settings }, () => {
      chrome.runtime.sendMessage({ action: 'updateSettings', settings }, (response) => {
        // Remove loading state
        saveSettingsBtn.classList.remove('btn-loading');
        saveSettingsBtn.disabled = false;
        closeSettingsBtn.disabled = false;

        if (response.success) {
          // Show success message
          const successMsg = document.createElement('div');
          successMsg.className = 'settings-success';
          successMsg.textContent = 'Settings saved successfully!';
          
          // Insert success message before the buttons
          const modalButtons = settingsModal.querySelector('.modal-buttons');
          modalButtons.parentNode.insertBefore(successMsg, modalButtons);

          // Auto-hide success message and close modal
          setTimeout(() => {
            successMsg.remove();
            settingsModal.classList.add('hidden');
          }, 1500);
        }
      });
    });
  });

  closeSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
  });

  // Add keyboard navigation for settings
  apiKeyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !saveSettingsBtn.disabled) {
      saveSettingsBtn.click();
    }
  });

  // Close settings modal with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !settingsModal.classList.contains('hidden')) {
      closeSettingsBtn.click();
    }
  });

  // Prevent closing modal when clicking inside
  settingsModal.querySelector('.modal-content').addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // Close modal when clicking outside
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      closeSettingsBtn.click();
    }
  });

  // Enable keyboard navigation
  wordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      generateBtn.click();
    }
  });

  // Add keyboard navigation for quiz buttons
  document.addEventListener('keydown', (e) => {
    if (!quizModal.classList.contains('hidden')) {
      if (e.key === 'Enter') {
        if (!submitQuizBtn.classList.contains('hidden') && !submitQuizBtn.disabled) {
          submitQuizBtn.click();
        } else if (!nextQuizBtn.classList.contains('hidden') && !nextQuizBtn.disabled) {
          nextQuizBtn.click();
        }
      } else if (e.key === 'Escape') {
        closeQuizBtn.click();
      }
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

  // Tab switching
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.dataset.tab;
      
      // Update active states
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      button.classList.add('active');
      document.getElementById(`${tabName}Tab`).classList.add('active');

      // Render translations if switching to translations tab
      if (tabName === 'translations') {
        renderTranslations();
      }
    });
  });

  // Render translations
  function renderTranslations() {
    translationsContainer.innerHTML = '';
    const sortedVocab = [...vocabData].sort((a, b) => a.word.localeCompare(b.word));
    
    sortedVocab.forEach(({ word, arabic }) => {
      const translationItem = document.createElement('div');
      translationItem.className = 'translation-item';
      translationItem.innerHTML = `
        <span class="translation-word">${word}</span>
        <span class="translation-arabic">${arabic.replace(/\*\*([^\*]+)\*\*/g, '$1')}</span>
      `;
      translationsContainer.appendChild(translationItem);
    });
  }

  // Search translations
  translationSearchInput.addEventListener('input', () => {
    const query = translationSearchInput.value.trim().toLowerCase();
    const filteredVocab = query
      ? vocabData.filter(item =>
          item.word.toLowerCase().includes(query) ||
          item.arabic.toLowerCase().includes(query)
        )
      : vocabData;
    
    const sortedVocab = [...filteredVocab].sort((a, b) => a.word.localeCompare(b.word));
    translationsContainer.innerHTML = '';
    
    sortedVocab.forEach(({ word, arabic }) => {
      const translationItem = document.createElement('div');
      translationItem.className = 'translation-item';
      translationItem.innerHTML = `
        <span class="translation-word">${word}</span>
        <span class="translation-arabic">${arabic.replace(/\*\*([^\*]+)\*\*/g, '$1')}</span>
      `;
      translationsContainer.appendChild(translationItem);
    });
  });

  // Initial load
  loadVocab();
  loadSettings();
});