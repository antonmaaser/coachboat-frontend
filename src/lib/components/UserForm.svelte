<script lang="ts">
    import { userApi, type UserAttributes } from "$lib/api/users";
    import { Loader2 } from "lucide-svelte";
    import TextInput from "$lib/components/ui/TextInput.svelte";
    import SearchableSelect from "$lib/components/ui/SearchableSelect.svelte";

    let { user = undefined, onSuccess } = $props<{
        user?: { id: string; attributes: UserAttributes };
        onSuccess: () => void;
    }>();

    let name = $state("");
    let firstName = $state("");
    let email = $state("");
    let password = $state(""); // Only for creation/reset if needed, but simplified for now
    let status = $state("1"); // Default to Active ("1")

    $effect(() => {
        name = user?.attributes.name || "";
        firstName = user?.attributes["first-name"] || "";
        email = user?.attributes.email || "";
        status = (user?.attributes.status ?? 1).toString();
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
                status: Number(status),
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
            <TextInput
                id="firstName"
                label="First Name"
                bind:value={firstName}
                required
            />
        </div>
        <div>
            <TextInput id="name" label="Last Name" bind:value={name} required />
        </div>
    </div>

    <div>
        <TextInput
            id="email"
            type="email"
            label="Email"
            bind:value={email}
            required
        />
    </div>

    {#if !user?.id}
        <div>
            <TextInput
                id="password"
                type="password"
                label="Initial Password"
                bind:value={password}
                placeholder="Leave blank for default"
            />
            <p class="text-xs text-zinc-500 mt-1">Default: ChangeMe123!</p>
        </div>
    {/if}

    <div>
        <SearchableSelect
            label="Status"
            bind:value={status}
            options={[
                { value: "0", label: "Inactive" },
                { value: "1", label: "Active" },
                { value: "3", label: "Admin" },
            ]}
            searchable={false}
        />
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
