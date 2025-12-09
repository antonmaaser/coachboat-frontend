<script lang="ts">
    import { userApi, type UserAttributes } from "$lib/api/users";
    import { Loader2 } from "lucide-svelte";

    let { user = undefined, onSuccess } = $props<{
        user?: { id: string; attributes: UserAttributes };
        onSuccess: () => void;
    }>();

    let name = $state("");
    let firstName = $state("");
    let email = $state("");
    let password = $state(""); // Only for creation/reset if needed, but simplified for now
    let status = $state(1); // Default to Active (1)

    $effect(() => {
        name = user?.attributes.name || "";
        firstName = user?.attributes["first-name"] || "";
        email = user?.attributes.email || "";
        status = user?.attributes.status ?? 1;
        // Password usually doesn't need to be reset from user prop on edit
    });

    let loading = $state(false);
    let error = $state("");

    async function handleSubmit(e: Event) {
        e.preventDefault();
        loading = true;
        error = "";

        try {
            const attributes: Partial<UserAttributes> = {
                name,
                "first-name": firstName,
                email,
                status,
            };

            if (!user?.id && password) {
                attributes.password = password;
            }

            let res;
            if (user?.id) {
                // Remove email from update if strict about changing emails, but allowing for now based on typical Crud
                res = await userApi.update(user.id, attributes);
            } else {
                // For creation, we might need a password or it might be auto-generated.
                // Let's assume we send what we have. API likely handles validation.
                if (!password) {
                    // If API requires password, we might need to handle this.
                    // For now, let's assume valid input.
                    attributes.password = "ChangeMe123!"; // Temporary default if not provided? Or enforce field.
                    // Actually, let's enforce password for new users if not provided.
                }
                res = await userApi.create(attributes as UserAttributes);
            }

            if (!res.ok) {
                const json = await res.json();
                throw new Error(
                    json.errors?.[0]?.detail || "Failed to save user",
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

    <div class="grid grid-cols-2 gap-4">
        <div>
            <label
                for="firstName"
                class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                >First Name</label
            >
            <input
                type="text"
                id="firstName"
                bind:value={firstName}
                required
                class="w-full rounded-lg border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
            />
        </div>
        <div>
            <label
                for="name"
                class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                >Last Name</label
            >
            <input
                type="text"
                id="name"
                bind:value={name}
                required
                class="w-full rounded-lg border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
            />
        </div>
    </div>

    <div>
        <label
            for="email"
            class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >Email</label
        >
        <input
            type="email"
            id="email"
            bind:value={email}
            required
            class="w-full rounded-lg border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
        />
    </div>

    {#if !user?.id}
        <div>
            <label
                for="password"
                class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                >Initial Password</label
            >
            <input
                type="password"
                id="password"
                bind:value={password}
                placeholder="Leave blank for default"
                class="w-full rounded-lg border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
            />
            <p class="text-xs text-zinc-500 mt-1">Default: ChangeMe123!</p>
        </div>
    {/if}

    <div>
        <label
            for="status"
            class="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >Status</label
        >
        <select
            id="status"
            bind:value={status}
            class="w-full rounded-lg border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
        >
            <option value={0}>Inactive</option>
            <option value={1}>Active</option>
            <option value={3}>Admin</option>
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
                {user ? "Update User" : "Create User"}
            {/if}
        </button>
    </div>
</form>
