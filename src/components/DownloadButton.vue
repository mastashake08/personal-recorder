<template>
  <div class="flex flex-wrap gap-2 items-center">
    <button
      @click="downloadVideo('webm')"
      class="download-btn"
      :disabled="isConverting"
    >
      Download WebM
    </button>
    <button
      @click="downloadVideo('mp4')"
      class="download-btn"
      :disabled="isConverting"
    >
      Download MP4
    </button>
    <button
      @click="downloadVideo('hls')"
      class="download-btn"
      :disabled="isConverting"
    >
      Download HLS (ZIP)
    </button>
    <span v-if="isConverting" class="text-blue-600 ml-2 w-full text-center sm:w-auto sm:text-left">Processing... Please wait.</span>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, shallowRef } from 'vue'; // Using shallowRef for ffmpegInstanceRef
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import JSZip from 'jszip'; // Import JSZip

export default defineComponent({
  name: 'DownloadButton',
  props: {
    videoUrl: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const isConverting = ref(false);
    const ffmpegInstanceRef = shallowRef<FFmpeg | null>(null); // Use shallowRef
    let ffmpegLoadPromise: Promise<void> | null = null;

    const getFFmpeg = async (): Promise<FFmpeg> => {
      if (ffmpegLoadPromise) {
        try {
          await ffmpegLoadPromise;
          if (ffmpegInstanceRef.value) {
            return ffmpegInstanceRef.value;
          }
        } catch (error) {
          console.warn('Previous FFmpeg load attempt failed. Retrying.', error);
          ffmpegInstanceRef.value = null;
          ffmpegLoadPromise = null;
        }
      }

      if (!ffmpegLoadPromise) {
        console.log('Creating and loading new FFmpeg instance.');
        const ffmpegCoreDirectory = '/personal-recorder/ffmpeg-core/'; 

        try {
          console.log(`Attempting to load FFmpeg core files from public path: ${ffmpegCoreDirectory}`);
          
          const coreURL = await toBlobURL(`${ffmpegCoreDirectory}ffmpeg-core.js`, 'application/javascript');
          const wasmURL = await toBlobURL(`${ffmpegCoreDirectory}ffmpeg-core.wasm`, 'application/wasm');
          const workerURL = await toBlobURL(`${ffmpegCoreDirectory}ffmpeg-core.worker.js`, 'application/javascript');

          const newInstance = new FFmpeg({
            log: true,
            coreURL,
            wasmURL,
            workerURL,
          });
          
          ffmpegLoadPromise = newInstance.load(); 
          await ffmpegLoadPromise;

          console.log('FFmpeg core (and worker, if applicable) loaded successfully.');
          ffmpegInstanceRef.value = newInstance;

        } catch (loadError) {
          console.error(
            `Error during FFmpeg setup or loading. Check paths and COOP/COEP headers.`,
            loadError
          );
          ffmpegInstanceRef.value = null;
          ffmpegLoadPromise = null;
          throw loadError;
        }
      }

      if (!ffmpegInstanceRef.value) {
        throw new Error('FFmpeg instance could not be initialized or loaded after attempts.');
      }
      return ffmpegInstanceRef.value;
    };

    const triggerDownload = (url: string, filename: string) => {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    };

    const downloadVideo = async (format: 'webm' | 'mp4' | 'hls') => {
      if (isConverting.value) {
        console.warn('A conversion is already in progress.');
        return;
      }

      if (!props.videoUrl) {
        alert("Video URL is not available.");
        return;
      }

      if (format === 'webm') {
        try {
          triggerDownload(props.videoUrl, 'recorded-video.webm');
        } catch (error) {
          console.error('Error downloading WebM:', error);
          alert('Failed to download WebM video.');
        }
      } else if (format === 'mp4' || format === 'hls') {
        isConverting.value = true;
        try {
          const ffmpeg = await getFFmpeg();
          const inputFilename = 'input.webm'; // Assuming input is always webm from props.videoUrl

          console.log(`Workspaceing video file for conversion: ${props.videoUrl}`);
          const inputData = await fetchFile(props.videoUrl);
          
          // Clean up input file from previous run, if any
          try {
            await ffmpeg.deleteFile(inputFilename);
          } catch (e) { /* ignore if file doesn't exist */ }
          await ffmpeg.writeFile(inputFilename, inputData);

          if (format === 'mp4') {
            const outputFilename = 'output.mp4';
            try {
              await ffmpeg.deleteFile(outputFilename);
            } catch (e) { /* ignore */ }

            console.log('Starting FFmpeg conversion to MP4...');
            await ffmpeg.exec([ // Corrected from ffmpeg.exec to ffmpeg.exec
              '-i', inputFilename, 
              '-vf', 'format=yuv420p', // For wider compatibility
              '-c:v', 'libx264', 
              '-preset', 'ultrafast', 
              '-c:a', 'aac', 
              outputFilename
            ]);
            console.log('MP4 Conversion finished.');
            const outputData = await ffmpeg.readFile(outputFilename);
            const mp4Blob = new Blob([outputData.buffer], { type: 'video/mp4' });
            const mp4Url = URL.createObjectURL(mp4Blob);
            triggerDownload(mp4Url, 'recorded-video.mp4');
            await ffmpeg.deleteFile(outputFilename);

          } else if (format === 'hls') {
            const hlsOutputDir = 'hls_output';
            const playlistFilename = 'playlist.m3u8';
            const segmentFilenamePattern = 'segment%03d.ts';

            // Clean up HLS output directory from previous run
            try {
              console.log(`Cleaning up HLS output directory: ${hlsOutputDir}`);
              // Note: FFmpeg.wasm FS API might not have rmdir or advanced recursive delete.
              // We list and delete files. If readdir fails, we assume dir doesn't exist.
              const filesInDir = await ffmpeg.listDir(hlsOutputDir);
              const dir = await ffmpeg.createDir(hlsOutputDir);
                  console.log(`Directory ${dir} created successfully.`);
                  console.log('Starting FFmpeg conversion to HLS...');
            
          
            console.log('Starting FFmpeg conversion to HLS...');
            await convertHLS(ffmpeg, inputFilename, hlsOutputDir, segmentFilenamePattern, playlistFilename);
                console.log('HLS Conversion finished.');
            } catch (e) {
              // Directory likely doesn't exist, try to create it
              console.warn(`Directory ${hlsOutputDir} does not exist, attempting to create it.`);
              try {
                  
              } catch (createErr) {
                  console.warn(`Could not create directory ${hlsOutputDir}: `, createErr);
                  // If creation fails, FFmpeg might still create it, or fail if segments can't be written.
              }
            }
            
          }

          await ffmpeg.deleteFile(inputFilename);

        } catch (error) {
          console.error(`Error during ${format.toUpperCase()} conversion:`, error);
          alert(`Operation failed: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
          isConverting.value = false;
        }
      }

      async function convertHLS(ffmpeg: FFmpeg, inputFilename: string, hlsOutputDir: string, segmentFilenamePattern: string, playlistFilename: string) {
        await ffmpeg.exec([
          '-i', inputFilename,
          // Using -codec copy for speed, assuming input is compatible (e.g., H.264/AAC)
          // For WebM input, re-encoding is necessary for HLS compatibility:
          '-c:v', 'libx264', '-preset', 'ultrafast',
          '-c:a', 'aac',
          '-hls_time', '10', // 10-second segments
          '-hls_playlist_type', 'vod', // Video on Demand playlist
          '-hls_segment_filename', `${hlsOutputDir}/${segmentFilenamePattern}`,
          '-f', 'hls',
          `${hlsOutputDir}/${playlistFilename}`
        ]
        );
        console.log('HLS Conversion finished.');

        const zip = new JSZip();
        const hlsFolderInZip = zip.folder("hls_stream");

        // Add playlist to zip
        const playlistData = await ffmpeg.readFile(`${hlsOutputDir}/${playlistFilename}`);
        hlsFolderInZip!.file(playlistFilename, playlistData);
        await ffmpeg.deleteFile(`${hlsOutputDir}/${playlistFilename}`);

        // Add segments to zip
        // List files in the HLS output directory to get all generated .ts files
        const outputFiles = await ffmpeg.listDir(hlsOutputDir);
        for (const file of outputFiles) {
          if (file.name.endsWith('.ts') && !file.isDir) {
            const segmentData = await ffmpeg.readFile(`${hlsOutputDir}/${file.name}`);
            hlsFolderInZip!.file(file.name, segmentData);
            await ffmpeg.deleteFile(`${hlsOutputDir}/${file.name}`);
          }
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const zipUrl = URL.createObjectURL(zipBlob);
        triggerDownload(zipUrl, 'recorded-video-hls.zip');
      }
    };

    return {
      downloadVideo,
      isConverting,
    };
  },
});
</script>

<style scoped>
.download-btn {
  padding: 0.5rem 1.2rem;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  background: #2563eb; /* Tailwind blue-600 */
  color: #fff;
  transition: background 0.2s, color 0.2s, opacity 0.2s;
}
.download-btn:hover {
  background: #1d4ed8; /* Tailwind blue-700 */
}
.download-btn:disabled {
  background: #9ca3af; /* Tailwind gray-400 */
  cursor: not-allowed;
  opacity: 0.7;
}
</style>
