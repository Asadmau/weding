import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to) {
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' };
    }
    return { top: 0 };
  },
  routes: [
    {
      path: '/admin/login',
      name: 'admin-login',
      component: () => import('@/views/admin/AdminLoginView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/admin',
      component: () => import('@/layouts/AdminLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'admin-dashboard',
          component: () => import('@/views/admin/AdminDashboardView.vue'),
        },
        {
          path: 'invitation',
          name: 'admin-invitation',
          component: () => import('@/views/admin/AdminInvitationView.vue'),
        },
        {
          path: 'events-stories',
          name: 'admin-events-stories',
          component: () => import('@/views/admin/AdminEventsStoriesView.vue'),
        },
        {
          path: 'templates',
          name: 'admin-templates',
          component: () => import('@/views/admin/AdminTemplatesView.vue'),
        },
        {
          path: 'gallery',
          name: 'admin-gallery',
          component: () => import('@/views/admin/AdminGalleryView.vue'),
        },
        {
          path: 'guests',
          name: 'admin-guests',
          component: () => import('@/views/admin/AdminGuestsView.vue'),
        },
        {
          path: 'rsvps',
          name: 'admin-rsvps',
          component: () => import('@/views/admin/AdminRsvpView.vue'),
        },
        {
          path: 'wishes',
          name: 'admin-wishes',
          component: () => import('@/views/admin/AdminWishesView.vue'),
        },
        {
          path: 'settings',
          name: 'admin-settings',
          component: () => import('@/views/admin/AdminSettingsView.vue'),
        },
      ],
    },
    {
      path: '/:slug/:guestSlug',
      name: 'personalized-invitation',
      component: () => import('@/views/public/InvitationView.vue'),
    },
    {
      path: '/:slug/t/:token',
      name: 'legacy-personalized-invitation',
      component: () => import('@/views/public/InvitationView.vue'),
    },
    {
      path: '/:slug',
      name: 'public-invitation',
      component: () => import('@/views/public/InvitationView.vue'),
    },
    {
      path: '/',
      name: 'default-invitation',
      component: () => import('@/views/public/InvitationView.vue'),
    },
  ],
});

router.beforeEach(async (to) => {
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
  const guestOnly = to.matched.some((record) => record.meta.guestOnly);

  if (!requiresAuth && !guestOnly) {
    return true;
  }

  const auth = useAuthStore();
  await auth.hydrate();

  if (requiresAuth && !auth.admin) {
    return { path: '/admin/login' };
  }
  if (guestOnly && auth.admin) {
    return { path: '/admin' };
  }
  return true;
});
