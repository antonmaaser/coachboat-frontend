<script lang="ts">
    import { client } from "$lib/api/client";
    import { auth } from "$lib/stores/auth";
    import { goto } from "$app/navigation";
    import { Loader2, Mail, Lock, AlertCircle } from "lucide-svelte";
    import { AUTH_BASE } from "$lib/config";
    import TextInput from "$lib/components/ui/TextInput.svelte";

    let email = $state("");
    let password = $state("");
    let loading = $state(false);
    let error = $state("");

    async function handleLogin(e: Event) {
        e.preventDefault();
        loading = true;
        error = "";

        try {
            // 1. Get Token
            const tokenRes = await client(`${AUTH_BASE}/token`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    grant_type: "password",
                    username: email,
                    password,
                }),
                skipAuth: true,
            });

            if (!tokenRes.ok) {
                if (tokenRes.status === 400 || tokenRes.status === 401) {
                    throw new Error("Ungültige E-Mail oder Passwort.");
                }
                throw new Error(
                    "Anmeldung fehlgeschlagen. Versuch es bitte erneut.",
                );
            }

            const tokenData = await tokenRes.json();

            // Set initial auth state
            auth.set({
                user: { id: tokenData.user_id },
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token,
            });

            // 2. Fetch User Details
            try {
                const userRes = await client(`/users/${tokenData.user_id}`);
                if (userRes.ok) {
                    const userJson = await userRes.json();
                    const attrs = userJson.data.attributes;
                    auth.update((s) => ({
                        ...s,
                        user: {
                            id: tokenData.user_id,
                            email: attrs.email,
                            name: attrs.name,
                            firstName: attrs["first-name"] || attrs.firstName,
                            status: attrs.status,
                        },
                    }));
                }
            } catch (err) {
                console.error("Failed to fetch user details", err);
                // Non-critical, can proceed
            }

            goto("/");
        } catch (e: any) {
            error = e.message || "An error occurred";
        } finally {
            loading = false;
        }
    }
</script>

<div
    class="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-900 px-4 transition-colors duration-300"
>
    <div
        class="max-w-md w-full space-y-8 bg-white dark:bg-zinc-800 p-8 rounded-2xl shadow-xl border border-zinc-100 dark:border-zinc-700"
    >
        <div class="text-center space-y-2">
            <div
                class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-4"
            >
                <Lock class="w-6 h-6" />
            </div>
            <h2
                class="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white"
            >
                Willkommen zurück
            </h2>
            <p class="text-sm text-zinc-500 dark:text-zinc-400">
                Melde Dich an
            </p>
        </div>

        <form class="mt-8 space-y-6" onsubmit={handleLogin}>
            {#if error}
                <div
                    class="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 flex items-center gap-3 text-red-700 dark:text-red-400 text-sm animate-in fade-in slide-in-from-top-2"
                >
                    <AlertCircle class="w-5 h-5 shrink-0" />
                    <p>{error}</p>
                </div>
            {/if}

            <div class="space-y-4">
                <TextInput
                    id="email"
                    name="email"
                    type="email"
                    label="E-Mail Adresse"
                    required
                    bind:value={email}
                    placeholder="E-Mail Adresse"
                    icon={Mail}
                />

                <TextInput
                    id="password"
                    name="password"
                    type="password"
                    label="Passwort"
                    required
                    bind:value={password}
                    placeholder="Passwort"
                    icon={Lock}
                />
            </div>

            <div>
                <button
                    type="submit"
                    disabled={loading}
                    class="group relative flex w-full justify-center rounded-lg bg-blue-600 px-3 py-3 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-600/20"
                >
                    {#if loading}
                        <Loader2 class="mr-2 h-5 w-5 animate-spin" />
                        Anmeldung...
                    {:else}
                        Anmelden
                    {/if}
                </button>
            </div>
        </form>

        <div class="text-center text-sm text-zinc-500 dark:text-zinc-400">
            Erstes Mal hier? <a
                href="/activate"
                class="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
                >Aktiviere Dein Konto</a
            >
        </div>
    </div>
</div>
