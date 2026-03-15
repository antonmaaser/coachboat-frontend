<script lang="ts">
    import { auth, hasPermission } from "$lib/stores/auth";
    import Button from "$lib/components/ui/Button.svelte";
    import TextInput from "$lib/components/ui/TextInput.svelte";
    import ErrorAlert from "$lib/components/ui/ErrorAlert.svelte";
    import { extractErrorMessage } from "$lib/utils/error";
    import { notificationsApi } from "$lib/api/notifications";
    import type {
        NotificationResource,
        NotificationBroadcastResource,
    } from "$lib/api/types";
    import { Bell, RefreshCw } from "lucide-svelte";

    type FilterMode = "all" | "unread" | "read";

    let notifications = $state<NotificationResource[]>([]);
    let loading = $state(true);
    let error = $state("");
    let filterMode = $state<FilterMode>("all");

    let createType = $state("system");
    let createTitle = $state("");
    let createMessage = $state("");
    let createUrl = $state("");
    let createTargetUserId = $state("");
    let createBroadcast = $state(true);
    let createLoading = $state(false);
    let createError = $state("");
    let createInfo = $state("");

    const canReadNotifications = $derived(
        hasPermission($auth.user, "notifications:read", $auth.organizationId),
    );
    const canCreateNotifications = $derived(
        hasPermission($auth.user, "notifications:create:any", $auth.organizationId),
    );
    const canUpdateOwnNotifications = $derived(
        hasPermission($auth.user, "notifications:update:own", $auth.organizationId),
    );

    async function loadNotifications() {
        if (!canReadNotifications) {
            loading = false;
            return;
        }

        loading = true;
        error = "";

        try {
            const filterRead =
                filterMode === "all" ? undefined : filterMode === "read" ? true : false;
            const res = await notificationsApi.list(filterRead);
            if (!res.ok) {
                error = await extractErrorMessage(res);
                notifications = [];
                return;
            }
            const json = await res.json();
            notifications = json.data || [];
        } catch (e: any) {
            error = await extractErrorMessage(e);
            notifications = [];
        } finally {
            loading = false;
        }
    }

    async function toggleRead(notification: NotificationResource) {
        if (!canUpdateOwnNotifications) return;
        const isRead = !!notification.attributes.read;

        try {
            const res = await notificationsApi.markRead(notification.id, !isRead);
            if (!res.ok) {
                error = await extractErrorMessage(res);
                return;
            }
            await loadNotifications();
        } catch (e: any) {
            error = await extractErrorMessage(e);
        }
    }

    async function createNotification(e: Event) {
        e.preventDefault();
        if (!canCreateNotifications) return;

        createLoading = true;
        createError = "";
        createInfo = "";

        try {
            const res = await notificationsApi.create({
                type: createType.trim() || "system",
                title: createTitle.trim(),
                message: createMessage.trim(),
                url: createUrl.trim() || undefined,
                broadcast: createBroadcast,
                "user-id": createBroadcast ? undefined : createTargetUserId.trim(),
            });

            if (!res.ok) {
                createError = await extractErrorMessage(res);
                return;
            }

            const json = await res.json();
            const payload = json.data as NotificationResource | NotificationBroadcastResource;
            if (payload.type === "notification-broadcast") {
                createInfo = `Broadcast erstellt für ${payload.attributes.recipients} Empfänger.`;
            } else {
                createInfo = "Benachrichtigung erstellt.";
            }

            createTitle = "";
            createMessage = "";
            createUrl = "";
            createTargetUserId = "";

            await loadNotifications();
        } catch (e: any) {
            createError = await extractErrorMessage(e);
        } finally {
            createLoading = false;
        }
    }

    function formatDate(value?: string | null) {
        if (!value) return "Unbekannt";
        return new Date(value).toLocaleString("de-DE", {
            dateStyle: "medium",
            timeStyle: "short",
        });
    }

    $effect(() => {
        filterMode;
        $auth.organizationId;

        if (!canReadNotifications) {
            loading = false;
            notifications = [];
            error = "";
            return;
        }

        void loadNotifications();
    });
</script>

