import { writable } from 'svelte/store';
import { browser } from '$app/environment';

type Theme = 'light' | 'dark';

function createThemeStore() {
    // Default to light, or check system preference/localStorage if needed
    let initial: Theme = 'light';

    if (browser) {
        const stored = localStorage.getItem('theme');
        if (stored === 'dark' || stored === 'light') {
            initial = stored;
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            initial = 'dark';
        }

        // precise initial sync
        if (initial === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }

    const { subscribe, set, update } = writable<Theme>(initial);

    return {
        subscribe,
        toggle: () => update(t => {
            const newTheme = t === 'dark' ? 'light' : 'dark';
            if (browser) {
                localStorage.setItem('theme', newTheme);
                if (newTheme === 'dark') {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
            }
            return newTheme;
        })
    };
}

export const theme = createThemeStore();
