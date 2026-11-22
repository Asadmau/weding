export type TemplateKey = 'classic-elegant' | 'botanical-green' | 'modern-minimalist';

export interface TemplateDto {
  id: string;
  key: TemplateKey | string;
  name: string;
  description: string;
  previewImageUrl: string;
  accentColor: string;
  isActive: boolean;
  sortOrder: number;
}

export interface InvitationDto {
  id: string;
  title: string;
  slug: string;
  templateId: string;
  isPublished: boolean;
  heroSubtitle: string;
  heroImageUrl: string;
  openingQuote: string;
  openingQuoteAuthor: string;
  seoTitle: string;
  seoDescription: string;
  ogImageUrl: string;
  musicUrl: string;
  musicTitle: string;
  isMusicEnabled: boolean;
  primaryDate: string;
  countdownTarget: string;
  updatedAt?: string;
}

export interface CoupleDto {
  id: string;
  invitationId: string;
  groomFullName: string;
  groomNickName: string;
  groomParents: string;
  groomBio: string;
  groomInstagram: string;
  groomPhotoUrl: string;
  brideFullName: string;
  brideNickName: string;
  brideParents: string;
  brideBio: string;
  brideInstagram: string;
  bridePhotoUrl: string;
}

export interface WeddingEventDto {
  id: string;
  title: string;
  category: 'CEREMONY' | 'RECEPTION' | 'OTHER' | string;
  eventDate: string;
  startTime: string;
  endTime: string;
  timezone: string;
  venueName: string;
  venueAddress: string;
  mapsUrl: string;
  mapsEmbedUrl: string;
  dressCode: string;
  description: string;
  sortOrder?: number;
}

export interface LoveStoryDto {
  id: string;
  title: string;
  periodLabel: string;
  storyDate: string;
  description: string;
  imageUrl: string;
  sortOrder?: number;
}

export interface GalleryItemDto {
  id: string;
  title: string;
  caption: string;
  imageUrl: string;
  mimeType?: string;
  fileSize?: number;
  sortOrder?: number;
  createdAt?: string;
}

export interface PublicWishDto {
  id: string;
  authorName: string;
  relationLabel: string;
  message: string;
  createdAt: string;
}

export interface GiftAccountDto {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  qrImageUrl: string;
  notes: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface PublicSiteSettingsDto {
  rsvpEnabled: boolean;
  rsvpDeadline: string;
  wishesEnabled: boolean;
  giftsEnabled: boolean;
  musicEnabled: boolean;
  galleryEnabled: boolean;
  loveStoryEnabled: boolean;
  footerText: string;
}

export interface SiteSettingsDto extends PublicSiteSettingsDto {
  id: string;
  invitationId: string;
  wishesAutoApprove: boolean;
  whatsappTemplate: string;
}

export interface PublicInvitationBundle {
  invitation: InvitationDto;
  template: {
    id: string;
    key: TemplateKey | string;
    name: string;
    accentColor: string;
  };
  couple: CoupleDto | null;
  events: WeddingEventDto[];
  stories: LoveStoryDto[];
  galleries: GalleryItemDto[];
  wishes: PublicWishDto[];
  giftAccounts: GiftAccountDto[];
  settings: PublicSiteSettingsDto;
}

export interface PersonalizedGuestContext {
  guest: {
    id: string;
    fullName: string;
    groupName: string;
    maxGuests: number;
  };
  rsvp: {
    id: string;
    attendanceStatus: 'ATTENDING' | 'NOT_ATTENDING' | 'PENDING';
    guestCount: number;
    message: string;
    updatedAt: string;
  } | null;
}

export interface GuestRecordDto {
  id: string;
  guestSlug: string;
  invitationId: string;
  fullName: string;
  phone: string;
  email: string;
  groupName: string;
  maxGuests: number;
  notes: string;
  rsvpStatus: 'ATTENDING' | 'NOT_ATTENDING' | 'PENDING';
  rsvpGuestCount: number | null;
  personalizedPath: string | null;
  hasActiveLink: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminWishDto {
  id: string;
  invitationId: string;
  guestId: string | null;
  authorName: string;
  relationLabel: string;
  message: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  moderatedAt: string | null;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface RsvpListResponse {
  summary: {
    totalResponses: number;
    attendingCount: number;
    notAttendingCount: number;
    pendingGuestCount: number;
    totalHeadcount: number;
  };
  items: Array<{
    id: string;
    guestId: string | null;
    guestName: string;
    guestPhone: string;
    groupName: string;
    attendanceStatus: 'ATTENDING' | 'NOT_ATTENDING' | 'PENDING';
    guestCount: number;
    message: string;
    updatedAt: string;
  }>;
  meta: PaginationMeta;
}

export interface AdminDashboardDto {
  invitation: {
    id: string;
    title: string;
    slug: string;
    isPublished: boolean;
    primaryDate: string;
    templateKey: string;
    templateName: string;
  };
  metrics: {
    totalGuests: number;
    totalRsvps: number;
    attendingCount: number;
    notAttendingCount: number;
    pendingGuestRsvps: number;
    totalHeadcount: number;
    totalWishes: number;
    pendingWishes: number;
    approvedWishes: number;
    galleryCount: number;
    eventsCount: number;
  };
  recentRsvps: Array<{
    id: string;
    guestName: string;
    attendanceStatus: string;
    guestCount: number;
    updatedAt: string;
  }>;
  recentWishes: Array<{
    id: string;
    authorName: string;
    message: string;
    status: string;
    createdAt: string;
  }>;
}
