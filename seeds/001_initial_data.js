/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */

const bcrypt = require('bcryptjs');

exports.seed = async function(knex) {
  console.log('🌱 Seeding complete EcoMarga database...');
  
  try {
    // ========================================
    // 1. CLEAR EXISTING DATA (in correct order to avoid FK constraints)
    // ========================================
    console.log('');
    console.log('📝 Default accounts:');
    console.log('   Admin: admin@ecomarga.com / admin123');
    console.log('   Moderator: moderator@ecomarga.com / admin123');
    if (process.env.NODE_ENV === 'development') {
      console.log('   Demo User: demo@ecomarga.com / demo123');
      console.log('   Test User 1: budi@example.com / demo123');
      console.log('   Test User 2: siti@example.com / demo123');
    }
    console.log('');
    
    // ========================================
    // 1. CLEAR EXISTING DATA (in correct order to avoid FK constraints)
    // ========================================
    console.log('🧹 Clearing existing data...');
    
    await knex('audit_logs').del();
    await knex('file_uploads').del();
    await knex('reviews').del();
    await knex('transactions').del();
    await knex('notifications').del();
    await knex('submissions').del();
    await knex('waste_types').del();
    await knex('settings').del();
    await knex('bank_sampah').del();
    await knex('users').del();
    
    // Reset auto-increment sequences
    const sequences = [
      'users_id_seq', 'bank_sampah_id_seq', 'submissions_id_seq', 
      'settings_id_seq', 'notifications_id_seq', 'transactions_id_seq',
      'reviews_id_seq', 'waste_types_id_seq', 'file_uploads_id_seq', 
      'audit_logs_id_seq'
    ];
    
    for (const seq of sequences) {
      await knex.raw(`ALTER SEQUENCE ${seq} RESTART WITH 1`);
    }
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
};

    // ========================================
    // 2. INSERT USERS
    // ========================================
    console.log('👤 Creating users...');
    
    const adminPassword = await bcrypt.hash('admin123', 12);
    const demoPassword = await bcrypt.hash('demo123', 12);
    
    await knex('users').insert([
      {
        id: 1,
        nama: 'Administrator',
        email: 'admin@ecomarga.com',
        password: adminPassword,
        phone: '+6281234567890',
        address: 'Kantor Pusat EcoMarga, Jl. Pemuda No. 1, Semarang, Jawa Tengah',
        role: 'admin',
        is_active: true,
        email_verified: true,
        ewallet_accounts: JSON.stringify({
          dana: '081234567890',
          ovo: '081234567890',
          gopay: '081234567890'
        }),
        join_date: '2024-01-01T00:00:00.000Z'
      },
      {
        id: 2,
        nama: 'Moderator EcoMarga',
        email: 'moderator@ecomarga.com',
        password: adminPassword,
        phone: '+6281234567891',
        address: 'Kantor Cabang EcoMarga, Jl. Gajah Mada No. 2, Semarang, Jawa Tengah',
        role: 'moderator',
        is_active: true,
        email_verified: true,
        ewallet_accounts: JSON.stringify({
          dana: '081234567891'
        }),
        join_date: '2024-01-01T00:00:00.000Z'
      }
    ]);

    // Demo users for development
    if (process.env.NODE_ENV === 'development') {
      await knex('users').insert([
        {
          id: 3,
          nama: 'Demo User',
          email: 'demo@ecomarga.com',
          password: demoPassword,
          phone: '+6281234567892',
          address: 'Jl. Demo No. 123, Semarang Tengah, Jawa Tengah',
          role: 'user',
          is_active: true,
          email_verified: true,
          ewallet_accounts: JSON.stringify({
            dana: '081234567892',
            ovo: '081234567892'
          }),
          join_date: '2024-01-02T00:00:00.000Z'
        },
        {
          id: 4,
          nama: 'Budi Santoso',
          email: 'budi@example.com',
          password: demoPassword,
          phone: '+6281234567893',
          address: 'Jl. Merdeka No. 45, Semarang Utara, Jawa Tengah',
          role: 'user',
          is_active: true,
          email_verified: true,
          ewallet_accounts: JSON.stringify({
            gopay: '081234567893'
          }),
          join_date: '2024-01-03T00:00:00.000Z'
        },
        {
          id: 5,
          nama: 'Siti Nurhaliza',
          email: 'siti@example.com',
          password: demoPassword,
          phone: '+6281234567894',
          address: 'Jl. Pahlawan No. 67, Semarang Selatan, Jawa Tengah',
          role: 'user',
          is_active: true,
          email_verified: false,
          ewallet_accounts: JSON.stringify({
            dana: '081234567894'
          }),
          join_date: '2024-01-04T00:00:00.000Z'
        }
      ]);
    }

    // ========================================
    // 3. INSERT BANK SAMPAH
    // ========================================
    console.log('🏪 Creating bank sampah...');
    
    await knex('bank_sampah').insert([
      {
        id: 1,
        nama: 'Bank Sampah Hijau Lestari',
        alamat: 'Jl. Pemuda No. 123, Semarang Tengah',
        kota: 'Semarang',
        provinsi: 'Jawa Tengah',
        phone: '+62243567890',
        email: 'hijaulestari@banksampah.com',
        koordinat: JSON.stringify({ 
          latitude: -6.9889, 
          longitude: 110.4203 
        }),
        jam_operasional: JSON.stringify({
          senin_jumat: '08:00 - 16:00',
          sabtu: '08:00 - 12:00',
          minggu: 'Tutup'
        }),
        jenis_sampah_diterima: JSON.stringify([
          'Botol Plastik', 'Kardus', 'Kaleng Aluminium', 'Kertas'
        ]),
        rating: 4.5,
        total_reviews: 127,
        is_active: true,
        is_partner: true,
        foto: '/images/bank-sampah/bs1.jpg',
        deskripsi: 'Bank sampah pionir di Semarang dengan fasilitas lengkap dan pelayanan terbaik untuk pengelolaan sampah berkelanjutan.',
        bergabung_sejak: '2023-01-15T00:00:00.000Z'
      },
      {
        id: 2,
        nama: 'Bank Sampah Bersama Sejahtera',
        alamat: 'Jl. Gajah Mada No. 456, Semarang Barat',
        kota: 'Semarang',
        provinsi: 'Jawa Tengah',
        phone: '+62247654321',
        email: 'bersamasejahtera@banksampah.com',
        koordinat: JSON.stringify({ 
          latitude: -6.9667, 
          longitude: 110.4144 
        }),
        jam_operasional: JSON.stringify({
          senin_jumat: '07:30 - 15:30',
          sabtu: '07:30 - 11:30',
          minggu: 'Tutup'
        }),
        jenis_sampah_diterima: JSON.stringify([
          'Botol Plastik', 'Kaca', 'Besi', 'Plastik Campuran'
        ]),
        rating: 4.2,
        total_reviews: 89,
        is_active: true,
        is_partner: true,
        foto: '/images/bank-sampah/bs2.jpg',
        deskripsi: 'Spesialis pengolahan plastik dan kaca dengan teknologi modern dan ramah lingkungan.',
        bergabung_sejak: '2023-03-20T00:00:00.000Z'
      },
      {
        id: 3,
        nama: 'Bank Sampah Mandiri Sejahtera',
        alamat: 'Jl. Diponegoro No. 789, Semarang Selatan',
        kota: 'Semarang',
        provinsi: 'Jawa Tengah',
        phone: '+62249876543',
        email: 'admin@mandirisejahtera.com',
        koordinat: JSON.stringify({ 
          latitude: -7.0051, 
          longitude: 110.4381 
        }),
        jam_operasional: JSON.stringify({
          senin_jumat: '08:00 - 15:30',
          sabtu: '08:00 - 12:00',
          minggu: 'Tutup'
        }),
        jenis_sampah_diterima: JSON.stringify([
          'Kardus', 'Kertas', 'Kaca', 'Besi'
        ]),
        rating: 4.7,
        total_reviews: 203,
        is_active: true,
        is_partner: true,
        foto: '/images/bank-sampah/bs3.jpg',
        deskripsi: 'Bank sampah dengan fokus pada kertas dan logam berkualitas tinggi, melayani wilayah Semarang Selatan.',
        bergabung_sejak: '2023-04-10T00:00:00.000Z'
      },
      {
        id: 4,
        nama: 'Bank Sampah Bersih Indah',
        alamat: 'Jl. Ahmad Yani No. 321, Semarang Timur',
        kota: 'Semarang',
        provinsi: 'Jawa Tengah',
        phone: '+62241234567',
        email: 'bersihindah@banksampah.com',
        koordinat: JSON.stringify({ 
          latitude: -6.9833, 
          longitude: 110.4500 
        }),
        jam_operasional: JSON.stringify({
          senin_jumat: '08:30 - 16:30',
          sabtu: '08:30 - 13:00',
          minggu: 'Tutup'
        }),
        jenis_sampah_diterima: JSON.stringify([
          'Botol Plastik', 'Kardus', 'Kertas', 'Kaca', 'Plastik Campuran'
        ]),
        rating: 4.3,
        total_reviews: 156,
        is_active: true,
        is_partner: true,
        foto: '/images/bank-sampah/bs4.jpg',
        deskripsi: 'Bank sampah yang melayani wilayah Semarang Timur dengan layanan pickup door-to-door.',
        bergabung_sejak: '2023-06-01T00:00:00.000Z'
      }
    ]);

    // ========================================
    // 4. INSERT WASTE TYPES
    // ========================================
    console.log('♻️ Creating waste types...');
    
    await knex('waste_types').insert([
      {
        id: 1,
        name: 'Botol Plastik',
        category: 'Plastik',
        price_per_kg: 3000,
        description: 'Botol plastik bekas minuman (PET), harus dalam kondisi bersih',
        image: '/images/waste-types/botol-plastik.jpg',
        is_active: true
      },
      {
        id: 2,
        name: 'Kardus',
        category: 'Kertas',
        price_per_kg: 2000,
        description: 'Kardus bekas dalam kondisi kering dan tidak rusak',
        image: '/images/waste-types/kardus.jpg',
        is_active: true
      },
      {
        id: 3,
        name: 'Kaleng Aluminium',
        category: 'Logam',
        price_per_kg: 8000,
        description: 'Kaleng aluminium bekas minuman dan makanan',
        image: '/images/waste-types/kaleng-aluminium.jpg',
        is_active: true
      },
      {
        id: 4,
        name: 'Kertas',
        category: 'Kertas',
        price_per_kg: 1500,
        description: 'Kertas bekas (koran, majalah, kertas HVS)',
        image: '/images/waste-types/kertas.jpg',
        is_active: true
      },
      {
        id: 5,
        name: 'Besi',
        category: 'Logam',
        price_per_kg: 5000,
        description: 'Logam besi dan baja bekas',
        image: '/images/waste-types/besi.jpg',
        is_active: true
      },
      {
        id: 6,
        name: 'Kaca',
        category: 'Kaca',
        price_per_kg: 1000,
        description: 'Botol kaca dan pecahan kaca (harus aman)',
        image: '/images/waste-types/kaca.jpg',
        is_active: true
      },
      {
        id: 7,
        name: 'Plastik Campuran',
        category: 'Plastik',
        price_per_kg: 2500,
        description: 'Plastik campuran (PP, PE, PS) dalam kondisi bersih',
        image: '/images/waste-types/plastik-campuran.jpg',
        is_active: true
      }
    ]);

    // ========================================
    // 5. INSERT SETTINGS
    // ========================================
    console.log('⚙️ Creating application settings...');
    
    await knex('settings').insert([
      {
        key: 'app_info',
        value: JSON.stringify({
          name: 'EcoMarga',
          version: '1.0.0',
          maintenance_mode: false,
          registration_enabled: true,
          support_email: 'support@ecomarga.com',
          support_phone: '+6281234567890',
          company_address: 'Jl. Pemuda No. 1, Semarang, Jawa Tengah'
        }),
        description: 'Basic application information and status',
        category: 'app',
        is_public: true
      },
      {
        key: 'platform_fees',
        value: JSON.stringify({
          platform_fee_percentage: 0.10,
          minimum_submission_weight: 0.1,
          maximum_submission_weight: 100,
          minimum_payout_amount: 10000,
          processing_fee: 1000
        }),
        description: 'Platform fee configuration and submission limits',
        category: 'pricing',
        is_public: false
      },
      {
        key: 'notifications',
        value: JSON.stringify({
          email_enabled: true,
          sms_enabled: false,
          push_enabled: true,
          admin_email: 'admin@ecomarga.com',
          notification_templates: {
            submission_created: 'Pengajuan sampah Anda telah diterima',
            submission_confirmed: 'Pengajuan sampah Anda dikonfirmasi',
            submission_completed: 'Pengajuan sampah Anda selesai diproses'
          }
        }),
        description: 'Notification system configuration',
        category: 'notifications',
        is_public: false
      },
      {
        key: 'pickup_config',
        value: JSON.stringify({
          operating_hours: {
            start: '08:00',
            end: '17:00'
          },
          operating_days: [
            'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
          ],
          advance_booking_days: 7,
          max_daily_pickups: 50,
          pickup_radius_km: 20,
          time_slots: [
            '08:00-10:00', '10:00-12:00', '13:00-15:00', '15:00-17:00'
          ]
        }),
        description: 'Pickup service operating schedule and limits',
        category: 'pickup',
        is_public: true
      },
      {
        key: 'payment_config',
        value: JSON.stringify({
          supported_ewallets: ['dana', 'ovo', 'gopay'],
          auto_payout: false,
          payout_schedule: 'weekly',
          payout_day: 'friday',
          minimum_payout: 50000,
          maximum_payout_per_day: 5000000
        }),
        description: 'Payment and payout configuration',
        category: 'payment',
        is_public: false
      },
      {
        key: 'business_rules',
        value: JSON.stringify({
          max_submissions_per_user_per_day: 3,
          max_submissions_per_user_per_month: 50,
          photo_required: true,
          max_photos_per_submission: 5,
          weight_tolerance_percentage: 20,
          auto_approve_threshold_kg: 5
        }),
        description: 'Business rules and validation settings',
        category: 'business',
        is_public: false
      }
    ]);

    // ========================================
    // 6. INSERT DEMO DATA (Development Only)
    // ========================================
    if (process.env.NODE_ENV === 'development') {
      console.log('🎭 Adding demo submissions and transactions...');
      
      // Demo submissions
      await knex('submissions').insert([
        {
          id: 1,
          user_id: 3, // Demo User
          bank_sampah_id: 1,
          waste_type: 'Botol Plastik',
          estimated_weight: 2.5,
          actual_weight: 2.3,
          estimated_value: 7500,
          actual_value: 6900,
          platform_fee: 690,
          actual_transfer: 6210,
          description: 'Botol plastik bekas air mineral berbagai merk',
          photos: JSON.stringify([
            '/uploads/submissions/demo1-1.jpg',
            '/uploads/submissions/demo1-2.jpg'
          ]),
          status: 'completed',
          pickup_address: 'Jl. Demo No. 123, Semarang Tengah',
          pickup_coordinates: JSON.stringify({
            latitude: -6.9889,
            longitude: 110.4203
          }),
          pickup_date: '2024-01-05T10:00:00.000Z',
          pickup_time_slot: '10:00-12:00',
          pickup_notes: 'Sampah sudah dipisahkan dan bersih',
          processing_notes: 'Kualitas baik, sesuai estimasi',
          processed_by: 1,
          confirmed_at: '2024-01-05T08:00:00.000Z',
          picked_up_at: '2024-01-05T10:30:00.000Z',
          processed_at: '2024-01-05T14:00:00.000Z',
          completed_at: '2024-01-05T16:00:00.000Z',
          created_at: '2024-01-05T07:00:00.000Z'
        },
        {
          id: 2,
          user_id: 4, // Budi Santoso
          bank_sampah_id: 2,
          waste_type: 'Kardus',
          estimated_weight: 5.0,
          actual_weight: 4.8,
          estimated_value: 10000,
          actual_value: 9600,
          platform_fee: 960,
          actual_transfer: 8640,
          description: 'Kardus bekas elektronik dan kemasan online',
          photos: JSON.stringify([
            '/uploads/submissions/demo2-1.jpg'
          ]),
          status: 'completed',
          pickup_address: 'Jl. Merdeka No. 45, Semarang Utara',
          pickup_coordinates: JSON.stringify({
            latitude: -6.9667,
            longitude: 110.4144
          }),
          pickup_date: '2024-01-06T14:00:00.000Z',
          pickup_time_slot: '13:00-15:00',
          processing_notes: 'Kardus dalam kondisi baik dan kering',
          processed_by: 2,
          confirmed_at: '2024-01-06T09:00:00.000Z',
          picked_up_at: '2024-01-06T14:30:00.000Z',
          processed_at: '2024-01-06T16:00:00.000Z',
          completed_at: '2024-01-06T17:00:00.000Z',
          created_at: '2024-01-06T08:00:00.000Z'
        },
        {
          id: 3,
          user_id: 5, // Siti Nurhaliza
          bank_sampah_id: 1,
          waste_type: 'Kaleng Aluminium',
          estimated_weight: 1.2,
          estimated_value: 9600,
          description: 'Kaleng minuman bekas, sudah dicuci bersih',
          photos: JSON.stringify([
            '/uploads/submissions/demo3-1.jpg',
            '/uploads/submissions/demo3-2.jpg'
          ]),
          status: 'confirmed',
          pickup_address: 'Jl. Pahlawan No. 67, Semarang Selatan',
          pickup_coordinates: JSON.stringify({
            latitude: -7.0051,
            longitude: 110.4381
          }),
          pickup_date: '2024-01-08T10:00:00.000Z',
          pickup_time_slot: '10:00-12:00',
          pickup_notes: 'Mohon pickup tepat waktu',
          confirmed_at: '2024-01-07T15:00:00.000Z',
          created_at: '2024-01-07T12:00:00.000Z'
        },
        {
          id: 4,
          user_id: 3, // Demo User
          waste_type: 'Plastik Campuran',
          estimated_weight: 3.0,
          estimated_value: 7500,
          description: 'Kantong plastik dan kemasan makanan',
          photos: JSON.stringify([
            '/uploads/submissions/demo4-1.jpg'
          ]),
          status: 'pending',
          pickup_address: 'Jl. Demo No. 123, Semarang Tengah',
          pickup_coordinates: JSON.stringify({
            latitude: -6.9889,
            longitude: 110.4203
          }),
          pickup_date: '2024-01-10T08:00:00.000Z',
          pickup_time_slot: '08:00-10:00',
          created_at: '2024-01-08T10:00:00.000Z'
        }
      ]);

      // Demo transactions
      await knex('transactions').insert([
        {
          id: 1,
          submission_id: 1,
          user_id: 3,
          amount: 6900,
          fee: 690,
          net_amount: 6210,
          payment_method: 'dana',
          payment_account: '081234567892',
          status: 'completed',
          transaction_id: 'TXN-2024010500001',
          payment_data: JSON.stringify({
            payment_gateway: 'dana',
            reference_id: 'DANA202401050001',
            processed_at: '2024-01-05T16:30:00.000Z'
          }),
          processed_at: '2024-01-05T16:30:00.000Z',
          created_at: '2024-01-05T16:00:00.000Z'
        },
        {
          id: 2,
          submission_id: 2,
          user_id: 4,
          amount: 9600,
          fee: 960,
          net_amount: 8640,
          payment_method: 'gopay',
          payment_account: '081234567893',
          status: 'completed',
          transaction_id: 'TXN-2024010600001',
          payment_data: JSON.stringify({
            payment_gateway: 'gopay',
            reference_id: 'GOPAY202401060001',
            processed_at: '2024-01-06T17:30:00.000Z'
          }),
          processed_at: '2024-01-06T17:30:00.000Z',
          created_at: '2024-01-06T17:00:00.000Z'
        }
      ]);

      // Demo notifications
      await knex('notifications').insert([
        {
          id: 1,
          user_id: 3,
          title: 'Pengajuan Sampah Dikonfirmasi',
          message: 'Pengajuan sampah Botol Plastik seberat 2.5kg telah dikonfirmasi oleh Bank Sampah Hijau Lestari',
          type: 'submission',
          is_read: true,
          data: JSON.stringify({
            submission_id: 1,
            bank_sampah_name: 'Bank Sampah Hijau Lestari'
          }),
          created_at: '2024-01-05T08:00:00.000Z'
        },
        {
          id: 2,
          user_id: 3,
          title: 'Pembayaran Berhasil',
          message: 'Pembayaran sebesar Rp 6.210 untuk pengajuan sampah telah berhasil ditransfer ke DANA Anda',
          type: 'payment',
          is_read: true,
          data: JSON.stringify({
            transaction_id: 'TXN-2024010500001',
            amount: 6210,
            payment_method: 'dana'
          }),
          created_at: '2024-01-05T16:30:00.000Z'
        },
        {
          id: 3,
          user_id: 4,
          title: 'Sampah Berhasil Diproses',
          message: 'Sampah Kardus seberat 4.8kg telah selesai diproses dengan nilai Rp 9.600',
          type: 'submission',
          is_read: false,
          data: JSON.stringify({
            submission_id: 2,
            actual_weight: 4.8,
            actual_value: 9600
          }),
          created_at: '2024-01-06T16:00:00.000Z'
        },
        {
          id: 4,
          user_id: 5,
          title: 'Pengajuan Sampah Dikonfirmasi',
          message: 'Pengajuan sampah Kaleng Aluminium seberat 1.2kg telah dikonfirmasi dan dijadwalkan pickup',
          type: 'submission',
          is_read: false,
          data: JSON.stringify({
            submission_id: 3,
            pickup_date: '2024-01-08T10:00:00.000Z'
          }),
          created_at: '2024-01-07T15:00:00.000Z'
        }
      ]);

      // Demo reviews
      await knex('reviews').insert([
        {
          id: 1,
          user_id: 3,
          bank_sampah_id: 1,
          submission_id: 1,
          rating: 5,
          comment: 'Pelayanan sangat baik, pickup tepat waktu dan proses cepat. Sangat puas!',
          is_anonymous: false,
          created_at: '2024-01-05T18:00:00.000Z'
        },
        {
          id: 2,
          user_id: 4,
          bank_sampah_id: 2,
          submission_id: 2,
          rating: 4,
          comment: 'Proses pembayaran lancar, namun pickup sedikit terlambat dari jadwal.',
          is_anonymous: false,
          created_at: '2024-01-06T19:00:00.000Z'
        }
      ]);

      // Demo audit logs
      await knex('audit_logs').insert([
        {
          id: 1,
          user_id: 1,
          action: 'CREATE',
          table_name: 'users',
          record_id: 3,
          new_values: JSON.stringify({
            nama: 'Demo User',
            email: 'demo@ecomarga.com',
            role: 'user'
          }),
          ip_address: '127.0.0.1',
          user_agent: 'Mozilla/5.0 (Admin Console)',
          created_at: '2024-01-02T00:00:00.000Z'
        },
        {
          id: 2,
          user_id: 1,
          action: 'UPDATE',
          table_name: 'submissions',
          record_id: 1,
          old_values: JSON.stringify({
            status: 'confirmed'
          }),
          new_values: JSON.stringify({
            status: 'completed',
            actual_weight: 2.3,
            actual_value: 6900
          }),
          ip_address: '127.0.0.1',
          user_agent: 'Mozilla/5.0 (Admin Console)',
          created_at: '2024-01-05T16:00:00.000Z'
        }
      ]);

      console.log('✅ Demo data added for development environment');
    }

    console.log('✅ Complete database seeding completed successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   Users: ${process.env.NODE_ENV === 'development' ? '5' : '2'} (including admin)`);
    console.log('   Bank Sampah: 4 locations');
    console.log('   Waste Types: 7 types');
    console.log('   Settings: 6 categories');
    if (process.env.NODE_ENV === 'development') {
      console.log('   Demo Submissions: 4');
      console.log('   Demo Transactions: 2');
      console.log('   Demo Notifications: 4');
      console.log('   Demo Reviews: 2');
      console.log('   Demo Audit Logs: 2');
    }
    console.log('   Audit Logs: 2');
    console.log('');