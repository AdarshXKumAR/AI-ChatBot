from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import google.generativeai as genai
import os
from datetime import datetime
from dotenv import load_dotenv
import json
import re

# Optional imports for file processing
try:
    import PIL.Image
    import io
    HAS_PIL = True
except ImportError:
    HAS_PIL = False
    print("PIL not available - image processing disabled")

try:
    import PyPDF2
    HAS_PDF = True
except ImportError:
    HAS_PDF = False
    print("PyPDF2 not available - PDF processing disabled")

try:
    import docx
    HAS_DOCX = True
except ImportError:
    HAS_DOCX = False
    print("python-docx not available - Word document processing disabled")

load_dotenv('.env.local')

app = Flask(__name__)
CORS(app)

# Configure Gemini API
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))

# Initialize Gemini model
model = genai.GenerativeModel('gemini-1.5-flash')

# Store chat sessions (in production, use a proper database)
chat_sessions = {}

def get_system_prompt():
    return """You are Gemin AI Assistant, a helpful digital chatbot designed to help users learn about digital tools and technologies. 

Your responses should be:
1. **Well-formatted with markdown** - Use headers, bold text, bullet points, and numbered lists
2. **Educational and step-by-step** - Break down complex tasks into simple steps
3. **Encouraging and supportive** - Help users feel confident about learning
4. **Focused on practical skills** - Provide actionable guidance

**Your main expertise areas:**
- 📱 **WhatsApp**: Messages, calls, status updates, media sharing
- 💳 **Digital Payments**: UPI, mobile banking, online transactions
- 🗺️ **Google Maps**: Navigation, directions, location services  
- 📞 **Video Calls**: Various platforms and features
- 💻 **Basic Digital Skills**: Internet safety, app usage, device management

**Response Format Guidelines:**
- Use **bold** for important terms and headings
- Use numbered lists for step-by-step instructions
- Use bullet points for feature lists or tips
- Add relevant emojis to make content engaging
- Include safety tips and best practices when relevant

Always be patient, clear, and remember that users may be new to technology."""

