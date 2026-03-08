import { marked } from "marked";
import DOMPurify from "dompurify";
import { autoResizeTextarea, setLoading } from "./utils.js";
const API_URL = import.meta.env.VITE_NODE_URL || 'http://localhost:8788';  // Dev fallback

// Store session ID to maintain conversation history per user
let sessionId = localStorage.getItem('giftGenieSessionId') || null;

// 🎬 DEMO MODE: Set to true to show typing effect on first focus (for video demo)
const DEMO_MODE = true;
const DEMO_TEXT = "My dog's birthday is in a week. Spoiled golden retriever, loves squeaky toys and stealing socks. Budget £15-20.";
let demoTyped = false;


// Get UI elements
const giftForm = document.getElementById("gift-form");
const userInput = document.getElementById("user-input");
const outputContent = document.getElementById("chat-output-content");
const getStartedBtn = document.getElementById("get-started-btn");
const mainContent = document.getElementById("main-content");
const introSection = document.querySelector(".intro-section");
const progressContainer = document.getElementById("progress-container");
const progressFill = document.getElementById("progress-fill");
const resetButton = document.getElementById("reset-button");
const clearButton = document.getElementById("clear-button");
const askAgainSection = document.getElementById("ask-again-section");
const continueBtn = document.getElementById("continue-btn");
const newConversationBtn = document.getElementById("new-conversation-btn");
const answerQuestionsBtn = document.getElementById("answer-questions-btn");
const moreIdeasBtn = document.getElementById("more-ideas-btn");
const quickActions = document.getElementById("quick-actions");
const standardActions = document.getElementById("standard-actions");
const questionsSection = document.getElementById("questions-section");
const questionsContent = document.getElementById("questions-content");
const questionsAnswer = document.getElementById("questions-answer");
const submitAnswerBtn = document.getElementById("submit-answer-btn");
const chatSection = document.getElementById("chat-section");
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const chatInputContainer = document.getElementById("chat-input-container");
const chatSubmitBtn = document.getElementById("chat-submit-btn");

// Global typing effect variables
let typingTimeout = null;
let contentQueue = '';

// Chat message history for the session
let chatHistory = [];

// Store the last complete AI response for chat transition
let lastAIResponse = '';

// Store the initial user prompt for chat transition
let initialUserPrompt = '';

