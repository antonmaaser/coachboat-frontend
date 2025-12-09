<script lang="ts">
    import { eventApi } from "$lib/api/events";
    import { resourceApi } from "$lib/api/resources";
    import { userApi } from "$lib/api/users";
    import { auth } from "$lib/stores/auth";
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
    let resources = $state<any[]>([]);
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

    onMount(async () => {
        try {
            const res = await resourceApi.list();
            if (res.ok) {
                const json = await res.json();
                resources = json.data || json;
            }
        } catch (e) {
            console.error("Failed to load resources", e);
        }
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
            if (!attr.date) return false;

            // Handle ISO string and timezone conversion by parsing as Date
            const d = new Date(attr.date);
            const eventDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

            return eventDateStr === dateStr;
        });
    }
    import Modal from "$lib/components/Modal.svelte";

    let showCreateModal = $state(false);
    let showDetailModal = $state(false);
    let selectedEvent = $state<any>(null);
    let selectedResource = $state<any>(null);
    let selectedUser = $state<any>(null);
    let creating = $state(false);
    let editTargetId = $state<string | null>(null);

    let canEdit = $derived(
        $auth.user &&
            selectedUser &&
            ($auth.user.status >= 3 || $auth.user.id === selectedUser.id),
    );

    function formatDate(dateStr: string) {
        if (!dateStr) return "";
        const d = new Date(dateStr);
        // Use local date components
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        return `${day}.${month}.${year}`;
    }

    function formatSeconds(seconds: number | string) {
        const sec = Number(seconds);
        if (isNaN(sec)) return "";
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }

    async function handleEventClick(event: any) {
        selectedEvent = event;
        selectedResource = null; // Reset
        selectedUser = null; // Reset
        showDetailModal = true;

        const resourceId = event.attributes.resource;
        if (resourceId) {
            try {
                const res = await resourceApi.get(resourceId);
                if (res.ok) {
                    const json = await res.json();
                    selectedResource = json.data || json;
                }
            } catch (e) {
                console.error("Failed to load resource details", e);
            }
        }

        // Fetch user/creator
        // User specified that user ID is in 'created-by' field
        const userId =
            event.attributes?.["created-by"] ||
            event.relationships?.user?.data?.id ||
            event.relationships?.owner?.data?.id ||
            event.relationships?.creator?.data?.id ||
            event.attributes?.user_id ||
            event.attributes?.userId;

        if (userId) {
            try {
                const res = await userApi.get(userId);
                if (res.ok) {
                    const json = await res.json();
                    selectedUser = json.data || json;
                }
            } catch (e) {
                console.error("Failed to load user details", e);
            }
        }
    }

    function getLocalISODate() {
        const d = new Date();
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().split("T")[0];
    }

    // Form State
    let newEvent = $state({
        title: "",
        date: getLocalISODate(),
        startTime: "08:00",
        endTime: "10:00",
        resource: "",
    });

    function handleEdit() {
        if (!selectedEvent) return;

        editTargetId = selectedEvent.id;
        // Populate form
        newEvent = {
            title: selectedEvent.attributes.title,
            date: selectedEvent.attributes.date.split("T")[0],
            startTime: formatSeconds(selectedEvent.attributes["start-date"]),
            endTime: formatSeconds(selectedEvent.attributes["end-date"]),
            resource: selectedEvent.attributes.resource,
        };

        showDetailModal = false;
        showCreateModal = true;
    }

    async function handleCreateEvent(e: Event) {
        e.preventDefault();
        creating = true;
        try {
            // Convert time strings (HH:MM) to seconds from midnight
            const [startH, startM] = newEvent.startTime.split(":").map(Number);
            const [endH, endM] = newEvent.endTime.split(":").map(Number);

            const startSeconds = startH * 3600 + startM * 60;
            const endSeconds = endH * 3600 + endM * 60;

            const payload = {
                title: newEvent.title,
                date: newEvent.date,
                "start-date": startSeconds,
                "end-date": endSeconds,
                resource: newEvent.resource,
            };

            let res;
            if (editTargetId) {
                res = await eventApi.update(editTargetId, payload);
            } else {
                res = await eventApi.create(payload);
            }

            if (res.ok) {
                showCreateModal = false;
                editTargetId = null; // Reset
                loadEvents(); // Refresh
                // Reset form
                newEvent = {
                    title: "",
                    date: getLocalISODate(),
                    startTime: "08:00",
                    endTime: "10:00",
                    resource: "",
                };
            } else {
                alert(
                    editTargetId
                        ? "Failed to update event"
                        : "Failed to create event",
                );
            }
        } catch (err) {
            console.error(err);
            alert("Error saving event");
        } finally {
            creating = false;
        }
    }

    function openCreateModal() {
        editTargetId = null;
        newEvent = {
            title: "",
            date: getLocalISODate(),
            startTime: "08:00",
            endTime: "10:00",
            resource: "",
        };
        showCreateModal = true;
    }

    let isAdmin = $derived($auth.user?.status && $auth.user.status >= 3);
