<script setup lang="ts">
import { computed, ref } from 'vue';
import { Calendar, Clock, MapPin } from 'lucide-vue-next';
import WeddingCountdown from '@/components/wedding/WeddingCountdown.vue';
import WeddingCover from '@/components/wedding/WeddingCover.vue';
import WeddingGalleryLightbox from '@/components/wedding/WeddingGalleryLightbox.vue';
import WeddingGiftSection from '@/components/wedding/WeddingGiftSection.vue';
import WeddingMusicControl from '@/components/wedding/WeddingMusicControl.vue';
import WeddingRsvpSection from '@/components/wedding/WeddingRsvpSection.vue';
import WeddingWishesSection from '@/components/wedding/WeddingWishesSection.vue';
import type {
  PersonalizedGuestContext,
  PublicInvitationBundle,
  PublicWishDto,
} from '@/types/wedding';

const props = defineProps<{
  bundle: PublicInvitationBundle;
  guestToken?: string | null;
  guestSlug?: string | null;
  guestContext?: PersonalizedGuestContext | null;
}>();

const coverOpen = ref(true);
const musicCtrl = ref<InstanceType<typeof WeddingMusicControl> | null>(null);
const localWishes = ref<PublicWishDto[]>([...props.bundle.wishes]);

const coupleNames = computed(() => {
  if (!props.bundle.couple) return props.bundle.invitation.title;
  return `${props.bundle.couple.groomNickName} & ${props.bundle.couple.brideNickName}`;
});

const primaryEvent = computed(() => props.bundle.events[0] || null);

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

function handleOpenInvitation() {
  coverOpen.value = false;
  if (props.bundle.settings.musicEnabled && props.bundle.invitation.isMusicEnabled) {
    musicCtrl.value?.startPlayback();
  }
}

function onWishApproved(wish: PublicWishDto) {
  localWishes.value = [wish, ...localWishes.value];
}
</script>

