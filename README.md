# Gemin AI Assistant 

A modern, responsive web-based AI chatbot designed to help users learn digital skills and navigate popular apps like WhatsApp, Google Maps, and digital payment platforms. Built with Flask and Google's Gemini AI.

## ✨ Features

- **🎯 Specialized AI Assistant** - Focused on digital literacy and app guidance
- **📱 Multi-Topic Support** - WhatsApp, Digital Payments, Google Maps, Video Calls
- **📁 File Upload Support** - Process images, PDFs, and text documents
- **💬 Chat History** - Persistent conversation sessions
- **🌙 Dark/Light Theme** - Toggle between themes
- **📱 Responsive Design** - Works on desktop and mobile
- **🔄 Real-time Chat** - Instant AI responses
- **🎨 Modern UI** - Animated backgrounds and smooth interactions

## 🛠️ Tech Stack

- **Backend**: Flask (Python)
- **AI Model**: Google Gemini 1.5 Flash
- **Frontend**: HTML5, CSS3, JavaScript
- **File Processing**: PIL, PyPDF2, python-docx
- **Styling**: Custom CSS with animations

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- Google Gemini API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/AdarshXKumAR/AI-ChatBot.git
   cd AI-ChatBot
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Run the application**
   ```bash
   python app.py
   ```

5. **Open your browser**
   Navigate to `http://localhost:5000`

## 📋 Requirements

Create a `requirements.txt` file with:

```txt
Flask==2.3.3
flask-cors==4.0.0
google-generativeai==0.3.2
python-dotenv==1.0.0
Pillow==10.0.1
PyPDF2==3.0.1
python-docx==0.8.11
```

## 🎯 Usage

1. **Start a Conversation**: Click on quick help topics or type your question
2. **Upload Files**: Use the paperclip icon to upload images, PDFs, or documents
3. **Get Step-by-Step Help**: Ask about WhatsApp, payments, maps, or general digital skills
4. **Switch Themes**: Use the moon/sun icon to toggle dark/light mode
5. **View Chat History**: Access previous conversations from the sidebar

## 🗂️ Project Structure

```
gemin-ai-assistant/
├── app.py                 # Main Flask application
├── templates/
│   └── index.html        # Main HTML template
├── static/
│   ├── styles.css        # Custom CSS styles
│   └── script.js         # Frontend JavaScript
├── requirements.txt      # Python dependencies
├── .env.local           # Environment variables (create this)
└── README.md            # This file
```

## 🔧 Configuration

### Environment Variables

- `GEMINI_API_KEY`: Your Google Gemini API key (required)

### Getting a Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add it to your `.env.local` file

## 🎨 Features in Detail

### AI-Powered Responses
- Context-aware conversations
- Markdown-formatted responses
- Step-by-step instructions
- Educational and encouraging tone

### File Processing
- **Images**: Visual analysis using Gemini Vision
- **PDFs**: Text extraction and analysis
- **Documents**: Word doc and text file processing

### Chat Management
- Session-based conversations
- Auto-generated chat titles
- Delete and create new chats
- Conversation history persistence

## 🌐 API Endpoints

- `GET /` - Main application
- `POST /api/chat` - Send message and get AI response
- `GET /api/sessions` - Get all chat sessions
- `GET /api/session/<id>` - Get specific session
- `DELETE /api/session/<id>` - Delete session
- `POST /api/new-session` - Create new session
- `GET /health` - Health check

## 🎯 Specialized Topics

The AI assistant specializes in:

- **📱 WhatsApp**: Messages, calls, media sharing, status updates
- **💳 Digital Payments**: UPI, mobile banking, online transactions
- **🗺️ Google Maps**: Navigation, directions, location services
- **📞 Video Calls**: Platform guidance and troubleshooting
- **💻 Digital Skills**: Internet safety, app usage, device management

## 🔒 Security Features

- Input validation and sanitization
- File type restrictions
- Error handling and fallbacks
- No sensitive data storage

## 🚀 Deployment

### Local Development
```bash
python app.py
```

### Production Deployment
- Set `debug=False` in app.py
- Use a proper database for chat storage
- Set up proper logging
- Use a production WSGI server like Gunicorn

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Google Gemini AI for powerful language understanding
- Flask community for the excellent web framework
- All contributors and users of this project

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/yourusername/gemin-ai-assistant/issues) page
2. Create a new issue with detailed information
3. Include error messages and steps to reproduce

---

**Made with ❤️ to help people learn digital skills**
