<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  CalendarHeart,
  CheckSquare,
  ExternalLink,
  Gift,
  HeartHandshake,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareQuote,
  Palette,
  Settings,
  Users,
  X,
} from 'lucide-vue-next';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const toast = useToastStore();
const mobileNavOpen = ref(false);

const navItems = [
  { label: 'Ringkasan', to: '/admin', icon: LayoutDashboard, exact: true },
  { label: 'Undangan & Mempelai', to: '/admin/invitation', icon: HeartHandshake },
  { label: 'Acara & Cerita', to: '/admin/events-stories', icon: CalendarHeart },
  { label: 'Template', to: '/admin/templates', icon: Palette },
  { label: 'Galeri Foto', to: '/admin/gallery', icon: ImageIcon },
  { label: 'Daftar Tamu', to: '/admin/guests', icon: Users },
  { label: 'Data RSVP', to: '/admin/rsvps', icon: CheckSquare },
  { label: 'Moderasi Ucapan', to: '/admin/wishes', icon: MessageSquareQuote },
  { label: 'Kado & Pengaturan', to: '/admin/settings', icon: Gift },
];

const currentSectionTitle = computed(() => {
  const matched = navItems.find((item) =>
    item.exact ? route.path === item.to : route.path.startsWith(item.to)
  );
  return matched?.label || 'Dashboard Admin';
});

async function handleLogout() {
  await auth.logout();
  toast.push('Anda telah keluar dari sesi administrator.', 'info');
  await router.push('/admin/login');
}
</script>

<template>
  <div class="min-h-screen bg-[#F7F5F0] text-stone-900 lg:flex">
    <!-- Mobile Sidebar Overlay -->
    <div
      v-if="mobileNavOpen"
      class="fixed inset-0 z-40 bg-stone-950/50 lg:hidden"
      @click="mobileNavOpen = false"
    />

    <!-- Sidebar -->
    <aside
      :class="mobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
      class="fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-stone-200 bg-white transition-transform duration-200 lg:static"
    >
      <div class="flex items-center justify-between border-b border-stone-200 px-5 py-4">
        <router-link to="/admin" class="font-display text-xl font-semibold text-stone-900">
          Atelier Admin
        </router-link>
        <button
          type="button"
          class="p-1.5 text-stone-500 hover:text-stone-900 lg:hidden cursor-pointer"
          aria-label="Tutup menu"
          @click="mobileNavOpen = false"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <nav class="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        <router-link
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          :class="
            (item.exact ? route.path === item.to : route.path.startsWith(item.to))
              ? 'bg-stone-900 text-white'
              : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
          "
          class="flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-colors"
          @click="mobileNavOpen = false"
        >
          <component :is="item.icon" class="h-4 w-4 shrink-0" />
          <span class="truncate">{{ item.label }}</span>
        </router-link>
      </nav>

      <div class="border-t border-stone-200 p-4">
        <div v-if="auth.admin" class="mb-3">
          <p class="truncate text-sm font-medium text-stone-900">{{ auth.admin.name }}</p>
          <p class="truncate text-xs text-stone-500">{{ auth.admin.email }}</p>
        </div>
        <button
          type="button"
          class="flex w-full items-center gap-2 border border-stone-300 px-3 py-2 text-xs font-medium text-stone-700 transition-colors hover:bg-stone-100 cursor-pointer"
          @click="handleLogout"
        >
          <LogOut class="h-3.5 w-3.5" />
          <span>Keluar Sesi</span>
        </button>
      </div>
    </aside>

    <!-- Main Area -->
    <div class="flex min-w-0 flex-1 flex-col">
      <header class="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div class="flex items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <div class="flex items-center gap-3 min-w-0">
            <button
              type="button"
              class="p-2 text-stone-600 hover:text-stone-900 lg:hidden cursor-pointer"
              aria-label="Buka menu"
              @click="mobileNavOpen = true"
            >
              <Menu class="h-5 w-5" />
            </button>
            <div class="flex items-center gap-2 text-sm text-stone-500 truncate">
              <Settings class="hidden h-4 w-4 sm:inline text-stone-400" />
              <span class="hidden sm:inline">Admin</span>
              <span class="hidden sm:inline" aria-hidden="true">/</span>
              <span class="font-medium text-stone-900 truncate">{{ currentSectionTitle }}</span>
            </div>
          </div>

          <router-link
            to="/"
            target="_blank"
            class="inline-flex min-h-[38px] items-center gap-1.5 border border-stone-300 bg-white px-3.5 py-1.5 text-xs font-medium text-stone-800 transition-colors hover:border-stone-800 whitespace-nowrap shrink-0"
          >
            <span>Lihat Undangan</span>
            <ExternalLink class="h-3.5 w-3.5" />
          </router-link>
        </div>
      </header>

      <main class="flex-1 p-5 sm:p-8">
        <div class="mx-auto max-w-6xl">
          <router-view />
        </div>
      </main>
    </div>
  </div>
</template>
