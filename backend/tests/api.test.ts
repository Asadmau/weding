import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

describe('Wedding Invitation Backend Integration Tests', () => {
  let tmpDir: string;
  let app: ReturnType<typeof import('../src/app.ts').createApiApp>;
  let agent: ReturnType<typeof request.agent>;
  let csrfToken = '';
  let guestSlug = '';
  let createdGuestId = '';
  let createdWishId = '';

  beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wedding-test-'));
    process.env.NODE_ENV = 'test';
    process.env.DB_PATH = path.join(tmpDir, 'test.db');
    process.env.UPLOAD_DIR = path.join(tmpDir, 'uploads');
    process.env.ADMIN_EMAIL = '';
    process.env.ADMIN_PASSWORD = '';

    const { initializeSchema } = await import('../src/db/schema.ts');
    const { seedDatabase } = await import('../src/db/seed.ts');
    const { createApiApp } = await import('../src/app.ts');

    initializeSchema();
    await seedDatabase();
    app = createApiApp();
    agent = request.agent(app);
  });

  afterAll(async () => {
    const { resetDbInstance } = await import('../src/db/client.ts');
    resetDbInstance();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('GET /api/v1/health returns ok', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
  });

  it('GET /api/v1/templates returns 3 seeded wedding templates', async () => {
    const res = await request(app).get('/api/v1/templates');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(3);
    const keys = res.body.data.map((t: { key: string }) => t.key);
    expect(keys).toEqual(['classic-elegant', 'botanical-green', 'modern-minimalist']);
  });

  it('GET /api/v1/invitations/andi-siti returns seeded public invitation without private guest list', async () => {
    const res = await request(app).get('/api/v1/invitations/andi-siti');
    expect(res.status).toBe(200);
    expect(res.body.data.invitation.slug).toBe('andi-siti');
    expect(res.body.data.couple.groomNickName).toBe('Andi');
    expect(res.body.data.events.length).toBe(2);
    expect(res.body.data.wishes.every((w: { authorName: string }) => w.authorName !== 'Dimas & Nadia')).toBe(
      true
    );
  });

  it('requires authentication on admin endpoints and supports one-time setup + login + CSRF protection', async () => {
    const unauth = await request(app).get('/api/v1/admin/dashboard');
    expect(unauth.status).toBe(401);

    const statusBefore = await request(app).get('/api/v1/auth/status');
    expect(statusBefore.body.data.needsSetup).toBe(true);

    const setupRes = await agent.post('/api/v1/auth/setup').send({
      name: 'Admin Pengantin',
      email: 'admin@wedding.test',
      password: 'StrongPassword123!',
    });
    expect(setupRes.status).toBe(201);
    csrfToken = setupRes.body.data.csrfToken;
    expect(csrfToken).toBeTruthy();

    // Second setup attempt must be blocked
    const secondSetup = await request(app).post('/api/v1/auth/setup').send({
      name: 'Hacker',
      email: 'hacker@wedding.test',
      password: 'StrongPassword123!',
    });
    expect(secondSetup.status).toBe(409);

    // State-changing request without CSRF token must fail
    const noCsrf = await agent.post('/api/v1/admin/events').send({
      title: 'Test Event',
      category: 'CEREMONY',
      eventDate: '2027-06-12',
      startTime: '10:00',
      venueName: 'Hall',
      venueAddress: 'Jl. Merdeka 10 Jakarta',
    });
    expect(noCsrf.status).toBe(403);

    // Logout and login again
    const logoutRes = await agent.post('/api/v1/auth/logout');
    expect(logoutRes.status).toBe(200);

    const loginRes = await agent.post('/api/v1/auth/login').send({
      email: 'admin@wedding.test',
      password: 'StrongPassword123!',
    });
    expect(loginRes.status).toBe(200);
    csrfToken = loginRes.body.data.csrfToken;

    const meRes = await agent.get('/api/v1/auth/me');
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.admin.email).toBe('admin@wedding.test');
  });

  it('creates a guest with secure token, validates personalized link, and handles RSVP', async () => {
    const createGuest = await agent
      .post('/api/v1/admin/guests')
      .set('X-CSRF-Token', csrfToken)
      .send({
        fullName: 'Ibu Kartini Putri',
        phone: '628111222333',
        groupName: 'VIP',
        maxGuests: 2,
      });

    expect(createGuest.status).toBe(201);
    createdGuestId = createGuest.body.data.id;
    const personalizedPath: string = createGuest.body.data.personalizedPath;
    expect(personalizedPath).toMatch(/^\/andi-siti\/ibu-kartini-putri-[a-f0-9]{16}$/);
    guestSlug = personalizedPath.split('/').at(-1) || '';

    // Valid guest slug resolves the personalized invitation.
    const guestLookup = await request(app).get(
      `/api/v1/invitations/andi-siti/guests/by-slug/${guestSlug}`
    );
    expect(guestLookup.status).toBe(200);
    expect(guestLookup.body.data.guest.fullName).toBe('Ibu Kartini Putri');

    const duplicateNameGuest = await agent
      .post('/api/v1/admin/guests')
      .set('X-CSRF-Token', csrfToken)
      .send({
        fullName: 'Ibu Kartini Putri',
        phone: '628111222334',
        groupName: 'VIP',
        maxGuests: 1,
      });
    expect(duplicateNameGuest.status).toBe(201);
    expect(duplicateNameGuest.body.data.guestSlug).not.toBe(guestSlug);
    await agent
      .delete(`/api/v1/admin/guests/${duplicateNameGuest.body.data.id}`)
      .set('X-CSRF-Token', csrfToken);

    // Invalid guest slug returns 404 safely.
    const invalidLookup = await request(app).get(
      '/api/v1/invitations/andi-siti/guests/by-slug/not-a-real-guest'
    );
    expect(invalidLookup.status).toBe(404);

    // Exceeding maxGuests is rejected
    const tooMany = await request(app).post('/api/v1/public/rsvp').send({
      slug: 'andi-siti',
      guestSlug,
      guestName: 'Ibu Kartini Putri',
      attendanceStatus: 'ATTENDING',
      guestCount: 5,
    });
    expect(tooMany.status).toBe(400);

    // Personalized RSVP succeeds and updates on re-submit (1 active RSVP per guest)
    const rsvp1 = await request(app).post('/api/v1/public/rsvp').send({
      slug: 'andi-siti',
      guestSlug,
      guestName: 'Ibu Kartini Putri',
      attendanceStatus: 'ATTENDING',
      guestCount: 2,
      message: 'Sampai jumpa di hari bahagia!',
    });
    expect(rsvp1.status).toBe(201);

    const rsvp2 = await request(app).post('/api/v1/public/rsvp').send({
      slug: 'andi-siti',
      guestSlug,
      guestName: 'Ibu Kartini Putri',
      attendanceStatus: 'NOT_ATTENDING',
      guestCount: 1,
      message: 'Maaf berhalangan mendadak.',
    });
    expect(rsvp2.status).toBe(201);
    expect(rsvp2.body.data.id).toBe(rsvp1.body.data.id);
    expect(rsvp2.body.data.attendanceStatus).toBe('NOT_ATTENDING');
  });

  it('supports public RSVP with editToken and wish moderation workflow', async () => {
    const publicRsvp = await request(app).post('/api/v1/public/rsvp').send({
      slug: 'andi-siti',
      guestName: 'Tamu Publik',
      attendanceStatus: 'ATTENDING',
      guestCount: 1,
    });
    expect(publicRsvp.status).toBe(201);
    expect(publicRsvp.body.data.editToken).toBeTruthy();

    // Wish starts as PENDING
    const wishRes = await request(app).post('/api/v1/public/wishes').send({
      slug: 'andi-siti',
      authorName: 'Sahabat Lama',
      relationLabel: 'Teman SMA',
      message: 'Selamat berbahagia untuk kalian berdua!',
    });
    expect(wishRes.status).toBe(201);
    expect(wishRes.body.data.status).toBe('PENDING');
    createdWishId = wishRes.body.data.id;

    // Not visible publicly before approval
    const beforeApprove = await request(app).get('/api/v1/invitations/andi-siti');
    expect(beforeApprove.body.data.wishes.some((w: { id: string }) => w.id === createdWishId)).toBe(
      false
    );

    // Admin approves wish
    const approveRes = await agent
      .patch(`/api/v1/admin/wishes/${createdWishId}/approve`)
      .set('X-CSRF-Token', csrfToken);
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe('APPROVED');

    // Now visible publicly
    const afterApprove = await request(app).get('/api/v1/invitations/andi-siti');
    expect(afterApprove.body.data.wishes.some((w: { id: string }) => w.id === createdWishId)).toBe(
      true
    );
  });

  it('validates image magic bytes on gallery upload and exports RSVPs CSV safely', async () => {
    // Reject spoofed non-image file
    const badUpload = await agent
      .post('/api/v1/admin/gallery')
      .set('X-CSRF-Token', csrfToken)
      .field('title', 'Spoofed File')
      .attach('image', Buffer.from('not-an-image'), {
        filename: 'evil.png',
        contentType: 'image/png',
      });
    expect(badUpload.status).toBe(400);

    // Accept valid PNG magic header
    const validPng = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    ]);
    const goodUpload = await agent
      .post('/api/v1/admin/gallery')
      .set('X-CSRF-Token', csrfToken)
      .field('title', 'Test Photo')
      .field('caption', 'Valid PNG upload')
      .attach('image', validPng, {
        filename: 'photo.png',
        contentType: 'image/png',
      });
    expect(goodUpload.status).toBe(201);
    expect(goodUpload.body.data.imageUrl).toMatch(/^\/uploads\/[a-f0-9-]+\.png$/);

    const galleryId = goodUpload.body.data.id;
    const delGallery = await agent
      .delete(`/api/v1/admin/gallery/${galleryId}`)
      .set('X-CSRF-Token', csrfToken);
    expect(delGallery.status).toBe(200);

    const csvRes = await agent.get('/api/v1/admin/rsvps/export');
    expect(csvRes.status).toBe(200);
    expect(csvRes.headers['content-type']).toContain('text/csv');
    expect(csvRes.text).toContain('Ibu Kartini Putri');

    // Cleanup created guest
    const delGuest = await agent
      .delete(`/api/v1/admin/guests/${createdGuestId}`)
      .set('X-CSRF-Token', csrfToken);
    expect(delGuest.status).toBe(200);
  });
});
