<template>
  <div class="video-recorder flex flex-col items-center bg-white/80 dark:bg-gray-800/80 rounded-lg shadow-lg p-6 w-full max-w-lg">
    <canvas ref="canvasRef" class="border-2 border-gray-300 rounded-lg mb-4 shadow" width="640" height="480"></canvas>
    <div class="flex gap-2 mb-4">
      <button @click="startRecording" class="btn btn-blue" :disabled="isRecording">Start Recording</button>
      <button @click="stopRecording" class="btn btn-red" :disabled="!isRecording">Stop Recording</button>
      <button @click="switchMedia" class="btn btn-yellow" :disabled="false">Switch Media</button>
    </div>
    <FilterSelector @filter-applied="applyFilter" :filters="filters"/>
    <DownloadButton :video-url="videoUrl" v-if="videoUrl" />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onUnmounted, shallowRef } from 'vue';
import FilterSelector from './FilterSelector.vue';
// Assuming DownloadButton is the component from the previous context (ffmpeg_download_button_vue_fix_vite_worker)
// You'll need to ensure its path is correct.
import DownloadButton from './DownloadButton.vue';

export default defineComponent({
  name: 'VideoRecorder',
  components: {
    FilterSelector,
    DownloadButton,
  },
  setup() {
    const videoEl = document.createElement('video');
    videoEl.autoplay = true;
    videoEl.playsInline = true;
    videoEl.muted = true; // Mute playback to avoid feedback loop if mic is captured

    const canvasRef = ref<HTMLCanvasElement | null>(null);
    const mediaRecorder = shallowRef<MediaRecorder | null>(null); // shallowRef for non-reactive MediaRecorder
    const recordedChunks = ref<Blob[]>([]);
    const isRecording = ref(false);
    const videoUrl = ref<string | null>(null);
    const currentSourceStream = shallowRef<MediaStream | null>(null); // The current camera/screen stream
    const isScreenRecording = ref(false);
    const animationFrameId = ref<number | null>(null);

    const filterOptions = [
      { id: 'none', name: 'None' },
      { id: 'grayscale', name: 'Grayscale' },
      { id: 'invert', name: 'Invert' },
      { id: 'sepia', name: 'Sepia' },
      { id: 'blur', name: 'Blur' },
      { id: 'sharpen', name: 'Sharpen' },
      { id: 'techNoir', name: 'Tech Noir (SVG)' },
      { id: 'neonSurge', name: 'Neon Surge (SVG)' },
      { id: 'hackerGlow', name: 'HackerGlow (SVG)' },
      { id: 'binaryFrost', name: 'Binary Frost (SVG)' },
      { id: 'byteCrush', name: 'Byte Crush (SVG)' },
      { id: 'dataDrift', name: 'Data Drift (SVG)' },
      { id: 'circuitPulse', name: 'Circuit Pulse (SVG)' },
      { id: 'quantumBurst', name: 'Quantum Burst (SVG)' },
      { id: 'colorPop', name: 'Color Pop (SVG)' },
      { id: 'highContrastBW', name: 'High Contrast B&W (SVG)' },
      { id: 'softBW', name: 'Soft B&W (SVG)' },
      { id: 'bwWithBlur', name: 'B&W with Blur (SVG)' },
      { id: 'sharpBW', name: 'Sharp B&W (SVG)' },
    ];
    const filters = ref(filterOptions);
    const selectedFilter = ref('none');

    const drawToCanvas = () => {
      if (!canvasRef.value || videoEl.paused || videoEl.ended) {
        animationFrameId.value = requestAnimationFrame(drawToCanvas);
        return;
      }
      const ctx = canvasRef.value.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height);
      ctx.save(); // Save context state

      // Apply CSS filters
      if (selectedFilter.value === 'grayscale') ctx.filter = 'grayscale(100%)';
      else if (selectedFilter.value === 'invert') ctx.filter = 'invert(100%)';
      else if (selectedFilter.value === 'sepia') ctx.filter = 'sepia(100%)';
      else if (selectedFilter.value === 'blur') ctx.filter = 'blur(4px)';
      // Apply SVG filters
      else if ([
          'techNoir', 'neonSurge', 'hackerGlow', 'binaryFrost', 'byteCrush', 'dataDrift',
          'circuitPulse', 'quantumBurst', 'colorPop', 'highContrastBW', 'softBW',
          'bwWithBlur', 'sharpBW'
        ].includes(selectedFilter.value)) {
        ctx.filter = `url(#${selectedFilter.value})`;
      }
      // Note: 'sharpen' is handled after drawing if it's a manual ImageData manipulation

      ctx.drawImage(videoEl, 0, 0, canvasRef.value.width, canvasRef.value.height);
      ctx.restore(); // Restore context state (clears filter)

      // Apply manual sharpen filter (if selected)
      if (selectedFilter.value === 'sharpen') {
        const imageData = ctx.getImageData(0, 0, canvasRef.value.width, canvasRef.value.height);
        applySharpen(imageData); // This function modifies imageData in place
        ctx.putImageData(imageData, 0, 0);
      }
      
      animationFrameId.value = requestAnimationFrame(drawToCanvas);
    };

    function applySharpen(imageData: ImageData) {
      const weights = [0, -1, 0, -1, 5, -1, 0, -1, 0];
      const side = 3;
      const src = imageData.data;
      const sw = imageData.width;
      const sh = imageData.height;
      const output = new Uint8ClampedArray(src.length);
      const halfSide = Math.floor(side / 2);

      for (let y = 0; y < sh; y++) {
        for (let x = 0; x < sw; x++) {
          const dstOff = (y * sw + x) * 4;
          let r = 0, g = 0, b = 0;
          for (let cy = 0; cy < side; cy++) {
            for (let cx = 0; cx < side; cx++) {
              const scy = Math.min(sh - 1, Math.max(0, y + cy - halfSide));
              const scx = Math.min(sw - 1, Math.max(0, x + cx - halfSide));
              const srcOff = (scy * sw + scx) * 4;
              const wt = weights[cy * side + cx];
              r += src[srcOff] * wt;
              g += src[srcOff + 1] * wt;
              b += src[srcOff + 2] * wt;
            }
          }
          output[dstOff] = Math.max(0, Math.min(255, r));
          output[dstOff + 1] = Math.max(0, Math.min(255, g));
          output[dstOff + 2] = Math.max(0, Math.min(255, b));
          output[dstOff + 3] = src[dstOff + 3]; // Alpha
        }
      }
      for (let i = 0; i < src.length; i++) {
        src[i] = output[i];
      }
    }

    const startRecording = async () => {
      if (!canvasRef.value) return;
      videoUrl.value = null; // Clear previous recording URL

      let sourceStream: MediaStream;
      try {
        if (isScreenRecording.value) {
          const screenCaptureStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
          try {
            const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            // Combine screen video with mic audio. Original screen audio is discarded.
            sourceStream = new MediaStream([
              ...screenCaptureStream.getVideoTracks(),
              ...micStream.getAudioTracks()
            ]);
            screenCaptureStream.getAudioTracks().forEach(t => t.stop()); // Stop original screen audio
          } catch (micError) {
            console.warn('Mic not available for screen recording, using screen audio if present.', micError);
            sourceStream = screenCaptureStream; // Fallback to screenStream (video + system audio)
          }
        } else {
          sourceStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        }
      } catch (err) {
        console.error('Failed to get media stream for recording:', err);
        alert('Could not start media stream. Please check permissions.');
        return;
      }
      
      currentSourceStream.value = sourceStream;
      videoEl.srcObject = sourceStream;
      await videoEl.play().catch(e => console.error("Error playing video source:", e));

      if (animationFrameId.value) cancelAnimationFrame(animationFrameId.value);
      drawToCanvas();

      const streamFromCanvas = canvasRef.value.captureStream(30); // 30 FPS
      sourceStream.getAudioTracks().forEach((track) => {
        streamFromCanvas.addTrack(track.clone()); // Clone audio track to manage its lifecycle independently
      });

      mediaRecorder.value = new MediaRecorder(streamFromCanvas, { mimeType: 'video/webm;codecs=vp9,opus' });
      recordedChunks.value = [];
      mediaRecorder.value.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.value.push(event.data);
        }
      };
      mediaRecorder.value.onstop = () => {
        const blob = new Blob(recordedChunks.value, { type: 'video/webm' });
        videoUrl.value = URL.createObjectURL(blob);
        // Stop tracks on the streamFromCanvas as they are clones
        streamFromCanvas.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.value.start();
      isRecording.value = true;
    };

    const stopRecording = () => {
      if (mediaRecorder.value && mediaRecorder.value.state !== "inactive") {
        mediaRecorder.value.stop();
      }
      currentSourceStream.value?.getTracks().forEach(track => track.stop());
      isRecording.value = false;
      if (animationFrameId.value) {
        cancelAnimationFrame(animationFrameId.value);
        animationFrameId.value = null;
      }
      // Clear canvas
      const ctx = canvasRef.value?.getContext('2d');
      if (ctx && canvasRef.value) {
          ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height);
      }
    };

    const switchMedia = async () => {
      if (!isRecording.value) {
        // If not recording, just toggle the flag for the next recording session
        isScreenRecording.value = !isScreenRecording.value;
        console.log(`Media source for next recording set to: ${isScreenRecording.value ? 'Screen' : 'Camera'}`);
        return;
      }

      // If currently recording, attempt to switch sources live
      console.log('Attempting to switch media while recording...');
      const oldIsScreenRecordingFlag = isScreenRecording.value;
      isScreenRecording.value = !isScreenRecording.value; // Tentative switch

      let newSourceMediaStream: MediaStream | null = null;
      try {
        if (isScreenRecording.value) {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
          try {
            const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            newSourceMediaStream = new MediaStream([
              ...screenStream.getVideoTracks(),
              ...micStream.getAudioTracks()
            ]);
            screenStream.getAudioTracks().forEach(t => t.stop()); // Stop original screen audio tracks
          } catch (micError) {
            console.warn('Mic not available for screen share switch, using screen audio if present.', micError);
            newSourceMediaStream = screenStream;
          }
        } else {
          newSourceMediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        }
      } catch (err) {
        console.error('Failed to get new media stream for switching:', err);
        isScreenRecording.value = oldIsScreenRecordingFlag; // Revert flag on failure
        alert('Failed to switch media source. Please check permissions.');
        return;
      }

      if (!newSourceMediaStream || !currentSourceStream.value || !mediaRecorder.value || !mediaRecorder.value.stream) {
        console.error('Cannot switch media: critical objects missing or stream not active.');
        isScreenRecording.value = oldIsScreenRecordingFlag; // Revert flag
        newSourceMediaStream?.getTracks().forEach(track => track.stop()); // Clean up newly acquired stream
        return;
      }

      const oldLiveSourceStream = currentSourceStream.value;
      const activeRecordedStream = mediaRecorder.value.stream as MediaStream;

      // 1. Update video element source (this will update canvas via drawToCanvas)
      videoEl.srcObject = newSourceMediaStream;
      await videoEl.play().catch(e => console.error("Error playing new video source:", e));

      // 2. Update audio tracks on the stream being recorded by MediaRecorder
      // Remove all old audio tracks from activeRecordedStream (these are clones)
      activeRecordedStream.getAudioTracks().forEach(track => {
        activeRecordedStream.removeTrack(track);
        track.stop(); // Stop the cloned track
      });

      // Add new audio tracks (cloned) from newSourceMediaStream to activeRecordedStream
      newSourceMediaStream.getAudioTracks().forEach(newAudioTrack => {
        activeRecordedStream.addTrack(newAudioTrack.clone());
      });
      
      // 3. Stop all tracks of the old live source stream
      oldLiveSourceStream.getTracks().forEach(track => track.stop());

      // 4. Update currentSourceStream reference to the new live source
      currentSourceStream.value = newSourceMediaStream;

      console.log('Media switched successfully while recording.');
    };

    const applyFilter = (filter: string) => {
      selectedFilter.value = filter;
    };

    onUnmounted(() => {
      stopRecording(); // Ensure resources are released
      if (animationFrameId.value) {
        cancelAnimationFrame(animationFrameId.value);
      }
      videoEl.srcObject = null; // Clear video element source
    });

    return {
      canvasRef, // Renamed from canvas to avoid conflict with potential HTML element
      startRecording,
      stopRecording,
      switchMedia,
      filters,
      applyFilter,
      videoUrl,
      isRecording,
    };
  },
});
</script>

<style scoped>
.video-recorder {
  transition: box-shadow 0.2s;
}
.btn {
  padding: 0.5rem 1.2rem;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.08);
  transition: background 0.2s, color 0.2s, box-shadow 0.2s;
}
.btn-blue {
  background: #2563eb; /* Tailwind blue-600 */
  color: #fff;
}
.btn-red {
  background: #dc2626; /* Tailwind red-600 */
  color: #fff;
}
.btn-yellow {
  background: #facc15; /* Tailwind yellow-400 */
  color: #374151; /* Tailwind gray-700 for better contrast */
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
