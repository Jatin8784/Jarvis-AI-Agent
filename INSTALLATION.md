# 📦 JARVIS AI - Installation Guide

## 🚀 Quick Install (Recommended)

### Download Pre-built Installer

1. Go to [Releases](https://github.com/Jatin8784/Jarvis-AI-Agent/releases)
2. Download the installer for your OS:
   - **Windows**: `Jarvis-Setup-1.0.0.exe`
   - **Mac**: `Jarvis-1.0.0.dmg`
   - **Linux**: `Jarvis-1.0.0.AppImage`
3. Run the installer
4. Follow the setup wizard

---

## ⚙️ Setup Requirements

### 1. Get API Keys (Required)

JARVIS requires at least ONE AI provider API key:

#### **Option 1: Gemini (Recommended - Free)**
1. Go to https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy your API key

#### **Option 2: Groq (Fast & Free)**
1. Go to https://console.groq.com
2. Sign up for free account
3. Get your API key

#### **Option 3: Claude (Anthropic)**
1. Go to https://console.anthropic.com
2. Get API key (paid)

#### **Option 4: DeepSeek**
1. Go to https://platform.deepseek.com
2. Get API key

### 2. Configure JARVIS

After installation:

1. **Open JARVIS**
2. Click **Settings** (gear icon)
3. **Select AI Provider** (Gemini, Groq, Claude, or DeepSeek)
4. **Enter your API Key**
5. Click **Save**

---

## 🛠️ Build from Source (Developers)

### Prerequisites

- **Node.js** 18+ (https://nodejs.org)
- **Git** (https://git-scm.com)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/Jatin8784/Jarvis-AI-Agent.git
cd Jarvis-AI-Agent/jarvis

# 2. Install dependencies
npm install

# 3. Create .env file
# Copy .env.example to .env and add your API keys

# 4. Run in development mode
npm run dev

# 5. Build installer (optional)
npm run build
npm run dist
```

---

## 🎯 First Time Setup

### 1. Choose Your AI Provider

- **Gemini**: Best for general use, free tier available
- **Groq**: Fastest responses, free
- **Claude**: Most capable, paid
- **DeepSeek**: Good balance, affordable

### 2. Test JARVIS

Try these commands:
- "What are my system specs?"
- "Search the web for latest AI news"
- "List files in my Desktop folder"
- "Generate a LinkedIn post about AI"

### 3. Enable Voice Input (Optional)

1. Click the **microphone icon**
2. Allow microphone access
3. Speak your command
4. Click microphone again to stop

---

## 🔧 Troubleshooting

### "API Key Invalid"
- Check that you copied the full API key
- Make sure there are no extra spaces
- Verify the key is active in your provider's console

### "Microphone Not Working"
- Check browser/system permissions
- Make sure a microphone is connected
- Try restarting JARVIS

### "Tools Not Working"
- Some tools require additional setup (FFmpeg for video)
- Check the tool's documentation in the app

---

## 📚 Documentation

- **GitHub**: https://github.com/Jatin8784/Jarvis-AI-Agent
- **Issues**: Report bugs on GitHub Issues
- **Discussions**: Ask questions in GitHub Discussions

---

## 🎉 You're Ready!

JARVIS is now installed and configured. Start by asking:

**"Hey JARVIS, what can you do?"**

Enjoy your AI-powered productivity assistant! 🚀
