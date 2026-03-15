<script lang="ts">
    import { toast } from "$lib/stores/toast";
    import { fly } from "svelte/transition";
    import { CheckCircle2, AlertCircle, Info, X } from "lucide-svelte";
    import Button from "$lib/components/ui/Button.svelte";

    // Only needed for mapping distinct icons per type
</script>

<div
    class="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
>
    {#each $toast as t (t.id)}
        <div
            class="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border min-w-[300px] max-w-sm bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
            role="alert"
            transition:fly={{ y: 20, duration: 300 }}
        >
            {#if t.type === "success"}
                <CheckCircle2 class="w-5 h-5 text-green-500 shrink-0" />
            {:else if t.type === "error"}
                <AlertCircle class="w-5 h-5 text-red-500 shrink-0" />
            {:else}
                <Info class="w-5 h-5 text-blue-500 shrink-0" />
            {/if}

            <p class="text-sm font-medium text-zinc-900 dark:text-white flex-1">
                {t.message}
            </p>

            <Button
                variant="ghost"
                tone="neutral"
                iconOnly
                ariaLabel="Schließen"
                onclick={() => toast.remove(t.id)}
            >
                <X class="w-4 h-4" />
                <span class="sr-only">Schließen</span>
            </Button>
        </div>
    {/each}
</div>
