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
  <div class="min-h-screen bg-[#FBF9F5] text-[#1C1917]">
    <WeddingCover
      v-if="coverOpen"
      :groom-name="bundle.couple?.groomNickName || 'Groom'"
      :bride-name="bundle.couple?.brideNickName || 'Bride'"
      :primary-date="bundle.invitation.primaryDate"
      :hero-image-url="bundle.invitation.heroImageUrl"
      :guest-name="guestContext?.guest.fullName"
      :guest-group="guestContext?.guest.groupName"
      theme="classic"
      @open="handleOpenInvitation"
    />

    <!-- Top Navigation (3-zone contract) -->
    <header class="sticky top-0 z-30 border-b border-[#E7DFD3] bg-[#FBF9F5]/95 backdrop-blur">
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-8 px-6 py-4">
        <a
          href="#hero"
          class="font-display text-xl font-semibold tracking-tight text-[#1C1917] whitespace-nowrap shrink-0"
        >
          {{ coupleNames }}
        </a>

        <nav class="hidden md:flex items-center gap-6 text-xs tracking-widest uppercase text-stone-600">
          <a href="#couple" class="hover:text-[#9A7B4F] transition-colors whitespace-nowrap shrink-0">Mempelai</a>
          <a href="#events" class="hover:text-[#9A7B4F] transition-colors whitespace-nowrap shrink-0">Acara</a>
          <a
            v-if="bundle.settings.galleryEnabled"
            href="#gallery"
            class="hover:text-[#9A7B4F] transition-colors whitespace-nowrap shrink-0"
          >
            Galeri
          </a>
          <a
            v-if="bundle.settings.wishesEnabled"
            href="#wishes"
            class="hover:text-[#9A7B4F] transition-colors whitespace-nowrap shrink-0"
          >
            Ucapan
          </a>
        </nav>

        <div class="flex items-center gap-3 shrink-0">
          <a
            v-if="bundle.settings.rsvpEnabled"
            href="#rsvp"
            class="bg-[#9A7B4F] px-4 py-2 text-xs font-medium tracking-wide text-[#FBF9F5] transition-colors hover:bg-[#82663F] whitespace-nowrap shrink-0"
          >
            Konfirmasi RSVP
          </a>
        </div>
      </div>
    </header>

    <!-- 2. Hero Section -->
    <section id="hero" class="relative flex min-h-[82vh] items-end overflow-hidden bg-stone-900">
      <img
        v-if="bundle.invitation.heroImageUrl"
        :src="bundle.invitation.heroImageUrl"
        :alt="coupleNames"
        referrerpolicy="no-referrer"
        class="absolute inset-0 h-full w-full object-cover"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/35 to-stone-950/25" />

      <div class="relative z-10 mx-auto w-full max-w-5xl px-6 pb-16 pt-28 text-center text-white">
        <p class="text-xs tracking-[0.28em] uppercase text-stone-200">
          {{ formatDate(bundle.invitation.primaryDate) }}
        </p>
        <h1 class="font-display text-balance mt-4 text-5xl font-medium tracking-tight sm:text-7xl">
          {{ coupleNames }}
        </h1>
        <p class="mx-auto mt-5 max-w-2xl font-editorial text-base leading-relaxed text-stone-200 sm:text-lg">
          {{ bundle.invitation.heroSubtitle }}
        </p>

        <div v-if="guestContext" class="mt-7 inline-block border-t border-white/25 pt-4 text-sm text-stone-200">
          Undangan Kehormatan untuk <span class="font-medium text-white">{{ guestContext.guest.fullName }}</span>
        </div>
      </div>
    </section>

    <!-- Opening Quote -->
    <section v-if="bundle.invitation.openingQuote" class="border-b border-[#E7DFD3] bg-[#F4EFE6]/65 py-16">
      <div class="mx-auto max-w-3xl px-6 text-center">
        <p class="font-editorial text-lg italic leading-relaxed text-stone-700 sm:text-xl">
          “{{ bundle.invitation.openingQuote }}”
        </p>
        <p
          v-if="bundle.invitation.openingQuoteAuthor"
          class="mt-4 text-xs tracking-[0.2em] uppercase text-[#9A7B4F]"
        >
          {{ bundle.invitation.openingQuoteAuthor }}
        </p>
      </div>
    </section>

    <!-- 3. Couple Profile -->
    <section v-if="bundle.couple" id="couple" class="mx-auto max-w-5xl px-6 py-20 sm:py-24">
      <div class="text-center">
        <p class="text-xs tracking-[0.25em] uppercase text-[#9A7B4F]">Pasangan Mempelai</p>
        <h2 class="font-display text-balance mt-3 text-3xl font-medium text-stone-900 sm:text-5xl">
          Dua Hati Satu Janji
        </h2>
      </div>

      <div class="mt-14 grid grid-cols-1 gap-12 md:grid-cols-2 md:gap-16">
        <!-- Groom -->
        <article class="flex flex-col items-center text-center">
          <div class="aspect-[3/4] w-full max-w-xs overflow-hidden border border-[#E2D8C8] bg-stone-100 p-2">
            <img
              v-if="bundle.couple.groomPhotoUrl"
              :src="bundle.couple.groomPhotoUrl"
              :alt="bundle.couple.groomFullName"
              referrerpolicy="no-referrer"
              class="h-full w-full object-cover"
            />
          </div>
          <p class="mt-6 text-xs tracking-[0.2em] uppercase text-[#9A7B4F]">Mempelai Pria</p>
          <h3 class="font-display mt-2 text-3xl font-medium text-stone-900">
            {{ bundle.couple.groomFullName }}
          </h3>
          <p v-if="bundle.couple.groomParents" class="mt-2 text-sm text-stone-600">
            {{ bundle.couple.groomParents }}
          </p>
          <p v-if="bundle.couple.groomBio" class="mt-4 max-w-sm text-sm leading-relaxed text-stone-600">
            {{ bundle.couple.groomBio }}
          </p>
          <p v-if="bundle.couple.groomInstagram" class="mt-3 font-mono text-xs text-stone-500">
            {{ bundle.couple.groomInstagram }}
          </p>
        </article>

        <!-- Bride -->
        <article class="flex flex-col items-center text-center">
          <div class="aspect-[3/4] w-full max-w-xs overflow-hidden border border-[#E2D8C8] bg-stone-100 p-2">
            <img
              v-if="bundle.couple.bridePhotoUrl"
              :src="bundle.couple.bridePhotoUrl"
              :alt="bundle.couple.brideFullName"
              referrerpolicy="no-referrer"
              class="h-full w-full object-cover"
            />
          </div>
          <p class="mt-6 text-xs tracking-[0.2em] uppercase text-[#9A7B4F]">Mempelai Wanita</p>
          <h3 class="font-display mt-2 text-3xl font-medium text-stone-900">
            {{ bundle.couple.brideFullName }}
          </h3>
          <p v-if="bundle.couple.brideParents" class="mt-2 text-sm text-stone-600">
            {{ bundle.couple.brideParents }}
          </p>
          <p v-if="bundle.couple.brideBio" class="mt-4 max-w-sm text-sm leading-relaxed text-stone-600">
            {{ bundle.couple.brideBio }}
          </p>
          <p v-if="bundle.couple.brideInstagram" class="mt-3 font-mono text-xs text-stone-500">
            {{ bundle.couple.brideInstagram }}
          </p>
        </article>
      </div>
    </section>

    <!-- 5. Countdown -->
    <section class="border-y border-[#E7DFD3] bg-[#F4EFE6]/60 py-16">
      <div class="mx-auto max-w-3xl px-6 text-center">
        <p class="text-xs tracking-[0.25em] uppercase text-[#9A7B4F]">Menuju Hari Bahagia</p>
        <h2 class="font-display mt-2 mb-8 text-3xl font-medium text-stone-900 sm:text-4xl">
          Hitung Mundur Pernikahan
        </h2>
        <WeddingCountdown
          :target-iso="bundle.invitation.countdownTarget"
          accent-class="text-[#9A7B4F]"
          border-class="border-[#DED3C1] bg-white/80"
        />
      </div>
    </section>

    <!-- 4. Love Story -->
    <section
      v-if="bundle.settings.loveStoryEnabled && bundle.stories.length > 0"
      id="story"
      class="mx-auto max-w-5xl px-6 py-20 sm:py-24"
    >
      <div class="text-center">
        <p class="text-xs tracking-[0.25em] uppercase text-[#9A7B4F]">Perjalanan Kami</p>
        <h2 class="font-display text-balance mt-3 text-3xl font-medium text-stone-900 sm:text-5xl">
          Kisah Cinta
        </h2>
      </div>

      <div class="mt-14 space-y-12 divide-y divide-[#E7DFD3]">
        <article
          v-for="story in bundle.stories"
          :key="story.id"
          class="grid grid-cols-1 items-center gap-8 pt-12 first:pt-0 md:grid-cols-12"
        >
          <div class="md:col-span-5">
            <div v-if="story.imageUrl" class="aspect-[4/3] overflow-hidden border border-[#E2D8C8] bg-stone-100">
              <img
                :src="story.imageUrl"
                :alt="story.title"
                referrerpolicy="no-referrer"
                class="h-full w-full object-cover"
              />
            </div>
          </div>
          <div class="md:col-span-7">
            <div class="flex items-center gap-2 text-xs tracking-widest uppercase text-[#9A7B4F]">
              <span>{{ story.periodLabel }}</span>
              <template v-if="story.storyDate">
                <span aria-hidden="true">·</span>
                <span>{{ story.storyDate }}</span>
              </template>
            </div>
            <h3 class="font-display mt-2 text-2xl font-medium text-stone-900 sm:text-3xl">
              {{ story.title }}
            </h3>
            <p class="mt-3 text-sm leading-relaxed text-stone-600 sm:text-base">
              {{ story.description }}
            </p>
          </div>
        </article>
      </div>
    </section>

    <!-- 6 & 7. Wedding Events & Location -->
    <section id="events" class="border-y border-[#E7DFD3] bg-[#F4EFE6]/60 py-20 sm:py-24">
      <div class="mx-auto max-w-5xl px-6">
        <div class="text-center">
          <p class="text-xs tracking-[0.25em] uppercase text-[#9A7B4F]">Rangkaian Acara</p>
          <h2 class="font-display text-balance mt-3 text-3xl font-medium text-stone-900 sm:text-5xl">
            Waktu &amp; Lokasi
          </h2>
        </div>

        <div class="mt-14 grid grid-cols-1 gap-8 md:grid-cols-2">
          <article
            v-for="evt in bundle.events"
            :key="evt.id"
            class="flex flex-col justify-between border border-[#DFD4C3] bg-[#FBF9F5] p-8"
          >
            <div>
              <p class="text-xs tracking-[0.2em] uppercase text-[#9A7B4F]">
                {{ evt.category === 'CEREMONY' ? 'Prosesi Sakral' : evt.category === 'RECEPTION' ? 'Resepsi' : 'Acara' }}
              </p>
              <h3 class="font-display mt-2 text-3xl font-medium text-stone-900">
                {{ evt.title }}
              </h3>

              <div class="mt-6 space-y-3 border-t border-[#E7DFD3] pt-5 text-sm text-stone-700">
                <div class="flex items-start gap-3">
                  <Calendar class="mt-0.5 h-4 w-4 shrink-0 text-[#9A7B4F]" />
                  <span>{{ formatDate(evt.eventDate) }}</span>
                </div>
                <div class="flex items-start gap-3">
                  <Clock class="mt-0.5 h-4 w-4 shrink-0 text-[#9A7B4F]" />
                  <span class="tabular-nums">
                    {{ evt.startTime }}{{ evt.endTime ? ` – ${evt.endTime}` : '' }} {{ evt.timezone }}
                  </span>
                </div>
                <div class="flex items-start gap-3">
                  <MapPin class="mt-0.5 h-4 w-4 shrink-0 text-[#9A7B4F]" />
                  <div>
                    <p class="font-medium text-stone-900">{{ evt.venueName }}</p>
                    <p class="mt-0.5 text-stone-600">{{ evt.venueAddress }}</p>
                  </div>
                </div>
              </div>

              <p v-if="evt.dressCode" class="mt-5 text-xs text-stone-600">
                Busana: <span class="font-medium text-stone-800">{{ evt.dressCode }}</span>
              </p>
              <p v-if="evt.description" class="mt-3 text-sm leading-relaxed text-stone-600">
                {{ evt.description }}
              </p>
            </div>

            <div v-if="evt.mapsUrl" class="mt-8">
              <a
                :href="evt.mapsUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex min-h-[42px] items-center justify-center border border-[#9A7B4F] px-5 py-2 text-xs font-medium tracking-wider uppercase text-[#9A7B4F] transition-colors hover:bg-[#9A7B4F] hover:text-white whitespace-nowrap"
              >
                Buka Google Maps
              </a>
            </div>
          </article>
        </div>

        <!-- Embedded Map for Primary Event -->
        <div
          v-if="primaryEvent?.mapsEmbedUrl"
          class="mt-10 overflow-hidden border border-[#DFD4C3] bg-white"
        >
          <iframe
            :src="primaryEvent.mapsEmbedUrl"
            title="Peta Lokasi Pernikahan"
            class="h-72 w-full border-0 sm:h-96"
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </section>

    <!-- 8. Gallery -->
    <section
      v-if="bundle.settings.galleryEnabled"
      id="gallery"
      class="mx-auto max-w-5xl px-6 py-20 sm:py-24"
    >
      <div class="mb-12 text-center">
        <p class="text-xs tracking-[0.25em] uppercase text-[#9A7B4F]">Momen Berharga</p>
        <h2 class="font-display text-balance mt-3 text-3xl font-medium text-stone-900 sm:text-5xl">
          Galeri Foto
        </h2>
      </div>
      <WeddingGalleryLightbox :items="bundle.galleries" />
    </section>

    <!-- 9. RSVP -->
    <section
      v-if="bundle.settings.rsvpEnabled"
      id="rsvp"
      class="border-t border-[#E7DFD3] bg-[#F4EFE6]/60 py-20 sm:py-24"
    >
      <div class="mx-auto max-w-4xl px-6">
        <div class="mb-12 text-center">
          <p class="text-xs tracking-[0.25em] uppercase text-[#9A7B4F]">Kehadiran</p>
          <h2 class="font-display text-balance mt-3 text-3xl font-medium text-stone-900 sm:text-5xl">
            Konfirmasi Kehadiran (RSVP)
          </h2>
          <p class="mx-auto mt-3 max-w-lg text-sm text-stone-600">
            Kehadiran Anda adalah kebahagiaan bagi kami. Mohon konfirmasikan kehadiran Anda di bawah ini.
          </p>
        </div>
        <WeddingRsvpSection
          :slug="bundle.invitation.slug"
          :guest-token="guestToken"
          :guest-slug="guestSlug"
          :guest-context="guestContext"
          :rsvp-deadline="bundle.settings.rsvpDeadline"
          accent-bg-class="bg-[#9A7B4F] hover:bg-[#82663F] text-white"
        />
      </div>
    </section>

    <!-- 10. Wishes -->
    <section
      v-if="bundle.settings.wishesEnabled"
      id="wishes"
      class="border-t border-[#E7DFD3] py-20 sm:py-24"
    >
      <div class="mx-auto max-w-4xl px-6">
        <div class="mb-12 text-center">
          <p class="text-xs tracking-[0.25em] uppercase text-[#9A7B4F]">Doa &amp; Harapan</p>
          <h2 class="font-display text-balance mt-3 text-3xl font-medium text-stone-900 sm:text-5xl">
            Ucapan untuk Mempelai
          </h2>
        </div>
        <WeddingWishesSection
          :slug="bundle.invitation.slug"
          :guest-token="guestToken"
          :guest-slug="guestSlug"
          :default-author-name="guestContext?.guest.fullName"
          :wishes="localWishes"
          accent-bg-class="bg-[#9A7B4F] hover:bg-[#82663F] text-white"
          @wish-approved="onWishApproved"
        />
      </div>
    </section>

    <!-- 11. Digital Gift -->
    <section
      v-if="bundle.settings.giftsEnabled && bundle.giftAccounts.length > 0"
      id="gift"
      class="border-t border-[#E7DFD3] bg-[#F4EFE6]/60 py-20 sm:py-24"
    >
      <div class="mx-auto max-w-4xl px-6">
        <div class="mb-12 text-center">
          <p class="text-xs tracking-[0.25em] uppercase text-[#9A7B4F]">Tanda Kasih</p>
          <h2 class="font-display text-balance mt-3 text-3xl font-medium text-stone-900 sm:text-5xl">
            Kado Digital
          </h2>
          <p class="mx-auto mt-3 max-w-lg text-sm text-stone-600">
            Doa restu Anda merupakan karunia terindah bagi kami. Namun apabila berkenan memberikan tanda kasih, dapat disalurkan melalui rekening berikut.
          </p>
        </div>
        <WeddingGiftSection :accounts="bundle.giftAccounts" />
      </div>
    </section>

    <!-- 12. Footer -->
    <footer class="border-t border-[#E7DFD3] bg-[#FBF9F5] py-12 text-center">
      <div class="mx-auto max-w-4xl px-6">
        <p class="font-display text-2xl font-medium text-stone-900">
          {{ coupleNames }}
        </p>
        <p class="mt-2 text-xs text-stone-500">
          {{ bundle.settings.footerText || `${bundle.invitation.title} · ${formatDate(bundle.invitation.primaryDate)}` }}
        </p>
        <div class="mt-4">
          <router-link
            to="/admin/login"
            class="text-xs text-stone-400 underline-offset-4 hover:text-stone-700 hover:underline"
          >
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
