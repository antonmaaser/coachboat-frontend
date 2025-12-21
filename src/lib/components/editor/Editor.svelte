<script lang="ts">
    import { onMount, onDestroy } from "svelte";

    let {
        data = undefined,
        readOnly = false,
        placeholder = "Schreibe etwas...",
        onChange,
        class: className = "",
    } = $props<{
        data?: any;
        readOnly?: boolean;
        placeholder?: string;
        onChange?: (data: any) => void;
        class?: string;
    }>();

    let editorElement: HTMLElement;
    // ...
    let editor: any = null; // Type as any for now since we lazy load

    onMount(async () => {
        if (!editorElement) return;

        try {
            // Dynamic imports for browser-only execution
            const [
                { default: EditorJS },
                { default: Header },
                { default: List },
                { default: Paragraph },
            ] = await Promise.all([
                import("@editorjs/editorjs"),
                import("@editorjs/header"),
                import("@editorjs/list"),
                import("@editorjs/paragraph"),
            ]);

            editor = new EditorJS({
                holder: editorElement,
                readOnly,
                placeholder,
                data: data || undefined,
                minHeight: 0,
                tools: {
                    header: {
                        class: Header as any,
                        config: {
                            placeholder: "Überschrift",
                            levels: [1, 2, 3],
                            defaultLevel: 2,
                        },
                    },
                    list: {
                        class: List as any,
                        inlineToolbar: true,
                    },
                    paragraph: {
                        class: Paragraph as any,
                        inlineToolbar: true,
                    },
                },
                onChange: async (api: any, event: any) => {
                    if (!readOnly && onChange) {
                        const savedData = await api.saver.save();
                        onChange(savedData);
                    }
                },
            });
        } catch (e) {
            console.error("EditorJS init error", e);
        }
    });

    onDestroy(() => {
        if (editor && typeof editor.destroy === "function") {
            // editor.destroy() is sometimes async or fails if already destroyed, but good practice
            try {
                editor.destroy();
            } catch (e) {
                /* ignore */
            }
            editor = null;
        }
    });
</script>

<div
    bind:this={editorElement}
    class="editor-js-container prose dark:prose-invert max-w-none {className}"
></div>

<style>
    /* Styling overrides to make EditorJS fit the theme */
    :global(.codex-editor) {
        color: inherit;
    }

    :global(.ce-block__content) {
        max-width: none !important;
    }

    :global(.ce-toolbar__content) {
        max-width: none !important;
    }

    /* Reduce default large padding in EditorJS */
    :global(.codex-editor__redactor) {
        padding-bottom: 0 !important;
        margin-right: 0 !important;
    }

    /* Dark mode specific tweaks could go here if global dark class is present */
    :global(.dark .ce-inline-toolbar) {
        background-color: #27272a; /* zinc-800 */
        border-color: #3f3f46; /* zinc-700 */
        color: #f4f4f5; /* zinc-100 */
    }

    :global(.dark .ce-inline-tool:hover) {
        background-color: #3f3f46;
    }

    :global(.ce-popover) {
        z-index: 50; /* Ensure tooltips/popovers allow visibility */
    }

    :global(.dark .ce-popover) {
        background-color: #27272a;
        border-color: #3f3f46;
    }

    :global(.dark .ce-popover__item:hover) {
        background-color: #3f3f46;
    }

    :global(.dark .ce-popover__item-icon) {
        background-color: #3f3f46;
    }

    /* Fallback styles for content if typography plugin is missing */
    :global(.editor-js-container h1) {
        font-size: 1.5rem;
        font-weight: 700;
        margin-top: 1em;
        margin-bottom: 0.5em;
        line-height: 1.2;
    }
    :global(.editor-js-container h2) {
        font-size: 1.25rem;
        font-weight: 600;
        margin-top: 1em;
        margin-bottom: 0.5em;
        line-height: 1.3;
    }
    :global(.editor-js-container h3) {
        font-size: 1.125rem;
        font-weight: 600;
        margin-top: 1em;
        margin-bottom: 0.5em;
        line-height: 1.4;
    }
    :global(.editor-js-container ul, .editor-js-container ol) {
        padding-left: 1.25em;
        margin-bottom: 1em;
    }
    :global(.editor-js-container ul) {
        list-style-type: disc;
    }
    :global(.editor-js-container ol) {
        list-style-type: decimal;
    }
    :global(.editor-js-container li) {
        margin-bottom: 0.25em;
    }
    :global(.editor-js-container a) {
        color: #2563eb;
        text-decoration: underline;
    }
    :global(.dark .editor-js-container a) {
        color: #60a5fa;
    }

    /* Tooltip styling for EditorJS toolbar actions */
    :global(.ce-toolbar__actions) {
        background-color: white;
        border-radius: 0.5rem; /* rounded-lg */
        box-shadow:
            0 4px 6px -1px rgb(0 0 0 / 0.1),
            0 2px 4px -2px rgb(0 0 0 / 0.1);
        border: 1px solid #e4e4e7; /* zinc-200 */
        padding: 3px;
        transform: translate(-12px, -6px);
    }

    :global(.dark .ce-toolbar__actions) {
        background-color: #27272a; /* zinc-800 */
        border-color: #3f3f46; /* zinc-700 */
        box-shadow:
            0 4px 6px -1px rgb(0 0 0 / 0.5),
            0 2px 4px -2px rgb(0 0 0 / 0.3);
    }

    /* Adjust individual buttons inside the pill */
    :global(.ce-toolbar__plus),
    :global(.ce-toolbar__settings-btn) {
        border-radius: 0.5rem; /* rounded-lg */
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #52525b; /* zinc-600 */
        transition:
            background-color 0.2s,
            color 0.2s;
    }

    :global(.dark .ce-toolbar__plus),
    :global(.dark .ce-toolbar__settings-btn) {
        color: #a1a1aa; /* zinc-400 */
    }

    :global(.ce-toolbar__plus:hover),
    :global(.ce-toolbar__settings-btn:hover) {
        background-color: #f4f4f5; /* zinc-100 */
        color: #18181b; /* zinc-900 */
    }

    :global(.dark .ce-toolbar__plus:hover),
    :global(.dark .ce-toolbar__settings-btn:hover) {
        background-color: #3f3f46; /* zinc-700 */
        color: #fff;
    }
</style>
