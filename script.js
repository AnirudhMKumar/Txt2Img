// DOM Elements
const promptInput = document.getElementById('prompt-input');
const charCount = document.querySelector('.char-count');
const clearBtn = document.getElementById('clear-btn');
const enhanceBtn = document.getElementById('enhance-btn');
const generateBtn = document.getElementById('generate-btn');
const modelSelect = document.getElementById('model-select');
const styleSelect = document.getElementById('style-select');
const suggestionChips = document.querySelectorAll('.chip');
const resultContainer = document.getElementById('result-container');
const placeholder = document.getElementById('placeholder');
const resultWrapper = document.getElementById('result-wrapper');
const generatedImage = document.getElementById('generated-image');
const promptDisplay = document.getElementById('prompt-display');
const modelDisplay = document.getElementById('model-display');
const timestampDisplay = document.getElementById('timestamp-display');
const downloadBtn = document.getElementById('download-btn');
const copyBtn = document.getElementById('copy-btn');
const fullscreenBtn = document.getElementById('fullscreen-btn');
const galleryGrid = document.getElementById('gallery-grid');
const clearHistoryBtn = document.getElementById('clear-history');
const modal = document.getElementById('image-modal');
const modalImage = document.getElementById('modal-image');
const modalClose = document.getElementById('modal-close');
const modalBackdrop = document.querySelector('.modal-backdrop');
const toastContainer = document.getElementById('toast-container');
const themeToggle = document.getElementById('theme-toggle');
const negativeToggle = document.getElementById('negative-toggle');
const negativeBody = document.getElementById('negative-prompt-body');
const negativeInput = document.getElementById('negative-input');
const loaderText = document.getElementById('loader-text');

// State
let isGenerating = false;
let generationHistory = JSON.parse(localStorage.getItem('imageHistory')) || [];
let loadingMsgInterval = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadHistory();
    setupEventListeners();
    updateCharCount();
    initTheme();
});

// Event Listeners
function setupEventListeners() {
    promptInput.addEventListener('input', updateCharCount);
    promptInput.addEventListener('keydown', handleKeydown);
    clearBtn.addEventListener('click', clearInput);
    generateBtn.addEventListener('click', generateImage);
    enhanceBtn.addEventListener('click', enhancePrompt);

    suggestionChips.forEach(chip => {
        chip.addEventListener('click', () => {
            promptInput.value = chip.textContent;
            updateCharCount();
            promptInput.focus();
        });
    });

    downloadBtn.addEventListener('click', downloadImage);
    copyBtn.addEventListener('click', copyImageToClipboard);
    fullscreenBtn.addEventListener('click', () => openFullscreen());

    modalClose.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    clearHistoryBtn.addEventListener('click', clearHistory);

    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);

    // Negative prompt toggle
    negativeToggle.addEventListener('click', () => {
        const isOpen = negativeBody.style.display !== 'none';
        negativeBody.style.display = isOpen ? 'none' : 'block';
        negativeToggle.classList.toggle('open', !isOpen);
    });
}


// Character Count
function updateCharCount() {
    const length = promptInput.value.length;
    charCount.textContent = `${length} / 500`;

    if (length > 450) {
        charCount.style.color = 'var(--warning)';
    } else if (length === 500) {
        charCount.style.color = 'var(--error)';
    } else {
        charCount.style.color = 'var(--text-muted)';
    }
}

// Clear Input
function clearInput() {
    promptInput.value = '';
    updateCharCount();
    promptInput.focus();
}

// Keyboard Shortcuts
function handleKeydown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        generateImage();
    }
}

// ─── Prompt Enhancer (uses puter.ai.chat) ───────────────────────────────────

async function enhancePrompt() {
    const prompt = promptInput.value.trim();

    if (!prompt) {
        showToast('Type a prompt first, then enhance it', 'warning');
        promptInput.focus();
        return;
    }

    if (prompt.length < 3) {
        showToast('Prompt is too short to enhance', 'warning');
        return;
    }

    // Set loading state on the enhance button
    enhanceBtn.classList.add('loading');
    enhanceBtn.disabled = true;

    try {
        const systemPrompt = [
            'You are an expert prompt engineer for AI image generation.',
            'The user will give you a short image description.',
            'Rewrite it into a detailed, vivid prompt optimized for AI image generators.',
            'Add artistic details like lighting, mood, composition, colors, and style.',
            'Keep it under 400 characters. Return ONLY the enhanced prompt, nothing else.',
            'Do not add any explanation, quotes, or labels.'
        ].join(' ');

        const response = await puter.ai.chat([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
        ]);

        // Extract the text from the response
        const enhanced = (response && typeof response === 'object')
            ? (response.message?.content || response.text || response.toString())
            : String(response);

        const cleanText = enhanced.replace(/^"|"$/g, '').trim();

        if (cleanText && cleanText.length > 0) {
            promptInput.value = cleanText.substring(0, 500);
            updateCharCount();
            showToast('Prompt enhanced! ✨', 'success');

            // Subtle highlight animation on the textarea
            promptInput.classList.add('enhanced-flash');
            setTimeout(() => promptInput.classList.remove('enhanced-flash'), 1000);
        } else {
            showToast('Could not enhance prompt. Try again.', 'warning');
        }

    } catch (error) {
        console.error('Enhance error:', error);
        showToast('Failed to enhance prompt. Please try again.', 'error');
    } finally {
        enhanceBtn.classList.remove('loading');
        enhanceBtn.disabled = false;
    }
}

