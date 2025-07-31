// utils/dataHelpers.js - Helper functions for JSON file-based data operations
const fs = require('fs');
const path = require('path');

// Data directory
const DATA_DIR = process.env.DATA_DIR || './data';

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// File paths
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');
const BANK_SAMPAH_FILE = path.join(DATA_DIR, 'bankSampah.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

/**
 * Generic function to load JSON data from file
 */
const loadJsonFile = (filePath, defaultData = []) => {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
    return defaultData;
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error);
    return defaultData;
  }
};

/**
 * Generic function to save JSON data to file
 */
const saveJsonFile = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error saving ${filePath}:`, error);
    return false;
  }
};

/**
 * Load users data
 */
const loadUsers = () => {
  const defaultUsers = [
    {
      id: 1,
      nama: "Administrator",
      email: "admin@ecomarga.com",
      password: "$2a$12$rQZ9j8XbGq1qJGKW8nR8UOzO4xUu9F8Cp2vT7mH1kL5nE6pQ3wX4O", // admin123
      phone: "+62 812-3456-7890",
      address: "Kantor Pusat EcoMarga, Semarang",
      role: "admin",
      join_date: "2024-01-01T00:00:00.000Z",
      is_active: true,
      ewallet_accounts: {
        dana: "081234567890",
        ovo: "081234567890",
        gopay: "081234567890"
      },
      profile_image: null,
      email_verified: true,
      created_at: "2024-01-01T00:00:00.000Z",
      updated_at: "2024-01-01T00:00:00.000Z"
    }
  ];
  return loadJsonFile(USERS_FILE, defaultUsers);
};

/**
 * Save users data
 */
const saveUsers = (users) => {
  return saveJsonFile(USERS_FILE, users);
};

/**
 * Load submissions data
 */
const loadSubmissions = () => {
  return loadJsonFile(SUBMISSIONS_FILE, []);
};

/**
 * Save submissions data
 */
const saveSubmissions = (submissions) => {
  return saveJsonFile(SUBMISSIONS_FILE, submissions);
};

/**
 * Load bank sampah data
 */
const loadBankSampah = () => {
  const defaultBankSampah = [
    {
      id: 1,
      nama: "Bank Sampah Bersih Sejahtera",
      alamat: "Jl. Pahlawan No. 123, Semarang Tengah",
      kota: "Semarang",
      provinsi: "Jawa Tengah",
      phone: "+62 24-1234567",
      email: "info@bersihsejahtera.com",
      koordinat: {
        latitude: -6.9930,
        longitude: 110.4203
      },
      jam_operasional: {
        senin_jumat: "08:00 - 16:00",
        sabtu: "08:00 - 12:00",
        minggu: "Tutup"
      },
      jenis_sampah_diterima: [
        "Botol Plastik",
        "Kardus",
        "Kaleng Aluminium",
        "Kertas",
        "Kaca"
      ],
      rating: 4.5,
      total_reviews: 127,
      is_active: true,
      is_partner: true,
      bergabung_sejak: "2023-06-15T00:00:00.000Z",
      foto: "/images/bank-sampah/bs1.jpg",
      deskripsi: "Bank sampah terpercaya dengan layanan jemput door-to-door",
      created_at: "2023-06-15T00:00:00.000Z",
      updated_at: "2024-01-15T00:00:00.000Z"
    },
    {
      id: 2,
      nama: "Bank Sampah Hijau Lestari",
      alamat: "Jl. Pemuda No. 456, Semarang Utara",
      kota: "Semarang",
      provinsi: "Jawa Tengah",
      phone: "+62 24-7654321",
      email: "kontak@hijaulestari.com",
      koordinat: {
        latitude: -6.9660,
        longitude: 110.4103
      },
      jam_operasional: {
        senin_jumat: "07:30 - 17:00",
        sabtu: "07:30 - 13:00",
        minggu: "Tutup"
      },
      jenis_sampah_diterima: [
        "Botol Plastik",
        "Kardus",
        "Kaleng Aluminium",
        "Kertas",
        "Besi",
        "Plastik Campuran"
      ],
      rating: 4.2,
      total_reviews: 89,
      is_active: true,
      is_partner: true,
      bergabung_sejak: "2023-08-20T00:00:00.000Z",
      foto: "/images/bank-sampah/bs2.jpg",
      deskripsi: "Spesialis pengolahan sampah plastik dengan teknologi modern",
      created_at: "2023-08-20T00:00:00.000Z",
      updated_at: "2024-01-10T00:00:00.000Z"
    },
    {
      id: 3,
      nama: "Bank Sampah Mandiri Sejahtera",
      alamat: "Jl. Diponegoro No. 789, Semarang Selatan",
      kota: "Semarang",
      provinsi: "Jawa Tengah",
      phone: "+62 24-9876543",
      email: "admin@mandirisejahtera.com",
      koordinat: {
        latitude: -7.0051,
        longitude: 110.4381
      },
      jam_operasional: {
        senin_jumat: "08:00 - 15:30",
        sabtu: "08:00 - 12:00",
        minggu: "Tutup"
      },
      jenis_sampah_diterima: [
        "Kardus",
        "Kertas",
        "Kaca",
        "Besi"
      ],
      rating: 4.7,
      total_reviews: 203,
      is_active: true,
      is_partner: true,
      bergabung_sejak: "2023-04-10T00:00:00.000Z",
      foto: "/images/bank-sampah/bs3.jpg",
      deskripsi: "Bank sampah dengan fokus pada kertas dan logam berkualitas tinggi",
      created_at: "2023-04-10T00:00:00.000Z",
      updated_at: "2024-01-20T00:00:00.000Z"
    }
  ];
  return loadJsonFile(BANK_SAMPAH_FILE, defaultBankSampah);
};

/**
 * Save bank sampah data
 */
const saveBankSampah = (bankSampah) => {
  return saveJsonFile(BANK_SAMPAH_FILE, bankSampah);
};

/**
 * Load application settings
 */
const loadSettings = () => {
  const defaultSettings = {
    app: {
      name: "EcoMarga",
      version: "1.0.0",
      maintenance_mode: false,
      registration_enabled: true
    },
    pricing: {
      "Botol Plastik": 3000,
      "Kardus": 2000,
      "Kaleng Aluminium": 8000,
      "Kertas": 1500,
      "Besi": 5000,
      "Kaca": 1000,
      "Plastik Campuran": 2500
    },
    fees: {
      platform_fee_percentage: 0.10,
      minimum_submission_weight: 0.1,
      maximum_submission_weight: 100
    },
    notifications: {
      email_enabled: true,
      sms_enabled: false,
      push_enabled: true
    },
    pickup: {
      operating_hours: {
        start: "08:00",
        end: "17:00"
      },
      operating_days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
      advance_booking_days: 7
    },
    updated_at: new Date().toISOString()
  };
  return loadJsonFile(SETTINGS_FILE, defaultSettings);
};

/**
 * Save application settings
 */
const saveSettings = (settings) => {
  settings.updated_at = new Date().toISOString();
  return saveJsonFile(SETTINGS_FILE, settings);
};

/**
 * Generate unique ID for new records
 */
const generateId = (array) => {
  if (!Array.isArray(array) || array.length === 0) {
    return 1;
  }
  return Math.max(...array.map(item => item.id || 0), 0) + 1;
};

/**
 * Find user by ID
 */
const findUserById = (id) => {
  const users = loadUsers();
  return users.find(user => user.id === parseInt(id));
};

/**
 * Find user by email
 */
const findUserByEmail = (email) => {
  const users = loadUsers();
  return users.find(user => user.email.toLowerCase() === email.toLowerCase());
};

/**
 * Get submissions by user ID
 */
const getSubmissionsByUserId = (userId) => {
  const submissions = loadSubmissions();
  return submissions.filter(submission => submission.user_id === parseInt(userId));
};

/**
 * Get user statistics
 */
const getUserStats = (userId) => {
  const submissions = getSubmissionsByUserId(userId);
  
  return {
    total_submissions: submissions.length,
    completed_submissions: submissions.filter(s => s.status === 'completed').length,
    pending_submissions: submissions.filter(s => s.status === 'pending').length,
    cancelled_submissions: submissions.filter(s => s.status === 'cancelled').length,
    total_weight: submissions
      .filter(s => s.actual_weight)
      .reduce((sum, s) => sum + s.actual_weight, 0),
    total_earnings: submissions
      .filter(s => s.status === 'completed' && s.actual_transfer)
      .reduce((sum, s) => sum + s.actual_transfer, 0),
    average_submission_value: submissions.length > 0 
      ? submissions
          .filter(s => s.actual_transfer)
          .reduce((sum, s) => sum + s.actual_transfer, 0) / submissions.filter(s => s.actual_transfer).length
      : 0
  };
};

/**
 * Backup data files
 */
const backupData = () => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(DATA_DIR, 'backups', timestamp);
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const files = [USERS_FILE, SUBMISSIONS_FILE, BANK_SAMPAH_FILE, SETTINGS_FILE];
    
    files.forEach(file => {
      if (fs.existsSync(file)) {
        const filename = path.basename(file);
        const backupFile = path.join(backupDir, filename);
        fs.copyFileSync(file, backupFile);
      }
    });

    console.log(`Data backup created: ${backupDir}`);
    return backupDir;
  } catch (error) {
    console.error('Backup failed:', error);
    return null;
  }
};

/**
 * Restore data from backup
 */
const restoreData = (backupDir) => {
  try {
    if (!fs.existsSync(backupDir)) {
      throw new Error('Backup directory not found');
    }

    const files = ['users.json', 'submissions.json', 'bankSampah.json', 'settings.json'];
    
    files.forEach(filename => {
      const backupFile = path.join(backupDir, filename);
      const targetFile = path.join(DATA_DIR, filename);
      
      if (fs.existsSync(backupFile)) {
        fs.copyFileSync(backupFile, targetFile);
      }
    });

    console.log(`Data restored from: ${backupDir}`);
    return true;
  } catch (error) {
    console.error('Restore failed:', error);
    return false;
  }
};

/**
 * Initialize default data if files don't exist
 */
const initializeData = () => {
  console.log('Initializing data files...');
  
  // Create default data files if they don't exist
  loadUsers(); // This will create users.json with default admin
  loadSubmissions(); // This will create empty submissions.json
  loadBankSampah(); // This will create bankSampah.json with sample data
  loadSettings(); // This will create settings.json with defaults
  
  console.log('Data initialization complete.');
};

module.exports = {
  loadUsers,
  saveUsers,
  loadSubmissions,
  saveSubmissions,
  loadBankSampah,
  saveBankSampah,
  loadSettings,
  saveSettings,
  generateId,
  findUserById,
  findUserByEmail,
  getSubmissionsByUserId,
  getUserStats,
  backupData,
  restoreData,
  initializeData
};