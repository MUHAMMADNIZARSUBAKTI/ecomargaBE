// models/index.js - Export all models
const { db } = require('../config/database');

/**
 * User Model
 */
class User {
  static async findById(id) {
    return await db('users').where('id', id).first();
  }

  static async findByEmail(email) {
    return await db('users').where('email', email).first();
  }

  static async create(userData) {
    // Map field names to match actual database schema
    const dbData = {
      nama: userData.nama,
      email: userData.email,
      password: userData.password,
      phone: userData.phone || '',  // Empty string if null (in case of NOT NULL constraint)
      address: userData.address || '',  // Empty string if null (NOT NULL constraint)
      role: userData.role || 'user',
      is_active: userData.is_active !== undefined ? userData.is_active : true,
      email_verified: userData.email_verified !== undefined ? userData.email_verified : false,
      profile_image: userData.profile_image || userData.avatar_url || null,
      ewallet_accounts: userData.ewallet_accounts ? JSON.stringify(userData.ewallet_accounts) : null,
      admin_notes: userData.admin_notes || null,
      last_login: userData.last_login || null,  // Gunakan last_login, bukan last_login_at
      join_date: userData.join_date || new Date(),
      created_at: userData.created_at || new Date(),
      updated_at: userData.updated_at || new Date()
    };

    const [user] = await db('users').insert(dbData).returning('*');
    return user;
  }

  static async update(id, userData) {
    // Map field names to match database schema
    const dbData = {
      ...userData,
      updated_at: new Date()
    };

    // Handle field name mapping if needed
    if (userData.alamat && !userData.address) {
      dbData.address = userData.alamat;
      delete dbData.alamat;
    }
    if (userData.no_telepon && !userData.phone) {
      dbData.phone = userData.no_telepon;
      delete dbData.no_telepon;
    }
    if (userData.saldo && !userData.balance) {
      dbData.balance = userData.saldo;
      delete dbData.saldo;
    }
    // Handle last_login_at to last_login mapping
    if (userData.last_login_at && !userData.last_login) {
      dbData.last_login = userData.last_login_at;
      delete dbData.last_login_at;
    }

    const [user] = await db('users')
      .where('id', id)
      .update(dbData)
      .returning('*');
    return user;
  }

  static async getUserStats(userId) {
    // Since balance, total_submissions, total_weight don't exist in users table,
    // we'll calculate from related tables or return defaults
    const user = await db('users').where('id', userId).first();
    
    if (!user) {
      return {
        saldo: 0,
        total_submissions: 0,
        total_berat: 0,
        submission_count: 0,
        total_earnings: 0,
        completed_submissions: 0
      };
    }

    // Calculate stats from submissions table if it exists
    try {
      const submissionStats = await db('submissions')
        .select(
          db.raw('COUNT(*) as submission_count'),
          db.raw('SUM(CASE WHEN status = \'completed\' THEN total_harga ELSE 0 END) as total_earnings'),
          db.raw('COUNT(CASE WHEN status = \'completed\' THEN 1 END) as completed_submissions'),
          db.raw('SUM(berat) as total_berat')
        )
        .where('user_id', userId)
        .first();

      return {
        saldo: 0, // Will need to be calculated from transactions
        total_submissions: parseInt(submissionStats.submission_count) || 0,
        total_berat: parseFloat(submissionStats.total_berat) || 0,
        submission_count: parseInt(submissionStats.submission_count) || 0,
        total_earnings: parseFloat(submissionStats.total_earnings) || 0,
        completed_submissions: parseInt(submissionStats.completed_submissions) || 0
      };
    } catch (error) {
      // If submissions table doesn't exist yet, return defaults
      return {
        saldo: 0,
        total_submissions: 0,
        total_berat: 0,
        submission_count: 0,
        total_earnings: 0,
        completed_submissions: 0
      };
    }
  }

  static async getUserRank(userId) {
    // Since total_weight doesn't exist in users table, we'll calculate from submissions
    try {
      const result = await db.raw(`
        SELECT rank FROM (
          SELECT user_id, ROW_NUMBER() OVER (ORDER BY SUM(berat) DESC) as rank
          FROM submissions
          WHERE status = 'completed'
          GROUP BY user_id
          HAVING SUM(berat) > 0
        ) ranked_users
        WHERE user_id = ?
      `, [userId]);

      return result.rows[0]?.rank || null;
    } catch (error) {
      // If submissions table doesn't exist yet, return null
      return null;
    }
  }
}

/**
 * Transaction Model
 */
