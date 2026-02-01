<script lang="ts">
    import { eventApi } from "$lib/api/events";
    import { resourceApi } from "$lib/api/resources";
    import { resourceCategoryApi } from "$lib/api/resource-categories";
    import { userApi } from "$lib/api/users";
    import { auth, hasPermission } from "$lib/stores/auth";
    import {
        ChevronLeft,
        ChevronRight,
        Plus,
        Loader2,
        AlertCircle, // Keeping this just in case, but ErrorAlert uses its own icon
    } from "lucide-svelte";
    import * as Icons from "lucide-svelte";
    import { onMount } from "svelte";
    import Modal from "$lib/components/Modal.svelte";
    import SearchableSelect from "$lib/components/ui/SearchableSelect.svelte";
    import { extractErrorMessage } from "$lib/utils/error";
    import ErrorAlert from "$lib/components/ui/ErrorAlert.svelte";
    import { toast } from "$lib/stores/toast";

    let currentDate = $state(new Date());
    let events = $state<any[]>([]);
    let resources = $state<any[]>([]);
    let categories = $state<any[]>([]);
    let selectedCategoryId = $state<string | null>(null);
    let selectedDay = $state(new Date().getDate());
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
            const res = await eventApi.list(year, month + 1);
            if (res.ok) {
                const json = await res.json();
                events = (json.data || json).map(normalizeEvent);
            } else {
                console.error("Failed to load events", res.status);
                if (res.status === 403 || res.status === 401) {
                    error =
                        "Nicht autorisiert. Bitte loggen Sie sich erneut ein.";
                } else {
                    error = await extractErrorMessage(res);
                }
            }
        } catch (e) {
            console.error(e);
            error = await extractErrorMessage(e);
        } finally {
            loading = false;
        }
    }

    function normalizeEvent(event: any) {
        if (event.attributes["recurrence-rule"]) {
            const rule = event.attributes["recurrence-rule"];
            event.attributes["recurrence-freq"] = rule.freq.toLowerCase();
            event.attributes["recurrence-interval"] = rule.interval;
            event.attributes["recurrence-end-date"] = rule.end;
        }
        return event;
    }

    // Reload when date changes
    $effect(() => {
        loadEvents();
    });

    onMount(async () => {
        try {
            const [resResources, resCategories] = await Promise.all([
                resourceApi.list(),
                resourceCategoryApi.list(),
            ]);

            if (resResources.ok) {
                const json = await resResources.json();
                resources = json.data || json;
            }
            if (resCategories.ok) {
                const json = await resCategories.json();
                categories = json.data || json;
            }
        } catch (e) {
            console.error("Failed to load data", e);
        }
    });

    function prevMonth() {
        currentDate = new Date(year, month - 1, 1);
        selectedDay = 1;
    }

    function nextMonth() {
        currentDate = new Date(year, month + 1, 1);
        selectedDay = 1;
    }

    function getEventsForDay(day: number) {
        if (!day) return [];
        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        return events.filter((e: any) => {
            // Date Filter
            const attr = e.attributes || e;
            if (!attr.date) return false;
            const d = new Date(attr.date);
            const eventDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            if (eventDateStr !== dateStr) return false;

            // Category Filter
            if (selectedCategoryId) {
                const resourceId = attr.resource;
                if (!resourceId) return false;
                const resource = resources.find(
                    (r) => String(r.id) === String(resourceId),
                );
                if (!resource) return false;

                // Ensure type safety when comparing
                if (
                    String(resource.attributes["category-id"]) !==
                    String(selectedCategoryId)
                )
                    return false;
            }

            return true;
        });
    }

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
            (hasPermission($auth.user, "events:update:any") ||
                $auth.user?.id === selectedUser.id),
    );

    function formatDate(dateStr: string) {
        if (!dateStr) return "";
        const d = new Date(dateStr);
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
        selectedResource = null;
        selectedUser = null;
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
        isRecurring: false,
        recurrenceFreq: "daily",
        recurrenceInterval: 1,
        recurrenceEndDate: "",
    });

    function handleEdit() {
        if (!selectedEvent) return;

        editTargetId =
            selectedEvent.attributes["original-id"] || selectedEvent.id;
        newEvent = {
            title: selectedEvent.attributes.title,
            date: selectedEvent.attributes.date.split("T")[0],
            startTime: formatSeconds(selectedEvent.attributes["start-date"]),
            endTime: formatSeconds(selectedEvent.attributes["end-date"]),
            resource: selectedEvent.attributes.resource,
            isRecurring: selectedEvent.attributes["is-recurring"] || false,
            recurrenceFreq:
                selectedEvent.attributes["recurrence-freq"] || "daily",
            recurrenceInterval:
                selectedEvent.attributes["recurrence-interval"] || 1,
            recurrenceEndDate: selectedEvent.attributes["recurrence-end-date"]
                ? selectedEvent.attributes["recurrence-end-date"].split("T")[0]
                : "",
        };

        showDetailModal = false;
        showCreateModal = true;
    }

    async function handleCreateEvent(e: Event) {
        e.preventDefault();
        creating = true;
        try {
            const [startH, startM] = newEvent.startTime.split(":").map(Number);
            const [endH, endM] = newEvent.endTime.split(":").map(Number);

            const startSeconds = startH * 3600 + startM * 60;
            const endSeconds = endH * 3600 + endM * 60;

            const payload: any = {
                title: newEvent.title,
                date: newEvent.date,
                "start-date": startSeconds,
                "end-date": endSeconds,
                resource: newEvent.resource,
                "is-recurring": newEvent.isRecurring,
            };

            if (newEvent.isRecurring) {
                payload["recurrence-freq"] =
                    newEvent.recurrenceFreq.toUpperCase();
                payload["recurrence-interval"] = newEvent.recurrenceInterval;
                payload["recurrence-end-date"] = newEvent.recurrenceEndDate;
            }

            let res;
            if (editTargetId) {
                res = await eventApi.update(editTargetId, payload);
            } else {
                res = await eventApi.create(payload);
            }

            if (res.ok) {
                showCreateModal = false;
                editTargetId = null;
                loadEvents();
                newEvent = {
                    title: "",
                    date: getLocalISODate(),
                    startTime: "08:00",
                    endTime: "10:00",
                    resource: "",
                    isRecurring: false,
                    recurrenceFreq: "daily",
                    recurrenceInterval: 1,
                    recurrenceEndDate: "",
                };
            } else {
                const msg = await extractErrorMessage(res);
                toast.error(msg);
            }
        } catch (err) {
            console.error(err);
            const msg = await extractErrorMessage(err);
            toast.error(msg);
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
            isRecurring: false,
            recurrenceFreq: "daily",
            recurrenceInterval: 1,
            recurrenceEndDate: "",
        };
        showCreateModal = true;
    }

    let canCreate = $derived(hasPermission($auth.user, "events:create"));
