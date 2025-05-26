<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-800 flex flex-col items-center justify-center">
    <div class="bg-white/90 dark:bg-gray-900/90 rounded-xl shadow-2xl p-8 w-full max-w-2xl flex flex-col items-center">
      <h1 class="text-3xl font-extrabold text-blue-700 dark:text-blue-400 mb-6 drop-shadow">Vue Video Filters</h1>
      <VideoRecorder @recordingComplete="handleRecordingComplete" />
      <DownloadButton v-if="videoUrl" :videoUrl="videoUrl" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import VideoRecorder from './components/VideoRecorder.vue';
import FilterSelector from './components/FilterSelector.vue';
import DownloadButton from './components/DownloadButton.vue';

export default defineComponent({
  name: 'App',
  components: {
    VideoRecorder,
    FilterSelector,
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
.app-container {
  min-height: 100vh;
  background: #f4f4f4;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
h1 {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 1.5rem;
}
</style>