def generate_chat_title(first_message):
    """Generate a descriptive title from the first user message"""
    # Clean the message
    clean_message = first_message.strip()
    
    # Remove common question words and make it more title-like
    title_words = re.sub(r'^(how|what|when|where|why|can|could|would|should|do|does|did|is|are|was|were)\s+', '', clean_message.lower())
    
    # Capitalize first letter of each word
    title = ' '.join(word.capitalize() for word in title_words.split())
    
    # Limit length
    if len(title) > 50:
        title = title[:47] + '...'
    
    # Fallback titles based on content
    if not title or len(title) < 5:
        if 'whatsapp' in clean_message.lower():
            title = 'WhatsApp Help'
        elif any(word in clean_message.lower() for word in ['payment', 'upi', 'paytm', 'money']):
            title = 'Digital Payment Help'
        elif any(word in clean_message.lower() for word in ['maps', 'navigation', 'direction']):
            title = 'Google Maps Help'
        elif any(word in clean_message.lower() for word in ['video', 'call', 'zoom']):
            title = 'Video Call Help'
        else:
            title = 'Digital Skills Help'
    
    return title

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        # Handle both JSON and form data for file uploads
        if request.content_type and 'multipart/form-data' in request.content_type:
            user_message = request.form.get('message', '')
            session_id = request.form.get('session_id', 'default')
            uploaded_file = request.files.get('file')
        else:
            data = request.json
            user_message = data.get('message', '')
            session_id = data.get('session_id', 'default')
            uploaded_file = None
        
        if not user_message:
            return jsonify({'error': 'Message is required'}), 400
        
        # Initialize session if it doesn't exist
        if session_id not in chat_sessions:
            chat_sessions[session_id] = {
                'messages': [],
                'created_at': datetime.now().isoformat(),
                'title': 'New Chat'
            }
        
        # Generate title from first message if it's still "New Chat"
        if chat_sessions[session_id]['title'] == 'New Chat' and not chat_sessions[session_id]['messages']:
            chat_sessions[session_id]['title'] = generate_chat_title(user_message)
        
        # Add user message to session
        user_msg = {
            'role': 'user',
            'content': user_message,
            'timestamp': datetime.now().isoformat()
        }
        chat_sessions[session_id]['messages'].append(user_msg)
        
        # Handle file upload if present
        file_content = None
        file_info = ""
        
        if uploaded_file:
            try:
                # Read file content based on file type
                if uploaded_file.content_type.startswith('image/') and HAS_PIL:
                    # For images, we'll use Gemini's vision capabilities
                    image_data = uploaded_file.read()
                    image = PIL.Image.open(io.BytesIO(image_data))
                    file_content = image
                    file_info = f"\n\n[User has uploaded an image: {uploaded_file.filename}]"
                    
                elif uploaded_file.content_type == 'application/pdf' and HAS_PDF:
                    # For PDF files, extract text
                    try:
                        pdf_data = uploaded_file.read()
                        pdf_reader = PyPDF2.PdfReader(io.BytesIO(pdf_data))
                        text_content = ""
                        for page in pdf_reader.pages:
                            text_content += page.extract_text() + "\n"
                        
                        file_info = f"\n\n[User has uploaded a PDF file: {uploaded_file.filename}]\nContent: {text_content[:2000]}{'...' if len(text_content) > 2000 else ''}"
                    except Exception as pdf_err:
                        print(f"PDF processing error: {pdf_err}")
                        file_info = f"\n\n[User has uploaded a PDF file: {uploaded_file.filename}, but I couldn't read its content]"
                        
                elif uploaded_file.content_type.startswith('text/') or uploaded_file.filename.endswith(('.txt', '.doc', '.docx')):
                    # For text files
                    try:
                        if uploaded_file.filename.endswith(('.doc', '.docx')) and HAS_DOCX:
                            # Handle Word documents
                            try:
                                doc = docx.Document(uploaded_file)
                                text_content = "\n".join([paragraph.text for paragraph in doc.paragraphs])
                            except:
                                text_content = "Could not read Word document content"
                        else:
                            # Handle plain text files
                            text_content = uploaded_file.read().decode('utf-8')
                        
                        file_info = f"\n\n[User has uploaded a text file: {uploaded_file.filename}]\nContent: {text_content[:2000]}{'...' if len(text_content) > 2000 else ''}"
                    except Exception as text_err:
                        print(f"Text file processing error: {text_err}")
                        file_info = f"\n\n[User has uploaded a file: {uploaded_file.filename}, but I couldn't read its content]"
                        
                else:
                    file_info = f"\n\n[User has uploaded a file: {uploaded_file.filename} ({uploaded_file.content_type}), but I cannot process this file type directly. I can still help answer questions about it.]"
                    
            except Exception as file_err:
                print(f"File processing error: {file_err}")
                file_info = f"\n\n[User attempted to upload a file, but there was an error processing it.]"
        
        # Prepare conversation history for Gemini
        conversation_history = []
        system_prompt = get_system_prompt()
        
        # Add system prompt as the first message
        conversation_history.append(f"System: {system_prompt}")
        
        # Add recent messages (last 10) for context
        recent_messages = chat_sessions[session_id]['messages'][-10:]
        for msg in recent_messages:
            if msg['role'] == 'user':
                conversation_history.append(f"User: {msg['content']}")
            elif msg['role'] == 'assistant':
                conversation_history.append(f"Assistant: {msg['content']}")
        
        # Add current message with file info
        current_user_message = user_message + file_info
        conversation_history.append(f"User: {current_user_message}")
        
        # Combine all messages into a single prompt
        full_prompt = "\n\n".join(conversation_history[:-1])  # Exclude the current message
        
        # Call Gemini API with better error handling
        try:
            if file_content and isinstance(file_content, PIL.Image.Image):
                # Use Gemini Vision for images
                vision_model = genai.GenerativeModel('gemini-1.5-flash')
                response = vision_model.generate_content([full_prompt, current_user_message, file_content])
            else:
                # Use regular Gemini for text
                response = model.generate_content(
                    full_prompt + "\n\nUser: " + current_user_message,
                    generation_config=genai.types.GenerationConfig(
                        max_output_tokens=1000,
                        temperature=0.7,
                        top_p=0.8,
                        top_k=40
                    )
                )
            
            bot_response = response.text
            
        except Exception as gemini_err:
            print(f"Gemini API Error: {gemini_err}")
            # Check for specific error types
            if "QUOTA_EXCEEDED" in str(gemini_err):
                bot_response = "I'm currently experiencing high demand. Please try again in a moment."
            elif "API_KEY" in str(gemini_err):
                bot_response = "There's an issue with my configuration. Please contact support."
            elif "SAFETY" in str(gemini_err):
                bot_response = "I can't provide a response to that request. Please try rephrasing your question."
            else:
                bot_response = generate_fallback_response(user_message)
        
        # Add bot response to session
        bot_msg = {
            'role': 'assistant',
            'content': bot_response,
            'timestamp': datetime.now().isoformat()
        }
        chat_sessions[session_id]['messages'].append(bot_msg)
        
        return jsonify({
            'response': bot_response,
            'session_id': session_id,
            'success': True
        })
        
    except Exception as e:
        print(f"Server error: {e}")
        return jsonify({
            'error': f'Server error: {str(e)}',
            'success': False
        }), 500

