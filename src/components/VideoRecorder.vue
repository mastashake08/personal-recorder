<template>
  <div class="video-recorder flex flex-col items-center bg-gray-900/80 backdrop-blur-lg border border-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-2xl">
    <div class="w-full aspect-video bg-black rounded-lg shadow-inner overflow-hidden mb-4 border border-gray-800">
      <canvas ref="canvasRef" class="w-full h-full"></canvas>
    </div>

    <div class="mb-4 flex items-center">
      <input 
        type="checkbox" 
        id="screenShareToggle" 
        v-model="recordScreenAndCamera" 
        :disabled="isRecording" 
        class="mr-2 h-4 w-4 rounded border-gray-600 bg-gray-800 focus:ring-blue-600 ring-offset-gray-800"
      >
      <label for="screenShareToggle" class="text-sm font-medium text-gray-300">
        Record Screen + Camera (switchable)
      </label>
    </div>

    <div class="flex flex-wrap justify-center gap-2 mb-4">
      <button @click="startRecording" class="btn btn-blue" :disabled="isRecording">Start Recording</button>
      <button @click="stopRecording" class="btn btn-red" :disabled="!isRecording">Stop Recording</button>
      <button 
        @click="switchVideoSource" 
        class="btn btn-yellow" 
        :disabled="!isRecording || !recordScreenAndCamera"
        title="Switch between camera and screen video"
      >
        Switch Video Source
      </button>
    </div>

    <FilterSelector @filter-applied="applyFilter" :filters="filters" />
    <DownloadButton :video-url="videoUrl" v-if="videoUrl" />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, shallowRef } from 'vue';
import FilterSelector from './FilterSelector.vue';
import DownloadButton from './DownloadButton.vue';

