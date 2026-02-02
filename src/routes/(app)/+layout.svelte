<script lang="ts">
    import { page } from "$app/state";
    import { auth, logout, hasPermission } from "$lib/stores/auth";
    import { theme } from "$lib/stores/theme";
    import { goto } from "$app/navigation";
    import { browser } from "$app/environment";
    import logo from "$lib/assets/waves.svg";
    import { client } from "$lib/api/client";
    import {
        LayoutDashboard,
        Calendar,
        Users,
        LogOut,
        Menu,
        Sun,
        Moon,
        Settings,
        DraftingCompass,
        X,
        Shield,
    } from "lucide-svelte";

    let { children } = $props();
    let mobileMenuOpen = $state(false);

    $effect(() => {
        if (browser) {
            if (!$auth.accessToken) {
                goto("/login");
            } else if ($auth.user && !$auth.user.firstName) {
                client(`/users/${$auth.user.id}`).then(async (res) => {
                    if (res.ok) {
                        const json = await res.json();
                        const attrs = json.data.attributes;
                        auth.update((s) => ({
                            ...s,
                            user: {
                                ...s.user!,
                                firstName:
                                    attrs["first-name"] || attrs.firstName,
                                name: attrs.name,
                            },
                        }));
                    }
                });
            }
        }
    });

    function toggleMobileMenu() {
        mobileMenuOpen = !mobileMenuOpen;
    }

    function closeSidebar() {
        mobileMenuOpen = false;
    }

    function isActive(href: string, path: string) {
        if (href === "/") return path === "/";
        return path.startsWith(href);
    }
</script>

<div
    class="min-h-screen bg-zinc-50 dark:bg-zinc-900 transition-colors duration-300"
>
    <!-- Mobile Header -->
    <header
        class="md:hidden flex items-center justify-between p-4 bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 sticky top-0 z-30"
    >
        <div class="flex items-center gap-2">
            <img src={logo} alt="Coachboat Planer" class="w-8 h-8" />
            <span class="font-bold text-lg text-zinc-900 dark:text-white"
                >Coachboat-Planer</span
            >
        </div>
        <button
            onclick={toggleMobileMenu}
            class="p-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 rounded-lg transition-colors"
        >
            <Menu class="w-6 h-6" />
        </button>
    </header>

    <!-- Sidebar Inlined -->
    {#if mobileMenuOpen}
        <div
            class="fixed inset-0 bg-black/50 z-40 md:hidden"
            onclick={closeSidebar}
            aria-hidden="true"
        ></div>
    {/if}

    <aside
        class="fixed inset-y-0 left-0 z-50 w-full md:w-64 bg-white dark:bg-zinc-800 border-r border-zinc-200 dark:border-zinc-700 transition-transform duration-300 ease-in-out md:translate-x-0 flex flex-col
    {mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}"
    >
        <div
            class="p-6 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-700/50"
        >
            <div class="flex items-center gap-3">
                <img src={logo} alt="Coachboat Planer" class="w-8 h-8" />
                <span class="font-bold text-lg text-zinc-900 dark:text-white"
                    >Coachboat-Planer</span
                >
            </div>
            <!-- Mobile Close Button -->
            <button
                onclick={closeSidebar}
                class="md:hidden text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
                <X class="w-6 h-6" />
            </button>
        </div>

        <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
            <a
                href="/"
                onclick={closeSidebar}
                class="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium
        {isActive('/', page.url.pathname)
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 hover:text-zinc-900 dark:hover:text-zinc-200'}"
            >
                <LayoutDashboard class="w-5 h-5" />
                Dashboard
            </a>

            {#if hasPermission($auth.user, "events:read")}
                <a
                    href="/events"
                    onclick={closeSidebar}
                    class="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium
        {isActive('/events', page.url.pathname)
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 hover:text-zinc-900 dark:hover:text-zinc-200'}"
                >
                    <Calendar class="w-5 h-5" />
                    Buchungen
                </a>
            {/if}

            {#if hasPermission($auth.user, "resources:read")}
                <a
                    href="/resources"
                    onclick={closeSidebar}
                    class="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium
        {isActive('/resources', page.url.pathname)
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 hover:text-zinc-900 dark:hover:text-zinc-200'}"
                >
                    <DraftingCompass class="w-5 h-5" />
                    Materialien
                </a>
            {/if}

            {#if hasPermission($auth.user, "groups:read")}
                <a
                    href="/groups"
                    onclick={closeSidebar}
                    class="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium
        {isActive('/groups', page.url.pathname)
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 hover:text-zinc-900 dark:hover:text-zinc-200'}"
                >
                    <Users class="w-5 h-5" />
                    Gruppen
                </a>
            {/if}

            {#if hasPermission($auth.user, "users:read")}
                <div class="pt-4 pb-2">
                    <p
                        class="px-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider"
                    >
                        Admin
                    </p>
                </div>
                <a
                    href="/users"
                    onclick={closeSidebar}
                    class="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium
            {isActive('/users', page.url.pathname)
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 hover:text-zinc-900 dark:hover:text-zinc-200'}"
                >
                    <Users class="w-5 h-5" />
                    Benutzer
                </a>
            {/if}

            <a
                href="/settings"
                onclick={closeSidebar}
                class="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium
        {isActive('/settings', page.url.pathname) &&
                page.url.pathname === '/settings'
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                    : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 hover:text-zinc-900 dark:hover:text-zinc-200'}"
            >
                <Settings class="w-5 h-5" />
                Einstellungen
            </a>

            {#if hasPermission($auth.user, "roles:read")}
                <a
                    href="/settings/rbac"
                    onclick={closeSidebar}
                    class="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium ml-4 border-l-2 border-zinc-100 dark:border-zinc-800
            {isActive('/settings/rbac', page.url.pathname)
                        ? 'border-blue-500 text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
                        : 'text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'}"
                >
                    <span class="pl-2">Berechtigungen</span>
                </a>
            {/if}
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
                    <p
                        class="text-xs text-zinc-500 dark:text-zinc-400 truncate"
                    >
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
    <main class="md:ml-64 min-h-screen transition-all duration-300">
        <div class="p-4 md:p-8">
            <!-- Mobile Toggle could go here -->
            {@render children()}
        </div>
    </main>
</div>
