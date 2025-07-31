// models/BankSampah.js - Bank Sampah model
const { db } = require('../config/database');

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

  static async getNearby(latitude, longitude, radiusKm = 10) {
    // Using Haversine formula to calculate distance
    const query = `
      SELECT *, 
        (6371 * acos(cos(radians(?)) * cos(radians(latitude)) * 
        cos(radians(longitude) - radians(?)) + sin(radians(?)) * 
        sin(radians(latitude)))) AS distance_km
      FROM bank_sampah 
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        AND is_active = true
      HAVING distance_km <= ?
      ORDER BY distance_km
    `;

    const results = await db.raw(query, [latitude, longitude, latitude, radiusKm]);
    return results.rows;
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

  static async updateWastePrice(bankSampahId, wasteTypeId, newPrice) {
    // Check if price exists
    const existingPrice = await db('bank_sampah_waste_prices')
      .where({ bank_sampah_id: bankSampahId, waste_type_id: wasteTypeId })
      .first();

    if (existingPrice) {
      // Update existing price
      const [updatedPrice] = await db('bank_sampah_waste_prices')
        .where({ bank_sampah_id: bankSampahId, waste_type_id: wasteTypeId })
        .update({ 
          harga_per_kg: newPrice, 
          updated_at: new Date() 
        })
        .returning('*');
      return updatedPrice;
    } else {
      // Create new price
      const [newPriceRecord] = await db('bank_sampah_waste_prices')
        .insert({
          bank_sampah_id: bankSampahId,
          waste_type_id: wasteTypeId,
          harga_per_kg: newPrice,
          is_active: true
        })
        .returning('*');
      return newPriceRecord;
    }
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

  static async getTopBankSampah(limit = 5) {
    return await db('bank_sampah')
      .select([
        'bank_sampah.*',
        db.raw('COUNT(submissions.id) as total_submissions'),
        db.raw('SUM(submissions.berat) as total_berat')
      ])
      .leftJoin('submissions', 'bank_sampah.id', 'submissions.bank_sampah_id')
      .where('bank_sampah.is_active', true)
      .where('submissions.status', 'completed')
      .groupBy('bank_sampah.id')
      .orderBy('total_berat', 'desc')
      .limit(limit);
  }

  static async searchByLocation(kota, provinsi = null) {
    let query = db('bank_sampah')
      .where('is_active', true)
      .where('kota', 'ilike', `%${kota}%`);

    if (provinsi) {
      query = query.where('provinsi', 'ilike', `%${provinsi}%`);
    }

    return await query.orderBy('rating', 'desc');
  }

  static async getAvailableCities() {
    const cities = await db('bank_sampah')
      .select('kota', 'provinsi')
      .where('is_active', true)
      .groupBy('kota', 'provinsi')
      .orderBy('kota');

    return cities;
  }

  static async delete(id) {
    // Soft delete - deactivate instead of hard delete
    const [bankSampah] = await db('bank_sampah')
      .where('id', id)
      .update({ 
        is_active: false, 
        updated_at: new Date() 
      })
      .returning('*');
    return bankSampah;
  }

  static async calculateNewRating(bankSampahId, newRating) {
    // Get current rating data
    const bankSampah = await this.findById(bankSampahId);
    if (!bankSampah) throw new Error('Bank sampah not found');

    const currentTotalReviews = bankSampah.total_reviews || 0;
    const currentRating = bankSampah.rating || 0;

    // Calculate new average rating
    const totalRatingPoints = (currentRating * currentTotalReviews) + newRating;
    const newTotalReviews = currentTotalReviews + 1;
    const newAverageRating = totalRatingPoints / newTotalReviews;

    return {
      rating: Math.round(newAverageRating * 100) / 100, // Round to 2 decimal places
      total_reviews: newTotalReviews
    };
  }
}

module.exports = BankSampah;