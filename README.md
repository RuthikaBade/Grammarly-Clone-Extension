Grammar-Clone-Extension is a lightweight Chrome extension that checks and corrects grammar, spelling, and punctuation errors in real-time while you type.
It connects to a FastAPI backend powered by Google Gemini to fetch grammar suggestions and displays them in a simple popup interface.

Features: 
Chrome Extension:
Works on text inputs, textareas, and content-editable fields
Debounced grammar checking to reduce API calls
Displays suggestions in a popup (Replace Word / Replace Sentence)
Start/Stop tracking via popup interface
Saves tracking state using Chrome storage

FastAPI Backend:
Grammar & spelling correction using Google Gemini
Word-level corrections with start/end indices
Simple REST API with /check endpoint
Health check root endpoint (/)
Handles slow AI responses with timeouts

Structure:
Extension:            
 background.js
 content.js
 popup.html
 popup.js
 manifest.json
 README.md (extension docs)
 
Server:                      
 api.py
 main.py
 requirements.txt
 README.md (API docs)
 .env
 README.md (this file)
 
Tech Stack
Extension: Chrome Extension APIs, JavaScript, HTML, CSS
Backend: FastAPI, Uvicorn
AI Engine: Google Gemini API
Env Management: python-dotenv
   

