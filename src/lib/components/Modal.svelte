<script lang="ts">
    import { X } from "lucide-svelte";

    let { title, children, show = $bindable(false) } = $props();

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
    class="backdrop:bg-zinc-900/50 backdrop:backdrop-blur-sm bg-transparent p-0 w-full max-w-lg rounded-xl shadow-2xl transition-all open:animate-in open:fade-in open:zoom-in-95 open:slide-in-from-bottom-2"
    onclose={close}
    onclick={(e) => {
        if (e.target === dialog) close();
    }}
>
    <div
        class="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden w-full"
        onclick={(e) => e.stopPropagation()}
    >
        <div
            class="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-700/50"
        >
            <h3 class="text-lg font-semibold text-zinc-900 dark:text-white">
                {title}
            </h3>
            <button
                onclick={close}
                class="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
            >
                <X class="w-5 h-5" />
            </button>
        </div>
        <div class="p-4">
            {@render children()}
        </div>
    </div>
</dialog>
