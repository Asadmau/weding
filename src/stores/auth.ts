import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api, extractApiError, setCsrfToken } from '@/services/api';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
}

export const useAuthStore = defineStore('auth', () => {
  const admin = ref<AdminUser | null>(null);
  const needsSetup = ref(false);
  const hydrated = ref(false);
  const loading = ref(false);

  async function hydrate(force = false): Promise<void> {
    if (hydrated.value && !force) return;
    loading.value = true;
    try {
      const res = await api.get<{
        data: {
          needsSetup: boolean;
          authenticated: boolean;
          admin: AdminUser | null;
          csrfToken: string | null;
        };
      }>('/auth/status');
      needsSetup.value = res.data.data.needsSetup;
      admin.value = res.data.data.authenticated ? res.data.data.admin : null;
      setCsrfToken(res.data.data.csrfToken);
      hydrated.value = true;
    } catch {
      admin.value = null;
      setCsrfToken(null);
    } finally {
      loading.value = false;
    }
  }

  async function setupAdmin(payload: { name: string; email: string; password: string }) {
    loading.value = true;
    try {
      const res = await api.post<{
        data: { admin: AdminUser; csrfToken: string };
      }>('/auth/setup', payload);
      admin.value = res.data.data.admin;
      needsSetup.value = false;
      setCsrfToken(res.data.data.csrfToken);
      hydrated.value = true;
    } catch (error) {
      throw new Error(extractApiError(error, 'Gagal membuat akun administrator'));
    } finally {
      loading.value = false;
    }
  }

  async function login(payload: { email: string; password: string }) {
    loading.value = true;
    try {
      const res = await api.post<{
        data: { admin: AdminUser; csrfToken: string };
      }>('/auth/login', payload);
      admin.value = res.data.data.admin;
      setCsrfToken(res.data.data.csrfToken);
      hydrated.value = true;
    } catch (error) {
      throw new Error(extractApiError(error, 'Email atau password tidak valid'));
    } finally {
      loading.value = false;
    }
  }

  async function logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      admin.value = null;
      setCsrfToken(null);
    }
  }

  return {
    admin,
    needsSetup,
    hydrated,
    loading,
    hydrate,
    setupAdmin,
    login,
    logout,
  };
});
