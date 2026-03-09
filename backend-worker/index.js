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
    - Include a "Where to Buy" link for the gift (use real, common retailers if possible)`;
    }

    content += `

    If the user mentions a location, situation, or constraint,
    adapt the gift ideas and add another short section
    under each gift that guides the user to get the gift in that
    constrained context.

    **IMPORTANT: Always end your response with a "Questions for You" section to continue the conversation and provide more tailored suggestions. This section must:
    - Be separated with a horizontal rule (---)
    - Have margin top of at  20 pixels from the text before
    - Have a bold heading
    - Contain 2-3 specific follow-up questions based on what the user shared.**

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
    - "What's your ideal budget range for this gift?"
    - "Should the gift arrive before a specific date or event?"
    - "Would they enjoy something more personalized or ready-made?"

    **In follow-up conversations (when you already have context), still provide gift ideas but make them even more tailored based on previous answers. Continue asking clarifying questions to narrow down the perfect gift.**
    
    **Handling Non-Gift Conversations:**
    - If the user says "thank you" or expresses gratitude, respond briefly and warmly (1-2 sentences max), then offer to continue with more gift ideas.
    - If the user asks something unrelated to gifts, politely acknowledge and redirect back to gift suggestions.
    - Keep these responses conversational but concise - don't generate gift lists for these cases.\`;
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
