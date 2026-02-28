import { marked } from "marked";
import DOMPurify from "dompurify";
import { autoResizeTextarea, setLoading } from "./utils.js";
const API_URL = import.meta.env.VITE_NODE_URL || 'http://localhost:4000';  // Dev fallback

// Store session ID to maintain conversation history per user
let sessionId = localStorage.getItem('giftGenieSessionId') || null;

// 🎬 DEMO MODE: Set to true to show typing effect on first focus (for video demo)
const DEMO_MODE = true;
const DEMO_TEXT = "My dog's birthday is in a week. Spoiled golden retriever, loves squeaky toys and stealing socks. Budget £15-20.";
let demoTyped = false;


// Get UI elements
const giftForm = document.getElementById("gift-form");
const userInput = document.getElementById("user-input");
const outputContent = document.getElementById("output-content");
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

// Global typing effect variables
let typingTimeout = null;
let contentQueue = '';

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

        mainContent.classList.add("hidden");
        introSection.classList.remove("hidden");
        document.body.style.overflowY = "hidden";
        userInput.value = "";
        userInput.style.height = "auto";
        outputContent.innerHTML = "";
        outputContent.parentElement.classList.remove("visible");
        outputContent.parentElement.classList.add("hidden");
        askAgainSection.classList.add("hidden");
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
        
        outputContent.innerHTML = "";
        outputContent.parentElement.classList.remove("visible");
        outputContent.parentElement.classList.add("hidden");
        askAgainSection.classList.add("hidden");
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

        askAgainSection.classList.add("hidden");
        const inputSection = document.querySelector(".input-section");
        if (inputSection) inputSection.classList.remove("hidden");
        const lampContainer = document.querySelector(".lamp-container");
        if (lampContainer) lampContainer.classList.remove("hidden");
        outputContent.innerHTML = "";
        outputContent.parentElement.classList.remove("visible");
        outputContent.parentElement.classList.add("hidden");
        userInput.value = "";
        userInput.style.height = "auto";
        userInput.placeholder = "Continue your conversation...";
        userInput.focus();
        // Keep sessionId - conversation context preserved
    });

    newConversationBtn?.addEventListener("click", () => {
        // Clear any pending typing
        if (typingTimeout) {
            clearTimeout(typingTimeout);
            typingTimeout = null;
        }
        contentQueue = '';

        askAgainSection.classList.add("hidden");
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

// Keep all your existing code + this new handleGiftRequest
async function handleGiftRequest(e) {
    e.preventDefault();
    const userPrompt = userInput.value.trim();
    if (!userPrompt) return;

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
                                // First content received - finish progress bar immediately
                                if (!contentReceived) {
                                    contentReceived = true;
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
                                }

                                // Use typing effect for streaming content
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
        // Ensure progress and lamp are handled on error too
        if (progressInterval) {
            clearInterval(progressInterval);
            progressInterval = null;
        }
        progressContainer.classList.add("hidden");
        const lampContainer = document.querySelector(".lamp-container");
        if (lampContainer) lampContainer.classList.add("hidden");

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
        askAgainSection.classList.remove("hidden");
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
