"""
Chatbot API endpoint using OpenAI
Vercel serverless function for handling chat requests
"""
import json
import os
from typing import List, Dict, Any
from openai import OpenAI
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# Initialize OpenAI client
client = OpenAI(api_key=os.environ.get('OPENAI_API_KEY'))

# Load knowledge base
def load_knowledge_base():
    """Load the knowledge base from JSON file"""
    try:
        # In Vercel, files are relative to the function directory
        file_path = os.path.join(os.path.dirname(__file__), 'knowledge-base.json')
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading knowledge base: {e}")
        return {}

# Chunk knowledge base for semantic search
def chunk_knowledge_base(kb: Dict[str, Any]) -> List[Dict[str, str]]:
    """Convert knowledge base into searchable chunks"""
    chunks = []
    
    # About section
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
    
    # Experience
    if 'experience' in kb:
        for exp in kb['experience']:
            exp_text = f"{exp.get('role', '')} at {exp.get('company', '')} ({exp.get('period', '')}): "
            exp_text += ' '.join(exp.get('responsibilities', []))
            chunks.append({
                'text': exp_text,
                'source': 'experience'
            })
    
    # Education
    if 'education' in kb:
        edu = kb['education']
        edu_text = f"Education: {edu.get('degree', '')} from {edu.get('institution', '')} ({edu.get('graduation', '')}). "
        edu_text += f"Coursework: {', '.join(edu.get('coursework', []))}"
        chunks.append({
            'text': edu_text,
            'source': 'education'
        })
    
    # Projects
    if 'projects' in kb:
        for project in kb['projects']:
            proj_text = f"Project: {project.get('title', '')} - {project.get('description', '')}. "
            proj_text += f"Technologies: {', '.join(project.get('technologies', []))}"
            chunks.append({
                'text': proj_text,
                'source': 'projects'
            })
    
    return chunks

# Simple semantic search using TF-IDF
def semantic_search(query: str, chunks: List[Dict[str, str]], top_k: int = 3) -> List[Dict[str, str]]:
    """Perform semantic search on knowledge base chunks"""
    if not chunks:
        return []
    
    try:
        # Extract texts
        texts = [chunk['text'] for chunk in chunks]
        texts.append(query)
        
        # Use TF-IDF for similarity
        vectorizer = TfidfVectorizer(max_features=100, stop_words='english')
        tfidf_matrix = vectorizer.fit_transform(texts)
        
        # Calculate cosine similarity
        query_vector = tfidf_matrix[-1]
        similarities = cosine_similarity(query_vector, tfidf_matrix[:-1])[0]
        
        # Get top k results
        top_indices = np.argsort(similarities)[-top_k:][::-1]
        
        results = []
        for idx in top_indices:
            if similarities[idx] > 0.1:  # Threshold for relevance
                results.append(chunks[idx])
        
        return results
    except Exception as e:
        print(f"Error in semantic search: {e}")
        # Fallback: return first few chunks
        return chunks[:top_k] if chunks else []

# Build context from search results
def build_context(search_results: List[Dict[str, str]]) -> str:
    """Build context string from search results"""
    if not search_results:
        return ""
    
    context_parts = []
    for result in search_results:
        context_parts.append(result['text'])
    
    return "\n\n".join(context_parts)

# System prompt
SYSTEM_PROMPT = """You are an AI assistant for Mohammed-Taqi Jalil's portfolio website. You help visitors learn about his experience, projects, skills, and background.

Guidelines:
- Answer questions about Mohammed-Taqi's portfolio using the provided context when available
- Be friendly, professional, and concise
- If asked about something not in the context, you can provide general information or say you don't have specific details
- For portfolio-related questions, prioritize accuracy and use the context provided
- For general questions unrelated to the portfolio, you can answer like a helpful assistant
- Always maintain a professional tone appropriate for a portfolio website

When context is provided, use it to answer questions accurately. When no relevant context is found, you can still be helpful with general knowledge."""

# Vercel serverless function handler
def handler(req):
    """Main handler function for Vercel"""
    try:
        # Handle CORS preflight
        if req.method == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                },
                'body': ''
            }
        
        # Parse request
        if req.method != 'POST':
            return {
                'statusCode': 405,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Method not allowed'})
            }
        
        # Parse body
        if isinstance(req.body, str):
            body = json.loads(req.body)
        else:
            body = req.body or {}
        
        message = body.get('message', '')
        history = body.get('history', [])
        
        if not message:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Message is required'})
            }
        
        # Load knowledge base
        kb = load_knowledge_base()
        chunks = chunk_knowledge_base(kb)
        
        # Perform semantic search
        search_results = semantic_search(message, chunks, top_k=3)
        context = build_context(search_results)
        
        # Build messages for OpenAI
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        
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
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages,
            temperature=0.7,
            max_tokens=500
        )
        
        assistant_message = response.choices[0].message.content
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'response': assistant_message
            })
        }
    
    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e)
            })
        }