</script>

<div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
            <h1 class="text-2xl font-bold text-zinc-900 dark:text-white">
                Buchungen
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

        {#if isAdmin}
            <button
                onclick={openCreateModal}
                class="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-blue-600/20"
            >
                <Plus class="w-5 h-5" />
                Neue Buchung
            </button>
        {/if}
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
                <div
                    class="flex w-full justify-center py-12 text-zinc-500 gap-2 items-center"
                >
                    <Loader2 class="w-5 h-5 animate-spin" />
                    <span class="text-sm font-medium"
                        >Buchungen werden geladen...</span
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
                                <!-- svelte-ignore a11y_click_events_have_key_events -->
                                <!-- svelte-ignore a11y_no_static_element_interactions -->
                                <div
                                    onclick={(e) => {
                                        e.stopPropagation();
                                        handleEventClick(event);
                                    }}
                                    class="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded truncate border border-blue-200 dark:border-blue-800 cursor-pointer hover:opacity-80"
                                >
                                    {event.attributes?.title || "Buchung"}
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    </div>
</div>

<Modal
    title={editTargetId ? "Buchung bearbeiten" : "Neue Buchung erstellen"}
    bind:show={showCreateModal}
>
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

        {#if !editTargetId}
            <div>
                <label
                    for="resource"
                    class="block text-sm font-medium text-zinc-900 dark:text-white"
                    >Resource</label
                >
                <select
                    id="resource"
                    required
                    bind:value={newEvent.resource}
                    class="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-zinc-700 dark:border-zinc-600 dark:text-white p-2 border"
                >
                    <option value="" disabled>Select a resource</option>
                    {#each resources as r}
                        <option value={r.id}>{r.attributes.title}</option>
                    {/each}
                </select>
            </div>
        {/if}

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
                {creating
                    ? "Saving..."
                    : editTargetId
                      ? "Buchung aktualisieren"
                      : "Buchung erstellen"}
            </button>
        </div>
    </form>
</Modal>

<Modal title="Buchungsdetails" bind:show={showDetailModal}>
    {#if selectedEvent}
        <div class="space-y-4">
            <div>
                <h3 class="text-lg font-bold text-zinc-900 dark:text-white">
                    {selectedEvent.attributes.title}
                </h3>
                <p class="text-sm text-zinc-500 dark:text-zinc-400">
                    {formatDate(selectedEvent.attributes.date)}
                </p>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div class="bg-zinc-50 dark:bg-zinc-700/50 p-3 rounded-lg">
                    <span
                        class="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase"
                        >Time</span
                    >
                    <span class="text-zinc-900 dark:text-white">
                        {formatSeconds(selectedEvent.attributes["start-date"])} -
                        {formatSeconds(selectedEvent.attributes["end-date"])}
                    </span>
                </div>
                <div class="bg-zinc-50 dark:bg-zinc-700/50 p-3 rounded-lg">
                    <span
                        class="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase"
                        >Resource</span
                    >
                    <span class="text-zinc-900 dark:text-white">
                        {#if selectedResource}
                            {selectedResource.attributes.title}
                        {:else}
                            Loading...
                        {/if}
                    </span>
                </div>
            </div>

            <div>
                <span
                    class="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase mb-1"
                    >Created By</span
                >
                <span
                    class="text-zinc-900 dark:text-white bg-zinc-50 dark:bg-zinc-700/50 px-3 py-2 rounded-lg block"
                >
                    {#if selectedUser}
                        {selectedUser.attributes["first-name"]}
                        {selectedUser.attributes.name}
                    {:else}
                        Unknown
                    {/if}
                </span>
            </div>

            <div class="flex justify-end gap-2 pt-2">
                {#if canEdit}
                    <button
                        onclick={handleEdit}
                        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                    >
                        Edit
                    </button>
                {/if}
                <button
                    onclick={() => (showDetailModal = false)}
                    class="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-md hover:bg-zinc-50 dark:bg-zinc-700 dark:text-zinc-300 dark:border-zinc-600 dark:hover:bg-zinc-600"
                >
                    Close
                </button>
            </div>
        </div>
    {/if}
</Modal>
