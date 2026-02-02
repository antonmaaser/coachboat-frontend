<script lang="ts">
    import { resourceApi, type ResourceAttributes } from "$lib/api/resources";
    import { client } from "$lib/api/client";
    import { todoApi } from "$lib/api/todos";
    import { auth, hasPermission } from "$lib/stores/auth";
    import { toast } from "$lib/stores/toast";
    import Modal from "$lib/components/Modal.svelte";
    // ResourceForm removed
    import ErrorAlert from "$lib/components/ui/ErrorAlert.svelte";
    import TextInput from "$lib/components/ui/TextInput.svelte";
    import SearchableSelect from "$lib/components/ui/SearchableSelect.svelte";
    import TodoList from "$lib/components/TodoList.svelte";

    import {
        Ship,
        Plus,
        MoreVertical,
        CheckCircle2,
        XCircle,
        Pencil,
        Trash2,
        ListTodo,
        AlertTriangle,
        ArrowRight,
        Loader2,
    } from "lucide-svelte";
    import { goto } from "$app/navigation";
    import * as Icons from "lucide-svelte";
    import { onMount } from "svelte";

    import { resourceCategoryApi } from "$lib/api/resource-categories";
    import { extractErrorMessage } from "$lib/utils/error";

    let resources = $state<any[]>([]);
    let todos = $state<any[]>([]);
    let categories = $state<any[]>([]);
    let loading = $state(true);
    let error = $state<string | null>(null);
    let showModal = $state(false);
    let editingResource = $state<any>(undefined);
    let activeMenuId = $state<string | null>(null);
    let viewingTodosFor = $state<any>(undefined);
    let isLoading = $state(true);

    // Form State
    let formTitle = $state("");
    let formDescription = $state("");
    let formIsReady = $state(false);
    let formCategoryId = $state<string>("");
    let formLoading = $state(false);
    let formError = $state("");

    $effect(() => {
        if (showModal) {
            formTitle = editingResource?.attributes.title || "";
            formDescription = editingResource?.attributes.description || "";
            formIsReady = editingResource?.attributes["is-ready"] || false;
            formCategoryId = editingResource?.attributes["category-id"] || "";
            formError = "";
            formLoading = false;
        }
    });

    async function handleFormSubmit(e: Event) {
        e.preventDefault();
        formLoading = true;
        formError = "";

        try {
            const attributes: Partial<ResourceAttributes> = {
                title: formTitle,
                description: formDescription,
                "is-ready": formIsReady,
                "category-id": formCategoryId || null,
            };

            let res;
            if (editingResource?.id) {
                res = await resourceApi.update(editingResource.id, attributes);
            } else {
                res = await resourceApi.create(
                    attributes as ResourceAttributes,
                );
            }

            if (!res.ok) {
                const msg = await extractErrorMessage(res);
                formError = msg;
                return;
            }

            handleSuccess();
        } catch (e: any) {
            console.error(e);
            formError = await extractErrorMessage(e);
        } finally {
            formLoading = false;
        }
    }

    async function handleDelete(resource: any) {
        if (!confirm("Are you sure you want to delete this resource?")) return;
        try {
            const res = await resourceApi.delete(resource.id);
            if (res.ok) {
                loadResources();
            } else {
                const msg = await extractErrorMessage(res);
                toast.error(msg);
            }
        } catch (e) {
            console.error(e);
            const msg = await extractErrorMessage(e);
            toast.error(msg);
        }
    }

    async function loadResources() {
        loading = true;
        try {
            const [resResources, resTodos, resCategories] = await Promise.all([
                resourceApi.list(),
                todoApi.list(),
                resourceCategoryApi.list(),
            ]);

            if (resResources.ok) {
                const json = await resResources.json();
                resources = json.data || json;
            }

            if (resTodos.ok) {
                const json = await resTodos.json();
                todos = json.data || json;
            }

            if (resCategories.ok) {
                const json = await resCategories.json();
                categories = json.data || json;
            }
        } catch (e) {
            console.error(e);
            error = await extractErrorMessage(e);
        } finally {
            loading = false;
        }
    }

    function openCreateModal() {
        editingResource = undefined;
        showModal = true;
    }

    function openEditModal(resource: any) {
        editingResource = resource;
        showModal = true;
    }

    function handleSuccess() {
        showModal = false;
        loadResources();
    }

    onMount(() => {
        loadResources();
    });

    let isAdmin = $derived(hasPermission($auth.user, "resources:create")); // Or manage

    // Calculate open todo counts per resource
    let todoCounts = $derived.by(() => {
        const counts: Record<string, number> = {};
        for (const todo of todos) {
            if (
                todo.attributes.status === 0 &&
                todo.attributes["resource-id"]
            ) {
                const rid = String(todo.attributes["resource-id"]);
                counts[rid] = (counts[rid] || 0) + 1;
            }
        }
        return counts;
    });

    async function toggleTodoStatus(todo: any, e: MouseEvent) {
        e.stopPropagation();
        const originalStatus = todo.attributes.status;
        const newStatus = originalStatus === 1 ? 0 : 1;

        todos = todos.map((t) =>
            t.id === todo.id
                ? { ...t, attributes: { ...t.attributes, status: newStatus } }
                : t,
        );

        try {
            const res = await todoApi.update(todo.id, { status: newStatus });
            if (!res.ok) {
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
</script>

<div class="space-y-6">
    <div class="flex flex-col md:flex-row items-center justify-between gap-4">
        <h1
            class="text-2xl font-bold text-zinc-900 dark:text-white w-full md:w-auto"
        >
            Material
        </h1>

        {#if isAdmin}
            <button
                onclick={openCreateModal}
                class="w-full md:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-blue-600/20"
            >
                <Plus class="w-5 h-5" />
                Material anlegen
            </button>
        {/if}
    </div>

    {#if activeMenuId}
        <!-- Backdrop to close menu -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            class="fixed inset-0 z-10"
            onclick={() => (activeMenuId = null)}
        ></div>
    {/if}

    {#if loading}
        <div class="flex w-full justify-center p-12">
            <div
                class="w-8 h-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"
            ></div>
        </div>
    {:else if error}
        <ErrorAlert {error} />
    {:else if resources.length === 0}
        <div
            class="text-center p-12 bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700"
        >
            <Ship class="w-12 h-12 mx-auto text-zinc-400 mb-4" />
            <h3 class="text-lg font-medium text-zinc-900 dark:text-white">
                Keine Materialien gefunden
            </h3>
            <p class="text-zinc-500 mt-1">
                Es sind noch keine Materialien verfügbar.
            </p>
        </div>
    {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {#each resources as resource}
                {@const attrs = resource.attributes}
                {@const category = categories.find(
                    (c) => c.id === attrs["category-id"],
                )}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div
                    class="bg-white dark:bg-zinc-800 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-700 p-6 relative group transition-all hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-600"
                >
                    <div class="flex items-start justify-between mb-4">
                        {#if category}
                            <div
                                class="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors"
                                style="background-color: {category.attributes
                                    .color}15; color: {category.attributes
                                    .color};"
                            >
                                {#if category.attributes.icon && (Icons as any)[category.attributes.icon]}
                                    {@const Icon = (Icons as any)[
                                        category.attributes.icon
                                    ]}
                                    {#if Icon}
                                        <Icon class="w-4 h-4" />
                                    {/if}
                                {/if}
                                {category.attributes.title}
                            </div>
                        {:else}
                            <div
                                class="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400"
                            >
                                <Ship class="w-6 h-6" />
                            </div>
                        {/if}

                        <div class="flex items-center gap-1">
                            <button
                                onclick={() =>
                                    goto(`/resources/${resource.id}`)}
                                class="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                aria-label="Details"
                            >
                                <ArrowRight class="w-5 h-5" />
                            </button>

                            {#if todoCounts[resource.id]}
                                <div
                                    class="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full shadow-md z-10 border-2 border-white dark:border-zinc-800"
                                >
                                    {todoCounts[resource.id]}
                                </div>
                            {/if}
                            {#if $auth.user?.status && $auth.user.status >= 2}
                                <div class="relative z-20">
                                    <button
                                        onclick={(e) => {
                                            e.stopPropagation();
                                            activeMenuId =
                                                activeMenuId === resource.id
                                                    ? null
                                                    : resource.id;
                                        }}
                                        class="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                                        aria-label="Optionen"
                                    >
                                        <MoreVertical class="w-5 h-5" />
                                    </button>

                                    {#if activeMenuId === resource.id}
                                        <div
                                            class="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden transform origin-top-right transition-all"
                                        >
                                            {#if isAdmin}
                                                <button
                                                    onclick={() => {
                                                        openEditModal(resource);
                                                        activeMenuId = null;
                                                    }}
                                                    class="w-full text-left px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-sm text-zinc-700 dark:text-zinc-300 flex items-center gap-2"
                                                >
                                                    <Pencil class="w-4 h-4" />
                                                    Bearbeiten
                                                </button>
                                                <button
                                                    onclick={() => {
                                                        handleDelete(resource);
                                                        activeMenuId = null;
                                                    }}
                                                    class="w-full text-left px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm text-red-600 dark:text-red-400 flex items-center gap-2 border-t border-zinc-100 dark:border-zinc-700"
                                                >
                                                    <Trash2 class="w-4 h-4" />
                                                    Löschen
                                                </button>
                                            {/if}
                                            <button
                                                onclick={() => {
                                                    viewingTodosFor = resource;
                                                    activeMenuId = null;
                                                }}
                                                class="w-full text-left px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-sm text-zinc-700 dark:text-zinc-300 flex items-center gap-2 {isAdmin
                                                    ? 'border-t border-zinc-100 dark:border-zinc-700'
                                                    : ''}"
                                            >
                                                <ListTodo class="w-4 h-4" />
                                                Aufgaben
                                            </button>
                                        </div>
                                    {/if}
                                </div>
                            {/if}
                        </div>
                    </div>

                    <h3
                        class="text-lg font-bold text-zinc-900 dark:text-white mb-2"
                    >
                        {attrs.title}
                    </h3>
                    <p
                        class="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-3 mb-4 min-h-[3em]"
                    >
                        {attrs.description || "Keine Beschreibung angegeben."}
                    </p>

                    <!-- Desktop Todo List -->
                    <div class="hidden lg:block mb-4 space-y-1">
                        {#each todos.filter((t) => t.attributes["resource-id"] == resource.id && t.attributes.status === 0) as todo}
                            <button
                                onclick={(e) => toggleTodoStatus(todo, e)}
                                class="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 group/todo w-full text-left hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
                            >
                                <div
                                    class="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0 group-hover/todo:bg-green-500 transition-colors"
                                ></div>
                                <span
                                    class="truncate group-hover/todo:line-through transition-all opacity-100 group-hover/todo:opacity-70"
                                    >{todo.attributes.title}</span
                                >
                            </button>
                        {/each}
                    </div>

                    <div
                        class="flex items-center gap-2 text-sm pt-4 border-t border-zinc-100 dark:border-zinc-700/50"
                    >
                        {#if attrs["is-ready"]}
                            {#if todoCounts[resource.id] && todoCounts[resource.id] > 0}
                                <AlertTriangle
                                    class="w-4 h-4 text-orange-500"
                                />
                                <span
                                    class="text-orange-700 dark:text-orange-400 font-medium"
                                >
                                    Aufgaben ausstehend
                                </span>
                            {:else}
                                <CheckCircle2 class="w-4 h-4 text-green-500" />
                                <span
                                    class="text-green-700 dark:text-green-400 font-medium"
                                    >Material verfügbar</span
                                >
                            {/if}
                        {:else}
                            <XCircle class="w-4 h-4 text-red-500" />
                            <span
                                class="text-red-700 dark:text-red-400 font-medium"
                                >Material nicht verfügbar</span
                            >
                        {/if}
                    </div>
                </div>
            {/each}
        </div>
    {/if}

    <Modal
        bind:show={showModal}
        title={editingResource ? "Material bearbeiten" : "Neues Material"}
    >
        {#key editingResource?.id || "new"}
            <form onsubmit={handleFormSubmit} class="space-y-4">
                {#if formError}
                    <ErrorAlert error={formError} />
                {/if}

                <TextInput
                    id="title"
                    label="Titel"
                    bind:value={formTitle}
                    required
                    placeholder="e.g. Coach Boat 1"
                />

                <div>
                    <SearchableSelect
                        label="Kategorie"
                        bind:value={formCategoryId}
                        options={[
                            { value: "", label: "Keine Kategorie" },
                            ...categories.map((cat) => ({
                                value: cat.id,
                                label: cat.attributes.title,
                            })),
                        ]}
                        placeholder="Wähle eine Kategorie..."
                    />
                </div>

                <TextInput
                    id="description"
                    label="Beschreibung"
                    bind:value={formDescription}
                    multiline
                    rows={3}
                    placeholder="Optional description..."
                />

                <div class="flex items-center gap-6">
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            bind:checked={formIsReady}
                            class="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span
                            class="text-sm font-medium text-zinc-700 dark:text-zinc-300"
                            >Material verfügbar</span
                        >
                    </label>
                </div>

                <div class="pt-2">
                    <button
                        type="submit"
                        disabled={formLoading}
                        class="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {#if formLoading}
                            <Loader2 class="w-4 h-4 animate-spin mr-2" />
                            Speichern...
                        {:else}
                            {editingResource
                                ? "Material aktualisieren"
                                : "Neues Material erstellen"}
                        {/if}
                    </button>
                </div>
            </form>
        {/key}
    </Modal>

    <Modal
        bind:show={
            () => !!viewingTodosFor,
            (v) => {
                if (!v) {
                    viewingTodosFor = undefined;
                    loadResources(); // Refresh todos when modal closes
                }
            }
        }
        title={viewingTodosFor
            ? `Aufgaben: ${viewingTodosFor.attributes.title}`
            : "Aufgaben"}
    >
        {#if viewingTodosFor}
            {#key viewingTodosFor.id}
                <TodoList resourceId={viewingTodosFor.id} />
            {/key}
        {/if}
    </Modal>
</div>
