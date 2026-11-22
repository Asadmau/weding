<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-vue-next';
import { extractApiError } from '@/services/api';
import { adminApi } from '@/services/weddingApi';
import { useToastStore } from '@/stores/toast';
import type { LoveStoryDto, WeddingEventDto } from '@/types/wedding';

const toast = useToastStore();
const loading = ref(true);
const activeTab = ref<'events' | 'stories'>('events');
const events = ref<WeddingEventDto[]>([]);
const stories = ref<LoveStoryDto[]>([]);

const editingEventId = ref<string | null>(null);
const eventForm = reactive({
  title: '',
  category: 'CEREMONY' as 'CEREMONY' | 'RECEPTION' | 'OTHER',
  eventDate: '2027-06-12',
  startTime: '09:00',
  endTime: '11:00',
  timezone: 'WIB',
  venueName: '',
  venueAddress: '',
  mapsUrl: '',
  mapsEmbedUrl: '',
  dressCode: '',
  description: '',
  sortOrder: 0,
});

const editingStoryId = ref<string | null>(null);
const storyForm = reactive({
  title: '',
  periodLabel: '',
  storyDate: '',
  description: '',
  imageUrl: '',
  sortOrder: 0,
});

async function loadAll() {
  loading.value = true;
  try {
    const [e, s] = await Promise.all([adminApi.getEvents(), adminApi.getStories()]);
    events.value = e;
    stories.value = s;
  } catch (err) {
    toast.push(extractApiError(err, 'Gagal memuat acara dan cerita'), 'error');
  } finally {
    loading.value = false;
  }
}

function resetEventForm() {
  editingEventId.value = null;
  Object.assign(eventForm, {
    title: '',
    category: 'CEREMONY',
    eventDate: '2027-06-12',
    startTime: '09:00',
    endTime: '11:00',
    timezone: 'WIB',
    venueName: '',
    venueAddress: '',
    mapsUrl: '',
    mapsEmbedUrl: '',
    dressCode: '',
    description: '',
    sortOrder: events.value.length + 1,
  });
}

function startEditEvent(evt: WeddingEventDto) {
  editingEventId.value = evt.id;
  Object.assign(eventForm, {
    title: evt.title,
    category: (evt.category as 'CEREMONY' | 'RECEPTION' | 'OTHER') || 'CEREMONY',
    eventDate: evt.eventDate,
    startTime: evt.startTime,
    endTime: evt.endTime,
    timezone: evt.timezone,
    venueName: evt.venueName,
    venueAddress: evt.venueAddress,
    mapsUrl: evt.mapsUrl,
    mapsEmbedUrl: evt.mapsEmbedUrl,
    dressCode: evt.dressCode,
    description: evt.description,
    sortOrder: evt.sortOrder ?? 0,
  });
}

async function saveEvent() {
  try {
    if (editingEventId.value) {
      await adminApi.updateEvent(editingEventId.value, { ...eventForm });
      toast.push('Acara diperbarui.', 'success');
    } else {
      await adminApi.createEvent({ ...eventForm });
      toast.push('Acara baru ditambahkan.', 'success');
    }
    resetEventForm();
    events.value = await adminApi.getEvents();
  } catch (err) {
    toast.push(extractApiError(err, 'Gagal menyimpan acara'), 'error');
  }
}

async function removeEvent(id: string) {
  try {
    await adminApi.deleteEvent(id);
    events.value = events.value.filter((e) => e.id !== id);
    toast.push('Acara dihapus.', 'info');
  } catch (err) {
    toast.push(extractApiError(err, 'Gagal menghapus acara'), 'error');
  }
}

function resetStoryForm() {
  editingStoryId.value = null;
  Object.assign(storyForm, {
    title: '',
    periodLabel: '',
    storyDate: '',
    description: '',
    imageUrl: '',
    sortOrder: stories.value.length + 1,
  });
}

function startEditStory(st: LoveStoryDto) {
  editingStoryId.value = st.id;
  Object.assign(storyForm, {
    title: st.title,
    periodLabel: st.periodLabel,
    storyDate: st.storyDate,
    description: st.description,
    imageUrl: st.imageUrl,
    sortOrder: st.sortOrder ?? 0,
  });
}

async function saveStory() {
  try {
    if (editingStoryId.value) {
      await adminApi.updateStory(editingStoryId.value, { ...storyForm });
      toast.push('Cerita diperbarui.', 'success');
    } else {
      await adminApi.createStory({ ...storyForm });
      toast.push('Cerita cinta ditambahkan.', 'success');
    }
    resetStoryForm();
    stories.value = await adminApi.getStories();
  } catch (err) {
    toast.push(extractApiError(err, 'Gagal menyimpan cerita'), 'error');
  }
}

