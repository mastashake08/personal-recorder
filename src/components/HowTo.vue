<template>
  <div class="w-full max-w-2xl bg-gray-800/80 rounded-xl shadow-lg p-6 mb-8 text-gray-100">
    <h2 class="text-2xl font-bold mb-4 text-blue-400">How to Use Mastashake Video Recorder</h2>
    <ol class="list-decimal list-inside space-y-2">
      <li>
        <span class="font-semibold">Choose your camera and microphone:</span>
        Use the dropdowns to select your preferred video and audio devices.
      </li>
      <li>
        <span class="font-semibold">(Optional) Enable screen recording:</span>
        Toggle "Record Screen + Camera" if you want to capture your screen and camera together.
      </li>
      <li>
        <span class="font-semibold">Apply a filter:</span>
        Select a filter from the filter options to add effects to your video.
      </li>
      <li>
        <span class="font-semibold">Start recording:</span>
        Click <span class="text-blue-400 font-semibold">Start Recording</span>. The live preview shows exactly what will be recorded.
      </li>
      <li>
        <span class="font-semibold">Switch video source:</span>
        If screen + camera is enabled, use the switch button to toggle between sources during recording.
      </li>
      <li>
        <span class="font-semibold">Stop recording:</span>
        Click <span class="text-red-400 font-semibold">Stop Recording</span> when finished.
      </li>
      <li>
        <span class="font-semibold">Download and edit:</span>
        After recording, preview your video, trim, add metadata, and download in your preferred format.
      </li>
      <li>
        <span class="font-semibold">Install as an app:</span>
        Click the <span class="text-blue-400 font-semibold">Install App</span> button (bottom right) to add this recorder to your device for quick access.
      </li>
    </ol>
  </div>
</template>

<script lang="ts">
export default {
  name: "HowTo"
};
</script>