// ─── Puter.js Image Generation ──────────────────────────────────────────────

async function generateImage() {
    const prompt = promptInput.value.trim();

    if (!prompt) {
        showToast('Please enter a description for your image', 'warning');
        promptInput.focus();
        return;
    }

    if (isGenerating) return;

    isGenerating = true;
    setLoadingState(true);

    try {
        // Build prompt (append optional style)
        let fullPrompt = prompt;
        const style = styleSelect.value;
        if (style) {
            fullPrompt += `, ${style} style`;
        }

        // Read selected model & provider
        const selectedOption = modelSelect.options[modelSelect.selectedIndex];
        const model = modelSelect.value;
        const provider = selectedOption.dataset.provider;

        console.log(`🎨 Generating with model="${model}", provider="${provider}"`);
        console.log(`📝 Prompt: "${fullPrompt}"`);

        // Append negative prompt if present
        const negPrompt = negativeInput.value.trim();
        if (negPrompt) {
            fullPrompt += `. Avoid: ${negPrompt}`;
        }

        // Build API options
        const apiOptions = { model };
        if (provider) {
            apiOptions.provider = provider;
        }

        // Call Puter.js txt2img
        const imgElement = await puter.ai.txt2img(fullPrompt, apiOptions);

        // The returned element's .src is already a data URL
        const dataUrl = imgElement.src;

        if (!dataUrl) {
            throw new Error('No image data returned from API');
        }

        console.log('✅ Image generated successfully');

        // Display result
        displayResult(dataUrl, prompt, model);

        // Save to gallery history
        saveToHistory({
            dataUrl: dataUrl,
            prompt: prompt,
            fullPrompt: fullPrompt,
            model: selectedOption.text,
            provider: provider,
            timestamp: new Date().toISOString()
        });

        showToast('Image generated successfully!', 'success');

    } catch (error) {
        console.error('❌ Generation error:', error);
        console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));

        let message = 'Failed to generate image. ';
        if (error.message) {
            message += error.message;
        } else {
            message += 'Please try again or pick a different model.';
        }
        showToast(message, 'error');
    } finally {
        isGenerating = false;
        setLoadingState(false);
    }
}



function displayResult(dataUrl, prompt, model) {
    generatedImage.src = dataUrl;
    generatedImage.alt = prompt; // Set dynamic alt text for SEO/Accessibility
    promptDisplay.textContent = prompt;
    modelDisplay.textContent = modelSelect.options[modelSelect.selectedIndex].text;
    timestampDisplay.textContent = new Date().toLocaleString();

    placeholder.style.display = 'none';
    resultWrapper.style.display = 'flex';
}

// ─── History / Gallery ──────────────────────────────────────────────────────

function saveToHistory(item) {
    generationHistory.unshift(item);

    // Keep only last 12 items (data URLs are large)
    if (generationHistory.length > 12) {
        generationHistory = generationHistory.slice(0, 12);
    }

    try {
        localStorage.setItem('imageHistory', JSON.stringify(generationHistory));
    } catch (e) {
        // Quota exceeded — trim older items
        console.warn('localStorage quota exceeded, trimming history');
        generationHistory = generationHistory.slice(0, 4);
        try {
            localStorage.setItem('imageHistory', JSON.stringify(generationHistory));
        } catch (e2) {
            // Still too large, just keep most recent
            generationHistory = [generationHistory[0]];
            localStorage.setItem('imageHistory', JSON.stringify(generationHistory));
        }
    }

    loadHistory();
}

function loadHistory() {
    if (generationHistory.length === 0) {
        galleryGrid.innerHTML = `
            <div class="gallery-empty">
                <p>No images generated yet. Create your first masterpiece above!</p>
            </div>
        `;
        clearHistoryBtn.style.display = 'none';
        return;
    }

    clearHistoryBtn.style.display = 'block';

    galleryGrid.innerHTML = generationHistory.map((item, index) => `
        <div class="gallery-item" data-index="${index}">
            <img src="${item.dataUrl || item.url}" alt="${escapeHtml(item.prompt)}" loading="lazy">
            <div class="gallery-item-overlay">
                <p class="gallery-item-prompt">${escapeHtml(item.prompt)}</p>
                <span class="gallery-item-date">${formatDate(item.timestamp)}</span>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.gallery-item').forEach(item => {
        item.addEventListener('click', () => {
            const index = parseInt(item.dataset.index);
            const historyItem = generationHistory[index];
            openFullscreen(historyItem.dataUrl || historyItem.url);
        });
    });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return minutes < 1 ? 'Just now' : `${minutes}m ago`;
    }
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours}h ago`;
    }
    if (diff < 604800000) {
        const days = Math.floor(diff / 86400000);
        return `${days}d ago`;
    }
    return date.toLocaleDateString();
}

