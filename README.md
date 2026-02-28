# Gift Genie 🧞

Your AI-powered genie for personalized gift suggestions. Find the perfect gift in seconds by simply describing the recipient, occasion, and your budget.

## Features

- ✨ **Personalized Recommendations** - Tailored suggestions based on interests, occasion, and budget
- ⚡ **Instant Results** - Get curated gift ideas in seconds
- 🌟 **AI-Powered** - Smart recommendations that actually make sense
- 💬 **Simple Interface** - Just describe what you're looking for and rub the magic lamp
- 🔄 **Streaming Responses** - Watch suggestions appear in real-time
- 🌐 **Web Search Support** - Optional real-time product links (when enabled)

## Tech Stack

- **Frontend**: Vanilla JavaScript, Vite
- **Backend**: Node.js, Express
- **AI**: OpenAI-compatible API (supports multiple providers)
- **Styling**: Custom CSS with LCH color space

## Prerequisites

- Node.js (v18 or later recommended)
- npm or yarn
- An API key from an OpenAI-compatible provider (see [AI Provider Setup](#ai-provider-setup))

## Installation

1. **Clone or download the repository**

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create a `.env` file** in the root directory (see [Environment Setup](#environment-setup))

4. **Start the development server:**
   ```bash
   npm start
   ```

   This runs both the frontend (Vite on port 5173) and backend (Express on port 3001) concurrently.

5. **Open your browser** to `http://localhost:5173`

## Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
# AI Provider Configuration (required)
AI_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
AI_KEY=your_api_key_here

# Server Configuration (optional)
PORT=3001

# Optional: Enable web search for real product links
# ENABLE_WEB_SEARCH=false
```

### Environment Variables Explained

| Variable | Required | Description |
|----------|----------|-------------|
| `AI_URL` | ✅ | Base URL of your AI provider's API |
| `AI_MODEL` | ✅ | The model name to use for generating suggestions |
| `AI_KEY` | ✅ | Your API key for authentication |
| `PORT` | ❌ | Backend server port (default: 3001) |
| `ENABLE_WEB_SEARCH` | ❌ | Set to `true` to include product links in suggestions |

## AI Provider Setup

Gift Genie works with any **OpenAI-compatible API provider**. Choose one that fits your needs:

### OpenAI (Official)

The original GPT models with reliable performance.

```env
AI_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
AI_KEY=sk-...
```

**Get API Key:** [platform.openai.com](https://platform.openai.com/api-keys)

**Pricing:** ~$0.15 per 1M input tokens (gpt-4o-mini)

---

### OpenRouter

Access multiple models through a single API with competitive pricing.

```env
AI_URL=https://openrouter.ai/api/v1
AI_MODEL=openai/gpt-4o-mini
AI_KEY=sk-or-...
```

**Get API Key:** [openrouter.ai](https://openrouter.ai/keys)

**Pricing:** Varies by model, often discounted

**Note:** Prefix the model name with the provider (e.g., `openai/gpt-4o-mini`, `anthropic/claude-3-haiku`)

---

### Groq

Ultra-fast inference for supported models.

```env
AI_URL=https://api.groq.com/openai/v1
AI_MODEL=llama-3.1-70b-versatile
AI_KEY=gsk_...
```

**Get API Key:** [console.groq.com](https://console.groq.com/keys)

**Pricing:** Free tier available, then pay-per-use

---

### Together AI

Wide selection of open-source models.

```env
AI_URL=https://api.together.xyz/v1
AI_MODEL=meta-llama/Llama-3-70b-chat-hf
AI_KEY=your_together_api_key
```

**Get API Key:** [api.together.ai](https://api.together.ai/)

---

### Local Models (Ollama, LM Studio, etc.)

Run models locally for privacy and zero API costs.

**Ollama:**
```env
AI_URL=http://localhost:11434/v1
AI_MODEL=llama3.1
AI_KEY=ollama
```

**LM Studio:**
```env
AI_URL=http://localhost:1234/v1
AI_MODEL=local-model
AI_KEY=lm-studio
```

**Setup:**
1. Install [Ollama](https://ollama.ai) or [LM Studio](https://lmstudio.ai)
2. Download your preferred model
3. Start the local server
4. Use the configuration above

---

### Other Providers

Any provider with an OpenAI-compatible API will work. Common options:

- **Azure OpenAI:** `https://YOUR_RESOURCE.openai.azure.com/openai/deployments/YOUR_DEPLOYMENT`
- **Cohere:** Via OpenRouter or direct API
- **Perplexity:** `https://api.perplexity.ai`
- **Fireworks AI:** `https://api.fireworks.ai/inference/v1`

## Usage

1. Click **"Let's Get Started"** to begin
2. Describe the gift you're looking for:
   - **Example:** *"My friend who loves candles has a birthday coming up in 3 days. 15-20 pounds budget."*
3. Click the **magic lamp** or press **Enter** to submit
4. Watch the progress bar as the genie works its magic
5. Get personalized gift suggestions with helpful context

### Example Prompts

- *"Looking for a birthday gift for my tech-savvy dad, budget £50-70"*
- *"Christmas gift for a 10-year-old who loves dinosaurs and science"*
- *"Anniversary gift for my wife, she's into yoga and sustainable living, £100 budget"*
- *"Last-minute gift for a colleague who likes coffee and books"*

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Enter** | Submit your request |
| **Shift+Enter** | Add a new line in the input |

## Project Structure

```
gift-genie/
├── index.html        # Main HTML file
├── index.js          # Frontend JavaScript (UI logic)
├── server.js         # Express backend (AI integration)
├── style.css         # Custom styles with LCH colors
├── utils.js          # Utility functions
├── vite.config.js    # Vite configuration
├── package.json      # Dependencies and scripts
├── .env              # Environment variables (create this)
├── .env.example      # Template for .env (if provided)
└── assets/           # Images, icons, and static files
```

## API Endpoints

### `POST /api/gift`

Get gift suggestions based on user input with streaming support.

**Request Body:**
```json
{
  "userPrompt": "My friend who loves candles has a birthday...",
  "sessionId": "session_123"  // optional, for conversation history
}
```

**Response:** Server-Sent Events (SSE) stream
```
data: {"sessionId": "session_123"}
data: {"content": "1. **Hand-poured Soy Candle**..."}
data: {"content": "..."}
data: [DONE]
```

### `GET /test`

Health check endpoint to verify server and environment configuration.

**Response:**
```json
{
  "alive": true,
  "timestamp": "2026-02-28T10:00:00.000Z",
  "env": {
    "model": "gpt-4o-mini",
    "url": "https://api.openai.com/v1"
  }
}
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Run both frontend and backend (development) |
| `npm run client` | Run Vite frontend only |
| `npm run server` | Run Express backend only |
| `npm run live-server` | Run backend without watch mode |
| `npm run build` | Build frontend for production |
| `npm run preview` | Preview production build |

## Troubleshooting

### "No AI_KEY provided" or similar errors

- Ensure your `.env` file exists in the root directory
- Check that all environment variables are correctly named
- Restart the server after changing `.env`

### CORS errors

- The backend is configured to allow all origins in development
- For production, update the CORS configuration in `server.js`

### Streaming not working

- Ensure your AI provider supports streaming
- Check browser console for errors
- Try a different model or provider

### Model not found errors

- Verify the `AI_MODEL` name matches your provider's catalog
- Some providers require specific model name formats (e.g., OpenRouter uses `provider/model-name`)

## Security Notes

⚠️ **Never commit your `.env` file** - it contains sensitive API keys. The `.gitignore` is already configured to exclude it.

For production deployments:
- Use environment variables from your hosting platform
- Never hardcode API keys in source code
- Consider rate limiting and authentication for public deployments

## License

ISC

## Author

Daniel Leite

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.
