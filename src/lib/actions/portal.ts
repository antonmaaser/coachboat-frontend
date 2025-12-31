/**
 * Usage: <div use:portal> or <div use:portal={document.body}>
 * Moves the node to the target element (default body)
 */
export function portal(node: HTMLElement, target: HTMLElement = document.body) {
    target.appendChild(node);
    return {
        destroy() {
            if (node.parentNode) {
                node.parentNode.removeChild(node);
            }
        },
    };
}
