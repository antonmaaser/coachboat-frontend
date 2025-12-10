<script lang="ts">
    import { todoApi, type Todo } from "$lib/api/todos";
    import { resourceApi } from "$lib/api/resources";
    import { auth } from "$lib/stores/auth";
    import {
        Plus,
        Trash2,
        CheckCircle2,
        Circle,
        Loader2,
        X,
    } from "lucide-svelte";
    import { onMount, tick } from "svelte";

    let { resourceId } = $props<{ resourceId?: string | number }>();

    let todos = $state<Todo[]>([]);
    let loading = $state(true);
    let error = $state("");
    let adding = $state(false);
    let newTitle = $state("");
    let showCompleted = $state(false);
    let resourceMap = $state<Record<number, string>>({});

    let filteredTodos = $derived(
        showCompleted ? todos : todos.filter((t) => t.attributes.status === 0),
    );

    // For editing a todo
    let editingId = $state<string | null>(null);
    let editTitle = $state("");

    async function loadTodos() {
        loading = true;
        try {
            const res = await todoApi.list(resourceId);
            if (res.ok) {
                const json = await res.json();
                todos = json.data || json; // Adjust based on actual API response wrapper
            }

            if (!resourceId) {
                const res = await resourceApi.list();
                if (res.ok) {
                    const json = await res.json();
                    const resources = json.data || json;
                    resourceMap = resources.reduce((acc: any, r: any) => {
                        acc[r.id] = r.attributes.title;
                        return acc;
                    }, {});
                }
            }
        } catch (e) {
            console.error("Failed to load todos", e);
            error = "Could not load tasks.";
        } finally {
            loading = false;
        }
    }

    async function createTodo(e: Event) {
        e.preventDefault();
        if (!newTitle.trim()) return;

        adding = true;
        try {
            const res = await todoApi.create({
                "resource-id": Number(resourceId),
                title: newTitle,
                status: 0,
            });

            if (res.ok) {
                newTitle = "";
                await loadTodos();
            }
        } catch (e) {
            console.error("Failed to create todo", e);
        } finally {
            adding = false;
        }
    }

    async function toggleStatus(todo: Todo) {
        // Optimistic update
        const originalStatus = todo.attributes.status;
        const newStatus = originalStatus === 1 ? 0 : 1;

        // Update local state temporarily
        todos = todos.map((t) =>
            t.id === todo.id
                ? { ...t, attributes: { ...t.attributes, status: newStatus } }
                : t,
        );

        try {
            const res = await todoApi.update(todo.id, { status: newStatus });
            if (!res.ok) {
                // Revert
                todos = todos.map((t) =>
                    t.id === todo.id
                        ? {
                              ...t,
                              attributes: {
                                  ...t.attributes,
                                  status: originalStatus,
                              },
                          }
                        : t,
                );
            }
        } catch (e) {
            console.error("Failed to update status", e);
            // Revert
            todos = todos.map((t) =>
                t.id === todo.id
                    ? {
                          ...t,
                          attributes: {
                              ...t.attributes,
                              status: originalStatus,
                          },
                      }
                    : t,
            );
        }
    }

    async function deleteTodo(id: string) {
        if (!confirm("Delete this task?")) return;

        try {
            const res = await todoApi.delete(id);
            if (res.ok) {
                todos = todos.filter((t) => t.id !== id);
            }
        } catch (e) {
            console.error("Failed to delete todo", e);
        }
    }

    function startEditing(todo: Todo) {
        editingId = todo.id;
        editTitle = todo.attributes.title;
        tick().then(() => {
            const input = document.getElementById(`edit-todo-${todo.id}`);
            input?.focus();
        });
    }

    async function saveEdit(id: string) {
        if (!editTitle.trim()) return cancelEdit();

        try {
            const res = await todoApi.update(id, { title: editTitle });
            if (res.ok) {
                todos = todos.map((t) =>
                    t.id === id
                        ? {
                              ...t,
                              attributes: { ...t.attributes, title: editTitle },
                          }
                        : t,
                );
            }
        } catch (e) {
            console.error("Failed to update title", e);
        } finally {
            editingId = null;
        }
    }

    function cancelEdit() {
        editingId = null;
        editTitle = "";
    }

    function handleKeydown(e: KeyboardEvent, id: string) {
        if (e.key === "Enter") saveEdit(id);
        if (e.key === "Escape") cancelEdit();
    }

    onMount(() => {
        loadTodos();
    });
