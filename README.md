# Gift Genie 🧞

Your AI-powered genie for personalized gift suggestions. Find the perfect gift in seconds by simply describing the recipient, occasion, and your budget.

## Features

- ✨ **Personalized Recommendations** - Tailored suggestions based on interests, occasion, and budget
- ⚡ **Instant Results** - Get curated gift ideas in seconds
- 🌟 **AI-Powered** - Smart recommendations that actually make sense
- 💬 **Simple Interface** - Just describe what you're looking for and rub the magic lamp

## Tech Stack

- **Frontend**: Vanilla JavaScript, Vite
- **Backend**: Node.js, Express
- **AI**: OpenAI-compatible API (GPT-5 Nano)
- **Styling**: Custom CSS with LCH color space

## Prerequisites

- Node.js (v18 or later recommended)
- An API key from an OpenAI-compatible provider

## Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
AI_URL=your_ai_provider_url
AI_MODEL=your_model_name
AI_KEY=your_api_key
PORT=3001
```

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

   This runs both the frontend (Vite) and backend (Express) concurrently.

3. Open your browser to `http://localhost:5173`

## Usage

1. Click **"Let's Get Started"** to begin
2. Describe the gift you're looking for (e.g., *"My friend who loves candles has a birthday coming up in 3 days. 15-20 pounds budget."*)
3. Click the **magic lamp** or press **Enter** to submit
4. Watch the progress bar as the genie works its magic
5. Get personalized gift suggestions with helpful context

### Keyboard Shortcuts

- **Enter** - Submit your request
- **Shift+Enter** - Add a new line in the input

## Project Structure

```
gift-genie/
├── index.html        # Main HTML file
├── index.js          # Frontend JavaScript
├── server.js         # Express backend
├── style.css         # Custom styles
├── utils.js          # Utility functions
├── vite.config.js    # Vite configuration
├── package.json      # Dependencies
└── assets/           # Images and icons
```

## API Endpoints

### `POST /api/gift`

Get gift suggestions based on user input.

**Request Body:**
```json
{
  "userPrompt": "My friend who loves candles has a birthday..."
}
```

**Response:**
```json
{
  "giftSuggestions": "# Gift Ideas\n\n1. **Hand-poured Soy Candle**..."
}
```

### `GET /test`

Health check endpoint to verify server and environment configuration.

## License

ISC

## Author

Daniel Leite
