<script lang="ts">
    import { page } from "$app/stores";
    import { auth, logout } from "$lib/stores/auth";
    import { theme } from "$lib/stores/theme";
    import {
        LayoutDashboard,
        Calendar,
        Ship,
        Users,
        LogOut,
        Menu,
        Sun,
        Moon,
        Settings,
    } from "lucide-svelte";

    // $auth is available because we import the store

    function isActive(href: string, path: string) {
        if (href === "/") return path === "/";
        return path.startsWith(href);
    }
</script>

<aside
    class="hidden md:flex flex-col w-64 bg-white dark:bg-zinc-800 border-r border-zinc-200 dark:border-zinc-700 h-screen fixed left-0 top-0 transition-colors duration-300"
>
    <div
        class="p-6 flex items-center gap-3 border-b border-zinc-100 dark:border-zinc-700/50"
    >
        <div
            class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold"
        >
            CP
        </div>
        <span class="font-bold text-lg text-zinc-900 dark:text-white"
            >Coachboat-Planer</span
        >
    </div>

    <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
        <a
            href="/"
            class="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium
        {isActive('/', $page.url.pathname)
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 hover:text-zinc-900 dark:hover:text-zinc-200'}"
        >
            <LayoutDashboard class="w-5 h-5" />
            Dashboard
        </a>

        <a
            href="/events"
            class="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium
        {isActive('/events', $page.url.pathname)
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 hover:text-zinc-900 dark:hover:text-zinc-200'}"
        >
            <Calendar class="w-5 h-5" />
            Buchungen
        </a>

        <a
            href="/resources"
            class="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium
        {isActive('/resources', $page.url.pathname)
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 hover:text-zinc-900 dark:hover:text-zinc-200'}"
        >
            <Ship class="w-5 h-5" />
            Materialien
        </a>

        {#if $auth.user && $auth.user.status && $auth.user.status >= 3}
            <div class="pt-4 pb-2">
                <p
                    class="px-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider"
                >
                    Admin
                </p>
            </div>
            <a
                href="/users"
                class="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium
            {isActive('/users', $page.url.pathname)
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 hover:text-zinc-900 dark:hover:text-zinc-200'}"
            >
                <Users class="w-5 h-5" />
                Benutzer
            </a>
        {/if}

        <a
            href="/settings"
            class="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium
        {isActive('/settings', $page.url.pathname)
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 hover:text-zinc-900 dark:hover:text-zinc-200'}"
        >
            <Settings class="w-5 h-5" />
            Einstellungen
        </a>
    </nav>

    <div class="p-4 border-t border-zinc-100 dark:border-zinc-700/50">
        <div class="flex items-center gap-3 px-3 py-2">
            <div
                class="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-zinc-300"
            >
                {$auth.user?.name?.charAt(0) || "U"}
            </div>
            <div class="flex-1 min-w-0">
                <p
                    class="text-sm font-medium text-zinc-900 dark:text-white truncate"
                >
                    {$auth.user?.firstName
                        ? $auth.user.firstName + " "
                        : ""}{$auth.user?.name || "User"}
                </p>
                <p class="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                    {$auth.user?.email}
                </p>
            </div>
        </div>

        <button
            onclick={theme.toggle}
            class="flex w-full items-center gap-3 px-3 py-2 mb-2 rounded-lg transition-colors text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 hover:text-zinc-900 dark:hover:text-zinc-200"
        >
            {#if $theme === "dark"}
                <Sun class="w-5 h-5" />
                <span>Light Modus</span>
            {:else}
                <Moon class="w-5 h-5" />
                <span>Dark Modus</span>
            {/if}
        </button>

        <button
            onclick={logout}
            class="flex w-full items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
        >
            <LogOut class="w-5 h-5" />
            Abmelden
        </button>
    </div>
</aside>
