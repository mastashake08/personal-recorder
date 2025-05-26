<template>
  <div class="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-800 flex flex-col items-center justify-center p-4">
  
    <div class="bg-white/90 dark:bg-gray-900/90 rounded-xl shadow-2xl p-6 sm:p-8 w-full max-w-2xl flex flex-col items-center">
      <h1 class="text-3xl sm:text-4xl font-extrabold text-blue-700 dark:text-blue-400 mb-6 text-center drop-shadow">
        Vue Video Filters & Recorder
      </h1>
      
      <VideoRecorder @recordingComplete="handleRecordingComplete" class="w-full" />
      
      <DownloadButton v-if="videoUrl" :videoUrl="videoUrl" class="mt-6" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import VideoRecorder from './components/VideoRecorder.vue';
// FilterSelector is not used directly in App.vue, it's used within VideoRecorder.vue
// import FilterSelector from './components/FilterSelector.vue'; 
import DownloadButton from './components/DownloadButton.vue';

export default defineComponent({
  name: 'App',
  components: {
    VideoRecorder,
    // FilterSelector, // Removed unused import
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
