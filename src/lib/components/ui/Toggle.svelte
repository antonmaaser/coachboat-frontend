<script lang="ts">
    let {
        checked = $bindable(false),
        label = "",
        id = crypto.randomUUID(),
        class: className = "",
        ...rest
    } = $props<{
        checked: boolean;
        label?: string;
        id?: string;
        class?: string;
        [key: string]: any;
    }>();
</script>

<button
    type="button"
    role="switch"
    aria-checked={checked}
    onclick={() => (checked = !checked)}
    class="flex items-center gap-2 text-xs text-zinc-500 cursor-pointer focus:outline-none group {className}"
    {...rest}
>
    <div
        class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 {checked
            ? 'bg-blue-600'
            : 'bg-zinc-200 dark:bg-zinc-700'}"
    >
        <span class="sr-only">{label || "Toggle"}</span>
        <span
            aria-hidden="true"
            class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out {checked
                ? 'translate-x-4'
                : 'translate-x-0'}"
        ></span>
    </div>
    {#if label}
        <span
            class="group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors"
            >{label}</span
        >
    {/if}
</button>
