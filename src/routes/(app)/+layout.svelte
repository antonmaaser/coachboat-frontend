<script lang="ts">
    import { auth } from "$lib/stores/auth";
    import Sidebar from "$lib/components/Sidebar.svelte";
    import { goto } from "$app/navigation";
    import { browser } from "$app/environment";

    import { client } from "$lib/api/client";

    let { children } = $props();

    $effect(() => {
        if (browser) {
            if (!$auth.accessToken) {
                goto("/login");
            } else if ($auth.user && !$auth.user.firstName) {
                // Refresh user profile if firstName is missing (migration)
                client(`/users/${$auth.user.id}`).then(async (res) => {
                    if (res.ok) {
                        const json = await res.json();
                        const attrs = json.data.attributes;
                        auth.update((s) => ({
                            ...s,
                            user: {
                                ...s.user!,
                                firstName:
                                    attrs["first-name"] || attrs.firstName,
                                name: attrs.name,
                            },
                        }));
                    }
                });
            }
        }
    });
</script>

<div
    class="min-h-screen bg-zinc-50 dark:bg-zinc-900 transition-colors duration-300"
>
    <Sidebar />
    <main class="md:ml-64 min-h-screen transition-all duration-300">
        <div class="p-8">
            <!-- Mobile Toggle could go here -->
            {@render children()}
        </div>
    </main>
</div>
