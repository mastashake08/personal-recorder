<template>
  <div class="bg-black fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black">
    <h1 class="text-4xl font-bold text-blue-400 tracking-wide mb-4 text-center drop-shadow-lg w-full flex-1 flex items-center justify-center" style="min-height: 15vh;">
      Vue Video Recorder
    </h1>
    <div class="bg-gray-900/80 backdrop-blur-lg border border-gray-800 rounded-xl shadow-2xl w-full max-w-3xl flex flex-col items-center justify-center">
      <VideoRecorder @recordingComplete="handleRecordingComplete" class="w-full flex justify-center" />
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

</style>
