const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

let GEMINI_API_KEY = '';
let notificationIntervalId = null;
let lastNotificationMessage = '';

// Load settings on startup
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(['settings'], (data) => {
    const settings = data.settings || { apiKey: '', notificationPeriod: 3600000, notificationsEnabled: false };
    GEMINI_API_KEY = settings.apiKey;
    if (settings.notificationsEnabled) {
      startNotificationInterval(settings.notificationPeriod);
    }
  });
});

// Handle messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generatePhrase') {
    const word = request.word;
    const prompt = `Generate a concise and useful English phrase or sentence that incorporates the word "${word}" to help a learner understand its meaning and usage. Ensure the phrase is simple, clear, and memorable. Highlight the word "${word}" in the phrase using **${word}**. Also, provide the Arabic translation of the phrase with the equivalent Arabic word highlighted using **word**, excluding any English transliteration. Include a brief explanation (1-2 sentences) of the word's meaning, highlighting "${word}" using **${word}**. Return the response in the format:
    Explanation: <Explanation with **${word}**>
    Phrase: <English phrase with **${word}**>
    Arabic: <Arabic translation with **equivalent word**>`;

    if (!GEMINI_API_KEY) {
      sendResponse({ error: 'Gemini API key is not set. Please configure it in settings.' });
      return true;
    }

    console.log('Sending API request:', { word, url: GEMINI_API_URL });
    fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 150
        }
      })
    })
      .then(response => {
        console.log('API response status:', response.status, response.statusText);
        if (!response.ok) {
          return response.text().then(text => {
            throw new Error(`HTTP error! Status: ${response.status}, Message: ${text}`);
          });
        }
        return response.json();
      })
      .then(data => {
        console.log('API response data:', data);
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
          console.error('Invalid API response:', data);
          sendResponse({ error: 'Failed to generate phrase: Invalid or empty response from API' });
          return;
        }
        const responseText = data.candidates[0].content.parts[0].text || 'No phrase generated.';
        const [explanation, phrase, arabic] = responseText.split('\n').reduce((acc, line) => {
          if (line.startsWith('Explanation: ')) acc[0] = line.replace('Explanation: ', '').trim();
          if (line.startsWith('Phrase: ')) acc[1] = line.replace('Phrase: ', '').trim();
          if (line.startsWith('Arabic: ')) acc[2] = line.replace('Arabic: ', '').trim();
          return acc;
        }, ['', '', '']);
        sendResponse({ phrase, arabic, explanation });
      })
      .catch(error => {
        console.error('Error fetching phrase:', error);
        sendResponse({ error: `Failed to fetch phrase: ${error.message}` });
      });

    return true;
  }

  if (request.action === 'generateQuizQuestion') {
    const { word, phrase, arabic } = request.vocab;
    const prompt = `Create a quiz question for the word "${word}" to help a learner practice its meaning or usage. The question can be a fill-in-the-blank, translation, or definition-based question. Provide the question and the correct answer in the format:
    Question: <Quiz question>
    Answer: <Correct answer>`;

    if (!GEMINI_API_KEY) {
      sendResponse({ error: 'Gemini API key is not set. Please configure it in settings.' });
      return true;
    }

    fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 100
        }
      })
    })
      .then(response => {
        if (!response.ok) {
          return response.text().then(text => {
            throw new Error(`HTTP error! Status: ${response.status}, Message: ${text}`);
          });
        }
        return response.json();
      })
      .then(data => {
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
          sendResponse({ error: 'Failed to generate quiz question' });
          return;
        }
        const responseText = data.candidates[0].content.parts[0].text;
        const [question, answer] = responseText.split('\n').reduce((acc, line) => {
          if (line.startsWith('Question: ')) acc[0] = line.replace('Question: ', '').trim();
          if (line.startsWith('Answer: ')) acc[1] = line.replace('Answer: ', '').trim();
          return acc;
        }, ['', '']);
        sendResponse({ question, answer });
      })
      .catch(error => {
        sendResponse({ error: `Failed to generate quiz question: ${error.message}` });
      });

    return true;
  }

  if (request.action === 'correctQuizAnswer') {
    const { question, userAnswer, correctAnswer } = request;
    const prompt = `Evaluate the user's answer to the following quiz question:
    Question: ${question}
    User's Answer: ${userAnswer}
    Correct Answer: ${correctAnswer}
    Determine if the user's answer is correct, incorrect, or close to correct (e.g., minor spelling errors or similar meaning). Provide feedback explaining why the answer is correct, incorrect, or close, and if incorrect/close, clarify the correct answer. Return the response in the format:
    Correct: <true/false>
    Close: <true/false>
    Feedback: <Feedback text>`;

    if (!GEMINI_API_KEY) {
      sendResponse({ error: 'Gemini API key is not set. Please configure it in settings.' });
      return true;
    }

    fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 100
        }
      })
    })
      .then(response => {
        if (!response.ok) {
          return response.text().then(text => {
            throw new Error(`HTTP error! Status: ${response.status}, Message: ${text}`);
          });
        }
        return response.json();
      })
      .then(data => {
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
          sendResponse({ error: 'Failed to evaluate quiz answer' });
          return;
        }
        const responseText = data.candidates[0].content.parts[0].text;
        const [correct, close, feedback] = responseText.split('\n').reduce((acc, line) => {
          if (line.startsWith('Correct: ')) acc[0] = line.replace('Correct: ', '').trim() === 'true';
          if (line.startsWith('Close: ')) acc[1] = line.replace('Close: ', '').trim() === 'true';
          if (line.startsWith('Feedback: ')) acc[2] = line.replace('Feedback: ', '').trim();
          return acc;
        }, [false, false, '']);
        sendResponse({ correct, close, feedback });
      })
      .catch(error => {
        sendResponse({ error: `Failed to evaluate quiz answer: ${error.message}` });
      });

    return true;
  }

  if (request.action === 'updateSettings') {
    const { apiKey, notificationPeriod, notificationsEnabled } = request.settings;
    GEMINI_API_KEY = apiKey;
    if (notificationIntervalId) {
      clearInterval(notificationIntervalId);
      notificationIntervalId = null;
    }
    if (notificationsEnabled && notificationPeriod > 0) {
      startNotificationInterval(notificationPeriod);
    }
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'testNotification') {
    chrome.storage.local.get(['vocab'], (data) => {
      const vocab = data.vocab || [];
      if (vocab.length === 0) {
        sendResponse({ error: 'No vocabulary available to test notification.' });
        return;
      }
      const randomIndex = Math.floor(Math.random() * vocab.length);
      const { word, explanation, phrase, arabic } = vocab[randomIndex];
      const message = `Word: ${word}\nExplanation: ${explanation.replace(/\*\*([^\*]+)\*\*/g, '$1')}\nPhrase: ${phrase.replace(/\*\*([^\*]+)\*\*/g, '$1')}\nArabic: ${arabic.replace(/\*\*([^\*]+)\*\*/g, '$1')}`;
      if (chrome.notifications && typeof chrome.notifications.create === 'function') {
        const notificationId = `vocaby-${Date.now()}`;
        lastNotificationMessage = message;
        chrome.notifications.create(notificationId, {
          type: 'basic',
          iconUrl: 'icon.png',
          title: 'Vocaby Reminder',
          message: message.split('\n')[0], // Show only first line in notification
          priority: 1
        }, () => {
          if (chrome.runtime.lastError) {
            console.error('Notification error:', chrome.runtime.lastError.message);
            sendResponse({ error: `Failed to create notification: ${chrome.runtime.lastError.message}` });
          } else {
            console.log('Notification created:', notificationId);
            sendResponse({ success: true });
          }
        });
      } else {
        console.error('chrome.notifications.create is not available');
        sendResponse({ error: 'Notifications are not supported in this environment.' });
      }
    });
    return true;
  }

  if (request.action === 'getLastNotificationMessage') {
    sendResponse({ message: lastNotificationMessage });
    return true;
  }
});

