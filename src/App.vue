<template>
  <div class="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex flex-col items-center justify-center p-4">
    <div class="bg-gray-900/80 backdrop-blur-lg border border-gray-800 rounded-xl shadow-xl p-6 sm:p-8 w-full max-w-2xl flex flex-col items-center">
      <h1 class="text-4xl font-bold text-blue-400 tracking-wide mb-6 text-center drop-shadow-lg">
        Vue Video Filters & Recorder
      </h1>

      <VideoRecorder @recordingComplete="handleRecordingComplete" class="w-full flex justify-center"  />

      <DownloadButton v-if="videoUrl" :videoUrl="videoUrl" class="mt-4" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
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

    const handleRecordingComplete = (url: string) => {
      videoUrl.value = url;
    };

    return {
      videoUrl,
      handleRecordingComplete,
    };
  },
});
</script>

<style>
body {
  @apply dark;
}
</style>
