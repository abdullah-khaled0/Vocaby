const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

let GEMINI_API_KEY = '';

// Load settings on startup
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(['settings'], (data) => {
    const settings = data.settings || { apiKey: '' };
    GEMINI_API_KEY = settings.apiKey;
  });
});

// Handle messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generatePhrase') {
    const word = request.word;
    const prompt = `For the English word "${word}", provide:
1. The direct Arabic translation of just the word itself (not a phrase)
2. A simple English phrase using the word
3. A brief explanation of the word's meaning

Format your response exactly like this:
Explanation: Brief explanation of **${word}**
Phrase: English phrase with **${word}**
Arabic: Arabic translation of just the word "${word}"

Rules:
- For Arabic, translate ONLY the word itself, not the whole phrase
- Use ** to highlight the word in English parts
- Keep the explanation concise (1-2 sentences)
- Make the phrase simple and practical
- Ensure the Arabic translation is accurate and commonly used`;

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
    const { word, phrase, arabic, explanation } = request.vocab;
    const prompt = `Create a multiple-choice quiz question for the English word "${word}".

Rules:
1. Question Types (choose one randomly):
   - Translation: "What is the Arabic translation of '${word}'?"
   - Definition: "Which of these defines '${word}'?"
   - Usage: "Which sentence correctly uses '${word}'?"

2. Format:
Question: [Your question]
CorrectAnswer: [The correct answer]
Options: [Three plausible but incorrect options]

3. Guidelines:
- Make incorrect options realistic but clearly wrong
- For translation questions, use the provided Arabic translation
- For definition questions, base it on the explanation: ${explanation}
- For usage questions, base it on the phrase: ${phrase}
- Ensure all options are distinct and unambiguous
- Make options similar in length and style

Return in exact format:
Question: [question text]
Answer: [correct answer]
Option1: [incorrect option]
Option2: [incorrect option]
Option3: [incorrect option]`;

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
          maxOutputTokens: 200
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
        const lines = responseText.split('\n');
        const question = lines.find(line => line.startsWith('Question:'))?.replace('Question:', '').trim();
        const answer = lines.find(line => line.startsWith('Answer:'))?.replace('Answer:', '').trim();
        const options = [
          lines.find(line => line.startsWith('Option1:'))?.replace('Option1:', '').trim(),
          lines.find(line => line.startsWith('Option2:'))?.replace('Option2:', '').trim(),
          lines.find(line => line.startsWith('Option3:'))?.replace('Option3:', '').trim(),
        ].filter(Boolean);

        if (!question || !answer || options.length !== 3) {
          sendResponse({ error: 'Invalid quiz question format' });
          return;
        }

        sendResponse({ 
          question,
          answer,
          options: [...options, answer].sort(() => Math.random() - 0.5)
        });
      })
      .catch(error => {
        sendResponse({ error: `Failed to generate quiz question: ${error.message}` });
      });

    return true;
  }

  if (request.action === 'correctQuizAnswer') {
    const { question, userAnswer, correctAnswer } = request;
    const prompt = `Evaluate this quiz answer:
Question: ${question}
User's Answer: ${userAnswer}
Correct Answer: ${correctAnswer}

Rules:
1. Determine if the answer is exactly correct
2. Provide brief, encouraging feedback
3. If incorrect, explain why and provide the correct answer
4. Keep feedback concise and educational

Return in exact format:
Correct: true/false
Feedback: [your feedback]`;

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
        const [correct, feedback] = responseText.split('\n').reduce((acc, line) => {
          if (line.startsWith('Correct: ')) acc[0] = line.replace('Correct: ', '').trim() === 'true';
          if (line.startsWith('Feedback: ')) acc[1] = line.replace('Feedback: ', '').trim();
          return acc;
        }, [false, '']);
        sendResponse({ correct, feedback });
      })
      .catch(error => {
        sendResponse({ error: `Failed to evaluate quiz answer: ${error.message}` });
      });

    return true;
  }

  if (request.action === 'updateSettings') {
    const { apiKey } = request.settings;
    GEMINI_API_KEY = apiKey;
    sendResponse({ success: true });
    return true;
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