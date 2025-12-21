# Vercel Deployment Checklist

## Before Deploying

1. **Environment Variables**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add: `OPENAI_API_KEY` with your OpenAI API key value
   - Make sure it's set for Production, Preview, and Development

2. **Verify Files**
   - ✅ `api/chat.py` - Main handler
   - ✅ `api/knowledge-base.json` - Knowledge base data
   - ✅ `requirements.txt` - Python dependencies
   - ✅ `vercel.json` - Vercel config (empty is fine, auto-detects)

3. **Deploy**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```
   Vercel will auto-deploy on push.

## Testing After Deployment

1. Visit your deployed site
2. Open the chatbot
3. Test with: "Tell me about your projects"
4. Check Vercel Function Logs if there are errors:
   - Vercel Dashboard → Your Project → Functions → `/api/chat` → View Logs

## Common Issues

### 404 Error
- Check that `api/chat.py` exists
- Verify the file is named exactly `chat.py` (not `chat.py.txt`)

### 500 Error - OpenAI API Key
- Verify `OPENAI_API_KEY` is set in Vercel environment variables
- Make sure it's set for the correct environment (Production)

### 500 Error - Module Not Found
- Check `requirements.txt` has all dependencies
- Vercel should auto-install, but verify in build logs

### Knowledge Base Not Loading
- Verify `api/knowledge-base.json` exists
- Check file permissions
- The code tries multiple paths, should work automatically

## Debugging

If the chatbot doesn't work:
1. Check browser console (F12) for errors
2. Check Vercel Function Logs
3. Test the endpoint directly: `https://your-site.vercel.app/api/chat`
4. Verify environment variables are set correctly

