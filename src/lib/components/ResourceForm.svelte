<script lang="ts">
    import { resourceApi, type ResourceAttributes } from "$lib/api/resources";
    import { Loader2 } from "lucide-svelte";

    let { resource = undefined, onSuccess } = $props<{
        resource?: { id: string; attributes: ResourceAttributes };
        onSuccess: () => void;
    }>();

    let title = $state(resource?.attributes.title || "");
    let description = $state(resource?.attributes.description || "");
    let isReady = $state(resource?.attributes["is-ready"] || false);

    let loading = $state(false);
    let error = $state("");

    async function handleSubmit(e: Event) {
        e.preventDefault();
        loading = true;
        error = "";

        try {
            const attributes: Partial<ResourceAttributes> = {
                title,
                description,
                "is-ready": isReady,
            };

            let res;
            if (resource?.id) {
                res = await resourceApi.update(resource.id, attributes);
            } else {
                res = await resourceApi.create(
                    attributes as ResourceAttributes,
                );
            }

            if (!res.ok) {
                const json = await res.json();
                throw new Error(
                    json.errors?.[0]?.detail || "Failed to save resource",
                );
            }

            onSuccess();
        } catch (e: any) {
            error = e.message;
        } finally {
            loading = false;
        }
    }
</script>

<form onsubmit={handleSubmit} class="space-y-4">
    {#if error}
        <div
            class="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm"
        >
            {error}
        </div>
    {/if}

    <div>
        <label
            for="title"
            class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >Titel</label
        >
        <input
            type="text"
            id="title"
            bind:value={title}
            required
            class="w-full rounded-lg border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g. Coach Boat 1"
        />
    </div>

    <div>
        <label
            for="description"
            class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >Beschreibung</label
        >
        <textarea
            id="description"
            bind:value={description}
            rows="3"
            class="w-full rounded-lg border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
            placeholder="Optional description..."
        ></textarea>
    </div>

    <div class="flex items-center gap-6">
        <label class="flex items-center gap-2 cursor-pointer">
            <input
                type="checkbox"
                bind:checked={isReady}
                class="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
            />
            <span class="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >Material verfügbar</span
            >
        </label>
    </div>

    <div class="pt-2">
        <button
            type="submit"
            disabled={loading}
            class="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {#if loading}
                <Loader2 class="w-4 h-4 animate-spin mr-2" />
                Speichern...
            {:else}
                {resource
                    ? "Material aktualisieren"
                    : "Neues Material erstellen"}
            {/if}
        </button>
    </div>
</form>
