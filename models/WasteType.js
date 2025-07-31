// models/WasteType.js - Waste Type model
const { db } = require('../config/database');

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

  static async delete(id) {
    // Soft delete - deactivate instead of hard delete
    const [wasteType] = await db('waste_types')
      .where('id', id)
      .update({ 
        is_active: false, 
        updated_at: new Date() 
      })
      .returning('*');
    return wasteType;
  }

  static async getKategoriList() {
    const result = await db('waste_types')
      .distinct('kategori')
      .where('is_active', true)
      .orderBy('kategori');
    
    return result.map(row => row.kategori);
  }

  static async getByKategori(kategori) {
    return await db('waste_types')
      .where('kategori', kategori)
      .where('is_active', true)
      .orderBy('nama', 'asc');
  }

  static async getPopularWasteTypes(limit = 10) {
    return await db('waste_types')
      .select([
        'waste_types.*',
        db.raw('COUNT(submissions.id) as submission_count'),
        db.raw('SUM(submissions.berat) as total_berat')
      ])
      .leftJoin('submissions', 'waste_types.id', 'submissions.waste_type_id')
      .where('waste_types.is_active', true)
      .where('submissions.status', 'completed')
      .groupBy('waste_types.id')
      .orderBy('submission_count', 'desc')
      .limit(limit);
  }

  static async getAveragePrice(wasteTypeId) {
    const result = await db('bank_sampah_waste_prices')
      .where('waste_type_id', wasteTypeId)
      .where('is_active', true)
      .avg('harga_per_kg as avg_price')
      .first();
    
    return parseFloat(result.avg_price) || 0;
  }

  static async getPriceRange(wasteTypeId) {
    const result = await db('bank_sampah_waste_prices')
      .where('waste_type_id', wasteTypeId)
      .where('is_active', true)
      .select(
        db.raw('MIN(harga_per_kg) as min_price'),
        db.raw('MAX(harga_per_kg) as max_price'),
        db.raw('AVG(harga_per_kg) as avg_price')
      )
      .first();
    
    return {
      min_price: parseFloat(result.min_price) || 0,
      max_price: parseFloat(result.max_price) || 0,
      avg_price: parseFloat(result.avg_price) || 0
    };
  }

  static async searchByName(searchTerm) {
    return await db('waste_types')
      .where('nama', 'ilike', `%${searchTerm}%`)
      .where('is_active', true)
      .orderBy('nama', 'asc');
  }

  static async getWithPrices(bankSampahId = null) {
    let query = db('waste_types')
      .select([
        'waste_types.*',
        'bank_sampah_waste_prices.harga_per_kg as current_price',
        'bank_sampah_waste_prices.bank_sampah_id'
      ])
      .leftJoin('bank_sampah_waste_prices', function() {
        this.on('waste_types.id', '=', 'bank_sampah_waste_prices.waste_type_id');
        if (bankSampahId) {
          this.andOn('bank_sampah_waste_prices.bank_sampah_id', '=', db.raw('?', [bankSampahId]));
        }
      })
      .where('waste_types.is_active', true);

    if (bankSampahId) {
      query = query.where(function() {
        this.where('bank_sampah_waste_prices.is_active', true)
            .orWhereNull('bank_sampah_waste_prices.id');
      });
    }

    return await query.orderBy('waste_types.kategori', 'asc').orderBy('waste_types.nama', 'asc');
  }

  static async getStats() {
    const totalWasteTypes = await db('waste_types')
      .where('is_active', true)
      .count('id as count')
      .first();

    const categoryCounts = await db('waste_types')
      .select('kategori')
      .count('id as count')
      .where('is_active', true)
      .groupBy('kategori')
      .orderBy('count', 'desc');

    const mostSubmittedWasteType = await db('waste_types')
      .select([
        'waste_types.nama',
        'waste_types.kategori',
        db.raw('COUNT(submissions.id) as submission_count')
      ])
      .leftJoin('submissions', 'waste_types.id', 'submissions.waste_type_id')
      .where('waste_types.is_active', true)
      .where('submissions.status', 'completed')
      .groupBy('waste_types.id', 'waste_types.nama', 'waste_types.kategori')
      .orderBy('submission_count', 'desc')
      .first();

    return {
      total_waste_types: parseInt(totalWasteTypes.count),
      category_counts: categoryCounts.map(cat => ({
        kategori: cat.kategori,
        count: parseInt(cat.count)
      })),
      most_submitted: mostSubmittedWasteType ? {
        nama: mostSubmittedWasteType.nama,
        kategori: mostSubmittedWasteType.kategori,
        submission_count: parseInt(mostSubmittedWasteType.submission_count)
      } : null
    };
  }

  static async bulkUpdatePrices(priceUpdates) {
    // priceUpdates should be an array of { id, harga_per_kg }
    const updatePromises = priceUpdates.map(update => 
      db('waste_types')
        .where('id', update.id)
        .update({ 
          harga_per_kg: update.harga_per_kg, 
          updated_at: new Date() 
        })
    );

    await Promise.all(updatePromises);
    return true;
  }

  static async getEnvironmentalImpact(wasteTypeId, weight) {
    const wasteType = await this.findById(wasteTypeId);
    if (!wasteType) return null;

    // Environmental impact factors per kg (these are example values)
    const environmentalFactors = {
      'Plastik': {
        co2_saved: 2.0, // kg CO2 per kg waste
        energy_saved: 1.5, // kWh per kg waste
        water_saved: 8 // liters per kg waste
      },
      'Kertas': {
        co2_saved: 1.8,
        energy_saved: 2.0,
        water_saved: 15
      },
      'Logam': {
        co2_saved: 4.0,
        energy_saved: 3.5,
        water_saved: 5
      },
      'Kaca': {
        co2_saved: 0.8,
        energy_saved: 1.2,
        water_saved: 3
      },
      'Elektronik': {
        co2_saved: 5.0,
        energy_saved: 4.0,
        water_saved: 10
      }
    };

    const factors = environmentalFactors[wasteType.kategori] || environmentalFactors['Plastik'];

    return {
      co2_saved: Math.round(factors.co2_saved * weight * 100) / 100,
      energy_saved: Math.round(factors.energy_saved * weight * 100) / 100,
      water_saved: Math.round(factors.water_saved * weight * 100) / 100
    };
  }
}

module.exports = WasteType;