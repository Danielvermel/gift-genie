import { marked } from "marked";
import DOMPurify from "dompurify";
import { autoResizeTextarea, setLoading } from "./utils.js";

// Get UI elements
const giftForm = document.getElementById("gift-form");
const userInput = document.getElementById("user-input");
const outputContent = document.getElementById("output-content");
const getStartedBtn = document.getElementById("get-started-btn");
const mainContent = document.getElementById("main-content");
const introSection = document.querySelector(".intro-section");
const progressContainer = document.getElementById("progress-container");
const progressFill = document.getElementById("progress-fill");

function start() {
    // Setup UI event listeners
    userInput.addEventListener("input", () => autoResizeTextarea(userInput));
    giftForm.addEventListener("submit", handleGiftRequest);
    
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
        userInput.scrollIntoView({ behavior: "smooth", block: "center" });
        userInput.focus();
    });
}

async function handleGiftRequest(e) {
    // Prevent default form submission
    e.preventDefault();

    // Get user input, trim whitespace, exit if empty
    const userPrompt = userInput.value.trim();
    if (!userPrompt) return;

    // Disable lamp button and show loading state
    const lampButton = document.getElementById("lamp-button");
    const lampText = document.querySelector(".lamp-text");
    lampButton.disabled = true;
    lampButton.classList.remove("compact");
    lampButton.classList.add("loading");
    lampText.textContent = "Summoning Gift Ideas...";

    // Show progress bar, hide output
    progressContainer.classList.remove("hidden");
    outputContent.parentElement.classList.add("hidden");
    
    // Start progress animation (assume 35 seconds)
    const startTime = Date.now();
    const estimatedDuration = 35000; // 35 seconds
    
    const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / estimatedDuration) * 100, 95);
        progressFill.style.width = `${progress}%`;
    }, 100);

    try {
        // TODO: Step 1 — send fetch request to /api/gift
        const response = await fetch("/api/gift", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userPrompt }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message);
        }

        // Complete progress bar
        clearInterval(progressInterval);
        progressFill.style.width = "100%";

        // TODO: Step 5 — parse response and extract giftSuggestions
        const giftSuggestions = data.giftSuggestions;

        // Convert Markdown to HTML
        const html = marked.parse(giftSuggestions);

        // Sanitize the HTML to prevent XSS attacks
        const safeHTML = DOMPurify.sanitize(html);

        // Render the result
        outputContent.innerHTML = safeHTML;
        
        // Show output
        outputContent.parentElement.classList.remove("hidden");
        outputContent.parentElement.classList.add("visible");
    } catch (error) {
        // Log the error for debugging
        console.error("error: ", error);

        // Display friendly error message
        outputContent.textContent = "Sorry, I can't access what I need right now. Please try again in a bit.";
        outputContent.parentElement.classList.remove("hidden");
        outputContent.parentElement.classList.add("visible");
    } finally {
        // Restore lamp to compact state
        lampButton.classList.remove("loading");
        lampButton.classList.add("compact");
        lampText.textContent = "Rub the Lamp";
        lampButton.disabled = false;
        
        // Hide progress bar after a short delay
        setTimeout(() => {
            progressContainer.classList.add("hidden");
            progressFill.style.width = "0%";
        }, 500);
    }
}

start();
