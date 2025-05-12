# Vocaby Chrome Extension

Vocaby is a Chrome extension that helps you build your English vocabulary with clear, memorable phrases, Arabic translations, and interactive quizzes. Powered by the Gemini API, Vocaby is perfect for English learners, especially Arabic speakers, offering a seamless way to learn and retain new words. Features include context menu integration, periodic notifications, and a clean, accessible interface.

## Features

- **Add Words Easily**: Input words in the popup or right-click selected text on any webpage.
- **Rich Explanations**: Get concise explanations, example phrases, and Arabic translations for each word.
- **Interactive Quizzes**: Test your vocabulary with quizzes grouped by date.
- **Notifications**: Receive reminders with word details to reinforce learning.
- **Searchable Vocabulary**: Filter saved words, phrases, or translations.
- **Customizable Settings**: Configure Gemini API key, notification frequency, and enable/disable notifications.
- **Accessible Design**: Supports keyboard navigation and ARIA labels for screen readers.

## Installation

1. **Clone or Download**:

   ```bash
   git clone https://github.com/abdullah-khaled0/Vocaby.git
   ```

   Or download the ZIP file from GitHub and extract it.
2. **Ensure Icon File**:
   - Verify a 128x128 PNG named `icon.png` is in the root directory. Create one (e.g., via Canva) if missing.
3. **Load in Chrome**:
   - Open Chrome and go to `chrome://extensions/`.
   - Enable **Developer mode** (top-right toggle).
   - Click **Load unpacked** and select the `vocaby` folder.
4. **Verify Installation**:
   - Find the Vocaby icon in the Extensions menu or pin it to the toolbar.

## Setup

1. **Get a Gemini API Key**:
   - Go to Google AI Studio (https://aistudio.google.com/app/apikey).
   - Create and copy your API key.
2. **Configure Settings**:
   - Click the Vocaby icon to open the popup.
   - Click the ⚙️ (settings) button in the top-right.
   - Paste your API key into the **Gemini API Key** field.
   - Select a **Notification Period** (e.g., 1 hour) and check **Enable Notifications** if desired.
   - Click **Save**, then **Close**.
3. **Test Notifications**:
   - In settings, click **Test Notification** (requires at least one saved word).
   - Ensure Chrome notifications are enabled (`chrome://settings/content/notifications`).

## How to Use Vocaby

### 1. Add a New Word

- **Via Popup**:
  - Open the Vocaby popup.
  - Enter a word (e.g., “foster”) in the **Add a new word** field.
  - Click ➤ or press **Enter**.
  - View the generated **explanation**, **phrase**, and **Arabic translation**.
  - Words are saved and grouped by date.
- **Via Context Menu**:
  - Highlight a word (e.g., “nurture”) on a webpage.
  - Right-click and select **Add "" to Vocaby**.
  - Open the popup to see the word’s details.

### 2. View and Manage Vocabulary

- **View Words**:
  - See vocabulary in the popup, grouped by date (e.g., “Mon, Oct 13”).
  - Click a group header to toggle its contents.
- **Search Vocabulary**:
  - Use the **Search vocabulary** field to filter by word, phrase, or translation (e.g., “foster” or “رعاية”).
- **Delete a Group**:
  - Click **Delete** next to a date to remove its words.

### 3. Take a Quiz

- **Start a Quiz**:
  - Select a date from the **Select a group for quiz** dropdown.
  - Click the green **Quiz** button.
  - Answer questions (fill-in-the-blank, translation, or definition-based).
- **Answer Questions**:
  - Type your answer and click **Submit** or press **Enter**.
  - See feedback (correct, incorrect, or close) and your score (e.g., “Score: 2/3”).
  - Click **Next** for the next question.
- **Finish or Exit**:
  - Complete the quiz for a final score or click **Close** to exit.

### 4. Receive and Interact with Notifications

- **Enable Notifications**:
  - In settings (⚙️), check **Enable Notifications**, set a period, and save.
- **View Notifications**:
  - A notification shows periodically (or via **Test Notification**) with a word (e.g., “Word: foster”).
- **Display Full Message**:
  - Click the notification to open the popup.
  - A blue-bordered box displays the full message (e.g., “Word: foster\\nExplanation: Foster parents...\\nPhrase: Foster parents care...\\nArabic: الآباء البدلاء...”).
  - Click the red ✕ to dismiss.
- **Troubleshooting**:
  - If no notification appears, check Chrome and system notification settings.
  - Open DevTools (right-click popup &gt; Inspect &gt; Console) for errors.

### 5. Customize Settings

- Update the **Gemini API Key** as needed.
- Adjust the **Notification Period** or toggle notifications.
- Click **Test Notification** to verify setup.

## Tips

- **Add Words Regularly**: Use the context menu while browsing.
- **Practice Daily**: Take quizzes to reinforce learning.
- **Enable Notifications**: Choose a period that suits you.
- **Debug Issues**: Check Console (popup or background page: `chrome://extensions/ > Details > Inspect active views`) for errors.
- **Keep Icon File**: Ensure `icon.png` is present to avoid notification issues.

## Troubleshooting

- **No Notifications**:
  - Verify `icon.png` (128x128 PNG) exists.
  - Check `chrome://settings/content/notifications` and system settings.
  - Ensure notifications are enabled in settings.
  - Test with **Test Notification** and check Console.
- **API Errors**:
  - Validate your Gemini API key.
  - Check Console for errors (e.g., HTTP 403).
- **Notification Click Issues**:
  - Confirm `action` in `manifest.json`.
  - Check Console for message-passing errors.
- **Words Not Saving**:
  - Ensure `chrome.storage.local` is accessible (check Console).

## Development

- **Files**:
  - `manifest.json`: Extension configuration.
  - `background.js`: API calls, notifications, context menu.
  - `popup.html`: UI structure.
  - `popup.css`: Styling.
  - `popup.js`: Popup logic.
  - `icon.png`: 128x128 PNG for icon and notifications.
  - `content.js`
  - `utils.js`
- **Dependencies**:
  - Gemini API key for phrase generation.
- **Permissions**:
  - `storage`, `contextMenus`, `notifications`.
- **Build**:
  - Load as unpacked extension for development.
- **Contributing**:
  - Fork, make changes, and submit a pull request.
  - Follow existing code structure and error handling.
- **License**:
  - MIT License (see LICENSE).

## Contact

For issues or feature requests, open an issue on GitHub.

## Acknowledgments

- Built with the Gemini API for language generation.
- Inspired by the need for effective vocabulary learning tools.
- Icon made by Freepik from @flaticon

Happy learning with Vocaby!
