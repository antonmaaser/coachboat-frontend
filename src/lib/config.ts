// Development Configuration (Vite Dev Mode)
const DEV_CONFIG = {
    API_BASE: '/api',
    AUTH_BASE: '/auth'
};

// Production Configuration (Build/Runtime)
// TODO: Replace these with your actual production URLs
const PROD_CONFIG = {
    API_BASE: 'https://api.coachboat-planer.com',
    AUTH_BASE: 'https://auth.coachboat-planer.com'
};

const config = import.meta.env.DEV ? DEV_CONFIG : PROD_CONFIG;

export const API_BASE = config.API_BASE;
export const AUTH_BASE = config.AUTH_BASE;
