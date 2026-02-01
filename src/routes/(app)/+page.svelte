<script lang="ts">
    import { auth } from "$lib/stores/auth";
    import TodoList from "$lib/components/TodoList.svelte";
    import { Calendar, DraftingCompass, Users } from "lucide-svelte";
    import { onMount } from "svelte";
    import { eventApi } from "$lib/api/events";

    let nextEvent: any = $state(null);
    let loadingEvent = $state(true);

    onMount(async () => {
        try {
            const res = await eventApi.list({
                start: new Date().toISOString(),
                limit: 1,
                sort: "start-date",
            });
            if (res.ok) {
                const json = await res.json();
                if (json.data && json.data.length > 0) {
                    nextEvent = json.data[0];
                }
            }
        } catch (e) {
            console.error("Failed to load next event", e);
        } finally {
            loadingEvent = false;
        }
    });
</script>

<div class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-zinc-900 dark:text-white">
            Dashboard
        </h1>
        <span class="text-sm text-zinc-500 dark:text-zinc-400">
            <!-- Mobile Date (Short) -->
            <span class="md:hidden">
                {new Date().toLocaleDateString("de-DE", {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                })}
            </span>
            <!-- Desktop Date (Long) -->
            <span class="hidden md:inline">
                {new Date().toLocaleDateString("de-DE", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                })}
            </span>
        </span>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
            class="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-sm border border-zinc-100 dark:border-zinc-700"
        >
            <h3 class="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Willkommen zurück
            </h3>
            <p class="text-2xl font-bold text-zinc-900 dark:text-white mt-2">
                {$auth.user?.firstName || "User"}
            </p>
            <div
                class="mt-4 flex items-center text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 w-fit px-2 py-1 rounded-full"
            >
                <span
                    class="w-2 h-2 rounded-full bg-green-600 dark:bg-green-400 mr-2"
                ></span>
                Aktiver Status
            </div>
            <p
                class="mt-4 text-xs text-zinc-400 dark:text-zinc-500 italic border-t border-zinc-100 dark:border-zinc-700/50 pt-2"
            >
                Pssst: etwas anderes Aussehen, gleiche Funktionen ;)
            </p>
        </div>

        <!-- Next Booking Widget -->
        {#if loadingEvent}
            <div
                class="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-sm border border-zinc-100 dark:border-zinc-700 animate-pulse"
            >
                <div
                    class="h-4 bg-zinc-200 dark:bg-zinc-700 rounded w-1/3 mb-4"
                ></div>
                <div
                    class="h-8 bg-zinc-200 dark:bg-zinc-700 rounded w-2/3"
                ></div>
            </div>
        {:else if nextEvent}
            <div
                class="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-sm border border-zinc-100 dark:border-zinc-700 relative overflow-hidden group"
            >
                <div
                    class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"
                >
                    <DraftingCompass class="w-24 h-24 text-blue-500" />
                </div>

                <h3
                    class="text-sm font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-2"
                >
                    <Calendar class="w-4 h-4" />
                    Nächste Fahrt
                </h3>

                <div class="mt-4">
                    <p
                        class="text-lg font-semibold text-zinc-900 dark:text-white line-clamp-1"
                    >
                        {nextEvent.attributes.title}
                    </p>
                    <p
                        class="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-1"
                    >
                        {new Date(
                            nextEvent.attributes["start-date"],
                        ).toLocaleTimeString("de-DE", {
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                    </p>
                    <p class="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        {new Date(
                            nextEvent.attributes["start-date"],
                        ).toLocaleDateString("de-DE", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                        })}
                    </p>
                </div>

                <div
                    class="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-700/50 flex items-center justify-between"
                >
                    <span
                        class="text-xs font-medium px-2 py-1 rounded bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                    >
                        Training
                    </span>
                    <a
                        href="/events"
                        class="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                        Zum Kalender &rarr;
                    </a>
                </div>
            </div>
        {/if}

        <div
            class="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-sm border border-zinc-100 dark:border-zinc-700 md:col-span-3 lg:col-span-1"
        >
            <h3
                class="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4"
            >
                Offene Aufgaben
            </h3>
            <TodoList />
        </div>

        <div
            class="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg text-white"
        >
            <h3 class="text-blue-100 font-medium">Quick Actions</h3>
            <div class="mt-4 space-y-2">
                {#if $auth.user?.status && $auth.user.status >= 2}
                    <a
                        href="/events"
                        class="flex items-center gap-3 bg-white/10 hover:bg-white/20 transition-colors px-3 py-2 rounded-lg text-sm font-medium text-white"
                    >
                        <Calendar class="w-4 h-4" />
                        Kalender anschauen
                    </a>
                    <a
                        href="/resources"
                        class="flex items-center gap-3 bg-white/10 hover:bg-white/20 transition-colors px-3 py-2 rounded-lg text-sm font-medium text-white"
                    >
                        <DraftingCompass class="w-4 h-4" />
                        Boot buchen
                    </a>
                {/if}
                <a
                    href="/groups"
                    class="flex items-center gap-3 bg-white/10 hover:bg-white/20 transition-colors px-3 py-2 rounded-lg text-sm font-medium text-white"
                >
                    <Users class="w-4 h-4" />
                    Gruppen verwalten
                </a>
            </div>
        </div>
    </div>
</div>
