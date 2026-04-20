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
        initAboutModal();
        initLogout();
        initMobileMenu();
        initSubtitleStyle();
        initExportDropdown();
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
     * Initialize About Modal
     */
    function initAboutModal() {
        const aboutBtn = document.getElementById('about-btn');
        const aboutModal = document.getElementById('about-modal');
        const aboutClose = document.getElementById('about-close');

        if (aboutBtn && aboutModal) {
            aboutBtn.addEventListener('click', () => {
                aboutModal.classList.add('show');
            });

            if (aboutClose) {
                aboutClose.addEventListener('click', () => {
                    aboutModal.classList.remove('show');
                });
            }

            aboutModal.addEventListener('click', (e) => {
                if (e.target === aboutModal) {
                    aboutModal.classList.remove('show');
                }
            });
        }
    }

    /**
     * Initialize Logout Button
     */
    function initLogout() {
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                if (confirm('Are you sure you want to logout?')) {
                    await FirebaseAuth.logout();
                    window.location.href = 'login.html';
                }
            });
        }
        
        // Mobile menu logout
        const menuLogout = document.getElementById('menu-logout');
        if (menuLogout) {
            menuLogout.addEventListener('click', async (e) => {
                e.preventDefault();
                if (confirm('Are you sure you want to logout?')) {
                    await FirebaseAuth.logout();
                    window.location.href = 'login.html';
                }
            });
        }
    }

    /**
     * Initialize Mobile Menu
     */
    function initMobileMenu() {
        const menuBtn = document.getElementById('menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');
        
        if (menuBtn && mobileMenu) {
            menuBtn.addEventListener('click', (e) => {
                e.preventDefault();
                menuBtn.classList.toggle('active');
                mobileMenu.classList.toggle('show');
            });
            
            // Menu items
            const menuAbout = document.getElementById('menu-about');
            const menuTheme = document.getElementById('menu-theme');
            
            if (menuAbout) {
                menuAbout.addEventListener('click', (e) => {
                    e.preventDefault();
                    document.getElementById('about-modal').classList.add('show');
                    menuBtn.classList.remove('active');
                    mobileMenu.classList.remove('show');
                });
            }
            
            if (menuTheme) {
                menuTheme.addEventListener('click', (e) => {
                    e.preventDefault();
                    document.getElementById('theme-toggle').click();
                    mobileMenu.classList.remove('show');
                });
            }
            
            // Close on outside click
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.menu-btn') && !e.target.closest('.mobile-menu')) {
                    menuBtn.classList.remove('active');
                    mobileMenu.classList.remove('show');
                }
            });
        }
    }

    /**
     * Initialize Subtitle Style Controls
     */
    function initSubtitleStyle() {
        const styleEditorBtn = document.getElementById('style-editor-btn');
        const styleModal = document.getElementById('style-modal');
        const styleModalClose = document.getElementById('style-modal-close');
        const applyStyleBtn = document.getElementById('apply-style-btn');
        
        // Open modal
        if (styleEditorBtn && styleModal) {
            styleEditorBtn.addEventListener('click', () => {
                styleModal.classList.add('show');
            });
        }
        
        // Close modal
        if (styleModalClose && styleModal) {
            styleModalClose.addEventListener('click', () => {
                styleModal.classList.remove('show');
            });
        }
        
        // Close on outside click
        if (styleModal) {
            styleModal.addEventListener('click', (e) => {
                if (e.target === styleModal) {
                    styleModal.classList.remove('show');
                }
            });
        }
        
        // Apply style
        if (applyStyleBtn) {
            applyStyleBtn.addEventListener('click', () => {
                applySubtitleStyle();
                if (styleModal) {
                    styleModal.classList.remove('show');
                }
            });
        }
        
        // Load saved style
        loadSubtitleStyle();
    }

    /**
     * Apply subtitle style to overlay
     */
    function applySubtitleStyle() {
        const fontFamily = document.getElementById('subtitle-font-family').value;
        const fontSize = document.getElementById('subtitle-font-size').value;
        const fontColor = document.getElementById('subtitle-font-color').value;
        const bgColor = document.getElementById('subtitle-bg-color').value;
        const opacity = document.getElementById('subtitle-opacity').value;
        const position = document.getElementById('subtitle-position').value;
        const fontWeight = document.getElementById('subtitle-font-weight').value;
        const outline = document.getElementById('subtitle-outline').value;

        const overlay = document.getElementById('subtitle-overlay');
        if (overlay) {
            overlay.style.fontFamily = fontFamily;
            overlay.style.fontSize = fontSize + 'px';
            overlay.style.color = fontColor;
            overlay.style.backgroundColor = hexToRgba(bgColor, opacity / 100);
            overlay.style.fontWeight = fontWeight;
            
            // Position handling
            const [vPos, hPos] = position.split('-');
            
            // Vertical position
            if (vPos === 'top') {
                overlay.style.top = '10%';
                overlay.style.bottom = 'auto';
            } else if (vPos === 'center') {
                overlay.style.top = '50%';
                overlay.style.bottom = 'auto';
                overlay.style.transform = 'translateY(-50%)';
            } else {
                overlay.style.top = 'auto';
                overlay.style.bottom = '10%';
                overlay.style.transform = 'none';
            }
            
            // Horizontal position
            if (hPos === 'left') {
                overlay.style.left = '10%';
                overlay.style.transform = vPos === 'center' ? 'translateY(-50%)' : 'none';
            } else if (hPos === 'right') {
                overlay.style.left = 'auto';
                overlay.style.right = '10%';
                overlay.style.transform = vPos === 'center' ? 'translateY(-50%)' : 'none';
            } else {
                // center
                overlay.style.left = '50%';
                overlay.style.right = 'auto';
                overlay.style.transform = vPos === 'center' ? 'translate(-50%, -50%)' : 'translateX(-50%)';
            }
            
            // Outline
            if (outline !== 'none') {
                overlay.style.textShadow = outline === 'black' 
                    ? '2px 2px 2px #000, -2px -2px 2px #000, 2px -2px 2px #000, -2px 2px 2px #000'
                    : '2px 2px 2px #fff, -2px -2px 2px #fff, 2px -2px 2px #fff, -2px 2px 2px #fff';
            } else {
                overlay.style.textShadow = 'none';
            }
        }

        // Save to storage
        Utils.Storage.set('subtitleStyle', { 
            fontFamily, fontSize, fontColor, bgColor, opacity, position, fontWeight, outline 
        });
        
        Utils.showToast('Style applied!', 'success');
    }

    /**
     * Load saved subtitle style
     */
    function loadSubtitleStyle() {
        const style = Utils.Storage.get('subtitleStyle', null);
        if (style) {
            if (document.getElementById('subtitle-font-family')) {
                // Set default to English font
                document.getElementById('subtitle-font-family').value = style.fontFamily || 'Arial';
            }
            document.getElementById('subtitle-font-size').value = style.fontSize || 20;
            document.getElementById('subtitle-font-color').value = style.fontColor || '#ffffff';
            document.getElementById('subtitle-bg-color').value = style.bgColor || '#000000';
            document.getElementById('subtitle-opacity').value = style.opacity || 80;
            if (document.getElementById('subtitle-position')) {
                document.getElementById('subtitle-position').value = style.position || 'bottom-center';
            }
            if (document.getElementById('subtitle-font-weight')) {
                document.getElementById('subtitle-font-weight').value = style.fontWeight || 'normal';
            }
            if (document.getElementById('subtitle-outline')) {
                document.getElementById('subtitle-outline').value = style.outline || 'none';
            }
            
            // Apply the style
            setTimeout(applySubtitleStyle, 500);
        }
    }

    /**
     * Convert hex to rgba
     */
    function hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    /**
     * Adjust timecode by milliseconds
     */
    function adjustTime(inputId, delta) {
        const input = document.getElementById(inputId);
        if (!input || !input.value) return;
        
        // Parse current time
        const parts = input.value.replace(',', '.').split(':');
        if (parts.length !== 3) return;
        
        let hours = parseInt(parts[0]) || 0;
        let minutes = parseInt(parts[1]) || 0;
        let seconds = parseFloat(parts[2]) || 0;
        
        // Convert to milliseconds
        let totalMs = (hours * 3600 + minutes * 60 + seconds) * 1000 + delta;
        
        // Prevent negative time
        if (totalMs < 0) totalMs = 0;
        
        // Convert back to timecode
        hours = Math.floor(totalMs / 3600000);
        totalMs %= 3600000;
        minutes = Math.floor(totalMs / 60000);
        totalMs %= 60000;
        seconds = Math.floor(totalMs / 1000);
        const ms = totalMs % 1000;
        
        // Format: HH:MM:SS,mmm
        input.value = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
    }

    // Make adjustTime available globally
    window.adjustTime = adjustTime;

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
        
        // Video placeholder click handled in initFileUpload
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
        // Video input - using label for attribute
        const videoInput = document.getElementById('video-input');
        if (videoInput) {
            videoInput.addEventListener('change', function(e) {
                if (e.target.files && e.target.files.length > 0) {
                    handleVideoUpload(e.target.files);
                }
            });
        }
        
        // Subtitle input
        const subtitleInput = document.getElementById('subtitle-input');
        if (subtitleInput) {
            subtitleInput.addEventListener('change', function(e) {
                if (e.target.files && e.target.files.length > 0) {
                    handleSubtitleUpload(e.target.files);
                }
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
        const validExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
        const hasValidExtension = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
        if (!hasValidExtension) {
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
        // Toggle dropdown menu
        const exportMenu = document.getElementById('export-menu');
        if (exportMenu) {
            exportMenu.classList.toggle('show');
        }
    }

    /**
     * Handle SRT export
     */
    function handleExportSRT(e) {
        e.preventDefault();
        const subtitles = SubtitleEditor.getSubtitles();
        if (subtitles.length === 0) {
            Utils.showToast('No subtitles to export', 'error');
            return;
        }
        
        SubtitleEditor.exportSubtitles('srt', 'edited-subtitles');
        document.getElementById('export-menu').classList.remove('show');
    }

    /**
     * Handle JSON export
     */
    function handleExportJSON(e) {
        e.preventDefault();
        const subtitles = SubtitleEditor.getSubtitles();
        if (subtitles.length === 0) {
            Utils.showToast('No subtitles to export', 'error');
            return;
        }
        
        SubtitleEditor.exportSubtitles('json', 'edited-subtitles');
        document.getElementById('export-menu').classList.remove('show');
    }

    /**
     * Handle TXT export
     */
    function handleExportTXT(e) {
        e.preventDefault();
        const subtitles = SubtitleEditor.getSubtitles();
        if (subtitles.length === 0) {
            Utils.showToast('No subtitles to export', 'error');
            return;
        }
        
        SubtitleEditor.exportSubtitles('txt', 'edited-subtitles');
        document.getElementById('export-menu').classList.remove('show');
    }

    /**
     * Initialize export dropdown
     */
    function initExportDropdown() {
        const exportBtn = document.getElementById('export-btn');
        const exportMenu = document.getElementById('export-menu');
        
        if (exportBtn) {
            exportBtn.addEventListener('click', handleExport);
        }
        
        // Export menu items
        const exportSrt = document.getElementById('export-srt');
        const exportJson = document.getElementById('export-json');
        const exportTxt = document.getElementById('export-txt');
        
        if (exportSrt) exportSrt.addEventListener('click', handleExportSRT);
        if (exportJson) exportJson.addEventListener('click', handleExportJSON);
        if (exportTxt) exportTxt.addEventListener('click', handleExportTXT);
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (exportMenu && !e.target.closest('.export-dropdown')) {
                exportMenu.classList.remove('show');
            }
        });
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