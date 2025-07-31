const express = require('express');
const { body, validationResult } = require('express-validator');
const { 
  loadUsers, 
  saveUsers,
  loadSubmissions,
  saveSubmissions,
  loadBankSampah,
  saveBankSampah,
  generateId 
} = require('../utils/dataHelpers');

const router = express.Router();

// Get admin dashboard statistics
router.get('/dashboard', (req, res) => {
  try {
    const users = loadUsers();
    const submissions = loadSubmissions();
    const bankSampah = loadBankSampah();

    // Calculate date ranges
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisYear = new Date(now.getFullYear(), 0, 1);

    // User statistics
    const totalUsers = users.filter(u => u.role === 'user').length;
    const activeUsers = users.filter(u => u.role === 'user' && u.is_active).length;
    const newUsersThisMonth = users.filter(u => 
      u.role === 'user' && new Date(u.join_date) >= thisMonth
    ).length;

    // Submission statistics
    const totalSubmissions = submissions.length;
    const pendingSubmissions = submissions.filter(s => s.status === 'pending').length;
    const completedSubmissions = submissions.filter(s => s.status === 'completed').length;
    const submissionsThisMonth = submissions.filter(s => 
      new Date(s.created_at) >= thisMonth
    ).length;

    // Financial statistics
    const totalRevenue = submissions
      .filter(s => s.status === 'completed' && s.platform_fee)
      .reduce((sum, s) => sum + s.platform_fee, 0);
    
    const totalPayouts = submissions
      .filter(s => s.status === 'completed' && s.actual_transfer)
      .reduce((sum, s) => sum + s.actual_transfer, 0);

    const revenueThisMonth = submissions
      .filter(s => s.status === 'completed' && 
                   s.platform_fee && 
                   new Date(s.created_at) >= thisMonth)
      .reduce((sum, s) => sum + s.platform_fee, 0);

    // Waste statistics
    const totalWasteProcessed = submissions
      .filter(s => s.actual_weight)
      .reduce((sum, s) => sum + s.actual_weight, 0);

    const wasteByType = submissions
      .filter(s => s.actual_weight)
      .reduce((acc, s) => {
        acc[s.waste_type] = (acc[s.waste_type] || 0) + s.actual_weight;
        return acc;
      }, {});

    // Recent activities
    const recentSubmissions = submissions
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10)
      .map(s => {
        const user = users.find(u => u.id === s.user_id);
        return {
          ...s,
          user_name: user ? user.nama : 'Unknown'
        };
      });

    // Monthly trends (last 6 months)
    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const monthSubmissions = submissions.filter(s => {
        const subDate = new Date(s.created_at);
        return subDate >= monthDate && subDate < nextMonth;
      });

      monthlyTrends.push({
        month: monthDate.toISOString().substring(0, 7), // YYYY-MM format
        submissions: monthSubmissions.length,
        completed: monthSubmissions.filter(s => s.status === 'completed').length,
        revenue: monthSubmissions
          .filter(s => s.status === 'completed' && s.platform_fee)
          .reduce((sum, s) => sum + s.platform_fee, 0),
        weight: monthSubmissions
          .filter(s => s.actual_weight)
          .reduce((sum, s) => sum + s.actual_weight, 0)
      });
    }

    const dashboardStats = {
      users: {
        total: totalUsers,
        active: activeUsers,
        new_this_month: newUsersThisMonth,
        growth_rate: lastMonth > 0 ? ((newUsersThisMonth / totalUsers) * 100).toFixed(1) : 0
      },
      submissions: {
        total: totalSubmissions,
        pending: pendingSubmissions,
        completed: completedSubmissions,
        this_month: submissionsThisMonth,
        completion_rate: totalSubmissions > 0 ? ((completedSubmissions / totalSubmissions) * 100).toFixed(1) : 0
      },
      financial: {
        total_revenue: totalRevenue,
        total_payouts: totalPayouts,
        revenue_this_month: revenueThisMonth,
        profit_margin: totalPayouts > 0 ? ((totalRevenue / (totalRevenue + totalPayouts)) * 100).toFixed(1) : 0
      },
      waste: {
        total_processed: totalWasteProcessed,
        types: wasteByType,
        average_per_submission: totalSubmissions > 0 ? (totalWasteProcessed / completedSubmissions).toFixed(2) : 0
      },
      bank_sampah: {
        total: bankSampah.length,
        active: bankSampah.filter(bs => bs.is_active).length
      },
      recent_activities: recentSubmissions,
      monthly_trends: monthlyTrends
    };

    res.json(dashboardStats);

  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({
      error: 'Gagal mengambil data dashboard'
    });
  }
});

