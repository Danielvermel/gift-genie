import OpenAI from "openai";

// System prompt template
const getSystemPrompt = (env) => {
    const webSearchEnabled = env.ENABLE_WEB_SEARCH === "true";
    let content = `You are the Gift Genie, a friendly and helpful assistant that generates personalized gift ideas.

    You generate gift ideas that feel thoughtful, specific, and genuinely useful.
    Your output must be in structured Markdown.
    Start directly with the gift suggestions in a numerical list.
    Do not write introductions or conclusions like "Here are some gift ideas".
    
    Each gift must:
    - Have a clear bold heading
    - Include a short explanation of why it works`;

        if (webSearchEnabled) {
            content += `
    - Include a "Where to Buy" line with a real, common retailer link when reasonably possible`;
        }

        content += `
    If the user mentions a location, situation, or constraint,
    adapt the gift ideas and add a short practical note
    under each gift explaining how to buy, use, or personalize it
    for that context.
    
    Response modes:
    
    Default to Clarifying mode unless ALL of the following are known:
    - Budget or price range
    - At least one interest, hobby, or personality trait of the recipient
    
    Only switch to Final mode when both conditions above are met,
    or when the user explicitly says something like "just give me ideas", "no questions", or "surprise me".
    
    1. Clarifying mode
    Use this whenever budget or recipient interests are unknown — even if you have a recipient and occasion.
    
    Example trigger: "it's my mum's birthday tomorrow" → Clarifying mode. Budget and interests are unknown. Ask about both.
    
    - Still provide 3-5 solid gift ideas based on the available information.
    - After the gift list, you MUST include a follow-up section.
    - Skipping the follow-up section is not allowed in Clarifying mode.
    - Ask exactly 1-2 short, specific questions focused on the most impactful missing details (usually budget and recipient interests).
    
    2. Final mode
    Use this only when:
    - Budget AND at least one recipient interest, hobby, or personality detail are already known, OR
    - The user explicitly asks for a complete answer now without questions (e.g. "just give me ideas", "no questions", "I don't want follow-ups").
    
    In Final mode:
    - Provide the best tailored gift ideas you can.
    - Do not ask follow-up questions.
    - Do not add a conclusion.
    - End the message cleanly after the final gift or final practical note.
    
    If you include a follow-up section:
    - Separate it with a horizontal rule (---)
    - Use the bold heading: **Questions for You**
    - Ask exactly 1-2 practical, personal, non-generic questions
    - Base the questions on what the user shared or what is still missing
    
    Good follow-up questions help clarify:
    - Budget
    - Occasion or deadline
    - Recipient interests, style, or hobbies
    - Whether they prefer practical, sentimental, or experience-based gifts
    - Whether they want personalized or ready-to-buy options
    
    In follow-up conversations:
    - Use previous answers to make suggestions more tailored
    - Do not keep asking questions unless they are necessary to significantly improve the recommendations
    - If both budget and at least one interest are known, respond in Final mode
    
    Handling non-gift conversations:
    - If the user says "thank you" or expresses gratitude, reply briefly and warmly in 1-2 sentences max
    - Do not ask follow-up questions in thank-you replies
    - If the user asks something unrelated to gifts, briefly acknowledge it and redirect back to gift help
    - Keep these responses concise and conversational
    - Do not generate a gift list for unrelated requests
    
    Style rules:
    - Be warm, specific, and practical
    - Avoid generic filler
    - Avoid repeating the same type of gift
    - Prefer ideas that feel personal and easy to act on
    - Never end every response with a question
    - Never use phrases like "Let me know if you'd like more ideas" unless the user explicitly asks for more\`
   `;

    return {
        role: "system",
        content: content.trim()
    };
};

// In-memory session storage (note: resets on worker redeploy)
const sessions = new Map();

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        
        // CORS preflight
        if (request.method === "OPTIONS") {
            return new Response(null, {
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                },
            });
        }

        // Test endpoint
        if (url.pathname === "/test" && request.method === "GET") {
            return new Response(JSON.stringify({
                alive: true,
                timestamp: new Date().toISOString(),
                env: {
                    model: env.AI_MODEL,
                    url: env.AI_URL,
                },
            }), {
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            });
        }

        // Gift API endpoint
        if (url.pathname === "/api/gift" && request.method === "POST") {
            try {
                const { userPrompt, sessionId } = await request.json();

                if (!userPrompt) {
                    return new Response(JSON.stringify({ error: "No userPrompt" }), {
                        status: 400,
                        headers: {
                            "Content-Type": "application/json",
                            "Access-Control-Allow-Origin": "*",
                        },
                    });
                }

                // Create or retrieve session
                const id = sessionId || `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
                if (!sessions.has(id)) {
                    sessions.set(id, [getSystemPrompt(env)]);
                }
                const sessionMessages = sessions.get(id);

                // Add user message
                sessionMessages.push({ role: "user", content: userPrompt });

                // Initialize OpenAI client
                const openai = new OpenAI({
                    apiKey: env.AI_KEY,
                    baseURL: env.AI_URL,
                });

                // SSE streaming response
                const stream = new ReadableStream({
                    async start(controller) {
                        const encoder = new TextEncoder();

                        // Send session ID
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ sessionId: id })}\n\n`));

                        try {
                            const response = await openai.chat.completions.create({
                                model: env.AI_MODEL,
                                messages: sessionMessages,
                                stream: true,
                            });

                            let fullResponse = '';

                            for await (const chunk of response) {
                                const content = chunk.choices[0]?.delta?.content || '';
                                if (content) {
                                    fullResponse += content;
                                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                                }
                            }

                            // Send metadata
                            const hasQuestions = fullResponse.includes('Questions for You');
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ metadata: { hasQuestions } })}\n\n`));
                            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));

                            // Store response in session
                            sessionMessages.push({ role: "assistant", content: fullResponse });

                            controller.close();
                        } catch (e) {
                            console.error('Streaming error:', e);
                            console.error('Error details:', {
                                message: e.message,
                                status: e.status,
                                stack: e.stack
                            });
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Server error during streaming", details: e.message })}\n\n`));
                            controller.close();
                        }
                    },
                });

                return new Response(stream, {
                    headers: {
                        "Content-Type": "text/event-stream",
                        "Cache-Control": "no-cache",
                        "Connection": "keep-alive",
                        "Access-Control-Allow-Origin": "*",
                    },
                });
            } catch (e) {
                console.error('Request error:', e);
                console.error('Request error details:', {
                    message: e.message,
                    stack: e.stack
                });
                return new Response(JSON.stringify({ error: "Internal server error", details: e.message }), {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                    },
                });
            }
        }

        // 404 for other routes
        return new Response("Not found", { status: 404 });
    },
};
