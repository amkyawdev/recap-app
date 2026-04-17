/**
 * Main Application Module
 * Burme Transcript App - Entry point
 */

const App = (function() {
    'use strict';

    // State
    let currentVideoFile = null;
    let currentSubtitleFiles = [];
    let autoSaveInterval = null;
    let isLoaded = false;

    /**
     * Initialize the application
     */
    function init() {
        console.log('Initializing Burme Transcript App...');
        
        // Initialize modules
        initTheme();
        initVideoPlayer();
        initSubtitleEditor();
        initFileUpload();
        initKeyboardShortcuts();
        initAutoSave();
        
        // Set up video time sync
        VideoPlayer.onTimeUpdate(handleVideoTimeUpdate);
        
        // Set up subtitle selection sync
        SubtitleEditor.onSelect(handleSubtitleSelect);
        
        // Load sample subtitle on init
        loadSampleSubtitle();
        
        isLoaded = true;
        console.log('App initialized successfully');
        
        // Show welcome message
        Utils.showToast('Welcome to Burme Transcript App', 'info');
    }
    
    /**
     * Load sample subtitle file
     */
    function loadSampleSubtitle() {
        fetch('assets/sample.srt')
            .then(response => response.text())
            .then(content => {
                if (content) {
                    SubtitleEditor.loadFromSRT(content);
                    console.log('Sample subtitle loaded');
                }
            })
            .catch(err => console.log('No sample subtitle found'));
    }

    /**
     * Initialize theme toggle
     */
    function initTheme() {
        const themeToggle = document.getElementById('theme-toggle');
        if (!themeToggle) return;

        // Load saved theme
        const savedTheme = Utils.Storage.get('theme', 'dark');
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);

        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            Utils.Storage.set('theme', newTheme);
            updateThemeIcon(newTheme);
        });
    }

    /**
     * Update theme icon
     */
    function updateThemeIcon(theme) {
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.textContent = theme === 'dark' ? '🌙' : '☀️';
        }
    }

    /**
     * Initialize video player
     */
    function initVideoPlayer() {
        VideoPlayer.init('video-player');
        
        // Register custom controls if exists
        const controlsContainer = document.querySelector('.video-controls-container');
        if (controlsContainer) {
            VideoPlayer.registerControls(controlsContainer);
        }
        
        // Set up video placeholder click to upload
        const placeholder = document.getElementById('video-placeholder');
        const videoUploadZone = document.getElementById('video-upload-zone');
        if (placeholder && videoUploadZone) {
            placeholder.addEventListener('click', () => {
                const input = videoUploadZone.querySelector('input');
                if (input) input.click();
            });
        }
    }

    /**
     * Initialize subtitle editor
     */
    function initSubtitleEditor() {
        SubtitleEditor.init();
        
        // Set up export button
        const exportBtn = document.getElementById('export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', handleExport);
        }
        
        // Set up sync button
        const syncBtn = document.getElementById('sync-btn');
        if (syncBtn) {
            syncBtn.addEventListener('click', handleSync);
        }
    }

    /**
     * Initialize file upload
     */
    function initFileUpload() {
        // Video upload
        const videoUploadZone = document.getElementById('video-upload-zone');
        const videoInput = document.getElementById('video-input');
        
        if (videoUploadZone && videoInput) {
            setupUploadZone(videoUploadZone, videoInput, handleVideoUpload);
        }
        
        // Subtitle upload
        const subtitleUploadZone = document.getElementById('subtitle-upload-zone');
        const subtitleInput = document.getElementById('subtitle-input');
        
        if (subtitleUploadZone && subtitleInput) {
            setupUploadZone(subtitleUploadZone, subtitleInput, handleSubtitleUpload);
        }
        
        // Hidden inputs
        const hiddenVideoInput = document.getElementById('hidden-video-input');
        const hiddenSubtitleInput = document.getElementById('hidden-subtitle-input');
        
        const addFilesBtn = document.getElementById('add-files-btn');
        if (addFilesBtn) {
            addFilesBtn.addEventListener('click', () => {
                hiddenSubtitleInput?.click();
            });
        }
        
        if (hiddenSubtitleInput) {
            hiddenSubtitleInput.addEventListener('change', (e) => {
                handleSubtitleUpload(e.target.files);
            });
        }
    }

    /**
     * Set up upload zone with drag and drop
     */
    function setupUploadZone(zone, input, handler) {
        if (!zone || !input) return;

        // Click to upload
        zone.addEventListener('click', () => input.click());
        
        // Drag events
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
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handler(files);
            }
        });
        
        // File input change
        input.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handler(e.target.files);
            }
        });
    }

    /**
     * Handle video upload
     */
    function handleVideoUpload(files) {
        const file = files[0];
        if (!file) return;
        
        // Validate file type
        const validTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
        if (!validTypes.some(type => file.type.startsWith(type) || file.name.match(/\.(mp4|webm|mov|avi)$/i))) {
            Utils.showToast('Invalid video file type', 'error');
            return;
        }
        
        // Load video
        const url = URL.createObjectURL(file);
        VideoPlayer.loadVideo(url);
        
        // Hide placeholder
        const placeholder = document.getElementById('video-placeholder');
        if (placeholder) {
            placeholder.classList.add('hidden');
        }
        
        currentVideoFile = file;
        
        // Update UI
        addVideoToList(file);
        
        Utils.showToast('Video loaded', 'success');
    }

    /**
     * Handle subtitle upload
     */
    function handleSubtitleUpload(files) {
        Array.from(files).forEach(async (file) => {
            // Validate file extension
            if (!file.name.endsWith('.srt')) {
                Utils.showToast(`Invalid file: ${file.name}`, 'error');
                return;
            }
            
            try {
                const content = await Utils.readFileAsText(file);
                SubtitleEditor.loadFromSRT(content);
                
                currentSubtitleFiles.push(file);
                addSubtitleToList(file);
                
                Utils.showToast(`Loaded: ${file.name}`, 'success');
            } catch (e) {
                console.error('Error loading subtitle:', e);
                Utils.showToast(`Error loading: ${file.name}`, 'error');
            }
        });
    }

    /**
     * Add video to file list
     */
    function addVideoToList(file) {
        const list = document.getElementById('video-list');
        if (!list) return;
        
        const li = document.createElement('li');
        li.className = 'file-item active';
        li.innerHTML = `
            <span class="file-item-icon">📹</span>
            <span class="file-item-name">${file.name}</span>
            <span class="file-item-remove">✕</span>
        `;
        
        li.querySelector('.file-item-remove').addEventListener('click', (e) => {
            e.stopPropagation();
            li.remove();
            currentVideoFile = null;
            VideoPlayer.loadVideo('');
        });
        
        // Clear existing
        list.innerHTML = '';
        list.appendChild(li);
    }

    /**
     * Add subtitle to file list
     */
    function addSubtitleToList(file) {
        const list = document.getElementById('subtitle-list');
        if (!list) return;
        
        const li = document.createElement('li');
        li.className = 'file-item';
        li.innerHTML = `
            <span class="file-item-icon">📄</span>
            <span class="file-item-name">${file.name}</span>
            <span class="file-item-remove">✕</span>
        `;
        
        li.querySelector('.file-item-remove').addEventListener('click', (e) => {
            e.stopPropagation();
            li.remove();
            const index = currentSubtitleFiles.indexOf(file);
            if (index > -1) {
                currentSubtitleFiles.splice(index, 1);
            }
            if (currentSubtitleFiles.length === 0) {
                SubtitleEditor.clear();
            }
        });
        
        list.appendChild(li);
    }

    /**
     * Handle video time update
     */
    function handleVideoTimeUpdate(time) {
        // Find subtitle at current time
        const subtitle = SubtitleEditor.findSubtitleAtTime(time);
        
        // Update overlay
        const overlay = document.getElementById('subtitle-overlay');
        if (overlay) {
            if (subtitle) {
                overlay.textContent = subtitle.text;
                overlay.classList.add('visible');
            } else {
                overlay.classList.remove('visible');
            }
        }
        
        // Highlight current subtitle in list
        const currentIndex = SubtitleEditor.getCurrentIndex();
        const items = document.querySelectorAll('.subtitle-item');
        items.forEach((item, i) => {
            const idx = parseInt(item.dataset.index, 10);
            if (idx === currentIndex) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    /**
     * Handle subtitle selection
     */
    function handleSubtitleSelect(subtitle, index) {
        // Load subtitle to editor
        const startTime = subtitle.startTime || Utils.parseTimecode(subtitle.startTimecode);
        const endTime = subtitle.endTime || Utils.parseTimecode(subtitle.endTimecode);
        
        // Also could highlight in list
        console.log('Selected subtitle:', index);
    }

    /**
     * Handle export button
     */
    function handleExport() {
        const subtitles = SubtitleEditor.getSubtitles();
        if (subtitles.length === 0) {
            Utils.showToast('No subtitles to export', 'error');
            return;
        }
        
        SubtitleEditor.exportSubtitles('srt', 'edited-subtitles');
    }

    /**
     * Handle sync button
     */
    function handleSync() {
        const offsetSlider = document.getElementById('offset-slider');
        if (offsetSlider) {
            const offset = parseInt(offsetSlider.value, 10);
            SubtitleEditor.applyOffset(offset);
            
            // Reset slider
            offsetSlider.value = 0;
            const offsetValue = document.getElementById('offset-value');
            if (offsetValue) {
                offsetValue.textContent = '0ms';
            }
        }
    }

    /**
     * Initialize keyboard shortcuts
     */
    function initKeyboardShortcuts() {
        // Already handled in VideoPlayer
        // Add app-level shortcuts here
    }

    /**
     * Initialize auto-save
     */
    function initAutoSave() {
        // Auto-save every 30 seconds
        autoSaveInterval = setInterval(() => {
            if (SubtitleEditor.getSubtitles().length > 0) {
                // Already saved in SubtitleEditor
                console.log('Auto-saved');
            }
        }, 30000);
    }

    /**
     * Clean up on unload
     */
    function cleanup() {
        if (autoSaveInterval) {
            clearInterval(autoSaveInterval);
        }
        
        // Save state
        const state = {
            videoFile: currentVideoFile?.name,
            subtitleCount: currentSubtitleFiles.length
        };
        Utils.Storage.set('appState', state);
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Cleanup on unload
    window.addEventListener('beforeunload', cleanup);

    // Public API
    return {
        init,
        cleanup,
        getVideoFile: () => currentVideoFile,
        getSubtitleFiles: () => currentSubtitleFiles
    };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = App;
}