// Get all users with pagination and filtering
router.get('/users', (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role = '', status = '' } = req.query;
    const users = loadUsers();

    // Filter users
    let filteredUsers = users.filter(user => {
      const matchesSearch = !search || 
        user.nama.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase());
      
      const matchesRole = !role || user.role === role;
      const matchesStatus = !status || 
        (status === 'active' && user.is_active) ||
        (status === 'inactive' && !user.is_active);

      return matchesSearch && matchesRole && matchesStatus;
    });

    // Sort by join date (newest first)
    filteredUsers.sort((a, b) => new Date(b.join_date) - new Date(a.join_date));

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const paginatedUsers = filteredUsers.slice(offset, offset + parseInt(limit));

    // Remove passwords from response
    const safeUsers = paginatedUsers.map(({ password, ...user }) => user);

    res.json({
      users: safeUsers,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total: filteredUsers.length,
        total_pages: Math.ceil(filteredUsers.length / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({
      error: 'Gagal mengambil data pengguna'
    });
  }
});

// Get user details with submission history
router.get('/users/:id', (req, res) => {
  try {
    const users = loadUsers();
    const submissions = loadSubmissions();
    
    const user = users.find(u => u.id === parseInt(req.params.id));
    if (!user) {
      return res.status(404).json({
        error: 'Pengguna tidak ditemukan'
      });
    }

    const userSubmissions = submissions
      .filter(s => s.user_id === user.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const userStats = {
      total_submissions: userSubmissions.length,
      completed_submissions: userSubmissions.filter(s => s.status === 'completed').length,
      total_earnings: userSubmissions
        .filter(s => s.status === 'completed' && s.actual_transfer)
        .reduce((sum, s) => sum + s.actual_transfer, 0),
      total_weight: userSubmissions
        .filter(s => s.actual_weight)
        .reduce((sum, s) => sum + s.actual_weight, 0)
    };

    const { password, ...safeUser } = user;

    res.json({
      user: safeUser,
      stats: userStats,
      submissions: userSubmissions
    });

  } catch (error) {
    console.error('Admin get user error:', error);
    res.status(500).json({
      error: 'Gagal mengambil detail pengguna'
    });
  }
});

// Update user status (activate/deactivate)
router.patch('/users/:id/status', [
  body('is_active').isBoolean(),
  body('reason').optional().trim().isLength({ max: 200 })
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Data tidak valid',
        details: errors.array()
      });
    }

    const users = loadUsers();
    const userIndex = users.findIndex(u => u.id === parseInt(req.params.id));
    
    if (userIndex === -1) {
      return res.status(404).json({
        error: 'Pengguna tidak ditemukan'
      });
    }

    const { is_active, reason } = req.body;
    
    users[userIndex].is_active = is_active;
    users[userIndex].updated_at = new Date().toISOString();
    
    // Add to user history (in a real app, you'd have a separate history table)
    if (!users[userIndex].admin_notes) {
      users[userIndex].admin_notes = [];
    }
    
    users[userIndex].admin_notes.push({
      action: is_active ? 'activated' : 'deactivated',
      reason: reason || '',
      admin_id: req.user.id,
      timestamp: new Date().toISOString()
    });

    saveUsers(users);

    const { password, ...safeUser } = users[userIndex];

    res.json({
      message: `Pengguna berhasil ${is_active ? 'diaktifkan' : 'dinonaktifkan'}`,
      user: safeUser
    });

  } catch (error) {
    console.error('Admin update user status error:', error);  
    res.status(500).json({
      error: 'Gagal memperbarui status pengguna'
    });
  }
});

