import { defineAsyncComponent, type Component } from 'vue';

const templateLoaders: Record<string, () => Promise<Component>> = {
  'classic-elegant': () => import('./ClassicElegantTemplate.vue'),
  'botanical-green': () => import('./BotanicalGreenTemplate.vue'),
  'modern-minimalist': () => import('./ModernMinimalistTemplate.vue'),
};

export function resolveTemplateComponent(templateKey: string): Component {
  const loader = templateLoaders[templateKey] || templateLoaders['classic-elegant'];
  return defineAsyncComponent(loader);
}