class Transaction {
  static async create(transactionData) {
    const [transaction] = await db('transactions').insert(transactionData).returning('*');
    return transaction;
  }

  static async findById(id) {
    return await db('transactions').where('id', id).first();
  }

  static async findByUserId(userId, filters = {}) {
    let query = db('transactions').where('user_id', userId);
    
    if (filters.jenis) {
      query = query.where('jenis', filters.jenis);
    }
    if (filters.status) {
      query = query.where('status', filters.status);
    }
    if (filters.date_from) {
      query = query.where('created_at', '>=', filters.date_from);
    }
    if (filters.date_to) {
      query = query.where('created_at', '<=', filters.date_to);
    }

    return await query.orderBy('created_at', 'desc');
  }

  static async getStatsByDateRange(startDate, endDate, filters = {}) {
    let query = db('transactions')
      .whereBetween('created_at', [startDate, endDate]);

    if (filters.user_id) {
      query = query.where('user_id', filters.user_id);
    }
    if (filters.jenis) {
      query = query.where('jenis', filters.jenis);
    }

    const stats = await query
      .select(
        db.raw('COUNT(*) as total_transactions'),
        db.raw('SUM(CASE WHEN jenis = \'kredit\' THEN jumlah ELSE 0 END) as total_kredit'),
        db.raw('SUM(CASE WHEN jenis = \'debit\' THEN jumlah ELSE 0 END) as total_debit')
      )
      .first();

    return {
      total_transactions: parseInt(stats.total_transactions) || 0,
      total_kredit: parseFloat(stats.total_kredit) || 0,
      total_debit: parseFloat(stats.total_debit) || 0
    };
  }
}

/**
 * Submission Model
 */
class Submission {
  static async create(submissionData) {
    const [submission] = await db('submissions').insert(submissionData).returning('*');
    return submission;
  }

  static async findById(id) {
    return await db('submissions')
      .select([
        'submissions.*',
        'users.nama as user_nama',
        'users.email as user_email',
        'bank_sampah.nama as bank_sampah_nama',
        'waste_types.nama as waste_type_nama',
        'waste_types.kategori as waste_kategori'
      ])
      .leftJoin('users', 'submissions.user_id', 'users.id')
      .leftJoin('bank_sampah', 'submissions.bank_sampah_id', 'bank_sampah.id')
      .leftJoin('waste_types', 'submissions.waste_type_id', 'waste_types.id')
      .where('submissions.id', id)
      .first();
  }