<div class="space-y-6">
    <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
            <Bell class="h-6 w-6 text-zinc-700 dark:text-zinc-300" />
            <h1 class="text-2xl font-bold text-zinc-900 dark:text-white">
                Benachrichtigungen
            </h1>
        </div>
        <Button variant="outline" tone="neutral" onclick={loadNotifications}>
            <RefreshCw class="h-4 w-4" />
            Aktualisieren
        </Button>
    </div>

    {#if !canReadNotifications}
        <section
            class="rounded-xl border border-zinc-200 bg-white p-6 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
        >
            Keine Berechtigung für Benachrichtigungen (`notifications:read`).
        </section>
    {:else}
        <section
            class="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800"
        >
            <div class="flex flex-wrap gap-2">
                <Button
                    variant={filterMode === "all" ? "solid" : "outline"}
                    tone="neutral"
                    size="sm"
                    onclick={() => {
                        filterMode = "all";
                    }}
                >
                    Alle
                </Button>
                <Button
                    variant={filterMode === "unread" ? "solid" : "outline"}
                    tone="neutral"
                    size="sm"
                    onclick={() => {
                        filterMode = "unread";
                    }}
                >
                    Ungelesen
                </Button>
                <Button
                    variant={filterMode === "read" ? "solid" : "outline"}
                    tone="neutral"
                    size="sm"
                    onclick={() => {
                        filterMode = "read";
                    }}
                >
                    Gelesen
                </Button>
            </div>
        </section>

        <ErrorAlert error={error} />

        {#if loading}
            <div
                class="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
            >
                Lade Benachrichtigungen...
            </div>
        {:else if notifications.length === 0}
            <div
                class="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
            >
                Keine Benachrichtigungen für den aktuellen Filter.
            </div>
        {:else}
            <div class="space-y-3">
                {#each notifications as notification}
                    <article
                        class="rounded-xl border p-4 dark:bg-zinc-800
                            {notification.attributes.read
                            ? 'border-zinc-200 dark:border-zinc-700'
                            : 'border-blue-200 bg-blue-50/50 dark:border-blue-700 dark:bg-blue-900/10'}"
                    >
                        <div class="mb-2 flex items-start justify-between gap-3">
                            <div>
                                <h2 class="font-semibold text-zinc-900 dark:text-white">
                                    {notification.attributes.title}
                                </h2>
                                <p class="text-xs text-zinc-500 dark:text-zinc-400">
                                    {formatDate(notification.attributes["created-at"])}
                                </p>
                            </div>
                            <span
                                class="rounded-md px-2 py-1 text-xs font-semibold
                                    {notification.attributes.read
                                    ? 'bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200'
                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}"
                            >
                                {notification.attributes.read ? "Gelesen" : "Neu"}
                            </span>
                        </div>

                        <p class="mb-3 text-sm text-zinc-700 dark:text-zinc-300">
                            {notification.attributes.message}
                        </p>

                        {#if notification.attributes.url}
                            <a
                                href={notification.attributes.url}
                                class="mb-3 inline-flex text-sm text-blue-600 underline hover:text-blue-700 dark:text-blue-400"
                            >
                                Link öffnen
                            </a>
                        {/if}

                        {#if canUpdateOwnNotifications}
                            <div>
                                <Button
                                    variant="ghost"
                                    tone="neutral"
                                    size="sm"
                                    onclick={() => toggleRead(notification)}
                                >
                                    {notification.attributes.read
                                        ? "Als ungelesen markieren"
                                        : "Als gelesen markieren"}
                                </Button>
                            </div>
                        {/if}
                    </article>
                {/each}
            </div>
        {/if}
    {/if}

    {#if canCreateNotifications}
        <section
            class="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800"
        >
            <h2 class="mb-4 text-lg font-semibold text-zinc-900 dark:text-white">
                Benachrichtigung erstellen
            </h2>

            {#if createInfo}
                <div
                    class="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-700 dark:bg-green-900/20 dark:text-green-300"
                >
                    {createInfo}
                </div>
            {/if}
            <ErrorAlert error={createError} />

            <form class="space-y-4" onsubmit={createNotification}>
                <TextInput label="Typ" bind:value={createType} />
                <TextInput label="Titel" required bind:value={createTitle} />
                <TextInput
                    label="Nachricht"
                    required
                    multiline
                    rows={4}
                    bind:value={createMessage}
                />
                <TextInput label="URL (optional)" bind:value={createUrl} />

                <label class="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                    <input type="checkbox" bind:checked={createBroadcast} />
                    Broadcast an alle Organisationsmitglieder
                </label>

                {#if !createBroadcast}
                    <TextInput
                        label="Zielbenutzer-ID"
                        required
                        bind:value={createTargetUserId}
                    />
                {/if}

                <Button
                    type="submit"
                    variant="solid"
                    tone="primary"
                    loading={createLoading}
                    disabled={createLoading}
                >
                    Benachrichtigung senden
                </Button>
            </form>
        </section>
    {/if}
</div>
