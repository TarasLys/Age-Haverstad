// Скрипт массовой рассылки через Nodemailer с учетом вашего .env
// Для запуска: node scripts/send-bulk-mail.js

require('dotenv').config();
const nodemailer = require('nodemailer');

// Получаем адреса из .env
const toRaw = process.env.VITE_TO_EMAIL || '';
const recipients = toRaw.split(',').map(e => e.trim()).filter(Boolean);
const fromEmail = process.env.VITE_FROM_EMAIL || '';

// === НАСТРОЙТЕ SMTP ДЛЯ ВАШЕГО ПОЧТОВОГО ПРОВАЙДЕРА ===
// Пример для Gmail (используйте пароль приложения!)
// Для Яндекс, Mail.ru и других сервисов параметры другие
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: fromEmail,           // ваш email-отправитель
    pass: 'YOUR_APP_PASSWORD', // пароль приложения (НЕ обычный пароль!)
  },
});

// Пример письма
const mailOptions = {
  from: `"Age-Haverstad" <${fromEmail}>`,
  to: recipients, // массив адресов
  subject: 'Siste anbud og kart (автоматическая рассылка)',
  html: `
    <h2>Siste anbud og kart (automatisk utsending)</h2>
    <p>Часть 1 из 1</p>
    <table style="border-collapse:collapse;width:100%;margin-bottom:16px;">
      <thead>
        <tr>
          <th style="border:1px solid #eaeaea;padding:8px;">Dato</th>
          <th style="border:1px solid #eaeaea;padding:8px;">Tittel</th>
          <th style="border:1px solid #eaeaea;padding:8px;">Kjøper</th>
          <th style="border:1px solid #eaeaea;padding:8px;">Lenke</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="border: 1px solid #eaeaea; padding: 8px;">30.06.2025</td>
          <td style="border: 1px solid #eaeaea; padding: 8px;">Leieavtale lokaler til Moss kulturskole</td>
          <td style="border: 1px solid #eaeaea; padding: 8px;">MOSS KOMMUNALE EIENDOMSSELSKAP KF</td>
          <td style="border: 1px solid #eaeaea; padding: 8px;">
            <a href="https://www.doffin.no/notices/2025-110208" target="_blank" rel="noopener noreferrer">Åpне</a>
          </td>
        </tr>
        <!-- Добавьте другие строки -->
      </tbody>
    </table>
    <div><img src="https://i.imgur.com/BISmrsV.png" alt="Kart" style="max-width:100%;border:1px solid #eaeaea;"/></div>
  `,
};

// Отправляем письмо
transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    return console.error('Ошибка при отправке:', error);
  }
  console.log('Письмо успешно отправлено:', info.response);
});