const CANVAS_RECORDING_WIDTH = 1920; // User updated
const CANVAS_RECORDING_HEIGHT = 1080; // User updated

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
    videoEl.muted = true;

    const canvasRef = ref<HTMLCanvasElement | null>(null);
    const mediaRecorder = shallowRef<MediaRecorder | null>(null);
    const recordedChunks = ref<Blob[]>([]);
    const isRecording = ref(false);
    const videoUrl = ref<string | null>(null);
    
    const recordScreenAndCamera = ref(false); 
    const userVideoStream = shallowRef<MediaStream | null>(null);
    const screenVideoStream = shallowRef<MediaStream | null>(null); 
    const audioStream = shallowRef<MediaStream | null>(null); 
    const activeDisplaySource = ref<'camera' | 'screen'>('camera');

    const animationFrameId = ref<number | null>(null);

    const filterOptions = [
      { id: 'none', name: 'None' }, { id: 'grayscale', name: 'Grayscale' },
      { id: 'invert', name: 'Invert' }, { id: 'sepia', name: 'Sepia' },
      { id: 'blur', name: 'Blur' }, { id: 'sharpen', name: 'Sharpen' },
      { id: 'techNoir', name: 'Tech Noir (SVG)' }, { id: 'neonSurge', name: 'Neon Surge (SVG)' },
      { id: 'hackerGlow', name: 'HackerGlow (SVG)' }, { id: 'binaryFrost', name: 'Binary Frost (SVG)' },
      { id: 'byteCrush', name: 'Byte Crush (SVG)' }, { id: 'dataDrift', name: 'Data Drift (SVG)' },
      { id: 'circuitPulse', name: 'Circuit Pulse (SVG)' }, { id: 'quantumBurst', name: 'Quantum Burst (SVG)' },
      { id: 'colorPop', name: 'Color Pop (SVG)' }, { id: 'highContrastBW', name: 'High Contrast B&W (SVG)' },
      { id: 'softBW', name: 'Soft B&W (SVG)' }, { id: 'bwWithBlur', name: 'B&W with Blur (SVG)' },
      { id: 'sharpBW', name: 'Sharp B&W (SVG)' },
    ];
    const filters = ref(filterOptions);
    const selectedFilter = ref('none');

    onMounted(() => {
      if (canvasRef.value) {
        canvasRef.value.width = CANVAS_RECORDING_WIDTH;
        canvasRef.value.height = CANVAS_RECORDING_HEIGHT;
      }
    });

    const drawToCanvas = () => {
      if (!canvasRef.value || videoEl.paused || videoEl.ended || !videoEl.srcObject) {
        animationFrameId.value = requestAnimationFrame(drawToCanvas);
        return;
      }
      const ctx = canvasRef.value.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height);
      ctx.save(); 

      if (selectedFilter.value === 'grayscale') ctx.filter = 'grayscale(100%)';
      else if (selectedFilter.value === 'invert') ctx.filter = 'invert(100%)';
      else if (selectedFilter.value === 'sepia') ctx.filter = 'sepia(100%)';
      else if (selectedFilter.value === 'blur') ctx.filter = 'blur(4px)';
      else if (filterOptions.some(f => f.id === selectedFilter.value && f.name.includes('(SVG)'))) {
        ctx.filter = `url(#${selectedFilter.value})`;
      }
      
      ctx.drawImage(videoEl, 0, 0, canvasRef.value.width, canvasRef.value.height);
      ctx.restore(); 

      if (selectedFilter.value === 'sharpen') {
        const imageData = ctx.getImageData(0, 0, canvasRef.value.width, canvasRef.value.height);
        applySharpen(imageData); 
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
          output[dstOff + 3] = src[dstOff + 3];
        }
      }
      for (let i = 0; i < src.length; i++) {
        src[i] = output[i];
      }
    }

    const cleanupStreams = () => {
      userVideoStream.value?.getTracks().forEach(track => track.stop());
      screenVideoStream.value?.getTracks().forEach(track => track.stop());
      audioStream.value?.getTracks().forEach(track => track.stop());
      userVideoStream.value = null;
      screenVideoStream.value = null;
      audioStream.value = null;
      videoEl.srcObject = null; 
    };

    const startRecording = async () => {
      if (!canvasRef.value) { alert("Canvas is not ready."); return; }
      if (canvasRef.value.width !== CANVAS_RECORDING_WIDTH || canvasRef.value.height !== CANVAS_RECORDING_HEIGHT) {
        canvasRef.value.width = CANVAS_RECORDING_WIDTH;
        canvasRef.value.height = CANVAS_RECORDING_HEIGHT;
      }
      videoUrl.value = null;
      cleanupStreams(); 

      try {
        audioStream.value = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

        if (recordScreenAndCamera.value) {
          userVideoStream.value = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          const fullScreenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true }); 
          screenVideoStream.value = new MediaStream(fullScreenStream.getVideoTracks()); 
          fullScreenStream.getAudioTracks().forEach(t => t.stop()); 

          if (!userVideoStream.value || !screenVideoStream.value) {
            throw new Error('Failed to get both camera and screen video streams.');
          }
          videoEl.srcObject = userVideoStream.value; 
          activeDisplaySource.value = 'camera';
        } else {
          userVideoStream.value = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          if (!userVideoStream.value) {
            throw new Error('Failed to get camera stream.');
          }
          videoEl.srcObject = userVideoStream.value;
          activeDisplaySource.value = 'camera';
          screenVideoStream.value = null; 
        }
      } catch (err) {
        console.error('Failed to get media streams:', err);
        alert(`Could not start media streams. Please check permissions. Error: ${err instanceof Error ? err.message : String(err)}`);
        cleanupStreams();
        return;
      }
      
      try {
        await videoEl.play();
      } catch (playError) {
          console.error("Error playing video source:", playError);
          alert("Could not play video source.");
          cleanupStreams();
          return;
      }


      if (animationFrameId.value) cancelAnimationFrame(animationFrameId.value);
      drawToCanvas();

      const streamFromCanvas = canvasRef.value.captureStream(30);
      if (audioStream.value) {
        audioStream.value.getAudioTracks().forEach((track) => {
          streamFromCanvas.addTrack(track.clone());
        });
      } else {
        console.warn("No audio stream (microphone) available to add to recording.");
      }
      
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
        streamFromCanvas.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.value.start();
      isRecording.value = true;
    };

    const stopRecording = () => {
      if (mediaRecorder.value && mediaRecorder.value.state !== "inactive") {
        mediaRecorder.value.stop();
      }
      cleanupStreams(); 
      
      isRecording.value = false;
      if (animationFrameId.value) {
        cancelAnimationFrame(animationFrameId.value);
        animationFrameId.value = null;
      }
      const ctx = canvasRef.value?.getContext('2d');
      if (ctx && canvasRef.value) {
          ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height);
      }
    };

    const switchVideoSource = async () => {
      if (!isRecording.value || !recordScreenAndCamera.value) {
        console.warn('Cannot switch video source: Not recording or not in screen+camera mode.');
        return;
      }
      if (!userVideoStream.value || !screenVideoStream.value) {
        console.error('Cannot switch: User or screen video stream is missing. This should not happen if recording in this mode.');
        return;
      }

      let newSrcObject: MediaStream | null = null;
      if (activeDisplaySource.value === 'camera') {
        newSrcObject = screenVideoStream.value;
        activeDisplaySource.value = 'screen';
        console.log('Switched display to Screen.');
      } else {
        newSrcObject = userVideoStream.value;
        activeDisplaySource.value = 'camera';
        console.log('Switched display to Camera.');
      }
      
      if (videoEl.srcObject !== newSrcObject) { 
        videoEl.srcObject = newSrcObject;
        try {
          await videoEl.play();
        } catch (playError) {
            console.error("Error playing switched video source:", playError);
        }
      }
    };
    
    const applyFilter = (filter: string) => {
      selectedFilter.value = filter;
    };

    onUnmounted(() => {
      if (isRecording.value) { 
        stopRecording();
      } else { 
        cleanupStreams();
      }
      if (animationFrameId.value) {
        cancelAnimationFrame(animationFrameId.value);
      }
    });

    return {
      canvasRef, 
      startRecording,
      stopRecording,
      switchVideoSource,
      filters,
      applyFilter,
      videoUrl,
      isRecording,
      recordScreenAndCamera, 
    };
  },
});
</script>

<style scoped>
.video-recorder {
  transition: box-shadow 0.2s;
}

.btn {
  padding: 0.5rem 1.5rem;
  border-radius: 0.5rem;
  font-weight: 600;
  transition: all 0.2s;
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.2);
}

.btn-blue {
  background: linear-gradient(135deg, #1e3a8a, #3b82f6);
  color: white;
  box-shadow: 0 0 10px #3b82f6aa;
}
.btn-blue:hover {
  box-shadow: 0 0 15px #3b82f6;
}

.btn-red {
  background: linear-gradient(135deg, #7f1d1d, #ef4444);
  color: white;
  box-shadow: 0 0 10px #ef4444aa;
}
.btn-red:hover {
  box-shadow: 0 0 15px #ef4444;
}

.btn-yellow {
  background: linear-gradient(135deg, #78350f, #facc15);
  color: #111827;
  box-shadow: 0 0 10px #facc15aa;
}
.btn-yellow:hover {
  box-shadow: 0 0 15px #facc15;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
