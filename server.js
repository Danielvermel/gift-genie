import express from "express";
import OpenAI from "openai";
import cors from "cors";
import "dotenv/config";

const API_URL = process.env.VITE_API_URL || "http://localhost:4000";

console.log("API_URL: ", API_URL);

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

// Initialize messages array with system prompt
const messages = [
    {
        role: "system",
        content: `You are the Gift Genie. 

        You generate gift ideas that feel thoughtful, specific, and genuinely useful.
        Your output must be in structured Markdown.
        Do not write introductions or conclusions.
        Start directly with the gift suggestions.

        Each gift must:
        - Have a clear heading
        - Include a short explanation of why it works
        - Include a numerical list for each heading

        If the user mentions a location, situation, or constraint,
        adapt the gift ideas and add another short section 
        under each gift that guides the user to get the gift in that 
        constrained context.

        After the gift ideas, include a section with titled "Questions to best tailor your next prompt"
        with clarifying questions that would help improve the recommendations. 
        This title should be well seperated from the gift ideas, it should have a division 
        and be bold.`,
    },
];

app.post("/api/gift", async (req, res) => {
    // Extract userPrompt from req.body and add to messages
    const { userPrompt } = req.body;

    if (!userPrompt) return res.status(400).json({ error: "No userPrompt" });

    messages.push({
        role: "user",
        content: userPrompt,
    });

    try {
        // Send chat completions request
        const response = await openai.chat.completions.create({
            model: process.env.AI_MODEL,
            messages,
        });

        // Extract content and send back as JSON
        const giftSuggestions = response.choices[0].message.content;
        console.log(giftSuggestions);

        res.json({ giftSuggestions });
    } catch (e) {
        console.error(e);
        res.status(500).json({
            message: `It's not you, it's us. 
    Something went wrong on the server`,
        });
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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
