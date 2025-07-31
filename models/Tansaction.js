// models/Transaction.js - Transaction model
const { db } = require('../config/database');

class Transaction {
  static async create(transactionData) {
    const [transaction] = await db('transactions').insert(transactionData).returning('*');
    return transaction;
  }

  static async findById(id) {
    return await db('transactions').where('id', id).first();
  }

  static async findByUserId(userId, pagination = {}) {
    let query = db('transactions')
      .select([
        'transactions.*',
        'submissions.kode_submission',
        'waste_types.nama as waste_type_nama'
      ])
      .leftJoin('submissions', 'transactions.submission_id', 'submissions.id')
      .leftJoin('waste_types', 'submissions.waste_type_id', 'waste_types.id')
      .where('transactions.user_id', userId);

    if (pagination.limit) {
      query = query.limit(pagination.limit);
    }
    if (pagination.offset) {
      query = query.offset(pagination.offset);
    }

    return await query.orderBy('transactions.created_at', 'desc');
  }

  static async countByUserId(userId) {
    const result = await db('transactions')
      .where('user_id', userId)
      .count('id as count')
      .first();
    return parseInt(result.count);
  }

  static async generateKodeTransaksi() {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    const count = await db('transactions')
      .whereRaw('DATE(created_at) = CURRENT_DATE')
      .count('id as count')
      .first();

    const sequence = String(parseInt(count.count) + 1).padStart(6, '0');
    return `TXN${dateStr}${sequence}`;
  }

  static async getBalanceHistory(userId, days = 30) {
    const result = await db('transactions')
      .select(
        db.raw('DATE(created_at) as date'),
        db.raw('saldo_sesudah as balance')
      )
      .where('user_id', userId)
      .where('created_at', '>=', new Date(Date.now() - days * 24 * 60 * 60 * 1000))
      .orderBy('created_at', 'asc');

    return result;
  }

  static async createSubmissionTransaction(userId, submissionId, amount, description = 'Penjualan sampah') {
    // Get user's current balance
    const user = await db('users').where('id', userId).first();
    if (!user) throw new Error('User not found');

    const currentBalance = parseFloat(user.saldo) || 0;
    const newBalance = currentBalance + parseFloat(amount);

    // Generate transaction code
    const kodeTransaksi = await this.generateKodeTransaksi();

    // Create transaction record
    const transactionData = {
      user_id: userId,
      submission_id: submissionId,
      kode_transaksi: kodeTransaksi,
      jenis: 'kredit',
      jumlah: amount,
      saldo_sebelum: currentBalance,
      saldo_sesudah: newBalance,
      deskripsi: description,
      kategori: 'penjualan_sampah',
      status: 'completed'
    };

    const transaction = await this.create(transactionData);

    // Update user balance
    await db('users')
      .where('id', userId)
      .update({ saldo: newBalance, updated_at: new Date() });

    return transaction;
  }

  static async createWithdrawalTransaction(userId, amount, metadata = {}) {
    // Get user's current balance
    const user = await db('users').where('id', userId).first();
    if (!user) throw new Error('User not found');

    const currentBalance = parseFloat(user.saldo) || 0;
    
    if (currentBalance < amount) {
      throw new Error('Insufficient balance');
    }

    const newBalance = currentBalance - parseFloat(amount);

    // Generate transaction code
    const kodeTransaksi = await this.generateKodeTransaksi();

    // Create transaction record
    const transactionData = {
      user_id: userId,
      kode_transaksi: kodeTransaksi,
      jenis: 'debit',
      jumlah: amount,
      saldo_sebelum: currentBalance,
      saldo_sesudah: newBalance,
      deskripsi: 'Penarikan saldo',
      kategori: 'penarikan_saldo',
      status: 'pending', // Withdrawal needs approval
      metadata: JSON.stringify(metadata)
    };

    const transaction = await this.create(transactionData);

    // Update user balance
    await db('users')
      .where('id', userId)
      .update({ saldo: newBalance, updated_at: new Date() });

    return transaction;
  }

