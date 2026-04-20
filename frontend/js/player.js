/**
 * Video Player Module
 * Custom video player with subtitle synchronization
 */

const VideoPlayer = (function() {
    'use strict';

    // State
    let video = null;
    let isPlaying = false;
    let currentTime = 0;
    let duration = 0;
    let volume = 1;
    let playbackRate = 1;
    let isMuted = false;
    let subtitleCallback = null;
    let timeUpdateCallback = null;
    let controlsTimeout = null;

    /**
     * Initialize the player
     * @param {string} videoId - Video element ID
     */
    function init(videoId) {
        video = document.getElementById(videoId);
        if (!video) {
            console.error('Video element not found');
            return;
        }

        // Set up event listeners
        setupEventListeners();
        
        // Set up custom controls
        setupCustomControls();
        
        // Update initial state
        updateState();
    }

    /**
     * Set up custom video controls
     */
    function setupCustomControls() {
        // Play/Pause button
        const playPauseBtn = document.getElementById('play-pause-btn');
        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', togglePlay);
        }

        // Stop button
        const stopBtn = document.getElementById('stop-btn');
        if (stopBtn) {
            stopBtn.addEventListener('click', stop);
        }

        // Rewind button
        const rewindBtn = document.getElementById('rewind-btn');
        if (rewindBtn) {
            rewindBtn.addEventListener('click', () => seekRelative(-10));
        }

        // Forward button
        const forwardBtn = document.getElementById('forward-btn');
        if (forwardBtn) {
            forwardBtn.addEventListener('click', () => seekRelative(10));
        }

        // Mute button
        const muteBtn = document.getElementById('mute-btn');
        if (muteBtn) {
            muteBtn.addEventListener('click', toggleMute);
        }

        // Volume slider
        const volumeSlider = document.getElementById('volume-slider');
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => setVolume(parseFloat(e.target.value)));
        }

        // Progress bar
        const progressBar = document.getElementById('progress-bar');
        if (progressBar) {
            progressBar.addEventListener('click', (e) => {
                const rect = progressBar.getBoundingClientRect();
                const percent = ((e.clientX - rect.left) / rect.width) * 100;
                seekToPercent(percent);
            });
        }

        // Speed selector
        const speedSelector = document.getElementById('speed-selector');
        if (speedSelector) {
            speedSelector.addEventListener('change', (e) => setPlaybackRate(parseFloat(e.target.value)));
        }

        // Fullscreen button
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', toggleFullscreen);
        }
    }

    /**
     * Stop video playback
     */
    function stop() {
        if (!video) return;
        video.pause();
        video.currentTime = 0;
    }

    /**
     * Update custom controls UI
     */
    function updateCustomControls() {
        if (!video) return;

        // Update progress bar
        const played = document.getElementById('progress-played');
        if (played && video.duration) {
            played.style.width = `${(video.currentTime / video.duration) * 100}%`;
        }

        // Update buffered
        const buffered = document.getElementById('progress-buffered');
        if (buffered && video.buffered.length > 0) {
            const bufferedEnd = video.buffered.end(video.buffered.length - 1);
            buffered.style.width = `${(bufferedEnd / video.duration) * 100}%`;
        }

        // Update time display
        const timeDisplay = document.getElementById('time-display');
        if (timeDisplay && video.duration) {
            const current = Utils.formatTime(video.currentTime * 1000);
            const total = Utils.formatTime(video.duration * 1000);
            timeDisplay.textContent = `${current} / ${total}`;
        }

        // Update play/pause button
        const playPauseBtn = document.getElementById('play-pause-btn');
        if (playPauseBtn) {
            playPauseBtn.textContent = video.paused ? '▶' : '⏸';
        }

        // Update mute button
        const muteBtn = document.getElementById('mute-btn');
        if (muteBtn) {
            if (video.muted || video.volume === 0) {
                muteBtn.textContent = '🔇';
            } else if (video.volume < 0.5) {
                muteBtn.textContent = '🔉';
            } else {
                muteBtn.textContent = '🔊';
            }
        }
    }

    /**
     * Set up video event listeners
     */
    function setupEventListeners() {
        // Timeupdate - fires frequently during playback
        video.addEventListener('timeupdate', Utils.throttle(handleTimeUpdate, 100));
        
        // Loadedmetadata - when video metadata is loaded
        video.addEventListener('loadedmetadata', handleMetadataLoaded);
        
        // Play/Pause events
        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        
        // Volume change
        video.addEventListener('volumechange', handleVolumeChange);
        
        // Rate change
        video.addEventListener('ratechange', handleRateChange);
        
        // Waiting/Playing states
        video.addEventListener('waiting', handleWaiting);
        video.addEventListener('playing', handlePlaying);
        
        // Ended
        video.addEventListener('ended', handleEnded);
        
        // Error
        video.addEventListener('error', handleError);
        
        // Keyboard shortcuts
        document.addEventListener('keydown', handleKeyboard);
        
        // Mouse move to show controls
        video.parentElement?.addEventListener('mousemove', showControls);
    }

    /**
     * Handle time update
     */
    function handleTimeUpdate() {
        currentTime = video.currentTime * 1000; // Convert to ms
        
        if (timeUpdateCallback) {
            timeUpdateCallback(currentTime);
        }
        
        // Update custom controls
        updateCustomControls();
    }

    /**
     * Handle metadata loaded
     */
    function handleMetadataLoaded() {
        duration = video.duration * 1000; // Convert to ms
    }

    /**
     * Handle play event
     */
    function handlePlay() {
        isPlaying = true;
        updatePlayButton();
    }

    /**
     * Handle pause event
     */
    function handlePause() {
        isPlaying = false;
        updatePlayButton();
    }

    /**
     * Handle volume change
     */
    function handleVolumeChange() {
        volume = video.volume;
        isMuted = video.muted;
        updateVolumeUI();
    }

    /**
     * Handle playback rate change
     */
    function handleRateChange() {
        playbackRate = video.playbackRate;
        updateSpeedUI();
    }

    /**
     * Handle waiting (buffering)
     */
    function handleWaiting() {
        showLoader(true);
    }

    /**
     * Handle playing
     */
    function handlePlaying() {
        showLoader(false);
    }

    /**
     * Handle video ended
     */
    function handleEnded() {
        isPlaying = false;
        updatePlayButton();
    }

    /**
     * Handle errors
     */
    function handleError(e) {
        console.error('Video error:', e);
        Utils.showToast('Error loading video', 'error');
    }

    /**
     * Handle keyboard shortcuts
     */
    function handleKeyboard(e) {
        // Only handle if video is focused or no input is focused
        if (document.activeElement?.tagName === 'INPUT' || 
            document.activeElement?.tagName === 'TEXTAREA') {
            return;
        }

        switch(e.code) {
            case 'Space':
                e.preventDefault();
                togglePlay();
                break;
            case 'ArrowLeft':
                e.preventDefault();
                seekRelative(-5);
                break;
            case 'ArrowRight':
                e.preventDefault();
                seekRelative(5);
                break;
            case 'ArrowUp':
                e.preventDefault();
                adjustVolume(0.1);
                break;
            case 'ArrowDown':
                e.preventDefault();
                adjustVolume(-0.1);
                break;
            case 'KeyM':
                toggleMute();
                break;
            case 'KeyF':
                toggleFullscreen();
                break;
            case 'Digit0':
            case 'Digit1':
            case 'Digit2':
            case 'Digit3':
            case 'Digit4':
            case 'Digit5':
            case 'Digit6':
            case 'Digit7':
            case 'Digit8':
            case 'Digit9':
                // Number keys for seeking to percentage
                const percent = parseInt(e.code.replace('Digit', '')) * 10;
                seekToPercent(percent);
                break;
        }
    }

    /**
     * Load video from URL or blob
     */
    function loadVideo(source) {
        if (!video) return;
        
        showLoader(true);
        
        if (typeof source === 'string') {
            video.src = source;
        } else if (source instanceof Blob) {
            video.src = URL.createObjectURL(source);
        } else if (source instanceof File) {
            video.src = URL.createObjectURL(source);
        }
        
        video.load();
    }

    /**
     * Play video
     */
    function play() {
        if (!video) return;
        video.play().catch(e => console.error('Play error:', e));
    }

    /**
     * Pause video
     */
    function pause() {
        if (!video) return;
        video.pause();
    }

    /**
     * Toggle play/pause
     */
    function togglePlay() {
        if (isPlaying) {
            pause();
        } else {
            play();
        }
    }

    /**
     * Seek to specific time (ms)
     */
    function seekTo(timeMs) {
        if (!video) return;
        video.currentTime = timeMs / 1000;
        currentTime = timeMs;
    }

    /**
     * Seek relative time (seconds)
     */
    function seekRelative(seconds) {
        if (!video) return;
        const newTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
        video.currentTime = newTime;
        currentTime = newTime * 1000;
    }

    /**
     * Seek to percentage
     */
    function seekToPercent(percent) {
        if (!video) return;
        const time = (percent / 100) * video.duration;
        video.currentTime = time;
    }

    /**
     * Set volume (0-1)
     */
    function setVolume(value) {
        if (!video) return;
        video.volume = Math.max(0, Math.min(1, value));
    }

    /**
     * Adjust volume
     */
    function adjustVolume(delta) {
        if (!video) return;
        video.volume = Math.max(0, Math.min(1, video.volume + delta));
    }

    /**
     * Toggle mute
     */
    function toggleMute() {
        if (!video) return;
        video.muted = !video.muted;
    }

    /**
     * Set playback speed
     */
    function setPlaybackRate(rate) {
        if (!video) return;
        video.playbackRate = rate;
    }

    /**
     * Toggle fullscreen
     */
    function toggleFullscreen() {
        const container = video.parentElement;
        if (!container) return;

        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            container.requestFullscreen();
        }
    }

    /**
     * Get current time in milliseconds
     */
    function getCurrentTime() {
        return video ? video.currentTime * 1000 : 0;
    }

    /**
     * Get duration in milliseconds
     */
    function getDuration() {
        return video ? video.duration * 1000 : 0;
    }

    /**
     * Get video element
     */
    function getVideoElement() {
        return video;
    }

    /**
     * Set subtitle sync callback
     */
    function onSubtitleChange(callback) {
        subtitleCallback = callback;
    }

    /**
     * Set time update callback
     */
    function onTimeUpdate(callback) {
        timeUpdateCallback = callback;
    }

    /**
     * Update play button UI
     */
    function updatePlayButton() {
        const btn = document.getElementById('play-btn');
        if (btn) {
            btn.textContent = isPlaying ? '⏸' : '▶';
        }
    }

    /**
     * Update volume UI
     */
    function updateVolumeUI() {
        const slider = document.getElementById('volume-slider');
        const icon = document.getElementById('volume-icon');
        
        if (slider) {
            slider.value = isMuted ? 0 : volume;
        }
        
        if (icon) {
            if (isMuted || volume === 0) {
                icon.textContent = '🔇';
            } else if (volume < 0.5) {
                icon.textContent = '🔉';
            } else {
                icon.textContent = '🔊';
            }
        }
    }

    /**
     * Update speed UI
     */
    function updateSpeedUI() {
        const btn = document.getElementById('speed-btn');
        if (btn) {
            btn.textContent = `${playbackRate}x`;
        }
    }

    /**
     * Update progress bar
     */
    function updateProgressBar() {
        const progressBar = document.getElementById('progress-bar');
        if (progressBar && video && video.duration) {
            const percent = (video.currentTime / video.duration) * 100;
            progress.style.width = `${percent}%`;
        }
    }

    /**
     * Show/hide loader
     */
    function showLoader(show) {
        const loader = document.querySelector('.video-loader');
        if (loader) {
            loader.classList.toggle('show', show);
        }
    }

    /**
     * Show controls
     */
    function showControls() {
        const controls = document.querySelector('.video-controls');
        if (controls) {
            controls.style.opacity = '1';
        }
        
        clearTimeout(controlsTimeout);
        controlsTimeout = setTimeout(() => {
            if (isPlaying && controls) {
                controls.style.opacity = '0';
            }
        }, 3000);
    }

    /**
     * Update internal state
     */
    function updateState() {
        if (!video) return;
        
        currentTime = video.currentTime * 1000;
        duration = video.duration * 1000;
        volume = video.volume;
        isMuted = video.muted;
        playbackRate = video.playbackRate;
    }

    /**
     * Register custom controls
     */
    function registerControls(controlsContainer) {
        if (!controlsContainer) return;

        // Play/Pause
        const playBtn = controlsContainer.querySelector('#play-btn');
        if (playBtn) {
            playBtn.addEventListener('click', togglePlay);
        }

        // Progress bar
        const progressContainer = controlsContainer.querySelector('.progress-container');
        if (progressContainer) {
            progressContainer.addEventListener('click', (e) => {
                const rect = progressContainer.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                seekToPercent(percent * 100);
            });
        }

        // Volume slider
        const volumeSlider = controlsContainer.querySelector('#volume-slider');
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                setVolume(parseFloat(e.target.value));
            });
        }

        // Mute button
        const muteBtn = controlsContainer.querySelector('#mute-btn');
        if (muteBtn) {
            muteBtn.addEventListener('click', toggleMute);
        }

        // Speed button
        const speedBtn = controlsContainer.querySelector('#speed-btn');
        if (speedBtn) {
            speedBtn.addEventListener('click', () => {
                const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
                const currentIndex = speeds.indexOf(playbackRate);
                const nextIndex = (currentIndex + 1) % speeds.length;
                setPlaybackRate(speeds[nextIndex]);
            });
        }

        // Fullscreen button
        const fullscreenBtn = controlsContainer.querySelector('#fullscreen-btn');
        if (fullscreenBtn) {
            fullscreenBtn.addEventListener('click', toggleFullscreen);
        }
    }

    // Public API
    return {
        init,
        loadVideo,
        play,
        pause,
        togglePlay,
        seekTo,
        seekRelative,
        seekToPercent,
        setVolume,
        adjustVolume,
        toggleMute,
        setPlaybackRate,
        toggleFullscreen,
        getCurrentTime,
        getDuration,
        getVideoElement,
        onSubtitleChange,
        onTimeUpdate,
        registerControls
    };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VideoPlayer;
}

// Make globally available
window.VideoPlayer = VideoPlayer;