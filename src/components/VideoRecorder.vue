<template>
  <div class="video-recorder fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black min-h-screen min-w-full">
    <div class="w-full max-w-3xl bg-gray-900/80 backdrop-blur-lg border border-gray-800 rounded-xl shadow-2xl p-6 sm:p-10 flex flex-col items-center justify-center">
      <div
        v-show="isRecording"
        class="w-full flex items-center justify-center mb-4"
      >
        <canvas ref="previewCanvasRef" width="320" height="180" class="rounded-2xl shadow-lg border border-blue-800/40 bg-black transition-all duration-300"></canvas>
      </div>
      <!-- Add this hidden canvas for recording -->
      <canvas ref="canvasRef" :width="2688" :height="1520" style="display:none;"></canvas>

      <!-- Live camera preview before recording -->
      <div v-if="!isRecording && previewStream" class="w-full flex items-center justify-center mb-4">
        <video
          ref="livePreviewRef"
          autoplay
          playsinline
          muted
          class="rounded-2xl shadow-lg border border-blue-800/40 bg-black transition-all duration-300 w-full max-w-xl"
          style="aspect-ratio: 16/9;"
        ></video>
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

      <!-- Device selection controls -->
      <div class="flex flex-wrap gap-4 mb-4 w-full justify-center">
        <div>
          <label class="block text-gray-300 text-sm mb-1">Microphone:</label>
          <select v-model="selectedAudioDeviceId" class="rounded px-2 py-1 border border-gray-400 text-black">
            <option v-for="d in audioDevices" :key="d.deviceId" :value="d.deviceId">{{ d.label || 'Microphone' }}</option>
          </select>
        </div>
        <div>
          <label class="block text-gray-300 text-sm mb-1">Camera:</label>
          <select v-model="selectedVideoDeviceId" class="rounded px-2 py-1 border border-gray-400 text-black">
            <option v-for="d in videoDevices" :key="d.deviceId" :value="d.deviceId">{{ d.label || 'Camera' }}</option>
          </select>
        </div>
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
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, shallowRef, watch } from 'vue';
import FilterSelector from './FilterSelector.vue';
import DownloadButton from './DownloadButton.vue';

const CANVAS_RECORDING_WIDTH = 2688;
const CANVAS_RECORDING_HEIGHT = 1520;
const PREVIEW_WIDTH = 320;
const PREVIEW_HEIGHT = 180;

const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 3840 },
  height: { ideal: 2160 },
  frameRate: { ideal: 60 },
  facingMode: { ideal: "user" },
  aspectRatio: { ideal: 16 / 9 },
};

