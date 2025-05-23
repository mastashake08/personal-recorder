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
<template>
  <div class="min-h-screen bg-gray-100 flex flex-col items-center justify-center">
    <h1>Vue Video Filters</h1>
    <VideoRecorder @recordingComplete="handleRecordingComplete" />
    <DownloadButton v-if="videoUrl" :videoUrl="videoUrl" />
  </div>
</template>

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