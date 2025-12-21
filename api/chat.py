"""
Chatbot API endpoint using OpenAI
Vercel serverless function for handling chat requests
"""
import json
import os
import re
from http.server import BaseHTTPRequestHandler

# Vercel serverless function handler
class handler(BaseHTTPRequestHandler):
    
    def do_GET(self):
        """Handle GET requests for diagnostics"""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        
        openai_key = os.environ.get('OPENAI_API_KEY')
        has_key = 'Yes' if openai_key else 'No'
        
        response = {
            'status': 'ok',
            'function': 'chat',
            'openai_key_configured': has_key,
            'mode': 'lightweight_search'
        }
        self.wfile.write(json.dumps(response).encode('utf-8'))
    
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
    
    def do_POST(self):
        """Handle POST requests"""
        try:
            from openai import OpenAI
            
            # Initialize OpenAI client
            openai_key = os.environ.get('OPENAI_API_KEY')
            if not openai_key:
                self.send_error_response(500, {
                    'error': 'OpenAI API key not configured',
                    'message': 'Please set OPENAI_API_KEY in Vercel environment variables'
                })
                return
            
            client = OpenAI(api_key=openai_key)
            
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            body_str = self.rfile.read(content_length).decode('utf-8') if content_length > 0 else "{}"
            body = json.loads(body_str)
            
            message = body.get('message', '')
            history = body.get('history', [])
            
            if not message:
                self.send_error_response(400, {'error': 'Message is required'})
                return
            
            # Load and chunk knowledge base
            kb = self.load_knowledge_base()
            chunks = self.chunk_knowledge_base(kb)
            
            # LIGHTWEIGHT SEARCH (No scikit-learn)
            search_results = self.simple_search(message, chunks)
            context = self.build_context(search_results)
            
            # System prompt
            system_prompt = """You are a friendly, conversational AI assistant for Mohammed-Taqi Jalil's portfolio.
            Use the provided context to answer questions about his experience, projects, and skills.
            If the answer isn't in the context, politely say you don't know."""
            
            messages = [{"role": "system", "content": system_prompt}]
            
            if context:
                messages.append({
                    "role": "system", 
                    "content": f"CONTEXT INFORMATION:\n{context}"
                })
            
            # Add conversation history
            for msg in history[-6:]: # Keep history short
                if msg.get('role') in ['user', 'assistant']:
                    messages.append({"role": msg['role'], "content": msg['content']})
            
            messages.append({"role": "user", "content": message})
            
            # OpenAI Call
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=messages,
                temperature=0.7,
                max_tokens=250
            )
            
            self.send_success_response({'response': response.choices[0].message.content})
        
        except Exception as e:
            print(f"Error: {str(e)}") # Vercel logs
            self.send_error_response(500, {'error': str(e)})

    def simple_search(self, query, chunks, top_k=4):
        """Simple keyword overlap search without heavy dependencies"""
        if not chunks: 
            return []
            
        query_words = set(re.findall(r'\w+', query.lower()))
        scores = []
        
        for chunk in chunks:
            text_lower = chunk['text'].lower()
            # Count how many query words appear in the chunk
            score = sum(1 for word in query_words if word in text_lower)
            # Bonus for exact phrase matching (optional but helpful)
            if query.lower() in text_lower:
                score += 2
            
            if score > 0:
                scores.append((score, chunk))
        
        # Sort by score descending
        scores.sort(key=lambda x: x[0], reverse=True)
        
        # Return top results
        return [item[1] for item in scores[:top_k]]

    def load_knowledge_base(self):
        try:
            # Look in current directory and parent directory
            paths = [
                os.path.join(os.path.dirname(__file__), 'knowledge-base.json'),
                'api/knowledge-base.json',
                'knowledge-base.json'
            ]
            for p in paths:
                if os.path.exists(p):
                    with open(p, 'r', encoding='utf-8') as f:
                        return json.load(f)
            return {}
        except:
            return {}

    def chunk_knowledge_base(self, kb):
        # reuse your existing logic or simplified version
        chunks = []
        # Flatten dictionary to list of text strings
        if 'about' in kb:
            chunks.append({'text': f"About: {kb['about'].get('summary', '')}", 'source': 'about'})
            chunks.append({'text': f"Skills: {json.dumps(kb['about'].get('skills', {}))}", 'source': 'skills'})
        if 'experience' in kb:
            for exp in kb['experience']:
                chunks.append({'text': f"Experience: {exp.get('role')} at {exp.get('company')}. {json.dumps(exp.get('responsibilities'))}", 'source': 'experience'})
        if 'projects' in kb:
            for proj in kb['projects']:
                chunks.append({'text': f"Project: {proj.get('title')}. {proj.get('description')} Tech: {proj.get('technologies')}", 'source': 'projects'})
        return chunks

    def build_context(self, search_results):
        return "\n\n".join([r['text'] for r in search_results])

    def send_success_response(self, data):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def send_error_response(self, code, data):
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))