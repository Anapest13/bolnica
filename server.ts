import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cors from 'cors';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import multer from 'multer';
import fs from 'fs';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import dns from 'dns';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const resolveMx = promisify(dns.resolveMx);

function renderStatusPage(title: string, message: string, isSuccess: boolean) {
  return `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
            body { 
                font-family: 'Inter', sans-serif; 
                background-color: #f8fafc; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                min-height: 100vh; 
                margin: 0;
                color: #0f172a;
            }
            .card {
                background: white;
                padding: 3rem;
                border-radius: 2.5rem;
                box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
                max-width: 450px;
                width: 90%;
                text-align: center;
            }
            .icon {
                width: 64px;
                height: 64px;
                margin: 0 auto 1.5rem;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 1.25rem;
            }
            .icon-success { background-color: #f0fdfa; color: #0d9488; }
            .icon-error { background-color: #fef2f2; color: #ef4444; }
            h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; }
            p { color: #64748b; line-height: 1.6; margin-bottom: 2rem; }
            .btn {
                display: inline-block;
                background-color: #0d9488;
                color: white;
                padding: 0.75rem 1.5rem;
                border-radius: 1rem;
                text-decoration: none;
                font-weight: 600;
                transition: all 0.2s;
            }
            .btn:hover { background-color: #0f766e; transform: translateY(-1px); }
            .redirect-text { font-size: 0.875rem; color: #94a3b8; margin-top: 1.5rem; }
        </style>
    </head>
    <body>
        <div class="card">
            <div class="icon ${isSuccess ? 'icon-success' : 'icon-error'}">
                ${isSuccess 
                    ? '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
                    : '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>'
                }
            </div>
            <h1>${title}</h1>
            <p>${message}</p>
            <a href="/" class="btn">Вернуться на главную</a>
            ${isSuccess ? '<div class="redirect-text">Вы будете перенаправлены автоматически через 5 секунд...</div><script>setTimeout(() => window.location.href = "/", 5000)</script>' : ''}
        </div>
    </body>
    </html>
  `;
}

async function checkEmailDomain(email: string): Promise<boolean> {
  const domain = email.split('@')[1];
  if (!domain) return false;
  try {
    const mx = await resolveMx(domain);
    return mx && mx.length > 0;
  } catch (e) {
    // If MX check fails, fallback to A record check as some domains use A records for mail
    try {
      const resolve4 = promisify(dns.resolve4);
      const addresses = await resolve4(domain);
      return addresses && addresses.length > 0;
    } catch (e2) {
      return false;
    }
  }
}

dotenv.config();

// Configure Nodemailer for Yandex
if (!process.env.YANDEX_USER || !process.env.YANDEX_PASS) {
  console.warn('⚠️ ВНИМАНИЕ: Переменные окружения YANDEX_USER или YANDEX_PASS не установлены. Отправка писем не будет работать.');
}

const transporter = nodemailer.createTransport({
  host: 'smtp.yandex.ru',
  port: 465,
  secure: true,
  auth: {
    user: process.env.YANDEX_USER,
    pass: process.env.YANDEX_PASS,
  },
  family: 4, // Force IPv4 to avoid ENETUNREACH on some hosts
  connectionTimeout: 20000,
  greetingTimeout: 20000,
  socketTimeout: 30000,
  tls: {
    rejectUnauthorized: false // Helps with some proxy/firewall issues
  }
});

// Verify SMTP connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ ОШИБКА ПОЧТОВОГО СЕРВЕРА (SMTP):', error.message);
    console.error('Убедитесь, что в Яндексе включен доступ через почтовые клиенты и создан "Пароль приложения".');
  } else {
    console.log('✅ Почтовый сервер Яндекс готов к работе');
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// MySQL Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'medical_db',
  port: parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
  ssl: process.env.DB_HOST && !process.env.DB_HOST.includes('localhost') ? { rejectUnauthorized: false } : undefined
});

