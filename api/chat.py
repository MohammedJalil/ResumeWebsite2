"""
Chatbot API endpoint using OpenAI
Vercel serverless function for handling chat requests
"""
import json
import os
from http.server import BaseHTTPRequestHandler

# Vercel serverless function handler - must be a class
class handler(BaseHTTPRequestHandler):
    """Main handler class for Vercel"""
    
    def do_GET(self):
        """Handle GET requests for diagnostics"""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        import os
        has_key = 'Yes' if os.environ.get('OPENAI_API_KEY') else 'No'
        response = {
            'status': 'ok',
            'function': 'chat',
            'openai_key_configured': has_key,
            'methods': ['GET', 'POST', 'OPTIONS']
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
            # Suppress joblib multiprocessing warning (harmless in serverless)
            import warnings
            warnings.filterwarnings('ignore', category=UserWarning, module='joblib')
            
            # Import here to avoid issues during module load
            from openai import OpenAI
            from sklearn.feature_extraction.text import TfidfVectorizer
            from sklearn.metrics.pairwise import cosine_similarity
            import numpy as np
            
            # Initialize OpenAI client
            openai_key = os.environ.get('OPENAI_API_KEY')
            if not openai_key:
                self.send_error_response(500, {
                    'error': 'OpenAI API key not configured',
                    'message': 'Please set OPENAI_API_KEY in Vercel environment variables'
                })
                return
            
            # Initialize OpenAI client with timeout
            client = OpenAI(
                api_key=openai_key,
                timeout=30.0,  # 30 second timeout
                max_retries=2  # Retry up to 2 times on connection errors
            )
            
            # Read request body
            content_length = int(self.headers.get('Content-Length', 0))
            if content_length > 0:
                body_str = self.rfile.read(content_length).decode('utf-8')
                body = json.loads(body_str) if body_str else {}
            else:
                body = {}
            
            message = body.get('message', '')
            history = body.get('history', [])
            
            if not message:
                self.send_error_response(400, {'error': 'Message is required'})
                return
            
            # Load knowledge base
            kb = self.load_knowledge_base()
            chunks = self.chunk_knowledge_base(kb)
            
            # Perform semantic search
            try:
                search_results = self.semantic_search(message, chunks, top_k=5, vectorizer=TfidfVectorizer, cosine_similarity=cosine_similarity, np=np)
                context = self.build_context(search_results)
            except Exception:
                # Fallback: use empty context if search fails
                context = ""
                search_results = []
            
            # System prompt
            system_prompt = """You are an AI assistant for Mohammed-Taqi Jalil's portfolio website. You help visitors learn about his experience, projects, skills, and background.

CRITICAL RULES:
- ONLY use information provided in the context below. Do NOT make up or invent information.
- If the context contains information about Mohammed-Taqi's projects, experience, or skills, you MUST use that exact information.
- If asked about something not in the context, say "I don't have specific information about that in Mohammed-Taqi's portfolio. Would you like to know about his projects, experience, or skills instead?"
- NEVER invent projects, companies, or experiences that aren't in the provided context.
- Be friendly, professional, and concise.
- Always maintain a professional tone appropriate for a portfolio website."""
            
            # Build messages for OpenAI
            messages = [{"role": "system", "content": system_prompt}]
            
            # Add context if available
            if context:
                messages.append({
                    "role": "system",
                    "content": f"IMPORTANT: The following is the ONLY information available about Mohammed-Taqi Jalil. You MUST use ONLY this information when answering questions about him:\n\n{context}\n\nIf asked about something not mentioned above, you must say you don't have that information rather than making something up."
                })
            else:
                # If no context found, add a reminder to be honest
                messages.append({
                    "role": "system",
                    "content": "You do not have specific information about this topic in Mohammed-Taqi's portfolio. Please say you don't have that information rather than inventing details."
                })
            
            # Add conversation history (last 10 messages)
            for msg in history[-10:]:
                if msg.get('role') in ['user', 'assistant']:
                    messages.append({
                        "role": msg['role'],
                        "content": msg.get('content', '')
                    })
            
            # Add current message
            messages.append({"role": "user", "content": message})
            
            # Call OpenAI with retry logic
            max_retries = 2
            retry_count = 0
            last_error = None
            
            while retry_count <= max_retries:
                try:
                    response = client.chat.completions.create(
                        model="gpt-3.5-turbo",
                        messages=messages,
                        temperature=0.7,
                        max_tokens=400  # Reduced to speed up response
                    )
                    assistant_message = response.choices[0].message.content
                    
                    # Send success response
                    self.send_success_response({'response': assistant_message})
                    return  # Success, exit the retry loop
                    
                except Exception as openai_error:
                    last_error = openai_error
                    error_str = str(openai_error).lower()
                    
                    # Check if it's a connection/timeout error that we should retry
                    is_retryable = any(keyword in error_str for keyword in [
                        'connection', 'timeout', 'network', 'temporary', 
                        'rate limit', '503', '502', '504'
                    ])
                    
                    if is_retryable and retry_count < max_retries:
                        retry_count += 1
                        # Wait a bit before retrying (exponential backoff)
                        import time
                        time.sleep(min(1 * retry_count, 3))  # 1s, 2s, max 3s
                        continue
                    else:
                        # Not retryable or max retries reached
                        error_msg = str(openai_error)
                        if 'connection' in error_str:
                            error_msg = 'Connection error. Please try again in a moment.'
                        elif 'timeout' in error_str:
                            error_msg = 'Request timed out. Please try again.'
                        elif 'rate limit' in error_str:
                            error_msg = 'Rate limit exceeded. Please try again in a moment.'
                        
                        self.send_error_response(500, {
                            'error': 'OpenAI API error',
                            'message': error_msg
                        })
                        return
        
        except Exception as e:
            self.send_error_response(500, {
                'error': 'Internal server error',
                'message': str(e)
            })
    
    def load_knowledge_base(self):
        """Load the knowledge base from JSON file"""
        try:
            # Try multiple paths for Vercel compatibility
            base_dir = os.path.dirname(__file__)
            possible_paths = [
                os.path.join(base_dir, 'knowledge-base.json'),
                os.path.join(os.path.dirname(base_dir), 'api', 'knowledge-base.json'),
                'knowledge-base.json'
            ]
            
            for file_path in possible_paths:
                if os.path.exists(file_path):
                    with open(file_path, 'r', encoding='utf-8') as f:
                        return json.load(f)
            
            # If file not found, return empty dict
            return {}
        except Exception:
            return {}
    
    def chunk_knowledge_base(self, kb):
        """Convert knowledge base into searchable chunks"""
        chunks = []
        
        if 'about' in kb:
            about = kb['about']
            chunks.append({
                'text': f"About {about.get('name', 'Mohammed-Taqi Jalil')}: {about.get('summary', '')}",
                'source': 'about'
            })
            if 'skills' in about:
                skills = about['skills']
                skill_text = f"Skills: Programming - {', '.join(skills.get('programming', []))}. "
                skill_text += f"Libraries - {', '.join(skills.get('libraries', []))}. "
                skill_text += f"Databases - {', '.join(skills.get('databases', []))}. "
                skill_text += f"Visualization - {', '.join(skills.get('visualization', []))}."
                chunks.append({
                    'text': skill_text,
                    'source': 'about'
                })
        
        if 'experience' in kb:
            for exp in kb['experience']:
                exp_text = f"{exp.get('role', '')} at {exp.get('company', '')} ({exp.get('period', '')}): "
                exp_text += ' '.join(exp.get('responsibilities', []))
                chunks.append({
                    'text': exp_text,
                    'source': 'experience'
                })
        
        if 'education' in kb:
            edu = kb['education']
            edu_text = f"Education: {edu.get('degree', '')} from {edu.get('institution', '')} ({edu.get('graduation', '')}). "
            edu_text += f"Coursework: {', '.join(edu.get('coursework', []))}"
            chunks.append({
                'text': edu_text,
                'source': 'education'
            })
        
        if 'projects' in kb:
            for project in kb['projects']:
                proj_text = f"Project: {project.get('title', '')} ({project.get('category', '')}). "
                proj_text += f"Description: {project.get('description', '')}. "
                if project.get('problem'):
                    proj_text += f"Problem: {project.get('problem', '')}. "
                if project.get('outcome'):
                    proj_text += f"Outcome: {project.get('outcome', '')}. "
                proj_text += f"Technologies used: {', '.join(project.get('technologies', []))}"
                if project.get('github'):
                    proj_text += f" GitHub: {project.get('github', '')}"
                chunks.append({
                    'text': proj_text,
                    'source': 'projects'
                })
        
        return chunks
    
    def semantic_search(self, query, chunks, top_k=3, vectorizer=None, cosine_similarity=None, np=None):
        """Perform semantic search on knowledge base chunks"""
        if not chunks:
            return []
        
        try:
            if vectorizer is None:
                from sklearn.feature_extraction.text import TfidfVectorizer
                vectorizer = TfidfVectorizer
            if cosine_similarity is None:
                from sklearn.metrics.pairwise import cosine_similarity
            if np is None:
                import numpy as np
            
            texts = [chunk['text'] for chunk in chunks]
            texts.append(query)
            
            vec = vectorizer(max_features=100, stop_words='english')
            tfidf_matrix = vec.fit_transform(texts)
            
            query_vector = tfidf_matrix[-1]
            similarities = cosine_similarity(query_vector, tfidf_matrix[:-1])[0]
            
            top_indices = np.argsort(similarities)[-top_k:][::-1]
            
            results = []
            for idx in top_indices:
                # Lower threshold to include more relevant results, especially for project queries
                if similarities[idx] > 0.05:
                    results.append(chunks[idx])
            
            # If no results found, return top chunks anyway (especially for "projects" queries)
            if not results and chunks:
                # For queries about projects, include all project chunks
                query_lower = query.lower()
                if 'project' in query_lower or 'work' in query_lower or 'build' in query_lower:
                    project_chunks = [c for c in chunks if c.get('source') == 'projects']
                    if project_chunks:
                        return project_chunks[:top_k]
                return chunks[:top_k]
            
            return results
        except Exception:
            return chunks[:top_k] if chunks else []
    
    def build_context(self, search_results):
        """Build context string from search results"""
        if not search_results:
            return ""
        
        context_parts = []
        for result in search_results:
            context_parts.append(result['text'])
        
        return "\n\n".join(context_parts)
    
    def send_success_response(self, data):
        """Send a successful JSON response"""
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))
    
    def send_error_response(self, status_code, error_data):
        """Send an error JSON response"""
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(error_data).encode('utf-8'))
    
    def log_message(self, format, *args):
        """Override to prevent default logging"""
        pass
