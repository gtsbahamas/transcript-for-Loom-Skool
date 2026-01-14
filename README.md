# Loom Transcript Extractor

Chrome extension that extracts transcripts from Loom videos. Works on direct Loom pages and embedded videos (Skool, Notion, etc.).

## Features

- **Instant Mode**: Fetch the full transcript immediately
- **Live Capture**: Capture captions in real-time as the video plays
- **Timestamps**: Optional `[M:SS]` timestamps before each caption
- **Language Selection**: Choose from multiple caption tracks
- **Dark Mode**: Easy on the eyes
- **Resizable Window**: Drag the corner to resize
- **Keyboard Shortcuts**: `Esc` to close, `Ctrl/Cmd+C` to copy
- **Copy & Download**: Export as `.txt` file

## Installation

### From Source (Developer Mode)

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top right)
4. Click **Load unpacked**
5. Select the folder containing this extension
6. Navigate to any Loom video - the transcript window will appear automatically

## Usage

1. Open a Loom video (direct link or embedded)
2. Wait for the transcript window to appear (top right)
3. Choose a mode:
   - **Get Full Transcript**: Fetches all captions instantly
   - **Live Capture**: Records captions as video plays
4. Optionally enable timestamps or switch languages
5. Copy to clipboard or download as text file

## Supported Sites

- `https://www.loom.com/share/*`
- `https://www.loom.com/embed/*`
- `https://*.skool.com/*` (embedded Loom videos)
- `https://*.notion.site/*` (embedded Loom videos)

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Esc` | Close transcript window |
| `Ctrl/Cmd + C` | Copy transcript (when not selecting text) |

## Troubleshooting

**Transcript window doesn't appear?**
- Wait up to 60 seconds for embedded videos to load
- Check if the video has captions enabled
- Refresh the page and try again

**No caption tracks found?**
- The video may not have captions
- Try Live Capture mode while playing the video

**Language dropdown empty?**
- Wait a few seconds for tracks to load
- Some videos only have one language track

## Version History

- **1.5.0**: Added timestamps, language selection, dark mode, resizable window, keyboard shortcuts, SPA navigation
- **1.4.0**: Initial release with instant and live capture modes
