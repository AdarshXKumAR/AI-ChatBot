// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

// Global variables
let currentSessionId = null;
let chatHistory = [];
let isTyping = false;
let isSidebarOpen = window.innerWidth > 768; // Desktop starts open, mobile starts closed

// Initialize app
document.addEventListener('DOMContentLoaded', function () {
    initializeApp();
});

function initializeApp() {
    loadChatHistory();
    createNewChat();

    // Set initial sidebar state
    updateSidebarState();

    // Window resize handler
    window.addEventListener('resize', function () {
        updateSidebarState();
    });

    // Set initial menu toggle state
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.classList.toggle('active', isSidebarOpen);
    }
}

function updateSidebarState() {
    const sidebar = document.getElementById('sidebar');
    const chatArea = document.querySelector('.chat-area');

    if (window.innerWidth <= 768) {
        // Mobile view
        sidebar.classList.toggle('open', isSidebarOpen);
    } else {
        // Desktop view
        sidebar.classList.toggle('hidden', !isSidebarOpen);
    }

    // Update menu toggle icon
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.classList.toggle('active', isSidebarOpen);
    }

}

// Theme Management
function toggleTheme() {
    const body = document.body;
    const themeIcon = document.getElementById('theme-icon');

    if (body.getAttribute('data-theme') === 'dark') {
        body.setAttribute('data-theme', 'light');
        themeIcon.className = 'fas fa-sun';
        localStorage.setItem('theme', 'light');
    } else {
        body.setAttribute('data-theme', 'dark');
        themeIcon.className = 'fas fa-moon';
        localStorage.setItem('theme', 'dark');
    }
}

// Load saved theme
function loadTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const body = document.body;
    const themeIcon = document.getElementById('theme-icon');

    body.setAttribute('data-theme', savedTheme);
    themeIcon.className = savedTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
}

function toggleSidebar() {
    isSidebarOpen = !isSidebarOpen;
    updateSidebarState();

    // Update menu toggle animation
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.classList.toggle('active', isSidebarOpen);
    }
}

// Update textarea height function to handle file attachments
function adjustTextareaHeight(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';

    // Enable/disable send button based on message content or file attachment
    const sendBtn = document.getElementById('sendBtn');
    sendBtn.disabled = !textarea.value.trim() && !selectedFile;
}

