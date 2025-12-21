# Testing Chatbot Locally

## Quick Start

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   pip install python-dotenv
   ```

2. **Create a `.env` file:**
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` and add your OpenAI API key:
   ```
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

3. **Update the frontend to use local server:**
   
   Edit `js/chatbot.js` and change line 6:
   ```javascript
   const API_ENDPOINT = 'http://localhost:3001/api/chat';
   ```

4. **Start the local server:**
   ```bash
   python local_server.py
   ```

5. **Open your website:**
   - Open `index.html` in your browser
   - Or use a local server like: `python -m http.server 8000`
   - Then visit: `http://localhost:8000`

6. **Test the chatbot:**
   - Click the chatbot icon
   - Send a message
   - Check the terminal running `local_server.py` for any errors

## Troubleshooting

### Port already in use
If port 3001 is busy, edit `local_server.py` and change `PORT = 3001` to a different port (e.g., `3002`).

### CORS errors
The local server includes CORS headers. If you still see CORS errors, make sure:
- You're accessing the HTML file through `http://localhost` (not `file://`)
- The API endpoint in `chatbot.js` matches the server port

### Module not found errors
Make sure you've installed all dependencies:
```bash
pip install openai scikit-learn numpy python-dotenv
```

### OpenAI API errors
- Check that your `.env` file has the correct API key
- Make sure the key starts with `sk-`
- Verify you have credits in your OpenAI account

## Switching Back to Production

When you're done testing locally, change `js/chatbot.js` back to:
```javascript
const API_ENDPOINT = '/api/chat';
```

This will use the Vercel deployment when you push to production.

