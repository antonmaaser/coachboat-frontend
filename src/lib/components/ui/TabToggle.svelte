<script lang="ts">
    import type { ComponentType } from "svelte";
    import Button, { type ButtonSize } from "$lib/components/ui/Button.svelte";

    export type TabToggleOption = {
        value: string;
        label?: string;
        icon?: ComponentType;
        title?: string;
        ariaLabel?: string;
        disabled?: boolean;
        hideOnMobile?: boolean;
    };

    let {
        options = [],
        value = $bindable(""),
        size = "sm",
        bordered = false,
        gap = false,
        class: className = "",
        onchange,
        ...rest
    } = $props<{
        options: TabToggleOption[];
        value: string;
        size?: ButtonSize;
        bordered?: boolean;
        gap?: boolean;
        class?: string;
        onchange?: (value: string) => void;
        [key: string]: any;
    }>();

    function cx(...classes: Array<string | null | undefined | false>) {
        return classes.filter(Boolean).join(" ");
    }

    const rootClasses = $derived(
        cx(
            "flex items-center rounded-lg bg-zinc-100 p-1",
            bordered
                ? "border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-800/50"
                : "dark:bg-zinc-700/70",
            gap ? "gap-2" : "",
            className,
        ),
    );

    function selectOption(nextValue: string) {
        value = nextValue;
        onchange?.(nextValue);
    }
</script>

<div class={rootClasses} role="tablist" {...rest}>
    {#each options as option (option.value)}
        <Button
            variant="segmented"
            {size}
            active={value === option.value}
            onclick={() => selectOption(option.value)}
            title={option.title}
            ariaLabel={option.ariaLabel || (!option.label ? option.title : "")}
            hideOnMobile={option.hideOnMobile}
            disabled={option.disabled}
            role="tab"
            aria-selected={value === option.value}
        >
            {#if option.icon}
                <option.icon class="w-4 h-4" />
            {/if}
            {#if option.label}
                {option.label}
            {/if}
        </Button>
    {/each}
</div>
