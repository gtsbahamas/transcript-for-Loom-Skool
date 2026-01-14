# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Chrome Extension (Manifest V3) that extracts transcripts from Loom videos. Works on direct Loom pages and embedded videos (Skool, Notion).

## Architecture

- **manifest.json**: Extension configuration - defines permissions, host patterns, and content script injection rules
- **content.js**: Single content script that injects a floating UI and extracts captions via two modes:
  - **Instant mode**: Fetches all cues from video's TextTrack API at once
  - **Live mode**: Captures captions in real-time as video plays using `activeCues`

## Features

- **Timestamp export**: Optional `[M:SS]` or `[H:MM:SS]` timestamps before each caption
- **Language selection**: Dropdown to choose between multiple caption tracks
- **Dark mode**: Toggle for dark theme
- **Resizable window**: Drag bottom-right corner to resize (min 300x400)
- **Keyboard shortcuts**: `Esc` to close, `Ctrl/Cmd+C` to copy
- **SPA navigation**: Auto-resets when navigating to a new video

## Key Technical Details

- Uses `textTracks` API to access video captions (`kind: 'captions'` or `kind: 'subtitles'`)
- Track mode set to `'hidden'` to load cues without displaying native captions
- Strips HTML tags like `<v Speaker>` from cue text
- Runs in `all_frames: true` to work in embedded iframes
- Uses `document_idle` timing with additional polling (up to 60s) for slow-loading embeds
- `getVideoTitle()` uses multiple fallback selectors for robust title detection
- Navigation detection via URL polling and `popstate` listener

## Development

**Load extension locally:**
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select this directory

**Test on:**
- Direct: `https://www.loom.com/share/*`
- Embedded: Any Skool or Notion page with Loom embeds

**Debug:** Check console for prefixed logs (`🔍`, `✅`, `📝`, `🔄`, etc.)
