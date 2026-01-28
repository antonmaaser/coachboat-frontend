<script lang="ts">
    import { userApi, type UserAttributes } from "$lib/api/users";
    import { Loader2 } from "lucide-svelte";
    import TextInput from "$lib/components/ui/TextInput.svelte";
    import SearchableSelect from "$lib/components/ui/SearchableSelect.svelte";

    // New Import
    import UserPermissions from "./UserPermissions.svelte";
    import { slide } from "svelte/transition";

    let {
        user = undefined,
        onSuccess,
        initialTab = "details",
    } = $props<{
        user?: { id: string; attributes: UserAttributes };
        onSuccess: () => void;
        initialTab?: "details" | "permissions";
    }>();

    let name = $state("");
    let firstName = $state("");
    let email = $state("");
    let password = $state(""); // Only for creation/reset if needed
    let roleSlug = $state("user"); // Default to Standard User
    let isActive = $state(false);

    // New State for Tabs and Permissions
    let activeTab = $state<"details" | "permissions">(initialTab);
    let fullUser = $state<UserAttributes | null>(null);
    let loadingPerms = $state(false);

    async function fetchPermissions() {
        if (!user?.id) return;
        loadingPerms = true;
        try {
            const res = await userApi.get(user.id);
            if (res.ok) {
                const json = await res.json();
                fullUser = json.data.attributes;
            }
        } catch (e) {
            console.error(e);
        } finally {
            loadingPerms = false;
        }
    }

    $effect(() => {
        name = user?.attributes.name || "";
        firstName = user?.attributes["first-name"] || "";
        email = user?.attributes.email || "";

        // Determine initial role selection
        if (user?.attributes.role && typeof user.attributes.role !== "string") {
            roleSlug = user.attributes.role.slug;
        } else {
            // Fallback mapper from status if role not present yet
            const s = Number(user?.attributes.status ?? 1);
            if (s >= 4) roleSlug = "admin";
            else if (s === 3) roleSlug = "moderator";
            else if (s === 2) roleSlug = "user";
            else if (s === 1) roleSlug = "group_only";
            else roleSlug = "user"; // Default
        }

        isActive = user?.attributes["is-active"] ?? false;

        // If switching to permissions tab, fetch if needed
        if (activeTab === "permissions" && !fullUser && user?.id) {
            fetchPermissions();
        }
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
                role: roleSlug,
                "is-active": isActive,
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
                if (!password) {
                    attributes.password = "ChangeMe123!"; // Temporary default
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

<div class="space-y-6">
    {#if user?.id}
        <div
            class="flex items-center gap-4 border-b border-zinc-200 dark:border-zinc-700"
        >
            <button
                class="px-4 py-2 text-sm font-medium border-b-2 transition-colors {activeTab ===
                'details'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'}"
                onclick={() => (activeTab = "details")}
            >
                Details
            </button>
            <button
                class="px-4 py-2 text-sm font-medium border-b-2 transition-colors {activeTab ===
                'permissions'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300'}"
                onclick={() => (activeTab = "permissions")}
            >
                Berechtigungen
            </button>
        </div>
    {/if}

    {#if activeTab === "details"}
        <form onsubmit={handleSubmit} class="space-y-4" transition:slide>
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
                    <TextInput
                        id="name"
                        label="Last Name"
                        bind:value={name}
                        required
                    />
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
                    <p class="text-xs text-zinc-500 mt-1">
                        Default: ChangeMe123!
                    </p>
                </div>
            {/if}

            <div>
                <SearchableSelect
                    label="Rolle"
                    bind:value={roleSlug}
                    options={[
                        { value: "admin", label: "Administrator" },
                        { value: "moderator", label: "Moderator" },
                        { value: "user", label: "Benutzer" },
                        { value: "group_only", label: "Nur Gruppen" },
                    ]}
                    searchable={false}
                />
            </div>

            <div class="flex items-center gap-2">
                <input
                    type="checkbox"
                    id="isActive"
                    bind:checked={isActive}
                    class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label
                    for="isActive"
                    class="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >Account aktiviert</label
                >
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
    {:else}
        <div transition:slide>
            {#if loadingPerms}
                <div class="flex justify-center p-8">
                    <Loader2 class="w-8 h-8 animate-spin text-zinc-400" />
                </div>
            {:else if fullUser?.effective_permissions}
                <UserPermissions permissions={fullUser.effective_permissions} />
            {:else}
                <div class="text-center p-8 text-zinc-500">
                    {#if !user?.id}
                        <!-- Should not happen as tab hidden -->
                    {:else}
                        Keine Berechtigungen gefunden oder Fehler beim Laden.
                    {/if}
                </div>
            {/if}
        </div>
    {/if}
</div>