  static async findAll(filters = {}, pagination = {}) {
    let query = db('submissions')
      .select([
        'submissions.*',
        'users.nama as user_nama',
        'bank_sampah.nama as bank_sampah_nama',
        'waste_types.nama as waste_type_nama',
        'waste_types.kategori as waste_kategori'
      ])
      .leftJoin('users', 'submissions.user_id', 'users.id')
      .leftJoin('bank_sampah', 'submissions.bank_sampah_id', 'bank_sampah.id')
      .leftJoin('waste_types', 'submissions.waste_type_id', 'waste_types.id');

    // Apply filters
    if (filters.user_id) {
      query = query.where('submissions.user_id', filters.user_id);
    }
    if (filters.bank_sampah_id) {
      query = query.where('submissions.bank_sampah_id', filters.bank_sampah_id);
    }
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query = query.whereIn('submissions.status', filters.status);
      } else {
        query = query.where('submissions.status', filters.status);
      }
    }
    if (filters.waste_type_id) {
      query = query.where('submissions.waste_type_id', filters.waste_type_id);
    }
    if (filters.date_from) {
      query = query.where('submissions.created_at', '>=', filters.date_from);
    }
    if (filters.date_to) {
      query = query.where('submissions.created_at', '<=', filters.date_to);
    }

    // Apply pagination
    if (pagination.page && pagination.limit) {
      const offset = (pagination.page - 1) * pagination.limit;
      query = query.limit(pagination.limit).offset(offset);
    }

    return await query.orderBy('submissions.created_at', 'desc');
  }

  static async count(filters = {}) {
    let query = db('submissions');

    // Apply same filters as findAll
    if (filters.user_id) {
      query = query.where('user_id', filters.user_id);
    }
    if (filters.bank_sampah_id) {
      query = query.where('bank_sampah_id', filters.bank_sampah_id);
    }
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query = query.whereIn('status', filters.status);
      } else {
        query = query.where('status', filters.status);
      }
    }
    if (filters.waste_type_id) {
      query = query.where('waste_type_id', filters.waste_type_id);
    }
    if (filters.date_from) {
      query = query.where('created_at', '>=', filters.date_from);
    }
    if (filters.date_to) {
      query = query.where('created_at', '<=', filters.date_to);
    }

    const result = await query.count('* as count').first();
    return parseInt(result.count) || 0;
  }

  static async update(id, submissionData) {
    const [submission] = await db('submissions')
      .where('id', id)
      .update({ ...submissionData, updated_at: new Date() })
      .returning('*');
    return submission;
  }

  static async updateStatus(id, status, additionalData = {}) {
    const updateData = { 
      status, 
      updated_at: new Date(),
      ...additionalData
    };
    
    // Add timestamp for status changes
    const statusTimestamps = {
      'confirmed': 'confirmed_at',
      'picked_up': 'picked_up_at',
      'processed': 'processed_at',
      'completed': 'completed_at',
      'cancelled': 'cancelled_at'
    };
    
    if (statusTimestamps[status]) {
      updateData[statusTimestamps[status]] = new Date();
    }
    
    const [submission] = await db('submissions')
      .where('id', id)
      .update(updateData)
      .returning('*');
    
    return submission;
  }

  static async getStatsByUser(userId) {
    const stats = await db('submissions')
      .select(
        db.raw('COUNT(*) as total_submissions'),
        db.raw('SUM(berat) as total_berat'),
        db.raw('SUM(CASE WHEN status = \'completed\' THEN total_harga ELSE 0 END) as total_earnings'),
        db.raw('COUNT(CASE WHEN status = \'completed\' THEN 1 END) as completed_submissions'),
        db.raw('COUNT(CASE WHEN status = \'pending\' THEN 1 END) as pending_submissions'),
        db.raw('AVG(CASE WHEN rating IS NOT NULL THEN rating END) as avg_rating')
      )
      .where('user_id', userId)
      .first();

    return {
      total_submissions: parseInt(stats.total_submissions) || 0,
      total_berat: parseFloat(stats.total_berat) || 0,
      total_earnings: parseFloat(stats.total_earnings) || 0,
      completed_submissions: parseInt(stats.completed_submissions) || 0,
      pending_submissions: parseInt(stats.pending_submissions) || 0,
      avg_rating: parseFloat(stats.avg_rating) || 0
    };
  }
}

/**
 * Bank Sampah Model
 */
class BankSampah {
  static async findById(id) {
    return await db('bank_sampah').where('id', id).first();
  }

  static async findAll(filters = {}, pagination = {}) {
    let query = db('bank_sampah');
    
    if (filters.is_active !== undefined) {
      query = query.where('is_active', filters.is_active);
    }
    
    if (filters.is_partner !== undefined) {
      query = query.where('is_partner', filters.is_partner);
    }
    
    if (filters.kota) {
      query = query.where('kota', 'ilike', `%${filters.kota}%`);
    }
    
    if (filters.search) {
      query = query.where(function() {
        this.where('nama', 'ilike', `%${filters.search}%`)
            .orWhere('alamat', 'ilike', `%${filters.search}%`);
      });
    }

    // Apply pagination
    if (pagination.page && pagination.limit) {
      const offset = (pagination.page - 1) * pagination.limit;
      query = query.limit(pagination.limit).offset(offset);
    }
    
    return await query.orderBy('avg_rating', 'desc');
  }

  static async count(filters = {}) {
    let query = db('bank_sampah');
    
    if (filters.is_active !== undefined) {
      query = query.where('is_active', filters.is_active);
    }
    
    if (filters.is_partner !== undefined) {
      query = query.where('is_partner', filters.is_partner);
    }
    
    if (filters.kota) {
      query = query.where('kota', 'ilike', `%${filters.kota}%`);
    }
    
    if (filters.search) {
      query = query.where(function() {
        this.where('nama', 'ilike', `%${filters.search}%`)
            .orWhere('alamat', 'ilike', `%${filters.search}%`);
      });
    }

    const result = await query.count('* as count').first();
    return parseInt(result.count) || 0;
  }

  static async findNearby(latitude, longitude, radiusKm, limit = 20) {
    // Using Haversine formula to calculate distance
    const query = `
      SELECT *, (
        6371 * acos(
          cos(radians(?)) * cos(radians(latitude)) * 
          cos(radians(longitude) - radians(?)) + sin(radians(?)) * 
          sin(radians(latitude))
        )
      ) AS distance_km
      FROM bank_sampah 
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        AND is_active = true
      HAVING distance_km <= ?
      ORDER BY distance_km
      LIMIT ?
    `;

    const results = await db.raw(query, [latitude, longitude, latitude, radiusKm, limit]);
    return results.rows || results; // Handle different DB drivers
  }

