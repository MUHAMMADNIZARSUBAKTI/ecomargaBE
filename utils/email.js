// utils/email.js - Email utility functions
const nodemailer = require('nodemailer');
const logger = require('./logger');

// Create transporter based on environment
const createTransporter = () => {
  const config = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  };

  // Add additional config for development
  if (process.env.NODE_ENV === 'development') {
    config.debug = true;
    config.logger = true;
  }

  return nodemailer.createTransporter(config);
};

// Test email connection
const testConnection = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    logger.info('Email server connection verified');
    return true;
  } catch (error) {
    logger.error('Email server connection failed:', error);
    return false;
  }
};

// Send email function
const sendEmail = async ({ to, subject, text, html, attachments = [] }) => {
  try {
    // Skip sending in test environment
    if (process.env.NODE_ENV === 'test') {
      logger.info(`Email would be sent to ${to}: ${subject}`);
      return { messageId: 'test-message-id' };
    }

    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html,
      attachments
    };
    
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent successfully to ${to}:`, { messageId: info.messageId });
    return info;
  } catch (error) {
    logger.error('Email sending failed:', { to, subject, error: error.message });
    throw error;
  }
};

// Send bulk emails
const sendBulkEmail = async (emails) => {
  const results = [];
  
  for (const email of emails) {
    try {
      const result = await sendEmail(email);
      results.push({ 
        to: email.to, 
        success: true, 
        messageId: result.messageId 
      });
    } catch (error) {
      results.push({ 
        to: email.to, 
        success: false, 
        error: error.message 
      });
    }
  }
  
  return results;
};

// Email templates
const emailTemplates = {
  welcome: (nama) => ({
    subject: 'Selamat Datang di EcoMarga!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #10b981; margin: 0;">EcoMarga</h1>
          <p style="color: #6b7280; margin: 5px 0;">Bank Sampah Digital</p>
        </div>
        
        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #10b981; margin-top: 0;">Selamat Datang, ${nama}!</h2>
          <p>Terima kasih telah bergabung dengan EcoMarga. Mari bersama-sama menjaga lingkungan dengan mendaur ulang sampah dan mendapatkan keuntungan dari sampah Anda.</p>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h3 style="color: #374151;">Cara Memulai:</h3>
          <ol style="color: #6b7280; line-height: 1.6;">
            <li>Kumpulkan sampah yang dapat didaur ulang (plastik, kertas, logam, dll)</li>
            <li>Buat submission melalui aplikasi dengan foto sampah</li>
            <li>Pilih bank sampah terdekat dengan harga terbaik</li>
            <li>Tunggu konfirmasi dari bank sampah</li>
            <li>Sampah akan dijemput sesuai jadwal</li>
            <li>Dapatkan saldo dari penjualan sampah Anda</li>
          </ol>
        </div>
        
        <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #1d4ed8; margin-top: 0;">💡 Tips untuk Memulai</h3>
          <ul style="color: #6b7280; line-height: 1.6;">
            <li>Pisahkan sampah berdasarkan jenisnya untuk harga terbaik</li>
            <li>Bersihkan sampah dari sisa makanan atau kotoran</li>
            <li>Timbang sampah sebelum submission untuk estimasi yang akurat</li>
            <li>Ambil foto yang jelas untuk mempercepat proses verifikasi</li>
          </ul>
        </div>
        
        <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
          <h3 style="color: #10b981; margin-top: 0;">🌱 Dampak Lingkungan Anda</h3>
          <p style="color: #6b7280;">Setiap 1 kg sampah yang Anda daur ulang dapat:</p>
          <div style="display: flex; justify-content: space-around; flex-wrap: wrap; margin-top: 15px;">
            <div style="text-align: center; margin: 10px;">
              <div style="font-size: 24px; font-weight: bold; color: #10b981;">2.3 kg</div>
              <div style="font-size: 12px; color: #6b7280;">CO2 dikurangi</div>
            </div>
            <div style="text-align: center; margin: 10px;">
              <div style="font-size: 24px; font-weight: bold; color: #10b981;">1.5 kWh</div>
              <div style="font-size: 12px; color: #6b7280;">Energi dihemat</div>
            </div>
            <div style="text-align: center; margin: 10px;">
              <div style="font-size: 24px; font-weight: bold; color: #10b981;">10 L</div>
              <div style="font-size: 12px; color: #6b7280;">Air dihemat</div>
            </div>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #6b7280;">Mulai berkontribusi untuk lingkungan yang lebih bersih hari ini!</p>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">
            Email ini dikirim otomatis. Jika Anda memiliki pertanyaan, hubungi kami di support@ecomarga.com
          </p>
        </div>
      </div>
    `
  }),

  submissionConfirmed: (nama, kodeSubmission, bankSampah) => ({
    subject: 'Submission Sampah Dikonfirmasi - EcoMarga',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #10b981; margin: 0;">EcoMarga</h1>
        </div>
        
        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #10b981; margin-top: 0;">✅ Submission Dikonfirmasi!</h2>
          <p>Halo <strong>${nama}</strong>,</p>
          <p>Submission sampah Anda telah dikonfirmasi oleh <strong>${bankSampah}</strong>.</p>
        </div>
        
        <div style="border: 1px solid #d1d5db; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #374151; margin-top: 0;">Detail Submission</h3>
          <p><strong>Kode Submission:</strong> ${kodeSubmission}</p>
          <p><strong>Bank Sampah:</strong> ${bankSampah}</p>
          <p><strong>Status:</strong> <span style="color: #10b981;">Dikonfirmasi</span></p>
        </div>
        
        <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #1d4ed8; margin-top: 0;">Langkah Selanjutnya</h3>
          <p>Tim kami akan segera menjemput sampah Anda sesuai jadwal yang telah ditentukan. Pastikan sampah sudah siap untuk dijemput.</p>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #6b7280;">Terima kasih atas kontribusi Anda untuk lingkungan yang lebih bersih!</p>
        </div>
      </div>
    `
  }),

  paymentReceived: (nama, jumlah, kodeTransaksi) => ({
    subject: 'Pembayaran Diterima - EcoMarga',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #10b981; margin: 0;">EcoMarga</h1>
        </div>
        
        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #10b981; margin-top: 0;">💰 Pembayaran Diterima!</h2>
          <p>Halo <strong>${nama}</strong>,</p>
          <p>Pembayaran untuk submission sampah Anda telah berhasil diproses.</p>
        </div>
        
        <div style="border: 1px solid #d1d5db; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
          <h3 style="color: #374151; margin-top: 0;">Detail Pembayaran</h3>
          <div style="font-size: 32px; font-weight: bold; color: #10b981; margin: 20px 0;">
            Rp ${jumlah.toLocaleString('id-ID')}
          </div>
          <p><strong>Kode Transaksi:</strong> ${kodeTransaksi}</p>
          <p><strong>Tanggal:</strong> ${new Date().toLocaleDateString('id-ID')}</p>
        </div>
        
        <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
          <p style="color: #10b981; font-weight: bold;">Saldo Anda telah diperbarui!</p>
          <p style="color: #6b7280;">Anda dapat melihat riwayat transaksi lengkap di aplikasi EcoMarga.</p>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #6b7280;">Terima kasih telah berkontribusi untuk lingkungan yang lebih bersih!</p>
        </div>
      </div>
    `
  }),

  passwordReset: (nama, resetUrl) => ({
    subject: 'Reset Password - EcoMarga',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #10b981; margin: 0;">EcoMarga</h1>
        </div>
        
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #d97706; margin-top: 0;">🔒 Reset Password</h2>
          <p>Halo <strong>${nama}</strong>,</p>
          <p>Kami menerima permintaan untuk reset password akun EcoMarga Anda.</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
            Reset Password
          </a>
        </div>
        
        <div style="background: #fee2e2; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #dc2626; margin-top: 0;">⚠️ Penting!</h3>
          <ul style="color: #6b7280; line-height: 1.6;">
            <li>Link ini akan kedaluwarsa dalam <strong>1 jam</strong></li>
            <li>Jika Anda tidak meminta reset password, abaikan email ini</li>
            <li>Jangan bagikan link ini kepada siapa pun</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #6b7280; font-size: 12px;">
            Jika tombol tidak berfungsi, salin dan tempel URL berikut ke browser Anda:<br>
            <a href="${resetUrl}" style="color: #10b981; word-break: break-all;">${resetUrl}</a>
          </p>
        </div>
      </div>
    `
  }),

  withdrawalApproved: (nama, jumlah, kodeTransaksi, bankInfo) => ({
    subject: 'Penarikan Saldo Disetujui - EcoMarga',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #10b981; margin: 0;">EcoMarga</h1>
        </div>
        
        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #10b981; margin-top: 0;">✅ Penarikan Saldo Disetujui!</h2>
          <p>Halo <strong>${nama}</strong>,</p>
          <p>Permintaan penarikan saldo Anda telah disetujui dan sedang diproses.</p>
        </div>
        
        <div style="border: 1px solid #d1d5db; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #374151; margin-top: 0;">Detail Penarikan</h3>
          <p><strong>Jumlah:</strong> Rp ${jumlah.toLocaleString('id-ID')}</p>
          <p><strong>Kode Transaksi:</strong> ${kodeTransaksi}</p>
          <p><strong>Bank Tujuan:</strong> ${bankInfo.bank_name}</p>
          <p><strong>Nomor Rekening:</strong> ${bankInfo.account_number}</p>
          <p><strong>Nama Pemilik:</strong> ${bankInfo.account_name}</p>
        </div>
        
        <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p style="color: #1d4ed8; font-weight: bold;">Dana akan dikirim dalam 1-3 hari kerja</p>
          <p style="color: #6b7280;">Pastikan informasi rekening Anda sudah benar. Jika ada kesalahan, segera hubungi customer service kami.</p>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #6b7280;">Terima kasih telah menggunakan EcoMarga!</p>
        </div>
      </div>
    `
  }),

  systemMaintenance: (nama, maintenanceInfo) => ({
    subject: 'Pemberitahuan Maintenance Sistem - EcoMarga',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #10b981; margin: 0;">EcoMarga</h1>
        </div>
        
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #d97706; margin-top: 0;">🔧 Maintenance Sistem</h2>
          <p>Halo <strong>${nama}</strong>,</p>
          <p>Kami akan melakukan maintenance sistem untuk meningkatkan kualitas layanan EcoMarga.</p>
        </div>
        
        <div style="border: 1px solid #d1d5db; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #374151; margin-top: 0;">Jadwal Maintenance</h3>
          <p><strong>Tanggal:</strong> ${maintenanceInfo.date}</p>
          <p><strong>Waktu:</strong> ${maintenanceInfo.time}</p>
          <p><strong>Estimasi Durasi:</strong> ${maintenanceInfo.duration}</p>
        </div>
        
        <div style="background: #fee2e2; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #dc2626; margin-top: 0;">Dampak Maintenance</h3>
          <ul style="color: #6b7280; line-height: 1.6;">
            <li>Aplikasi akan tidak dapat diakses sementara</li>
            <li>Semua transaksi akan ditunda</li>
            <li>Layanan customer service tetap tersedia melalui WhatsApp</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <p style="color: #6b7280;">Mohon maaf atas ketidaknyamanan ini. Terima kasih atas pengertian Anda.</p>
        </div>
      </div>
    `
  })
};

// Queue system for bulk emails (simple implementation)
class EmailQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }

  add(emailData) {
    this.queue.push(emailData);
    this.process();
  }

  async process() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const emailData = this.queue.shift();
      try {
        await sendEmail(emailData);
        // Add delay to prevent overwhelming the email server
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        logger.error('Failed to send queued email:', error);
      }
    }
    
    this.processing = false;
  }
}

const emailQueue = new EmailQueue();

module.exports = {
  sendEmail,
  sendBulkEmail,
  testConnection,
  emailTemplates,
  emailQueue
};