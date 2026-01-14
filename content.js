// Only run once
if (!window.loomTranscriptExtensionLoaded) {
  window.loomTranscriptExtensionLoaded = true;

  // Wait for video player to be ready
  const initTranscriptExtractor = () => {
    console.log('🔍 Loom Transcript Extractor: Waiting for video...');
    
    // Check if video exists
    let checkCount = 0;
    const checkVideo = setInterval(() => {
      checkCount++;
      const video = findVideo();
      
      if (video) {
        console.log('✅ Video found after', checkCount, 'attempts');
        clearInterval(checkVideo);
        // Wait for tracks to load
        setTimeout(() => {
          console.log('🎬 Creating transcript window...');
          createTranscriptWindow();
        }, 3000); // Give tracks more time to load
      } else if (checkCount % 10 === 0) {
        console.log('⏳ Still waiting for video... attempt', checkCount);
      }
    }, 1000);

    // Give it much longer in embedded context - 60 seconds
    setTimeout(() => {
      clearInterval(checkVideo);
      console.log('❌ Video not found after 60 seconds. Loom embed may not have loaded.');
    }, 60000);
  };

  // Find video element including in Shadow DOMs
  const findVideo = (root = document) => {
    let video = root.querySelector('video');
    if (video) return video;

    for (const el of root.querySelectorAll('*')) {
      if (el.shadowRoot) {
        video = findVideo(el.shadowRoot);
        if (video) return video;
      }
    }
    return null;
  };

  const getAvailableTracks = () => {
    const video = findVideo();
    const textTracks = video?.textTracks;
    const tracks = [];

    if (textTracks) {
      for (let i = 0; i < textTracks.length; i++) {
        const track = textTracks[i];
        if (track.kind === 'captions' || track.kind === 'subtitles') {
          tracks.push({
            index: i,
            label: track.label || `Track ${i + 1}`,
            language: track.language || 'unknown'
          });
        }
      }
    }

    return tracks;
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `[${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}]`;
    }
    return `[${mins}:${String(secs).padStart(2, '0')}]`;
  };

  const getVideoTitle = () => {
    // Try multiple selectors for robustness against Loom CSS changes
    const selectors = [
      '.css-mlocso',                    // Current Loom title class
      '[data-testid="video-title"]',    // Test ID if available
      'h1',                             // Fallback to first h1
      '.video-title',                   // Generic class name
      'title'                           // Page title as last resort
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el?.textContent?.trim()) {
        return el.textContent.trim();
      }
    }

    // Extract from URL as final fallback
    const urlMatch = window.location.pathname.match(/\/share\/([^/?]+)/);
    if (urlMatch) {
      return urlMatch[1].replace(/-/g, ' ');
    }

    return 'loom-video';
  };

  const fetchFullTranscript = async (trackIndex = null) => {
    console.log('🎯 fetchFullTranscript: Starting...', trackIndex !== null ? `(track ${trackIndex})` : '');

    // Wait for textTracks to be available
    let attempts = 0;
    while (attempts < 30) {  // Increased to 30 attempts = 15 seconds
      const video = findVideo();
      const textTracks = video?.textTracks;
      const trackCount = textTracks?.length || 0;

      console.log(`Attempt ${attempts + 1}: Video=${!!video}, TextTracks=${trackCount}`);

      if (textTracks && trackCount > 0) {
        // Find caption or subtitle track
        let captionTrack = null;

        if (trackIndex !== null && textTracks[trackIndex]) {
          // Use specified track
          captionTrack = textTracks[trackIndex];
          console.log(`✅ Using specified track ${trackIndex}:`, captionTrack.label);
        } else {
          // Find first caption/subtitle track
          for (let i = 0; i < trackCount; i++) {
            const track = textTracks[i];
            if (track.kind === 'captions' || track.kind === 'subtitles') {
              captionTrack = track;
              console.log(`✅ Found ${track.kind} track:`, track.label);
              break;
            }
          }
        }

        if (captionTrack) {
          // Enable the track to access cues
          captionTrack.mode = 'hidden'; // 'hidden' loads cues without showing
          
          // Wait for cues to load
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          if (captionTrack.cues && captionTrack.cues.length > 0) {
            console.log(`📝 Found ${captionTrack.cues.length} cues`);

            // Extract text and timestamps from cues
            const transcript = [];
            const seenTexts = new Set();
            for (let i = 0; i < captionTrack.cues.length; i++) {
              const cue = captionTrack.cues[i];
              const text = cue.text.replace(/<[^>]*>/g, '').trim(); // Remove HTML tags
              if (text && !seenTexts.has(text)) {
                seenTexts.add(text);
                transcript.push({ startTime: cue.startTime, text });
              }
            }

            console.log('✅ Transcript extracted, segments:', transcript.length);
            return transcript;
          } else {
            console.log('⏳ Cues not loaded yet, waiting...');
          }
        }
      }
      
      // Wait 500ms before trying again
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }
    
    console.error('❌ No caption tracks found after 30 attempts (15 seconds)');
    throw new Error('No caption tracks found after waiting');
  };

  const createTranscriptWindow = () => {
    // Create a floating transcript window
    const transcriptWindow = document.createElement('div');
    transcriptWindow.id = 'loom-transcript-extractor';
    transcriptWindow.innerHTML = `
      <div id="transcriptContainer" style="position: fixed; top: 20px; right: 20px; width: 450px; height: 600px;
                  background: white; border: 2px solid #6663F6; border-radius: 12px;
                  box-shadow: 0 8px 32px rgba(0,0,0,0.3); z-index: 999999;
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                  display: flex; flex-direction: column; min-width: 300px; min-height: 400px; overflow: hidden;">
        <div id="resizeHandle" style="position: absolute; bottom: 0; right: 0; width: 20px; height: 20px;
                    cursor: nwse-resize; z-index: 10;">
          <svg width="20" height="20" viewBox="0 0 20 20" style="opacity: 0.5;">
            <path d="M14 20L20 14M10 20L20 10M6 20L20 6" stroke="#666" stroke-width="1.5" fill="none"/>
          </svg>
        </div>
        <div id="transcript-header" style="background: linear-gradient(135deg, #6663F6, #97ACFD); 
                    color: white; padding: 15px; border-radius: 10px 10px 0 0; cursor: move; 
                    display: flex; justify-content: space-between; align-items: center;">
          <strong style="font-size: 16px;">📄 Transcript</strong>
          <div>
            <button id="minimizeBtn" style="background: rgba(255,255,255,0.3); border: none; 
                    color: white; padding: 5px 10px; border-radius: 5px; cursor: pointer; 
                    margin-right: 5px; font-weight: bold; font-size: 12px;">−</button>
            <button id="closeBtn" style="background: rgba(255,255,255,0.3); border: none; 
                    color: white; padding: 5px 10px; border-radius: 5px; cursor: pointer; 
                    font-weight: bold; font-size: 12px;">✖</button>
          </div>
        </div>
        <div id="transcript-body" style="flex: 1; display: flex; flex-direction: column;">
          <div style="padding: 12px; background: #f9f9ff; border-bottom: 1px solid #e0e0e0; display: flex; gap: 8px; flex-wrap: wrap;">
            <button id="instantBtn" style="flex: 1; background: #6663F6; color: white; border: none;
                    padding: 10px 15px; border-radius: 6px; cursor: pointer; font-weight: bold;
                    font-size: 13px; transition: all 0.2s;">⚡ Get Full Transcript</button>
            <button id="liveBtn" style="flex: 1; background: white; color: #6663F6; border: 2px solid #6663F6;
                    padding: 10px 15px; border-radius: 6px; cursor: pointer; font-weight: bold;
                    font-size: 13px; transition: all 0.2s;">🎥 Live Capture</button>
          </div>
          <div id="optionsRow" style="padding: 8px 12px; background: #f0f0f5; border-bottom: 1px solid #e0e0e0; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <input type="checkbox" id="timestampToggle" style="width: 16px; height: 16px; cursor: pointer; accent-color: #6663F6;">
              <label for="timestampToggle" style="font-size: 12px; color: #555; cursor: pointer; user-select: none;">Timestamps</label>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <input type="checkbox" id="darkModeToggle" style="width: 16px; height: 16px; cursor: pointer; accent-color: #6663F6;">
              <label for="darkModeToggle" style="font-size: 12px; color: #555; cursor: pointer; user-select: none;">Dark</label>
            </div>
            <div style="display: flex; align-items: center; gap: 6px; margin-left: auto;">
              <label for="languageSelect" style="font-size: 12px; color: #555;">Lang:</label>
              <select id="languageSelect" style="font-size: 12px; padding: 4px 8px; border: 1px solid #ccc; border-radius: 4px; background: white; cursor: pointer;">
                <option value="">Detecting...</option>
              </select>
            </div>
          </div>
          <div style="padding: 10px 12px; background: #fffbea; border-bottom: 1px solid #f0e68c; 
                      font-size: 12px; color: #856404; text-align: center;" id="infoBox">
            Choose a mode to begin
          </div>
          <textarea id="transcriptText" readonly style="flex: 1; padding: 15px; border: none;
                    font-size: 14px; line-height: 1.6; resize: none; overflow-y: auto;
                    background: #f8f8f8; color: #333; font-family: inherit;"></textarea>
          <div style="padding: 10px; background: #f0f0f0; display: flex; gap: 8px; justify-content: space-between; align-items: center;">
            <div style="font-size: 12px; color: #666;">
              <span id="captionCount">Ready</span>
            </div>
            <div style="display: flex; gap: 8px;">
              <button id="copyBtn" disabled style="background: #e0e0e0; border: none; 
                      color: #999; padding: 6px 12px; border-radius: 5px; cursor: not-allowed; 
                      font-weight: bold; font-size: 11px;">📋 Copy</button>
              <button id="downloadBtn" disabled style="background: #e0e0e0; border: none; 
                      color: #999; padding: 6px 12px; border-radius: 5px; cursor: not-allowed; 
                      font-weight: bold; font-size: 11px;">💾 Save</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(transcriptWindow);

    // Make it draggable
    const header = document.getElementById('transcript-header');
    let isDragging = false;
    let currentX, currentY, initialX, initialY;

    header.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      isDragging = true;
      initialX = e.clientX - transcriptWindow.offsetLeft;
      initialY = e.clientY - transcriptWindow.offsetTop;
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        transcriptWindow.style.left = currentX + 'px';
        transcriptWindow.style.top = currentY + 'px';
        transcriptWindow.style.right = 'auto';
      }
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      isResizing = false;
    });

    // Make it resizable
    const resizeHandle = document.getElementById('resizeHandle');
    const container = document.getElementById('transcriptContainer');
    let isResizing = false;
    let startWidth, startHeight, startX, startY;

    resizeHandle.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;
      startY = e.clientY;
      startWidth = container.offsetWidth;
      startHeight = container.offsetHeight;
      e.preventDefault();
      e.stopPropagation();
    });

    document.addEventListener('mousemove', (e) => {
      if (isResizing) {
        const newWidth = Math.max(300, startWidth + (e.clientX - startX));
        const newHeight = Math.max(400, startHeight + (e.clientY - startY));
        container.style.width = newWidth + 'px';
        container.style.height = newHeight + 'px';
      }
    });

    // Elements
    const textArea = document.getElementById('transcriptText');
    const captionCountEl = document.getElementById('captionCount');
    const infoBox = document.getElementById('infoBox');
    const copyBtn = document.getElementById('copyBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const instantBtn = document.getElementById('instantBtn');
    const liveBtn = document.getElementById('liveBtn');
    const timestampToggle = document.getElementById('timestampToggle');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const languageSelect = document.getElementById('languageSelect');
    const optionsRow = document.getElementById('optionsRow');
    const mainContainer = transcriptWindow.querySelector('div');

    let transcript = []; // Array of {startTime, text} objects
    let isMinimized = false;
    let captureInterval = null;
    let currentMode = null;
    let availableTracks = [];

    const populateLanguageDropdown = () => {
      availableTracks = getAvailableTracks();
      languageSelect.innerHTML = '';

      if (availableTracks.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Default';
        languageSelect.appendChild(option);
        return false;
      }

      availableTracks.forEach((track, idx) => {
        const option = document.createElement('option');
        option.value = track.index;
        let label = track.label || 'Captions';
        if (track.language && track.language !== 'unknown') {
          label += ` (${track.language})`;
        }
        option.textContent = label;
        if (idx === 0) option.selected = true;
        languageSelect.appendChild(option);
      });

      console.log(`🌐 Found ${availableTracks.length} caption track(s)`);
      return true;
    };

    // Try to populate tracks immediately, retry if needed
    const initTracks = () => {
      // Set initial state
      languageSelect.innerHTML = '<option value="">Default</option>';

      let retries = 0;
      const retryInterval = setInterval(() => {
        const found = populateLanguageDropdown();
        retries++;
        if (found || retries >= 10) {
          clearInterval(retryInterval);
          if (!found) {
            console.log('⚠️ No caption tracks found, using default');
          }
        }
      }, 1000);
    };
    initTracks();

    const formatTranscript = () => {
      const includeTimestamps = timestampToggle.checked;
      return transcript.map(item => {
        if (includeTimestamps) {
          return `${formatTime(item.startTime)} ${item.text}`;
        }
        return item.text;
      }).join('\n\n');
    };

    const updateDisplay = () => {
      textArea.value = formatTranscript();
    };

    const enableButtons = () => {
      copyBtn.disabled = false;
      downloadBtn.disabled = false;
      copyBtn.style.background = '#6663F6';
      copyBtn.style.color = 'white';
      copyBtn.style.cursor = 'pointer';
      downloadBtn.style.background = '#6663F6';
      downloadBtn.style.color = 'white';
      downloadBtn.style.cursor = 'pointer';
    };

    const updateInfo = (message, type = 'info') => {
      const colors = {
        info: { bg: '#fffbea', border: '#f0e68c', text: '#856404' },
        success: { bg: '#d4edda', border: '#c3e6cb', text: '#155724' },
        error: { bg: '#f8d7da', border: '#f5c6cb', text: '#721c24' },
        active: { bg: '#d1ecf1', border: '#bee5eb', text: '#0c5460' }
      };
      const color = colors[type] || colors.info;
      infoBox.style.background = color.bg;
      infoBox.style.borderColor = color.border;
      infoBox.style.color = color.text;
      infoBox.textContent = message;
    };

    // Instant Fetch Mode
    instantBtn.addEventListener('click', async () => {
      if (currentMode === 'instant') return;
      
      // Stop live capture if running
      if (captureInterval) {
        clearInterval(captureInterval);
        captureInterval = null;
      }

      currentMode = 'instant';
      instantBtn.style.background = '#6663F6';
      instantBtn.style.color = 'white';
      liveBtn.style.background = 'white';
      liveBtn.style.color = '#6663F6';
      
      updateInfo('⏳ Fetching full transcript...', 'info');
      captionCountEl.textContent = 'Loading...';

      try {
        const selectedTrackIndex = languageSelect.value !== '' ? parseInt(languageSelect.value) : null;
        transcript = await fetchFullTranscript(selectedTrackIndex);
        updateDisplay();
        captionCountEl.textContent = `${transcript.length} segments • Instant mode`;
        updateInfo('✅ Full transcript loaded instantly!', 'success');
        enableButtons();
      } catch (error) {
        console.error('Error fetching transcript:', error);
        updateInfo('❌ Could not fetch transcript. Try Live Capture mode.', 'error');
        captionCountEl.textContent = 'Error';
      }
    });

    // Live Capture Mode
    liveBtn.addEventListener('click', () => {
      if (currentMode === 'live') return;

      currentMode = 'live';
      transcript = [];
      textArea.value = '';
      liveBtn.style.background = '#6663F6';
      liveBtn.style.color = 'white';
      instantBtn.style.background = 'white';
      instantBtn.style.color = '#6663F6';

      updateInfo('🎥 Capturing captions as video plays...', 'active');
      captionCountEl.textContent = '0 captions • Live mode';
      enableButtons();

      const video = findVideo();
      const textTracks = video?.textTracks;

      if (!video) {
        updateInfo('❌ Video element not found', 'error');
        return;
      }

      if (!textTracks || textTracks.length === 0) {
        updateInfo('❌ No caption tracks available for live capture', 'error');
        return;
      }

      // Use selected track or find first caption/subtitle track
      let captionTrack = null;
      const selectedTrackIndex = languageSelect.value !== '' ? parseInt(languageSelect.value) : null;

      if (selectedTrackIndex !== null && textTracks[selectedTrackIndex]) {
        captionTrack = textTracks[selectedTrackIndex];
      } else {
        for (let i = 0; i < textTracks.length; i++) {
          const track = textTracks[i];
          if (track.kind === 'captions' || track.kind === 'subtitles') {
            captionTrack = track;
            break;
          }
        }
      }

      if (!captionTrack) {
        updateInfo('❌ No caption tracks found', 'error');
        return;
      }

      captionTrack.mode = 'hidden'; // Enable track without showing
      console.log('📺 Live capture enabled for:', captionTrack.label);

      const seenTexts = new Set();
      captureInterval = setInterval(() => {
        const activeCues = captionTrack.activeCues;
        if (activeCues && activeCues.length > 0) {
          const cue = activeCues[0];
          const text = cue.text.replace(/<[^>]*>/g, '').trim(); // Remove HTML tags
          if (text && !seenTexts.has(text)) {
            seenTexts.add(text);
            transcript.push({ startTime: cue.startTime, text });
            updateDisplay();
            captionCountEl.textContent = `${transcript.length} captions • Live mode`;
            textArea.scrollTop = textArea.scrollHeight;
          }
        }
      }, 500);
    });

    // Copy button
    copyBtn.addEventListener('click', () => {
      if (copyBtn.disabled) return;
      textArea.select();
      navigator.clipboard.writeText(textArea.value).then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✅ Copied!';
        setTimeout(() => copyBtn.textContent = originalText, 2000);
      });
    });

    // Download button
    downloadBtn.addEventListener('click', () => {
      if (downloadBtn.disabled) return;
      const videoTitle = getVideoTitle();
      const filename = `${videoTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-transcript.txt`;

      const blob = new Blob([textArea.value], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      const originalText = downloadBtn.textContent;
      downloadBtn.textContent = '✅ Saved!';
      setTimeout(() => downloadBtn.textContent = originalText, 2000);
    });

    // Timestamp toggle
    timestampToggle.addEventListener('change', () => {
      if (transcript.length > 0) {
        updateDisplay();
      }
    });

    // Dark mode toggle
    const applyDarkMode = (isDark) => {
      if (isDark) {
        mainContainer.style.background = '#1e1e1e';
        mainContainer.style.borderColor = '#6663F6';
        textArea.style.background = '#2d2d2d';
        textArea.style.color = '#e0e0e0';
        optionsRow.style.background = '#2a2a2a';
        optionsRow.style.borderColor = '#444';
        optionsRow.querySelectorAll('label').forEach(l => l.style.color = '#bbb');
        languageSelect.style.background = '#333';
        languageSelect.style.color = '#e0e0e0';
        languageSelect.style.borderColor = '#555';
        infoBox.style.background = '#3a3520';
        infoBox.style.borderColor = '#5a5030';
        infoBox.style.color = '#d4c87a';
        captionCountEl.parentElement.style.background = '#2a2a2a';
        captionCountEl.style.color = '#999';
      } else {
        mainContainer.style.background = 'white';
        mainContainer.style.borderColor = '#6663F6';
        textArea.style.background = '#f8f8f8';
        textArea.style.color = '#333';
        optionsRow.style.background = '#f0f0f5';
        optionsRow.style.borderColor = '#e0e0e0';
        optionsRow.querySelectorAll('label').forEach(l => l.style.color = '#555');
        languageSelect.style.background = 'white';
        languageSelect.style.color = 'inherit';
        languageSelect.style.borderColor = '#ccc';
        infoBox.style.background = '#fffbea';
        infoBox.style.borderColor = '#f0e68c';
        infoBox.style.color = '#856404';
        captionCountEl.parentElement.style.background = '#f0f0f0';
        captionCountEl.style.color = '#666';
      }
    };

    darkModeToggle.addEventListener('change', () => {
      applyDarkMode(darkModeToggle.checked);
    });

    // Language selection change
    languageSelect.addEventListener('change', async () => {
      if (!currentMode) return;

      // Clear current transcript
      transcript = [];
      textArea.value = '';

      if (currentMode === 'instant') {
        // Re-fetch with new language
        updateInfo('⏳ Fetching transcript in selected language...', 'info');
        captionCountEl.textContent = 'Loading...';
        try {
          const selectedTrackIndex = languageSelect.value !== '' ? parseInt(languageSelect.value) : null;
          transcript = await fetchFullTranscript(selectedTrackIndex);
          updateDisplay();
          captionCountEl.textContent = `${transcript.length} segments • Instant mode`;
          updateInfo('✅ Full transcript loaded instantly!', 'success');
        } catch (error) {
          console.error('Error fetching transcript:', error);
          updateInfo('❌ Could not fetch transcript.', 'error');
          captionCountEl.textContent = 'Error';
        }
      } else if (currentMode === 'live') {
        // Restart live capture with new track
        if (captureInterval) {
          clearInterval(captureInterval);
          captureInterval = null;
        }
        // Re-trigger live mode
        currentMode = null;
        liveBtn.click();
      }
    });

    // Minimize button
    document.getElementById('minimizeBtn').addEventListener('click', () => {
      const body = document.getElementById('transcript-body');
      const btn = document.getElementById('minimizeBtn');
      if (isMinimized) {
        body.style.display = 'flex';
        btn.textContent = '−';
        isMinimized = false;
      } else {
        body.style.display = 'none';
        btn.textContent = '+';
        isMinimized = true;
      }
    });

    // Close button
    const closeWindow = () => {
      if (captureInterval) {
        clearInterval(captureInterval);
      }
      document.removeEventListener('keydown', handleKeydown);
      transcriptWindow.remove();
      window.loomTranscriptExtensionLoaded = false;
    };

    document.getElementById('closeBtn').addEventListener('click', closeWindow);

    // Keyboard shortcuts
    const handleKeydown = (e) => {
      // Escape to close
      if (e.key === 'Escape') {
        closeWindow();
        return;
      }

      // Ctrl/Cmd + C to copy (when not in textarea)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && document.activeElement !== textArea) {
        if (!copyBtn.disabled && transcript.length > 0) {
          navigator.clipboard.writeText(textArea.value).then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = '✅ Copied!';
            setTimeout(() => copyBtn.textContent = originalText, 2000);
          });
        }
      }
    };

    document.addEventListener('keydown', handleKeydown);

    console.log('🚀 Loom Transcript Extractor loaded! Choose your mode. (Press Esc to close)');
  };

  // SPA navigation detection - only trigger on URL path change
  let currentPath = window.location.pathname;

  const checkForNavigation = () => {
    const newPath = window.location.pathname;

    // Only reset if the URL path actually changed (not just blob URLs)
    if (newPath !== currentPath) {
      console.log('🔄 Navigation detected, resetting transcript extractor...');
      currentPath = newPath;

      // Remove existing window and reset flag
      const existingWindow = document.getElementById('loom-transcript-extractor');
      if (existingWindow) {
        existingWindow.remove();
      }
      window.loomTranscriptExtensionLoaded = false;

      // Re-initialize after a short delay
      setTimeout(() => {
        window.loomTranscriptExtensionLoaded = true;
        initTranscriptExtractor();
      }, 1000);
    }
  };

  // Check for navigation periodically
  setInterval(checkForNavigation, 2000);

  // Also listen for popstate (browser back/forward)
  window.addEventListener('popstate', () => {
    setTimeout(checkForNavigation, 500);
  });

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTranscriptExtractor);
  } else {
    initTranscriptExtractor();
  }
}