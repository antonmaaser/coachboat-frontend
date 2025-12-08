<script lang="ts">
    import { eventApi } from "$lib/api/events";
    import {
        ChevronLeft,
        ChevronRight,
        Plus,
        Loader2,
        AlertCircle,
    } from "lucide-svelte";
    import { onMount } from "svelte";

    let currentDate = $state(new Date());
    let events = $state<any[]>([]);
    let loading = $state(false);
    let error = $state("");

    // Derived values for Calendar
    let year = $derived(currentDate.getFullYear());
    let month = $derived(currentDate.getMonth()); // 0-11
    let monthName = $derived(
        currentDate.toLocaleString("default", { month: "long" }),
    );

    let daysInMonth = $derived(new Date(year, month + 1, 0).getDate());
    let firstDayOfWeek = $derived(new Date(year, month, 1).getDay()); // 0=Sun, 1=Mon...
    // Adjust for Monday start (German standard usually)
    let startOffset = $derived((firstDayOfWeek + 6) % 7);

    let calendarDays = $derived.by(() => {
        const days = [];
        // Padding
        for (let i = 0; i < startOffset; i++) {
            days.push(null);
        }
        // Days
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i);
        }
        return days;
    });

    async function loadEvents() {
        loading = true;
        error = "";
        try {
            const res = await eventApi.list(year, month + 1); // API expects 1-12
            if (res.ok) {
                const json = await res.json();
                // API definition: Response: Array of event objects.
                // If JSON:API, it might be { data: [...] }
                // User doc: "Response: Array of event objects" -> could be direct array or wrapped.
                // Usually JSON:API is { data: [...] }. Let's assume { data: [...] } if wrapped, or fallback.
                // Based on `client` usage in login, we parsed json.

                // Let's assume standard JSON:API-ish used in Login.
                events = json.data || json;
            } else {
                console.error("Failed to load events", res.status);
                if (res.status === 403 || res.status === 401) {
                    error =
                        "Nicht autorisiert. Bitte loggen Sie sich erneut ein.";
                } else {
                    error = "Fehler beim Laden der Termine.";
                }
            }
        } catch (e) {
            console.error(e);
            error = "Ein unerwarteter Fehler ist aufgetreten.";
        } finally {
            loading = false;
        }
    }

    // Reload when date changes
    $effect(() => {
        loadEvents();
    });

    function prevMonth() {
        currentDate = new Date(year, month - 1, 1);
    }

    function nextMonth() {
        currentDate = new Date(year, month + 1, 1);
    }

    function getEventsForDay(day: number) {
        if (!day) return [];
        // Map events to day. Event date format "2023-10-27"
        // Date string format: YYYY-MM-DD
        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        return events.filter((e: any) => {
            const attr = e.attributes || e;
            return attr.date === dateStr;
        });
    }
    import Modal from "$lib/components/Modal.svelte";

    let showCreateModal = $state(false);
    let creating = $state(false);

    // Form State
    let newEvent = $state({
        title: "",
        date: new Date().toISOString().split("T")[0],
        startTime: "08:00",
        endTime: "10:00",
        description: "",
    });

    async function handleCreateEvent(e: Event) {
        e.preventDefault();
        creating = true;
        try {
            const start = new Date(`${newEvent.date}T${newEvent.startTime}:00`);
            const end = new Date(`${newEvent.date}T${newEvent.endTime}:00`);

            const res = await eventApi.create({
                title: newEvent.title,
                date: newEvent.date,
                "start-date": start.toISOString(),
                "end-date": end.toISOString(),
                description: newEvent.description,
            });

            if (res.ok) {
                showCreateModal = false;
                loadEvents(); // Refresh
                // Reset form
                newEvent = {
                    title: "",
                    date: new Date().toISOString().split("T")[0],
                    startTime: "08:00",
                    endTime: "10:00",
                    description: "",
                };
            } else {
                alert("Failed to create event");
            }
        } catch (err) {
            console.error(err);
            alert("Error creating event");
        } finally {
            creating = false;
        }
    }
</script>

