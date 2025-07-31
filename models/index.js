// models/index.js - Database models and query helpers
const { db } = require('../config/database');

/**
 * User Model
 */
class User {
  static async findById(id) {
    return await db('users').where('id', id).first();
  }

  static async findByEmail(email) {
    return await db('users').where('email', email.toLowerCase()).first();
  }

  static async create(userData) {
    const [user] = await db('users').insert(userData).returning('*');
    return user;
  }

  static async update(id, userData) {
    const [user] = await db('users')
      .where('id', id)
      .update({ ...userData, updated_at: new Date() })
      .returning('*');
    return user;
  }

  static async findAll(filters = {}) {
    let query = db('users');
    
    if (filters.role) {
      query = query.where('role', filters.role);
    }
    
    if (filters.is_active !== undefined) {
      query = query.where('is_active', filters.is_active);
    }
    
    if (filters.search) {
      query = query.where(function() {
        this.where('nama', 'ilike', `%${filters.search}%`)
            .orWhere('email', 'ilike', `%${filters.search}%`);
      });
    }
    
    return await query.orderBy('created_at', 'desc');
  }

  static async getStats(userId) {
    const submissions = await db('submissions').where('user_id', userId);
    
    const stats = {
      total_submissions: submissions.length,
      completed_submissions: submissions.filter(s => s.status === 'completed').length,
      pending_submissions: submissions.filter(s => s.status === 'pending').length,
      cancelled_submissions: submissions.filter(s => s.status === 'cancelled').length,
      total_weight: submissions
        .filter(s => s.actual_weight)
        .reduce((sum, s) => sum + parseFloat(s.actual_weight), 0),
      total_earnings: submissions
        .filter(s => s.status === 'completed' && s.actual_transfer)
        .reduce((sum, s) => sum + parseFloat(s.actual_transfer), 0)
    };
    
    stats.average_submission_value = stats.completed_submissions > 0 
      ? (stats.total_earnings / stats.completed_submissions).toFixed(2)
      : 0;
    
    return stats;
  }
}

/**
 * Submission Model
 */
class Submission {
  static async findById(id) {
    return await db('submissions')
      .leftJoin('users', 'submissions.user_id', 'users.id')
      .leftJoin('bank_sampah', 'submissions.bank_sampah_id', 'bank_sampah.id')
      .select(
        'submissions.*',
        'users.nama as user_name',
        'users.email as user_email',
        'bank_sampah.nama as bank_sampah_name'
      )
      .where('submissions.id', id)
      .first();
  }

  static async create(submissionData) {
    const [submission] = await db('submissions').insert(submissionData).returning('*');
    return submission;
  }

  static async update(id, submissionData) {
    const [submission] = await db('submissions')
      .where('id', id)
      .update({ ...submissionData, updated_at: new Date() })
      .returning('*');
    return submission;
  }

  static async findByUserId(userId, filters = {}) {
    let query = db('submissions')
      .leftJoin('bank_sampah', 'submissions.bank_sampah_id', 'bank_sampah.id')
      .select(
        'submissions.*',
        'bank_sampah.nama as bank_sampah_name'
      )
      .where('submissions.user_id', userId);
    
    if (filters.status) {
      query = query.where('submissions.status', filters.status);
    }
    
    if (filters.waste_type) {
      query = query.where('submissions.waste_type', filters.waste_type);
    }
    
    return await query.orderBy('submissions.created_at', 'desc');
  }

  static async findAll(filters = {}) {
    let query = db('submissions')
      .leftJoin('users', 'submissions.user_id', 'users.id')
      .leftJoin('bank_sampah', 'submissions.bank_sampah_id', 'bank_sampah.id')
      .select(
        'submissions.*',
        'users.nama as user_name',
        'users.email as user_email',
        'bank_sampah.nama as bank_sampah_name'
      );
    
    if (filters.status) {
      query = query.where('submissions.status', filters.status);
    }
    
    if (filters.user_id) {
      query = query.where('submissions.user_id', filters.user_id);
    }
    
    if (filters.waste_type) {
      query = query.where('submissions.waste_type', filters.waste_type);
    }
    
    if (filters.date_from) {
      query = query.where('submissions.created_at', '>=', filters.date_from);
    }
    
    if (filters.date_to) {
      query = query.where('submissions.created_at', '<=', filters.date_to + 'T23:59:59.999Z');
    }
    
    return await query.orderBy('submissions.created_at', 'desc');
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
}

/**
 * Bank Sampah Model
 */
class BankSampah {
  static async findById(id) {
    return await db('bank_sampah').where('id', id).first();
  }

  static async findAll(filters = {}) {
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
    
    return await query.orderBy('rating', 'desc');
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

  static async updateRating(id, newRating, reviewCount) {
    const [bankSampah] = await db('bank_sampah')
      .where('id', id)
      .update({
        rating: newRating,
        total_reviews: reviewCount,
        updated_at: new Date()
      })
      .returning('*');
    return bankSampah;
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

  static async set(key, value, description = null, category = 'general') {
    const existingSetting = await db('settings').where('key', key).first();
    
    if (existingSetting) {
      const [setting] = await db('settings')
        .where('key', key)
        .update({
          value: JSON.stringify(value),
          description: description || existingSetting.description,
          updated_at: new Date()
        })
        .returning('*');
      return setting;
    } else {
      const [setting] = await db('settings').insert({
        key,
        value: JSON.stringify(value),
        description,
        category
      }).returning('*');
      return setting;
    }
  }

  static async getByCategory(category) {
    const settings = await db('settings').where('category', category);
    const result = {};
    settings.forEach(setting => {
      result[setting.key] = setting.value;
    });
    return result;
  }

  static async getPublicSettings() {
    const settings = await db('settings').where('is_public', true);
    const result = {};
    settings.forEach(setting => {
      result[setting.key] = setting.value;
    });
    return result;
  }

  static async delete(key) {
    return await db('settings').where('key', key).del();
  }
}

module.exports = {
  User,
  Submission,
  BankSampah,
  Settings,
  db
};