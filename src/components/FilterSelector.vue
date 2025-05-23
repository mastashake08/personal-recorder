<template>
  <div class="filter-selector">
    <h2>Select a Filter</h2>
    <div class="filter-list">
      <button
        v-for="filter in filters"
        :key="filter.id"
        @click="applyFilter(filter.id)"
        class="filter-btn"
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

<style scoped>
.filter-selector {
  padding: 1rem;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.07);
  margin-bottom: 1rem;
  width: 300px;
}
.filter-list {
  display: flex;
  gap: 1rem;
}
.filter-btn {
  padding: 0.5rem 1rem;
  border: 1px solid #2563eb;
  background: #fff;
  color: #2563eb;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.2s, color 0.2s;
}
.filter-btn:hover {
  background: #2563eb;
  color: #fff;
}
</style>