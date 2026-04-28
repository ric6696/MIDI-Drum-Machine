# MIDI Lab Project M2 - Web Drum Machine

A web-based drum machine built with HTML, CSS, and JavaScript. It provides a 16-step sequencer grid, per-row instrument assignment, adjustable tempo and swing, pattern slots, and master/per-row volume control. Audio playback is driven by a MIDI drum soundfont using WebAudioFont, with a simple fallback if a soundfont is not loaded yet.

## Features

- 16-step grid sequencer with visual step highlighting
- Multiple rows mapped to different drum instruments
- Per-row volume control and master volume
- Tempo and swing control with real-time playback updates
- Pattern slots with save/load (localStorage)

## Project Structure

- index.html: UI layout and script/style includes
- styles.css: Visual design and responsive layout
- app.js: Sequencer logic, pattern data, and audio scheduling

## Run Locally

1. Open index.html in a modern browser (Chrome or Edge recommended).
2. Click anywhere on the page to unlock audio.
3. Toggle cells to build a pattern and press Play.

## Soundfont Setup [This Has to be Fixed]

This project expects a WebAudioFont JS soundfont file.

1. Place your soundfont file in the project root.
2. Update these constants in app.js:
   - SOUND_FONT_URL: path to the soundfont file
   - SOUND_FONT_VARIABLE: global variable exported by the soundfont

Example:

- SOUND_FONT_URL = "./drum-soundfont.js"
- SOUND_FONT_VARIABLE = "DRUM_SOUNDFONT"

## Collaboration

Clone the repository, create a branch, and submit changes through pull requests.

## License

For course use only.
