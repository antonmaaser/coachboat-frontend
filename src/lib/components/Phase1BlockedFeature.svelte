<script lang="ts">
    import { AlertCircle, Wrench } from "lucide-svelte";
    import {
        PHASE1_CAPABILITIES,
        type Phase1CapabilityKey,
    } from "$lib/api/phase1-capabilities";

    let {
        capabilityKey,
        title,
        description = "",
    }: {
        capabilityKey: Phase1CapabilityKey;
        title: string;
        description?: string;
    } = $props();

    const capability = $derived(PHASE1_CAPABILITIES[capabilityKey]);
</script>

<div class="space-y-4">
    <div class="flex items-center gap-3">
        <Wrench class="w-6 h-6 text-zinc-500" />
        <h1 class="text-2xl font-bold text-zinc-900 dark:text-white">{title}</h1>
    </div>

    {#if description}
        <p class="text-sm text-zinc-600 dark:text-zinc-300">{description}</p>
    {/if}

    <section
        class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200"
    >
        <div class="flex items-start gap-3">
            <AlertCircle class="mt-0.5 h-5 w-5 shrink-0" />
            <div class="space-y-1">
                <p class="font-semibold">
                    Diese Funktion ist in Phase 1 noch nicht backend-seitig verfügbar.
                </p>
                <p class="text-sm">{capability.reason || "Noch keine API-Endpunkte vorhanden."}</p>
            </div>
        </div>
    </section>
</div>