function clearHistory() {
    if (confirm('Are you sure you want to clear all generated images from history?')) {
        generationHistory = [];
        localStorage.removeItem('imageHistory');
        loadHistory();
        showToast('History cleared', 'success');
    }
}

// ─── Download ───────────────────────────────────────────────────────────────

function downloadImage() {
    const src = generatedImage.src;
    if (!src || src === window.location.href) {
        showToast('No image to download', 'warning');
        return;
    }

    try {
        const link = document.createElement('a');
        link.href = src;
        link.download = `ai-generated-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Image downloaded!', 'success');
    } catch (error) {
        console.error('Download error:', error);
        window.open(src, '_blank');
        showToast('Opening image in new tab', 'warning');
    }
}

// ─── Copy to Clipboard ──────────────────────────────────────────────────────

async function copyImageToClipboard() {
    const src = generatedImage.src;
    if (!src || src === window.location.href) {
        showToast('No image to copy', 'warning');
        return;
    }

    try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = src;
        await new Promise((resolve) => { img.onload = resolve; });

        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);

        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        showToast('Image copied to clipboard!', 'success');
    } catch (error) {
        console.error('Copy error:', error);
        showToast('Failed to copy image. Try downloading instead.', 'error');
    }
}

// ─── Dark / Light Theme ─────────────────────────────────────────────────────

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
    const current = document.body.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    showToast(`Switched to ${next} mode`, 'success');
}

// ─── Rotating Loading Messages ──────────────────────────────────────────────

const loadingMessages = [
    'Mixing pixels…',
    'Painting your vision…',
    'Consulting the AI muse…',
    'Crafting masterpiece…',
    'Rendering imagination…',
    'Summoning creativity…',
    'Dreaming in color…',
    'Aligning neural pathways…',
    'Almost there…',
    'Sprinkling magic dust…',
    'Composing the scene…',
    'Fine-tuning details…'
];

function startLoadingMessages() {
    let index = 0;
    loaderText.textContent = loadingMessages[0];
    loadingMsgInterval = setInterval(() => {
        index = (index + 1) % loadingMessages.length;
        loaderText.textContent = loadingMessages[index];
    }, 2500);
}

function stopLoadingMessages() {
    if (loadingMsgInterval) {
        clearInterval(loadingMsgInterval);
        loadingMsgInterval = null;
    }
    loaderText.textContent = 'Generating…';
}


// ─── UI State Helpers ───────────────────────────────────────────────────────

function setLoadingState(loading) {
    if (loading) {
        generateBtn.classList.add('loading');
        generateBtn.disabled = true;
        placeholder.style.display = 'none';
        resultWrapper.style.display = 'flex';
        generatedImage.style.display = 'none';
        startLoadingMessages();

        const container = document.querySelector('.image-container');
        container.classList.add('image-loading');
    } else {
        generateBtn.classList.remove('loading');
        generateBtn.disabled = false;
        generatedImage.style.display = 'block';
        stopLoadingMessages();

        const container = document.querySelector('.image-container');
        container.classList.remove('image-loading');
    }
}

// ─── Fullscreen Modal ───────────────────────────────────────────────────────

function openFullscreen(url) {
    const imageUrl = (typeof url === 'string' && url) ? url : generatedImage.src;
    if (!imageUrl || imageUrl === window.location.href) {
        showToast('No image to display', 'warning');
        return;
    }

    modalImage.src = imageUrl;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    setTimeout(() => { modalImage.src = ''; }, 300);
}

// ─── Toast Notifications ────────────────────────────────────────────────────

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

// ─── Smooth scroll, observers, ripples ──────────────────────────────────────

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        }
    });
});

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

document.querySelectorAll('.feature-card, .gallery-item').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
});

document.addEventListener('visibilitychange', () => {
    const gradientBg = document.querySelector('.gradient-bg');
    gradientBg.style.animationPlayState = document.hidden ? 'paused' : 'running';
});

promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        e.preventDefault();
    }
});

// Ripple effect
document.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', function (e) {
        const rect = this.getBoundingClientRect();
        const ripple = document.createElement('span');
        ripple.style.cssText = `
            position: absolute;
            width: 20px; height: 20px;
            background: rgba(255,255,255,0.3);
            border-radius: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
            animation: ripple 0.6s ease-out;
            left: ${e.clientX - rect.left}px;
            top: ${e.clientY - rect.top}px;
        `;
        this.style.position = 'relative';
        this.style.overflow = 'hidden';
        this.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    });
});

const rippleStyle = document.createElement('style');
rippleStyle.textContent = `@keyframes ripple { to { width:200px; height:200px; opacity:0; } }`;
document.head.appendChild(rippleStyle);

console.log('🎨 AI Image Generator loaded — powered by Puter.js');
console.log('💡 Tip: Press Ctrl+Enter to quickly generate an image');
