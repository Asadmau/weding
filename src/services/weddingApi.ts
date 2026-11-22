import { api } from '@/services/api';
import type {
  AdminDashboardDto,
  AdminWishDto,
  CoupleDto,
  GalleryItemDto,
  GiftAccountDto,
  GuestRecordDto,
  InvitationDto,
  LoveStoryDto,
  PaginationMeta,
  PersonalizedGuestContext,
  PublicInvitationBundle,
  RsvpListResponse,
  SiteSettingsDto,
  TemplateDto,
  WeddingEventDto,
} from '@/types/wedding';

export const publicApi = {
  async getTemplates(): Promise<TemplateDto[]> {
    const res = await api.get<{ data: TemplateDto[] }>('/templates');
    return res.data.data;
  },
  async getDefaultInvitation(): Promise<PublicInvitationBundle> {
    const res = await api.get<{ data: PublicInvitationBundle }>('/invitations/default');
    return res.data.data;
  },
  async getInvitationBySlug(slug: string): Promise<PublicInvitationBundle> {
    const res = await api.get<{ data: PublicInvitationBundle }>(`/invitations/${encodeURIComponent(slug)}`);
    return res.data.data;
  },
  async resolveGuestToken(slug: string, token: string): Promise<PersonalizedGuestContext> {
    const res = await api.get<{ data: PersonalizedGuestContext }>(
      `/invitations/${encodeURIComponent(slug)}/guests/${encodeURIComponent(token)}`
    );
    return res.data.data;
  },
  async resolveGuestSlug(slug: string, guestSlug: string): Promise<PersonalizedGuestContext> {
    const res = await api.get<{ data: PersonalizedGuestContext }>(
      `/invitations/${encodeURIComponent(slug)}/guests/by-slug/${encodeURIComponent(guestSlug)}`
    );
    return res.data.data;
  },
  async submitRsvp(payload: {
    slug: string;
    guestToken?: string;
    guestSlug?: string;
    editToken?: string;
    guestName: string;
    guestPhone?: string;
    attendanceStatus: 'ATTENDING' | 'NOT_ATTENDING';
    guestCount: number;
    message?: string;
  }) {
    const res = await api.post<{
      data: {
        id: string;
        guestName: string;
        attendanceStatus: 'ATTENDING' | 'NOT_ATTENDING';
        guestCount: number;
        message: string;
        isPersonalized: boolean;
        editToken: string | null;
        updatedAt: string;
      };
    }>('/public/rsvp', payload);
    return res.data.data;
  },
  async submitWish(payload: {
    slug: string;
    guestToken?: string;
    guestSlug?: string;
    authorName: string;
    relationLabel?: string;
    message: string;
  }) {
    const res = await api.post<{
      data: {
        id: string;
        authorName: string;
        relationLabel: string;
        message: string;
        status: 'PENDING' | 'APPROVED' | 'REJECTED';
        createdAt: string;
      };
      message?: string;
    }>('/public/wishes', payload);
    return res.data;
  },
};