async function removeStory(id: string) {
  try {
    await adminApi.deleteStory(id);
    stories.value = stories.value.filter((s) => s.id !== id);
    toast.push('Cerita dihapus.', 'info');
  } catch (err) {
    toast.push(extractApiError(err, 'Gagal menghapus cerita'), 'error');
  }
}

onMounted(loadAll);
</script>

<template>
  <div class="space-y-6">
    <div class="inline-flex border border-stone-200 bg-white p-1">
      <button
        type="button"
        :class="activeTab === 'events' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:text-stone-900'"
        class="px-4 py-2 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
        @click="activeTab = 'events'"
      >
        Jadwal Acara ({{ events.length }})
      </button>
      <button
        type="button"
        :class="activeTab === 'stories' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:text-stone-900'"
        class="px-4 py-2 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
        @click="activeTab = 'stories'"
      >
        Kisah Cinta ({{ stories.length }})
      </button>
    </div>

    <div v-if="loading" class="flex items-center gap-3 py-12 text-sm text-stone-500">
      <Loader2 class="h-5 w-5 animate-spin" />
      <span>Memuat data...</span>
    </div>

    <!-- EVENTS TAB -->
    <div v-else-if="activeTab === 'events'" class="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <form class="space-y-4 border border-stone-200 bg-white p-6 lg:col-span-5" @submit.prevent="saveEvent">
        <h2 class="font-display text-2xl font-medium text-stone-900">
          {{ editingEventId ? 'Edit Acara' : 'Tambah Acara Baru' }}
        </h2>
        <div>
          <label class="block text-xs font-medium uppercase text-stone-600">Nama Acara</label>
          <input v-model="eventForm.title" type="text" required placeholder="Akad Nikah" class="mt-1 w-full border border-stone-300 px-3 py-2 text-sm" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium uppercase text-stone-600">Kategori</label>
            <select v-model="eventForm.category" class="mt-1 w-full border border-stone-300 bg-white px-3 py-2 text-sm">
              <option value="CEREMONY">Prosesi / Akad</option>
              <option value="RECEPTION">Resepsi</option>
              <option value="OTHER">Lainnya</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium uppercase text-stone-600">Tanggal</label>
            <input v-model="eventForm.eventDate" type="date" required class="mt-1 w-full border border-stone-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-medium uppercase text-stone-600">Mulai</label>
            <input v-model="eventForm.startTime" type="text" required class="mt-1 w-full border border-stone-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-medium uppercase text-stone-600">Selesai</label>
            <input v-model="eventForm.endTime" type="text" class="mt-1 w-full border border-stone-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-medium uppercase text-stone-600">Zona</label>
            <input v-model="eventForm.timezone" type="text" class="mt-1 w-full border border-stone-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium uppercase text-stone-600">Nama Venue</label>
          <input v-model="eventForm.venueName" type="text" required class="mt-1 w-full border border-stone-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-xs font-medium uppercase text-stone-600">Alamat Lengkap</label>
          <textarea v-model="eventForm.venueAddress" rows="2" required class="mt-1 w-full border border-stone-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-xs font-medium uppercase text-stone-600">Google Maps URL</label>
          <input v-model="eventForm.mapsUrl" type="url" class="mt-1 w-full border border-stone-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-xs font-medium uppercase text-stone-600">Dress Code</label>
          <input v-model="eventForm.dressCode" type="text" class="mt-1 w-full border border-stone-300 px-3 py-2 text-sm" />
        </div>
        <div class="flex gap-2 pt-2">
          <button type="submit" class="inline-flex min-h-[40px] items-center gap-1.5 bg-stone-900 px-5 py-2 text-xs font-medium uppercase text-white hover:bg-stone-800 cursor-pointer">
            <Plus class="h-3.5 w-3.5" />
            <span>{{ editingEventId ? 'Perbarui Acara' : 'Tambah Acara' }}</span>
          </button>
          <button v-if="editingEventId" type="button" class="border border-stone-300 px-4 py-2 text-xs text-stone-700 hover:bg-stone-100 cursor-pointer" @click="resetEventForm">
            Batal
          </button>
        </div>
      </form>

      <div class="space-y-4 lg:col-span-7">
        <div v-if="events.length === 0" class="border border-stone-200 bg-white p-8 text-center text-sm text-stone-500">
          Belum ada acara yang ditambahkan.
        </div>
        <article
          v-for="evt in events"
          :key="evt.id"
          class="flex flex-col justify-between gap-4 border border-stone-200 bg-white p-6 sm:flex-row"
        >
          <div>
            <p class="text-xs uppercase tracking-widest text-stone-500">
              {{ evt.eventDate }} · {{ evt.startTime }}{{ evt.endTime ? ` – ${evt.endTime}` : '' }} {{ evt.timezone }}
            </p>
            <h3 class="font-display mt-1 text-2xl font-medium text-stone-900">{{ evt.title }}</h3>
            <p class="mt-1 text-sm font-medium text-stone-700">{{ evt.venueName }}</p>
            <p class="mt-0.5 text-xs text-stone-500">{{ evt.venueAddress }}</p>
          </div>
          <div class="flex shrink-0 items-start gap-2">
            <button type="button" class="border border-stone-300 p-2 text-stone-700 hover:bg-stone-100 cursor-pointer" aria-label="Edit acara" @click="startEditEvent(evt)">
              <Pencil class="h-4 w-4" />
            </button>
            <button type="button" class="border border-red-200 p-2 text-red-700 hover:bg-red-50 cursor-pointer" aria-label="Hapus acara" @click="removeEvent(evt.id)">
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </article>
      </div>
    </div>

    <!-- STORIES TAB -->
    <div v-else class="grid grid-cols-1 gap-6 lg:grid-cols-12">
      <form class="space-y-4 border border-stone-200 bg-white p-6 lg:col-span-5" @submit.prevent="saveStory">
        <h2 class="font-display text-2xl font-medium text-stone-900">
          {{ editingStoryId ? 'Edit Bab Cerita' : 'Tambah Cerita Cinta' }}
        </h2>
        <div>
          <label class="block text-xs font-medium uppercase text-stone-600">Judul Bab</label>
          <input v-model="storyForm.title" type="text" required class="mt-1 w-full border border-stone-300 px-3 py-2 text-sm" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium uppercase text-stone-600">Label Periode</label>
            <input v-model="storyForm.periodLabel" type="text" required placeholder="Bab 01" class="mt-1 w-full border border-stone-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-medium uppercase text-stone-600">Waktu</label>
            <input v-model="storyForm.storyDate" type="text" placeholder="Oktober 2022" class="mt-1 w-full border border-stone-300 px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium uppercase text-stone-600">URL Gambar (Opsional)</label>
          <input v-model="storyForm.imageUrl" type="text" class="mt-1 w-full border border-stone-300 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="block text-xs font-medium uppercase text-stone-600">Narasi Cerita</label>
          <textarea v-model="storyForm.description" rows="4" required class="mt-1 w-full border border-stone-300 px-3 py-2 text-sm" />
        </div>
        <div class="flex gap-2 pt-2">
          <button type="submit" class="inline-flex min-h-[40px] items-center gap-1.5 bg-stone-900 px-5 py-2 text-xs font-medium uppercase text-white hover:bg-stone-800 cursor-pointer">
            <Plus class="h-3.5 w-3.5" />
            <span>{{ editingStoryId ? 'Perbarui Cerita' : 'Tambah Cerita' }}</span>
          </button>
          <button v-if="editingStoryId" type="button" class="border border-stone-300 px-4 py-2 text-xs text-stone-700 hover:bg-stone-100 cursor-pointer" @click="resetStoryForm">
            Batal
          </button>
        </div>
      </form>

      <div class="space-y-4 lg:col-span-7">
        <div v-if="stories.length === 0" class="border border-stone-200 bg-white p-8 text-center text-sm text-stone-500">
          Belum ada cerita cinta yang ditambahkan.
        </div>
        <article
          v-for="story in stories"
          :key="story.id"
          class="flex flex-col justify-between gap-4 border border-stone-200 bg-white p-6 sm:flex-row"
        >
          <div>
            <p class="text-xs uppercase tracking-widest text-stone-500">
              {{ story.periodLabel }}{{ story.storyDate ? ` · ${story.storyDate}` : '' }}
            </p>
            <h3 class="font-display mt-1 text-2xl font-medium text-stone-900">{{ story.title }}</h3>
            <p class="mt-2 text-sm leading-relaxed text-stone-600">{{ story.description }}</p>
          </div>
          <div class="flex shrink-0 items-start gap-2">
            <button type="button" class="border border-stone-300 p-2 text-stone-700 hover:bg-stone-100 cursor-pointer" aria-label="Edit cerita" @click="startEditStory(story)">
              <Pencil class="h-4 w-4" />
            </button>
            <button type="button" class="border border-red-200 p-2 text-red-700 hover:bg-red-50 cursor-pointer" aria-label="Hapus cerita" @click="removeStory(story.id)">
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>