// Start notification interval
function startNotificationInterval(period) {
  if (notificationIntervalId) {
    clearInterval(notificationIntervalId);
  }
  notificationIntervalId = setInterval(() => {
    chrome.storage.local.get(['vocab'], (data) => {
      const vocab = data.vocab || [];
      if (vocab.length === 0) return;
      const randomIndex = Math.floor(Math.random() * vocab.length);
      const { word, explanation, phrase, arabic } = vocab[randomIndex];
      const message = `Word: ${word}\nExplanation: ${explanation.replace(/\*\*([^\*]+)\*\*/g, '$1')}\nPhrase: ${phrase.replace(/\*\*([^\*]+)\*\*/g, '$1')}\nArabic: ${arabic.replace(/\*\*([^\*]+)\*\*/g, '$1')}`;
      if (chrome.notifications && typeof chrome.notifications.create === 'function') {
        const notificationId = `vocaby-${Date.now()}`;
        lastNotificationMessage = message;
        chrome.notifications.create(notificationId, {
          type: 'basic',
          iconUrl: 'icon.png',
          title: 'Vocaby Reminder',
          message: message.split('\n')[0], // Show only first line in notification
          priority: 1
        }, () => {
          if (chrome.runtime.lastError) {
            console.error('Notification error:', chrome.runtime.lastError.message);
          } else {
            console.log('Notification created:', notificationId);
          }
        });
      } else {
        console.error('chrome.notifications.create is not available');
      }
    });
  }, period);
}

// Handle notification click
chrome.notifications.onClicked.addListener((notificationId) => {
  if (notificationId.startsWith('vocaby-')) {
    console.log('Notification clicked:', notificationId);
    chrome.runtime.sendMessage({ action: 'openPopupWithNotification' });
    chrome.notifications.clear(notificationId);
  }
});

// Context menu for selected text
chrome.contextMenus.removeAll(() => {
  chrome.contextMenus.create({
    id: 'vocaby',
    title: 'Add "%s" to Vocaby',
    contexts: ['selection']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'vocaby') {
    const word = info.selectionText.trim();
    if (word) {
      chrome.runtime.sendMessage({ action: 'generatePhrase', word }, (response) => {
        if (!response.error) {
          chrome.storage.local.get(['vocab'], (data) => {
            const vocab = data.vocab || [];
            vocab.push({ word, phrase: response.phrase, arabic: response.arabic, explanation: response.explanation, date: new Date().toISOString().split('T')[0] });
            chrome.storage.local.set({ vocab });
          });
        }
      });
    }
  }
});