</script>

<div class="space-y-4">
    {#if resourceId}
        <form onsubmit={createTodo} class="flex gap-2">
            <input
                type="text"
                bind:value={newTitle}
                placeholder="Add a new task..."
                class="flex-1 rounded-lg border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
                type="submit"
                disabled={!newTitle.trim() || adding}
                class="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {#if adding}
                    <Loader2 class="w-4 h-4 animate-spin" />
                {:else}
                    <Plus class="w-4 h-4" />
                {/if}
            </button>
        </form>
    {/if}

    <div class="flex items-center justify-between">
        <label
            class="flex items-center gap-2 text-xs text-zinc-500 cursor-pointer"
        >
            <input
                type="checkbox"
                bind:checked={showCompleted}
                class="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
            />
            Zeige Alle
        </label>
        <span class="text-xs text-zinc-400">
            {todos.filter((t) => t.attributes.status === 0).length} offen
        </span>
    </div>

    {#if loading && todos.length === 0}
        <div class="flex justify-center p-4">
            <Loader2 class="w-6 h-6 animate-spin text-zinc-400" />
        </div>
    {:else if filteredTodos.length === 0}
        <div class="text-center p-6 text-zinc-500 text-sm">
            {todos.length > 0
                ? "Keine offenen Aufgaben."
                : "Noch keine Aufgaben."}
        </div>
    {:else}
        <ul class="space-y-2">
            {#each filteredTodos as todo (todo.id)}
                {@const isComplete = todo.attributes.status === 1}
                <li
                    class="group flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                    <button
                        onclick={() => toggleStatus(todo)}
                        class="text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex-shrink-0"
                    >
                        {#if isComplete}
                            <CheckCircle2 class="w-5 h-5 text-green-500" />
                        {:else}
                            <Circle class="w-5 h-5" />
                        {/if}
                    </button>

                    <div class="flex-1 min-w-0">
                        {#if editingId === todo.id}
                            <div class="flex items-center gap-2">
                                <input
                                    id="edit-todo-{todo.id}"
                                    type="text"
                                    bind:value={editTitle}
                                    onkeydown={(e) => handleKeydown(e, todo.id)}
                                    onblur={() => saveEdit(todo.id)}
                                    class="w-full bg-white dark:bg-zinc-900 border border-blue-500 rounded px-2 py-1 text-sm focus:outline-none"
                                />
                            </div>
                        {:else}
                            <div
                                role="button"
                                tabindex="0"
                                onclick={() => startEditing(todo)}
                                onkeydown={(e) =>
                                    e.key === "Enter" && startEditing(todo)}
                                class="text-sm cursor-text truncate {isComplete
                                    ? 'text-zinc-500 line-through'
                                    : 'text-zinc-900 dark:text-white'}"
                            >
                                {todo.attributes.title}
                            </div>
                        {/if}
                        {#if !resourceId && resourceMap[todo.attributes["resource-id"]]}
                            <span
                                class="text-xs px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 whitespace-nowrap"
                            >
                                {resourceMap[todo.attributes["resource-id"]]}
                            </span>
                        {/if}
                    </div>

                    {#if ($auth.user?.status && $auth.user.status >= 3) || ($auth.user?.id && Number($auth.user.id) === todo.attributes["created-by"])}
                        <button
                            onclick={() => deleteTodo(todo.id)}
                            class="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-600 transition-all p-1"
                            title="Delete task"
                        >
                            <Trash2 class="w-4 h-4" />
                        </button>
                    {/if}
                </li>
            {/each}
        </ul>
    {/if}
</div>
