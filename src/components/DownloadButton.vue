<template>
  <button @click="downloadVideo" class="download-btn">
    Download Video
  </button>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'DownloadButton',
  props: {
    videoUrl: {
      type: String,
      required: true,
    },
  },
  methods: {
    downloadVideo() {
      const a = document.createElement('a');
      a.href = this.videoUrl;
      a.download = 'recorded-video.webm';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },
  },
});
</script>