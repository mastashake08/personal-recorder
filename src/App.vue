<template>
  <div class="min-h-screen min-w-full flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black">
    <div class="flex flex-col items-center justify-center w-full">
      <h1 class="text-4xl font-bold text-blue-400 tracking-wide mb-8 text-center drop-shadow-lg">
        Vue Video Recorder
      </h1>
      <div class="bg-gray-900/80 backdrop-blur-lg border border-gray-800 rounded-xl shadow-2xl w-full max-w-3xl flex flex-col items-center justify-center p-6 sm:p-10">
        <VideoRecorder @recordingComplete="handleRecordingComplete" class="w-full flex justify-center" />
        <DownloadButton v-if="videoUrl" :videoUrl="videoUrl" class="mt-4" />
      </div>
    </div>
    <button
      v-if="deferredPrompt"
      @click="installPWA"
      class="fixed bottom-6 right-6 px-4 py-2 rounded-lg bg-blue-600 text-white font-bold shadow hover:bg-blue-700 transition"
    >
      Install App
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import VideoRecorder from './components/VideoRecorder.vue';
import DownloadButton from './components/DownloadButton.vue';

export default defineComponent({
  name: 'App',
  components: {
    VideoRecorder,
    DownloadButton,
  },
  setup() {
    const videoUrl = ref<string | null>(null);
    const deferredPrompt = ref<Event | null>(null);

    const handleRecordingComplete = (url: string) => {
      videoUrl.value = url;
    };

    onMounted(() => {
      window.addEventListener('beforeinstallprompt', (e: Event) => {
        e.preventDefault();
        deferredPrompt.value = e;
      });
    });

    const installPWA = async () => {
      if (deferredPrompt.value) {
        // @ts-ignore
        deferredPrompt.value.prompt();
        // Optionally, handle the user's choice:
        // const { outcome } = await deferredPrompt.value.userChoice;
        deferredPrompt.value = null;
      }
    };

    return {
      videoUrl,
      handleRecordingComplete,
      deferredPrompt,
      installPWA,
    };
  },
});
</script>

<style>

</style>
