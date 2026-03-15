<script lang="ts">
    import { page } from "$app/state";
    import { auth, logout, hasPermission } from "$lib/stores/auth";
    import { theme } from "$lib/stores/theme";
    import { goto } from "$app/navigation";
    import { browser } from "$app/environment";
    import logo from "$lib/assets/waves.svg";
    import { client } from "$lib/api/client";
    import { notificationsApi } from "$lib/api/notifications";
    import { clickOutside } from "$lib/actions/clickOutside";
    import Button from "$lib/components/ui/Button.svelte";
    import ProfileAvatar from "$lib/components/ui/ProfileAvatar.svelte";
    import { extractErrorMessage } from "$lib/utils/error";
    import type { NotificationResource } from "$lib/api/types";
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
        Bell,
        ClipboardList,
        MessageSquare,
    } from "lucide-svelte";

    let { children } = $props();
    let mobileMenuOpen = $state(false);
    let lastHydrationKey = $state<string | null>(null);
    let notificationsOpen = $state(false);
    let notificationsLoading = $state(false);
    let notificationsError = $state("");
    let sidebarNotifications = $state<NotificationResource[]>([]);

    $effect(() => {
        if (!browser) return;

        if (!$auth.accessToken) {
            lastHydrationKey = null;
            goto("/login");
            return;
        }

        const userId = $auth.user?.id;
        if (!userId) return;

        const hydrationKey = `${userId}:${$auth.organizationId || ""}`;
        if (hydrationKey === lastHydrationKey) return;
        lastHydrationKey = hydrationKey;

        client(`/users/${userId}`)
            .then(async (res) => {
                if (!res.ok) return;
                const json = await res.json();
                const attrs = json.data.attributes;
                auth.update((s) => {
                    if (!s.user || s.user.id !== userId) return s;
                    return {
                        ...s,
                        user: {
                            ...s.user,
                            email: attrs.email,
                            name: attrs.name,
                            firstName: attrs["first-name"] || attrs.firstName,
                            isActive: attrs["is-active"],
                            status: attrs.status,
                            permissions: attrs.permissions,
                            effective_permissions: attrs.effective_permissions,
                            organizations: attrs.organizations || [],
                        },
                    };
                });
            })
            .catch((err) => {
                console.error("Failed to refresh user profile", err);
            });
    });

    $effect(() => {
        if (
            $auth.user?.organizations &&
            $auth.user.organizations.length > 0 &&
            !$auth.organizationId
        ) {
            auth.update((s) => ({
                ...s,
                organizationId: s.user?.organizations?.[0]?.id || null,
            }));
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

    const canReadNotifications = $derived(
        hasPermission($auth.user, "notifications:read", $auth.organizationId),
    );
    const canUpdateOwnNotifications = $derived(
        hasPermission($auth.user, "notifications:update:own", $auth.organizationId),
    );
    const unreadNotificationsCount = $derived(
        sidebarNotifications.filter((notification) => !notification.attributes.read)
            .length,
    );

    function closeNotificationsPopover() {
        notificationsOpen = false;
    }

    function closeSidebarAndNotifications() {
        closeNotificationsPopover();
        closeSidebar();
    }

    function handleLayoutKeydown(event: KeyboardEvent) {
        if (event.key === "Escape") {
            closeNotificationsPopover();
        }
    }

    function formatNotificationDate(value?: string | null) {
        if (!value) return "Unbekannt";
        return new Date(value).toLocaleString("de-DE", {
            dateStyle: "short",
            timeStyle: "short",
        });
    }

    async function loadSidebarNotifications() {
        if (!canReadNotifications) {
            notificationsError = "";
            sidebarNotifications = [];
            notificationsLoading = false;
            return;
        }

        notificationsLoading = true;
        notificationsError = "";

        try {
            const res = await notificationsApi.list(false);
            if (!res.ok) {
                notificationsError = await extractErrorMessage(res);
                sidebarNotifications = [];
                return;
            }
            const json = await res.json();
            const data = (json.data || []) as NotificationResource[];
            sidebarNotifications = data.sort((a, b) => {
                const dateA = a.attributes["created-at"]
                    ? new Date(a.attributes["created-at"] as string).getTime()
                    : 0;
                const dateB = b.attributes["created-at"]
                    ? new Date(b.attributes["created-at"] as string).getTime()
                    : 0;
                return dateB - dateA;
            });
        } catch (err: any) {
            notificationsError = await extractErrorMessage(err);
            sidebarNotifications = [];
        } finally {
            notificationsLoading = false;
        }
    }

    async function toggleNotificationsPopover() {
        if (!canReadNotifications) return;
        notificationsOpen = !notificationsOpen;
        if (notificationsOpen) {
            await loadSidebarNotifications();
        }
    }

    async function markNotificationAsRead(notification: NotificationResource) {
        if (!canUpdateOwnNotifications || notification.attributes.read) return;

        try {
            const res = await notificationsApi.markRead(notification.id, true);
            if (!res.ok) {
                notificationsError = await extractErrorMessage(res);
                return;
            }
            await loadSidebarNotifications();
        } catch (err: any) {
            notificationsError = await extractErrorMessage(err);
        }
    }

    $effect(() => {
        page.url.pathname;
        notificationsOpen = false;
    });

    $effect(() => {
        if (!canReadNotifications) {
            notificationsOpen = false;
            notificationsError = "";
            sidebarNotifications = [];
            notificationsLoading = false;
            return;
        }
        void loadSidebarNotifications();
    });

</script>

<svelte:window onkeydown={handleLayoutKeydown} />

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
        <Button
            variant="icon"
            tone="neutral"
            iconOnly
            ariaLabel="Menü öffnen"
            onclick={toggleMobileMenu}
        >
            <Menu class="w-6 h-6" />
        </Button>
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
            <div class="md:hidden">
                <Button
                    variant="ghost"
                    tone="neutral"
                    iconOnly
                    ariaLabel="Seitenleiste schließen"
                    onclick={closeSidebar}
                >
                    <X class="w-6 h-6" />
                </Button>
            </div>
        </div>

        <!-- Org Switcher -->
        {#if $auth.user?.organizations && $auth.user.organizations.length > 1}
            <div class="px-4 pt-4">
                <div class="relative">
                    <select
                        class="w-full appearance-none bg-zinc-50 dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 text-zinc-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 pr-8"
                        value={$auth.organizationId}
                        onchange={(e) => {
                            // @ts-ignore
                            import("$lib/api/client").then((m) =>
                                m.switchOrganization(
                                    (e.target as HTMLSelectElement).value,
                                ),
                            );
                        }}
                    >
                        {#each $auth.user.organizations as org}
                            <option
                                value={org.id}
                                selected={org.id === $auth.organizationId}
                            >
                                {org.name}
                            </option>
                        {/each}
                    </select>
                    <div
                        class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-700 dark:text-zinc-300"
                    >
                        <svg
                            class="fill-current h-4 w-4"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            ><path
                                d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"
                            /></svg
                        >
                    </div>
                </div>
                <div class="text-xs text-zinc-500 mt-1 px-1">
                    Organisation wechseln
                </div>
            </div>
        {/if}

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
                Übersicht
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

            {#if hasPermission($auth.user, "forms:read")}
                <a
                    href="/forms"
                    onclick={closeSidebar}
                    class="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium
        {isActive('/forms', page.url.pathname)
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 hover:text-zinc-900 dark:hover:text-zinc-200'}"
                >
                    <ClipboardList class="w-5 h-5" />
                    Formulare
                </a>
            {/if}

            {#if hasPermission($auth.user, "messages:read") || hasPermission($auth.user, "messages:create")}
                <a
                    href="/messages"
                    onclick={closeSidebar}
                    class="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium
        {isActive('/messages', page.url.pathname)
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 hover:text-zinc-900 dark:hover:text-zinc-200'}"
                >
                    <MessageSquare class="w-5 h-5" />
                    Nachrichten
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
                <ProfileAvatar
                    name={$auth.user?.name || ""}
                    fallback="U"
                    size="sm"
                />
                <div class="flex-1 min-w-0">
                    <p
                        class="text-sm font-medium text-zinc-900 dark:text-white truncate"
                    >
                        {$auth.user?.firstName
                            ? $auth.user.firstName + " "
                            : ""}{$auth.user?.name || "Benutzer"}
                    </p>
                    <p
                        class="text-xs text-zinc-500 dark:text-zinc-400 truncate"
                    >
                        {$auth.user?.email}
                    </p>
                </div>
            </div>

            {#if canReadNotifications}
                <div
                    class="mb-2 relative"
                    use:clickOutside={closeNotificationsPopover}
                >
                    <Button
                        variant="menu"
                        tone={notificationsOpen ? "primary" : "neutral"}
                        size="xs"
                        align="left"
                        aria-haspopup="dialog"
                        aria-expanded={notificationsOpen}
                        onclick={toggleNotificationsPopover}
                    >
                        <Bell class="w-5 h-5" />
                        <span>Benachrichtigungen</span>
                        {#if unreadNotificationsCount > 0}
                            <span
                                class="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 py-0.5 text-[11px] font-semibold leading-4 text-white"
                            >
                                {unreadNotificationsCount > 99
                                    ? "99+"
                                    : unreadNotificationsCount}
                            </span>
                        {/if}
                    </Button>

                    {#if notificationsOpen}
                        <div
                            role="dialog"
                            aria-label="Benachrichtigungen"
                            class="absolute bottom-full left-0 z-50 mb-2 w-[min(24rem,calc(100vw-2.5rem))] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-800"
                        >
                            <div
                                class="flex items-center justify-between border-b border-zinc-200 p-3 dark:border-zinc-700"
                            >
                                <p
                                    class="text-sm font-semibold text-zinc-900 dark:text-white"
                                >
                                    Benachrichtigungen
                                </p>
                                <Button
                                    variant="ghost"
                                    tone="neutral"
                                    size="xs"
                                    onclick={loadSidebarNotifications}
                                >
                                    Aktualisieren
                                </Button>
                            </div>

                            {#if notificationsLoading}
                                <p
                                    class="p-3 text-sm text-zinc-600 dark:text-zinc-300"
                                >
                                    Lade Benachrichtigungen...
                                </p>
                            {:else if notificationsError}
                                <p
                                    class="p-3 text-sm text-red-600 dark:text-red-400"
                                >
                                    {notificationsError}
                                </p>
                            {:else if sidebarNotifications.length === 0}
                                <p
                                    class="p-3 text-sm text-zinc-600 dark:text-zinc-300"
                                >
                                    Keine ungelesenen Benachrichtigungen.
                                </p>
                            {:else}
                                <div class="max-h-80 overflow-y-auto">
                                    {#each sidebarNotifications.slice(0, 6) as notification}
                                        <article
                                            class="border-b border-zinc-100 p-3 dark:border-zinc-700/70"
                                        >
                                            <div class="flex items-start gap-2">
                                                <div
                                                    class="mt-1 h-2 w-2 rounded-full {notification.attributes.read
                                                        ? 'bg-zinc-300 dark:bg-zinc-600'
                                                        : 'bg-blue-500'}"
                                                    aria-hidden="true"
                                                ></div>
                                                <div class="min-w-0 flex-1">
                                                    <p
                                                        class="truncate text-sm font-medium text-zinc-900 dark:text-white"
                                                    >
                                                        {notification.attributes.title}
                                                    </p>
                                                    <p
                                                        class="mt-1 text-xs text-zinc-600 dark:text-zinc-300"
                                                    >
                                                        {notification.attributes.message}
                                                    </p>
                                                    <p
                                                        class="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400"
                                                    >
                                                        {formatNotificationDate(
                                                            notification.attributes[
                                                                "created-at"
                                                            ],
                                                        )}
                                                    </p>
                                                    <div
                                                        class="mt-2 flex flex-wrap items-center gap-3"
                                                    >
                                                        {#if notification.attributes.url}
                                                            <a
                                                                href={notification.attributes.url}
                                                                class="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                                                                onclick={closeSidebarAndNotifications}
                                                            >
                                                                Öffnen
                                                            </a>
                                                        {/if}
                                                        {#if canUpdateOwnNotifications && !notification.attributes.read}
                                                            <button
                                                                type="button"
                                                                class="text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white"
                                                                onclick={() =>
                                                                    markNotificationAsRead(
                                                                        notification,
                                                                    )}
                                                            >
                                                                Als gelesen
                                                            </button>
                                                        {/if}
                                                    </div>
                                                </div>
                                            </div>
                                        </article>
                                    {/each}
                                </div>
                            {/if}

                            <div
                                class="border-t border-zinc-200 p-2 dark:border-zinc-700"
                            >
                                <a
                                    href="/notifications"
                                    onclick={closeSidebarAndNotifications}
                                    class="inline-flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-900/20"
                                >
                                    Alle Benachrichtigungen anzeigen
                                </a>
                            </div>
                        </div>
                    {/if}
                </div>
            {/if}

            <div class="mb-2">
                <Button
                    variant="menu"
                    tone="neutral"
                    size="xs"
                    align="left"
                    onclick={theme.toggle}
                >
                    {#if $theme === "dark"}
                        <Sun class="w-5 h-5" />
                        <span>Light Modus</span>
                    {:else}
                        <Moon class="w-5 h-5" />
                        <span>Dark Modus</span>
                    {/if}
                </Button>
            </div>

            <Button
                variant="menu"
                tone="danger"
                size="xs"
                align="left"
                onclick={logout}
            >
                <LogOut class="w-5 h-5" />
                Abmelden
            </Button>
        </div>
    </aside>
    <main class="md:ml-64 min-h-screen transition-all duration-300">
        <div class="p-4 md:p-8">
            <!-- Mobile Toggle could go here -->
            {@render children()}
        </div>
    </main>
</div>
