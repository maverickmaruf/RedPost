// Tiny DOM helper. Text is always set with textContent, never innerHTML, so data cannot inject markup.
type Child = Node | string | number | null | undefined | false;
type Attrs = Record<string, string | number | boolean | EventListener | undefined | null>;

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, val] of Object.entries(attrs)) {
    if (val === undefined || val === null || val === false) continue;
    if (k.startsWith('on') && typeof val === 'function') el.addEventListener(k.slice(2).toLowerCase(), val as EventListener);
    else if (k === 'class') el.className = String(val);
    else if (val === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(val));
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(typeof c === 'object' ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function mount(root: HTMLElement, ...nodes: Node[]): void {
  root.replaceChildren(...nodes);
}

/** Move focus to the first heading so screen readers announce the new screen. */
export function focusHeading(root: HTMLElement): void {
  const el = root.querySelector<HTMLElement>('h1, h2');
  if (el) {
    el.tabIndex = -1;
    el.focus({ preventScroll: true });
  }
}

export const prefersReducedMotion = (): boolean =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
