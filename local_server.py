"""
Local development server for testing the chatbot API
Run this script to test the chatbot locally before deploying to Vercel

Usage:
    python local_server.py
"""
import http.server
import socketserver
import json
import os
import sys
from http.server import BaseHTTPRequestHandler

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
    print("✓ Loaded .env file")
except ImportError:
    print("⚠ Warning: python-dotenv not installed. Install it with: pip install python-dotenv")
    print("   Or set OPENAI_API_KEY as an environment variable manually.")

PORT = 3001

class ChatHandler(http.server.BaseHTTPRequestHandler):
    """HTTP handler that wraps the Vercel chat function"""
    
    def do_GET(self):
        """Handle GET requests - return API info"""
        if self.path == '/api/chat' or self.path == '/api/chat/':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                'message': 'Chatbot API is running',
                'endpoint': '/api/chat',
                'methods': ['POST', 'OPTIONS', 'GET']
            }).encode('utf-8'))
        elif self.path == '/' or self.path == '':
            # Root path - show helpful message
            self.send_response(200)
            self.send_header('Content-Type', 'text/html')
            self.end_headers()
            html = """
            <!DOCTYPE html>
            <html>
            <head>
                <title>Chatbot API Server</title>
                <style>
                    body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
                    .status { background: #e8f5e9; padding: 15px; border-radius: 5px; margin: 20px 0; }
                    .endpoint { background: #f5f5f5; padding: 10px; border-radius: 5px; font-family: monospace; }
                </style>
            </head>
            <body>
                <h1>🤖 Chatbot API Server</h1>
                <div class="status">
                    <strong>✓ Server is running</strong>
                </div>
                <h2>API Endpoint</h2>
                <div class="endpoint">POST http://localhost:3001/api/chat</div>
                <p>This is a local development server for testing the chatbot API.</p>
                <p>To test the chatbot, open your website and use the chatbot interface.</p>
            </body>
            </html>
            """
            self.wfile.write(html.encode('utf-8'))
        else:
            self.send_error(404, "Not Found")
    
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS, GET')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
    
    def do_POST(self):
        """Handle POST requests to /api/chat"""
        if self.path != '/api/chat' and self.path != '/api/chat/':
            self.send_error(404, "Not Found")
            return
        
        try:
            # Import the Vercel handler class
            sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'api'))
            from chat import handler as ChatHandlerClass
            
            # Create a simple wrapper that mimics BaseHTTPRequestHandler
            # We'll directly use the handler's methods by creating a minimal instance
            class SimpleHandler(ChatHandlerClass):
                def __init__(self, real_handler):
                    # Don't call parent __init__ - just copy what we need
                    self.rfile = real_handler.rfile
                    self.wfile = real_handler.wfile
                    self.headers = real_handler.headers
                    self.command = real_handler.command
                    self.path = real_handler.path
                    self.request_version = real_handler.request_version
                    self.close_connection = real_handler.close_connection
                    self.requestline = real_handler.requestline
                    self.client_address = real_handler.client_address
                    self.server = real_handler.server
                    self.request = real_handler.request
            
            # Create wrapper instance
            wrapper = SimpleHandler(self)
            
            # Call the POST handler
            wrapper.do_POST()
            
        except Exception as e:
            print(f"❌ Error handling request: {e}")
            import traceback
            traceback.print_exc()
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                'error': 'Internal Server Error',
                'message': str(e)
            }).encode('utf-8'))
    
    def log_message(self, format, *args):
        """Override to prevent default logging"""
        pass

def main():
    """Start the local development server"""
    print(f"\n{'='*60}")
    print("Chatbot Local Development Server")
    print(f"{'='*60}")
    print(f"\nStarting server on http://localhost:{PORT}")
    print(f"API endpoint: http://localhost:{PORT}/api/chat")
    print(f"\nMake sure to:")
    print(f"  1. Create a .env file with your OPENAI_API_KEY")
    print(f"  2. Update js/chatbot.js to use: const API_ENDPOINT = 'http://localhost:{PORT}/api/chat';")
    print(f"\nPress Ctrl+C to stop the server\n")
    print(f"{'='*60}\n")
    
    try:
        with socketserver.TCPServer(("", PORT), ChatHandler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\nServer stopped.")
    except OSError as e:
        if e.errno == 98 or "Address already in use" in str(e):
            print(f"\nError: Port {PORT} is already in use.")
            print(f"Either stop the other process or change PORT in local_server.py")
        else:
            raise

if __name__ == '__main__':
    main()