<template>
  <div class="min-h-screen bg-[#FAFAF9] text-zinc-900">
    <WeddingCover
      v-if="coverOpen"
      :groom-name="bundle.couple?.groomNickName || 'Groom'"
      :bride-name="bundle.couple?.brideNickName || 'Bride'"
      :primary-date="bundle.invitation.primaryDate"
      :hero-image-url="bundle.invitation.heroImageUrl"
      :guest-name="guestContext?.guest.fullName"
      :guest-group="guestContext?.guest.groupName"
      theme="minimalist"
      @open="handleOpenInvitation"
    />

    <!-- Top Navigation -->
    <header class="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur">
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-8 px-6 py-4">
        <a
          href="#hero"
          class="text-base font-semibold tracking-tight text-zinc-900 whitespace-nowrap shrink-0"
        >
          {{ coupleNames }}
        </a>

        <nav class="hidden md:flex items-center gap-6 text-xs tracking-widest uppercase text-zinc-500">
          <a href="#couple" class="hover:text-zinc-900 transition-colors whitespace-nowrap shrink-0">Mempelai</a>
          <a href="#events" class="hover:text-zinc-900 transition-colors whitespace-nowrap shrink-0">Acara</a>
          <a
            v-if="bundle.settings.galleryEnabled"
            href="#gallery"
            class="hover:text-zinc-900 transition-colors whitespace-nowrap shrink-0"
          >
            Galeri
          </a>
          <a
            v-if="bundle.settings.wishesEnabled"
            href="#wishes"
            class="hover:text-zinc-900 transition-colors whitespace-nowrap shrink-0"
          >
            Ucapan
          </a>
        </nav>

        <div class="flex items-center gap-3 shrink-0">
          <a
            v-if="bundle.settings.rsvpEnabled"
            href="#rsvp"
            class="bg-zinc-900 px-4 py-2 text-xs font-medium tracking-wide text-white transition-colors hover:bg-zinc-800 whitespace-nowrap shrink-0"
          >
            RSVP
          </a>
        </div>
      </div>
    </header>

    <!-- 2. Minimalist Architectural Hero -->
    <section id="hero" class="border-b border-zinc-200 bg-white">
      <div class="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <div class="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="font-mono text-xs tracking-widest uppercase text-zinc-500">
              {{ formatDate(bundle.invitation.primaryDate) }}
            </p>
            <h1 class="font-display text-balance mt-4 text-6xl font-medium tracking-tight text-zinc-950 sm:text-8xl">
              {{ coupleNames }}
            </h1>
          </div>
          <div class="max-w-md">
            <p class="text-sm leading-relaxed text-zinc-600 sm:text-base">
              {{ bundle.invitation.heroSubtitle }}
            </p>
            <p v-if="guestContext" class="mt-4 text-xs tracking-wider uppercase text-zinc-500">
              Tamu: <span class="font-semibold text-zinc-900">{{ guestContext.guest.fullName }}</span>
            </p>
          </div>
        </div>

        <div class="mt-12 aspect-[16/9] overflow-hidden bg-zinc-100">
          <img
            v-if="bundle.invitation.heroImageUrl"
            :src="bundle.invitation.heroImageUrl"
            :alt="coupleNames"
            referrerpolicy="no-referrer"
            class="h-full w-full object-cover"
          />
        </div>
      </div>
    </section>

    <!-- Quote & Countdown -->
    <section class="border-b border-zinc-200 py-20">
      <div class="mx-auto max-w-4xl px-6">
        <div v-if="bundle.invitation.openingQuote" class="mb-16 text-center">
          <p class="font-editorial text-lg italic leading-relaxed text-zinc-700 sm:text-2xl">
            “{{ bundle.invitation.openingQuote }}”
          </p>
          <p v-if="bundle.invitation.openingQuoteAuthor" class="mt-3 font-mono text-xs text-zinc-500">
            {{ bundle.invitation.openingQuoteAuthor }}
          </p>
        </div>

        <WeddingCountdown
          :target-iso="bundle.invitation.countdownTarget"
          accent-class="text-zinc-950"
          border-class="border-zinc-200 bg-white"
        />
      </div>
    </section>

    <!-- 3. Couple -->
    <section v-if="bundle.couple" id="couple" class="border-b border-zinc-200 bg-white py-20 sm:py-24">
      <div class="mx-auto max-w-5xl px-6">
        <p class="font-mono text-xs uppercase tracking-widest text-zinc-500">01. Mempelai</p>
        <div class="mt-10 grid grid-cols-1 gap-12 md:grid-cols-2">
          <article class="flex flex-col gap-5 sm:flex-row sm:items-start">
            <img
              v-if="bundle.couple.groomPhotoUrl"
              :src="bundle.couple.groomPhotoUrl"
              :alt="bundle.couple.groomFullName"
              referrerpolicy="no-referrer"
              class="aspect-[3/4] w-44 shrink-0 object-cover bg-zinc-100"
            />
            <div>
              <p class="font-mono text-xs uppercase text-zinc-500">Groom</p>
              <h3 class="font-display mt-1 text-3xl font-medium text-zinc-950">
                {{ bundle.couple.groomFullName }}
              </h3>
              <p v-if="bundle.couple.groomParents" class="mt-2 text-xs leading-relaxed text-zinc-600">
                {{ bundle.couple.groomParents }}
              </p>
              <p v-if="bundle.couple.groomBio" class="mt-3 text-sm leading-relaxed text-zinc-600">
                {{ bundle.couple.groomBio }}
              </p>
            </div>
          </article>

          <article class="flex flex-col gap-5 sm:flex-row sm:items-start">
            <img
              v-if="bundle.couple.bridePhotoUrl"
              :src="bundle.couple.bridePhotoUrl"
              :alt="bundle.couple.brideFullName"
              referrerpolicy="no-referrer"
              class="aspect-[3/4] w-44 shrink-0 object-cover bg-zinc-100"
            />
            <div>
              <p class="font-mono text-xs uppercase text-zinc-500">Bride</p>
              <h3 class="font-display mt-1 text-3xl font-medium text-zinc-950">
                {{ bundle.couple.brideFullName }}
              </h3>
              <p v-if="bundle.couple.brideParents" class="mt-2 text-xs leading-relaxed text-zinc-600">
                {{ bundle.couple.brideParents }}
              </p>
              <p v-if="bundle.couple.brideBio" class="mt-3 text-sm leading-relaxed text-zinc-600">
                {{ bundle.couple.brideBio }}
              </p>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- 4. Love Story -->
    <section
      v-if="bundle.settings.loveStoryEnabled && bundle.stories.length > 0"
      id="story"
      class="border-b border-zinc-200 py-20 sm:py-24"
    >
      <div class="mx-auto max-w-5xl px-6">
        <p class="font-mono text-xs uppercase tracking-widest text-zinc-500">02. Kisah Cinta</p>
        <div class="mt-10 divide-y divide-zinc-200 border-t border-zinc-200">
          <article
            v-for="(story, idx) in bundle.stories"
            :key="story.id"
            class="grid grid-cols-1 gap-6 py-8 md:grid-cols-12"
          >
            <div class="md:col-span-3 font-mono text-xs text-zinc-500">
              <span>{{ String(idx + 1).padStart(2, '0') }}. {{ story.periodLabel }}</span>
              <p v-if="story.storyDate" class="mt-1 text-zinc-400">{{ story.storyDate }}</p>
            </div>
            <div class="md:col-span-6">
              <h3 class="font-display text-2xl font-medium text-zinc-950">{{ story.title }}</h3>
              <p class="mt-2 text-sm leading-relaxed text-zinc-600">{{ story.description }}</p>
            </div>
            <div v-if="story.imageUrl" class="md:col-span-3">
              <img
                :src="story.imageUrl"
                :alt="story.title"
                referrerpolicy="no-referrer"
                class="aspect-[4/3] w-full object-cover bg-zinc-100"
              />
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- 6 & 7. Events & Map -->
    <section id="events" class="border-b border-zinc-200 bg-white py-20 sm:py-24">
      <div class="mx-auto max-w-5xl px-6">
        <p class="font-mono text-xs uppercase tracking-widest text-zinc-500">03. Jadwal &amp; Lokasi</p>
        <div class="mt-10 grid grid-cols-1 gap-px bg-zinc-200 border border-zinc-200 md:grid-cols-2">
          <article
            v-for="evt in bundle.events"
            :key="evt.id"
            class="flex flex-col justify-between bg-white p-8"
          >
            <div>
              <h3 class="font-display text-3xl font-medium text-zinc-950">{{ evt.title }}</h3>
              <div class="mt-5 space-y-2.5 text-sm text-zinc-600">
                <div class="flex items-center gap-2.5">
                  <Calendar class="h-4 w-4 text-zinc-400" />
                  <span>{{ formatDate(evt.eventDate) }}</span>
                </div>
                <div class="flex items-center gap-2.5">
                  <Clock class="h-4 w-4 text-zinc-400" />
                  <span class="tabular-nums">{{ evt.startTime }}{{ evt.endTime ? ` – ${evt.endTime}` : '' }} {{ evt.timezone }}</span>
                </div>
                <div class="flex items-start gap-2.5">
                  <MapPin class="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
                  <div>
                    <p class="font-medium text-zinc-900">{{ evt.venueName }}</p>
                    <p>{{ evt.venueAddress }}</p>
                  </div>
                </div>
              </div>
              <p v-if="evt.dressCode" class="mt-4 text-xs text-zinc-500">
                Dress code: {{ evt.dressCode }}
              </p>
            </div>

            <div v-if="evt.mapsUrl" class="mt-8">
              <a
                :href="evt.mapsUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex min-h-[42px] items-center border border-zinc-900 px-5 py-2 text-xs font-medium uppercase tracking-wider text-zinc-900 transition-colors hover:bg-zinc-900 hover:text-white whitespace-nowrap"
              >
                Lihat Peta
              </a>
            </div>
          </article>
        </div>

        <div v-if="primaryEvent?.mapsEmbedUrl" class="mt-10 overflow-hidden border border-zinc-200">
          <iframe
            :src="primaryEvent.mapsEmbedUrl"
            title="Peta Lokasi"
            class="h-72 w-full border-0 sm:h-96"
            loading="lazy"
          />
        </div>
      </div>
    </section>

    <!-- 8. Gallery -->
    <section
      v-if="bundle.settings.galleryEnabled"
      id="gallery"
      class="border-b border-zinc-200 py-20 sm:py-24"
    >
      <div class="mx-auto max-w-5xl px-6">
        <p class="mb-10 font-mono text-xs uppercase tracking-widest text-zinc-500">04. Galeri</p>
        <WeddingGalleryLightbox :items="bundle.galleries" />
      </div>
    </section>

    <!-- 9. RSVP -->
    <section v-if="bundle.settings.rsvpEnabled" id="rsvp" class="border-b border-zinc-200 bg-white py-20 sm:py-24">
      <div class="mx-auto max-w-4xl px-6">
        <div class="mb-10 text-center">
          <p class="font-mono text-xs uppercase tracking-widest text-zinc-500">05. RSVP</p>
          <h2 class="font-display mt-2 text-4xl font-medium text-zinc-950">Konfirmasi Kehadiran</h2>
        </div>
        <WeddingRsvpSection
          :slug="bundle.invitation.slug"
          :guest-token="guestToken"
          :guest-slug="guestSlug"
          :guest-context="guestContext"
          :rsvp-deadline="bundle.settings.rsvpDeadline"
          accent-bg-class="bg-zinc-900 hover:bg-zinc-800 text-white"
        />
      </div>
    </section>

    <!-- 10. Wishes -->
    <section v-if="bundle.settings.wishesEnabled" id="wishes" class="border-b border-zinc-200 py-20 sm:py-24">
      <div class="mx-auto max-w-4xl px-6">
        <div class="mb-10 text-center">
          <p class="font-mono text-xs uppercase tracking-widest text-zinc-500">06. Ucapan</p>
          <h2 class="font-display mt-2 text-4xl font-medium text-zinc-950">Doa &amp; Ucapan Tamu</h2>
        </div>
        <WeddingWishesSection
          :slug="bundle.invitation.slug"
          :guest-token="guestToken"
          :guest-slug="guestSlug"
          :default-author-name="guestContext?.guest.fullName"
          :wishes="localWishes"
          accent-bg-class="bg-zinc-900 hover:bg-zinc-800 text-white"
          @wish-approved="onWishApproved"
        />
      </div>
    </section>

    <!-- 11. Digital Gift -->
    <section
      v-if="bundle.settings.giftsEnabled && bundle.giftAccounts.length > 0"
      id="gift"
      class="border-b border-zinc-200 bg-white py-20 sm:py-24"
    >
      <div class="mx-auto max-w-4xl px-6">
        <div class="mb-10 text-center">
          <p class="font-mono text-xs uppercase tracking-widest text-zinc-500">07. Tanda Kasih</p>
          <h2 class="font-display mt-2 text-4xl font-medium text-zinc-950">Kado Digital</h2>
        </div>
        <WeddingGiftSection :accounts="bundle.giftAccounts" />
      </div>
    </section>

    <!-- 12. Footer -->
    <footer class="bg-zinc-950 py-12 text-center text-zinc-300">
      <div class="mx-auto max-w-4xl px-6">
        <p class="font-display text-2xl text-white">{{ coupleNames }}</p>
        <p class="mt-2 text-xs text-zinc-400">
          {{ bundle.settings.footerText || bundle.invitation.title }}
        </p>
        <div class="mt-4">
          <router-link to="/admin/login" class="text-xs text-zinc-500 hover:text-zinc-200 hover:underline">
            Dashboard Admin
          </router-link>
        </div>
      </div>
    </footer>

    <WeddingMusicControl
      ref="musicCtrl"
      :music-enabled="bundle.settings.musicEnabled && bundle.invitation.isMusicEnabled"
      :music-url="bundle.invitation.musicUrl"
      :music-title="bundle.invitation.musicTitle"
      :couple-names="coupleNames"
      :slug="bundle.invitation.slug"
    />
  </div>
</template>
