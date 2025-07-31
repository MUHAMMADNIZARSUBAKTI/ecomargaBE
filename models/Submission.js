// models/Submission.js - Submission model
const { db } = require('../config/database');

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
    if (filters.date_from) {
      query = query.where('created_at', '>=', filters.date_from);
    }
    if (filters.date_to) {
      query = query.where('created_at', '<=', filters.date_to);
    }

    const result = await query.count('id as count').first();
    return parseInt(result.count);
  }

  static async updateStatus(id, status, adminNotes = null) {
    const updateData = { 
      status, 
      updated_at: new Date() 
    };

    if (adminNotes) {
      updateData.catatan_admin = adminNotes;
    }

    // Set appropriate timestamp based on status
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

  static async addRating(id, rating, review = null) {
    const [submission] = await db('submissions')
      .where('id', id)
      .update({
        rating,
        review,
        updated_at: new Date()
      })
      .returning('*');

    return submission;
  }

  static async generateKodeSubmission() {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    // Get today's submission count
    const count = await db('submissions')
      .whereRaw('DATE(created_at) = CURRENT_DATE')
      .count('id as count')
      .first();

    const sequence = String(parseInt(count.count) + 1).padStart(4, '0');
    return `SUB${dateStr}${sequence}`;
  }

  static async getStatsByUser(userId) {
    const stats = await db('submissions')
      .where('user_id', userId)
      .select(
        db.raw('COUNT(*) as total_submissions'),
        db.raw('SUM(berat) as total_berat'),
        db.raw('SUM(total_harga) as total_pendapatan'),
        db.raw('COUNT(CASE WHEN status = \'completed\' THEN 1 END) as completed_submissions')
      )
      .first();

    return {
      total_submissions: parseInt(stats.total_submissions) || 0,
      total_berat: parseFloat(stats.total_berat) || 0,
      total_pendapatan: parseFloat(stats.total_pendapatan) || 0,
      completed_submissions: parseInt(stats.completed_submissions) || 0
    };
  }

  static async getStatsByDateRange(startDate, endDate, filters = {}) {
    let query = db('submissions')
      .whereBetween('created_at', [startDate, endDate]);

    if (filters.status) {
      query = query.where('status', filters.status);
    }
    if (filters.user_id) {
      query = query.where('user_id', filters.user_id);
    }

    const stats = await query
      .select(
        db.raw('COUNT(*) as total_submissions'),
        db.raw('SUM(berat) as total_berat'),
        db.raw('SUM(total_harga) as total_pendapatan'),
        db.raw('AVG(rating) as avg_rating')
      )
      .first();

    return {
      total_submissions: parseInt(stats.total_submissions) || 0,
      total_berat: parseFloat(stats.total_berat) || 0,
      total_pendapatan: parseFloat(stats.total_pendapatan) || 0,
      avg_rating: parseFloat(stats.avg_rating) || 0
    };
  }

  static async getMonthlyStats(year = new Date().getFullYear()) {
    const stats = await db('submissions')
      .select(
        db.raw('EXTRACT(MONTH FROM created_at) as month'),
        db.raw('COUNT(*) as total_submissions'),
        db.raw('SUM(berat) as total_berat'),
        db.raw('SUM(total_harga) as total_pendapatan')
      )
      .whereRaw('EXTRACT(YEAR FROM created_at) = ?', [year])
      .groupByRaw('EXTRACT(MONTH FROM created_at)')
      .orderByRaw('EXTRACT(MONTH FROM created_at)');

    // Fill missing months with zero values
    const monthlyData = Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      const found = stats.find(stat => parseInt(stat.month) === month);
      return {
        month,
        total_submissions: found ? parseInt(found.total_submissions) : 0,
        total_berat: found ? parseFloat(found.total_berat) : 0,
        total_pendapatan: found ? parseFloat(found.total_pendapatan) : 0
      };
    });

    return monthlyData;
  }

  static async getTopWasteTypes(limit = 5) {
    return await db('submissions')
      .select([
        'waste_types.nama as waste_type_nama',
        'waste_types.kategori as waste_kategori',
        db.raw('SUM(submissions.berat) as total_berat'),
        db.raw('COUNT(*) as total_submissions')
      ])
      .join('waste_types', 'submissions.waste_type_id', 'waste_types.id')
      .where('submissions.status', 'completed')
      .groupBy('waste_types.id', 'waste_types.nama', 'waste_types.kategori')
      .orderBy('total_berat', 'desc')
      .limit(limit);
  }
}

module.exports = Submission;