// Handle keyboard shortcuts
function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// Send message function with file upload support
async function sendMessage(message = null) {
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');

    const userMessage = message || messageInput.value.trim();

    if (!userMessage || isTyping) return;

    // Clear input and disable send button
    messageInput.value = '';
    messageInput.style.height = 'auto';
    sendBtn.disabled = true;

    isTyping = true;

    // Hide welcome screen
    const welcomeScreen = document.getElementById('welcomeScreen');
    if (welcomeScreen) {
        welcomeScreen.style.display = 'none';
    }

    // Add user message to chat
    addMessageToChat('user', userMessage, selectedFile);

    // Show typing indicator
    showTypingIndicator();

    try {
        let response;

        if (selectedFile) {
            // Send with file using FormData
            const formData = new FormData();
            formData.append('message', userMessage);
            formData.append('session_id', currentSessionId);
            formData.append('file', selectedFile);

            response = await fetch(`${API_BASE_URL}/chat`, {
                method: 'POST',
                body: formData
            });
        } else {
            // Send without file using JSON
            response = await fetch(`${API_BASE_URL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: userMessage,
                    session_id: currentSessionId
                })
            });
        }

        const data = await response.json();

        // Remove typing indicator
        removeTypingIndicator();

        if (data.success) {
            addMessageToChat('bot', data.response);
            currentSessionId = data.session_id;
            loadChatHistory(); // Refresh sidebar
        } else {
            addMessageToChat('bot', 'Sorry, I encountered an error. Please try again.');
        }

    } catch (error) {
        console.error('Error sending message:', error);
        removeTypingIndicator();
        addMessageToChat('bot', 'Sorry, I\'m having trouble connecting. Please check your internet connection and try again.');
    } finally {
        // Clear file attachment after sending
        if (selectedFile) {
            removeFile();
        }
        isTyping = false;
    }
}

// Updated addMessageToChat function to handle file attachments
function addMessageToChat(sender, message, file = null) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-meteor"></i>';

    const content = document.createElement('div');
    content.className = 'message-content';

    // Add file attachment indicator for user messages
    if (sender === 'user' && file) {
        const fileIndicator = document.createElement('div');
        fileIndicator.className = 'file-attachment';
        fileIndicator.innerHTML = `
    <div class="attachment-icon">
        <i class="fas fa-${getFileIcon(file.type)}"></i>
    </div>
    <div class="attachment-info">
        <div class="attachment-name">${file.name}</div>
        <div class="attachment-size">${formatFileSize(file.size)}</div>
    </div>
`;
        content.appendChild(fileIndicator);
    }

    const messageText = document.createElement('div');
    if (sender === 'bot') {
        // Convert markdown to HTML for bot messages
        messageText.innerHTML = convertMarkdownToHTML(message);
    } else {
        messageText.textContent = message;
    }
    content.appendChild(messageText);

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    chatMessages.appendChild(messageDiv);

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Helper function to get appropriate file icon
function getFileIcon(fileType) {
    if (fileType.startsWith('image/')) return 'image';
    if (fileType === 'application/pdf') return 'file-pdf';
    if (fileType.startsWith('text/') || fileType.includes('document')) return 'file-alt';
    return 'file';
}

// Helper function to format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Convert markdown to HTML (simplified)
function convertMarkdownToHTML(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        .replace(/^\d+\.\s(.*)$/gm, '<li>$1</li>')
        .replace(/^-\s(.*)$/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/s, '<ol>$1</ol>')
        .replace(/\n/g, '<br>');
}

// Show typing indicator
function showTypingIndicator() {
    const chatMessages = document.getElementById('chatMessages');
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot typing-message';
    typingDiv.id = 'typingIndicator';

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = '<i class="fas fa-meteor"></i>';

    const typingContent = document.createElement('div');
    typingContent.className = 'message-content';
    typingContent.innerHTML = `
        <div class="typing-indicator">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `;

    typingDiv.appendChild(avatar);
    typingDiv.appendChild(typingContent);
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Remove typing indicator
function removeTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Create new chat session
async function createNewChat() {
    try {
        const response = await fetch(`${API_BASE_URL}/new-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const data = await response.json();

        if (data.success) {
            currentSessionId = data.session_id;
            clearChat();
            loadChatHistory();
        }
    } catch (error) {
        console.error('Error creating new chat:', error);
        // Generate a fallback session ID
        currentSessionId = `session_${Date.now()}`;
        clearChat();
    }
}

// Clear chat display
function clearChat() {
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = `
        <div class="welcome-screen" id="welcomeScreen">
            <div class="welcome-logo">
                <i class="fas fa-meteor"></i>
            </div>
            <h2 class="welcome-title">Hello! I'm your Gemin AI Assistant</h2>
            <p class="welcome-subtitle">What can I help you learn about digital tools today?</p>

            <div class="suggestions">
                <div class="suggestion" onclick="sendMessage('How do I send a photo on WhatsApp?')">
                    How to send photos on WhatsApp?
                </div>
                <div class="suggestion" onclick="sendMessage('What is UPI payment?')">
                    What is UPI payment?
                </div>
                <div class="suggestion" onclick="sendMessage('How to use Google Maps for directions?')">
                    How to get directions on Maps?
                </div>
                <div class="suggestion" onclick="sendMessage('How to make video calls?')">
                    How to make video calls?
                </div>
            </div>
        </div>
    `;
}

// Load chat history for sidebar
async function loadChatHistory() {
    try {
        const response = await fetch(`${API_BASE_URL}/sessions`);
        const data = await response.json();

        if (data.success) {
            chatHistory = data.sessions;
            updateChatHistoryDisplay();
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
    }
}

// Update chat history display in sidebar
function updateChatHistoryDisplay() {
    const chatHistoryList = document.getElementById('chatHistoryList');

    if (chatHistory.length === 0) {
        chatHistoryList.innerHTML = '<div style="color: var(--text-secondary); font-size: 12px; text-align: center; padding: 20px;">No previous chats</div>';
        return;
    }

    chatHistoryList.innerHTML = chatHistory.map(session => `
        <div class="history-item ${session.id === currentSessionId ? 'active' : ''}" 
                onclick="loadSession('${session.id}')">
            <div class="history-item-content">
                <div class="history-item-title">${session.title}</div>
                <div class="history-item-time">${formatTime(session.created_at)}</div>
            </div>
            <div class="history-item-actions">
                <button class="delete-btn" onclick="event.stopPropagation(); confirmDeleteSession('${session.id}', '${session.title}')" title="Delete chat">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Format timestamp
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 2592000000) return `${Math.floor(diff / 86400000)}d ago`;

    return date.toLocaleDateString();
}

// Load specific session
async function loadSession(sessionId) {
    try {
        const response = await fetch(`${API_BASE_URL}/session/${sessionId}`);
        const data = await response.json();

        if (data.success) {
            currentSessionId = sessionId;
            displaySessionMessages(data.session.messages);
            updateChatHistoryDisplay();

            // Close sidebar on mobile after selecting
            if (window.innerWidth <= 768) {
                isSidebarOpen = false;
                updateSidebarState();
            }
        }
    } catch (error) {
        console.error('Error loading session:', error);
    }
}

// Display session messages
function displaySessionMessages(messages) {
    const chatMessages = document.getElementById('chatMessages');
    const welcomeScreen = document.getElementById('welcomeScreen');

    if (welcomeScreen) {
        welcomeScreen.style.display = 'none';
    }

    // Clear existing messages
    chatMessages.innerHTML = '';

    // Add all messages from session
    messages.forEach(msg => {
        if (msg.role === 'user' || msg.role === 'assistant') {
            addMessageToChat(msg.role === 'user' ? 'user' : 'bot', msg.content);
        }
    });
}

// Custom dialog for delete confirmation
function confirmDeleteSession(sessionId, sessionTitle) {
    const dialog = document.createElement('div');
    dialog.className = 'dialog-overlay';
    dialog.innerHTML = `
        <div class="dialog-content">
            <div class="dialog-title">Delete Chat</div>
            <div class="dialog-message">Are you sure you want to delete "${sessionTitle}"? This action cannot be undone.</div>
            <div class="dialog-actions">
                <button class="dialog-btn cancel" onclick="closeDialog()">Cancel</button>
                <button class="dialog-btn confirm" onclick="deleteSession('${sessionId}')">Delete</button>
            </div>
        </div>
    `;

    document.body.appendChild(dialog);

    // Close dialog when clicking outside
    dialog.addEventListener('click', function (e) {
        if (e.target === dialog) {
            closeDialog();
        }
    });
}

function closeDialog() {
    const dialog = document.querySelector('.dialog-overlay');
    if (dialog) {
        dialog.remove();
    }
}

// Delete session
async function deleteSession(sessionId) {
    try {
        const response = await fetch(`${API_BASE_URL}/session/${sessionId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            // If we deleted the current session, create a new one
            if (sessionId === currentSessionId) {
                await createNewChat();
            }

            // Refresh chat history
            await loadChatHistory();
        }
    } catch (error) {
        console.error('Error deleting session:', error);
    } finally {
        closeDialog();
    }
}

// Quick topic selection
function selectTopic(topic) {
    const topics = {
        'whatsapp': 'How do I use WhatsApp for messaging and calls?',
        'paytm': 'How do I make digital payments using UPI?',
        'maps': 'How do I use Google Maps for navigation?',
        'general': 'What are some basic digital skills I should learn?'
    };

    const message = topics[topic];
    if (message) {
        sendMessage(message);
    }
}

// Global variable for selected file
let selectedFile = null;

// Enhanced file handling
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        // Check file size (limit to 10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('File size must be less than 10MB');
            event.target.value = '';
            return;
        }

        // Check file type
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf',
            'text/plain', 'text/csv',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        if (!allowedTypes.includes(file.type)) {
            alert('Unsupported file type. Please upload images, PDF, text files, or Word documents.');
            event.target.value = '';
            return;
        }

        selectedFile = file;
        showFilePreview(file);

        // Enable send button if there's a message or file
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        sendBtn.disabled = !messageInput.value.trim() && !selectedFile;
    }
}

