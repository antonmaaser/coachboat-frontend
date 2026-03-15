<script lang="ts">
    import Button from "$lib/components/ui/Button.svelte";

    let {
        checked = $bindable(false),
        label = "",
        onchange,
        id = crypto.randomUUID(),
        class: className = "",
        ...rest
    } = $props<{
        checked: boolean;
        label?: string;
        onchange?: (checked: boolean) => void;
        id?: string;
        class?: string;
        [key: string]: any;
    }>();

    function handleToggle() {
        const next = !checked;
        checked = next;
        onchange?.(next);
    }
</script>

<div class={className}>
    <Button
        variant="switch"
        type="button"
        role="switch"
        aria-checked={checked}
        onclick={handleToggle}
        {...rest}
    >
        <div
            class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 {checked
                ? 'bg-blue-600'
                : 'bg-zinc-200 dark:bg-zinc-700'}"
        >
            <span class="sr-only">{label || "Umschalter"}</span>
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
    </Button>
</div>
