# Testing Vercel Function and Viewing Logs

## Why No Logs Show Up

**Logs only appear after the function is invoked.** If you haven't called the function yet, there won't be any logs to show.

## How to Test the Function

### Option 1: Test via Browser/Website
1. Visit your deployed website: `https://your-site.vercel.app`
2. Open the chatbot (click the chat icon)
3. Send a test message like "Hello" or "Tell me about your projects"
4. This will invoke the function and generate logs

### Option 2: Test Directly via API
You can test the endpoint directly using:

**Using curl (command line):**
```bash
curl -X POST https://your-site.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "history": []}'
```

**Using browser console:**
Open your browser's developer console (F12) on your deployed site and run:
```javascript
fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: 'Hello', history: [] })
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

**Using Postman/Insomnia:**
- URL: `https://your-site.vercel.app/api/chat`
- Method: POST
- Headers: `Content-Type: application/json`
- Body:
```json
{
  "message": "Hello",
  "history": []
}
```

## Viewing Logs After Testing

1. Go to Vercel Dashboard → Your Project
2. Click on **Functions** tab
3. Click on `/api/chat`
4. You should now see logs from your test request

## What to Look For

- **Successful requests**: Should show 200 status
- **Errors**: Will show error messages and stack traces
- **Cold starts**: First request after inactivity may be slower
- **Function execution time**: Should be visible in logs

## Common Issues

### No logs after testing
- Check that the function was actually called (check Network tab in browser)
- Verify the endpoint URL is correct
- Make sure you're looking at the right deployment

### Function errors
- Check if `OPENAI_API_KEY` is set in Vercel environment variables
- Look for import errors (scikit-learn, numpy might need time to install on first cold start)
- Check the error message in the logs

### Function not found (404)
- Verify the file is at `api/chat.py`
- Check that the handler class is named `handler`
- Ensure the file is committed to your repository