  static async getAvailableCities() {
    const results = await db('bank_sampah')
      .distinct('kota')
      .where('is_active', true)
      .whereNotNull('kota')
      .orderBy('kota');
    
    return results.map(row => row.kota);
  }

  static async getTopBankSampah(limit = 5) {
    return await db('bank_sampah')
      .where('is_active', true)
      .orderBy('avg_rating', 'desc')
      .orderBy('total_reviews', 'desc')
      .limit(limit);
  }

  static async getWastePrices(bankSampahId) {
    return await db('bank_sampah_waste_prices')
      .select([
        'bank_sampah_waste_prices.*',
        'waste_types.nama as waste_type_nama',
        'waste_types.kategori as waste_kategori',
        'waste_types.unit as waste_unit'
      ])
      .join('waste_types', 'bank_sampah_waste_prices.waste_type_id', 'waste_types.id')
      .where('bank_sampah_waste_prices.bank_sampah_id', bankSampahId)
      .where('bank_sampah_waste_prices.is_active', true)
      .orderBy('waste_types.kategori', 'asc');
  }

  static async getStats(bankSampahId) {
    // Get submission stats for this bank sampah
    const submissionStats = await db('submissions')
      .select(
        db.raw('COUNT(*) as total_submissions'),
        db.raw('SUM(berat) as total_berat'),
        db.raw('SUM(total_harga) as total_pembayaran'),
        db.raw('AVG(rating) as avg_rating'),
        db.raw('COUNT(CASE WHEN status = \'completed\' THEN 1 END) as completed_submissions'),
        db.raw('COUNT(CASE WHEN status = \'pending\' THEN 1 END) as pending_submissions')
      )
      .where('bank_sampah_id', bankSampahId)
      .first();

    return {
      total_submissions: parseInt(submissionStats.total_submissions) || 0,
      total_berat: parseFloat(submissionStats.total_berat) || 0,
      total_pembayaran: parseFloat(submissionStats.total_pembayaran) || 0,
      avg_rating: parseFloat(submissionStats.avg_rating) || 0,
      completed_submissions: parseInt(submissionStats.completed_submissions) || 0,
      pending_submissions: parseInt(submissionStats.pending_submissions) || 0
    };
  }

  static async create(bankSampahData) {
    const [bankSampah] = await db('bank_sampah').insert(bankSampahData).returning('*');
    return bankSampah;
  }

  static async update(id, bankSampahData) {
    const [bankSampah] = await db('bank_sampah')
      .where('id', id)
      .update({ ...bankSampahData, updated_at: new Date() })
      .returning('*');
    return bankSampah;
  }
}

/**
 * Waste Type Model
 */
class WasteType {
  static async findAll(filters = {}) {
    let query = db('waste_types');

    if (filters.kategori) {
      query = query.where('kategori', filters.kategori);
    }
    if (filters.is_active !== undefined) {
      query = query.where('is_active', filters.is_active);
    }
    if (filters.search) {
      query = query.where(function() {
        this.where('nama', 'ilike', `%${filters.search}%`)
            .orWhere('kategori', 'ilike', `%${filters.search}%`);
      });
    }

    return await query.orderBy('kategori', 'asc').orderBy('nama', 'asc');
  }

  static async findById(id) {
    return await db('waste_types').where('id', id).first();
  }

  static async create(wasteTypeData) {
    const [wasteType] = await db('waste_types').insert(wasteTypeData).returning('*');
    return wasteType;
  }

  static async update(id, wasteTypeData) {
    const [wasteType] = await db('waste_types')
      .where('id', id)
      .update({ ...wasteTypeData, updated_at: new Date() })
      .returning('*');
    return wasteType;
  }
}

/**
 * Settings Model
 */
class Settings {
  static async get(key) {
    const setting = await db('settings').where('key', key).first();
    return setting ? setting.value : null;
  }

  static async set(key, value) {
    const existingSetting = await db('settings').where('key', key).first();
    
    if (existingSetting) {
      await db('settings')
        .where('key', key)
        .update({ value, updated_at: new Date() });
    } else {
      await db('settings').insert({ key, value });
    }
    
    return { key, value };
  }

  static async getAll() {
    const settings = await db('settings').select('key', 'value');
    return settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});
  }
}

module.exports = {
  User,
  Transaction,
  Submission,
  BankSampah,
  WasteType,
  Settings,
  db
};