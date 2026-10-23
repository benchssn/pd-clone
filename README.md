# Phase

A minimal, Pure Data-inspired sound laboratory. Two oscillators feed a mixer and a stereo output. Hear sine, square, triangle and sawtooth waves while watching the waveform or spectrum.

## Run

With Node.js installed, run `npm run dev`, then open http://localhost:5173. There are no packages to install. You can also serve this directory with any static web server.

## Use

- Click **Start audio** to enable sound. Start with a quiet listening volume.
- Tune each source between 20 and 2,000 Hz, select its shape, and adjust its contribution in the mixer.
- Drag the output dial vertically, use its slider, or focus the dial and use the arrow keys.
- Explore the starting patches, create a new patch, or write observations in Notes.
- Settings save automatically in the current browser. **Save patch** downloads a JSON file; drop it onto Phase to restore it, or press Command/Ctrl+O.
- Space toggles audio; M toggles mute; Command/Ctrl+K creates a patch; Command/Ctrl+Z and Shift+Command/Ctrl+Z undo and redo changes.
- Freeze pauses the visual display while audio continues. The scope previews the signal when audio is stopped and uses actual analyser data during playback.

Built with browser-native Web Audio and Canvas APIs. Audio is generated locally; no microphone access, server processing, or account is needed. Waveforms are the browser's band-limited oscillator implementations. The output has gain headroom to avoid clipping when both sources are at full level. This is a fixed signal chain inspired by Pure Data, not a `.pd` file editor.
