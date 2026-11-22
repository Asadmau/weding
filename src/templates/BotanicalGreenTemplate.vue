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
  <div class="min-h-screen bg-[#F5F4EE] text-[#243026]">
    <WeddingCover
      v-if="coverOpen"
      :groom-name="bundle.couple?.groomNickName || 'Groom'"
      :bride-name="bundle.couple?.brideNickName || 'Bride'"
      :primary-date="bundle.invitation.primaryDate"
      :hero-image-url="bundle.invitation.heroImageUrl"
      :guest-name="guestContext?.guest.fullName"
      :guest-group="guestContext?.guest.groupName"
      theme="botanical"
      @open="handleOpenInvitation"
    />

    <!-- Top Navigation -->
    <header class="sticky top-0 z-30 border-b border-[#DCE2D8] bg-[#F5F4EE]/95 backdrop-blur">
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-8 px-6 py-4">
        <a
          href="#hero"
          class="font-display text-xl font-semibold tracking-tight text-[#243026] whitespace-nowrap shrink-0"
        >
          {{ coupleNames }}
        </a>

        <nav class="hidden md:flex items-center gap-6 text-xs tracking-widest uppercase text-[#4B5B4E]">
          <a href="#couple" class="hover:text-[#243026] transition-colors whitespace-nowrap shrink-0">Mempelai</a>
          <a href="#events" class="hover:text-[#243026] transition-colors whitespace-nowrap shrink-0">Acara</a>
          <a
            v-if="bundle.settings.galleryEnabled"
            href="#gallery"
            class="hover:text-[#243026] transition-colors whitespace-nowrap shrink-0"
          >
            Galeri
          </a>
          <a
            v-if="bundle.settings.wishesEnabled"
            href="#wishes"
            class="hover:text-[#243026] transition-colors whitespace-nowrap shrink-0"
          >
            Ucapan
          </a>
        </nav>

        <div class="flex items-center gap-3 shrink-0">
          <a
            v-if="bundle.settings.rsvpEnabled"
            href="#rsvp"
            class="bg-[#3D5241] px-4 py-2 text-xs font-medium tracking-wide text-[#F5F4EE] transition-colors hover:bg-[#2E4032] whitespace-nowrap shrink-0"
          >
            Konfirmasi RSVP
          </a>
        </div>
      </div>
    </header>

    <!-- 2. Split Botanical Conservatory Hero -->
    <section id="hero" class="mx-auto max-w-6xl px-6 py-12 sm:py-20">
      <div class="grid grid-cols-1 items-stretch gap-10 lg:grid-cols-12">
        <div class="flex flex-col justify-center lg:col-span-6">
          <p class="text-xs tracking-[0.25em] uppercase text-[#4F6352]">
            Perayaan Pernikahan · {{ formatDate(bundle.invitation.primaryDate) }}
          </p>
          <h1 class="font-display text-balance mt-4 text-5xl font-medium tracking-tight text-[#243026] sm:text-7xl">
            {{ coupleNames }}
          </h1>
          <p class="mt-6 max-w-lg font-editorial text-base leading-relaxed text-[#4B5B4E] sm:text-lg">
            {{ bundle.invitation.heroSubtitle }}
          </p>

          <div
            v-if="guestContext"
            class="mt-8 border-t border-[#DCE2D8] pt-5 text-sm text-[#4B5B4E]"
          >
            Tamu Kehormatan: <span class="font-semibold text-[#243026]">{{ guestContext.guest.fullName }}</span>
          </div>

          <div class="mt-8 flex flex-wrap gap-3">
            <a
              v-if="bundle.settings.rsvpEnabled"
              href="#rsvp"
              class="inline-flex min-h-[44px] items-center bg-[#3D5241] px-6 py-3 text-sm font-medium text-[#F5F4EE] transition-colors hover:bg-[#2E4032] whitespace-nowrap"
            >
              Konfirmasi Kehadiran
            </a>
            <a
              href="#events"
              class="inline-flex min-h-[44px] items-center border border-[#3D5241] px-6 py-3 text-sm font-medium text-[#3D5241] transition-colors hover:bg-[#E7ECE5] whitespace-nowrap"
            >
              Jadwal Acara
            </a>
          </div>
        </div>

        <div class="lg:col-span-6">
          <div class="h-full min-h-[360px] overflow-hidden border border-[#D4DDD0] bg-[#E7ECE5] p-2.5">
            <img
              v-if="bundle.invitation.heroImageUrl"
              :src="bundle.invitation.heroImageUrl"
              :alt="coupleNames"
              referrerpolicy="no-referrer"
              class="h-full w-full object-cover lg:h-full"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- Deep Sage Quote & Countdown Band -->
    <section class="bg-[#3D5241] py-20 text-[#F5F4EE]">
      <div class="mx-auto max-w-4xl px-6 text-center">
        <p
          v-if="bundle.invitation.openingQuote"
          class="font-editorial text-lg italic leading-relaxed text-[#E6ECE4] sm:text-2xl"
        >
          “{{ bundle.invitation.openingQuote }}”
        </p>
        <p
          v-if="bundle.invitation.openingQuoteAuthor"
          class="mt-4 text-xs tracking-[0.22em] uppercase text-[#C4D3C0]"
        >
          {{ bundle.invitation.openingQuoteAuthor }}
        </p>

        <div class="mt-12 border-t border-white/15 pt-12">
          <p class="mb-6 text-xs tracking-[0.25em] uppercase text-[#C4D3C0]">Menghitung Hari</p>
          <WeddingCountdown
            :target-iso="bundle.invitation.countdownTarget"
            accent-class="text-white"
            border-class="border-white/20 bg-white/5"
          />
        </div>
      </div>
    </section>

    <!-- 3. Couple Profile -->
    <section v-if="bundle.couple" id="couple" class="mx-auto max-w-5xl px-6 py-20 sm:py-24">
      <div class="text-center">
        <p class="text-xs tracking-[0.25em] uppercase text-[#4F6352]">Mempelai Berbahagia</p>
        <h2 class="font-display text-balance mt-3 text-3xl font-medium text-[#243026] sm:text-5xl">
          Sang Pengantin
        </h2>
      </div>

      <div class="mt-14 grid grid-cols-1 gap-10 md:grid-cols-2">
        <article class="border border-[#DCE2D8] bg-white/75 p-8 text-center">
          <div class="mx-auto aspect-[3/4] max-w-[260px] overflow-hidden bg-[#E7ECE5]">
            <img
              v-if="bundle.couple.groomPhotoUrl"
              :src="bundle.couple.groomPhotoUrl"
              :alt="bundle.couple.groomFullName"
              referrerpolicy="no-referrer"
              class="h-full w-full object-cover"
            />
          </div>
          <p class="mt-6 text-xs tracking-widest uppercase text-[#4F6352]">Mempelai Pria</p>
          <h3 class="font-display mt-2 text-3xl font-medium text-[#243026]">
            {{ bundle.couple.groomFullName }}
          </h3>
          <p v-if="bundle.couple.groomParents" class="mt-2 text-sm text-[#4B5B4E]">
            {{ bundle.couple.groomParents }}
          </p>
          <p v-if="bundle.couple.groomBio" class="mt-4 text-sm leading-relaxed text-[#4B5B4E]">
            {{ bundle.couple.groomBio }}
          </p>
        </article>

        <article class="border border-[#DCE2D8] bg-white/75 p-8 text-center">
          <div class="mx-auto aspect-[3/4] max-w-[260px] overflow-hidden bg-[#E7ECE5]">
            <img
              v-if="bundle.couple.bridePhotoUrl"
              :src="bundle.couple.bridePhotoUrl"
              :alt="bundle.couple.brideFullName"
              referrerpolicy="no-referrer"
              class="h-full w-full object-cover"
            />
          </div>
          <p class="mt-6 text-xs tracking-widest uppercase text-[#4F6352]">Mempelai Wanita</p>
          <h3 class="font-display mt-2 text-3xl font-medium text-[#243026]">
            {{ bundle.couple.brideFullName }}
          </h3>
          <p v-if="bundle.couple.brideParents" class="mt-2 text-sm text-[#4B5B4E]">
            {{ bundle.couple.brideParents }}
          </p>
          <p v-if="bundle.couple.brideBio" class="mt-4 text-sm leading-relaxed text-[#4B5B4E]">
            {{ bundle.couple.brideBio }}
          </p>
        </article>
      </div>
    </section>

    <!-- 4. Love Story -->
    <section
      v-if="bundle.settings.loveStoryEnabled && bundle.stories.length > 0"
      id="story"
      class="border-y border-[#DCE2D8] bg-[#EBF0E8]/60 py-20 sm:py-24"
    >
      <div class="mx-auto max-w-5xl px-6">
        <div class="text-center">
          <p class="text-xs tracking-[0.25em] uppercase text-[#4F6352]">Jejak Langkah</p>
          <h2 class="font-display text-balance mt-3 text-3xl font-medium text-[#243026] sm:text-5xl">
            Cerita Kami
          </h2>
        </div>

        <div class="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
          <article
            v-for="story in bundle.stories"
            :key="story.id"
            class="flex flex-col border border-[#D4DDD0] bg-[#F5F4EE]"
          >
            <div v-if="story.imageUrl" class="aspect-[4/3] overflow-hidden bg-[#DCE2D8]">
              <img
                :src="story.imageUrl"
                :alt="story.title"
                referrerpolicy="no-referrer"
                class="h-full w-full object-cover"
              />
            </div>
            <div class="p-6">
              <div class="flex items-center gap-2 text-xs uppercase tracking-widest text-[#4F6352]">
                <span>{{ story.periodLabel }}</span>
                <template v-if="story.storyDate">
                  <span aria-hidden="true">·</span>
                  <span>{{ story.storyDate }}</span>
                </template>
              </div>
              <h3 class="font-display mt-2 text-2xl font-medium text-[#243026]">
                {{ story.title }}
              </h3>
              <p class="mt-3 text-sm leading-relaxed text-[#4B5B4E]">
                {{ story.description }}
              </p>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- 6 & 7. Events & Map -->
    <section id="events" class="mx-auto max-w-5xl px-6 py-20 sm:py-24">
      <div class="text-center">
        <p class="text-xs tracking-[0.25em] uppercase text-[#4F6352]">Detail Acara</p>
        <h2 class="font-display text-balance mt-3 text-3xl font-medium text-[#243026] sm:text-5xl">
          Waktu &amp; Tempat
        </h2>
      </div>

      <div class="mt-14 grid grid-cols-1 gap-8 md:grid-cols-2">
        <article
          v-for="evt in bundle.events"
          :key="evt.id"
          class="flex flex-col justify-between border border-[#D4DDD0] bg-white/85 p-8"
        >
          <div>
            <h3 class="font-display text-3xl font-medium text-[#243026]">
              {{ evt.title }}
            </h3>
            <div class="mt-5 space-y-3 text-sm text-[#4B5B4E]">
              <div class="flex items-start gap-3">
                <Calendar class="mt-0.5 h-4 w-4 shrink-0 text-[#4F6352]" />
                <span>{{ formatDate(evt.eventDate) }}</span>
              </div>
              <div class="flex items-start gap-3">
                <Clock class="mt-0.5 h-4 w-4 shrink-0 text-[#4F6352]" />
                <span class="tabular-nums">{{ evt.startTime }}{{ evt.endTime ? ` – ${evt.endTime}` : '' }} {{ evt.timezone }}</span>
              </div>
              <div class="flex items-start gap-3">
                <MapPin class="mt-0.5 h-4 w-4 shrink-0 text-[#4F6352]" />
                <div>
                  <p class="font-medium text-[#243026]">{{ evt.venueName }}</p>
                  <p class="mt-0.5">{{ evt.venueAddress }}</p>
                </div>
              </div>
            </div>
            <p v-if="evt.dressCode" class="mt-5 text-xs text-[#4B5B4E]">
              Dress Code: <span class="font-medium text-[#243026]">{{ evt.dressCode }}</span>
            </p>
            <p v-if="evt.description" class="mt-3 text-sm leading-relaxed text-[#4B5B4E]">
              {{ evt.description }}
            </p>
          </div>

          <div v-if="evt.mapsUrl" class="mt-8">
            <a
              :href="evt.mapsUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex min-h-[42px] items-center bg-[#3D5241] px-5 py-2 text-xs font-medium tracking-wider uppercase text-white transition-colors hover:bg-[#2E4032] whitespace-nowrap"
            >
              Petunjuk Arah
            </a>
          </div>
        </article>
      </div>

      <div v-if="primaryEvent?.mapsEmbedUrl" class="mt-10 overflow-hidden border border-[#D4DDD0]">
        <iframe
          :src="primaryEvent.mapsEmbedUrl"
          title="Peta Lokasi Pernikahan"
          class="h-72 w-full border-0 sm:h-96"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
        />
      </div>
    </section>

    <!-- 8. Gallery -->
    <section
      v-if="bundle.settings.galleryEnabled"
      id="gallery"
      class="border-t border-[#DCE2D8] bg-[#EBF0E8]/60 py-20 sm:py-24"
    >
      <div class="mx-auto max-w-5xl px-6">
        <div class="mb-12 text-center">
          <p class="text-xs tracking-[0.25em] uppercase text-[#4F6352]">Dokumentasi</p>
          <h2 class="font-display text-balance mt-3 text-3xl font-medium text-[#243026] sm:text-5xl">
            Galeri Momen
          </h2>
        </div>
        <WeddingGalleryLightbox :items="bundle.galleries" />
      </div>
    </section>

    <!-- 9. RSVP -->
    <section v-if="bundle.settings.rsvpEnabled" id="rsvp" class="border-t border-[#DCE2D8] py-20 sm:py-24">
      <div class="mx-auto max-w-4xl px-6">
        <div class="mb-12 text-center">
          <p class="text-xs tracking-[0.25em] uppercase text-[#4F6352]">RSVP</p>
          <h2 class="font-display text-balance mt-3 text-3xl font-medium text-[#243026] sm:text-5xl">
            Konfirmasi Kehadiran
          </h2>
        </div>
        <WeddingRsvpSection
          :slug="bundle.invitation.slug"
          :guest-token="guestToken"
          :guest-slug="guestSlug"
          :guest-context="guestContext"
          :rsvp-deadline="bundle.settings.rsvpDeadline"
          accent-bg-class="bg-[#3D5241] hover:bg-[#2E4032] text-white"
        />
      </div>
    </section>

    <!-- 10. Wishes -->
    <section
      v-if="bundle.settings.wishesEnabled"
      id="wishes"
      class="border-t border-[#DCE2D8] bg-[#EBF0E8]/60 py-20 sm:py-24"
    >
      <div class="mx-auto max-w-4xl px-6">
        <div class="mb-12 text-center">
          <p class="text-xs tracking-[0.25em] uppercase text-[#4F6352]">Buku Tamu</p>
          <h2 class="font-display text-balance mt-3 text-3xl font-medium text-[#243026] sm:text-5xl">
            Doa &amp; Ucapan
          </h2>
        </div>
        <WeddingWishesSection
          :slug="bundle.invitation.slug"
          :guest-token="guestToken"
          :guest-slug="guestSlug"
          :default-author-name="guestContext?.guest.fullName"
          :wishes="localWishes"
          accent-bg-class="bg-[#3D5241] hover:bg-[#2E4032] text-white"
          @wish-approved="onWishApproved"
        />
      </div>
    </section>

    <!-- 11. Digital Gift -->
    <section
      v-if="bundle.settings.giftsEnabled && bundle.giftAccounts.length > 0"
      id="gift"
      class="border-t border-[#DCE2D8] py-20 sm:py-24"
    >
      <div class="mx-auto max-w-4xl px-6">
        <div class="mb-12 text-center">
          <p class="text-xs tracking-[0.25em] uppercase text-[#4F6352]">Tanda Kasih</p>
          <h2 class="font-display text-balance mt-3 text-3xl font-medium text-[#243026] sm:text-5xl">
            Hadiah Digital
          </h2>
        </div>
        <WeddingGiftSection :accounts="bundle.giftAccounts" />
      </div>
    </section>

    <!-- 12. Footer -->
    <footer class="bg-[#3D5241] py-12 text-center text-[#F5F4EE]">
      <div class="mx-auto max-w-4xl px-6">
        <p class="font-display text-2xl font-medium">{{ coupleNames }}</p>
        <p class="mt-2 text-xs text-[#C4D3C0]">
          {{ bundle.settings.footerText || bundle.invitation.title }}
        </p>
        <div class="mt-4">
          <router-link
            to="/admin/login"
            class="text-xs text-[#C4D3C0] underline-offset-4 hover:text-white hover:underline"
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