  static async createBonusTransaction(userId, amount, description = 'Bonus') {
    // Get user's current balance
    const user = await db('users').where('id', userId).first();
    if (!user) throw new Error('User not found');

    const currentBalance = parseFloat(user.saldo) || 0;
    const newBalance = currentBalance + parseFloat(amount);

    // Generate transaction code
    const kodeTransaksi = await this.generateKodeTransaksi();

    // Create transaction record
    const transactionData = {
      user_id: userId,
      kode_transaksi: kodeTransaksi,
      jenis: 'kredit',
      jumlah: amount,
      saldo_sebelum: currentBalance,
      saldo_sesudah: newBalance,
      deskripsi: description,
      kategori: 'bonus',
      status: 'completed'
    };

    const transaction = await this.create(transactionData);

    // Update user balance
    await db('users')
      .where('id', userId)
      .update({ saldo: newBalance, updated_at: new Date() });

    return transaction;
  }

  static async updateStatus(id, status) {
    const [transaction] = await db('transactions')
      .where('id', id)
      .update({ 
        status, 
        updated_at: new Date() 
      })
      .returning('*');
    return transaction;
  }

  static async getStatsByDateRange(startDate, endDate, filters = {}) {
    let query = db('transactions')
      .whereBetween('created_at', [startDate, endDate]);

    if (filters.jenis) {
      query = query.where('jenis', filters.jenis);
    }
    if (filters.kategori) {
      query = query.where('kategori', filters.kategori);
    }
    if (filters.status) {
      query = query.where('status', filters.status);
    }

    const stats = await query
      .select(
        db.raw('COUNT(*) as total_transactions'),
        db.raw('SUM(CASE WHEN jenis = \'kredit\' THEN jumlah ELSE 0 END) as total_kredit'),
        db.raw('SUM(CASE WHEN jenis = \'debit\' THEN jumlah ELSE 0 END) as total_debit'),
        db.raw('SUM(CASE WHEN jenis = \'kredit\' THEN jumlah ELSE -jumlah END) as net_amount')
      )
      .first();

    return {
      total_transactions: parseInt(stats.total_transactions) || 0,
      total_kredit: parseFloat(stats.total_kredit) || 0,
      total_debit: parseFloat(stats.total_debit) || 0,
      net_amount: parseFloat(stats.net_amount) || 0
    };
  }

  static async getMonthlyStats(year = new Date().getFullYear()) {
    const stats = await db('transactions')
      .select(
        db.raw('EXTRACT(MONTH FROM created_at) as month'),
        db.raw('COUNT(*) as total_transactions'),
        db.raw('SUM(CASE WHEN jenis = \'kredit\' THEN jumlah ELSE 0 END) as total_kredit'),
        db.raw('SUM(CASE WHEN jenis = \'debit\' THEN jumlah ELSE 0 END) as total_debit')
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
        total_transactions: found ? parseInt(found.total_transactions) : 0,
        total_kredit: found ? parseFloat(found.total_kredit) : 0,
        total_debit: found ? parseFloat(found.total_debit) : 0
      };
    });

    return monthlyData;
  }

  static async findAll(filters = {}, pagination = {}) {
    let query = db('transactions')
      .select([
        'transactions.*',
        'users.nama as user_nama',
        'users.email as user_email',
        'submissions.kode_submission'
      ])
      .leftJoin('users', 'transactions.user_id', 'users.id')
      .leftJoin('submissions', 'transactions.submission_id', 'submissions.id');

    // Apply filters
    if (filters.user_id) {
      query = query.where('transactions.user_id', filters.user_id);
    }
    if (filters.jenis) {
      query = query.where('transactions.jenis', filters.jenis);
    }
    if (filters.kategori) {
      query = query.where('transactions.kategori', filters.kategori);
    }
    if (filters.status) {
      query = query.where('transactions.status', filters.status);
    }
    if (filters.date_from) {
      query = query.where('transactions.created_at', '>=', filters.date_from);
    }
    if (filters.date_to) {
      query = query.where('transactions.created_at', '<=', filters.date_to);
    }

    // Apply pagination
    if (pagination.page && pagination.limit) {
      const offset = (pagination.page - 1) * pagination.limit;
      query = query.limit(pagination.limit).offset(offset);
    }

    return await query.orderBy('transactions.created_at', 'desc');
  }

  static async count(filters = {}) {
    let query = db('transactions');

    if (filters.user_id) {
      query = query.where('user_id', filters.user_id);
    }
    if (filters.jenis) {
      query = query.where('jenis', filters.jenis);
    }
    if (filters.kategori) {
      query = query.where('kategori', filters.kategori);
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

    const result = await query.count('id as count').first();
    return parseInt(result.count);
  }
}

module.exports = Transaction;