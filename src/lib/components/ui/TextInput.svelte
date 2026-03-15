<script lang="ts">
    import type { ComponentType } from "svelte";

    let {
        value = $bindable(""),
        type = "text",
        label = "",
        placeholder = "",
        id = crypto.randomUUID(),
        name = "",
        required = false,
        disabled = false,
        error = "",
        multiline = false,
        rows = 3,
        icon: Icon,
        class: className = "",
        ...rest
    } = $props<{
        value: string;
        type?: string;
        label?: string;
        placeholder?: string;
        id?: string;
        name?: string;
        required?: boolean;
        disabled?: boolean;
        error?: string;
        multiline?: boolean;
        rows?: number;
        icon?: ComponentType;
        class?: string;
        [key: string]: any;
    }>();

    // Derived classes for consistent styling
    // Based on Login page styles
    const baseInputClasses =
        "block w-full rounded-lg border-0 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-900 dark:text-white ring-1 ring-inset ring-zinc-200 dark:ring-zinc-700 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 transition-all disabled:opacity-50 disabled:cursor-not-allowed";
    const paddingClasses = $derived(Icon ? "pl-10 py-3" : "px-3 py-2");
</script>

<div class={className}>
    {#if label}
        <label
            for={id}
            class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
        >
            {label}
            {#if required}<span class="text-red-500">*</span>{/if}
        </label>
    {/if}

    <div class="relative">
        {#if Icon}
            <div
                class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400"
            >
                <Icon class="h-5 w-5" />
            </div>
        {/if}

        {#if multiline}
            <textarea
                {id}
                {name}
                bind:value
                {required}
                {disabled}
                {placeholder}
                {rows}
                class="{baseInputClasses} {paddingClasses}"
                {...rest}
            ></textarea>
        {:else}
            <input
                {id}
                {name}
                {type}
                bind:value
                {required}
                {disabled}
                {placeholder}
                class="{baseInputClasses} {paddingClasses}"
                {...rest}
            />
        {/if}
    </div>

    {#if error}
        <p class="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
    {/if}
</div>
