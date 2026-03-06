/**
 * Конфигурация API для разных окружений
 */
export const API_CONFIG = {
  // Локальная разработка
  development: {
    baseUrl: 'http://localhost:8000',
    wsUrl: 'ws://localhost:8000',
  },
  // Продакшен
  production: {
    baseUrl: '/api',
    wsUrl: `ws://${window.location.host}`,
  },
};

// Текущая конфигурация
const env = import.meta.env.MODE || 'development';
const config = API_CONFIG[env as keyof typeof API_CONFIG] || API_CONFIG.development;

export const API_BASE_URL = config.baseUrl;
export const WS_BASE_URL = config.wsUrl;

// Таймауты
export const API_TIMEOUT = 30000; // 30 секунд
export const WS_RECONNECT_INTERVAL = 5000; // 5 секунд
export const WS_MAX_RECONNECT_ATTEMPTS = 5;
