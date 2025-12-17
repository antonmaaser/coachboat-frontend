<script lang="ts">
    import { userApi } from "$lib/api/users";
    import { auth } from "$lib/stores/auth";
    import { Loader2, CheckCircle2, AlertCircle } from "lucide-svelte";
    import ResourceCategories from "$lib/components/ResourceCategories.svelte";
    import TextInput from "$lib/components/ui/TextInput.svelte";

    let oldPassword = $state("");
    let newPassword = $state("");
    let confirmPassword = $state("");
    let loading = $state(false);
    let success = $state(false);
    let error = $state("");

    let isAdmin = $derived($auth.user?.status && $auth.user.status >= 3);

    async function handleSubmit(e: Event) {
        e.preventDefault();
        error = "";
        success = false;

        if (newPassword !== confirmPassword) {
            error = "Die Passwörter stimmen nicht überein.";
            return;
        }

        if (newPassword.length < 8) {
            error = "Das Passwort muss mindestens 8 Zeichen lang sein.";
            return;
        }

        loading = true;
        try {
            const res = await userApi.update($auth.user!.id, {
                password: newPassword,
            });

            if (res.ok) {
                success = true;
                oldPassword = "";
                newPassword = "";
                confirmPassword = "";
            } else {
                const json = await res.json();
                error =
                    json.errors?.[0]?.detail ||
                    "Fehler beim Ändern des Passworts";
            }
        } catch (e: any) {
            console.error(e);
            error = `Ein unerwarteter Fehler ist aufgetreten: ${e.message}`;
        } finally {
            loading = false;
        }
    }
</script>

<div class="space-y-6">
    <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-zinc-900 dark:text-white">
            Einstellungen
        </h1>
    </div>

    {#if isAdmin}
        <div
            class="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6 max-w-2xl"
        >
            <ResourceCategories />
        </div>
    {/if}

    <div
        class="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6 max-w-2xl"
    >
        <h2 class="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
            Passwort ändern
        </h2>

        <form onsubmit={handleSubmit} class="space-y-4">
            {#if success}
                <div
                    class="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-4 rounded-lg flex items-center gap-2"
                >
                    <CheckCircle2 class="w-5 h-5" />
                    Passwort wurde erfolgreich geändert.
                </div>
            {/if}

            {#if error}
                <div
                    class="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg flex items-center gap-2"
                >
                    <AlertCircle class="w-5 h-5" />
                    {error}
                </div>
            {/if}

            <div>
                <TextInput
                    id="newPassword"
                    type="password"
                    label="Neues Passwort"
                    bind:value={newPassword}
                    required
                    minlength={8}
                />
            </div>

            <div>
                <TextInput
                    id="confirmPassword"
                    type="password"
                    label="Passwort bestätigen"
                    bind:value={confirmPassword}
                    required
                    minlength={8}
                />
            </div>

            <div class="pt-4">
                <button
                    type="submit"
                    disabled={loading}
                    class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                    {#if loading}
                        <Loader2 class="w-4 h-4 animate-spin" />
                        Speichern...
                    {:else}
                        Passwort speichern
                    {/if}
                </button>
            </div>
        </form>
    </div>
</div>
