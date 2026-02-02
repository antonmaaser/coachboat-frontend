<script lang="ts">
    import { page } from "$app/stores";
    import { onMount } from "svelte";
    import { resourceApi, type Resource } from "$lib/api/resources";
    import { eventApi } from "$lib/api/events";
    import { extractErrorMessage } from "$lib/utils/error";
    import { toast } from "$lib/stores/toast";
    import TodoList from "$lib/components/TodoList.svelte";
    import ErrorAlert from "$lib/components/ui/ErrorAlert.svelte";
    import {
        ArrowLeft,
        Calendar,
        Clock,
        Loader2,
        MoreVertical,
    } from "lucide-svelte";
    import { goto } from "$app/navigation";

    let resourceId = $derived($page.params.id);
    let resource = $state<Resource | null>(null);
    let events = $state<any[]>([]);
    let totalEvents = $state(0);
    let loading = $state(true);
    let loadingMore = $state(false);
    let error = $state<string | null>(null);

    async function loadData() {
        loading = true;
        try {
            // Fetch Resource
            const resResource = await resourceApi.get(resourceId);
            if (resResource.ok) {
                const json = await resResource.json();
                resource = json.data;
            } else {
                throw new Error(await extractErrorMessage(resResource));
            }

            // Fetch Future Events
            const today = new Date().toISOString().split("T")[0];

            const resEvents = await eventApi.list({
                resource: resourceId,
                start: today,
                sort: "start-date",
                limit: 5,
            });

            if (resEvents.ok) {
                const json = await resEvents.json();
                events = json.data;
                totalEvents = json.meta?.total || events.length;
            } else {
                console.error(await extractErrorMessage(resEvents));
            }
        } catch (e) {
            console.error(e);
            error = await extractErrorMessage(e);
        } finally {
            loading = false;
        }
    }

    async function loadMoreEvents() {
        if (loadingMore) return;
        loadingMore = true;
        try {
            const today = new Date().toISOString().split("T")[0];
            const offset = events.length;

            const resEvents = await eventApi.list({
                resource: resourceId,
                start: today,
                sort: "start-date",
                offset: offset,
                limit: 5,
            });

            if (resEvents.ok) {
                const json = await resEvents.json();
                events = [...events, ...json.data];
                totalEvents = json.meta?.total || events.length;
            } else {
                toast.error("Konnte weitere Termine nicht laden.");
            }
        } catch (e) {
            console.error(e);
            toast.error("Fehler beim Laden.");
        } finally {
            loadingMore = false;
        }
    }

    onMount(() => {
        loadData();
    });

    function formatDate(dateStr: string) {
        if (!dateStr) return "";
        return new Date(dateStr).toLocaleDateString("de-DE", {
            weekday: "short",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    }

    function formatTime(isoString: string) {
        if (!isoString) return "";
        const date = new Date(isoString);
        return date.toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
        });
    }
</script>

