<template>
  <div class="w-full flex flex-col items-center mb-4">
    <div v-if="videoUrl" class="w-full flex flex-col items-center mb-4">
      <video
        :src="videoUrl"
        controls
        class="rounded-lg border border-blue-700 shadow-lg w-full max-w-xl mb-2 bg-black"
        width="640"
        height="360"
      ></video>
    </div>
    <div class="flex flex-wrap gap-2 items-center mb-2">
      <input v-model="metaTitle" placeholder="Title" class="text-white rounded px-2 py-1 border border-gray-400 text-black" />
      <input v-model="metaComment" placeholder="Comment" class="text-white rounded px-2 py-1 border border-gray-400 text-black" />
      <input v-model="metaDate" type="datetime-local" class="text-white rounded px-2 py-1 border border-gray-400 text-black" />
    </div>
    <div class="flex items-center gap-2 mb-2">
      <input type="checkbox" id="extractTracks" v-model="extractTracks" class="rounded border-gray-400" />
      <label for="extractTracks" class="text-sm text-gray-200">Extract audio and video separately</label>
    </div>
    <div class="flex flex-wrap gap-4 items-center mb-4">
      <span class="text-gray-200 font-semibold mr-2">Choose Output Resolutions:</span>
      <label v-for="option in resolutionOptions" :key="option.value" class="flex items-center gap-1 px-2 py-1 rounded bg-gray-800 text-gray-200 cursor-pointer hover:bg-blue-900 transition">
        <input
          type="checkbox"
          v-model="selectedResolutions"
          :value="option.value"
          class="accent-blue-500 rounded border-gray-400"
        />
        <span class="text-sm">{{ option.label }}</span>
      </label>
    </div>
    <div class="flex flex-wrap gap-4 items-center mb-4">
      <span class="text-white text-gray-200 font-semibold mr-2">Choose Framerate:</span>
      <label v-for="option in framerateOptions" :key="option.value" class="flex items-center gap-1 px-2 py-1 rounded bg-gray-800 text-gray-200 cursor-pointer hover:bg-blue-900 transition">
        <input
          type="radio"
          v-model="selectedFramerate"
          :value="option.value"
          class="text-white accent-blue-500 rounded border-gray-400"
        />
        <span class="text-sm">{{ option.label }}</span>
      </label>
    </div>
    <div class="flex flex-wrap gap-2 items-center mb-2">
      <input v-model="trimStart" placeholder="Start (e.g. 00:00:05)" class="placeholder-text-white text-white rounded px-2 py-1 border border-gray-400 text-black" />
      <input v-model="trimEnd" placeholder="End (e.g. 00:00:20)" class="text-white rounded px-2 py-1 border border-gray-400 text-black" />
      <label class="text-white text-sm text-gray-200">Trim Video</label>
    </div>
    <div class="flex flex-wrap gap-2 items-center mb-4">
      <button
        @click="downloadVideo('webm')"
        class="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
        :disabled="isConverting"
      >
        Download WebM
      </button>
      <button
        @click="downloadVideo('mp4')"
        class="px-4 py-2 rounded-lg bg-green-600 text-white font-bold shadow hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-400 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
        :disabled="isConverting"
      >
        Download MP4
      </button>
      <button
        @click="downloadVideo('hls')"
        class="px-4 py-2 rounded-lg bg-purple-600 text-white font-bold shadow hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
        :disabled="isConverting"
      >
        Download HLS (ZIP)
      </button>
      <button
        @click="downloadThumbnail"
        class="px-4 py-2 rounded-lg bg-yellow-400 text-black font-bold shadow hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-300 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
        :disabled="isConverting"
      >
        Download Thumbnail
      </button>
    </div>
    <span v-if="isConverting" class="text-blue-600 ml-2 w-full text-center sm:w-auto sm:text-left">Processing... Please wait.</span>
    <div v-if="isConverting" class="w-full mt-4">
      <div class="w-full bg-gray-700 rounded h-3 overflow-hidden">
        <div
          class="bg-blue-500 h-3 transition-all duration-200"
          :style="{ width: Math.round(progressValue * 100) + '%' }"
        ></div>
      </div>
      <div class="text-xs text-gray-300 mt-1 text-center">{{ Math.round(progressValue * 100) }}%</div>
    </div>
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
    const metaTitle = ref('');
    const metaComment = ref('');
    const pad = (n: number) => n.toString().padStart(2, '0');
    const now = new Date();
    const localDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const metaDate = ref(localDate);
    const ffmpegInstanceRef = shallowRef<FFmpeg | null>(null); // Use shallowRef
    let ffmpegLoadPromise: Promise<void> | null = null;
    const extractTracks = ref(false); // New reactive property for checkbox
    const resolutionOptions = [
      { label: '4K (3840x2160)', value: '3840x2160' },
      { label: '2.7K (2688x1520)', value: '2688x1520' },
      { label: '1440p (2560x1440)', value: '2560x1440'},
      { label: '1080p (1920x1080)', value: '1920x1080' },
      { label: '720p (1280x720)', value: '1280x720' },
      { label: '480p (854x480)', value: '854x480' },
      { label: '360p (640x360)', value: '640x360' },
    ];
    const selectedResolutions = ref<string[]>(['1920x1080']); // Default to 1080p
    const progressValue = ref(0); // Progress value for the conversion process
    const framerateOptions = [
      { label: '60 FPS', value: 60 },
      { label: '30 FPS', value: 30 },
      { label: '24 FPS', value: 24 },
    ];
    const selectedFramerate = ref(30); // Default to 30 FPS
    const trimStart = ref('');
    const trimEnd = ref('');
    const previewUrl = ref<string | null>(null);
    const previewType = ref<'mp4' | 'webm' | null>(null);

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

    const triggerDownload = (urlOrBlob: string | Blob, filename: string) => {
  let url: string;
  if (typeof urlOrBlob === 'string') {
    url = urlOrBlob;
  } else {
    url = URL.createObjectURL(urlOrBlob);
  }
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
        progressValue.value = 0; // Reset progress value

        try {
          const ffmpeg = await getFFmpeg();

          ffmpeg.on('progress', ({ progress}) => {
            progressValue.value = (progress / -100000000.00*4) ; // ratio is 0.0 to 1.0
          });

          const inputFilename = 'input.webm'; // Assuming input is always webm from props.videoUrl

          console.log(`Workspaceing video file for conversion: ${props.videoUrl}`);
          const inputData = await fetchFile(props.videoUrl);
          
          // Clean up input file from previous run, if any
          try {
            await ffmpeg.deleteFile(inputFilename);
          } catch (e) { /* ignore if file doesn't exist */ }
          await ffmpeg.writeFile(inputFilename, inputData);

          if (format === 'mp4') {
            const generatedFiles: { filename: string; blob: Blob }[] = [];
            for (const res of selectedResolutions.value) {
              const [w, h] = res.split('x');
              const outputFilename = `output-${w}x${h}.mp4`;
              try { await ffmpeg.deleteFile(outputFilename); } catch {}

              const filterChain = [`scale=${w}:${h}`, 'format=yuv420p'];
              const trimArgs = [];
              if (trimStart.value) trimArgs.push('-ss', trimStart.value);
              if (trimEnd.value) trimArgs.push('-to', trimEnd.value);

              await ffmpeg.exec([
                ...trimArgs,
                '-i', inputFilename,
                '-vf', filterChain.join(','),
                '-r', String(selectedFramerate.value),
                '-c:v', 'libx264',
                '-preset', 'ultrafast',
                '-c:a', 'aac',
                ...(metaTitle.value ? ['-metadata', `title=${metaTitle.value}`] : []),
                ...(metaComment.value ? ['-metadata', `comment=${metaComment.value}`] : []),
                ...(metaDate.value ? ['-metadata', `date=${metaDate.value}`] : []),
                outputFilename
              ]);
              const outputData = await ffmpeg.readFile(outputFilename);
              const mp4Blob = new Blob([outputData.buffer], { type: 'video/mp4' });
              generatedFiles.push({
                filename: metaTitle.value ? `${metaTitle.value}-${w}x${h}.mp4` : `recorded-video-${w}x${h}.mp4`,
                blob: mp4Blob
              });
              await ffmpeg.deleteFile(outputFilename);
            }

            if (generatedFiles.length > 1) {
              // Zip all files
              const zip = new JSZip();
              for (const file of generatedFiles) {
                zip.file(file.filename, file.blob);
              }
              const zipBlob = await zip.generateAsync({ type: "blob" });
              const zipUrl = URL.createObjectURL(zipBlob);
              triggerDownload(zipUrl, metaTitle.value ? `${metaTitle.value}-videos.zip` : 'recorded-videos.zip');
            } else if (generatedFiles.length === 1) {
              // Single file, download directly
              triggerDownload(generatedFiles[0].blob, generatedFiles[0].filename);
            }
          } else if (format === 'hls') {
            const hlsOutputDir = 'hls_output';
            const playlistFilename = 'playlist.m3u8';
            const segmentFilenamePattern = 'segment%03d.ts';

            // Clean up HLS output directory from previous run
            try {
              console.log(`Cleaning up HLS output directory: ${hlsOutputDir}`);
              // Note: FFmpeg.wasm FS API might not have rmdir or advanced recursive delete.
              // We list and delete files. If readdir fails, we assume dir doesn't exist.
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
          '-c:v', 'libx264', '-preset', 'ultrafast',
          '-r', String(selectedFramerate.value),
          '-c:a', 'aac',
          ...(metaTitle.value ? ['-metadata', `title=${metaTitle.value}`] : []),
          ...(metaComment.value ? ['-metadata', `comment=${metaComment.value}`] : []),
          ...(metaDate.value ? ['-metadata', `date=${metaDate.value}`] : []),
          '-hls_time', '10',
          '-hls_playlist_type', 'vod',
          '-hls_segment_filename', `${hlsOutputDir}/${segmentFilenamePattern}`,
          '-f', 'hls',
          `${hlsOutputDir}/${playlistFilename}`
        ]);
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

        // Extract audio and video if the option is enabled
        if (extractTracks.value) {
          // Extract audio
          const audioFilename = 'extracted-audio.m4a';
          try { await ffmpeg.deleteFile(audioFilename); } catch {}
          await ffmpeg.exec([
            '-i', inputFilename,
            '-vn',
            '-acodec', 'aac',
            audioFilename
          ]);
          const audioData = await ffmpeg.readFile(audioFilename);
          hlsFolderInZip!.file(audioFilename, audioData);
          await ffmpeg.deleteFile(audioFilename);

          // Extract video (no audio)
          const videoOnlyFilename = 'extracted-video.mp4';
          try { await ffmpeg.deleteFile(videoOnlyFilename); } catch {}
          await ffmpeg.exec([
            '-i', inputFilename,
            '-an',
            '-vcodec', 'copy',
            videoOnlyFilename
          ]);
          const videoData = await ffmpeg.readFile(videoOnlyFilename);
          hlsFolderInZip!.file(videoOnlyFilename, videoData);
          await ffmpeg.deleteFile(videoOnlyFilename);
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const zipUrl = URL.createObjectURL(zipBlob);
        triggerDownload(zipUrl, 'recorded-video-hls.zip');
      }
    };

    const downloadThumbnail = async () => {
      isConverting.value = true;
      try {
        const ffmpeg = await getFFmpeg();
        const inputFilename = 'input.webm';
        const thumbFilename = 'thumbnail.png';

        // Write input file if not present
        try { await ffmpeg.deleteFile(inputFilename); } catch {}
        const inputData = await fetchFile(props.videoUrl);
        await ffmpeg.writeFile(inputFilename, inputData);

        await ffmpeg.exec([
          '-i', inputFilename,
          '-ss', trimStart.value || '00:00:01',
          '-frames:v', '1',
          thumbFilename
        ]);
        const thumbData = await ffmpeg.readFile(thumbFilename);
        const thumbBlob = new Blob([thumbData.buffer], { type: 'image/png' });
        const thumbUrl = URL.createObjectURL(thumbBlob);
        triggerDownload(thumbUrl, 'thumbnail.png');
        await ffmpeg.deleteFile(thumbFilename);
        await ffmpeg.deleteFile(inputFilename);
      } catch (e) {
        alert('Failed to generate thumbnail.');
      } finally {
        isConverting.value = false;
      }
    };

    return {
      downloadVideo,
      downloadThumbnail,
      isConverting,
      metaTitle,
      metaComment,
      metaDate,
      extractTracks,
      resolutionOptions,
      selectedResolutions,
      progressValue,
      framerateOptions,
      selectedFramerate,
      trimStart,
      trimEnd,
      previewUrl,
      previewType,
    };
  },
});
</script>