const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: { ideal: true },
  noiseSuppression: { ideal: true },
  autoGainControl: { ideal: true },
  channelCount: { ideal: 2 },
  sampleSize: { ideal: 24 },
  sampleRate: { ideal: 48000 }
};

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

    // Add a ref for the camera video element (for PiP)
    const cameraVideoEl = document.createElement('video');
    cameraVideoEl.autoplay = true;
    cameraVideoEl.playsInline = true;
    cameraVideoEl.muted = true;

    const canvasRef = ref<HTMLCanvasElement | null>(null); // Offscreen for recording
    const previewCanvasRef = ref<HTMLCanvasElement | null>(null); // Visible preview
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

    // Add to setup()
    const audioDevices = ref<MediaDeviceInfo[]>([]);
    const videoDevices = ref<MediaDeviceInfo[]>([]);
    const selectedAudioDeviceId = ref<string | null>(null);
    const selectedVideoDeviceId = ref<string | null>(null);
    const livePreviewRef = ref<HTMLVideoElement | null>(null);
    const previewStream = shallowRef<MediaStream | null>(null);

    onMounted(async () => {
      window.addEventListener('keydown', handleKeydown);
      if (gamepadAnimationId) cancelAnimationFrame(gamepadAnimationId);
      pollGamepad();

      // Get devices
      await navigator.mediaDevices.getUserMedia({ audio: true, video: true }); // Prompt for permissions
      const devices = await navigator.mediaDevices.enumerateDevices();
      audioDevices.value = devices.filter(d => d.kind === 'audioinput');
      videoDevices.value = devices.filter(d => d.kind === 'videoinput');
      if (audioDevices.value.length) selectedAudioDeviceId.value = audioDevices.value[0].deviceId;
      if (videoDevices.value.length) selectedVideoDeviceId.value = videoDevices.value[0].deviceId;
    });

    // Draw to both canvases
    const drawToCanvas = () => {
      // Helper to draw to any canvas context at any size
      const drawFrame = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
        ctx.clearRect(0, 0, width, height);
        ctx.save();

        // Main video filter
        if (selectedFilter.value === 'grayscale') ctx.filter = 'grayscale(100%)';
        else if (selectedFilter.value === 'invert') ctx.filter = 'invert(100%)';
        else if (selectedFilter.value === 'sepia') ctx.filter = 'sepia(100%)';
        else if (selectedFilter.value === 'blur') ctx.filter = 'blur(4px)';
        else if (filterOptions.some(f => f.id === selectedFilter.value && f.name.includes('(SVG)'))) {
          ctx.filter = `url(#${selectedFilter.value})`;
        }

        // Draw main video (screen or camera)
        ctx.drawImage(videoEl, 0, 0, width, height);
        ctx.restore();

        // PiP logic (same as before, but scale PiP size/position to canvas size)
        if (
          recordScreenAndCamera.value &&
          activeDisplaySource.value === 'screen' &&
          userVideoStream.value
        ) {
          if (cameraVideoEl.srcObject !== userVideoStream.value) {
            cameraVideoEl.srcObject = userVideoStream.value;
            cameraVideoEl.play().catch(() => {});
          }
          const pipWidth = Math.floor(width * 0.25);
          const pipHeight = Math.floor(height * 0.25);
          const pipX = width - pipWidth - 16;
          const pipY = height - pipHeight - 16;
          const radius = 12;

          ctx.save();
          ctx.beginPath();
          ctx.moveTo(pipX + radius, pipY);
          ctx.lineTo(pipX + pipWidth - radius, pipY);
          ctx.quadraticCurveTo(pipX + pipWidth, pipY, pipX + pipWidth, pipY + radius);
          ctx.lineTo(pipX + pipWidth, pipY + pipHeight - radius);
          ctx.quadraticCurveTo(pipX + pipWidth, pipY + pipHeight, pipX + pipWidth - radius, pipY + pipHeight);
          ctx.lineTo(pipX + radius, pipY + pipHeight);
          ctx.quadraticCurveTo(pipX, pipY + pipHeight, pipX, pipY + pipHeight - radius);
          ctx.lineTo(pipX, pipY + radius);
          ctx.quadraticCurveTo(pipX, pipY, pipX + radius, pipY);
          ctx.closePath();
          ctx.clip();

          ctx.globalAlpha = 0.9;
          ctx.drawImage(cameraVideoEl, pipX, pipY, pipWidth, pipHeight);
          ctx.globalAlpha = 1.0;

          ctx.restore();
          ctx.save();
          ctx.strokeStyle = "#3b82f6";
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.8;
          ctx.beginPath();
          ctx.moveTo(pipX + radius, pipY);
          ctx.lineTo(pipX + pipWidth - radius, pipY);
          ctx.quadraticCurveTo(pipX + pipWidth, pipY, pipX + pipWidth, pipY + radius);
          ctx.lineTo(pipX + pipWidth, pipY + pipHeight - radius);
          ctx.quadraticCurveTo(pipX + pipWidth, pipY + pipHeight, pipX + pipWidth - radius, pipY + pipHeight);
          ctx.lineTo(pipX + radius, pipY + pipHeight);
          ctx.quadraticCurveTo(pipX, pipY + pipHeight, pipX, pipY + pipHeight - radius);
          ctx.lineTo(pipX, pipY + radius);
          ctx.quadraticCurveTo(pipX, pipY, pipX + radius, pipY);
          ctx.closePath();
          ctx.stroke();
          ctx.restore();
        }
      };

      // Draw to offscreen recording canvas
      if (canvasRef.value) {
        const ctx = canvasRef.value.getContext('2d');
        if (ctx) drawFrame(ctx, CANVAS_RECORDING_WIDTH, CANVAS_RECORDING_HEIGHT);
      }
      // Draw to preview canvas
      if (previewCanvasRef.value) {
        const ctx = previewCanvasRef.value.getContext('2d');
        if (ctx) drawFrame(ctx, PREVIEW_WIDTH, PREVIEW_HEIGHT);
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
        // Use ideal audio constraints
        audioStream.value = await navigator.mediaDevices.getUserMedia({
          audio: { ...AUDIO_CONSTRAINTS, deviceId: selectedAudioDeviceId.value ? { exact: selectedAudioDeviceId.value } : undefined },
          video: false
        });

        if (recordScreenAndCamera.value) {
          // Use ideal video constraints for camera
          userVideoStream.value = await navigator.mediaDevices.getUserMedia({
            video: { ...VIDEO_CONSTRAINTS, deviceId: selectedVideoDeviceId.value ? { exact: selectedVideoDeviceId.value } : undefined },
            audio: false
          });
          // Use ideal video constraints for screen (if supported)
          const fullScreenStream = await navigator.mediaDevices.getDisplayMedia({ video: VIDEO_CONSTRAINTS, audio: AUDIO_CONSTRAINTS }); 
          screenVideoStream.value = new MediaStream(fullScreenStream.getVideoTracks()); 
          fullScreenStream.getAudioTracks().forEach(t => t.stop()); 

          if (!userVideoStream.value || !screenVideoStream.value) {
            throw new Error('Failed to get both camera and screen video streams.');
          }
          console.log("User video stream:", userVideoStream.value);
          videoEl.srcObject = userVideoStream.value; 
          activeDisplaySource.value = 'camera';
        } else {
          userVideoStream.value = await navigator.mediaDevices.getUserMedia({ video: VIDEO_CONSTRAINTS, audio: false });
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
        alert("Could not play video source. Please click anywhere on the page and try again.");
        cleanupStreams();
        return;
      }


      if (animationFrameId.value) {
        cancelAnimationFrame(animationFrameId.value);
        animationFrameId.value = null;
      }
      drawToCanvas();

      const streamFromCanvas = canvasRef.value.captureStream(60);
      console.log("Canvas stream created:", streamFromCanvas);
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

    // Keyboard shortcut: Press "S" to switch media
    const handleKeydown = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === 's' &&
        isRecording.value &&
        recordScreenAndCamera.value
      ) {
        e.preventDefault();
        switchVideoSource();
      }
    };

    let gamepadAnimationId: number | null = null;

    function pollGamepad() {
      const gamepads = navigator.getGamepads();
      if (gamepads[0]) {
        const gp = gamepads[0];

        // Example mapping for Xbox/PS controllers:
        // Button 1: B/Circle (Stop Recording)
        // // Button 2: X/Square (Switch Video Source)
        // if ((gp.buttons[0].pressed || gp.buttons[0].value >0)&& !isRecording.value) {
        //   startRecording();
        // }
        if ((gp.buttons[1].pressed  || gp.buttons[1].value >0)  && isRecording.value) {
          stopRecording();
        }
        if ((gp.buttons[0].pressed || gp.buttons[0].value >0) && isRecording.value && recordScreenAndCamera.value) {
          switchVideoSource();
        }
      }
      gamepadAnimationId = requestAnimationFrame(pollGamepad);
    }

    onMounted(() => {
      window.addEventListener('keydown', handleKeydown);
      if (gamepadAnimationId) cancelAnimationFrame(gamepadAnimationId);
      pollGamepad();
    });
    onUnmounted(() => {
      window.removeEventListener('keydown', handleKeydown);
      if (gamepadAnimationId) {
        cancelAnimationFrame(gamepadAnimationId);
        gamepadAnimationId = null;
      }
    });

    watch([selectedVideoDeviceId, isRecording], async ([deviceId, recording]) => {
      if (!recording && deviceId) {
        // Stop previous preview stream
        if (previewStream.value) {
          previewStream.value.getTracks().forEach(track => track.stop());
          previewStream.value = null;
        }
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { ...VIDEO_CONSTRAINTS, deviceId: { exact: deviceId } },
            audio: false
          });
          previewStream.value = stream;
          if (livePreviewRef.value) {
            livePreviewRef.value.srcObject = stream;
          }
        } catch (e) {
          // Ignore errors (e.g., permission denied)
        }
      }
      // Stop preview when recording starts
      if (recording && previewStream.value) {
        previewStream.value.getTracks().forEach(track => track.stop());
        previewStream.value = null;
        if (livePreviewRef.value) livePreviewRef.value.srcObject = null;
      }
    });

    return {
      canvasRef,
      previewCanvasRef,
      startRecording,
      stopRecording,
      switchVideoSource,
      filters,
      applyFilter,
      videoUrl,
      isRecording,
      recordScreenAndCamera, 
      audioDevices,
      videoDevices,
      selectedAudioDeviceId,
      selectedVideoDeviceId,
      livePreviewRef,
      previewStream,
    };
  },
});
</script>

<style scoped>
.video-recorder {
  min-height: 100vh;
  min-width: 100vw;
  transition: box-shadow 0.2s;
  /* The background and centering are handled by the template classes */
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