async function initDb() {
  try {
    console.log('Connecting to MySQL...');
    // Create database if it doesn't exist (requires appropriate permissions)
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      port: parseInt(process.env.DB_PORT || '3306'),
      ssl: process.env.DB_HOST && !process.env.DB_HOST.includes('localhost') ? { rejectUnauthorized: false } : undefined
    });
    
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'medical_db'}\``);
    await connection.end();
    console.log(`Database "${process.env.DB_NAME || 'medical_db'}" verified/created.`);

    await pool.query(`USE \`${process.env.DB_NAME || 'medical_db'}\``);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS specialties (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS doctors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        specialty_id INT,
        experience INT,
        rating DECIMAL(3,2) DEFAULT 0,
        photo TEXT,
        description TEXT,
        education TEXT,
        bio TEXT,
        FOREIGN KEY (specialty_id) REFERENCES specialties(id)
      )
    `);

    // Add columns if they don't exist (for existing databases)
    try {
      await pool.query('ALTER TABLE doctors ADD COLUMN education TEXT');
    } catch (e) {}
    try {
      await pool.query('ALTER TABLE doctors ADD COLUMN bio TEXT');
    } catch (e) {}

    await pool.query(`
      CREATE TABLE IF NOT EXISTS news (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        image TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS patients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        role ENUM('patient', 'admin') DEFAULT 'patient',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure created_at exists in patients
    try {
      await pool.query('ALTER TABLE patients ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    } catch (e) {}

    // Ensure role exists in patients
    try {
      await pool.query("ALTER TABLE patients ADD COLUMN role ENUM('patient', 'admin') DEFAULT 'patient'");
    } catch (e) {}

    // Ensure phone exists in patients
    try {
      await pool.query("ALTER TABLE patients ADD COLUMN phone VARCHAR(50)");
    } catch (e) {}

    // Ensure name exists in patients
    try {
      await pool.query("ALTER TABLE patients ADD COLUMN name VARCHAR(255)");
    } catch (e) {}

    // Ensure email exists in patients
    try {
      await pool.query("ALTER TABLE patients ADD COLUMN email VARCHAR(255)");
    } catch (e) {}

    // Ensure password exists in patients
    try {
      await pool.query("ALTER TABLE patients ADD COLUMN password VARCHAR(255)");
    } catch (e) {}

    // Add reset and verification columns
    try {
      await pool.query("ALTER TABLE patients ADD COLUMN reset_token VARCHAR(255)");
    } catch (e) {}
    try {
      await pool.query("ALTER TABLE patients ADD COLUMN reset_token_expiry DATETIME");
    } catch (e) {}
    try {
      await pool.query("ALTER TABLE patients ADD COLUMN verification_token VARCHAR(255)");
    } catch (e) {}
    try {
      await pool.query("ALTER TABLE patients ADD COLUMN is_verified BOOLEAN DEFAULT FALSE");
    } catch (e) {}

    await pool.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        doctor_id INT,
        patient_id INT,
        date DATE NOT NULL,
        time TIME NOT NULL,
        reason TEXT,
        notes TEXT,
        status ENUM('scheduled', 'cancelled', 'completed') DEFAULT 'scheduled',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (doctor_id) REFERENCES doctors(id),
        FOREIGN KEY (patient_id) REFERENCES patients(id)
      )
    `);

    // Ensure notes exists in appointments
    try {
      await pool.query('ALTER TABLE appointments ADD COLUMN notes TEXT');
    } catch (e) {}

    // Ensure attachment_url exists in appointments
    try {
      await pool.query('ALTER TABLE appointments ADD COLUMN attachment_url TEXT');
    } catch (e) {}

    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        doctor_id INT,
        patient_id INT,
        appointment_id INT UNIQUE,
        rating INT NOT NULL,
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (doctor_id) REFERENCES doctors(id),
        FOREIGN KEY (patient_id) REFERENCES patients(id),
        FOREIGN KEY (appointment_id) REFERENCES appointments(id)
      )
    `);

    // Seed Data
    const [rows]: any = await pool.query('SELECT COUNT(*) as count FROM doctors');
    if (rows[0].count === 0) {
      const specs = ['Терапевт', 'Хирург', 'Офтальмолог', 'Оториноларинголог', 'Невролог', 'Кардиолог', 'Дерматолог', 'Педиатр'];
      for (const s of specs) {
        await pool.query('INSERT IGNORE INTO specialties (name) VALUES (?)', [s]);
      }

      // Ensure notes column exists in appointments
      try {
        await pool.query('ALTER TABLE appointments ADD COLUMN IF NOT EXISTS notes TEXT AFTER status');
      } catch (e) {
        // Fallback for older MySQL versions that don't support IF NOT EXISTS in ALTER TABLE
        try {
          await pool.query('ALTER TABLE appointments ADD COLUMN notes TEXT AFTER status');
        } catch (innerE) {}
      }

      // Ensure rating column exists in doctors
      try {
        await pool.query('ALTER TABLE doctors ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 5.00 AFTER description');
      } catch (e) {
        try {
          await pool.query('ALTER TABLE doctors ADD COLUMN rating DECIMAL(3,2) DEFAULT 5.00 AFTER description');
        } catch (innerE) {}
      }

      const doctors = [
        { name: 'Иванов Иван Иванович', specialty: 'Терапевт', exp: 15, rating: 4.9, photo: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=400', desc: 'Врач высшей категории.', edu: 'МГМУ им. Сеченова', bio: 'Опытный специалист в области терапии.' },
        { name: 'Петрова Анна Сергеевна', specialty: 'Педиатр', exp: 8, rating: 5.0, photo: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&q=80&w=400', desc: 'Заботливый педиатр.', edu: 'РНИМУ им. Пирогова', bio: 'Специализируется на детском здоровье.' }
      ];
      
      for (const d of doctors) {
        await pool.query(`
          INSERT INTO doctors (name, specialty_id, experience, rating, photo, description, education, bio) 
          VALUES (?, (SELECT id FROM specialties WHERE name = ?), ?, ?, ?, ?, ?, ?)
        `, [d.name, d.specialty, d.exp, d.rating, d.photo, d.desc, d.edu, d.bio]);
      }

      // Seed Patients
      const hashedPassword = await bcrypt.hash('patient123', 10);
      await pool.query(
        'INSERT IGNORE INTO patients (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)',
        ['Иван Иванов', 'ivan@example.com', hashedPassword, '+7 (999) 111-22-33', 'patient']
      );
      await pool.query(
        'INSERT IGNORE INTO patients (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)',
        ['Мария Петрова', 'maria@example.com', hashedPassword, '+7 (999) 444-55-66', 'patient']
      );
    }

    // Seed News
    const [newsRows]: any = await pool.query('SELECT COUNT(*) as count FROM news');
    if (newsRows[0].count === 0) {
      await pool.query(`
        INSERT INTO news (title, content, image) VALUES 
        ('Новое оборудование', 'Мы закупили современный аппарат МРТ для более точной диагностики.', 'https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&q=80&w=800'),
        ('График работы в праздники', 'Обратите внимание на изменение графика работы в майские праздники.', 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&q=80&w=800')
      `);
    }

    // Seed Admin if not exists
    const [admins]: any = await pool.query('SELECT * FROM patients WHERE role = ?', ['admin']);
    if (admins.length === 0) {
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(`
        INSERT INTO patients (name, email, password, phone, role, is_verified)
        VALUES (?, ?, ?, ?, ?, ?)
      `, ['Администратор', 'admin@med.ru', hashedPassword, '+79990000000', 'admin', true]);
      console.log('Admin account created: admin@med.ru / admin123');
    } else {
      // Ensure existing admin is verified
      await pool.query('UPDATE patients SET is_verified = true WHERE role = ?', ['admin']);
    }
    console.log('Database initialized');
  } catch (error: any) {
    console.error('--------------------------------------------------');
    console.error('❌ ОШИБКА ПОДКЛЮЧЕНИЯ К БАЗЕ ДАННЫХ:');
    console.error(error.message);
    console.error('--------------------------------------------------');
    console.error('Пожалуйста, проверьте ваш файл .env и убедитесь, что:');
    console.error('1. MySQL сервер запущен на порту ' + (process.env.DB_PORT || '3306'));
    console.error('2. Пользователь "' + (process.env.DB_USER || 'root') + '" имеет доступ.');
    console.error('3. Пароль в DB_PASSWORD указан верно.');
    console.error('--------------------------------------------------');
  }
}

async function startServer() {
  await initDb();
  
  const app = express();
  app.use(cors());
  app.use(express.json());

  // API Routes
  app.get('/api/doctors', async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT d.*, s.name as specialty 
        FROM doctors d 
        JOIN specialties s ON d.specialty_id = s.id
      `);
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.get('/api/specialties', async (req, res) => {
    try {
      const [rows]: any = await pool.query('SELECT id, name FROM specialties');
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, phone } = req.body;
    
    try {
      // ... (existing validation code)
      const domainExists = await checkEmailDomain(email);
      if (!domainExists) {
        return res.status(400).json({ error: 'Указанный email адрес не существует или недоступен' });
      }

      const [existing]: any = await pool.query('SELECT id FROM patients WHERE email = ?', [email]);
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Этот email уже зарегистрирован' });
      }

      const hashedPassword = bcrypt.hashSync(password, 10);
      const verificationToken = crypto.randomBytes(32).toString('hex');
      
      await pool.query(
        'INSERT INTO patients (name, email, password, phone, verification_token, is_verified) VALUES (?, ?, ?, ?, ?, ?)',
        [name, email, hashedPassword, phone, verificationToken, false]
      );

      // Determine App URL
      let appUrl = process.env.APP_URL;
      if (!appUrl || appUrl === 'MY_APP_URL' || appUrl === 'http://localhost:3000' || appUrl === 'https://bolnica.tuva.ru') {
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.get('host');
        appUrl = `${protocol}://${host}`;
      }

      const verificationLink = `${appUrl}/api/auth/verify-email?token=${verificationToken}`;

      try {
        console.log(`Attempting to send verification email to: ${email} using ${process.env.YANDEX_USER}. Link: ${verificationLink}`);
        await transporter.sendMail({
          from: `"ГБУЗ РТ Дзун-Хемчикский ММЦ" <${process.env.YANDEX_USER}>`,
          to: email,
          subject: 'Подтверждение регистрации',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
              <h1 style="color: #0d9488;">Добро пожаловать!</h1>
              <p style="color: #475569; font-size: 16px;">Для завершения регистрации, пожалуйста, подтвердите ваш email, нажав на кнопку ниже:</p>
              <a href="${verificationLink}" style="display: inline-block; background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">Подтвердить Email</a>
              <p style="color: #94a3b8; font-size: 12px;">Если кнопка не работает, скопируйте и вставьте эту ссылку в браузер:</p>
              <p style="color: #94a3b8; font-size: 12px;">${verificationLink}</p>
            </div>
          `,
        });
        res.json({ message: 'На вашу почту отправлено письмо для подтверждения регистрации' });
      } catch (mailError) {
        console.error('Mail Error:', mailError);
        res.status(500).json({ 
          error: 'Аккаунт создан, но не удалось отправить письмо с подтверждением. Пожалуйста, проверьте настройки YANDEX_USER и YANDEX_PASS.',
          details: 'Mail delivery failed'
        });
      }
    } catch (e) {
      console.error('Registration Error:', e);
      res.status(500).json({ error: 'Произошла ошибка при регистрации' });
    }
  });

  app.post('/api/auth/resend-verification', async (req, res) => {
    const { email } = req.body;
    try {
      const [rows]: any = await pool.query('SELECT * FROM patients WHERE email = ?', [email]);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Пользователь не найден' });
      }
      
      const user = rows[0];
      if (user.is_verified) {
        return res.status(400).json({ error: 'Email уже подтвержден' });
      }

      const verificationToken = crypto.randomBytes(32).toString('hex');
      await pool.query('UPDATE patients SET verification_token = ? WHERE id = ?', [verificationToken, user.id]);

      // Determine App URL
      let appUrl = process.env.APP_URL;
      if (!appUrl || appUrl === 'MY_APP_URL' || appUrl === 'http://localhost:3000' || appUrl === 'https://bolnica.tuva.ru') {
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.get('host');
        appUrl = `${protocol}://${host}`;
      }

      const verificationLink = `${appUrl}/api/auth/verify-email?token=${verificationToken}`;

      console.log(`Attempting to resend verification email to: ${email} using ${process.env.YANDEX_USER}. Link: ${verificationLink}`);
      await transporter.sendMail({
        from: `"ГБУЗ РТ Дзун-Хемчикский ММЦ" <${process.env.YANDEX_USER}>`,
        to: email,
        subject: 'Подтверждение регистрации (повторно)',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
            <h1 style="color: #0d9488;">Подтверждение регистрации</h1>
            <p style="color: #475569; font-size: 16px;">Вы запросили повторную отправку ссылки для подтверждения email. Пожалуйста, нажмите на кнопку ниже:</p>
            <a href="${verificationLink}" style="display: inline-block; background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">Подтвердить Email</a>
            <p style="color: #94a3b8; font-size: 12px;">Если кнопка не работает, скопируйте и вставьте эту ссылку в браузер:</p>
            <p style="color: #94a3b8; font-size: 12px;">${verificationLink}</p>
          </div>
        `,
      });

      res.json({ message: 'Письмо с подтверждением отправлено повторно' });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Ошибка при отправке письма' });
    }
  });

  app.get('/api/auth/verify-email', async (req, res) => {
    let { token } = req.query;
    if (typeof token !== 'string') {
      return res.status(400).send(renderStatusPage('Ошибка', 'Некорректный запрос.', false));
    }

    token = token.trim();

    try {
      const [rows]: any = await pool.query('SELECT * FROM patients WHERE verification_token = ?', [token]);
      if (rows.length === 0) {
        return res.status(400).send(renderStatusPage('Ошибка', 'Неверный или просроченный токен подтверждения.', false));
      }
      
      await pool.query('UPDATE patients SET is_verified = true, verification_token = NULL WHERE id = ?', [rows[0].id]);
      res.send(renderStatusPage('Успех!', 'Ваш email успешно подтвержден. Теперь вы можете войти в свой личный кабинет.', true));
    } catch (e) {
      res.status(500).send(renderStatusPage('Ошибка сервера', 'Произошла непредвиденная ошибка. Пожалуйста, попробуйте позже.', false));
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
      const [rows]: any = await pool.query('SELECT * FROM patients WHERE email = ?', [email]);
      const user = rows[0];
      if (user && bcrypt.compareSync(password, user.password)) {
        if (!user.is_verified) {
          return res.status(403).json({ error: 'Пожалуйста, подтвердите ваш email перед входом' });
        }
        res.json({ user: { id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role } });
      } else {
        res.status(401).json({ error: 'Неверный email или пароль' });
      }
    } catch (e) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
      const [rows]: any = await pool.query('SELECT * FROM patients WHERE email = ?', [email]);
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Пользователь с таким email не найден' });
      }
      
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour
      
      await pool.query('UPDATE patients SET reset_token = ?, reset_token_expiry = ? WHERE id = ?', [resetToken, resetTokenExpiry, rows[0].id]);
      
      // Determine App URL
      let appUrl = process.env.APP_URL;
      if (!appUrl || appUrl === 'MY_APP_URL' || appUrl === 'http://localhost:3000' || appUrl === 'https://bolnica.tuva.ru') {
        const protocol = req.headers['x-forwarded-proto'] || req.protocol;
        const host = req.get('host');
        appUrl = `${protocol}://${host}`;
      }

      const resetLink = `${appUrl}/reset-password?token=${resetToken}`;

      console.log(`Attempting to send reset password email to: ${email} using ${process.env.YANDEX_USER}. Link: ${resetLink}`);
      await transporter.sendMail({
        from: `"ГБУЗ РТ Дзун-Хемчикский ММЦ" <${process.env.YANDEX_USER}>`,
        to: email,
        subject: 'Восстановление пароля',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
            <h1 style="color: #0d9488;">Восстановление пароля</h1>
            <p style="color: #475569; font-size: 16px;">Вы получили это письмо, потому что запросили восстановление пароля. Пожалуйста, нажмите на кнопку ниже для установки нового пароля:</p>
            <a href="${resetLink}" style="display: inline-block; background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0;">Сбросить пароль</a>
            <p style="color: #94a3b8; font-size: 12px;">Ссылка действительна в течение 1 часа. Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.</p>
            <p style="color: #94a3b8; font-size: 12px;">Если кнопка не работает, скопируйте и вставьте эту ссылку в браузер:</p>
            <p style="color: #94a3b8; font-size: 12px;">${resetLink}</p>
          </div>
        `,
      });
      
      res.json({ success: true, message: 'Инструкции по восстановлению отправлены на вашу почту' });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Ошибка при отправке письма' });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    try {
      const [rows]: any = await pool.query(
        'SELECT * FROM patients WHERE reset_token = ? AND reset_token_expiry > NOW()',
        [token]
      );
      
      if (rows.length === 0) {
        return res.status(400).json({ error: 'Неверный или просроченный токен' });
      }
      
      const hashedPassword = bcrypt.hashSync(newPassword, 10);
      await pool.query(
        'UPDATE patients SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
        [hashedPassword, rows[0].id]
      );
      
      res.json({ success: true, message: 'Пароль успешно изменен' });
    } catch (e) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  // Middleware for Auth (Simple ID-based)
  const authenticate = async (req: any, res: any, next: any) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    try {
      const [rows]: any = await pool.query('SELECT id, email, role FROM patients WHERE id = ?', [userId]);
      const user = rows[0];
      if (!user) return res.status(401).json({ error: 'User not found' });
      req.user = user;
      next();
    } catch (e) {
      res.status(500).json({ error: 'Database error' });
    }
  };

  const isAdmin = (req: any, res: any, next: any) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
    next();
  };

  app.patch('/api/profile', authenticate, async (req: any, res) => {
    const { name, phone, password } = req.body;
    try {
      let query = 'UPDATE patients SET name = ?, phone = ?';
      let params = [name, phone];
      
      if (password) {
        const hashedPassword = bcrypt.hashSync(password, 10);
        query += ', password = ?';
        params.push(hashedPassword);
      }
      
      query += ' WHERE id = ?';
      params.push(req.user.id);
      
      await pool.query(query, params);
      
      const [rows]: any = await pool.query('SELECT id, name, email, phone, role FROM patients WHERE id = ?', [req.user.id]);
      res.json({ user: rows[0] });
    } catch (e) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.get('/api/doctors/:id/reviews', async (req, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT r.*, p.name as patientName
        FROM reviews r
        JOIN patients p ON r.patient_id = p.id
        WHERE r.doctor_id = ?
        ORDER BY r.created_at DESC
      `, [req.params.id]);
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.post('/api/reviews', authenticate, async (req: any, res) => {
    const { doctorId, appointmentId, rating, comment } = req.body;
    try {
      // Check if appointment belongs to user and is completed
      const [apts]: any = await pool.query(
        'SELECT * FROM appointments WHERE id = ? AND patient_id = ? AND status = ?',
        [appointmentId, req.user.id, 'completed']
      );
      
      if (apts.length === 0) {
        return res.status(400).json({ error: 'Invalid appointment for review' });
      }

      // Use ON DUPLICATE KEY UPDATE to handle editing
      await pool.query(
        'INSERT INTO reviews (doctor_id, patient_id, appointment_id, rating, comment) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment)',
        [doctorId, req.user.id, appointmentId, rating, comment]
      );
      
      // Update doctor rating
      const [avgRating]: any = await pool.query(
        'SELECT AVG(rating) as avg FROM reviews WHERE doctor_id = ?',
        [doctorId]
      );
      
      await pool.query('UPDATE doctors SET rating = ? WHERE id = ?', [avgRating[0].avg, doctorId]);
      
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.get('/api/appointments', authenticate, async (req: any, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT a.*, DATE_FORMAT(a.date, "%Y-%m-%d") as date, TIME_FORMAT(a.time, "%H:%i") as time, d.name as doctorName, s.name as specialty,
               r.rating as reviewRating, r.comment as reviewComment
        FROM appointments a
        JOIN doctors d ON a.doctor_id = d.id
        JOIN specialties s ON d.specialty_id = s.id
        LEFT JOIN reviews r ON a.id = r.appointment_id
        WHERE a.patient_id = ?
        ORDER BY a.date DESC, a.time DESC
      `, [req.user.id]);
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.get('/api/doctors/:id/busy-slots', authenticate, async (req: any, res) => {
    try {
      const [rows]: any = await pool.query(
        'SELECT DATE_FORMAT(date, "%Y-%m-%d") as date, TIME_FORMAT(time, "%H:%i") as time FROM appointments WHERE doctor_id = ? AND status != "cancelled"',
        [req.params.id]
      );
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.post('/api/appointments', authenticate, async (req: any, res) => {
    const { doctorId, date, time, reason } = req.body;
    try {
      // 1. Check if doctor is already busy at this time
      const [doctorBusy]: any = await pool.query(
        'SELECT id FROM appointments WHERE doctor_id = ? AND date = ? AND time = ? AND status != "cancelled"',
        [doctorId, date, time]
      );
      
      if (doctorBusy.length > 0) {
        return res.status(400).json({ error: 'Это время уже занято у данного врача' });
      }

      // 2. Check if user already has an appointment at this time
      const [userBusy]: any = await pool.query(
        'SELECT id FROM appointments WHERE patient_id = ? AND date = ? AND time = ? AND status != "cancelled"',
        [req.user.id, date, time]
      );

      if (userBusy.length > 0) {
        return res.status(400).json({ error: 'У вас уже есть запись на это время к другому специалисту' });
      }

      const [result]: any = await pool.query(
        'INSERT INTO appointments (doctor_id, patient_id, date, time, reason) VALUES (?, ?, ?, ?, ?)',
        [doctorId, req.user.id, date, time, reason]
      );
      res.json({ id: result.insertId });
    } catch (e) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.patch('/api/appointments/:id/cancel', authenticate, async (req: any, res) => {
    try {
      await pool.query(
        'UPDATE appointments SET status = ? WHERE id = ? AND patient_id = ?',
        ['cancelled', req.params.id, req.user.id]
      );
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  // Admin: View all appointments
  app.get('/api/admin/appointments', authenticate, isAdmin, async (req: any, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT a.*, DATE_FORMAT(a.date, "%Y-%m-%d") as date, TIME_FORMAT(a.time, "%H:%i") as time, d.name as doctorName, p.name as patientName, p.email as patientEmail, p.phone as patientPhone, s.name as specialty
        FROM appointments a
        LEFT JOIN doctors d ON a.doctor_id = d.id
        LEFT JOIN patients p ON a.patient_id = p.id
        LEFT JOIN specialties s ON d.specialty_id = s.id
        ORDER BY a.date DESC, a.time DESC
      `);
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.patch('/api/admin/appointments/:id/status', authenticate, isAdmin, async (req: any, res) => {
    const { status, notes, attachment_url } = req.body;
    const appointmentId = parseInt(req.params.id);
    
    if (isNaN(appointmentId)) {
      return res.status(400).json({ error: 'Invalid appointment ID' });
    }

    try {
      let query = 'UPDATE appointments SET status = ?';
      let params: any[] = [status];

      if (notes !== undefined) {
        query += ', notes = ?';
        params.push(notes);
      }

      if (attachment_url !== undefined) {
        query += ', attachment_url = ?';
        params.push(attachment_url);
      }

      query += ' WHERE id = ?';
      params.push(appointmentId);

      await pool.query(query, params);
      res.json({ success: true });
    } catch (e) {
      console.error('Update appointment error:', e);
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.post('/api/admin/appointments/:id/attachment', authenticate, isAdmin, upload.single('file'), async (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
  });

  app.delete('/api/admin/appointments/:id', authenticate, isAdmin, async (req: any, res) => {
    try {
      await pool.query('DELETE FROM appointments WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.get('/api/admin/stats', authenticate, isAdmin, async (req: any, res) => {
    try {
      console.log('Fetching admin stats...');
      const [totalApts]: any = await pool.query('SELECT COUNT(*) as count FROM appointments');
      const [totalPatients]: any = await pool.query('SELECT COUNT(*) as count FROM patients WHERE role = ?', ['patient']);
      const [totalDoctors]: any = await pool.query('SELECT COUNT(*) as count FROM doctors');
      const [completedApts]: any = await pool.query('SELECT COUNT(*) as count FROM appointments WHERE status = ?', ['completed']);
      
      const [monthlyApts]: any = await pool.query('SELECT COUNT(*) as count FROM appointments WHERE MONTH(date) = MONTH(CURRENT_DATE) AND YEAR(date) = YEAR(CURRENT_DATE)');
      const [cancelledApts]: any = await pool.query('SELECT COUNT(*) as count FROM appointments WHERE status = ?', ['cancelled']);
      const [avgRating]: any = await pool.query('SELECT COALESCE(AVG(rating), 0) as avg FROM doctors');
      
      const [topSpecialties]: any = await pool.query(`
        SELECT COALESCE(s.name, 'Общий профиль') as name, COUNT(a.id) as count 
        FROM appointments a 
        JOIN doctors d ON a.doctor_id = d.id 
        LEFT JOIN specialties s ON d.specialty_id = s.id 
        GROUP BY COALESCE(s.name, 'Общий профиль')
        ORDER BY count DESC 
        LIMIT 3
      `);

      res.json({
        appointments: totalApts[0]?.count || 0,
        patients: totalPatients[0]?.count || 0,
        doctors: totalDoctors[0]?.count || 0,
        completed: completedApts[0]?.count || 0,
        monthly: monthlyApts[0]?.count || 0,
        cancelled: cancelledApts[0]?.count || 0,
        avgRating: parseFloat(avgRating[0]?.avg || 0).toFixed(1),
        topSpecialties: Array.isArray(topSpecialties) ? topSpecialties : []
      });
    } catch (e) {
      console.error('Admin Stats Error:', e);
      res.status(500).json({ error: 'Database error fetching stats' });
    }
  });

  app.get('/api/admin/doctors', authenticate, isAdmin, async (req: any, res) => {
    try {
      const [rows] = await pool.query(`
        SELECT d.*, s.name as specialtyName 
        FROM doctors d 
        LEFT JOIN specialties s ON d.specialty_id = s.id
      `);
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.post('/api/admin/doctors', authenticate, isAdmin, async (req: any, res) => {
    const { name, specialtyName, photo, experience, education, bio } = req.body;
    try {
      // Find or create specialty
      let [specs]: any = await pool.query('SELECT id FROM specialties WHERE name = ?', [specialtyName]);
      let specialtyId;
      if (specs.length === 0) {
        const [result]: any = await pool.query('INSERT INTO specialties (name) VALUES (?)', [specialtyName]);
        specialtyId = result.insertId;
      } else {
        specialtyId = specs[0].id;
      }

      const [result]: any = await pool.query(
        'INSERT INTO doctors (name, specialty_id, photo, experience, education, bio, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, specialtyId, photo, experience, education, bio, bio]
      );
      res.json({ id: result.insertId });
    } catch (e) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.patch('/api/admin/doctors/:id', authenticate, isAdmin, async (req: any, res) => {
    const { name, specialtyName, photo, experience, education, bio } = req.body;
    try {
      // Find or create specialty
      let [specs]: any = await pool.query('SELECT id FROM specialties WHERE name = ?', [specialtyName]);
      let specialtyId;
      if (specs.length === 0) {
        const [result]: any = await pool.query('INSERT INTO specialties (name) VALUES (?)', [specialtyName]);
        specialtyId = result.insertId;
      } else {
        specialtyId = specs[0].id;
      }

      await pool.query(
        'UPDATE doctors SET name = ?, specialty_id = ?, photo = ?, experience = ?, education = ?, bio = ?, description = ? WHERE id = ?',
        [name, specialtyId, photo, experience, education, bio, bio, req.params.id]
      );
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.get('/api/news', async (req, res) => {
    try {
      const [rows] = await pool.query('SELECT * FROM news ORDER BY created_at DESC');
      res.json(rows);
    } catch (e) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.post('/api/admin/news', authenticate, isAdmin, async (req: any, res) => {
    const { title, content, image } = req.body;
    try {
      const [result]: any = await pool.query(
        'INSERT INTO news (title, content, image) VALUES (?, ?, ?)',
        [title, content, image]
      );
      res.json({ id: result.insertId });
    } catch (e) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.patch('/api/admin/news/:id', authenticate, isAdmin, async (req: any, res) => {
    const { title, content, image } = req.body;
    try {
      await pool.query(
        'UPDATE news SET title = ?, content = ?, image = ? WHERE id = ?',
        [title, content, image, req.params.id]
      );
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.delete('/api/admin/news/:id', authenticate, isAdmin, async (req: any, res) => {
    try {
      await pool.query('DELETE FROM news WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.delete('/api/admin/doctors/:id', authenticate, isAdmin, async (req: any, res) => {
    try {
      await pool.query('DELETE FROM doctors WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  app.get('/api/admin/patients', authenticate, isAdmin, async (req: any, res) => {
    try {
      console.log('Admin fetching patients list...');
      const [rows] = await pool.query('SELECT id, name, email, phone, created_at FROM patients');
      console.log(`Found ${Array.isArray(rows) ? rows.length : 0} patients`);
      res.json(rows);
    } catch (e) {
      console.error('Get patients error:', e);
      res.status(500).json({ error: 'Database error', details: e instanceof Error ? e.message : String(e) });
    }
  });

  app.delete('/api/admin/patients/:id', authenticate, isAdmin, async (req: any, res) => {
    try {
      // First delete appointments associated with this patient
      await pool.query('DELETE FROM appointments WHERE patient_id = ?', [req.params.id]);
      // Then delete the patient
      await pool.query('DELETE FROM patients WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  // Vite integration
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    const assetsPath = path.resolve(distPath, 'assets');
    
    console.log('--- PRODUCTION MODE ---');
    console.log('Dist Path:', distPath);
    console.log('Assets Path:', assetsPath);
    console.log('Dist folder exists:', fs.existsSync(distPath));
    console.log('Assets folder exists:', fs.existsSync(assetsPath));
    console.log('-----------------------');
    
    app.use(express.static(distPath));
    
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(3000, '0.0.0.0', () => {
    console.log('Server running on http://localhost:3000');
  }).on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error('\n❌ ОШИБКА: Порт 3000 уже занят другим процессом.');
      console.error('Вероятно, у вас уже запущена одна копия сервера в другом окне терминала.');
      console.error('Закройте старое окно или завершите процесс вручную.\n');
      process.exit(1);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer();
