<script lang="ts">
    import { todoApi, type Todo } from "$lib/api/todos";
    import { resourceApi } from "$lib/api/resources";
    import { auth, hasPermission } from "$lib/stores/auth";
    import {
        Plus,
        Trash2,
        CheckCircle2,
        Circle,
        Loader2,
        Eye,
    } from "lucide-svelte";
    import { onMount, tick } from "svelte";
    import { extractErrorMessage } from "$lib/utils/error";
    import ErrorAlert from "$lib/components/ui/ErrorAlert.svelte";
    import TextInput from "$lib/components/ui/TextInput.svelte";
    import Toggle from "$lib/components/ui/Toggle.svelte";
    import Modal from "$lib/components/Modal.svelte";
    import { toast } from "$lib/stores/toast";

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
    let showDetailModal = $state(false);
    let detailLoading = $state(false);
    let selectedTodo = $state<Todo | null>(null);

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
            error = await extractErrorMessage(e);
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
                "resource-id": resourceId as string,
                title: newTitle,
                status: 0,
            });

            if (res.ok) {
                newTitle = "";
                await loadTodos();
            } else {
                const msg = await extractErrorMessage(res);
                toast.error(msg);
            }
        } catch (e) {
            console.error("Failed to create todo", e);
            const msg = await extractErrorMessage(e);
            toast.error(msg);
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
                const msg = await extractErrorMessage(res);
                toast.error(msg);

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
            const msg = await extractErrorMessage(e);
            toast.error(msg);
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
            } else {
                const msg = await extractErrorMessage(res);
                toast.error(msg);
            }
        } catch (e) {
            console.error("Failed to delete todo", e);
            const msg = await extractErrorMessage(e);
            toast.error(msg);
        }
    }

    async function openTodoDetails(todo: Todo) {
        selectedTodo = todo;
        showDetailModal = true;
        detailLoading = true;

        try {
            const res = await todoApi.get(todo.id);
            if (res.ok) {
                const json = await res.json();
                selectedTodo = (json.data || json) as Todo;
            } else {
                const msg = await extractErrorMessage(res);
                toast.error(msg);
            }
        } catch (e) {
            console.error("Failed to load todo details", e);
            const msg = await extractErrorMessage(e);
            toast.error(msg);
        } finally {
            detailLoading = false;
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
            } else {
                const msg = await extractErrorMessage(res);
                toast.error(msg);
            }
        } catch (e) {
            console.error("Failed to update title", e);
            const msg = await extractErrorMessage(e);
            toast.error(msg);
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

    function todoStatusLabel(status?: number) {
        return status === 1 ? "Erledigt" : "Offen";
    }

    onMount(() => {
        loadTodos();
    });
</script>

<div class="space-y-4">
    {#if error}
        <ErrorAlert {error} />
    {/if}
    {#if resourceId}
        <form onsubmit={createTodo} class="flex items-start gap-2">
            <TextInput
                bind:value={newTitle}
                placeholder="Add a new task..."
                class="flex-1"
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
        <Toggle bind:checked={showCompleted} label="Zeige Alle" />
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
                            <div class="flex items-center gap-2 flex-1">
                                <TextInput
                                    id="edit-todo-{todo.id}"
                                    bind:value={editTitle}
                                    onkeydown={(e: KeyboardEvent) =>
                                        handleKeydown(e, todo.id)}
                                    onblur={() => saveEdit(todo.id)}
                                    class="w-full"
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
                        {#if !resourceId && resourceMap[Number(todo.attributes["resource-id"])]}
                            <span
                                class="text-xs px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400 whitespace-nowrap"
                            >
                                {resourceMap[
                                    Number(todo.attributes["resource-id"])
                                ]}
                            </span>
                        {/if}
                    </div>

                    <button
                        onclick={() => openTodoDetails(todo)}
                        class="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-blue-600 transition-all p-1"
                        title="Details"
                    >
                        <Eye class="w-4 h-4" />
                    </button>
                    {#if hasPermission($auth.user, "todos:delete:any") || ($auth.user?.id && String($auth.user.id) === String(todo.attributes["created-by"]))}
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

    <Modal title="Aufgabendetails" bind:show={showDetailModal}>
        {#if selectedTodo}
            {#if detailLoading}
                <div class="flex justify-center p-8">
                    <Loader2 class="w-6 h-6 animate-spin text-zinc-400" />
                </div>
            {:else}
                <div class="space-y-4">
                    <div>
                        <h3 class="text-lg font-bold text-zinc-900 dark:text-white">
                            {selectedTodo.attributes.title}
                        </h3>
                        <p class="text-sm text-zinc-500 dark:text-zinc-400">
                            Status: {todoStatusLabel(selectedTodo.attributes.status)}
                        </p>
                    </div>

                    <div class="bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-lg">
                        <span
                            class="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase mb-1"
                        >
                            Beschreibung
                        </span>
                        <p class="text-sm text-zinc-700 dark:text-zinc-300">
                            {selectedTodo.attributes.description ||
                                "Keine Beschreibung vorhanden."}
                        </p>
                    </div>

                    <div class="bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-lg">
                        <span
                            class="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase mb-1"
                        >
                            Ressource
                        </span>
                        <p class="text-sm text-zinc-700 dark:text-zinc-300">
                            {resourceMap[
                                Number(selectedTodo.attributes["resource-id"])
                            ] ||
                                selectedTodo.attributes["resource-id"] ||
                                "-"}
                        </p>
                    </div>

                    <div class="flex justify-end">
                        <button
                            onclick={() => (showDetailModal = false)}
                            class="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded-md hover:bg-zinc-50 dark:bg-zinc-700 dark:text-zinc-300 dark:border-zinc-600 dark:hover:bg-zinc-600"
                        >
                            Schließen
                        </button>
                    </div>
                </div>
            {/if}
        {/if}
    </Modal>
</div>
