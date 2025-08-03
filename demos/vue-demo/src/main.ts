import { createApp } from 'vue'
// Toggle between the two demos by changing the import
// import App from './App.vue'  // Traditional scroll-based approach
import App from './AppObserver.vue'  // Intersection Observer approach

createApp(App).mount('#app')