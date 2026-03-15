<script lang="ts">
    import type { Snippet } from "svelte";

    export type ButtonVariant =
        | "solid"
        | "outline"
        | "ghost"
        | "icon"
        | "menu"
        | "tab"
        | "segmented"
        | "chip"
        | "day"
        | "overlay"
        | "swatch"
        | "switch";

    export type ButtonTone = "primary" | "success" | "neutral" | "danger";
    export type ButtonSize = "xs" | "sm" | "md" | "lg";
    export type ButtonWidth = "auto" | "full" | "full-mobile";
    export type ButtonEdge = "none" | "left" | "right";
    export type ButtonAlign = "center" | "left";

    type ButtonProps = {
        variant: ButtonVariant;
        tone?: ButtonTone;
        size?: ButtonSize;
        width?: ButtonWidth;
        type?: "button" | "submit" | "reset";
        active?: boolean;
        disabled?: boolean;
        loading?: boolean;
        align?: ButtonAlign;
        iconOnly?: boolean;
        dividerTop?: boolean;
        edge?: ButtonEdge;
        ariaLabel?: string;
        elevated?: boolean;
        compact?: boolean;
        hideOnMobile?: boolean;
        swatchColor?: string;
        style?: string;
        children?: Snippet;
        [key: string]: any;
    };

    let {
        variant,
        tone = "neutral",
        size = "md",
        width = "auto",
        type = "button",
        active = false,
        disabled = false,
        loading = false,
        align = "center",
        iconOnly = false,
        dividerTop = false,
        edge = "none",
        ariaLabel = "",
        elevated = false,
        compact = false,
        hideOnMobile = false,
        swatchColor = "",
        style = "",
        children,
        ...rest
    }: ButtonProps = $props();

    function cx(...classes: Array<string | false | null | undefined>) {
        return classes.filter(Boolean).join(" ");
    }

    const widthClass = $derived(
        width === "full"
            ? "w-full"
            : width === "full-mobile"
              ? "w-full md:w-auto"
              : "",
    );

    const edgeClass = $derived(
        edge === "left"
            ? "rounded-l-lg rounded-r-none"
            : edge === "right"
              ? "rounded-r-lg rounded-l-none"
              : "",
    );

    const hiddenClass = $derived(hideOnMobile ? "hidden md:inline-flex" : "");
    const alignClass = $derived(align === "left" ? "justify-start" : "justify-center");
    const disabledClass = $derived(
        disabled || loading ? "opacity-50 cursor-not-allowed" : "",
    );

    const solidClasses = $derived.by(() => {
        const sizeClass =
            size === "xs"
                ? "p-2 text-sm"
                : size === "sm"
                  ? "px-3 py-1.5 text-sm"
                  : size === "lg"
                    ? "px-3 py-3 text-sm font-semibold"
                    : "px-4 py-2";

        const toneClass =
            tone === "success"
                ? "bg-green-600 hover:bg-green-500 text-white focus-visible:outline-green-600"
                : tone === "danger"
                  ? "bg-red-600 hover:bg-red-700 text-white focus-visible:outline-red-600"
                  : tone === "neutral"
                    ? "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-zinc-900 dark:text-white focus-visible:outline-zinc-500"
                    : "bg-blue-600 hover:bg-blue-500 text-white focus-visible:outline-blue-600";

        const shadowClass = elevated
            ? tone === "success"
                ? "shadow-lg shadow-green-600/20"
                : tone === "danger"
                  ? "shadow-lg shadow-red-600/20"
                  : tone === "primary"
                    ? "shadow-lg shadow-blue-600/20"
                    : "shadow-sm"
            : "";

        return cx(
            "relative inline-flex items-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
            widthClass,
            alignClass,
            sizeClass,
            toneClass,
            shadowClass,
            disabledClass,
        );
    });

    const outlineClasses = $derived.by(() => {
        const sizeClass =
            size === "xs"
                ? "px-3 py-1 text-xs"
                : size === "sm"
                  ? "px-3 py-1.5 text-sm"
                  : "px-4 py-2 text-sm";

        const toneClass =
            tone === "danger"
                ? "text-red-600 border-red-300 bg-white hover:bg-red-50 dark:bg-zinc-700 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                : "text-zinc-700 border-zinc-300 bg-white hover:bg-zinc-50 dark:bg-zinc-700 dark:text-zinc-300 dark:border-zinc-600 dark:hover:bg-zinc-600";

        return cx(
            "inline-flex items-center gap-2 rounded-md border font-medium transition-colors",
            widthClass,
            alignClass,
            sizeClass,
            toneClass,
            disabledClass,
        );
    });

    const ghostClasses = $derived.by(() => {
        const sizeClass =
            size === "xs"
                ? "px-3 py-1 text-xs"
                : size === "sm"
                  ? "px-2 py-1.5 text-sm"
                  : iconOnly
                    ? "p-2"
                    : "px-3 py-2 text-sm";

        const toneClass =
            tone === "danger"
                ? "text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                : tone === "primary"
                  ? "text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200";

        return cx(
            "inline-flex items-center gap-1 rounded-md transition-colors",
            widthClass,
            align === "left" ? "justify-start text-left" : alignClass,
            sizeClass,
            toneClass,
            disabledClass,
        );
    });

    const iconClasses = $derived.by(() => {
        const sizeClass =
            size === "xs" ? "p-1" : size === "sm" ? "p-1.5" : size === "lg" ? "p-2.5" : "p-2";

        const toneClass =
            tone === "danger"
                ? "text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                : tone === "primary"
                  ? "text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                  : tone === "success"
                    ? "text-zinc-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                    : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700";

        return cx(
            "inline-flex items-center justify-center rounded-lg transition-colors",
            widthClass,
            sizeClass,
            toneClass,
            edgeClass,
            disabledClass,
        );
    });

    const menuClasses = $derived.by(() => {
        const sizeClass = compact
            ? "px-4 py-1.5 text-sm"
            : size === "xs"
              ? "px-3 py-2 text-sm"
              : "px-4 py-3 text-sm";

        const toneClass =
            tone === "danger"
                ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                : tone === "primary"
                  ? "text-blue-900 dark:text-blue-100 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                  : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700";

        return cx(
            "inline-flex w-full items-center gap-2 transition-colors",
            align === "left" ? "justify-start text-left" : "justify-center",
            sizeClass,
            toneClass,
            dividerTop ? "border-t border-zinc-100 dark:border-zinc-700" : "",
            disabledClass,
        );
    });

    const tabClasses = $derived(
        cx(
            "inline-flex items-center px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            active
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300",
            disabledClass,
        ),
    );

    const segmentedClasses = $derived.by(() => {
        const sizeClass =
            size === "xs"
                ? "p-1.5"
                : size === "sm"
                  ? "px-3 py-1.5 text-sm font-medium"
                  : "px-4 py-2 text-sm font-medium";

        return cx(
            "inline-flex items-center gap-2 rounded-md transition-all",
            sizeClass,
            active
                ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-white"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white",
            hiddenClass,
            edgeClass,
            disabledClass,
        );
    });

    const chipClasses = $derived.by(() => {
        const toneClass =
            tone === "danger"
                ? active
                    ? "bg-red-600 text-white border-red-600"
                    : "bg-transparent text-red-600 border-red-300"
                : tone === "success"
                  ? active
                      ? "bg-green-600 text-white border-green-600"
                      : "bg-transparent text-green-600 border-green-300"
                  : tone === "primary"
                    ? active
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-transparent text-blue-600 border-blue-300"
                    : active
                      ? "bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900 dark:border-white"
                      : "bg-white text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700";

        return cx(
            "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors border",
            toneClass,
            disabledClass,
        );
    });

    const dayClasses = $derived(
        cx(
            "inline-flex flex-col items-center justify-center min-w-[3.5rem] h-16 rounded-xl border transition-all relative",
            active
                ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20"
                : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700",
            disabledClass,
        ),
    );

    const overlayClasses = $derived(
        "fixed inset-0 z-[-1] cursor-default w-full h-full block",
    );

    const swatchClasses = $derived(
        cx(
            "inline-flex h-6 w-6 rounded-full border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
            active
                ? "border-zinc-900 dark:border-white scale-110"
                : "border-zinc-300 dark:border-zinc-600",
            disabledClass,
        ),
    );

    const switchClasses = $derived(
        cx(
            "inline-flex items-center gap-2 text-xs text-zinc-500 cursor-pointer focus:outline-none group",
            widthClass,
            disabledClass,
        ),
    );

    const rootClasses = $derived.by(() => {
        switch (variant) {
            case "solid":
                return solidClasses;
            case "outline":
                return outlineClasses;
            case "ghost":
                return ghostClasses;
            case "icon":
                return iconClasses;
            case "menu":
                return menuClasses;
            case "tab":
                return tabClasses;
            case "segmented":
                return segmentedClasses;
            case "chip":
                return chipClasses;
            case "day":
                return dayClasses;
            case "overlay":
                return overlayClasses;
            case "swatch":
                return swatchClasses;
            case "switch":
                return switchClasses;
            default:
                return solidClasses;
        }
    });

    const resolvedType = $derived(variant === "overlay" ? "button" : type);
    const resolvedDisabled = $derived(variant === "overlay" ? false : disabled || loading);

    const resolvedAriaLabel = $derived.by(() => {
        if (!iconOnly) return ariaLabel || undefined;
        return ariaLabel || "Schaltfläche";
    });

    const resolvedStyle = $derived.by(() => {
        if (variant === "swatch" && swatchColor) {
            return style ? `${style}; background-color: ${swatchColor}` : `background-color: ${swatchColor}`;
        }
        return style || undefined;
    });

    $effect(() => {
        if (iconOnly && !ariaLabel) {
            console.warn("[Button] iconOnly buttons must provide ariaLabel.");
        }

        if (dividerTop && variant !== "menu") {
            console.warn("[Button] dividerTop is only supported for variant='menu'.");
        }

        if (edge !== "none" && variant !== "icon" && variant !== "segmented") {
            console.warn("[Button] edge is only supported for variant='icon' or variant='segmented'.");
        }

        if (variant === "swatch" && !swatchColor) {
            console.warn("[Button] swatch variant should receive swatchColor.");
        }
    });
</script>

<button
    type={resolvedType}
    aria-label={resolvedAriaLabel}
    class={rootClasses}
    disabled={resolvedDisabled}
    style={resolvedStyle}
    {...rest}
>
    {@render children?.()}
</button>
