// models/Settings.js - Settings model
const { db } = require('../config/database');

class Settings {
  static async get(key) {
    const setting = await db('settings').where('key', key).first();
    if (!setting) return null;

    // Parse value based on type
    switch (setting.type) {
      case 'number':
        return parseFloat(setting.value);
      case 'boolean':
        return setting.value === 'true';
      case 'json':
        return JSON.parse(setting.value);
      default:
        return setting.value;
    }
  }

  static async set(key, value, type = 'string', description = null, isPublic = false) {
    let stringValue;
    
    // Convert value to string based on type
    switch (type) {
      case 'json':
        stringValue = JSON.stringify(value);
        break;
      case 'boolean':
        stringValue = value ? 'true' : 'false';
        break;
      default:
        stringValue = String(value);
    }

    const settingData = {
      key,
      value: stringValue,
      type,
      description,
      is_public: isPublic,
      updated_at: new Date()
    };

    // Try to update first, then insert if doesn't exist
    const existingSetting = await db('settings').where('key', key).first();
    
    if (existingSetting) {
      const [setting] = await db('settings')
        .where('key', key)
        .update(settingData)
        .returning('*');
      return setting;
    } else {
      const [setting] = await db('settings')
        .insert(settingData)
        .returning('*');
      return setting;
    }
  }

  static async getAll(publicOnly = false) {
    let query = db('settings');
    
    if (publicOnly) {
      query = query.where('is_public', true);
    }

    const settings = await query.orderBy('key');
    
    // Parse values based on their types
    return settings.reduce((acc, setting) => {
      let value;
      switch (setting.type) {
        case 'number':
          value = parseFloat(setting.value);
          break;
        case 'boolean':
          value = setting.value === 'true';
          break;
        case 'json':
          value = JSON.parse(setting.value);
          break;
        default:
          value = setting.value;
      }
      
      acc[setting.key] = {
        value,
        type: setting.type,
        description: setting.description,
        is_public: setting.is_public
      };
      
      return acc;
    }, {});
  }

  static async getAllRaw(publicOnly = false) {
    let query = db('settings');
    
    if (publicOnly) {
      query = query.where('is_public', true);
    }

    return await query.orderBy('key');
  }

  static async delete(key) {
    await db('settings').where('key', key).del();
  }

  static async bulkSet(settingsArray) {
    // settingsArray should be [{ key, value, type, description, is_public }]
    const upsertPromises = settingsArray.map(setting => 
      this.set(setting.key, setting.value, setting.type, setting.description, setting.is_public)
    );

    return await Promise.all(upsertPromises);
  }

  static async getByCategory(category) {
    // Get settings that start with category prefix (e.g., 'email_', 'payment_')
    const settings = await db('settings')
      .where('key', 'like', `${category}_%`)
      .orderBy('key');

    return settings.reduce((acc, setting) => {
      let value;
      switch (setting.type) {
        case 'number':
          value = parseFloat(setting.value);
          break;
        case 'boolean':
          value = setting.value === 'true';
          break;
        case 'json':
          value = JSON.parse(setting.value);
          break;
        default:
          value = setting.value;
      }
      
      // Remove category prefix from key
      const cleanKey = setting.key.replace(`${category}_`, '');
      acc[cleanKey] = value;
      
      return acc;
    }, {});
  }

  // Application settings helpers
  static async getAppSettings() {
    return {
      app_name: await this.get('app_name') || 'EcoMarga',
      app_version: await this.get('app_version') || '1.0.0',
      maintenance_mode: await this.get('maintenance_mode') || false,
      contact_info: await this.get('contact_info') || {}
    };
  }

  static async getPaymentSettings() {
    return {
      min_withdrawal_amount: await this.get('min_withdrawal_amount') || 50000,
      max_withdrawal_amount: await this.get('max_withdrawal_amount') || 1000000,
      supported_payment_methods: await this.get('supported_payment_methods') || ['bank_transfer']
    };
  }

  static async getEnvironmentalSettings() {
    return {
      co2_factor: await this.get('environmental_impact_co2') || 2.3,
      energy_factor: await this.get('environmental_impact_energy') || 1.5,
      water_factor: await this.get('environmental_impact_water') || 10
    };
  }

  static async getReferralSettings() {
    return {
      referral_bonus: await this.get('referral_bonus') || 5000,
      referral_enabled: await this.get('referral_enabled') || true
    };
  }

  static async getSystemSettings() {
    return {
      pickup_service_radius: await this.get('pickup_service_radius') || 15,
      max_submission_photos: await this.get('max_submission_photos') || 5,
      auto_approve_submissions: await this.get('auto_approve_submissions') || false
    };
  }

  // Default settings initialization
  static async initializeDefaults() {
    const defaultSettings = [
      { key: 'app_name', value: 'EcoMarga', type: 'string', description: 'Nama aplikasi', is_public: true },
      { key: 'app_version', value: '1.0.0', type: 'string', description: 'Versi aplikasi', is_public: true },
      { key: 'min_withdrawal_amount', value: 50000, type: 'number', description: 'Minimum jumlah penarikan saldo (Rupiah)', is_public: true },
      { key: 'max_withdrawal_amount', value: 1000000, type: 'number', description: 'Maksimum jumlah penarikan saldo per hari (Rupiah)', is_public: true },
      { key: 'referral_bonus', value: 5000, type: 'number', description: 'Bonus referral untuk user baru (Rupiah)', is_public: false },
      { key: 'environmental_impact_co2', value: 2.3, type: 'number', description: 'CO2 yang dikurangi per kg sampah (kg CO2)', is_public: true },
      { key: 'environmental_impact_energy', value: 1.5, type: 'number', description: 'Energi yang dihemat per kg sampah (kWh)', is_public: true },
      { key: 'environmental_impact_water', value: 10, type: 'number', description: 'Air yang dihemat per kg sampah (liter)', is_public: true },
      { key: 'pickup_service_radius', value: 15, type: 'number', description: 'Radius layanan pickup (km)', is_public: true },
      { key: 'maintenance_mode', value: false, type: 'boolean', description: 'Mode maintenance aplikasi', is_public: true },
      { 
        key: 'contact_info', 
        value: {
          phone: '021-12345678',
          email: 'support@ecomarga.com',
          address: 'Jl. Lingkungan Hijau No. 123, Jakarta',
          whatsapp: '081234567890'
        }, 
        type: 'json', 
        description: 'Informasi kontak customer service', 
        is_public: true 
      },
      { 
        key: 'supported_payment_methods', 
        value: ['bank_transfer', 'dana', 'ovo', 'gopay'], 
        type: 'json', 
        description: 'Metode pembayaran yang didukung', 
        is_public: true 
      }
    ];

    for (const setting of defaultSettings) {
      const existing = await this.get(setting.key);
      if (existing === null) {
        await this.set(setting.key, setting.value, setting.type, setting.description, setting.is_public);
      }
    }

    return true;
  }
}

module.exports = Settings;