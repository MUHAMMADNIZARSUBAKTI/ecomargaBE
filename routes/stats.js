// routes/stats.js - Statistics and analytics routes
const express = require('express');
const { 
  loadUsers, 
  loadSubmissions,
  loadBankSampah,
  getUserStats 
} = require('../utils/dataHelpers');

const router = express.Router();

// Get user's personal statistics
router.get('/user', (req, res) => {
  try {
    const stats = getUserStats(req.user.id);
    const submissions = loadSubmissions().filter(s => s.user_id === req.user.id);

    // Calculate monthly earnings (last 6 months)
    const monthlyEarnings = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const monthSubmissions = submissions.filter(s => {
        const subDate = new Date(s.created_at);
        return subDate >= monthDate && subDate < nextMonth && s.status === 'completed';
      });

      monthlyEarnings.push({
        month: monthDate.toISOString().substring(0, 7), // YYYY-MM format
        earnings: monthSubmissions.reduce((sum, s) => sum + (s.actual_transfer || 0), 0),
        submissions: monthSubmissions.length,
        weight: monthSubmissions.reduce((sum, s) => sum + (s.actual_weight || 0), 0)
      });
    }

    // Calculate waste type breakdown
    const wasteTypeBreakdown = submissions
      .filter(s => s.status === 'completed')
      .reduce((acc, s) => {
        if (!acc[s.waste_type]) {
          acc[s.waste_type] = { count: 0, weight: 0, earnings: 0 };
        }
        acc[s.waste_type].count++;
        acc[s.waste_type].weight += s.actual_weight || 0;
        acc[s.waste_type].earnings += s.actual_transfer || 0;
        return acc;
      }, {});

    // Recent activity (last 10 submissions)
    const recentActivity = submissions
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10)
      .map(s => ({
        id: s.id,
        waste_type: s.waste_type,
        weight: s.actual_weight || s.estimated_weight,
        status: s.status,
        created_at: s.created_at,
        earnings: s.actual_transfer || 0
      }));

    // Environmental impact
    const environmentalImpact = {
      co2_reduced: (stats.total_weight * 2.5).toFixed(2),
      trees_saved: Math.floor(stats.total_weight / 20),
      landfill_diverted: stats.total_weight,
      plastic_bottles_equivalent: Math.floor(stats.total_weight * 50), // assuming 20g per bottle
      energy_saved_kwh: (stats.total_weight * 1.2).toFixed(2)
    };

    res.json({
      basic_stats: stats,
      monthly_earnings: monthlyEarnings,
      waste_type_breakdown: wasteTypeBreakdown,
      recent_activity: recentActivity,
      environmental_impact: environmentalImpact
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      error: 'Gagal mengambil statistik pengguna'
    });
  }
});

// Get general platform statistics (public)
router.get('/platform', (req, res) => {
  try {
    const users = loadUsers().filter(u => u.role === 'user');
    const submissions = loadSubmissions();
    const bankSampah = loadBankSampah();

    // Basic platform stats
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.is_active).length;
    const totalSubmissions = submissions.length;
    const completedSubmissions = submissions.filter(s => s.status === 'completed').length;
    const totalBankSampah = bankSampah.filter(bs => bs.is_active).length;

    // Weight and earnings
    const totalWeight = submissions
      .filter(s => s.actual_weight)
      .reduce((sum, s) => sum + s.actual_weight, 0);

    const totalEarnings = submissions
      .filter(s => s.status === 'completed' && s.actual_transfer)
      .reduce((sum, s) => sum + s.actual_transfer, 0);

    // Environmental impact
    const environmentalImpact = {
      total_co2_reduced: (totalWeight * 2.5).toFixed(2),
      total_trees_saved: Math.floor(totalWeight / 20),
      total_landfill_diverted: totalWeight
    };

    // Waste type statistics
    const wasteTypeStats = submissions
      .filter(s => s.actual_weight)
      .reduce((acc, s) => {
        if (!acc[s.waste_type]) {
          acc[s.waste_type] = { count: 0, weight: 0 };
        }
        acc[s.waste_type].count++;
        acc[s.waste_type].weight += s.actual_weight;
        return acc;
      }, {});

    // Monthly growth (last 12 months)
    const monthlyGrowth = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const newUsers = users.filter(u => {
        const joinDate = new Date(u.join_date);
        return joinDate >= monthDate && joinDate < nextMonth;
      }).length;

      const monthSubmissions = submissions.filter(s => {
        const subDate = new Date(s.created_at);
        return subDate >= monthDate && subDate < nextMonth;
      }).length;

      monthlyGrowth.push({
        month: monthDate.toISOString().substring(0, 7),
        new_users: newUsers,
        submissions: monthSubmissions
      });
    }

    res.json({
      basic_stats: {
        total_users: totalUsers,
        active_users: activeUsers,
        total_submissions: totalSubmissions,
        completed_submissions: completedSubmissions,
        total_bank_sampah: totalBankSampah,
        completion_rate: totalSubmissions > 0 ? ((completedSubmissions / totalSubmissions) * 100).toFixed(1) : 0
      },
      totals: {
        weight: totalWeight,
        earnings: totalEarnings
      },
      environmental_impact: environmentalImpact,
      waste_type_stats: wasteTypeStats,
      monthly_growth: monthlyGrowth
    });

  } catch (error) {
    console.error('Get platform stats error:', error);
    res.status(500).json({
      error: 'Gagal mengambil statistik platform'
    });
  }
});

