/**
 * Translate Module
 * Handles subtitle translation using Google Gemini and Groq APIs
 */

const Translate = (function() {
    'use strict';

    // State
    let currentVideoFile = null;
    let currentSRTFile = null;
    let subtitles = [];
    let translatedSubtitles = [];
    let startTime = null;
    let apiProvider = 'gemini';

    // DOM Elements
    const videoInput = document.getElementById('video-input');
    const subtitleInput = document.getElementById('subtitle-input');
    const videoFileInfo = document.getElementById('video-file-info');
    const subtitleFileInfo = document.getElementById('subtitle-file-info');
    const sourceLanguage = document.getElementById('source-language');
    const targetLanguage = document.getElementById('target-language');
    const geminiApiKey = document.getElementById('gemini-api-key');
    const groqApiKey = document.getElementById('groq-api-key');
    const translateBtn = document.getElementById('translate-btn');
    const clearBtn = document.getElementById('clear-btn');
    const translateProgress = document.getElementById('translate-progress');
    const translateResults = document.getElementById('translate-results');
    const progressFill = document.getElementById('progress-fill');
    const progressPercent = document.getElementById('progress-percent');
    const progressText = document.getElementById('progress-text');
    const currentSubtitleEl = document.getElementById('current-subtitle');
    const subtitleRows = document.getElementById('subtitle-rows');
    const exportSrtBtn = document.getElementById('export-srt-btn');
    const exportJsonBtn = document.getElementById('export-json-btn');
    const saveFirebaseBtn = document.getElementById('save-firebase-btn');
    const videoPlayer = document.getElementById('video-player');
    const subtitleOverlay = document.getElementById('subtitle-overlay');
    const videoPreviewSection = document.getElementById('video-preview-section');

    // API radios
    const apiRadios = document.querySelectorAll('input[name="api-provider"]');

    /**
     * Initialize the module
     */
    function init() {
        setupEventListeners();
        loadApiKeysFromStorage();
    }

    /**
     * Set up event listeners
     */
    function setupEventListeners() {
        // File uploads
        videoInput.addEventListener('change', handleVideoUpload);
        subtitleInput.addEventListener('change', handleSubtitleUpload);

        // Drag and drop for video
        setupDragDrop('video-upload-zone', 'video-input', handleVideoUpload);
        
        // Drag and drop for subtitle
        setupDragDrop('subtitle-upload-zone', 'subtitle-input', handleSubtitleUpload);

        // API selection
        apiRadios.forEach(radio => {
            radio.addEventListener('change', handleApiChange);
        });

        // Clear button
        clearBtn.addEventListener('click', handleClear);

        // Translate button
        translateBtn.addEventListener('click', handleTranslate);

        // Export buttons
        exportSrtBtn.addEventListener('click', exportAsSRT);
        exportJsonBtn.addEventListener('click', exportAsJSON);
        saveFirebaseBtn.addEventListener('click', saveToFirebase);

        // Video player timeupdate
        videoPlayer.addEventListener('timeupdate', handleVideoTimeUpdate);
    }

    /**
     * Setup drag and drop
     */
    function setupDragDrop(zoneId, inputId, handler) {
        const zone = document.getElementById(zoneId);
        const input = document.getElementById(inputId);

        zone.addEventListener('click', () => input.click());

        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('drag-over');
        });

        zone.addEventListener('dragleave', () => {
            zone.classList.remove('drag-over');
        });

        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            if (e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                handleFileSelect(file, inputId);
            }
        });
    }

    /**
     * Handle API change
     */
    function handleApiChange(e) {
        apiProvider = e.target.value;
        
        document.getElementById('gemini-key-section').style.display = 
            apiProvider === 'gemini' ? 'block' : 'none';
        document.getElementById('groq-key-section').style.display = 
            apiProvider === 'groq' ? 'block' : 'none';
        
        updateTranslateButton();
    }

    /**
     * Handle video upload
     */
    function handleVideoUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const validTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
        if (!validTypes.includes(file.type)) {
            alert('Please upload a valid video file (MP4, WebM, or MOV)');
            return;
        }

        currentVideoFile = file;
        displayFileInfo(file, videoFileInfo);
        videoFileInfo.style.display = 'block';
        
        // Set video player source
        const videoUrl = URL.createObjectURL(file);
        videoPlayer.src = videoUrl;
        videoPreviewSection.style.display = 'block';
        
        updateTranslateButton();
    }

    /**
     * Handle subtitle upload
     */
    function handleSubtitleUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const fileName = file.name.toLowerCase();
        let text = '';
        
        currentSRTFile = file;
        displayFileInfo(file, subtitleFileInfo);
        subtitleFileInfo.style.display = 'block';
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                if (fileName.endsWith('.srt')) {
                    subtitles = SRTParser.parseSRT(e.target.result);
                } else if (fileName.endsWith('.vtt')) {
                    subtitles = parseVTT(e.target.result);
                } else if (fileName.endsWith('.json')) {
                    subtitles = parseJSON(e.target.result);
                } else {
                    subtitles = parseTXT(e.target.result);
                }
                console.log(`Loaded ${subtitles.length} subtitles`);
                updateTranslateButton();
            } catch (err) {
                console.error('Parse error:', err);
                alert('Error parsing file: ' + err.message);
            }
        };
        reader.readAsText(file);
    }
    
    /**
     * Parse VTT file
     */
    function parseVTT(content) {
        const subs = [];
        const blocks = content.split('\n\n').filter(b => b.trim());
        
        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i].trim();
            if (block.startsWith('WEBVTT')) continue;
            
            const lines = block.split('\n');
            let timecodeLine = lines.find(l => l.includes('-->'));
            if (!timecodeLine) continue;
            
            const textLines = lines.slice(lines.indexOf(timecodeLine) + 1);
            const text = textLines.join(' ');
            
            const times = parseVTTTimecode(timecodeLine);
            if (times) {
                subs.push({
                    id: subs.length + 1,
                    startTime: times.start,
                    endTime: times.end,
                    startTimecode: formatTimecode(times.start),
                    endTimecode: formatTimecode(times.end),
                    text: text,
                    originalText: text
                });
            }
        }
        return subs;
    }
    
    function parseVTTTimecode(str) {
        const match = str.match(/(\d{2}:\d{2}:\d{2})\.(\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2})\.(\d{3})/);
        if (!match) return null;
        
        return {
            start: parseTime(match[1], parseInt(match[2])),
            end: parseTime(match[3], parseInt(match[4]))
        };
    }
    
    /**
     * Parse JSON file
     */
    function parseJSON(content) {
        const data = JSON.parse(content);
        const subs = [];
        
        if (Array.isArray(data)) {
            data.forEach((item, i) => {
                subs.push({
                    id: i + 1,
                    startTime: item.startTime || item.start || i * 3000,
                    endTime: item.endTime || item.end || (i + 1) * 3000,
                    startTimecode: formatTimecode(item.startTime || item.start || i * 3000),
                    endTimecode: formatTimecode(item.endTime || item.end || (i + 1) * 3000),
                    text: item.text || item.subtitle || item.content || '',
                    originalText: item.text || item.subtitle || item.content || ''
                });
            });
        }
        
        return subs;
    }
    
    /**
     * Parse plain TXT (one line per subtitle)
     */
    function parseTXT(content) {
        const lines = content.split('\n').filter(l => l.trim());
        const subs = [];
        
        lines.forEach((line, i) => {
            subs.push({
                id: i + 1,
                startTime: i * 3000,
                endTime: (i + 1) * 3000,
                startTimecode: formatTimecode(i * 3000),
                endTimecode: formatTimecode((i + 1) * 3000),
                text: line.trim(),
                originalText: line.trim()
            });
        });
        
        return subs;
    }

    /**
     * Handle file select from drag/drop
     */
    function handleFileSelect(file, inputId) {
        const input = document.getElementById(inputId);
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        input.files = dataTransfer.files;
        
        // Trigger change event
        input.dispatchEvent(new Event('change'));
    }

    /**
     * Display file info
     */
    function displayFileInfo(file, element) {
        const filename = element.querySelector('.filename');
        const filesize = element.querySelector('.filesize');
        
        filename.textContent = file.name;
        filesize.textContent = formatFileSize(file.size);
    }

    /**
     * Format file size
     */
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Handle clear
     */
    function handleClear() {
        currentVideoFile = null;
        currentSRTFile = null;
        subtitles = [];
        translatedSubtitles = [];
        
        videoInput.value = '';
        subtitleInput.value = '';
        videoFileInfo.style.display = 'none';
        subtitleFileInfo.style.display = 'none';
        translateResults.style.display = 'none';
        translateProgress.style.display = 'none';
        videoPreviewSection.style.display = 'none';
        videoPlayer.src = '';
        
        subtitleRows.innerHTML = '';
        
        updateTranslateButton();
    }

    /**
     * Update translate button state
     */
    function updateTranslateButton() {
        const hasSubtitles = subtitles.length > 0;
        const hasApiKey = apiProvider === 'gemini' ? geminiApiKey.value.trim() : groqApiKey.value.trim();
        
        translateBtn.disabled = !hasSubtitles || !hasApiKey;
        
        // Save API keys to storage
        saveApiKeysToStorage();
    }

    /**
     * Save API keys to localStorage
     */
    function saveApiKeysToStorage() {
        localStorage.setItem('gemini_api_key', geminiApiKey.value.trim());
        localStorage.setItem('groq_api_key', groqApiKey.value.trim());
    }

    /**
     * Load API keys from localStorage
     */
    function loadApiKeysFromStorage() {
        const savedGemini = localStorage.getItem('gemini_api_key');
        const savedGroq = localStorage.getItem('groq_api_key');
        
        if (savedGemini) {
            geminiApiKey.value = savedGemini;
        }
        if (savedGroq) {
            groqApiKey.value = savedGroq;
        }
    }

    /**
     * Handle translate
     */
    async function handleTranslate() {
        if (subtitles.length === 0) {
            alert('Please upload an SRT file first');
            return;
        }

        const apiKey = apiProvider === 'gemini' ? geminiApiKey.value.trim() : groqApiKey.value.trim();
        if (!apiKey) {
            alert('Please enter your API key');
            return;
        }

        startTime = Date.now();
        translatedSubtitles = [];
        
        // Show progress
        translateProgress.style.display = 'block';
        translateResults.style.display = 'none';
        translateBtn.disabled = true;

        const sourceLang = sourceLanguage.value === 'auto' ? 'auto' : sourceLanguage.value;
        const targetLang = targetLanguage.value;

        try {
            if (apiProvider === 'gemini') {
                await translateWithGemini(apiKey, sourceLang, targetLang);
            } else {
                await translateWithGroq(apiKey, sourceLang, targetLang);
            }

            // Show results
            showResults();
            
        } catch (error) {
            console.error('Translation error:', error);
            alert('Translation failed: ' + error.message);
        } finally {
            translateBtn.disabled = false;
        }
    }

    /**
     * Translate with Google Gemini
     */
    async function translateWithGemini(apiKey, sourceLang, targetLang) {
        const total = subtitles.length;
        
        for (let i = 0; i < total; i++) {
            const subtitle = subtitles[i];
            
            // Update progress
            const percent = Math.round(((i + 1) / total) * 100);
            progressFill.style.width = percent + '%';
            progressPercent.textContent = percent + '%';
            progressText.textContent = `Translating with Gemini...`;
            currentSubtitleEl.textContent = `${i + 1}/${total}: ${subtitle.text.substring(0, 50)}...`;
            
            try {
                const translated = await translateTextGemini(
                    subtitle.text, 
                    apiKey, 
                    sourceLang, 
                    targetLang
                );
                
                translatedSubtitles.push({
                    ...subtitle,
                    translatedText: translated
                });
                
            } catch (error) {
                console.error(`Error translating subtitle ${i + 1}:`, error);
                translatedSubtitles.push({
                    ...subtitle,
                    translatedText: subtitle.text // Use original on error
                });
            }
            
            // Small delay to avoid rate limiting
            if (i < total - 1) {
                await sleep(100);
            }
        }
    }

    /**
     * Translate single text with Gemini
     */
    async function translateTextGemini(text, apiKey, sourceLang, targetLang) {
        const sourceLangName = getLanguageName(sourceLang);
        const targetLangName = getLanguageName(targetLang);
        
        const prompt = `Translate the following text from ${sourceLangName} to ${targetLangName}. Only respond with the translated text, nothing else:

${text}`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.2,
                    maxOutputTokens: 4096
                }
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'API request failed');
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text.trim();
    }

    /**
     * Translate with Groq (Llama)
     */
    async function translateWithGroq(apiKey, sourceLang, targetLang) {
        const total = subtitles.length;
        
        for (let i = 0; i < total; i++) {
            const subtitle = subtitles[i];
            
            // Update progress
            const percent = Math.round(((i + 1) / total) * 100);
            progressFill.style.width = percent + '%';
            progressPercent.textContent = percent + '%';
            progressText.textContent = `Translating with Groq (Llama)...`;
            currentSubtitleEl.textContent = `${i + 1}/${total}: ${subtitle.text.substring(0, 50)}...`;
            
            try {
                const translated = await translateTextGroq(
                    subtitle.text, 
                    apiKey, 
                    sourceLang, 
                    targetLang
                );
                
                translatedSubtitles.push({
                    ...subtitle,
                    translatedText: translated
                });
                
            } catch (error) {
                console.error(`Error translating subtitle ${i + 1}:`, error);
                translatedSubtitles.push({
                    ...subtitle,
                    translatedText: subtitle.text
                });
            }
            
            // Small delay
            if (i < total - 1) {
                await sleep(200);
            }
        }
    }

    /**
     * Translate single text with Groq
     */
    async function translateTextGroq(text, apiKey, sourceLang, targetLang) {
        const sourceLangName = getLanguageName(sourceLang);
        const targetLangName = getLanguageName(targetLang);
        
        const prompt = `[INST] Translate the following text from ${sourceLangName} to ${targetLangName}. Only respond with the translated text, nothing else:

${text} [/INST]`;

        const response = await fetch(`https://api.groq.com/openai/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [{
                    role: 'user',
                    content: prompt
                }],
                temperature: 0.2,
                max_tokens: 4096
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'API request failed');
        }

        const data = await response.json();
        return data.choices[0].message.content.trim();
    }

    /**
     * Get language name from code
     */
    function getLanguageName(code) {
        const languages = {
            'auto': 'detected language',
            'en': 'English',
            'my': 'Burmese',
            'zh': 'Chinese',
            'ja': 'Japanese',
            'ko': 'Korean',
            'th': 'Thai',
            'vi': 'Vietnamese',
            'lo': 'Lao',
            'km': 'Khmer'
        };
        return languages[code] || code;
    }

    /**
     * Sleep helper
     */
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Show results
     */
    function showResults() {
        translateProgress.style.display = 'none';
        translateResults.style.display = 'block';

        // Update stats
        document.getElementById('total-lines').textContent = subtitles.length;
        document.getElementById('translated-count').textContent = translatedSubtitles.length;
        document.getElementById('api-used').textContent = apiProvider === 'gemini' ? 'Google Gemini' : 'Groq (Llama)';
        
        const timeTaken = ((Date.now() - startTime) / 1000).toFixed(1);
        document.getElementById('time-taken').textContent = timeTaken + 's';

        // Render subtitles
        renderSubtitleComparison();
    }

    /**
     * Render subtitle comparison
     */
    function renderSubtitleComparison() {
        subtitleRows.innerHTML = '';

        translatedSubtitles.forEach((subtitle, index) => {
            const row = document.createElement('div');
            row.className = 'subtitle-row';
            row.innerHTML = `
                <div class="subtitle-col">${index + 1}</div>
                <div class="subtitle-col time-col">${subtitle.startTimecode} --> ${subtitle.endTimecode}</div>
                <div class="subtitle-col original-col">${escapeHtml(subtitle.text)}</div>
                <div class="subtitle-col translated-col">${escapeHtml(subtitle.translatedText || subtitle.text)}</div>
            `;
            
            // Click to seek video
            row.addEventListener('click', () => {
                if (videoPlayer.src) {
                    videoPlayer.currentTime = subtitle.startTime / 1000;
                    videoPlayer.play();
                }
            });
            
            subtitleRows.appendChild(row);
        });
    }

    /**
     * Handle video time update
     */
    function handleVideoTimeUpdate() {
        const currentTime = videoPlayer.currentTime * 1000;
        
        const currentSubtitle = translatedSubtitles.find(sub => 
            currentTime >= sub.startTime && currentTime <= sub.endTime
        );
        
        if (currentSubtitle) {
            subtitleOverlay.textContent = currentSubtitle.translatedText || currentSubtitle.text;
            subtitleOverlay.style.display = 'block';
        } else {
            subtitleOverlay.style.display = 'none';
        }
    }

    /**
     * Escape HTML
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Export as SRT
     */
    function exportAsSRT() {
        let srtContent = '';
        
        translatedSubtitles.forEach((subtitle, index) => {
            srtContent += `${index + 1}\n`;
            srtContent += `${subtitle.startTimecode} --> ${subtitle.endTimecode}\n`;
            srtContent += `${subtitle.translatedText || subtitle.text}\n\n`;
        });
        
        downloadFile(srtContent, 'translated_subtitles.srt', 'text/plain');
    }

    /**
     * Export as JSON
     */
    function exportAsJSON() {
        const jsonContent = JSON.stringify(translatedSubtitles, null, 2);
        downloadFile(jsonContent, 'translated_subtitles.json', 'application/json');
    }

    /**
     * Download file
     */
    function downloadFile(content, filename, type) {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Save to Firebase
     */
    async function saveToFirebase() {
        if (typeof firebase === 'undefined') {
            alert('Firebase is not loaded');
            return;
        }

        if (!firebase.auth().currentUser) {
            alert('Please log in first');
            return;
        }

        const userId = firebase.auth().currentUser.uid;
        const timestamp = Date.now();
        
        try {
            await firebase.firestore().collection('users').doc(userId)
                .collection('translations').add({
                    sourceLanguage: sourceLanguage.value,
                    targetLanguage: targetLanguage.value,
                    apiProvider: apiProvider,
                    subtitles: translatedSubtitles,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            
            alert('Saved to Firebase successfully!');
            
        } catch (error) {
            console.error('Error saving to Firebase:', error);
            alert('Failed to save: ' + error.message);
        }
    }

    // API key input listeners
    geminiApiKey.addEventListener('input', updateTranslateButton);
    groqApiKey.addEventListener('input', updateTranslateButton);

    // Initialize
    init();

    // Public API
    return {
        translate: handleTranslate,
        clear: handleClear,
        exportSRT: exportAsSRT,
        exportJSON: exportAsJSON
    };

})();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (typeof Translate !== 'undefined') {
        // Translate module auto-initializes
    }
});