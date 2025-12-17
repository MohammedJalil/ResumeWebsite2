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
    
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
    
    def do_POST(self):
        """Handle POST requests"""
        try:
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
            
            client = OpenAI(api_key=openai_key)
            
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
            search_results = self.semantic_search(message, chunks, top_k=3, vectorizer=TfidfVectorizer, cosine_similarity=cosine_similarity, np=np)
            context = self.build_context(search_results)
            
            # System prompt
            system_prompt = """You are an AI assistant for Mohammed-Taqi Jalil's portfolio website. You help visitors learn about his experience, projects, skills, and background.

Guidelines:
- Answer questions about Mohammed-Taqi's portfolio using the provided context when available
- Be friendly, professional, and concise
- If asked about something not in the context, you can provide general information or say you don't have specific details
- For portfolio-related questions, prioritize accuracy and use the context provided
- For general questions unrelated to the portfolio, you can answer like a helpful assistant
- Always maintain a professional tone appropriate for a portfolio website

When context is provided, use it to answer questions accurately. When no relevant context is found, you can still be helpful with general knowledge."""
            
            # Build messages for OpenAI
            messages = [{"role": "system", "content": system_prompt}]
            
            # Add context if available
            if context:
                messages.append({
                    "role": "system",
                    "content": f"Relevant information about Mohammed-Taqi Jalil:\n\n{context}\n\nUse this information to answer questions accurately."
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
            
            # Call OpenAI
            try:
                response = client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=messages,
                    temperature=0.7,
                    max_tokens=500
                )
                assistant_message = response.choices[0].message.content
                
                # Send success response
                self.send_success_response({'response': assistant_message})
                
            except Exception as openai_error:
                print(f"OpenAI API error: {openai_error}")
                import traceback
                traceback.print_exc()
                self.send_error_response(500, {
                    'error': 'OpenAI API error',
                    'message': str(openai_error)
                })
        
        except Exception as e:
            print(f"Error: {str(e)}")
            import traceback
            traceback.print_exc()
            self.send_error_response(500, {
                'error': 'Internal server error',
                'message': str(e)
            })
    
    def load_knowledge_base(self):
        """Load the knowledge base from JSON file"""
        try:
            file_path = os.path.join(os.path.dirname(__file__), 'knowledge-base.json')
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading knowledge base: {e}")
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
                proj_text = f"Project: {project.get('title', '')} - {project.get('description', '')}. "
                proj_text += f"Technologies: {', '.join(project.get('technologies', []))}"
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
                if similarities[idx] > 0.1:
                    results.append(chunks[idx])
            
            return results
        except Exception as e:
            print(f"Error in semantic search: {e}")
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
