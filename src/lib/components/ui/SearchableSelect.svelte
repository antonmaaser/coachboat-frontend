<script lang="ts">
    import { ChevronDown, Search, X } from "lucide-svelte";
    import { slide } from "svelte/transition";
    import { clickOutside } from "$lib/actions/clickOutside";

    let {
        options = [],
        value = $bindable(""),
        placeholder = "Select an option...",
        label = "",
        class: className = "",
        searchable = true,
        onchange,
    } = $props<{
        options: { value: string; label: string; [key: string]: any }[];
        value: string | null;
        placeholder?: string;
        label?: string;
        class?: string;
        searchable?: boolean;
        onchange?: (value: string) => void;
    }>();

    let isOpen = $state(false);
    let searchTerm = $state("");
    let inputRef = $state<HTMLInputElement>();

    // Derived state
    const filteredOptions = $derived(
        options.filter((opt) =>
            searchable
                ? opt.label.toLowerCase().includes(searchTerm.toLowerCase())
                : true,
        ),
    );

    const selectedOption = $derived(options.find((opt) => opt.value === value));

    function handleSelect(option: any) {
        value = option.value;
        if (onchange) onchange(option.value);
        searchTerm = "";
        isOpen = false;
    }

    function clearSelection(e: Event) {
        e.stopPropagation();
        value = ""; // Or null, depending on how generic we want this. Let's stick to empty string for "no selection" usually, but value prop is string | null now.
        if (onchange) onchange("");
        searchTerm = "";
    }

    function toggleOpen() {
        isOpen = !isOpen;
        if (isOpen && searchable) {
            setTimeout(() => inputRef?.focus(), 50);
        }
    }

    function close() {
        isOpen = false;
        searchTerm = "";
    }
</script>

<div class={className}>
    {#if label}
        <label
            class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
        >
            {label}
        </label>
    {/if}

    <div class="relative" use:clickOutside={close}>
        <button
            type="button"
            onclick={toggleOpen}
            class="relative w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 py-2 pl-3 pr-10 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm transition-all"
        >
            <span
                class="block truncate {selectedOption
                    ? 'text-zinc-900 dark:text-white'
                    : 'text-zinc-500'}"
            >
                {selectedOption ? selectedOption.label : placeholder}
            </span>
            <span
                class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2"
            >
                <ChevronDown class="h-4 w-4 text-zinc-400" aria-hidden="true" />
            </span>
        </button>

        {#if value && searchable}
            <button
                onclick={clearSelection}
                class="absolute inset-y-0 right-8 flex items-center pr-1 text-zinc-400 hover:text-zinc-600"
            >
                <X class="h-3 w-3" />
            </button>
        {/if}

        {#if isOpen}
            <div
                transition:slide={{ duration: 100 }}
                class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white dark:bg-zinc-800 py-1 text-base shadow-xl border border-zinc-200 dark:border-zinc-700 focus:outline-none sm:text-sm"
            >
                {#if searchable}
                    <div
                        class="sticky top-0 z-10 bg-white dark:bg-zinc-800 p-2 border-b border-zinc-100 dark:border-zinc-700"
                    >
                        <div class="relative">
                            <Search
                                class="absolute left-2 top-2.5 h-4 w-4 text-zinc-400"
                            />
                            <input
                                bind:this={inputRef}
                                type="text"
                                bind:value={searchTerm}
                                class="w-full rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 py-1.5 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Suchen..."
                            />
                        </div>
                    </div>
                {/if}

                {#if filteredOptions.length === 0}
                    <div
                        class="relative cursor-default select-none py-2 px-4 text-zinc-500"
                    >
                        Keine Ergebnisse gefunden.
                    </div>
                {:else}
                    {#each filteredOptions as option}
                        <button
                            type="button"
                            onclick={() => handleSelect(option)}
                            class="relative w-full text-left cursor-default select-none py-2.5 px-3 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors {option.value ===
                            value
                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100'
                                : 'text-zinc-700 dark:text-zinc-300'}"
                        >
                            <span class="block truncate font-medium">
                                {option.label}
                            </span>
                        </button>
                    {/each}
                {/if}
            </div>
        {/if}
    </div>
</div>
