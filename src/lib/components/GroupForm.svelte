<script lang="ts">
    import { groupApi, type GroupAttributes } from "$lib/api/groups";
    import { Loader2 } from "lucide-svelte";
    import TextInput from "$lib/components/ui/TextInput.svelte";

    let { group = undefined, onSuccess } = $props<{
        group?: { id: string; attributes: GroupAttributes };
        onSuccess: () => void;
    }>();

    let title = $state("");
    let description = $state("");
    let visibility = $state<"all" | "admin" | "none">("all");

    $effect(() => {
        title = group?.attributes.title || "";
        description = group?.attributes.description || "";
        visibility = group?.attributes.visibility || "all";
    });

    let loading = $state(false);
    let error = $state("");

    async function handleSubmit(e: Event) {
        e.preventDefault();
        loading = true;
        error = "";

        try {
            const attributes: Partial<GroupAttributes> = {
                title,
                description,
                visibility,
            };

            let res;
            if (group?.id) {
                res = await groupApi.update(group.id, attributes);
            } else {
                res = await groupApi.create(attributes as GroupAttributes);
            }

            if (!res.ok) {
                const json = await res.json();
                throw new Error(
                    json.errors?.[0]?.detail || "Failed to save group",
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

    <TextInput id="title" label="Name" bind:value={title} required />

    <TextInput
        id="description"
        label="Description"
        bind:value={description}
        multiline
        rows={3}
    />

    <div>
        <label
            for="visibility"
            class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >Visibility</label
        >
        <select
            id="visibility"
            bind:value={visibility}
            class="w-full rounded-lg border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
        >
            <option value="all">All</option>
            <option value="admin">Admin</option>
            <option value="none">None</option>
        </select>
    </div>

    <div class="pt-2">
        <button
            type="submit"
            disabled={loading}
            class="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {#if loading}
                <Loader2 class="w-4 h-4 animate-spin mr-2" />
                Saving...
            {:else}
                {group ? "Update Group" : "Create Group"}
            {/if}
        </button>
    </div>
</form>
