import { createApp } from 'vue'
// Toggle between the demos by changing the import
// import App from './App.vue'  // Traditional scroll-based approach
// import App from './AppObserver.vue'  // Intersection Observer approach
// import App from './AppOptimized.vue'  // Optimized approach with dynamic overscan
import App from './AppFinal.vue'  // Final optimized observer approach

createApp(App).mount('#app')