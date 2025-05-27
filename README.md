# personal-recorder

A powerful in-browser video recorder and processor built with Vue 3, Vite, and FFmpeg.wasm.  
Record your screen and/or camera, apply filters, trim, export in multiple resolutions and framerates, extract audio/video tracks, and more—all client-side!

---

## Features

- **Screen, camera, or both (PiP) recording**
- **Live filter selection** (grayscale, invert, sepia, blur, sharpen, etc.)
- **Multiple output resolutions** (4K, 2.7K, 1440p, 1080p, 720p, 480p, 360p)
- **Framerate selection** (60, 30, 24 FPS)
- **Trim/cut video** (set start/end times)
- **Metadata support** (title, comment, date)
- **Extract audio/video tracks separately**
- **HLS (HTTP Live Streaming) export (as ZIP)**
- **Thumbnail/preview image generation**
- **FFmpeg progress bar**
- **Preview processed video before download**
- 100% runs in your browser—no server upload required!

---

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (disable Vetur).

---

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking.  
In editors, use [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

---

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

---

## FFmpeg.wasm Setup

- Place `ffmpeg-core.js`, `ffmpeg-core.wasm`, and `ffmpeg-core.worker.js` in `public/ffmpeg-core/`.
- For best results, run with proper COOP/COEP headers (see [FFmpeg.wasm FAQ](https://ffmpegwasm.netlify.app/docs/faq#why-do-i-get-sharedarraybuffer-is-not-defined-error)).

---

## Usage

1. **Record:** Choose your source (screen/camera), filters, and start recording.
2. **Process:** Select output resolutions, framerate, trim, and other options.
3. **Export:** Download as WebM, MP4, HLS (ZIP), or extract audio/video tracks.
4. **Preview:** Watch your processed video before downloading.

---

## License

MIT

---
