import { API_BASE } from '../config';

export const realtimeApi = {
    streamUrl: (token?: string) => {
        const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
        const url = `${base}/stream`;

        if (!token) return url;
        return `${url}?token=${encodeURIComponent(token)}`;
    },
};
