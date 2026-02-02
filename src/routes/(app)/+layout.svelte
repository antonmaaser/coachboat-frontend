<script lang="ts">
    import { auth } from "$lib/stores/auth";
    import Sidebar from "$lib/components/Sidebar.svelte";
    import { goto } from "$app/navigation";
    import { browser } from "$app/environment";
    import logo from "$lib/assets/waves.svg";

    import { client } from "$lib/api/client";
    import { Menu } from "lucide-svelte";

    let { children } = $props();
    let mobileMenuOpen = $state(false);

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

    function toggleMobileMenu() {
        mobileMenuOpen = !mobileMenuOpen;
    }
</script>

<div
    class="min-h-screen bg-zinc-50 dark:bg-zinc-900 transition-colors duration-300"
>
    <!-- Mobile Header -->
    <header
        class="md:hidden flex items-center justify-between p-4 bg-white dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 sticky top-0 z-30"
    >
        <div class="flex items-center gap-2">
            <img src={logo} alt="Coachboat Planer" class="w-8 h-8" />
            <span class="font-bold text-lg text-zinc-900 dark:text-white"
                >Coachboat-Planer</span
            >
        </div>
        <button
            onclick={toggleMobileMenu}
            class="p-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 rounded-lg transition-colors"
        >
            <Menu class="w-6 h-6" />
        </button>
    </header>

    <Sidebar bind:isOpen={mobileMenuOpen} />
    <main class="md:ml-64 min-h-screen transition-all duration-300">
        <div class="p-4 md:p-8">
            <!-- Mobile Toggle could go here -->
            {@render children()}
        </div>
    </main>
</div>
