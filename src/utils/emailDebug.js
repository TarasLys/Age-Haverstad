// Утилиты для отладки проблем с email в Electron

export function debugEmailError(error) {
  console.group('🔍 Email Error Debug');
  console.log('Error type:', typeof error);
  console.log('Error constructor:', error?.constructor?.name);
  
  if (error instanceof Error) {
    console.log('Error message:', error.message);
    console.log('Error stack:', error.stack);
  } else if (typeof error === 'object') {
    console.log('Error object:', JSON.stringify(error, null, 2));
    
    // Проверяем специфичные поля EmailJS
    if (error.status) console.log('Status:', error.status);
    if (error.text) console.log('Response text:', error.text);
    if (error.response) console.log('Response:', error.response);
  } else {
    console.log('Raw error:', error);
  }
  
  // Проверяем сетевое подключение
  if (navigator.onLine) {
    console.log('✅ Network: Online');
  } else {
    console.log('❌ Network: Offline');
  }
  
  // Проверяем доступность EmailJS
  checkEmailJSAvailability();
  
  console.groupEnd();
}

async function checkEmailJSAvailability() {
  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'OPTIONS'
    });
    console.log('✅ EmailJS API: Accessible');
  } catch (error) {
    console.log('❌ EmailJS API: Not accessible', error.message);
  }
}

export function enhanceEmailJSError(originalSendFunction) {
  return async function(...args) {
    try {
      const result = await originalSendFunction.apply(this, args);
      console.log('✅ Email sent successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ Email sending failed');
      debugEmailError(error);
      
      // Возвращаем более понятную ошибку
      const enhancedError = new Error(
        `Email sending failed: ${error.message || error.text || 'Unknown error'}`
      );
      enhancedError.originalError = error;
      throw enhancedError;
    }
  };
}

// Функция для проверки конфигурации EmailJS
export function validateEmailJSConfig(serviceId, templateId, publicKey) {
  const issues = [];
  
  if (!serviceId || serviceId.trim() === '') {
    issues.push('Service ID is missing or empty');
  }
  
  if (!templateId || templateId.trim() === '') {
    issues.push('Template ID is missing or empty');
  }
  
  if (!publicKey || publicKey.trim() === '') {
    issues.push('Public Key is missing or empty');
  }
  
  if (issues.length > 0) {
    console.warn('⚠️ EmailJS Configuration Issues:');
    issues.forEach(issue => console.warn(`  - ${issue}`));
    return false;
  }
  
  console.log('✅ EmailJS configuration is valid');
  return true;
}

// Функция для тестирования EmailJS подключения
export async function testEmailJSConnection(serviceId, templateId, publicKey) {
  console.group('🧪 Testing EmailJS Connection');
  
  // Проверяем конфигурацию
  if (!validateEmailJSConfig(serviceId, templateId, publicKey)) {
    console.groupEnd();
    return false;
  }
  
  try {
    // Импортируем EmailJS динамически
    const emailjs = await import('emailjs-com');
    
    // Инициализируем EmailJS
    emailjs.init(publicKey);
    
    // Отправляем тестовое письмо
    const testParams = {
      to_email: 'test@example.com',
      subject: 'Test Email from Electron App',
      message: 'This is a test email to verify EmailJS configuration.',
      from_name: 'Electron App Test'
    };
    
    console.log('Sending test email...');
    const result = await emailjs.send(serviceId, templateId, testParams);
    
    console.log('✅ Test email sent successfully:', result);
    console.groupEnd();
    return true;
    
  } catch (error) {
    console.error('❌ Test email failed');
    debugEmailError(error);
    console.groupEnd();
    return false;
  }
}

// Функция для проверки Electron-специфичных проблем
export function checkElectronEmailIssues() {
  console.group('🔧 Electron Email Environment Check');
  
  // Проверяем User Agent
  console.log('User Agent:', navigator.userAgent);
  
  // Проверяем доступность fetch
  if (typeof fetch !== 'undefined') {
    console.log('✅ Fetch API: Available');
  } else {
    console.log('❌ Fetch API: Not available');
  }
  
  // Проверяем доступность XMLHttpRequest
  if (typeof XMLHttpRequest !== 'undefined') {
    console.log('✅ XMLHttpRequest: Available');
  } else {
    console.log('❌ XMLHttpRequest: Not available');
  }
  
  // Проверяем CORS настройки
  console.log('Origin:', window.location.origin);
  console.log('Protocol:', window.location.protocol);
  
  // Проверяем доступность localStorage
  try {
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
    console.log('✅ LocalStorage: Available');
  } catch (error) {
    console.log('❌ LocalStorage: Not available', error.message);
  }
  
  // Проверяем доступность sessionStorage
  try {
    sessionStorage.setItem('test', 'test');
    sessionStorage.removeItem('test');
    console.log('✅ SessionStorage: Available');
  } catch (error) {
    console.log('❌ SessionStorage: Not available', error.message);
  }
  
  console.groupEnd();
}

// Функция для создания детального отчета об ошибке
export function createErrorReport(error, context = {}) {
  const report = {
    timestamp: new Date().toISOString(),
    error: {
      message: error.message || 'Unknown error',
      stack: error.stack,
      name: error.name,
      type: typeof error
    },
    context,
    environment: {
      userAgent: navigator.userAgent,
      online: navigator.onLine,
      origin: window.location.origin,
      protocol: window.location.protocol,
      language: navigator.language
    },
    apis: {
      fetch: typeof fetch !== 'undefined',
      xmlHttpRequest: typeof XMLHttpRequest !== 'undefined',
      localStorage: (() => {
        try {
          return typeof localStorage !== 'undefined';
        } catch {
          return false;
        }
      })()
    }
  };
  
  console.log('📋 Error Report:', JSON.stringify(report, null, 2));
  return report;
}

// Функция для логирования успешной отправки email
export function logEmailSuccess(result, params) {
  console.group('✅ Email Sent Successfully');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Result:', result);
  console.log('Parameters used:', {
    ...params,
    // Скрываем чувствительные данные
    to_email: params.to_email ? '***@***.***' : 'not provided',
    from_email: params.from_email ? '***@***.***' : 'not provided'
  });
  console.groupEnd();
}

// Экспорт всех функций для удобства
export default {
  debugEmailError,
  enhanceEmailJSError,
  validateEmailJSConfig,
  testEmailJSConnection,
  checkElectronEmailIssues,
  createErrorReport,
  logEmailSuccess
};