// Get all submissions with advanced filtering
router.get('/submissions', (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status = '', 
      waste_type = '', 
      date_from = '', 
      date_to = '',
      user_id = ''
    } = req.query;

    const submissions = loadSubmissions();
    const users = loadUsers();

    // Filter submissions
    let filteredSubmissions = submissions.filter(submission => {
      const matchesStatus = !status || submission.status === status;
      const matchesWasteType = !waste_type || submission.waste_type === waste_type;
      const matchesUser = !user_id || submission.user_id === parseInt(user_id);
      
      let matchesDateRange = true;
      if (date_from || date_to) {
        const subDate = new Date(submission.created_at);
        if (date_from && subDate < new Date(date_from)) matchesDateRange = false;
        if (date_to && subDate > new Date(date_to + 'T23:59:59.999Z')) matchesDateRange = false;
      }

      return matchesStatus && matchesWasteType && matchesUser && matchesDateRange;
    });

    // Sort by creation date (newest first)
    filteredSubmissions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const paginatedSubmissions = filteredSubmissions.slice(offset, offset + parseInt(limit));

    // Add user information to submissions
    const enrichedSubmissions = paginatedSubmissions.map(submission => {
      const user = users.find(u => u.id === submission.user_id);
      return {
        ...submission,
        user_name: user ? user.nama : 'Unknown',
        user_email: user ? user.email : 'Unknown'
      };
    });

    res.json({
      submissions: enrichedSubmissions,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total: filteredSubmissions.length,
        total_pages: Math.ceil(filteredSubmissions.length / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Admin get submissions error:', error);
    res.status(500).json({
      error: 'Gagal mengambil data submission'
    });
  }
});

// Update submission (for verification and completion)
router.patch('/submissions/:id', [
  body('status').optional().isIn(['pending', 'picked_up', 'verified', 'completed', 'cancelled']),
  body('actual_weight').optional().isFloat({ min: 0 }),
  body('admin_notes').optional().trim().isLength({ max: 500 }),
  body('pickup_driver').optional().trim()
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Data tidak valid',
        details: errors.array()
      });
    }

    const submissions = loadSubmissions();
    const submissionIndex = submissions.findIndex(s => s.id === parseInt(req.params.id));
    
    if (submissionIndex === -1) {
      return res.status(404).json({
        error: 'Submission tidak ditemukan'
      });
    }

    const { status, actual_weight, admin_notes, pickup_driver } = req.body;
    const submission = submissions[submissionIndex];

    // Update fields
    if (status) submission.status = status;
    if (actual_weight !== undefined) {
      submission.actual_weight = parseFloat(actual_weight);
      submission.actual_value = submission.actual_weight * submission.price_per_kg;
      submission.platform_fee = submission.actual_value * 0.10; // 10% platform fee
      submission.actual_transfer = submission.actual_value - submission.platform_fee;
    }
    if (admin_notes) submission.admin_notes = admin_notes;
    if (pickup_driver) submission.pickup_driver = pickup_driver;
    
    submission.updated_at = new Date().toISOString();

    // Add to status history
    if (status) {
      submission.status_history.push({
        status,
        timestamp: new Date().toISOString(),
        note: admin_notes || `Status diubah oleh admin`,
        updated_by: req.user.id
      });

      // Set specific timestamps
      if (status === 'picked_up') submission.pickup_time = new Date().toISOString();
      if (status === 'verified') submission.verification_time = new Date().toISOString();
      if (status === 'completed') submission.transfer_time = new Date().toISOString();
    }

    saveSubmissions(submissions);

    res.json({
      message: 'Submission berhasil diperbarui',
      submission: submissions[submissionIndex]
    });

  } catch (error) {
    console.error('Admin update submission error:', error);
    res.status(500).json({
      error: 'Gagal memperbarui submission'
    });
  }
});