<div class="space-y-6">
    <div class="flex items-center gap-4">
        <button
            onclick={() => goto("/resources")}
            class="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-500 transition-colors"
        >
            <ArrowLeft class="w-5 h-5" />
        </button>
        <h1 class="text-2xl font-bold text-zinc-900 dark:text-white">
            {#if resource}
                {resource.attributes.title}
            {:else if loading}
                Laden...
            {:else}
                Ressource nicht gefunden
            {/if}
        </h1>
    </div>

    {#if error}
        <ErrorAlert {error} />
    {:else if loading && !resource}
        <div class="flex justify-center p-12">
            <Loader2 class="w-8 h-8 animate-spin text-blue-600" />
        </div>
    {:else if resource}
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Left Column: Details & Events -->
            <div class="lg:col-span-2 space-y-6">
                <!-- Description Card -->
                <div
                    class="p-6 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm"
                >
                    <h2
                        class="text-lg font-semibold text-zinc-900 dark:text-white mb-4"
                    >
                        Details
                    </h2>
                    <p class="text-zinc-600 dark:text-zinc-400">
                        {resource.attributes.description ||
                            "Keine Beschreibung vorhanden."}
                    </p>
                    <div class="mt-4 flex gap-4 text-sm">
                        <div class="flex items-center gap-2">
                            {#if resource.attributes["is-ready"]}
                                <span
                                    class="px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-medium"
                                >
                                    Verfügbar
                                </span>
                            {:else}
                                <span
                                    class="px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-medium"
                                >
                                    Nicht Verfügbar
                                </span>
                            {/if}
                        </div>
                    </div>
                </div>

                <!-- Events List -->
                <div
                    class="p-6 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm"
                >
                    <h2
                        class="text-lg font-semibold text-zinc-900 dark:text-white mb-4 flex items-center gap-2"
                    >
                        <Calendar class="w-5 h-5" />
                        Geplante Nutzungen
                    </h2>

                    {#if events.length === 0}
                        <p class="text-zinc-500 italic">
                            Keine anstehenden Termine.
                        </p>
                    {:else}
                        <div class="space-y-3">
                            {#each events as event}
                                <div
                                    class="flex items-start gap-4 p-3 bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-100 dark:border-zinc-700/50"
                                >
                                    <div
                                        class="flex-shrink-0 w-16 text-center pt-1"
                                    >
                                        <div
                                            class="text-xs font-bold text-zinc-500 uppercase"
                                        >
                                            {new Date(
                                                event.attributes["start-date"],
                                            ).toLocaleDateString("de-DE", {
                                                weekday: "short",
                                            })}
                                        </div>
                                        <div
                                            class="text-lg font-bold text-zinc-900 dark:text-white"
                                        >
                                            {new Date(
                                                event.attributes["start-date"],
                                            ).getDate()}
                                        </div>
                                        <div class="text-xs text-zinc-500">
                                            {new Date(
                                                event.attributes["start-date"],
                                            ).toLocaleDateString("de-DE", {
                                                month: "short",
                                            })}
                                        </div>
                                    </div>

                                    <div class="flex-1 min-w-0">
                                        <h3
                                            class="font-medium text-zinc-900 dark:text-white truncate"
                                        >
                                            {event.attributes.title}
                                        </h3>
                                        <div
                                            class="flex items-center gap-3 text-sm text-zinc-500 mt-1"
                                        >
                                            <div
                                                class="flex items-center gap-1"
                                            >
                                                <Clock class="w-3.5 h-3.5" />
                                                {formatTime(
                                                    event.attributes[
                                                        "start-date"
                                                    ],
                                                )} - {formatTime(
                                                    event.attributes[
                                                        "end-date"
                                                    ],
                                                )}
                                            </div>
                                            {#if event.attributes["is-recurring"]}
                                                <span
                                                    class="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-1.5 py-0.5 rounded"
                                                >
                                                    Serie
                                                </span>
                                            {/if}
                                        </div>
                                    </div>
                                </div>
                            {/each}
                        </div>

                        {#if events.length < totalEvents}
                            <button
                                onclick={loadMoreEvents}
                                disabled={loadingMore}
                                class="w-full mt-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex items-center justify-center"
                            >
                                {#if loadingMore}
                                    <Loader2
                                        class="w-4 h-4 mr-2 animate-spin"
                                    />
                                    Lade...
                                {:else}
                                    Mehr anzeigen ({totalEvents -
                                        events.length})
                                {/if}
                            </button>
                        {/if}
                    {/if}
                </div>
            </div>

            <!-- Right Column: Tasks -->
            <div class="space-y-6">
                <!-- Tasks Card -->
                <div
                    class="p-6 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm h-full"
                >
                    <h2
                        class="text-lg font-semibold text-zinc-900 dark:text-white mb-4"
                    >
                        Aufgaben
                    </h2>
                    <TodoList {resourceId} />
                </div>
            </div>
        </div>
    {/if}
</div>
