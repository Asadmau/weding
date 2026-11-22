<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Loader2, Lock } from 'lucide-vue-next';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';

const router = useRouter();
const auth = useAuthStore();
const toast = useToastStore();

const errorMessage = ref('');
const form = reactive({
  name: 'Admin Pengantin',
  email: '',
  password: '',
  confirmPassword: '',
});

onMounted(async () => {
  await auth.hydrate(true);
  if (auth.admin) {
    await router.replace('/admin');
  }
});

async function handleSubmit() {
  errorMessage.value = '';

  if (auth.needsSetup) {
    if (form.name.trim().length < 2) {
      errorMessage.value = 'Nama administrator minimal 2 karakter.';
      return;
    }
    if (form.password.length < 8) {
      errorMessage.value = 'Password minimal 8 karakter.';
      return;
    }
    if (form.password !== form.confirmPassword) {
      errorMessage.value = 'Konfirmasi password tidak cocok.';
      return;
    }
    try {
      await auth.setupAdmin({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      toast.push('Akun administrator berhasil dibuat.', 'success');
      await router.push('/admin');
    } catch (err) {
      errorMessage.value = err instanceof Error ? err.message : 'Gagal membuat akun admin.';
    }
    return;
  }

  try {
    await auth.login({
      email: form.email.trim(),
      password: form.password,
    });
    toast.push('Selamat datang kembali di Dashboard Admin.', 'success');
    await router.push('/admin');
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'Login gagal.';
  }
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-[#F7F5F0] px-6 py-12">
    <div class="w-full max-w-md border border-stone-200 bg-white p-8 sm:p-10">
      <div class="text-center">
        <div class="mx-auto flex h-11 w-11 items-center justify-center border border-stone-200 bg-[#FBF9F5]">
          <Lock class="h-5 w-5 text-stone-700" />
        </div>
        <h1 class="font-display mt-4 text-3xl font-medium text-stone-900">
          {{ auth.needsSetup ? 'Aktivasi Akun Admin' : 'Login Administrator' }}
        </h1>
        <p class="mt-2 text-sm text-stone-600">
          {{
            auth.needsSetup
              ? 'Buat akun administrator tunggal Anda untuk mengelola undangan pernikahan.'
              : 'Masuk untuk mengelola konten undangan, tamu, RSVP, dan moderasi ucapan.'
          }}
        </p>
      </div>

      <form class="mt-8 space-y-4" @submit.prevent="handleSubmit">
        <div v-if="auth.needsSetup">
          <label for="admin-name" class="block text-xs font-medium uppercase tracking-wider text-stone-600">
            Nama Administrator
          </label>
          <input
            id="admin-name"
            v-model="form.name"
            type="text"
            required
            class="mt-1.5 w-full border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 focus:border-stone-900 focus:outline-none"
          />
        </div>

        <div>
          <label for="admin-email" class="block text-xs font-medium uppercase tracking-wider text-stone-600">
            Email
          </label>
          <input
            id="admin-email"
            v-model="form.email"
            type="email"
            required
            autocomplete="email"
            class="mt-1.5 w-full border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 focus:border-stone-900 focus:outline-none"
            placeholder="admin@wedding.id"
          />
        </div>

        <div>
          <label for="admin-password" class="block text-xs font-medium uppercase tracking-wider text-stone-600">
            Password
          </label>
          <input
            id="admin-password"
            v-model="form.password"
            type="password"
            required
            :autocomplete="auth.needsSetup ? 'new-password' : 'current-password'"
            class="mt-1.5 w-full border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 focus:border-stone-900 focus:outline-none"
            placeholder="Minimal 8 karakter"
          />
        </div>

        <div v-if="auth.needsSetup">
          <label for="admin-confirm" class="block text-xs font-medium uppercase tracking-wider text-stone-600">
            Konfirmasi Password
          </label>
          <input
            id="admin-confirm"
            v-model="form.confirmPassword"
            type="password"
            required
            autocomplete="new-password"
            class="mt-1.5 w-full border border-stone-300 px-3.5 py-2.5 text-sm text-stone-900 focus:border-stone-900 focus:outline-none"
          />
        </div>

        <p v-if="errorMessage" class="text-sm text-red-700" role="alert">
          {{ errorMessage }}
        </p>

        <button
          type="submit"
          :disabled="auth.loading"
          class="mt-2 inline-flex min-h-[44px] w-full items-center justify-center gap-2 bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stone-800 disabled:opacity-60 cursor-pointer"
        >
          <Loader2 v-if="auth.loading" class="h-4 w-4 animate-spin" />
          <span>{{ auth.needsSetup ? 'Buat Akun & Masuk' : 'Masuk ke Dashboard' }}</span>
        </button>
      </form>

      <div class="mt-6 border-t border-stone-200 pt-4 text-center">
        <router-link to="/" class="text-xs text-stone-500 hover:text-stone-900 hover:underline">
          Kembali ke Halaman Undangan
        </router-link>
      </div>
    </div>
  </div>
</template>
