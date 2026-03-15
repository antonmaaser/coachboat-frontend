<script lang="ts">
  import { client } from "$lib/api/client";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { Loader2, KeyRound, CheckCircle2, AlertCircle } from "lucide-svelte";
  import { onMount } from "svelte";
  import { AUTH_BASE } from "$lib/config";
  import TextInput from "$lib/components/ui/TextInput.svelte";
  import Button from "$lib/components/ui/Button.svelte";

  let token = $state("");
  let password = $state("");
  let rePassword = $state("");
  let loading = $state(false);
  let error = $state("");
  let success = $state(false);

  onMount(() => {
    const t = page.url.searchParams.get("token");
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
            "Aktivierung fehlgeschlagen. Aktivierungstoken ist ungültig oder abgelaufen.",
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
            <TextInput
              id="token"
              name="token"
              label="Aktivierungstoken"
              required
              bind:value={token}
              placeholder="Falls nicht automatisch eingefügt, hier Aktivierungstoken eingeben"
            />
          </div>

          <div>
            <TextInput
              id="password"
              name="password"
              type="password"
              label="Neues Passwort"
              required
              bind:value={password}
            />
          </div>

          <div>
            <TextInput
              id="rePassword"
              name="rePassword"
              type="password"
              label="Passwort bestätigen"
              required
              bind:value={rePassword}
            />
          </div>
        </div>

        <div class="space-y-4">
          <Button
            variant="solid"
            tone="success"
            size="lg"
            width="full"
            elevated
            type="submit"
            disabled={loading}
          >
            {#if loading}
              <Loader2 class="mr-2 h-5 w-5 animate-spin" />
              Aktivierung...
            {:else}
              Konto aktivieren
            {/if}
          </Button>

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
