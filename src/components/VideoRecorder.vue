<template>
  <div class="video-recorder flex flex-col items-center">
    <canvas ref="canvas" class="border-2 border-gray-300 mb-4" width="640" height="480"></canvas>
    <div class="flex gap-2 mb-4">
      <button @click="startRecording" class="btn btn-blue" :disabled="isRecording">Start Recording</button>
      <button @click="stopRecording" class="btn btn-red" :disabled="!isRecording">Stop Recording</button>
      <button @click="switchMedia" class="btn btn-yellow" :disabled="isRecording">Switch Media</button>
    </div>
    <FilterSelector @filter-applied="applyFilter" :filters="filters"/>
    <DownloadButton :video-url="videoUrl" v-if="videoUrl" />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onUnmounted } from 'vue';
import FilterSelector from './FilterSelector.vue';
import DownloadButton from './DownloadButton.vue';

export default defineComponent({
  components: {
    FilterSelector,
    DownloadButton,
  },
  setup() {
    const video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;

    const canvas = ref<HTMLCanvasElement | null>(null);
    const mediaRecorder = ref<MediaRecorder | null>(null);
    const recordedChunks = ref<Blob[]>([]);
    const isRecording = ref(false);
    const videoUrl = ref<string | null>(null);
    const currentStream = ref<MediaStream | null>(null);
    const isScreenRecording = ref(false);
    const animationFrameId = ref<number | null>(null);

    const filterOptions = [
      { id: 'none', name: 'None' },
      { id: 'grayscale', name: 'Grayscale' },
      { id: 'invert', name: 'Invert' },
      { id: 'sepia', name: 'Sepia' },
      { id: 'blur', name: 'Blur' },
      { id: 'sharpen', name: 'Sharpen' },
      // SVG filters from svg-effects:
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

    // Draw video to canvas and apply filter
    const drawToCanvas = () => {
      if (!canvas.value) return;
      const ctx = canvas.value.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.value.width, canvas.value.height);

      // Standard CSS filters
      if (
        selectedFilter.value === 'grayscale' ||
        selectedFilter.value === 'invert' ||
        selectedFilter.value === 'sepia' ||
        selectedFilter.value === 'blur'
      ) {
        switch (selectedFilter.value) {
          case 'grayscale':
            ctx.filter = 'grayscale(100%)';
            break;
          case 'invert':
            ctx.filter = 'invert(100%)';
            break;
          case 'sepia':
            ctx.filter = 'sepia(100%)';
            break;
          case 'blur':
            ctx.filter = 'blur(4px)';
            break;
        }
        ctx.drawImage(video, 0, 0, canvas.value.width, canvas.value.height);
        ctx.filter = 'none';
      } else if (selectedFilter.value === 'sharpen') {
        ctx.drawImage(video, 0, 0, canvas.value.width, canvas.value.height);
        const imageData = ctx.getImageData(0, 0, canvas.value.width, canvas.value.height);
        applySharpen(imageData);
        ctx.putImageData(imageData, 0, 0);
      } else if (
        [
          'techNoir', 'neonSurge', 'hackerGlow', 'binaryFrost', 'byteCrush', 'dataDrift',
          'circuitPulse', 'quantumBurst', 'colorPop', 'highContrastBW', 'softBW',
          'bwWithBlur', 'sharpBW'
        ].includes(selectedFilter.value)
      ) {
        ctx.drawImage(video, 0, 0, canvas.value.width, canvas.value.height);
        applySVGFilterToCanvas(canvas.value, selectedFilter.value);
      } else {
        ctx.drawImage(video, 0, 0, canvas.value.width, canvas.value.height);
      }

      animationFrameId.value = requestAnimationFrame(drawToCanvas);
    };

    // Sharpen filter using convolution kernel
    function applySharpen(imageData: ImageData) {
      const weights = [
        0, -1,  0,
       -1,  5, -1,
        0, -1,  0
      ];
      const side = 3;
      const src = imageData.data;
      const sw = imageData.width;
      const sh = imageData.height;
      const w = sw;
      const h = sh;
      const output = new Uint8ClampedArray(src.length);

      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          for (let c = 0; c < 3; c++) { // R, G, B
            let i = (y * w + x) * 4 + c;
            let sum = 0;
            for (let ky = 0; ky < side; ky++) {
              for (let kx = 0; kx < side; kx++) {
                const px = x + kx - 1;
                const py = y + ky - 1;
                if (px >= 0 && px < w && py >= 0 && py < h) {
                  const ki = (py * w + px) * 4 + c;
                  sum += src[ki] * weights[ky * side + kx];
                }
              }
            }
            output[i] = Math.min(255, Math.max(0, sum));
          }
          // Alpha channel
          output[(y * w + x) * 4 + 3] = src[(y * w + x) * 4 + 3];
        }
      }
      for (let i = 0; i < src.length; i++) {
        src[i] = output[i];
      }
    }

    // SVG filter application
    function applySVGFilterToCanvas(canvas: HTMLCanvasElement, filterId: string) {
      
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.filter = `url(#${filterId})`;
        }
      }

    const startRecording = async () => {
      let stream: MediaStream;
      if (isScreenRecording.value) {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const combinedStream = new MediaStream([
            ...stream.getVideoTracks(),
            ...audioStream.getAudioTracks(),
          ]);
          stream = combinedStream;
        } catch (e) {}
      } else {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      }
      currentStream.value = stream;
      video.srcObject = stream;
      await video.play();

      // Start drawing to canvas
      drawToCanvas();

      // Record the canvas stream (with audio)
      const canvasStream = canvas.value!.captureStream();
      // Add audio tracks from the original stream to the canvas stream
      stream.getAudioTracks().forEach((track) => {
        canvasStream.addTrack(track);
      });

      mediaRecorder.value = new MediaRecorder(canvasStream);
      recordedChunks.value = [];
      mediaRecorder.value.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.value.push(event.data);
        }
      };
      mediaRecorder.value.onstop = () => {
        const blob = new Blob(recordedChunks.value, { type: 'video/webm' });
        videoUrl.value = URL.createObjectURL(blob);
      };
      mediaRecorder.value.start();
      isRecording.value = true;
    };

    const stopRecording = () => {
      mediaRecorder.value?.stop();
      currentStream.value?.getTracks().forEach(track => track.stop());
      isRecording.value = false;
      if (animationFrameId.value) {
        cancelAnimationFrame(animationFrameId.value);
      }
    };

    const switchMedia = () => {
      isScreenRecording.value = !isScreenRecording.value;
      if (isRecording.value) {
        stopRecording();
        startRecording();
      }
    };

    const applyFilter = (filter: string) => {
      selectedFilter.value = filter;
    };

    onUnmounted(() => {
      stopRecording();
    });

    return {
      canvas,
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
  display: flex;
  flex-direction: column;
  align-items: center;
}
.btn {
  padding: 0.5rem 1.2rem;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
}
.btn-blue {
  background: #2563eb;
  color: #fff;
}
.btn-red {
  background: #dc2626;
  color: #fff;
}
.btn-yellow {
  background: #facc15;
  color: #333;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>