def generate_fallback_response(user_message):
    """Generate a fallback response when Gemini API is unavailable"""
    message = user_message.lower()
    
    if any(word in message for word in ['whatsapp', 'photo', 'send', 'message']):
        return """## 📱 **WhatsApp Help**

**To send photos on WhatsApp:**

1. **Open WhatsApp** and go to your chat
2. **Tap the attachment icon** (📎) next to the text box
3. **Choose "Camera"** for new photos or **"Gallery"** for existing ones
4. **Select your photo** and add a caption if needed
5. **Tap send** (✈️) to share

**💡 Tips:**
- Send multiple photos by selecting them in gallery
- Use crop tools to adjust photos
- Add stickers or drawings before sending"""
    
    elif any(word in message for word in ['payment', 'upi', 'paytm', 'money', 'transfer']):
        return """## 💳 **Digital Payment Help**

**UPI Payment Steps:**

1. **Open your UPI app** (Google Pay, PhonePe, Paytm, etc.)
2. **Choose "Send Money"** or "Pay" option
3. **Enter recipient's UPI ID** or scan QR code
4. **Enter the amount** you want to send
5. **Add a note** (optional)
6. **Enter your UPI PIN** to confirm
7. **Transaction complete!** You'll get a confirmation

**🔒 Safety Tips:**
- Never share your UPI PIN with anyone
- Double-check recipient details before sending
- Keep your app updated"""
    
    elif any(word in message for word in ['maps', 'navigation', 'direction', 'location']):
        return """## 🗺️ **Google Maps Help**

**Getting Directions:**

1. **Open Google Maps** app
2. **Tap the search bar** at the top
3. **Type your destination** or tap on the map
4. **Tap "Directions"** (blue arrow button)
5. **Choose your travel mode** (car, walking, public transport)
6. **Tap "Start"** to begin navigation
7. **Follow voice instructions** and on-screen directions

**📍 Features:**
- Real-time traffic updates
- Alternative route suggestions
- Save favorite locations
- Share your location with others"""
    
    else:
        return """##  **I'm here to help you learn!**

**I can assist you with:**

- 📱 **WhatsApp** - Messages, calls, status updates
- 💳 **Digital Payments** - UPI, mobile banking, transactions  
- 🗺️ **Google Maps** - Navigation and directions
- 📞 **Video Calls** - Various platforms and features
- 💻 **Basic Digital Skills** - Internet safety and app usage

**What would you like to learn about today?**

Please try asking about any of these topics, and I'll provide step-by-step guidance!"""

@app.route('/api/sessions', methods=['GET'])
def get_sessions():
    """Get all chat sessions for sidebar history"""
    try:
        sessions_list = []
        for session_id, session_data in chat_sessions.items():
            sessions_list.append({
                'id': session_id,
                'title': session_data.get('title', 'New Chat'),
                'created_at': session_data.get('created_at'),
                'message_count': len(session_data.get('messages', []))
            })
        
        # Sort by creation time, newest first
        sessions_list.sort(key=lambda x: x['created_at'], reverse=True)
        
        return jsonify({
            'sessions': sessions_list,
            'success': True
        })
    except Exception as e:
        return jsonify({
            'error': f'Error fetching sessions: {str(e)}',
            'success': False
        }), 500

@app.route('/api/session/<session_id>', methods=['GET'])
def get_session(session_id):
    """Get specific session messages"""
    try:
        if session_id not in chat_sessions:
            return jsonify({'error': 'Session not found'}), 404
        
        return jsonify({
            'session': chat_sessions[session_id],
            'success': True
        })
    except Exception as e:
        return jsonify({
            'error': f'Error fetching session: {str(e)}',
            'success': False
        }), 500

@app.route('/api/session/<session_id>', methods=['DELETE'])
def delete_session(session_id):
    """Delete a chat session"""
    try:
        if session_id in chat_sessions:
            del chat_sessions[session_id]
        
        return jsonify({
            'message': 'Session deleted successfully',
            'success': True
        })
    except Exception as e:
        return jsonify({
            'error': f'Error deleting session: {str(e)}',
            'success': False
        }), 500

@app.route('/api/new-session', methods=['POST'])
def new_session():
    """Create a new chat session"""
    try:
        session_id = f"session_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"
        
        chat_sessions[session_id] = {
            'messages': [],
            'created_at': datetime.now().isoformat(),
            'title': 'New Chat'
        }
        
        return jsonify({
            'session_id': session_id,
            'success': True
        })
    except Exception as e:
        return jsonify({
            'error': f'Error creating session: {str(e)}',
            'success': False
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})

@app.route('/test-gemini', methods=['GET'])
def test_gemini():
    """Test endpoint to verify Gemini API connectivity"""
    try:
        response = model.generate_content("Hello, respond with just 'API working!'")
        return jsonify({"status": "success", "response": response.text})
    except Exception as e:
        return jsonify({"status": "error", "error": str(e)})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)