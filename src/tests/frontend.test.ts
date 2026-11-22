import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, extractApiError } from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { resolveTemplateComponent } from '@/templates/registry';

describe('Frontend Core Modules Unit Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('resolves all 3 dynamic wedding templates and falls back safely', () => {
    const classic = resolveTemplateComponent('classic-elegant');
    const botanical = resolveTemplateComponent('botanical-green');
    const minimalist = resolveTemplateComponent('modern-minimalist');
    const fallback = resolveTemplateComponent('unknown-template-key');

    expect(classic).toBeDefined();
    expect(botanical).toBeDefined();
    expect(minimalist).toBeDefined();
    expect(fallback).toBeDefined();
  });

  it('hydrates auth store from /auth/status and clears state on logout', async () => {
    const getSpy = vi.spyOn(api, 'get').mockResolvedValueOnce({
      data: {
        data: {
          needsSetup: false,
          authenticated: true,
          admin: { id: 'adm-1', email: 'admin@wedding.id', name: 'Admin' },
          csrfToken: 'csrf-xyz',
        },
      },
    });
    const postSpy = vi.spyOn(api, 'post').mockResolvedValueOnce({ data: { data: { loggedOut: true } } });

    const auth = useAuthStore();
    await auth.hydrate();

    expect(getSpy).toHaveBeenCalledWith('/auth/status');
    expect(auth.admin?.email).toBe('admin@wedding.id');
    expect(auth.hydrated).toBe(true);

    await auth.logout();
    expect(postSpy).toHaveBeenCalledWith('/auth/logout');
    expect(auth.admin).toBeNull();

    getSpy.mockRestore();
    postSpy.mockRestore();
  });

  it('extracts friendly validation error messages cleanly', () => {
    const err = new Error('Network failure');
    expect(extractApiError(err, 'Fallback')).toBe('Network failure');
  });
});