// Enhanced file preview
function showFilePreview(file) {
    const filePreview = document.getElementById('filePreview');
    const fileName = document.getElementById('fileName');

    // Show file preview with icon
    filePreview.style.display = 'flex';

    // Update the preview content
    filePreview.innerHTML = `
        <div class="file-preview-icon">
            <i class="fas fa-${getFileIcon(file.type)}"></i>
        </div>
        <div class="file-preview-info">
            <span class="file-preview-name">${file.name}</span>
            <span class="file-preview-size">${formatFileSize(file.size)}</span>
        </div>
        <button class="remove-file" onclick="removeFile()">
            <i class="fas fa-times"></i>
        </button>
    `;

    // Update input container styling
    const inputContainer = document.querySelector('.input-container');
    inputContainer.style.borderTopLeftRadius = '12px';
    inputContainer.style.borderTopRightRadius = '12px';
}

// Enhanced remove file function
function removeFile() {
    selectedFile = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('filePreview').style.display = 'none';

    // Reset input container styling
    const inputContainer = document.querySelector('.input-container');
    inputContainer.style.borderTopLeftRadius = '24px';
    inputContainer.style.borderTopRightRadius = '24px';

    // Update send button state
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    sendBtn.disabled = !messageInput.value.trim();
}

// Initialize theme on page load
document.addEventListener('DOMContentLoaded', function () {
    loadTheme();
});

// Handle clicks outside sidebar on mobile
document.addEventListener('click', function (e) {
    if (window.innerWidth <= 768 && isSidebarOpen) {
        const sidebar = document.getElementById('sidebar');
        const hamburger = document.querySelector('.chat-header-left .input-btn');

        if (!sidebar.contains(e.target) && !hamburger.contains(e.target)) {
            isSidebarOpen = false;
            updateSidebarState();
        }
    }
});

// Prevent sidebar from closing when clicking inside it
document.getElementById('sidebar').addEventListener('click', function (e) {
    e.stopPropagation();
});