export const adminApi = {
  async getDashboard(): Promise<AdminDashboardDto> {
    const res = await api.get<{ data: AdminDashboardDto }>('/admin/dashboard');
    return res.data.data;
  },
  async getInvitationBundle(): Promise<{
    invitation: InvitationDto;
    couple: CoupleDto | null;
    activeTemplate: { id: string; key: string; name: string } | null;
  }> {
    const res = await api.get('/admin/invitation');
    return res.data.data;
  },
  async updateInvitation(payload: Omit<InvitationDto, 'id' | 'updatedAt'>): Promise<InvitationDto> {
    const res = await api.put<{ data: InvitationDto }>('/admin/invitation', payload);
    return res.data.data;
  },
  async updateCouple(payload: Omit<CoupleDto, 'id' | 'invitationId'>): Promise<CoupleDto> {
    const res = await api.put<{ data: CoupleDto }>('/admin/couple', payload);
    return res.data.data;
  },
  async uploadCouplePhoto(role: 'groom' | 'bride', file: File): Promise<CoupleDto> {
    const form = new FormData();
    form.append('image', file);
    const res = await api.post<{ data: CoupleDto }>(`/admin/couple/photo/${role}`, form);
    return res.data.data;
  },
  async uploadImage(file: File): Promise<{ publicUrl: string }> {
    const form = new FormData();
    form.append('image', file);
    const res = await api.post<{ data: { publicUrl: string } }>('/admin/upload', form);
    return res.data.data;
  },
  async getTemplates(): Promise<{ activeTemplateId: string; templates: TemplateDto[] }> {
    const res = await api.get('/admin/templates');
    return res.data.data;
  },
  async activateTemplate(templateId: string): Promise<TemplateDto> {
    const res = await api.put<{ data: TemplateDto }>('/admin/templates/active', { templateId });
    return res.data.data;
  },
  async getEvents(): Promise<WeddingEventDto[]> {
    const res = await api.get<{ data: WeddingEventDto[] }>('/admin/events');
    return res.data.data;
  },
  async createEvent(payload: Omit<WeddingEventDto, 'id'>): Promise<WeddingEventDto> {
    const res = await api.post<{ data: WeddingEventDto }>('/admin/events', payload);
    return res.data.data;
  },
  async updateEvent(id: string, payload: Omit<WeddingEventDto, 'id'>): Promise<WeddingEventDto> {
    const res = await api.put<{ data: WeddingEventDto }>(`/admin/events/${id}`, payload);
    return res.data.data;
  },
  async deleteEvent(id: string): Promise<void> {
    await api.delete(`/admin/events/${id}`);
  },
  async getStories(): Promise<LoveStoryDto[]> {
    const res = await api.get<{ data: LoveStoryDto[] }>('/admin/stories');
    return res.data.data;
  },
  async createStory(payload: Omit<LoveStoryDto, 'id'>): Promise<LoveStoryDto> {
    const res = await api.post<{ data: LoveStoryDto }>('/admin/stories', payload);
    return res.data.data;
  },
  async updateStory(id: string, payload: Omit<LoveStoryDto, 'id'>): Promise<LoveStoryDto> {
    const res = await api.put<{ data: LoveStoryDto }>(`/admin/stories/${id}`, payload);
    return res.data.data;
  },
  async deleteStory(id: string): Promise<void> {
    await api.delete(`/admin/stories/${id}`);
  },
  async getGalleries(): Promise<GalleryItemDto[]> {
    const res = await api.get<{ data: GalleryItemDto[] }>('/admin/gallery');
    return res.data.data;
  },
  async uploadGallery(form: FormData): Promise<GalleryItemDto> {
    const res = await api.post<{ data: GalleryItemDto }>('/admin/gallery', form);
    return res.data.data;
  },
  async deleteGallery(id: string): Promise<void> {
    await api.delete(`/admin/gallery/${id}`);
  },
  async getGuests(params: {
    page?: number;
    limit?: number;
    search?: string;
    rsvpStatus?: string;
  }): Promise<{ data: GuestRecordDto[]; meta: PaginationMeta }> {
    const res = await api.get<{ data: GuestRecordDto[]; meta: PaginationMeta }>('/admin/guests', {
      params,
    });
    return res.data;
  },
  async createGuest(payload: {
    fullName: string;
    phone?: string;
    email?: string;
    groupName?: string;
    maxGuests: number;
    notes?: string;
  }): Promise<GuestRecordDto> {
    const res = await api.post<{ data: GuestRecordDto }>('/admin/guests', payload);
    return res.data.data;
  },
  async updateGuest(
    id: string,
    payload: {
      fullName: string;
      phone?: string;
      email?: string;
      groupName?: string;
      maxGuests: number;
      notes?: string;
    }
  ): Promise<GuestRecordDto> {
    const res = await api.put<{ data: GuestRecordDto }>(`/admin/guests/${id}`, payload);
    return res.data.data;
  },
  async regenerateGuestToken(id: string): Promise<GuestRecordDto> {
    const res = await api.post<{ data: GuestRecordDto }>(`/admin/guests/${id}/regenerate-token`);
    return res.data.data;
  },
  async deleteGuest(id: string): Promise<void> {
    await api.delete(`/admin/guests/${id}`);
  },
  async getRsvps(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<RsvpListResponse> {
    const res = await api.get<{ data: RsvpListResponse }>('/admin/rsvps', { params });
    return res.data.data;
  },
  async getWishes(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
  }): Promise<{
    counts: { all: number; pending: number; approved: number; rejected: number };
    items: AdminWishDto[];
    meta: PaginationMeta;
  }> {
    const res = await api.get('/admin/wishes', { params });
    return res.data.data;
  },
  async approveWish(id: string): Promise<AdminWishDto> {
    const res = await api.patch<{ data: AdminWishDto }>(`/admin/wishes/${id}/approve`);
    return res.data.data;
  },
  async rejectWish(id: string): Promise<AdminWishDto> {
    const res = await api.patch<{ data: AdminWishDto }>(`/admin/wishes/${id}/reject`);
    return res.data.data;
  },
  async deleteWish(id: string): Promise<void> {
    await api.delete(`/admin/wishes/${id}`);
  },
  async getGifts(): Promise<GiftAccountDto[]> {
    const res = await api.get<{ data: GiftAccountDto[] }>('/admin/gifts');
    return res.data.data;
  },
  async createGift(payload: Omit<GiftAccountDto, 'id'>): Promise<GiftAccountDto> {
    const res = await api.post<{ data: GiftAccountDto }>('/admin/gifts', payload);
    return res.data.data;
  },
  async updateGift(id: string, payload: Omit<GiftAccountDto, 'id'>): Promise<GiftAccountDto> {
    const res = await api.put<{ data: GiftAccountDto }>(`/admin/gifts/${id}`, payload);
    return res.data.data;
  },
  async deleteGift(id: string): Promise<void> {
    await api.delete(`/admin/gifts/${id}`);
  },
  async getSettings(): Promise<SiteSettingsDto> {
    const res = await api.get<{ data: SiteSettingsDto }>('/admin/settings');
    return res.data.data;
  },
  async updateSettings(payload: Omit<SiteSettingsDto, 'id' | 'invitationId'>): Promise<SiteSettingsDto> {
    const res = await api.put<{ data: SiteSettingsDto }>('/admin/settings', payload);
    return res.data.data;
  },
};
