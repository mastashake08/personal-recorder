<template>
  <div class="w-full max-w-xs mb-4">
    <h2 class="text-lg font-semibold mb-2 text-blue-700 dark:text-blue-300">Select a Filter</h2>
    <div class="grid grid-cols-2 gap-2">
      <button
        v-for="filter in filters"
        :key="filter.id"
        @click="applyFilter(filter.id)"
        class="px-3 py-1 rounded border border-blue-600 bg-white text-blue-600 font-medium hover:bg-blue-600 hover:text-white transition focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        {{ filter.name }}
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'FilterSelector',
  props: {
    filters: {
      type: Array as () => { id: string; name: string }[],
      required: true,
    },
  },
  methods: {
    applyFilter(filterId: string) {
      this.$emit('filter-applied', filterId);
    },
  },
});
</script>
