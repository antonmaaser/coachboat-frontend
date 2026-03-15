<script lang="ts">
    import { X } from "lucide-svelte";
    import Button from "$lib/components/ui/Button.svelte";

    type ModalWidth =
        | "sm"
        | "md"
        | "lg"
        | "xl"
        | "2xl"
        | "3xl"
        | "4xl"
        | "5xl"
        | "full";

    const desktopWidthMap: Record<ModalWidth, string> = {
        sm: "md:max-w-sm",
        md: "md:max-w-md",
        lg: "md:max-w-lg",
        xl: "md:max-w-xl",
        "2xl": "md:max-w-2xl",
        "3xl": "md:max-w-3xl",
        "4xl": "md:max-w-4xl",
        "5xl": "md:max-w-5xl",
        full: "md:max-w-[calc(100vw-2rem)]",
    };

    let {
        title,
        children,
        show = $bindable(false),
        width = "lg",
    } = $props<{
        title: string;
        children: any;
        show?: boolean;
        width?: ModalWidth;
    }>();

    const desktopWidthClass = $derived(
        desktopWidthMap[width as ModalWidth] || desktopWidthMap.lg,
    );

    let dialog: HTMLDialogElement;

    $effect(() => {
        if (show && dialog && !dialog.open) dialog.showModal();
        if (!show && dialog && dialog.open) dialog.close();
    });

    function close() {
        show = false;
    }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<dialog
    bind:this={dialog}
    class="fixed inset-0 m-0 h-screen w-screen max-h-none max-w-none border-0 bg-transparent p-0 overflow-hidden backdrop:bg-zinc-900/50 backdrop:backdrop-blur-sm"
    onclose={close}
    onclick={(e) => {
        if (e.target === dialog) close();
    }}
>
    <div
        class={`h-screen w-screen bg-white dark:bg-zinc-800 md:my-8 md:h-auto md:max-h-[calc(100vh-4rem)] md:mx-auto md:w-[calc(100vw-2rem)] ${desktopWidthClass} md:rounded-xl md:border md:border-zinc-200 md:dark:border-zinc-700 md:shadow-2xl transition-all open:animate-in open:fade-in open:zoom-in-95 open:slide-in-from-bottom-2 flex flex-col overflow-hidden`}
        role="document"
        onclick={(e) => e.stopPropagation()}
    >
        <div
            class="flex shrink-0 items-center justify-between border-b border-zinc-100 p-4 dark:border-zinc-700/50"
        >
            <h3 class="text-lg font-semibold text-zinc-900 dark:text-white">
                {title}
            </h3>
            <Button
                variant="ghost"
                tone="neutral"
                iconOnly
                ariaLabel="Schließen"
                onclick={close}
            >
                <X class="w-5 h-5" />
            </Button>
        </div>
        <div class="min-h-0 grow overflow-y-auto p-4">
            {@render children()}
        </div>
    </div>
</dialog>