</script>

<div class="space-y-6">
    <!-- Header -->
    <!-- Header -->
    <div
        class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
    >
        <div
            class="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto"
        >
            <h1 class="text-2xl font-bold text-zinc-900 dark:text-white">
                Buchungen
            </h1>
            <div
                class="flex items-center justify-between bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-sm w-full md:w-auto"
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
                    class="px-4 py-2 font-medium flex-1 md:flex-none text-center text-zinc-900 dark:text-white border-x border-zinc-200 dark:border-zinc-700 min-w-[140px]"
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

        {#if canCreate}
            <button
                onclick={openCreateModal}
                class="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-blue-600/20"
            >
                <Plus class="w-5 h-5" />
                Neue Buchung
            </button>
        {/if}
    </div>

    <!-- Category Filter -->
    {#if categories.length > 0}
        <div class="flex flex-wrap gap-2">
            <button
                class="px-3 py-1.5 rounded-full text-sm font-medium transition-colors border"
                class:bg-zinc-900={!selectedCategoryId}
                class:text-white={!selectedCategoryId}
                class:border-zinc-900={!selectedCategoryId}
                class:bg-white={selectedCategoryId}
                class:text-zinc-600={selectedCategoryId}
                class:border-zinc-200={selectedCategoryId}
                class:dark:bg-white={!selectedCategoryId}
                class:dark:text-zinc-900={!selectedCategoryId}
                class:dark:border-white={!selectedCategoryId}
                class:dark:bg-zinc-800={selectedCategoryId}
                class:dark:text-zinc-400={selectedCategoryId}
                class:dark:border-zinc-700={selectedCategoryId}
                onclick={() => (selectedCategoryId = null)}
            >
                Alle
            </button>
            {#each categories as category}
                <button
                    class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border"
                    style={selectedCategoryId === category.id
                        ? `background-color: ${category.attributes.color}; color: white; border-color: ${category.attributes.color}`
                        : `background-color: transparent; color: ${category.attributes.color}; border-color: ${category.attributes.color}40`}
                    onclick={() =>
                        (selectedCategoryId =
                            selectedCategoryId === category.id
                                ? null
                                : category.id)}
                >
                    {#if category.attributes.icon && (Icons as any)[category.attributes.icon]}
                        {@const Icon = (Icons as any)[category.attributes.icon]}
                        <Icon class="w-4 h-4" />
                    {/if}
                    {category.attributes.title}
                </button>
            {/each}
        </div>
    {/if}

    {#if error}
        <ErrorAlert {error} />
    {/if}

    <!-- Mobile Date Scroller & Event List -->
    <div class="block md:hidden space-y-4">
        <!-- Date Scroller -->
        <div class="flex overflow-x-auto gap-2 pb-2 -mx-4 px-4 scrollbar-hide">
            {#each Array(daysInMonth) as _, i}
                {@const day = i + 1}
                {@const date = new Date(year, month, day)}
                {@const isSelected = selectedDay === day}
                {@const isToday =
                    day === new Date().getDate() &&
                    month === new Date().getMonth() &&
                    year === new Date().getFullYear()}
                {@const hasEvents = getEventsForDay(day).length > 0}
                <button
                    class="flex flex-col items-center justify-center min-w-[3.5rem] h-16 rounded-xl border transition-all relative {isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20'
                        : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'}"
                    onclick={() => (selectedDay = day)}
                >
                    <span class="text-xs font-medium opacity-80">
                        {date.toLocaleDateString("de-DE", { weekday: "short" })}
                    </span>
                    <span class="text-lg font-bold">
                        {day}
                    </span>

                    <div class="absolute bottom-1.5 flex gap-1">
                        {#if isToday && !isSelected}
                            <div
                                class="w-1 h-1 bg-current rounded-full opacity-50"
                            ></div>
                        {/if}
                        {#if hasEvents}
                            <div
                                class="w-1 h-1 bg-blue-500 rounded-full {isSelected
                                    ? 'bg-white'
                                    : ''}"
                            ></div>
                        {/if}
                    </div>
                </button>
            {/each}
        </div>

        <!-- Selected Day Events -->
        <div class="space-y-3">
            <h3 class="font-medium text-zinc-900 dark:text-white px-1">
                {selectedDay}. {monthName}
            </h3>

            {#if loading}
                <div class="flex justify-center py-8">
                    <Loader2 class="w-6 h-6 animate-spin text-zinc-400" />
                </div>
            {:else}
                {@const dayEvents = getEventsForDay(selectedDay)}
                {#if dayEvents.length === 0}
                    <div
                        class="text-center py-8 text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700"
                    >
                        Keine Buchungen für diesen Tag
                    </div>
                {:else}
                    {#each dayEvents as event}
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <div
                            onclick={() => handleEventClick(event)}
                            class="bg-white dark:bg-zinc-800 p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm flex gap-4 active:scale-[0.98] transition-transform"
                        >
                            <div
                                class="flex flex-col items-center justify-center px-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-700 dark:text-blue-300"
                            >
                                <span class="text-xs font-medium">Start</span>
                                <span class="font-bold"
                                    >{formatSeconds(
                                        event.attributes["start-date"],
                                    )}</span
                                >
                            </div>

                            <div class="flex-1 min-w-0 py-1">
                                <h4
                                    class="font-semibold text-zinc-900 dark:text-white truncate"
                                >
                                    {event.attributes.title}
                                </h4>
                                <div
                                    class="flex items-center gap-2 mt-1 text-sm text-zinc-500 dark:text-zinc-400"
                                >
                                    <span>
                                        {formatSeconds(
                                            event.attributes["start-date"],
                                        )} - {formatSeconds(
                                            event.attributes["end-date"],
                                        )}
                                    </span>
                                </div>
                                {#if event.attributes.resource}
                                    {@const r = resources.find(
                                        (r) =>
                                            String(r.id) ===
                                            String(event.attributes.resource),
                                    )}
                                    {#if r}
                                        <div
                                            class="mt-2 text-xs inline-flex items-center px-2 py-1 bg-zinc-100 dark:bg-zinc-700 rounded text-zinc-600 dark:text-zinc-300"
                                        >
                                            {r.attributes.title}
                                        </div>
                                    {/if}
                                {/if}
                            </div>
                        </div>
                    {/each}
                {/if}
            {/if}
        </div>
    </div>

    <!-- Calendar Grid (Desktop) -->
    <div
        class="hidden md:block bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 overflow-hidden relative"
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
            class="hidden md:grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50"
        >
            {#each ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] as day}
                <div
                    class="py-3 text-center text-sm font-semibold text-zinc-500 dark:text-zinc-400"
                >
                    {day}
                </div>
            {/each}
        </div>

        <!-- Days Grid -->
        <div class="hidden md:grid grid-cols-7 auto-rows-fr min-h-[600px]">
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
                >Titel</label
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
                    >Datum</label
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
                    >Zeitraum</label
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

        <!-- Recurring Event Options -->
        <div
            class="space-y-3 pt-2 border-t border-zinc-200 dark:border-zinc-700"
        >
            <div class="flex items-center gap-2">
                <input
                    type="checkbox"
                    id="isRecurring"
                    bind:checked={newEvent.isRecurring}
                    class="rounded border-zinc-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <label
                    for="isRecurring"
                    class="text-sm font-medium text-zinc-900 dark:text-white"
                >
                    Wiederkehrende Buchung
                </label>
            </div>

            {#if newEvent.isRecurring}
                <div
                    class="grid grid-cols-2 gap-4 pl-6 animate-in fade-in slide-in-from-top-2"
                >
                    <div>
                        <SearchableSelect
                            label="Wiederholung"
                            options={[
                                { value: "daily", label: "Täglich" },
                                { value: "weekly", label: "Wöchentlich" },
                                { value: "monthly", label: "Monatlich" },
                                { value: "yearly", label: "Jährlich" },
                            ]}
                            bind:value={newEvent.recurrenceFreq}
                            searchable={false}
                            placeholder="Wähle Frequenz"
                        />
                    </div>

                    <div>
                        <label
                            for="endDate"
                            class="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1"
                        >
                            Endet am
                        </label>
                        <input
                            type="date"
                            id="endDate"
                            required={newEvent.isRecurring}
                            bind:value={newEvent.recurrenceEndDate}
                            class="block w-full rounded-md border-zinc-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm dark:bg-zinc-700 dark:border-zinc-600 dark:text-white p-2 border"
                        />
                    </div>
                </div>
            {/if}
        </div>

        {#if !editTargetId}
            <div>
                <label
                    for="resource"
                    class="block text-sm font-medium text-zinc-900 dark:text-white mb-1"
                    >Coachboat</label
                >
                <SearchableSelect
                    options={resources.map((r) => ({
                        value: r.id,
                        label: r.attributes.title,
                    }))}
                    bind:value={newEvent.resource}
                    placeholder="Coachboat auswählen..."
                />
            </div>
        {/if}

        <div class="flex justify-end gap-3 pt-2">
            <button
                type="button"
                onclick={() => (showCreateModal = false)}
                class="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-md hover:bg-zinc-50 dark:bg-zinc-700 dark:text-zinc-300 dark:border-zinc-600 dark:hover:bg-zinc-600"
            >
                Abbrechen
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
                        >Zeitraum</span
                    >
                    <span class="text-zinc-900 dark:text-white">
                        {formatSeconds(selectedEvent.attributes["start-date"])} -
                        {formatSeconds(selectedEvent.attributes["end-date"])}
                    </span>
                </div>
                <div class="bg-zinc-50 dark:bg-zinc-700/50 p-3 rounded-lg">
                    <span
                        class="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase"
                        >Coachboat</span
                    >
                    <span class="text-zinc-900 dark:text-white">
                        {#if selectedResource}
                            {selectedResource.attributes.title}
                        {:else}
                            Lade...
                        {/if}
                    </span>
                </div>
            </div>
        </div>

        {#if selectedEvent.attributes["is-recurring"]}
            <div
                class="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800 my-4"
            >
                <div class="flex items-center gap-2 mb-1">
                    <Icons.Repeat
                        class="w-4 h-4 text-blue-600 dark:text-blue-400"
                    />
                    <span
                        class="text-sm font-semibold text-blue-900 dark:text-blue-100"
                    >
                        Wiederkehrende Buchung
                    </span>
                </div>
                <p class="text-sm text-blue-800 dark:text-blue-200">
                    Diese Buchung wiederholt sich
                    {#if selectedEvent.attributes["recurrence-end-date"]}
                        bis zum {formatDate(
                            selectedEvent.attributes["recurrence-end-date"],
                        )}
                    {/if}
                    in
                    {#if selectedEvent.attributes["recurrence-freq"] === "daily"}
                        täglichen
                    {:else if selectedEvent.attributes["recurrence-freq"] === "weekly"}
                        wöchentlichen
                    {:else if selectedEvent.attributes["recurrence-freq"] === "monthly"}
                        monatlichen
                    {:else if selectedEvent.attributes["recurrence-freq"] === "yearly"}
                        jährlichen
                    {/if}
                    Abständen.
                </p>
            </div>
        {/if}

        <div>
            <div>
                <span
                    class="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase mb-1"
                    >Erstellt von</span
                >
                <span
                    class="text-zinc-900 dark:text-white bg-zinc-50 dark:bg-zinc-700/50 px-3 py-2 rounded-lg block"
                >
                    {#if selectedUser}
                        {selectedUser.attributes["first-name"]}
                        {selectedUser.attributes.name}
                    {:else}
                        Unbekannt
                    {/if}
                </span>
            </div>

            <div class="flex justify-end gap-2 pt-2">
                {#if canEdit}
                    <button
                        onclick={handleEdit}
                        class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                    >
                        Bearbeiten
                    </button>
                {/if}
                <button
                    onclick={() => (showDetailModal = false)}
                    class="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-md hover:bg-zinc-50 dark:bg-zinc-700 dark:text-zinc-300 dark:border-zinc-600 dark:hover:bg-zinc-600"
                >
                    Schließen
                </button>
            </div>
        </div>
    {/if}
</Modal>
