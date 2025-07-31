// models/User.js - User model
const { db } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async findById(id) {
    return await db('users').where('id', id).first();
  }

  static async findByEmail(email) {
    return await db('users').where('email', email).first();
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

  static async updatePassword(id, hashedPassword) {
    const [user] = await db('users')
      .where('id', id)
      .update({ 
        password: hashedPassword, 
        updated_at: new Date() 
      })
      .returning('*');
    return user;
  }

  static async updateLastLogin(id) {
    await db('users')
      .where('id', id)
      .update({ last_login_at: new Date() });
  }

  static async updateAvatar(id, avatarUrl) {
    const [user] = await db('users')
      .where('id', id)
      .update({ 
        avatar_url: avatarUrl, 
        updated_at: new Date() 
      })
      .returning('*');
    return user;
  }

  static async updateBalance(id, amount, type = 'add') {
    const user = await this.findById(id);
    if (!user) throw new Error('User not found');

    const newBalance = type === 'add' 
      ? parseFloat(user.saldo) + parseFloat(amount)
      : parseFloat(user.saldo) - parseFloat(amount);

    if (newBalance < 0 && type === 'subtract') {
      throw new Error('Insufficient balance');
    }

    const [updatedUser] = await db('users')
      .where('id', id)
      .update({ 
        saldo: newBalance,
        updated_at: new Date() 
      })
      .returning('*');
    
    return updatedUser;
  }

  static async updateStats(id, submissionCount = 0, totalWeight = 0) {
    const [user] = await db('users')
      .where('id', id)
      .increment('total_submission', submissionCount)
      .increment('total_berat', totalWeight)
      .update({ updated_at: new Date() })
      .returning('*');
    return user;
  }

  static async deactivate(id) {
    const [user] = await db('users')
      .where('id', id)
      .update({ 
        is_active: false, 
        updated_at: new Date() 
      })
      .returning('*');
    return user;
  }

  static async findAll(filters = {}, pagination = {}) {
    let query = db('users').select([
      'id', 'nama', 'email', 'no_telepon', 'role', 
      'saldo', 'total_submission', 'total_berat', 
      'is_active', 'last_login_at', 'created_at'
    ]);

    // Apply filters
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

    // Apply pagination
    if (pagination.limit) {
      query = query.limit(pagination.limit);
    }
    if (pagination.offset) {
      query = query.offset(pagination.offset);
    }

    return await query.orderBy('created_at', 'desc');
  }

  static async count(filters = {}) {
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

    const result = await query.count('id as count').first();
    return parseInt(result.count);
  }

  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static async hashPassword(password) {
    return await bcrypt.hash(password, 12);
  }

  static async getLeaderboard(limit = 10) {
    return await db('users')
      .select([
        'id', 'nama', 'total_submission', 'total_berat',
        db.raw('RANK() OVER (ORDER BY total_berat DESC, total_submission DESC) as rank')
      ])
      .where('is_active', true)
      .where('role', 'user')
      .orderBy('total_berat', 'desc')
      .orderBy('total_submission', 'desc')
      .limit(limit);
  }

  static async getUserRank(userId) {
    const result = await db.raw(`
      SELECT rank FROM (
        SELECT id, RANK() OVER (ORDER BY total_berat DESC, total_submission DESC) as rank
        FROM users 
        WHERE is_active = true AND role = 'user'
      ) ranked_users 
      WHERE id = ?
    `, [userId]);
    
    return result.rows[0]?.rank || null;
  }
}

module.exports = User;