// Generate reports
router.get('/reports/:type', (req, res) => {
  try {
    const { type } = req.params;
    const { date_from, date_to, format = 'json' } = req.query;

    const submissions = loadSubmissions();
    const users = loadUsers();

    // Filter by date range if provided
    let filteredSubmissions = submissions;
    if (date_from || date_to) {
      filteredSubmissions = submissions.filter(sub => {
        const subDate = new Date(sub.created_at);
        if (date_from && subDate < new Date(date_from)) return false;
        if (date_to && subDate > new Date(date_to + 'T23:59:59.999Z')) return false;
        return true;
      });
    }

    let reportData = {};

    switch (type) {
      case 'financial':
        reportData = {
          period: { date_from, date_to },
          summary: {
            total_submissions: filteredSubmissions.length,
            completed_submissions: filteredSubmissions.filter(s => s.status === 'completed').length,
            total_revenue: filteredSubmissions
              .filter(s => s.status === 'completed' && s.platform_fee)
              .reduce((sum, s) => sum + s.platform_fee, 0),
            total_payouts: filteredSubmissions
              .filter(s => s.status === 'completed' && s.actual_transfer)
              .reduce((sum, s) => sum + s.actual_transfer, 0)
          },
          by_month: generateMonthlyBreakdown(filteredSubmissions),
          by_waste_type: generateWasteTypeBreakdown(filteredSubmissions)
        };
        break;

      case 'waste':
        reportData = {
          period: { date_from, date_to },
          summary: {
            total_weight: filteredSubmissions
              .filter(s => s.actual_weight)
              .reduce((sum, s) => sum + s.actual_weight, 0),
            average_per_submission: calculateAverageWeight(filteredSubmissions)
          },
          by_type: generateWasteTypeBreakdown(filteredSubmissions),
          environmental_impact: calculateEnvironmentalImpact(filteredSubmissions)
        };
        break;

      case 'users':
        reportData = {
          period: { date_from, date_to },
          summary: {
            total_users: users.filter(u => u.role === 'user').length,
            active_users: users.filter(u => u.role === 'user' && u.is_active).length,
            new_users: users.filter(u => {
              if (!date_from && !date_to) return false;
              const joinDate = new Date(u.join_date);
              if (date_from && joinDate < new Date(date_from)) return false;
              if (date_to && joinDate > new Date(date_to + 'T23:59:59.999Z')) return false;
              return true;
            }).length
          },
          top_users: generateTopUsersReport(filteredSubmissions, users)
        };
        break;

      default:
        return res.status(400).json({
          error: 'Jenis laporan tidak valid',
          available_types: ['financial', 'waste', 'users']
        });
    }

    res.json({
      report_type: type,
      generated_at: new Date().toISOString(),
      data: reportData
    });

  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({
      error: 'Gagal membuat laporan'
    });
  }
});

// Helper functions for reports
function generateMonthlyBreakdown(submissions) {
  const monthly = {};
  submissions.forEach(sub => {
    const month = new Date(sub.created_at).toISOString().substring(0, 7);
    if (!monthly[month]) {
      monthly[month] = { submissions: 0, revenue: 0, payouts: 0 };
    }
    monthly[month].submissions++;
    if (sub.status === 'completed') {
      monthly[month].revenue += sub.platform_fee || 0;
      monthly[month].payouts += sub.actual_transfer || 0;
    }
  });
  return monthly;
}

function generateWasteTypeBreakdown(submissions) {
  const byType = {};
  submissions.forEach(sub => {
    if (!byType[sub.waste_type]) {
      byType[sub.waste_type] = { count: 0, weight: 0, value: 0 };
    }
    byType[sub.waste_type].count++;
    if (sub.actual_weight) byType[sub.waste_type].weight += sub.actual_weight;
    if (sub.actual_value) byType[sub.waste_type].value += sub.actual_value;
  });
  return byType;
}

function calculateAverageWeight(submissions) {
  const completedSubs = submissions.filter(s => s.actual_weight);
  return completedSubs.length > 0 
    ? (completedSubs.reduce((sum, s) => sum + s.actual_weight, 0) / completedSubs.length).toFixed(2)
    : 0;
}

function calculateEnvironmentalImpact(submissions) {
  const totalWeight = submissions
    .filter(s => s.actual_weight)
    .reduce((sum, s) => sum + s.actual_weight, 0);
  
  // Rough estimates for environmental impact
  return {
    co2_reduced_kg: (totalWeight * 2.5).toFixed(2), // 2.5kg CO2 per kg waste
    trees_equivalent: Math.floor(totalWeight / 20), // 1 tree per 20kg waste
    landfill_diverted_kg: totalWeight
  };
}

function generateTopUsersReport(submissions, users) {
  const userStats = {};
  
  submissions.forEach(sub => {
    if (!userStats[sub.user_id]) {
      const user = users.find(u => u.id === sub.user_id);
      userStats[sub.user_id] = {
        user_name: user ? user.nama : 'Unknown',
        submissions: 0,
        total_weight: 0,
        total_earnings: 0
      };
    }
    
    userStats[sub.user_id].submissions++;
    if (sub.actual_weight) userStats[sub.user_id].total_weight += sub.actual_weight;
    if (sub.status === 'completed' && sub.actual_transfer) {
      userStats[sub.user_id].total_earnings += sub.actual_transfer;
    }
  });

  return Object.values(userStats)
    .sort((a, b) => b.total_weight - a.total_weight)
    .slice(0, 10);
}

module.exports = router;