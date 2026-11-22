import crypto from 'node:crypto';
import { encryptValue, generateSecureToken, hashPassword, sha256 } from '../common/crypto.ts';
import { env } from '../config/env.ts';
import { getDb, nowIso, withTransaction } from './client.ts';

export async function seedDatabase(): Promise<void> {
  const db = getDb();
  const timestamp = nowIso();

  // Optional environment-configured admin seeding (overrides or creates single active admin)
  if (env.adminEmail && env.adminPassword) {
    const existingByEmail = db
      .prepare('SELECT id FROM admins WHERE email = ?')
      .get(env.adminEmail.toLowerCase()) as { id: string } | undefined;

    const passwordHash = await hashPassword(env.adminPassword);
    if (existingByEmail) {
      db.prepare('UPDATE admins SET password_hash = ?, is_active = 1, updated_at = ? WHERE id = ?').run(
        passwordHash,
        timestamp,
        existingByEmail.id
      );
    } else {
      const anyAdmin = db.prepare('SELECT id FROM admins LIMIT 1').get() as { id: string } | undefined;
      if (anyAdmin) {
        db.prepare(
          'UPDATE admins SET email = ?, password_hash = ?, is_active = 1, updated_at = ? WHERE id = ?'
        ).run(env.adminEmail.toLowerCase(), passwordHash, timestamp, anyAdmin.id);
      } else {
        db.prepare(
          'INSERT INTO admins (id, email, name, password_hash, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)'
        ).run(crypto.randomUUID(), env.adminEmail.toLowerCase(), 'Wedding Administrator', passwordHash, timestamp, timestamp);
      }
    }
  }

  // Seed templates idempotently
  const templateCount = (db.prepare('SELECT COUNT(*) as count FROM templates').get() as { count: number }).count;
  const templates = [
    {
      id: 'tpl-classic-elegant',
      key: 'classic-elegant',
      name: 'Classic Elegant',
      description:
        'Komposisi editorial bernuansa ivory hangat dan aksen emas antik, tipografi serif klasik, serta tata letak simetris yang abadi.',
      preview_image_url: '/src/assets/images/wedding_hero_editorial_1795325195483.jpg',
      accent_color: '#9A7B4F',
      sort_order: 1,
    },
    {
      id: 'tpl-botanical-green',
      key: 'botanical-green',
      name: 'Botanical Green',
      description:
        'Nuansa konservatori taman hijau sage dan krem lembut dengan ilustrasi dedaunan organik serta ritme cerita yang intim.',
      preview_image_url: '/src/assets/images/gallery_ceremony_floral_1795325195546.jpg',
      accent_color: '#4F6352',
      sort_order: 2,
    },
    {
      id: 'tpl-modern-minimalist',
      key: 'modern-minimalist',
      name: 'Modern Minimalist',
      description:
        'Estetika galeri Swiss kontemporer dengan ruang negatif luas, garis pembatas tipis, dan kontras tinta arang yang bersih.',
      preview_image_url: '/src/assets/images/gallery_reception_table_1795325195798.jpg',
      accent_color: '#292524',
      sort_order: 3,
    },
  ];

  if (templateCount === 0) {
    const insertTemplate = db.prepare(`
      INSERT INTO templates (id, key, name, description, preview_image_url, accent_color, is_active, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
    `);
    for (const tpl of templates) {
      insertTemplate.run(
        tpl.id,
        tpl.key,
        tpl.name,
        tpl.description,
        tpl.preview_image_url,
        tpl.accent_color,
        tpl.sort_order,
        timestamp,
        timestamp
      );
    }
  }

  const existingInvitation = db.prepare('SELECT id FROM invitations LIMIT 1').get() as { id: string } | undefined;
  if (existingInvitation) {
    return;
  }

  withTransaction((tx) => {
    const invitationId = crypto.randomUUID();
    const primaryDate = '2027-06-12';
    const countdownTarget = '2027-06-12T09:00:00+07:00';

    tx.prepare(`
      INSERT INTO invitations (
        id, title, slug, template_id, is_published, hero_subtitle, hero_image_url,
        opening_quote, opening_quote_author, seo_title, seo_description, og_image_url,
        music_url, music_title, is_music_enabled, primary_date, countdown_target, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
    `).run(
      invitationId,
      'The Wedding of Andi & Siti',
      'andi-siti',
      'tpl-classic-elegant',
      'Dengan memohon rahmat dan ridho Tuhan Yang Maha Esa, kami mengundang Anda untuk menghadiri hari bahagia kami.',
      '/src/assets/images/wedding_hero_editorial_1795325195483.jpg',
      'Dan di antara tanda-tanda kekuasaan-Nya ialah Dia menciptakan untukmu pasangan hidup dari jenismu sendiri, supaya kamu merasa tenteram kepadanya.',
      'QS. Ar-Rum : 21',
      'Undangan Pernikahan Andi Pratama & Siti Rahmawati',
      'Bergabunglah dalam perayaan sakral pernikahan Andi Pratama & Siti Rahmawati pada 12 Juni 2027 di Jakarta Selatan.',
      '/src/assets/images/wedding_hero_editorial_1795325195483.jpg',
      '',
      'Clair de Lune — Acoustic Strings',
      primaryDate,
      countdownTarget,
      timestamp,
      timestamp
    );

    tx.prepare(`
      INSERT INTO couples (
        id, invitation_id,
        groom_full_name, groom_nick_name, groom_parents, groom_bio, groom_instagram, groom_photo_url,
        bride_full_name, bride_nick_name, bride_parents, bride_bio, bride_instagram, bride_photo_url,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      invitationId,
      'Andi Pratama Wijaya, S.T.',
      'Andi',
      'Putra pertama dari Bapak Hendra Wijaya & Ibu Ratna Kusuma',
      'Arsitek lanskap yang mencintai kopi pagi, fotografi analog, dan perjalanan panjang menuju rumah.',
      '@andipratama',
      '/src/assets/images/groom_portrait_editorial_1795325196311.jpg',
      'Siti Rahmawati Putri, M.Ds.',
      'Siti',
      'Putri kedua dari Bapak Ahmad Fauzi & Ibu Nurhayati',
      'Desainer editorial yang menemukan keindahan dalam detail kecil, bunga taman, dan percakapan hangat.',
      '@sitirahmawati',
      '/src/assets/images/bride_portrait_editorial_1795325196020.jpg',
      timestamp,
      timestamp
    );

    const insertEvent = tx.prepare(`
      INSERT INTO events (
        id, invitation_id, title, category, event_date, start_time, end_time, timezone,
        venue_name, venue_address, maps_url, maps_embed_url, dress_code, description, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertEvent.run(
      crypto.randomUUID(),
      invitationId,
      'Akad Nikah',
      'CEREMONY',
      '2027-06-12',
      '09:00',
      '11:00',
      'WIB',
      'Glasshouse Conservatory — Plataran Kinandari',
      'Jl. Durian No. 26, Jagakarsa, Jakarta Selatan 12620',
      'https://maps.google.com/?q=Plataran+Kinandari+Jakarta+Selatan',
      'https://maps.google.com/maps?q=Plataran%20Kinandari%20Jakarta&t=&z=14&ie=UTF8&iwloc=&output=embed',
      'Ivory, Cream & Sage Formal Attire',
      'Prosesi ijab kabul khidmat yang dihadiri oleh keluarga inti dan sahabat terdekat.',
      1,
      timestamp,
      timestamp
    );

    insertEvent.run(
      crypto.randomUUID(),
      invitationId,
      'Resepsi Pernikahan',
      'RECEPTION',
      '2027-06-12',
      '18:30',
      '21:30',
      'WIB',
      'Garden Courtyard — Plataran Kinandari',
      'Jl. Durian No. 26, Jagakarsa, Jakarta Selatan 12620',
      'https://maps.google.com/?q=Plataran+Kinandari+Jakarta+Selatan',
      'https://maps.google.com/maps?q=Plataran%20Kinandari%20Jakarta&t=&z=14&ie=UTF8&iwloc=&output=embed',
      'Warm Earth Tone / Cocktail Formal',
      'Jamuan makan malam di taman terbuka di bawah cahaya lentera senja bersama seluruh kerabat.',
      2,
      timestamp,
      timestamp
    );

    const insertStory = tx.prepare(`
      INSERT INTO love_stories (
        id, invitation_id, title, period_label, story_date, description, image_url, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStory.run(
      crypto.randomUUID(),
      invitationId,
      'Pertemuan Pertama di Pameran Seni',
      'Bab 01',
      'Oktober 2022',
      'Kami bertemu tanpa sengaja di sebuah ruang pameran arsitektur dan tipografi di Jakarta Pusat. Percakapan singkat mengenai buku desain berujung pada secangkir teh sore yang tak terlupakan.',
      '/src/assets/images/gallery_rings_details_1795325196520.jpg',
      1,
      timestamp,
      timestamp
    );

    insertStory.run(
      crypto.randomUUID(),
      invitationId,
      'Melangkah Bersama',
      'Bab 02',
      'Agustus 2024',
      'Dua tahun penuh perjalanan, proyek kolaborasi, dan doa-doa yang saling menguatkan meyakinkan kami bahwa rumah bukanlah tempat, melainkan seseorang.',
      '/src/assets/images/gallery_ceremony_floral_1795325195546.jpg',
      2,
      timestamp,
      timestamp
    );

    insertStory.run(
      crypto.randomUUID(),
      invitationId,
      'Komitmen Menuju Pelaminan',
      'Bab 03',
      'Desember 2026',
      'Di hadapan kedua keluarga besar, kami mengikat janji pertunangan dan bersiap memulai babak kehidupan baru yang penuh berkah bersama.',
      '/src/assets/images/gallery_reception_table_1795325195798.jpg',
      3,
      timestamp,
      timestamp
    );

    const insertGallery = tx.prepare(`
      INSERT INTO galleries (
        id, invitation_id, title, caption, image_url, storage_key, mime_type, file_size, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'image/jpeg', 0, ?, ?, ?)
    `);

    const galleryItems = [
      {
        title: 'Golden Hour Walk',
        caption: 'Langkah awal menuju hari penuh syukur',
        image_url: '/src/assets/images/wedding_hero_editorial_1795325195483.jpg',
      },
      {
        title: 'Potret Mempelai Wanita',
        caption: 'Dalam balutan sutra gading dan mawar putih',
        image_url: '/src/assets/images/bride_portrait_editorial_1795325196020.jpg',
      },
      {
        title: 'Potret Mempelai Pria',
        caption: 'Menanti momen sakral dengan penuh ketenangan',
        image_url: '/src/assets/images/groom_portrait_editorial_1795325196311.jpg',
      },
      {
        title: 'Konservatori Akad',
        caption: 'Ruang kaca bercahaya tempat janji suci diucapkan',
        image_url: '/src/assets/images/gallery_ceremony_floral_1795325195546.jpg',
      },
      {
        title: 'Cincin & Detail Undangan',
        caption: 'Simbol ikatan abadi di atas kertas katun buatan tangan',
        image_url: '/src/assets/images/gallery_rings_details_1795325196520.jpg',
      },
      {
        title: 'Jamuan Taman Senja',
        caption: 'Meja perayaan hangat bersama sahabat dan keluarga',
        image_url: '/src/assets/images/gallery_reception_table_1795325195798.jpg',
      },
    ];

    galleryItems.forEach((item, index) => {
      insertGallery.run(
        crypto.randomUUID(),
        invitationId,
        item.title,
        item.caption,
        item.image_url,
        '',
        index + 1,
        timestamp,
        timestamp
      );
    });

    const insertGuest = tx.prepare(`
      INSERT INTO guests (
        id, invitation_id, full_name, phone, email, group_name, max_guests, token_hash, token_encrypted, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const sampleGuests = [
      { fullName: 'Bapak Budi Santoso & Keluarga', phone: '6281234567801', email: 'budi.santoso@example.com', group: 'Keluarga Besar', max: 4, status: 'ATTENDING', count: 3, msg: 'InsyaAllah hadir bersama keluarga.' },
      { fullName: 'Dr. Rina Kartika', phone: '6281234567802', email: 'rina.kartika@example.com', group: 'Rekan Kerja', max: 2, status: 'ATTENDING', count: 2, msg: 'Selamat menempuh hidup baru Andi & Siti!' },
      { fullName: 'Dimas & Nadia', phone: '6281234567803', email: 'dimas.nadia@example.com', group: 'Sahabat Kuliah', max: 2, status: 'PENDING', count: 2, msg: '' },
      { fullName: 'Ibu Dewi Lestari', phone: '6281234567804', email: 'dewi.lestari@example.com', group: 'VIP', max: 2, status: 'NOT_ATTENDING', count: 1, msg: 'Mohon maaf belum dapat hadir karena tugas di luar kota.' },
      { fullName: 'Fajar Ramadhan', phone: '6281234567805', email: 'fajar.r@example.com', group: 'Komunitas Desain', max: 2, status: 'PENDING', count: 1, msg: '' },
    ];

    const insertRsvp = tx.prepare(`
      INSERT INTO rsvps (
        id, invitation_id, guest_id, guest_name, guest_phone, attendance_status, guest_count, message, edit_token_hash, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const guestIds: string[] = [];
    for (const g of sampleGuests) {
      const gid = crypto.randomUUID();
      guestIds.push(gid);
      const rawToken = generateSecureToken(24);
      const tokenHash = sha256(rawToken);
      const tokenEncrypted = encryptValue(rawToken, env.sessionKey);

      insertGuest.run(
        gid,
        invitationId,
        g.fullName,
        g.phone,
        g.email,
        g.group,
        g.max,
        tokenHash,
        tokenEncrypted,
        '',
        timestamp,
        timestamp
      );

      if (g.status !== 'PENDING') {
        insertRsvp.run(
          crypto.randomUUID(),
          invitationId,
          gid,
          g.fullName,
          g.phone,
          g.status,
          g.count,
          g.msg,
          '',
          timestamp,
          timestamp
        );
      }
    }

    const insertWish = tx.prepare(`
      INSERT INTO wishes (
        id, invitation_id, guest_id, author_name, relation_label, message, status, moderated_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertWish.run(
      crypto.randomUUID(),
      invitationId,
      guestIds[0],
      'Bapak Budi Santoso',
      'Keluarga Besar',
      'Barakallahu lakuma wa baraka alaikuma. Semoga menjadi keluarga yang sakinah, mawaddah, warahmah hingga akhir hayat.',
      'APPROVED',
      timestamp,
      timestamp,
      timestamp
    );
    insertWish.run(
      crypto.randomUUID(),
      invitationId,
      guestIds[1],
      'Dr. Rina Kartika',
      'Rekan Studio',
      'Bahagia selalu Andi dan Siti! Semoga langkah baru ini selalu dipenuhi cinta, kesabaran, dan tawa hangat.',
      'APPROVED',
      timestamp,
      timestamp,
      timestamp
    );
    insertWish.run(
      crypto.randomUUID(),
      invitationId,
      guestIds[2],
      'Dimas & Nadia',
      'Sahabat Kuliah',
      'Selamat memulai lembaran baru bersama! Tak sabar merayakan hari bahagia kalian di taman nanti.',
      'PENDING',
      null,
      timestamp,
      timestamp
    );

    const insertGift = tx.prepare(`
      INSERT INTO gift_accounts (
        id, invitation_id, bank_name, account_number, account_holder, qr_image_url, notes, sort_order, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, '', ?, ?, 1, ?, ?)
    `);

    insertGift.run(
      crypto.randomUUID(),
      invitationId,
      'Bank Central Asia (BCA)',
      '5480912345',
      'Andi Pratama Wijaya',
      'Mohon sertakan nama Anda pada catatan transfer.',
      1,
      timestamp,
      timestamp
    );
    insertGift.run(
      crypto.randomUUID(),
      invitationId,
      'Bank Mandiri',
      '1270009876543',
      'Siti Rahmawati Putri',
      'Terima kasih atas doa restu dan tanda kasih Anda.',
      2,
      timestamp,
      timestamp
    );

    tx.prepare(`
      INSERT INTO site_settings (
        id, invitation_id, rsvp_enabled, rsvp_deadline, wishes_enabled, wishes_auto_approve,
        gifts_enabled, music_enabled, gallery_enabled, love_story_enabled, whatsapp_template, footer_text, created_at, updated_at
      ) VALUES (?, ?, 1, ?, 1, 0, 1, 1, 1, 1, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      invitationId,
      '2027-06-01',
      'Kepada Yth. {{guest_name}},\n\nDengan penuh rasa syukur, kami mengundang Anda untuk menghadiri pernikahan {{couple_names}}.\n\nBuka undangan personal Anda di:\n{{invite_url}}\n\nMerupakan kehormatan bagi kami apabila Anda berkenan hadir dan memberikan doa restu.',
      'Dibuat dengan cinta untuk pernikahan Andi & Siti · Jakarta, 12 Juni 2027',
      timestamp,
      timestamp
    );
  });
}