// Add a chat message to the UI
function addChatMessage(content, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${isUser ? 'user' : 'ai'}`;

    const label = document.createElement('span');
    label.className = 'chat-message-label';
    label.textContent = isUser ? 'You' : 'Gift Genie';

    const bubble = document.createElement('div');
    bubble.className = 'chat-message-bubble';
    bubble.innerHTML = isUser ? content : marked.parse(content);

    messageDiv.appendChild(label);
    messageDiv.appendChild(bubble);
    chatMessages.appendChild(messageDiv);

    // Smooth scroll to bottom
    scrollToBottom();

    // Add to history
    chatHistory.push({ role: isUser ? 'user' : 'assistant', content });
}

// Smooth scroll to bottom of chat
function scrollToBottom() {
    requestAnimationFrame(() => {
        chatMessages.scrollTo({
            top: chatMessages.scrollHeight,
            behavior: 'smooth'
        });
    });
}

// Show typing indicator
function showTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.id = 'typing-indicator';
    indicator.innerHTML = `
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
    `;
    chatMessages.appendChild(indicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Remove typing indicator
function removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.remove();
    }
}

// Clear chat messages
function clearChatMessages() {
    chatMessages.innerHTML = '';
    chatHistory = [];
}

// Typing effect for demo with realistic mistakes and variable speed
function typeDemoText(element, text, baseSpeed = 100) {
    return new Promise((resolve) => {
        let i = 0;
        element.value = "";
        
        // Start after 2 seconds (simulate gathering thoughts)
        setTimeout(() => {
            startTyping();
        }, 2000);
        
        // Mistakes to insert: [position, wrongChar, delayBeforeCorrection]
        const mistakes = [
            { pos: 15, wrong: "x", delay: 150 },  // Type 'x' after "in 2 days"
            { pos: 45, wrong: "s", delay: 200 },  // Type extra 's' near "squeaky"
        ];
        let mistakeIndex = 0;
        
        // Pauses to simulate thinking: [position, delay]
        const pauses = [
            { pos: 20, delay: 1000 },  // Pause after "Spoiled"
            { pos: 35, delay: 1200 },  // Pause after "retriever who"
            { pos: 50, delay: 1000 },  // Pause near "loves squeaky"
            { pos: 70, delay: 1100 },  // Pause near "Budget"
        ];
        let pauseIndex = 0;
        
        function startTyping() {
            typeChar();
        }
        
        function typeChar() {
            if (i < text.length) {
                const char = text.charAt(i);
                element.value += char;
                element.style.height = "auto";
                element.style.height = element.scrollHeight + "px";
                i++;
                
                // Check if we should pause (thinking)
                const pause = pauses.find(p => p.pos === i);
                if (pause && pauseIndex < pauses.length) {
                    pauseIndex++;
                    setTimeout(() => {
                        typeChar();
                    }, pause.delay);
                    return;
                }
                
                // Check if we should insert a mistake
                const mistake = mistakes.find(m => m.pos === i);
                if (mistake && mistakeIndex < mistakes.length) {
                    mistakeIndex++;
                    setTimeout(() => {
                        // Type wrong character
                        element.value += mistake.wrong;
                        element.style.height = "auto";
                        element.style.height = element.scrollHeight + "px";
                        
                        setTimeout(() => {
                            // Backspace to remove it
                            element.value = element.value.slice(0, -1);
                            element.style.height = "auto";
                            element.style.height = element.scrollHeight + "px";
                            
                            // Variable speed after correction
                            const nextSpeed = baseSpeed + Math.random() * 40;
                            setTimeout(typeChar, nextSpeed);
                        }, mistake.delay);
                    }, baseSpeed);
                } else {
                    // Variable typing speed (not robotic)
                    const variableSpeed = baseSpeed + Math.random() * 50;
                    setTimeout(typeChar, variableSpeed);
                }
            } else {
                resolve();
            }
        }
    });
}

function start() {
    // Setup UI event listeners
    userInput.addEventListener("input", () => autoResizeTextarea(userInput));
    giftForm.addEventListener("submit", handleGiftRequest);

    // Online/Offline status listeners
    window.addEventListener('offline', () => {
        console.log('User went offline');
    });

    window.addEventListener('online', () => {
        console.log('User came back online');
    });

    // Demo typing effect on first textarea click (not "Let's Get Started" button)
    if (DEMO_MODE && !demoTyped) {
        userInput.addEventListener("click", () => {
            if (!demoTyped) {
                demoTyped = true;
                typeDemoText(userInput, DEMO_TEXT, 80);
            }
        }, { once: true });
    }
    
    // Enter key to submit (Shift+Enter for new line)
    userInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (userInput.value.trim()) {
                giftForm.requestSubmit();
            }
        }
    });
    
    getStartedBtn?.addEventListener("click", () => {
        introSection.classList.add("hidden");
        mainContent.classList.remove("hidden");
        document.body.style.overflowY = "auto";
        userInput.scrollIntoView({ behavior: "smooth", block: "center" });
        userInput.focus();
    });
    
    resetButton?.addEventListener("click", () => {
        // Clear any pending typing
        if (typingTimeout) {
            clearTimeout(typingTimeout);
            typingTimeout = null;
        }
        contentQueue = '';
        lastAIResponse = '';
        initialUserPrompt = '';

        mainContent.classList.add("hidden");
        introSection.classList.remove("hidden");
        document.body.style.overflowY = "hidden";
        userInput.value = "";
        userInput.style.height = "auto";
        outputContent.innerHTML = "";
        outputContent.parentElement.classList.remove("visible");
        outputContent.parentElement.classList.add("hidden");
        askAgainSection.classList.add("hidden");
        questionsSection.classList.add("hidden");
        chatSection.classList.add("hidden");
        clearChatMessages();
        questionsContent.innerHTML = "";
        questionsAnswer.value = "";
        giftForm.classList.remove('response-active');
        const inputSection = document.querySelector(".input-section");
        if (inputSection) inputSection.classList.remove("hidden");
        const lampContainer = document.querySelector(".lamp-container");
        if (lampContainer) lampContainer.classList.remove("hidden");
        // Clear session to start fresh
        sessionId = null;
        localStorage.removeItem('giftGenieSessionId');
    });

    clearButton?.addEventListener("click", () => {
        // Clear any pending typing
        if (typingTimeout) {
            clearTimeout(typingTimeout);
            typingTimeout = null;
        }
        contentQueue = '';
        lastAIResponse = '';
        initialUserPrompt = '';

        outputContent.innerHTML = "";
        if (outputContent.parentElement) {
            outputContent.parentElement.classList.remove("visible");
            outputContent.parentElement.classList.add("hidden");
        }
        if (askAgainSection) askAgainSection.classList.add("hidden");
        if (questionsSection) questionsSection.classList.add("hidden");
        if (chatSection) chatSection.classList.add("hidden");
        clearChatMessages();
        if (questionsContent) questionsContent.innerHTML = "";
        if (questionsAnswer) questionsAnswer.value = "";
        if (giftForm) giftForm.classList.remove('response-active');
        const inputSection = document.querySelector(".input-section");
        if (inputSection) inputSection.classList.remove("hidden");
        const lampContainer = document.querySelector(".lamp-container");
        if (lampContainer) lampContainer.classList.remove("hidden");
        userInput.value = "";
        userInput.style.height = "auto";
        userInput.focus();
    });

    continueBtn?.addEventListener("click", () => {
        // Clear any pending typing
        if (typingTimeout) {
            clearTimeout(typingTimeout);
            typingTimeout = null;
        }
        contentQueue = '';

        // Hide output and show chat interface with smooth transition
        askAgainSection.classList.add("hidden");

        // Use the stored AI response (guaranteed to have complete content)
        let aiResponseText = lastAIResponse || outputContent.innerHTML;
        let questionsText = '';

        // Extract questions from the AI response
        if (aiResponseText) {
            const questionsMatch = aiResponseText.match(/(#{1,6}\s*Questions for You[\s\S]*)/i);
            if (questionsMatch) {
                questionsText = questionsMatch[1];
            }
        }

        // Smooth transition: fade out output, fade in chat
        outputContent.parentElement.style.transition = 'opacity 0.2s ease';
        outputContent.parentElement.style.opacity = '0';

        setTimeout(() => {
            outputContent.innerHTML = "";
            outputContent.parentElement.classList.remove("visible");
            outputContent.parentElement.classList.add("hidden");
            outputContent.parentElement.style.opacity = '1';

            // Show chat interface
            chatSection.classList.remove("hidden");
            chatInputContainer.classList.remove("hidden");

            // Add user's original question first
            if (initialUserPrompt) {
                addChatMessage(initialUserPrompt, true);
            }

            // Add previous AI response to chat (gift suggestions)
            if (aiResponseText && questionsText) {
                // Remove questions from the main response for cleaner chat
                const cleanResponse = aiResponseText.replace(/---\s*\n*#{1,6}\s*Questions for You[\s\S]*/i, '').trim();
                if (cleanResponse) {
                    addChatMessage(cleanResponse, false);
                }
            }

            // Add questions as follow-up message
            if (questionsText) {
                const cleanQuestions = questionsText.replace(/<h[3456][^>]*>Questions for You<\/h[3456]>/gi, '').trim();
                if (cleanQuestions) {
                    addChatMessage(cleanQuestions, false);
                }
            }

            // Clear old questions section
            questionsContent.innerHTML = "";
            questionsAnswer.value = "";
            questionsAnswer.style.height = "auto";

            const inputSection = document.querySelector(".input-section");
            if (inputSection) inputSection.classList.add("hidden");
            const lampContainer = document.querySelector(".lamp-container");
            if (lampContainer) lampContainer.classList.add("hidden");

            chatInput.value = "";
            chatInput.style.height = "auto";
            chatInput.focus();
        }, 200);

        // Keep sessionId - conversation context preserved
    });

    // Helper function to extract "Questions for You" section from HTML
    function extractQuestions(html) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        
        // Find the "Questions for You" heading
        const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
        let questionsHeading = null;
        
        for (const heading of headings) {
            if (heading.textContent.toLowerCase().includes('questions for you')) {
                questionsHeading = heading;
                break;
            }
        }
        
        if (!questionsHeading) {
            return html; // Return full content if no questions section found
        }
        
        // Get the heading and all following siblings
        let questionsContent = questionsHeading.outerHTML;
        let sibling = questionsHeading.nextElementSibling;
        
        while (sibling) {
            questionsContent += sibling.outerHTML;
            sibling = sibling.nextElementSibling;
        }
        
        return questionsContent;
    }

    submitAnswerBtn?.addEventListener("click", () => {
        const answer = questionsAnswer.value.trim();
        if (!answer) return;

        // Clear any pending typing
        if (typingTimeout) {
            clearTimeout(typingTimeout);
            typingTimeout = null;
        }
        contentQueue = '';

        // Hide questions section, show input and lamp
        questionsSection.classList.add("hidden");
        const inputSection = document.querySelector(".input-section");
        if (inputSection) inputSection.classList.remove("hidden");
        const lampContainer = document.querySelector(".lamp-container");
        if (lampContainer) lampContainer.classList.remove("hidden");

        // Set the answer as the user input and auto-submit
        userInput.value = answer;
        userInput.style.height = "auto";
        giftForm.requestSubmit();
    });

    // Enter key to submit answer (Shift+Enter for new line)
    questionsAnswer?.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (questionsAnswer.value.trim()) {
                submitAnswerBtn.click();
            }
        }
    });

    // Chat input handler
    chatSubmitBtn?.addEventListener("click", handleChatSubmit);

    chatInput?.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (chatInput.value.trim()) {
                chatSubmitBtn.click();
            }
        }
    });

    chatInput?.addEventListener("input", () => autoResizeTextarea(chatInput));

    answerQuestionsBtn?.addEventListener("click", () => {
        // Clear any pending typing
        if (typingTimeout) {
            clearTimeout(typingTimeout);
            typingTimeout = null;
        }
        contentQueue = '';

        // Hide output and show chat interface with smooth transition
        askAgainSection.classList.add("hidden");

        // Use the stored AI response (guaranteed to have complete content)
        let aiResponseText = lastAIResponse || outputContent.innerHTML;
        let questionsText = '';

        // Extract questions from the AI response
        if (aiResponseText) {
            const questionsMatch = aiResponseText.match(/(#{1,6}\s*Questions for You[\s\S]*)/i);
            if (questionsMatch) {
                questionsText = questionsMatch[1];
            }
        }

        // Smooth transition: fade out output, fade in chat
        outputContent.parentElement.style.transition = 'opacity 0.2s ease';
        outputContent.parentElement.style.opacity = '0';

        setTimeout(() => {
            outputContent.innerHTML = "";
            outputContent.parentElement.classList.remove("visible");
            outputContent.parentElement.classList.add("hidden");
            outputContent.parentElement.style.opacity = '1';

            // Show chat interface
            chatSection.classList.remove("hidden");
            chatInputContainer.classList.remove("hidden");

            // Add user's original question first
            if (initialUserPrompt) {
                addChatMessage(initialUserPrompt, true);
            }

            // Add previous AI response to chat (gift suggestions)
            if (aiResponseText && questionsText) {
                // Remove questions from the main response for cleaner chat
                const cleanResponse = aiResponseText.replace(/---\s*\n*#{1,6}\s*Questions for You[\s\S]*/i, '').trim();
                if (cleanResponse) {
                    addChatMessage(cleanResponse, false);
                }
            }

            // Add questions as follow-up message
            if (questionsText) {
                const cleanQuestions = questionsText.replace(/<h[3456][^>]*>Questions for You<\/h[3456]>/gi, '').trim();
                if (cleanQuestions) {
                    addChatMessage(cleanQuestions, false);
                }
            }

            // Clear old questions section
            questionsContent.innerHTML = "";
            questionsAnswer.value = "";
            questionsAnswer.style.height = "auto";

            const inputSection = document.querySelector(".input-section");
            if (inputSection) inputSection.classList.add("hidden");
            const lampContainer = document.querySelector(".lamp-container");
            if (lampContainer) lampContainer.classList.add("hidden");

            chatInput.value = "";
            chatInput.style.height = "auto";
            chatInput.focus();
        }, 200);

        // Keep sessionId - conversation context preserved
    });

    moreIdeasBtn?.addEventListener("click", async () => {
        // Clear any pending typing
        if (typingTimeout) {
            clearTimeout(typingTimeout);
            typingTimeout = null;
        }
        contentQueue = '';

        // Hide buttons and show loading
        askAgainSection.classList.add("hidden");
        const lampContainer = document.querySelector(".lamp-container");
        if (lampContainer) lampContainer.classList.remove("hidden");

        const lampButton = document.getElementById("lamp-button");
        const lampText = document.querySelector(".lamp-text");
        lampButton.disabled = true;
        lampButton.classList.remove("compact");
        lampButton.classList.add("loading");
        lampText.textContent = "Generating More Ideas...";

        // Clear output for new stream
        outputContent.innerHTML = '';
        outputContent.parentElement.classList.remove("hidden");
        outputContent.parentElement.classList.add("visible");

        // Show progress bar
        progressContainer.classList.remove("hidden");
        const startTime = Date.now();
        const maxProgressTime = 15000;
        let progressInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min((elapsed / maxProgressTime) * 100, 95);
            progressFill.style.width = `${progress}%`;
        }, 100);

        let fullContent = '';
        let reader = null;
        let contentReceived = false;

        // Send request for more ideas
        try {
            const response = await fetch(`${API_URL}/api/gift`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userPrompt: "Generate more gift ideas based on the previous conversation. Provide different suggestions than before.",
                    sessionId
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'API error');
            }

            reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value);
                    buffer += chunk;

                    const lines = buffer.split('\n\n');
                    buffer = lines.pop() || '';

                    for (const line of lines) {
                        const trimmedLine = line.trim();
                        if (trimmedLine.startsWith('data: ')) {
                            const dataStr = trimmedLine.slice(6).trim();

                            if (dataStr === '[DONE]') {
                                if (progressInterval) {
                                    clearInterval(progressInterval);
                                    progressInterval = null;
                                }

                                progressFill.style.width = "100%";
                                setTimeout(() => {
                                    progressContainer.classList.add("hidden");
                                    const lampContainer = document.querySelector(".lamp-container");
                                    if (lampContainer) lampContainer.classList.add("hidden");
                                    setTimeout(() => {
                                        progressFill.style.width = "0%";
                                    }, 500);
                                }, 300);

                                if (typingTimeout) {
                                    clearTimeout(typingTimeout);
                                    typingTimeout = null;
                                }
                                if (contentQueue.length > 0) {
                                    fullContent += contentQueue;
                                    const html = marked.parse(fullContent);
                                    const safeHTML = DOMPurify.sanitize(html);
                                    outputContent.innerHTML = safeHTML;
                                    contentQueue = '';
                                }

                                askAgainSection.classList.remove("hidden");
                                break;
                            }

                            try {
                                const data = JSON.parse(dataStr);

                                if (data.sessionId) {
                                    sessionId = data.sessionId;
                                    localStorage.setItem('giftGenieSessionId', sessionId);
                                }

                                if (data.content) {
                                    if (!contentReceived) {
                                        contentReceived = true;
                                        if (progressInterval) {
                                            clearInterval(progressInterval);
                                            progressInterval = null;
                                        }

                                        progressFill.style.width = "100%";
                                        setTimeout(() => {
                                            progressContainer.classList.add("hidden");
                                            const lampContainer = document.querySelector(".lamp-container");
                                            if (lampContainer) lampContainer.classList.add("hidden");
                                            setTimeout(() => {
                                                progressFill.style.width = "0%";
                                            }, 500);
                                        }, 300);
                                    }

                                    typeContent(data.content);
                                } else if (data.error) {
                                    throw new Error(data.error);
                                }
                            } catch (parseErr) {
                                console.warn('Parse error on:', dataStr);
                            }
                        }
                    }
                }
            } finally {
                if (reader) reader.releaseLock();
            }

        } catch (error) {
            console.error("error: ", error);
            if (progressInterval) {
                clearInterval(progressInterval);
                progressInterval = null;
            }
            progressContainer.classList.add("hidden");
            const lampContainer = document.querySelector(".lamp-container");
            if (lampContainer) lampContainer.classList.add("hidden");

            if (typingTimeout) {
                clearTimeout(typingTimeout);
                typingTimeout = null;
            }
            contentQueue = '';

            outputContent.innerHTML = `<div class="error-box">
                <span class="error-icon">⚠️</span>
                <p><strong>Oops! The Genie is taking a nap.</strong></p>
                <p>${error.message}</p>
            </div>`;
            clearInterval(progressInterval);
            progressContainer.classList.add("hidden");
            progressFill.style.width = "0%";
            
            // Show standard continue button on error
            standardActions.classList.remove("hidden");
            quickActions.classList.add("hidden");
            askAgainSection.classList.remove("hidden");
        } finally {
            const lampContainer = document.querySelector(".lamp-container");
            if (lampContainer) lampContainer.classList.add("hidden");

            lampButton.classList.remove("loading");
            lampButton.classList.add("compact");
            lampText.textContent = "Rub the Lamp";
            lampButton.disabled = false;
        }
    });

    newConversationBtn?.addEventListener("click", () => {
        // Clear any pending typing
        if (typingTimeout) {
            clearTimeout(typingTimeout);
            typingTimeout = null;
        }
        contentQueue = '';
        lastAIResponse = '';
        initialUserPrompt = '';

        askAgainSection.classList.add("hidden");
        questionsSection.classList.add("hidden");
        chatSection.classList.add("hidden");
        clearChatMessages();
        questionsContent.innerHTML = "";
        questionsAnswer.value = "";
        const inputSection = document.querySelector(".input-section");
        if (inputSection) inputSection.classList.remove("hidden");
        const lampContainer = document.querySelector(".lamp-container");
        if (lampContainer) lampContainer.classList.remove("hidden");
        outputContent.innerHTML = "";
        outputContent.parentElement.classList.remove("visible");
        outputContent.parentElement.classList.add("hidden");
        userInput.value = "";
        userInput.style.height = "auto";
        userInput.placeholder = "e.g. My friend who loves candles has a birthday coming up in 3 days. 15-20 pounds budget. I live in...";
        userInput.focus();
        // Clear session to start fresh
        sessionId = null;
        localStorage.removeItem('giftGenieSessionId');
    });
}

// Function to show "Try Again" button for error responses
function showTryAgainButton() {
    // Create and show a try again button
    const tryAgainContainer = document.createElement('section');
    tryAgainContainer.className = 'ask-again-section';
    tryAgainContainer.id = 'try-again-section';
    tryAgainContainer.innerHTML = `
        <p class="ask-again-text">Let's try something else</p>
        <div class="action-buttons-group">
            <button id="try-again-btn" class="continue-btn">Try Again</button>
        </div>
    `;

    // Remove if already exists
    const existing = document.getElementById('try-again-section');
    if (existing) existing.remove();

    // Insert after output section
    const outputSection = document.querySelector('.output-section');
    outputSection.insertAdjacentElement('afterend', tryAgainContainer);

    // Add event listener
    document.getElementById('try-again-btn')?.addEventListener('click', () => {
        // Clear any pending typing
        if (typingTimeout) {
            clearTimeout(typingTimeout);
            typingTimeout = null;
        }
        contentQueue = '';
        initialUserPrompt = '';

        tryAgainContainer.remove();
        questionsSection.classList.add('hidden');
        chatSection.classList.add('hidden');
        clearChatMessages();
        questionsContent.innerHTML = '';
        questionsAnswer.value = '';
        const inputSection = document.querySelector('.input-section');
        if (inputSection) inputSection.classList.remove('hidden');
        const lampContainer = document.querySelector('.lamp-container');
        if (lampContainer) lampContainer.classList.remove('hidden');
        outputContent.innerHTML = '';
        outputContent.parentElement.classList.remove('visible');
        outputContent.parentElement.classList.add('hidden');
        userInput.value = '';
        userInput.style.height = 'auto';
        userInput.placeholder = 'Try again with something gift-related...';
        userInput.focus();
        // Keep sessionId - conversation context preserved
    });
}

// Function to show error message
function showError(message) {
    // Hide progress and lamp
    progressContainer.classList.add('hidden');
    progressFill.style.width = '0%';
    
    const lampContainer = document.querySelector('.lamp-container');
    if (lampContainer) lampContainer.classList.add('hidden');
    
    const inputSection = document.querySelector('.input-section');
    if (inputSection) inputSection.classList.remove('hidden');

    // Show error message
    outputContent.innerHTML = `<div class="error-box">
        <span class="error-icon">📡</span>
        <p><strong>No Internet Connection</strong></p>
        <p>${message}</p>
    </div>`;
    
    outputContent.parentElement.classList.remove('hidden');
    outputContent.parentElement.classList.add('visible');
    
    // Reset lamp button
    const lampButton = document.getElementById('lamp-button');
    const lampText = document.querySelector('.lamp-text');
    lampButton.classList.remove('loading');
    lampButton.classList.add('compact');
    lampText.textContent = 'Rub the Lamp';
    lampButton.disabled = false;
    
    // Show standard actions
    standardActions.classList.remove('hidden');
    quickActions.classList.add('hidden');
    askAgainSection.classList.remove('hidden');
}

// Handle chat message submission
async function handleChatSubmit() {
    const message = chatInput.value.trim();
    if (!message) return;

    // Check internet connection
    if (!navigator.onLine) {
        // Show error in chat
        addChatMessage("📡 No internet connection. Please check your connection and try again.", false);
        chatInput.disabled = false;
        chatSubmitBtn.disabled = false;
        chatInput.focus();
        return;
    }

    // Add user message to chat
    addChatMessage(message, true);
    
    // Clear input
    chatInput.value = '';
    chatInput.style.height = 'auto';
    
    // Disable input while waiting
    chatInput.disabled = true;
    chatSubmitBtn.disabled = true;
    
    // Show typing indicator immediately
    showTypingIndicator();
    
    let contentStarted = false;
    
    try {
        const response = await fetch(`${API_URL}/api/gift`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userPrompt: message,
                sessionId
            }),
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'API error');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullContent = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            buffer += chunk;

            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmedLine = line.trim();
                if (trimmedLine.startsWith('data: ')) {
                    const dataStr = trimmedLine.slice(6).trim();

                    if (dataStr === '[DONE]') {
                        // Add complete AI response to chat
                        if (fullContent) {
                            addChatMessage(fullContent, false);
                        }
                        break;
                    }

                    try {
                        const data = JSON.parse(dataStr);

                        if (data.sessionId) {
                            sessionId = data.sessionId;
                            localStorage.setItem('giftGenieSessionId', sessionId);
                        }

                        if (data.content && !contentStarted) {
                            // First content received - remove typing indicator
                            contentStarted = true;
                            removeTypingIndicator();
                            fullContent += data.content;
                        } else if (data.content) {
                            fullContent += data.content;
                        } else if (data.error) {
                            throw new Error(data.error);
                        }
                    } catch (parseErr) {
                        console.warn('Parse error on:', dataStr);
                    }
                }
            }
        }

        if (reader) reader.releaseLock();

    } catch (error) {
        console.error("error: ", error);
        removeTypingIndicator();
        
        // Show error in chat
        addChatMessage(`⚠️ Error: ${error.message}`, false);
    } finally {
        // Re-enable input
        chatInput.disabled = false;
        chatSubmitBtn.disabled = false;
        chatInput.focus();
    }
}

// Keep all your existing code + this new handleGiftRequest
async function handleGiftRequest(e) {
    e.preventDefault();
    const userPrompt = userInput.value.trim();
    if (!userPrompt) return;

    // Check internet connection
    if (!navigator.onLine) {
        showError("No internet connection. The Genie needs to connect to the AI server to work. Please check your connection and try again.");
        return;
    }

    // Store the initial user prompt for chat transition (only if not in chat mode)
    const isChatActive = !chatSection.classList.contains('hidden');
    if (!isChatActive) {
        initialUserPrompt = userPrompt;
    }

    // If chat section is visible, add user message to chat
    if (isChatActive) {
        addChatMessage(userPrompt, true);
        // Show typing indicator in chat mode while waiting for stream
        showTypingIndicator();
    }

    // UI: Loading state
    const lampButton = document.getElementById("lamp-button");
    const lampText = document.querySelector(".lamp-text");
    lampButton.disabled = true;
    lampButton.classList.remove("compact");
    lampButton.classList.add("loading");
    lampText.textContent = "Summoning Gift Ideas...";

    // ✅ Show output container for streaming (empty)
    outputContent.innerHTML = '';  // Clear
    outputContent.parentElement.classList.remove("hidden");
    outputContent.parentElement.classList.add("visible");

    // Move form to top when response is coming
    giftForm.classList.add('response-active');

    // Hide only the input section, keep lamp and progress bar visible
    const inputSection = document.querySelector(".input-section");
    if (inputSection) inputSection.classList.add("hidden");

    askAgainSection.classList.add("hidden");  // Hide until [DONE]

    // Show progress bar with smooth animation (max 15 seconds or until stream starts)
    progressContainer.classList.remove("hidden");
    const startTime = Date.now();
    const maxProgressTime = 15000; // 15 seconds max
    let progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / maxProgressTime) * 100, 95);  // Cap at 95%
        progressFill.style.width = `${progress}%`;
    }, 100);

    let fullContent = '';  // Accumulate for Markdown
    let reader = null;
    let contentReceived = false;  // Track if we've received content

    // Typing effect function - renders content with delay
    function typeContent(content) {
        contentQueue += content;
        
        if (typingTimeout) return;  // Already typing
        
        function typeNextChar() {
            if (contentQueue.length > 0) {
                // If queue is getting long, increase chunk size to catch up
                let chunkSize = 1;
                if (contentQueue.length > 50) chunkSize = 3;
                if (contentQueue.length > 100) chunkSize = 5;
                if (contentQueue.length > 200) chunkSize = 10;

                const chunk = contentQueue.slice(0, chunkSize);
                contentQueue = contentQueue.slice(chunkSize);
                
                fullContent += chunk;
                const html = marked.parse(fullContent);
                const safeHTML = DOMPurify.sanitize(html);
                outputContent.innerHTML = safeHTML;
                outputContent.scrollTop = outputContent.scrollHeight;
                
                // Adjust speed based on queue length (faster if queue is long)
                let typingSpeed = Math.random() * 30 + 10;
                if (contentQueue.length > 100) typingSpeed = 5;
                
                typingTimeout = setTimeout(typeNextChar, typingSpeed);
            } else {
                typingTimeout = null;
            }
        }
        
        typeNextChar();
    }

    try {
        const response = await fetch(`${API_URL}/api/gift`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userPrompt, sessionId }),
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'API error');
        }

        // ✅ SSE Streaming Reader
        reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';  // Buffer for incomplete SSE lines

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                // Decode chunk and append to buffer
                const chunk = decoder.decode(value);
                buffer += chunk;

                // Split complete SSE messages (\n\n delimiter)
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';  // Keep incomplete line in buffer

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (trimmedLine.startsWith('data: ')) {
                        const dataStr = trimmedLine.slice(6).trim();

                        if (dataStr === '[DONE]') {
                            console.log('✅ DONE');
                            // ✅ Stream done - ensure lamp and progress bar are finished and hidden
                            if (progressInterval) {
                                clearInterval(progressInterval);
                                progressInterval = null;
                            }

                            // Finish progress bar smoothly
                            progressFill.style.width = "100%";
                            setTimeout(() => {
                                progressContainer.classList.add("hidden");
                                const lampContainer = document.querySelector(".lamp-container");
                                if (lampContainer) lampContainer.classList.add("hidden");

                                // Reset for next time after it's hidden
                                setTimeout(() => {
                                    progressFill.style.width = "0%";
                                }, 500);
                            }, 300);

                            // Clear any pending typing and flush remaining content
                            if (typingTimeout) {
                                clearTimeout(typingTimeout);
                                typingTimeout = null;
                            }
                            // Flush any remaining queued content
                            if (contentQueue.length > 0) {
                                fullContent += contentQueue;
                                const html = marked.parse(fullContent);
                                const safeHTML = DOMPurify.sanitize(html);
                                outputContent.innerHTML = safeHTML;
                                contentQueue = '';
                            }
                            
                            // Store complete response for chat transition
                            lastAIResponse = fullContent;

                            // Check if the response is the "don't know how to help" message
                            const isErrorResponse = fullContent.toLowerCase().includes("don't know how to help");

                            if (isErrorResponse) {
                                // Show try again button instead of continue/new conversation buttons
                                showTryAgainButton();
                            } else {
                                askAgainSection.classList.remove("hidden");
                                // Default to standard actions if no metadata was received
                                standardActions.classList.remove("hidden");
                                quickActions.classList.add("hidden");
                                
                                // If chat is active, add AI response to chat
                                if (isChatActive && fullContent) {
                                    addChatMessage(fullContent, false);
                                }
                            }
                            break;
                        }

                        try {
                            const data = JSON.parse(dataStr);

                            if (data.sessionId) {
                                sessionId = data.sessionId;
                                localStorage.setItem('giftGenieSessionId', sessionId);
                            }

                            if (data.content) {
                                // First content received - finish progress bar immediately and remove typing indicator
                                if (!contentReceived) {
                                    contentReceived = true;
                                    if (progressInterval) {
                                        clearInterval(progressInterval);
                                        progressInterval = null;
                                    }

                                    // Remove typing indicator if in chat mode
                                    if (isChatActive) {
                                        removeTypingIndicator();
                                    }

                                    // Finish progress bar smoothly
                                    progressFill.style.width = "100%";
                                    setTimeout(() => {
                                        progressContainer.classList.add("hidden");
                                        const lampContainer = document.querySelector(".lamp-container");
                                        if (lampContainer) lampContainer.classList.add("hidden");

                                        // Reset for next time after it's hidden
                                        setTimeout(() => {
                                            progressFill.style.width = "0%";
                                        }, 500);
                                    }, 300);
                                }

                                // Use typing effect for streaming content
                                typeContent(data.content);
                            } else if (data.metadata) {
                                // Handle metadata (e.g., hasQuestions)
                                if (data.metadata.hasQuestions) {
                                    quickActions.classList.remove("hidden");
                                    standardActions.classList.add("hidden");
                                } else {
                                    standardActions.classList.remove("hidden");
                                    quickActions.classList.add("hidden");
                                }
                            } else if (data.error) {
                                throw new Error(data.error);
                            }
                        } catch (parseErr) {
                            console.warn('Parse error on:', dataStr);
                        }
                    }
                }
            }
        } finally {
            if (reader) reader.releaseLock();
        }

    } catch (error) {
        console.error("error: ", error);
        // Ensure progress and lamp are handled on error too
        if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
        }
        progressContainer.classList.add("hidden");
        const lampContainer = document.querySelector(".lamp-container");
        if (lampContainer) lampContainer.classList.add("hidden");

        // Remove typing indicator if in chat mode
        if (isChatActive) {
            removeTypingIndicator();
        }

        // Clear any pending typing
        if (typingTimeout) {
            clearTimeout(typingTimeout);
            typingTimeout = null;
        }
        contentQueue = '';

        outputContent.innerHTML = `<div class="error-box">
            <span class="error-icon">⚠️</span>
            <p><strong>Oops! The Genie is taking a nap.</strong></p>
            <p>${error.message}</p>
        </div>`;
        showTryAgainButton();
        // Hide progress bar on error
        clearInterval(progressInterval);
        progressContainer.classList.add("hidden");
        progressFill.style.width = "0%";
    } finally {
        // Keep lamp hidden - only show when user clicks continue/new conversation
        const lampContainer = document.querySelector(".lamp-container");
        if (lampContainer) lampContainer.classList.add("hidden");
        
        lampButton.classList.remove("loading");
        lampButton.classList.add("compact");
        lampText.textContent = "Rub the Lamp";
        lampButton.disabled = false;
        userInput.value = "";
        userInput.style.height = "auto";
    }
}


start();
