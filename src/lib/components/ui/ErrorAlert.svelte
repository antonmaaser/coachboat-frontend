<script lang="ts">
    import { AlertCircle } from "lucide-svelte";

    let { error } = $props<{ error: string | null | undefined }>();
</script>

{#if error}
    <div
        class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-1"
        role="alert"
    >
        <AlertCircle class="w-5 h-5 shrink-0" />
        <p class="text-sm font-medium">{error}</p>
    </div>
{/if}
