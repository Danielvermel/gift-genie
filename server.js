import express from "express";
import OpenAI from "openai";
import cors from "cors";
import "dotenv/config";

const API_URL = process.env.VITE_API_URL || "http://localhost:4000";
const PORT = process.env.PORT || 4000;

console.log("API_URL: ", API_URL);
console.log("Server running on port:", PORT);

const app = express();
app.use(express.json({ limit: "10mb" }));

app.use(
    cors({
        origin: true,
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type"],
    })
);

// Initialize an OpenAI client for your provider using env vars
const openai = new OpenAI({
    apiKey: process.env.AI_KEY,
    baseURL: process.env.AI_URL,
});

// Store conversation history per session
const sessions = new Map();

// System prompt template
const getSystemPrompt = () => {
    const webSearchEnabled = process.env.ENABLE_WEB_SEARCH === "true";
    
    let content = `You are the Gift Genie. 

    You generate gift ideas that feel thoughtful, specific, and genuinely useful.
    Your output must be in structured Markdown.
    Do not write introductions or conclusions.
    If the user mentions something that is not related to the gifts or less than 2 words just say you don't know how to help with that.
    Start directly with the gift suggestions in a numerical list.
    
    Each gift must:
    - Have a clear bold heading 
    - Include a short explanation of why it works`;

    if (webSearchEnabled) {
        content += `
    - Include a "Where to Buy" link for the gift (use real, common retailers if possible)`;
    }

    content += `
    
    If the user mentions a location, situation, or constraint,
    adapt the gift ideas and add another short section 
    under each gift that guides the user to get the gift in that 
    constrained context.
    
    **Analyze the user input first: If it provides specific data (e.g., recipient interests, age, budget, occasion), generate suggestions. ONLY if there is meaningful data to build on, end with a section titled "Questions for You" with 2-3 clarifying questions that would help improve the recommendations. This section must:
    - Be separated with a horizontal rule (---)
    - Have margin top of at 20 pixels from the texg before
    - Have a bold heading
    - Contain specific follow-up questions based on the gifts suggested.**
    
    When generating the "Questions for You" section:

    - Your questions must feel practical and personal — not generic.
    - Base them directly on what you inferred about the recipient (age, interests, lifestyle, location, or context).
    - Always ask 2–3 short questions that would help refine future gift suggestions.
    - Examples of good types of questions:
      - Clarify recipient preferences (style, fitness level, hobbies, or type of activity).
      - Check practical constraints (budget, delivery time, or item availability).
      - Explore emotional tone or relationship (occasion, level of closeness).

    Example templates:
    - "Would you prefer a tech-focused or more sentimental gift for them?"
    - "Do they already have similar gear (like a smartwatch or tracker)?"
    - "What’s your ideal budget range for this gift?"
    - "Should the gift arrive before a specific date or event?"
    - "Would they enjoy something more personalized or ready-made?"

    If no specific data is provided (e.g., vague query like "gift ideas"), do NOT include the Questions section.`;

    return {
        role: "system",
        content: content.trim()
    };
};

app.post("/api/gift", async (req, res) => {
    const { userPrompt, sessionId } = req.body;

    if (!userPrompt) return res.status(400).json({ error: "No userPrompt" });

    // Create session
    const id = sessionId || `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    if (!sessions.has(id)) {
        sessions.set(id, [getSystemPrompt()]);
    }
    const sessionMessages = sessions.get(id);

    // Add user message
    sessionMessages.push({ role: "user", content: userPrompt });

    // SSE headers for streaming
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',  // Add if CORS issues
    });

    // Send session ID back to client
    res.write(`data: ${JSON.stringify({ sessionId: id })}\n\n`);

    // Close connection if client disconnects
    req.on('close', () => {
        console.log(`Connection closed for session: ${id}`);
    });

    try {
        const response = await openai.chat.completions.create({
            model: process.env.AI_MODEL,
            messages: sessionMessages,
            stream: true,
        });

        console.log('Stream started for session:', id);

        let fullResponse = '';  // Track for session history

        // Stream chunks to client + accumulate
        for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
                fullResponse += content;
                res.write(`data: ${JSON.stringify({ content })}\n\n`);  // SSE format
            }
        }

        console.log('Stream finished for session:', id);

        res.write('data: [DONE]\n\n');

        // Add complete response to session AFTER streaming
        sessionMessages.push({ role: "assistant", content: fullResponse });

        res.end();
    } catch (e) {
        console.error('Streaming error:', e);
        // If we already started the response, we must use res.write for the error
        res.write('data: ' + JSON.stringify({ error: "Server error during streaming" }) + '\n\n');
        res.end();
    }
});

app.get("/test", (req, res) => {
    console.log("🧪 /test HIT!");
    res.json({
        alive: true,
        timestamp: new Date().toISOString(),
        env: {
            model: process.env.AI_MODEL,
            url: process.env.AI_URL,
        },
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