<div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
            <h1 class="text-2xl font-bold text-zinc-900 dark:text-white">
                Events
            </h1>
            <div
                class="flex items-center bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-sm"
            >
                <button
                    onclick={prevMonth}
                    class="p-2 hover:bg-zinc-50 dark:hover:bg-zinc-700 rounded-l-lg transition-colors"
                >
                    <ChevronLeft
                        class="w-5 h-5 text-zinc-600 dark:text-zinc-400"
                    />
                </button>
                <span
                    class="px-4 py-2 font-medium min-w-[140px] text-center text-zinc-900 dark:text-white border-x border-zinc-200 dark:border-zinc-700"
                >
                    {monthName}
                    {year}
                </span>
                <button
                    onclick={nextMonth}
                    class="p-2 hover:bg-zinc-50 dark:hover:bg-zinc-700 rounded-r-lg transition-colors"
                >
                    <ChevronRight
                        class="w-5 h-5 text-zinc-600 dark:text-zinc-400"
                    />
                </button>
            </div>
        </div>

        <button
            onclick={() => (showCreateModal = true)}
            class="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-blue-600/20"
        >
            <Plus class="w-5 h-5" />
            New Event
        </button>
    </div>

    {#if error}
        <div
            class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl flex items-center gap-3"
        >
            <AlertCircle class="w-5 h-5 shrink-0" />
            <p>{error}</p>
        </div>
    {/if}

    <!-- Calendar Grid -->
    <div
        class="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden relative"
    >
        {#if loading}
            <div
                class="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-zinc-800/50 z-10 transition-opacity"
            >
                <div class="flex flex-col items-center gap-2">
                    <Loader2 class="w-8 h-8 animate-spin text-blue-600" />
                    <span class="text-sm font-medium text-zinc-500"
                        >Events werden geladen...</span
                    >
                </div>
            </div>
        {/if}

        <!-- Days Header -->
        <div
            class="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50"
        >
            {#each ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as day}
                <div
                    class="py-3 text-center text-sm font-semibold text-zinc-500 dark:text-zinc-400"
                >
                    {day}
                </div>
            {/each}
        </div>

        <!-- Days Grid -->
        <div class="grid grid-cols-7 auto-rows-fr min-h-[600px]">
            {#each calendarDays as day}
                <div
                    class="min-h-[100px] border-b border-r border-zinc-100 dark:border-zinc-700/50 p-2 relative group hover:bg-zinc-50 dark:hover:bg-zinc-700/20 transition-colors"
                >
                    {#if day}
                        <span
                            class="text-sm font-medium text-zinc-700 dark:text-zinc-300 block mb-1 {day ===
                                new Date().getDate() &&
                            month === new Date().getMonth() &&
                            year === new Date().getFullYear()
                                ? 'bg-blue-600 text-white w-7 h-7 flex items-center justify-center rounded-full'
                                : ''}"
                        >
                            {day}
                        </span>

                        <div class="space-y-1">
                            {#each getEventsForDay(day) as event}
                                <div
                                    class="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded truncate border border-blue-200 dark:border-blue-800 cursor-pointer hover:opacity-80"
                                >
                                    {event.attributes?.title || "Event"}
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    </div>
</div>

<Modal title="Create New Event" bind:show={showCreateModal}>
    <form class="space-y-4" onsubmit={handleCreateEvent}>
        <div>
            <label
                for="title"
                class="block text-sm font-medium text-zinc-900 dark:text-white"
                >Title</label
            >
            <input
                type="text"
                id="title"
                required
                bind:value={newEvent.title}
                class="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-zinc-700 dark:border-zinc-600 dark:text-white p-2 border"
            />
        </div>

        <div class="grid grid-cols-2 gap-4">
            <div>
                <label
                    for="date"
                    class="block text-sm font-medium text-zinc-900 dark:text-white"
                    >Date</label
                >
                <input
                    type="date"
                    id="date"
                    required
                    bind:value={newEvent.date}
                    class="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-zinc-700 dark:border-zinc-600 dark:text-white p-2 border"
                />
            </div>
            <div>
                <label
                    for="startTime"
                    class="block text-sm font-medium text-zinc-900 dark:text-white"
                    >Time</label
                >
                <div class="flex gap-2">
                    <input
                        type="time"
                        required
                        bind:value={newEvent.startTime}
                        class="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-zinc-700 dark:border-zinc-600 dark:text-white p-2 border"
                    />
                    <input
                        type="time"
                        required
                        bind:value={newEvent.endTime}
                        class="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-zinc-700 dark:border-zinc-600 dark:text-white p-2 border"
                    />
                </div>
            </div>
        </div>

        <div>
            <label
                for="desc"
                class="block text-sm font-medium text-zinc-900 dark:text-white"
                >Description</label
            >
            <textarea
                id="desc"
                rows="3"
                bind:value={newEvent.description}
                class="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-zinc-700 dark:border-zinc-600 dark:text-white p-2 border"
            ></textarea>
        </div>

        <div class="flex justify-end gap-3 pt-2">
            <button
                type="button"
                onclick={() => (showCreateModal = false)}
                class="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-md hover:bg-zinc-50 dark:bg-zinc-700 dark:text-zinc-300 dark:border-zinc-600 dark:hover:bg-zinc-600"
            >
                Cancel
            </button>
            <button
                type="submit"
                disabled={creating}
                class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
                {creating ? "Creating..." : "Create Event"}
            </button>
        </div>
    </form>
</Modal>
