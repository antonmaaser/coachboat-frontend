<script lang="ts">
  import { auth } from '$lib/stores/auth';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';

  let { children } = $props();

  $effect(() => {
     if (browser && !$auth.accessToken) {
         goto('/login');
     }
  });
</script>

<div class="min-h-screen bg-zinc-50 dark:bg-zinc-900 transition-colors duration-300">
    <Sidebar />
    <main class="md:ml-64 min-h-screen transition-all duration-300">
        <div class="p-8">
            <!-- Mobile Toggle could go here -->
            {@render children()}
        </div>
    </main>
</div>
