<script lang="ts">
    import { ChevronDown, Search, X } from "lucide-svelte";
    import { slide } from "svelte/transition";
    import { clickOutside } from "$lib/actions/clickOutside";
    import Button from "$lib/components/ui/Button.svelte";

    let {
        options = [],
        value = $bindable(""),
        placeholder = "Option auswählen...",
        label = "",
        class: className = "",
        searchable = true,
        onchange,
        id = crypto.randomUUID(),
    } = $props<{
        options: { value: string; label: string; [key: string]: any }[];
        value: string | null;
        placeholder?: string;
        label?: string;
        class?: string;
        searchable?: boolean;
        onchange?: (value: string) => void;
        id?: string;
    }>();

    let isOpen = $state(false);
    let searchTerm = $state("");
    let inputRef = $state<HTMLInputElement>();

    // Derived state
    const filteredOptions = $derived(
        options.filter((opt: any) =>
            searchable
                ? opt.label.toLowerCase().includes(searchTerm.toLowerCase())
                : true,
        ),
    );

    const selectedOption = $derived(
        options.find((opt: any) => opt.value === value),
    );

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
            for={id}
            class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
        >
            {label}
        </label>
    {/if}

    <div class="relative" use:clickOutside={close}>
        <Button
            variant="outline"
            tone="neutral"
            width="full"
            align="left"
            type="button"
            {id}
            onclick={toggleOpen}
        >
            <span
                class="flex w-full items-center justify-between gap-2 truncate {selectedOption
                    ? 'text-zinc-900 dark:text-white'
                    : 'text-zinc-500'}"
            >
                <span class="truncate">
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown class="h-4 w-4 text-zinc-400" aria-hidden="true" />
            </span>
        </Button>

        {#if value && searchable}
            <div class="absolute inset-y-0 right-1 flex items-center">
                <Button
                    variant="ghost"
                    tone="neutral"
                    iconOnly
                    ariaLabel="Auswahl löschen"
                    size="sm"
                    onclick={clearSelection}
                >
                    <X class="h-3 w-3" />
                </Button>
            </div>
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
                        <Button
                            variant="menu"
                            tone={option.value === value
                                ? "primary"
                                : "neutral"}
                            align="left"
                            size="xs"
                            type="button"
                            onclick={() => handleSelect(option)}
                        >
                            <span class="block truncate font-medium">
                                {option.label}
                            </span>
                        </Button>
                    {/each}
                {/if}
            </div>
        {/if}
    </div>
</div>
