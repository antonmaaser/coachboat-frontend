<script lang="ts">
  import { client } from "$lib/api/client";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { Loader2, KeyRound, CheckCircle2, AlertCircle } from "lucide-svelte";
  import { onMount } from "svelte";
  import { AUTH_BASE } from "$lib/config";

  let token = $state("");
  let password = $state("");
  let rePassword = $state("");
  let loading = $state(false);
  let error = $state("");
  let success = $state(false);

  onMount(() => {
    const t = $page.url.searchParams.get("token");
    if (t) token = t;
  });

  async function handleActivate(e: Event) {
    e.preventDefault();
    if (password !== rePassword) {
      error = "Passwörter stimmen nicht überein";
      return;
    }
    if (password.length < 6) {
      error = "Passwort muss mindestens 6 Zeichen lang sein";
      return;
    }

    loading = true;
    error = "";

    try {
      const res = await client(`${AUTH_BASE}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            attributes: {
              id: token,
              password,
              rePassword,
            },
          },
        }),
        skipAuth: true,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData.errors?.[0]?.detail ||
            "Aktivierung fehlgeschlagen. Token könnte ungültig oder abgelaufen sein.",
        );
      }

      success = true;
      setTimeout(() => {
        goto("/login");
      }, 2000);
    } catch (e: any) {
      error = e.message || "Ein Fehler ist aufgetreten";
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
        class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mb-4"
      >
        <KeyRound class="w-6 h-6" />
      </div>
      <h2
        class="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white"
      >
        Konto aktivieren
      </h2>
      <p class="text-sm text-zinc-500 dark:text-zinc-400">
        Setze dein Passwort um loszulegen
      </p>
    </div>

    {#if success}
      <div
        class="rounded-lg bg-green-50 dark:bg-green-900/20 p-6 text-center animate-in zoom-in duration-300"
      >
        <CheckCircle2
          class="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-2"
        />
        <h3 class="text-lg font-medium text-green-800 dark:text-green-300">
          Konto aktiviert!
        </h3>
        <p class="text-green-700 dark:text-green-400 mt-1">
          Weiterleitung zu Login...
        </p>
      </div>
    {:else}
      <form class="mt-8 space-y-6" onsubmit={handleActivate}>
        {#if error}
          <div
            class="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 flex items-center gap-3 text-red-700 dark:text-red-400 text-sm"
          >
            <AlertCircle class="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        {/if}

        <div class="space-y-4">
          <div>
            <label
              for="token"
              class="block text-sm font-medium leading-6 text-zinc-900 dark:text-white"
              >Aktivierungs Token</label
            >
            <div class="mt-2">
              <input
                id="token"
                name="token"
                type="text"
                required
                bind:value={token}
                class="block w-full rounded-lg border-0 bg-zinc-50 dark:bg-zinc-900/50 py-3 text-zinc-900 dark:text-white ring-1 ring-inset ring-zinc-200 dark:ring-zinc-700 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                placeholder="Falls nicht automatisch eingegeben, hier Token einfügen"
              />
            </div>
          </div>

          <div>
            <label
              for="password"
              class="block text-sm font-medium leading-6 text-zinc-900 dark:text-white"
              >Neues Passwort</label
            >
            <div class="mt-2">
              <input
                id="password"
                name="password"
                type="password"
                required
                bind:value={password}
                class="block w-full rounded-lg border-0 bg-zinc-50 dark:bg-zinc-900/50 py-3 text-zinc-900 dark:text-white ring-1 ring-inset ring-zinc-200 dark:ring-zinc-700 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
              />
            </div>
          </div>

          <div>
            <label
              for="rePassword"
              class="block text-sm font-medium leading-6 text-zinc-900 dark:text-white"
              >Passwort bestätigen</label
            >
            <div class="mt-2">
              <input
                id="rePassword"
                name="rePassword"
                type="password"
                required
                bind:value={rePassword}
                class="block w-full rounded-lg border-0 bg-zinc-50 dark:bg-zinc-900/50 py-3 text-zinc-900 dark:text-white ring-1 ring-inset ring-zinc-200 dark:ring-zinc-700 placeholder:text-zinc-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
              />
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <button
            type="submit"
            disabled={loading}
            class="group relative flex w-full justify-center rounded-lg bg-green-600 px-3 py-3 text-sm font-semibold text-white hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-lg shadow-green-600/20"
          >
            {#if loading}
              <Loader2 class="mr-2 h-5 w-5 animate-spin" />
              Aktivierung...
            {:else}
              Konto aktivieren
            {/if}
          </button>

          <div class="text-center text-sm text-zinc-500 dark:text-zinc-400">
            <a
              href="/login"
              class="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
              >Zurück zum Login</a
            >
          </div>
        </div>
      </form>
    {/if}
  </div>
</div>
