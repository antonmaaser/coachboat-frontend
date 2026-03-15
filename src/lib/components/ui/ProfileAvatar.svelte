<script lang="ts">
    let {
        name = "",
        fallback = "U",
        size = "sm",
        class: className = "",
        ariaLabel,
    } = $props<{
        name?: string | null;
        fallback?: string;
        size?: "xs" | "sm" | "md" | "lg" | "xl";
        class?: string;
        ariaLabel?: string;
    }>();

    const normalizedName = $derived(typeof name === "string" ? name.trim() : "");
    const normalizedFallback = $derived(
        typeof fallback === "string" && fallback.trim()
            ? fallback.trim().charAt(0).toUpperCase()
            : "U",
    );
    const initial = $derived(
        normalizedName
            ? normalizedName.charAt(0).toUpperCase()
            : normalizedFallback,
    );
    const resolvedAriaLabel = $derived(
        ariaLabel || (normalizedName ? `Avatar von ${normalizedName}` : "Avatar"),
    );

    type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

    function isAvatarSize(value: unknown): value is AvatarSize {
        return (
            value === "xs" ||
            value === "sm" ||
            value === "md" ||
            value === "lg" ||
            value === "xl"
        );
    }

    const sizeClassMap: Record<AvatarSize, string> = {
        xs: "w-6 h-6 text-[10px]",
        sm: "w-8 h-8 text-xs",
        md: "w-10 h-10 text-sm",
        lg: "w-11 h-11 text-sm",
        xl: "w-12 h-12 text-base",
    };
    const normalizedSize = $derived(isAvatarSize(size) ? size : "sm");
    const avatarSizeClass = $derived(sizeClassMap[normalizedSize]);
</script>

<div
    class={`rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center font-bold text-zinc-600 dark:text-zinc-300 ${avatarSizeClass} ${className}`}
    aria-label={resolvedAriaLabel}
>
    {initial}
</div>