// Get leaderboard
router.get('/leaderboard', (req, res) => {
  try {
    const { type = 'weight', limit = 10 } = req.query;
    const users = loadUsers().filter(u => u.role === 'user' && u.is_active);
    const submissions = loadSubmissions();

    // Calculate user statistics
    const userStats = users.map(user => {
      const userSubmissions = submissions.filter(s => s.user_id === user.id && s.status === 'completed');
      
      return {
        id: user.id,
        nama: user.nama,
        total_weight: userSubmissions.reduce((sum, s) => sum + (s.actual_weight || 0), 0),
        total_earnings: userSubmissions.reduce((sum, s) => sum + (s.actual_transfer || 0), 0),
        total_submissions: userSubmissions.length,
        join_date: user.join_date,
        environmental_impact: {
          co2_reduced: userSubmissions.reduce((sum, s) => sum + (s.actual_weight || 0), 0) * 2.5,
          trees_saved: Math.floor(userSubmissions.reduce((sum, s) => sum + (s.actual_weight || 0), 0) / 20)
        }
      };
    });

    // Sort based on type
    let sortedUsers;
    switch (type) {
      case 'earnings':
        sortedUsers = userStats.sort((a, b) => b.total_earnings - a.total_earnings);
        break;
      case 'submissions':
        sortedUsers = userStats.sort((a, b) => b.total_submissions - a.total_submissions);
        break;
      case 'environmental':
        sortedUsers = userStats.sort((a, b) => b.environmental_impact.co2_reduced - a.environmental_impact.co2_reduced);
        break;
      case 'weight':
      default:
        sortedUsers = userStats.sort((a, b) => b.total_weight - a.total_weight);
        break;
    }

    // Add ranking
    const leaderboard = sortedUsers
      .slice(0, parseInt(limit))
      .map((user, index) => ({
        ...user,
        rank: index + 1
      }));

    // Find current user's position if authenticated
    let currentUserRank = null;
    if (req.user) {
      const currentUserIndex = sortedUsers.findIndex(u => u.id === req.user.id);
      if (currentUserIndex !== -1) {
        currentUserRank = {
          ...sortedUsers[currentUserIndex],
          rank: currentUserIndex + 1
        };
      }
    }

    res.json({
      leaderboard,
      current_user_rank: currentUserRank,
      leaderboard_type: type,
      total_participants: userStats.length
    });

  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      error: 'Gagal mengambil leaderboard'
    });
  }
});

// Get waste type trends
router.get('/trends/waste-types', (req, res) => {
  try {
    const { months = 6 } = req.query;
    const submissions = loadSubmissions().filter(s => s.status === 'completed');

    const trends = [];
    const now = new Date();
    
    for (let i = parseInt(months) - 1; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const monthSubmissions = submissions.filter(s => {
        const subDate = new Date(s.created_at);
        return subDate >= monthDate && subDate < nextMonth;
      });

      const wasteTypes = monthSubmissions.reduce((acc, s) => {
        if (!acc[s.waste_type]) {
          acc[s.waste_type] = { count: 0, weight: 0 };
        }
        acc[s.waste_type].count++;
        acc[s.waste_type].weight += s.actual_weight || 0;
        return acc;
      }, {});

      trends.push({
        month: monthDate.toISOString().substring(0, 7),
        waste_types: wasteTypes,
        total_submissions: monthSubmissions.length,
        total_weight: monthSubmissions.reduce((sum, s) => sum + (s.actual_weight || 0), 0)
      });
    }

    res.json({ trends });

  } catch (error) {
    console.error('Get waste type trends error:', error);
    res.status(500).json({
      error: 'Gagal mengambil tren jenis sampah'
    });
  }
});

// Get comparative stats (current month vs previous month)
router.get('/comparison', (req, res) => {
  try {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

    const submissions = loadSubmissions();
    const users = loadUsers().filter(u => u.role === 'user');

    // Current month stats
    const currentMonthSubmissions = submissions.filter(s => {
      const subDate = new Date(s.created_at);
      return subDate >= currentMonth;
    });

    // Previous month stats
    const previousMonthSubmissions = submissions.filter(s => {
      const subDate = new Date(s.created_at);
      return subDate >= previousMonth && subDate < currentMonth;
    });

    const calculateStats = (submissionList) => ({
      total_submissions: submissionList.length,
      completed_submissions: submissionList.filter(s => s.status === 'completed').length,
      total_weight: submissionList
        .filter(s => s.actual_weight)
        .reduce((sum, s) => sum + s.actual_weight, 0),
      total_earnings: submissionList
        .filter(s => s.status === 'completed' && s.actual_transfer)
        .reduce((sum, s) => sum + s.actual_transfer, 0)
    });

    const current = calculateStats(currentMonthSubmissions);
    const previous = calculateStats(previousMonthSubmissions);

    // Calculate percentage changes
    const calculateChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous * 100).toFixed(1);
    };

    const comparison = {
      current_month: current,
      previous_month: previous,
      changes: {
        submissions: calculateChange(current.total_submissions, previous.total_submissions),
        completed: calculateChange(current.completed_submissions, previous.completed_submissions),
        weight: calculateChange(current.total_weight, previous.total_weight),
        earnings: calculateChange(current.total_earnings, previous.total_earnings)
      }
    };

    // New users comparison
    const currentMonthUsers = users.filter(u => {
      const joinDate = new Date(u.join_date);
      return joinDate >= currentMonth;
    }).length;

    const previousMonthUsers = users.filter(u => {
      const joinDate = new Date(u.join_date);
      return joinDate >= previousMonth && joinDate < currentMonth;
    }).length;

    comparison.new_users = {
      current_month: currentMonthUsers,
      previous_month: previousMonthUsers,
      change: calculateChange(currentMonthUsers, previousMonthUsers)
    };

    res.json(comparison);

  } catch (error) {
    console.error('Get comparison stats error:', error);
    res.status(500).json({
      error: 'Gagal mengambil perbandingan statistik'
    });
  }
});

module.exports = router;