// routes/bankSampah.js - Bank Sampah management routes
const express = require('express');
const { body, validationResult } = require('express-validator');
const { optionalAuth } = require('../middleware/auth');
const { loadBankSampah, saveBankSampah, generateId } = require('../utils/dataHelpers');

const router = express.Router();

/**
 * Calculate distance between two coordinates using Haversine formula
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
};

// Get all bank sampah with optional filtering and sorting
router.get('/', optionalAuth, (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      kota = '',
      jenis_sampah = '',
      latitude,
      longitude,
      radius = 10, // km
      sort_by = 'rating' // rating, distance, nama
    } = req.query;

    let bankSampahList = loadBankSampah().filter(bs => bs.is_active);

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      bankSampahList = bankSampahList.filter(bs => 
        bs.nama.toLowerCase().includes(searchLower) ||
        bs.alamat.toLowerCase().includes(searchLower) ||
        bs.deskripsi.toLowerCase().includes(searchLower)
      );
    }

    // City filter
    if (kota) {
      bankSampahList = bankSampahList.filter(bs => 
        bs.kota.toLowerCase() === kota.toLowerCase()
      );
    }

    // Waste type filter
    if (jenis_sampah) {
      bankSampahList = bankSampahList.filter(bs => 
        bs.jenis_sampah_diterima.includes(jenis_sampah)
      );
    }

    // Location-based filtering
    if (latitude && longitude) {
      const userLat = parseFloat(latitude);
      const userLon = parseFloat(longitude);
      const maxRadius = parseFloat(radius);

      bankSampahList = bankSampahList.map(bs => ({
        ...bs,
        distance: calculateDistance(
          userLat, 
          userLon, 
          bs.koordinat.latitude, 
          bs.koordinat.longitude
        ).toFixed(2)
      })).filter(bs => parseFloat(bs.distance) <= maxRadius);
    }

    // Sorting
    switch (sort_by) {
      case 'distance':
        if (latitude && longitude) {
          bankSampahList.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
        }
        break;
      case 'nama':
        bankSampahList.sort((a, b) => a.nama.localeCompare(b.nama));
        break;
      case 'rating':
      default:
        bankSampahList.sort((a, b) => b.rating - a.rating);
        break;
    }

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const paginatedList = bankSampahList.slice(offset, offset + parseInt(limit));

    res.json({
      bank_sampah: paginatedList,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total: bankSampahList.length,
        total_pages: Math.ceil(bankSampahList.length / parseInt(limit))
      },
      filters_applied: {
        search: search || null,
        kota: kota || null,
        jenis_sampah: jenis_sampah || null,
        location: latitude && longitude ? { latitude, longitude, radius } : null,
        sort_by
      }
    });

  } catch (error) {
    console.error('Get bank sampah error:', error);
    res.status(500).json({
      error: 'Gagal mengambil data bank sampah'
    });
  }
});

// Get bank sampah by ID
router.get('/:id', optionalAuth, (req, res) => {
  try {
    const bankSampahList = loadBankSampah();
    const bankSampah = bankSampahList.find(bs => 
      bs.id === parseInt(req.params.id) && bs.is_active
    );

    if (!bankSampah) {
      return res.status(404).json({
        error: 'Bank sampah tidak ditemukan'
      });
    }

    // Add distance if user location is provided
    const { latitude, longitude } = req.query;
    let enrichedBankSampah = { ...bankSampah };
    
    if (latitude && longitude) {
      const distance = calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        bankSampah.koordinat.latitude,
        bankSampah.koordinat.longitude
      );
      enrichedBankSampah.distance = distance.toFixed(2);
    }

    res.json({
      bank_sampah: enrichedBankSampah
    });

  } catch (error) {
    console.error('Get bank sampah by ID error:', error);
    res.status(500).json({
      error: 'Gagal mengambil detail bank sampah'
    });
  }
});

// Get nearby bank sampah
router.get('/nearby/:latitude/:longitude', optionalAuth, (req, res) => {
  try {
    const { latitude, longitude } = req.params;
    const { radius = 5, limit = 5 } = req.query;

    const userLat = parseFloat(latitude);
    const userLon = parseFloat(longitude);
    const maxRadius = parseFloat(radius);

    if (isNaN(userLat) || isNaN(userLon)) {
      return res.status(400).json({
        error: 'Koordinat tidak valid'
      });
    }

    const bankSampahList = loadBankSampah().filter(bs => bs.is_active);

    // Calculate distances and filter by radius
    const nearbyBankSampah = bankSampahList
      .map(bs => ({
        ...bs,
        distance: calculateDistance(userLat, userLon, bs.koordinat.latitude, bs.koordinat.longitude)
      }))
      .filter(bs => bs.distance <= maxRadius)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, parseInt(limit))
      .map(bs => ({
        ...bs,
        distance: bs.distance.toFixed(2)
      }));

    res.json({
      location: { latitude: userLat, longitude: userLon },
      radius: maxRadius,
      found: nearbyBankSampah.length,
      bank_sampah: nearbyBankSampah
    });

  } catch (error) {
    console.error('Get nearby bank sampah error:', error);
    res.status(500).json({
      error: 'Gagal mencari bank sampah terdekat'
    });
  }
});

// Get bank sampah statistics
router.get('/stats/summary', (req, res) => {
  try {
    const bankSampahList = loadBankSampah();
    
    const stats = {
      total: bankSampahList.length,
      active: bankSampahList.filter(bs => bs.is_active).length,
      partners: bankSampahList.filter(bs => bs.is_partner).length,
      by_city: bankSampahList.reduce((acc, bs) => {
        acc[bs.kota] = (acc[bs.kota] || 0) + 1;
        return acc;
      }, {}),
      average_rating: bankSampahList.length > 0 
        ? (bankSampahList.reduce((sum, bs) => sum + bs.rating, 0) / bankSampahList.length).toFixed(1)
        : 0,
      total_reviews: bankSampahList.reduce((sum, bs) => sum + bs.total_reviews, 0),
      waste_types_supported: [...new Set(
        bankSampahList.flatMap(bs => bs.jenis_sampah_diterima)
      )].sort()
    };

    res.json({ stats });

  } catch (error) {
    console.error('Get bank sampah stats error:', error);
    res.status(500).json({
      error: 'Gagal mengambil statistik bank sampah'
    });
  }
});

// Search bank sampah by waste type
router.get('/search/by-waste-type/:wasteType', optionalAuth, (req, res) => {
  try {
    const { wasteType } = req.params;
    const { latitude, longitude, radius = 10 } = req.query;

    let bankSampahList = loadBankSampah()
      .filter(bs => bs.is_active && bs.jenis_sampah_diterima.includes(wasteType));

    // Add distance if location provided
    if (latitude && longitude) {
      const userLat = parseFloat(latitude);
      const userLon = parseFloat(longitude);
      const maxRadius = parseFloat(radius);

      bankSampahList = bankSampahList
        .map(bs => ({
          ...bs,
          distance: calculateDistance(userLat, userLon, bs.koordinat.latitude, bs.koordinat.longitude)
        }))
        .filter(bs => bs.distance <= maxRadius)
        .sort((a, b) => a.distance - b.distance)
        .map(bs => ({
          ...bs,
          distance: bs.distance.toFixed(2)
        }));
    } else {
      // Sort by rating if no location provided
      bankSampahList.sort((a, b) => b.rating - a.rating);
    }

    res.json({
      waste_type: wasteType,
      found: bankSampahList.length,
      bank_sampah: bankSampahList
    });

  } catch (error) {
    console.error('Search bank sampah by waste type error:', error);
    res.status(500).json({
      error: 'Gagal mencari bank sampah berdasarkan jenis sampah'
    });
  }
});

// Get available cities
router.get('/meta/cities', (req, res) => {
  try {
    const bankSampahList = loadBankSampah().filter(bs => bs.is_active);
    const cities = [...new Set(bankSampahList.map(bs => bs.kota))].sort();
    
    const citiesWithCount = cities.map(city => ({
      name: city,
      count: bankSampahList.filter(bs => bs.kota === city).length
    }));

    res.json({ cities: citiesWithCount });

  } catch (error) {
    console.error('Get cities error:', error);
    res.status(500).json({
      error: 'Gagal mengambil daftar kota'
    });
  }
});

// Get supported waste types
router.get('/meta/waste-types', (req, res) => {
  try {
    const bankSampahList = loadBankSampah().filter(bs => bs.is_active);
    const wasteTypes = [...new Set(
      bankSampahList.flatMap(bs => bs.jenis_sampah_diterima)
    )].sort();

    const wasteTypesWithCount = wasteTypes.map(type => ({
      name: type,
      supported_by: bankSampahList.filter(bs => bs.jenis_sampah_diterima.includes(type)).length
    }));

    res.json({ waste_types: wasteTypesWithCount });

  } catch (error) {
    console.error('Get waste types error:', error);
    res.status(500).json({
      error: 'Gagal mengambil jenis sampah yang didukung'
    });
  }
});

// Submit review for bank sampah (requires authentication)
router.post('/:id/review', optionalAuth, [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating harus antara 1-5'),
  body('comment').optional().trim().isLength({ max: 500 }).withMessage('Komentar maksimal 500 karakter')
], (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Login diperlukan untuk memberikan review'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Data tidak valid',
        details: errors.array()
      });
    }

    const bankSampahList = loadBankSampah();
    const bankSampahIndex = bankSampahList.findIndex(bs => 
      bs.id === parseInt(req.params.id) && bs.is_active
    );

    if (bankSampahIndex === -1) {
      return res.status(404).json({
        error: 'Bank sampah tidak ditemukan'
      });
    }

    const { rating, comment } = req.body;
    const bankSampah = bankSampahList[bankSampahIndex];

    // Initialize reviews array if not exists
    if (!bankSampah.reviews) {
      bankSampah.reviews = [];
    }

    // Check if user already reviewed
    const existingReviewIndex = bankSampah.reviews.findIndex(r => r.user_id === req.user.id);
    
    const newReview = {
      id: existingReviewIndex >= 0 ? bankSampah.reviews[existingReviewIndex].id : generateId(bankSampah.reviews),
      user_id: req.user.id,
      user_name: req.user.nama,
      rating: parseInt(rating),
      comment: comment || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (existingReviewIndex >= 0) {
      // Update existing review
      bankSampah.reviews[existingReviewIndex] = newReview;
    } else {
      // Add new review
      bankSampah.reviews.push(newReview);
      bankSampah.total_reviews += 1;
    }

    // Recalculate average rating
    const totalRating = bankSampah.reviews.reduce((sum, r) => sum + r.rating, 0);
    bankSampah.rating = parseFloat((totalRating / bankSampah.reviews.length).toFixed(1));
    bankSampah.updated_at = new Date().toISOString();

    saveBankSampah(bankSampahList);

    res.status(existingReviewIndex >= 0 ? 200 : 201).json({
      message: existingReviewIndex >= 0 ? 'Review berhasil diperbarui' : 'Review berhasil ditambahkan',
      review: newReview,
      new_rating: bankSampah.rating
    });

  } catch (error) {
    console.error('Submit review error:', error);
    res.status(500).json({
      error: 'Gagal mengirim review'
    });
  }
});

// Get reviews for specific bank sampah
router.get('/:id/reviews', (req, res) => {
  try {
    const { page = 1, limit = 10, sort = 'newest' } = req.query;
    
    const bankSampahList = loadBankSampah();
    const bankSampah = bankSampahList.find(bs => 
      bs.id === parseInt(req.params.id) && bs.is_active
    );

    if (!bankSampah) {
      return res.status(404).json({
        error: 'Bank sampah tidak ditemukan'
      });
    }

    let reviews = bankSampah.reviews || [];

    // Sort reviews
    switch (sort) {
      case 'oldest':
        reviews.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;
      case 'rating_high':
        reviews.sort((a, b) => b.rating - a.rating);
        break;
      case 'rating_low':
        reviews.sort((a, b) => a.rating - b.rating);
        break;
      case 'newest':
      default:
        reviews.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
    }

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const paginatedReviews = reviews.slice(offset, offset + parseInt(limit));

    // Calculate rating distribution
    const ratingDistribution = {
      5: reviews.filter(r => r.rating === 5).length,
      4: reviews.filter(r => r.rating === 4).length,
      3: reviews.filter(r => r.rating === 3).length,
      2: reviews.filter(r => r.rating === 2).length,
      1: reviews.filter(r => r.rating === 1).length
    };

    res.json({
      reviews: paginatedReviews,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total: reviews.length,
        total_pages: Math.ceil(reviews.length / parseInt(limit))
      },
      summary: {
        average_rating: bankSampah.rating,
        total_reviews: bankSampah.total_reviews,
        rating_distribution: ratingDistribution
      }
    });

  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({
      error: 'Gagal mengambil review'
    });
  }
});

module.exports = router;