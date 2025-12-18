<script lang="ts">
    import { resourceApi, type ResourceAttributes } from "$lib/api/resources";
    import { resourceCategoryApi } from "$lib/api/resource-categories";
    import { Loader2 } from "lucide-svelte";
    import TextInput from "$lib/components/ui/TextInput.svelte";
    import SearchableSelect from "$lib/components/ui/SearchableSelect.svelte";
    import { onMount } from "svelte";

    let { resource = undefined, onSuccess } = $props<{
        resource?: { id: string; attributes: ResourceAttributes };
        onSuccess: () => void;
    }>();

    let title = $state("");
    let description = $state("");
    let isReady = $state(false);
    let categoryId = $state<string>("");

    let categories = $state<any[]>([]);
    let categoriesLoading = $state(true);

    $effect(() => {
        title = resource?.attributes.title || "";
        description = resource?.attributes.description || "";
        isReady = resource?.attributes["is-ready"] || false;
        categoryId = resource?.attributes["category-id"] || "";
    });

    onMount(async () => {
        try {
            const res = await resourceCategoryApi.list();
            if (res.ok) {
                const json = await res.json();
                categories = json.data || json;
            }
        } catch (e) {
            console.error(e);
        } finally {
            categoriesLoading = false;
        }
    });

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
                "category-id": categoryId || null,
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

    <TextInput
        id="title"
        label="Titel"
        bind:value={title}
        required
        placeholder="e.g. Coach Boat 1"
    />

    <div>
        <SearchableSelect
            label="Kategorie"
            bind:value={categoryId}
            options={[
                { value: "", label: "Keine Kategorie" },
                ...categories.map((cat) => ({
                    value: cat.id,
                    label: cat.attributes.title,
                })),
            ]}
            placeholder="Wähle eine Kategorie..."
        />
    </div>

    <TextInput
        id="description"
        label="Beschreibung"
        bind:value={description}
        multiline
        rows={3}
        placeholder="Optional description..."
    />

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
