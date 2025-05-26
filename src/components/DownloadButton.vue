<template>
  <div class="flex gap-2 items-center">
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
    <span v-if="isConverting" class="text-blue-600 ml-2">Converting to MP4... Please wait.</span>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

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
    const ffmpegInstanceRef = ref<FFmpeg | null>(null);
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
        const ffmpegCoreDirectory = '/ffmpeg-core/'; 

        try {
          console.log(`Attempting to load FFmpeg core files from public path: ${ffmpegCoreDirectory}`);
          
          const coreURL = await toBlobURL(`${ffmpegCoreDirectory}ffmpeg-core.js`, 'application/javascript');
          const wasmURL = await toBlobURL(`${ffmpegCoreDirectory}ffmpeg-core.wasm`, 'application/wasm');
          const workerURL = await toBlobURL(`${ffmpegCoreDirectory}ffmpeg-core.worker.js`, 'application/javascript');

          console.log('Blob URLs created:');
          console.log('Core URL:', coreURL);
          console.log('WASM URL:', wasmURL);
          console.log('Worker URL:', workerURL);

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

    const downloadVideo = async (format: 'webm' | 'mp4') => {
      if (format === 'mp4' && isConverting.value) {
        console.warn('MP4 conversion is already in progress.');
        return;
      }
      if (isConverting.value && format !== 'mp4') {
         console.warn('A conversion is in progress, please wait.');
         return;
      }

      if (format === 'webm') {
        try {
          const a = document.createElement('a');
          a.href = props.videoUrl;
          a.download = 'recorded-video.webm';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } catch (error) {
          console.error('Error downloading WebM:', error);
          // Avoid using alert in modern web apps if possible. Consider a toast notification system.
          // For now, keeping it simple as per original code's error handling style.
          alert('Failed to download WebM video.');
        }
      } else if (format === 'mp4') {
        isConverting.value = true;
        try {
          const ffmpeg = await getFFmpeg();

          if (!props.videoUrl) {
            throw new Error("Video URL is not provided for MP4 conversion.");
          }
          console.log(`Fetching video file for MP4 conversion: ${props.videoUrl}`);
          const inputData = await fetchFile(props.videoUrl);
          
          const inputFilename = 'input.webm';
          const outputFilename = 'output.mp4';

          // Clean up files from previous runs, if any
          try {
            await ffmpeg.deleteFile(inputFilename);
          } catch (e) { /* ignore if file doesn't exist */ }
          try {
            await ffmpeg.deleteFile(outputFilename);
          } catch (e) { /* ignore if file doesn't exist */ }

          // Write the fetched video data to FFmpeg's virtual file system
          await ffmpeg.writeFile(inputFilename, inputData);

          console.log('Starting FFmpeg conversion to MP4...');
          // Standard command for good compatibility
          // The .run() method takes an array of arguments
          await ffmpeg.exec(['-i', inputFilename, '-vf', 'format=yuv420p', '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', outputFilename]);
          console.log('Conversion finished.');

          // Read the converted MP4 data from FFmpeg's virtual file system
          const outputData = await ffmpeg.readFile(outputFilename);

          // Clean up files from FFmpeg's virtual file system after use
          await ffmpeg.deleteFile(inputFilename);
          await ffmpeg.deleteFile(outputFilename);

          const mp4Blob = new Blob([outputData.buffer], { type: 'video/mp4' });
          const mp4Url = URL.createObjectURL(mp4Blob);

          const a = document.createElement('a');
          a.href = mp4Url;
          a.download = 'recorded-video.mp4';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(mp4Url);

        } catch (error) {
          console.error('Error during MP4 conversion or FFmpeg setup:', error);
          alert(`Operation failed: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
          isConverting.value = false;
        }
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
