<script lang="ts">
    import { auth } from "$lib/stores/auth";
    import TodoList from "$lib/components/TodoList.svelte";
</script>

<div class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-zinc-900 dark:text-white">
            Dashboard
        </h1>
        <span class="text-sm text-zinc-500 dark:text-zinc-400">
            {new Date().toLocaleDateString("de-DE", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
            })}
        </span>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
            class="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-sm border border-zinc-100 dark:border-zinc-700"
        >
            <h3 class="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Welcome back
            </h3>
            <p class="text-2xl font-bold text-zinc-900 dark:text-white mt-2">
                {$auth.user?.firstName || "User"}
            </p>
            <div
                class="mt-4 flex items-center text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 w-fit px-2 py-1 rounded-full"
            >
                <span
                    class="w-2 h-2 rounded-full bg-green-600 dark:bg-green-400 mr-2"
                ></span>
                Active Status
            </div>
        </div>

        <div
            class="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg text-white"
        >
            <h3 class="text-blue-100 font-medium">Quick Actions</h3>
            <div class="mt-4 space-y-2">
                <a
                    href="/events"
                    class="block bg-white/10 hover:bg-white/20 transition-colors px-3 py-2 rounded-lg text-sm font-medium text-white"
                >
                    View Calendar
                </a>
                <a
                    href="/resources"
                    class="block bg-white/10 hover:bg-white/20 transition-colors px-3 py-2 rounded-lg text-sm font-medium text-white"
                >
                    Book a Boat
                </a>
            </div>
        </div>

        <div
            class="bg-white dark:bg-zinc-800 p-6 rounded-xl shadow-sm border border-zinc-100 dark:border-zinc-700 md:col-span-3 lg:col-span-1"
        >
            <h3
                class="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4"
            >
                All Open Tasks
            </h3>
            <TodoList />
        </div>
    </div>
</div>
