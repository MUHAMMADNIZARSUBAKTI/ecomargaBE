// models/Notification.js - Notification model
const { db } = require('../config/database');

class Notification {
  static async create(notificationData) {
    const [notification] = await db('notifications').insert(notificationData).returning('*');
    return notification;
  }

  static async findById(id) {
    return await db('notifications').where('id', id).first();
  }

  static async findByUserId(userId, filters = {}) {
    let query = db('notifications').where('user_id', userId);

    if (filters.is_read !== undefined) {
      query = query.where('is_read', filters.is_read);
    }
    if (filters.type) {
      query = query.where('type', filters.type);
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    }
    if (filters.offset) {
      query = query.offset(filters.offset);
    }

    return await query.orderBy('created_at', 'desc');
  }

  static async markAsRead(id, userId) {
    const [notification] = await db('notifications')
      .where({ id, user_id: userId })
      .update({
        is_read: true,
        read_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');
    
    return notification;
  }

  static async markAllAsRead(userId) {
    const updatedCount = await db('notifications')
      .where('user_id', userId)
      .where('is_read', false)
      .update({
        is_read: true,
        read_at: new Date(),
        updated_at: new Date()
      });

    return updatedCount;
  }

  static async getUnreadCount(userId) {
    const result = await db('notifications')
      .where('user_id', userId)
      .where('is_read', false)
      .count('id as count')
      .first();
    
    return parseInt(result.count);
  }

  static async deleteOld(daysOld = 30) {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    
    const deletedCount = await db('notifications')
      .where('created_at', '<', cutoffDate)
      .del();

    return deletedCount;
  }

  static async delete(id, userId) {
    const deletedCount = await db('notifications')
      .where({ id, user_id: userId })
      .del();
    
    return deletedCount > 0;
  }

  static async createSubmissionNotification(userId, submissionId, type, title, message, additionalData = {}) {
    const notificationData = {
      user_id: userId,
      title,
      message,
      type,
      data: JSON.stringify({
        submission_id: submissionId,
        ...additionalData
      })
    };

    return await this.create(notificationData);
  }

  static async createPaymentNotification(userId, transactionId, amount, title, message) {
    const notificationData = {
      user_id: userId,
      title,
      message,
      type: 'payment_received',
      data: JSON.stringify({
        transaction_id: transactionId,
        amount
      })
    };

    return await this.create(notificationData);
  }

  static async createSystemNotification(userId, title, message, additionalData = {}) {
    const notificationData = {
      user_id: userId,
      title,
      message,
      type: 'system_announcement',
      data: JSON.stringify(additionalData)
    };

    return await this.create(notificationData);
  }

  static async createBulkNotification(userIds, title, message, type = 'system_announcement', additionalData = {}) {
    const notifications = userIds.map(userId => ({
      user_id: userId,
      title,
      message,
      type,
      data: JSON.stringify(additionalData)
    }));

    return await db('notifications').insert(notifications).returning('*');
  }

  static async getNotificationStats(userId) {
    const stats = await db('notifications')
      .where('user_id', userId)
      .select([
        db.raw('COUNT(*) as total_notifications'),
        db.raw('COUNT(CASE WHEN is_read = false THEN 1 END) as unread_count'),
        db.raw('COUNT(CASE WHEN type = \'submission_update\' THEN 1 END) as submission_notifications'),
        db.raw('COUNT(CASE WHEN type = \'payment_received\' THEN 1 END) as payment_notifications'),
        db.raw('COUNT(CASE WHEN type = \'system_announcement\' THEN 1 END) as system_notifications')
      ])
      .first();

    return {
      total_notifications: parseInt(stats.total_notifications) || 0,
      unread_count: parseInt(stats.unread_count) || 0,
      submission_notifications: parseInt(stats.submission_notifications) || 0,
      payment_notifications: parseInt(stats.payment_notifications) || 0,
      system_notifications: parseInt(stats.system_notifications) || 0
    };
  }

  static async getRecentNotifications(userId, limit = 10) {
    return await db('notifications')
      .where('user_id', userId)
      .orderBy('created_at', 'desc')
      .limit(limit);
  }

  static async getNotificationsByType(userId, type, limit = 20) {
    return await db('notifications')
      .where('user_id', userId)
      .where('type', type)
      .orderBy('created_at', 'desc')
      .limit(limit);
  }

  static async countByUserId(userId, filters = {}) {
    let query = db('notifications').where('user_id', userId);

    if (filters.is_read !== undefined) {
      query = query.where('is_read', filters.is_read);
    }
    if (filters.type) {
      query = query.where('type', filters.type);
    }

    const result = await query.count('id as count').first();
    return parseInt(result.count);
  }

  // Admin functions
  static async findAll(filters = {}, pagination = {}) {
    let query = db('notifications')
      .select([
        'notifications.*',
        'users.nama as user_nama',
        'users.email as user_email'
      ])
      .leftJoin('users', 'notifications.user_id', 'users.id');

    if (filters.user_id) {
      query = query.where('notifications.user_id', filters.user_id);
    }
    if (filters.type) {
      query = query.where('notifications.type', filters.type);
    }
    if (filters.is_read !== undefined) {
      query = query.where('notifications.is_read', filters.is_read);
    }
    if (filters.date_from) {
      query = query.where('notifications.created_at', '>=', filters.date_from);
    }
    if (filters.date_to) {
      query = query.where('notifications.created_at', '<=', filters.date_to);
    }

    if (pagination.page && pagination.limit) {
      const offset = (pagination.page - 1) * pagination.limit;
      query = query.limit(pagination.limit).offset(offset);
    }

    return await query.orderBy('notifications.created_at', 'desc');
  }

  static async count(filters = {}) {
    let query = db('notifications');

    if (filters.user_id) {
      query = query.where('user_id', filters.user_id);
    }
    if (filters.type) {
      query = query.where('type', filters.type);
    }
    if (filters.is_read !== undefined) {
      query = query.where('is_read', filters.is_read);
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

  static async getSystemStats() {
    const stats = await db('notifications')
      .select([
        db.raw('COUNT(*) as total_notifications'),
        db.raw('COUNT(CASE WHEN is_read = false THEN 1 END) as total_unread'),
        db.raw('COUNT(DISTINCT user_id) as total_users_notified'),
        db.raw('AVG(CASE WHEN read_at IS NOT NULL THEN EXTRACT(EPOCH FROM (read_at - created_at))/3600 ELSE NULL END) as avg_read_time_hours')
      ])
      .first();

    const typeStats = await db('notifications')
      .select('type')
      .count('id as count')
      .groupBy('type')
      .orderBy('count', 'desc');

    return {
      total_notifications: parseInt(stats.total_notifications) || 0,
      total_unread: parseInt(stats.total_unread) || 0,
      total_users_notified: parseInt(stats.total_users_notified) || 0,
      avg_read_time_hours: parseFloat(stats.avg_read_time_hours) || 0,
      type_distribution: typeStats.map(stat => ({
        type: stat.type,
        count: parseInt(stat.count)
      }))
    };
  }
}

module.exports = Notification;