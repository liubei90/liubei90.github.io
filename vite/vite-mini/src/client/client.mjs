const sheetsMap = new Map();
function updateStyle(id, content) {
    let style = sheetsMap.get(id);
    {
        if (style && !(style instanceof HTMLStyleElement)) {
            removeStyle(id);
            style = undefined;
        }
        if (!style) {
            style = document.createElement('style');
            style.setAttribute('type', 'text/css');
            style.innerHTML = content;
            document.head.appendChild(style);
        }
        else {
            style.innerHTML = content;
        }
    }
    sheetsMap.set(id, style);
}
function removeStyle(id) {
    const style = sheetsMap.get(id);
    if (style) {
        if (style instanceof CSSStyleSheet) {
            // @ts-ignore
            document.adoptedStyleSheets.indexOf(style);
            // @ts-ignore
            document.adoptedStyleSheets = document.adoptedStyleSheets.filter((s) => s !== style);
        }
        else {
            document.head.removeChild(style);
        }
        sheetsMap.delete(id);
    }
}
/**
 * urls here are dynamic import() urls that couldn't be statically analyzed
 */
function injectQuery(url, queryToInject) {
    // skip urls that won't be handled by vite
    if (!url.startsWith('.') && !url.startsWith('/')) {
        return url;
    }
    // can't use pathname from URL since it may be relative like ../
    const pathname = url.replace(/#.*$/, '').replace(/\?.*$/, '');
    const { search, hash } = new URL(url, 'http://vitejs.dev');
    return `${pathname}?${queryToInject}${search ? `&` + search.slice(1) : ''}${hash || ''}`;
}

export { injectQuery, removeStyle, updateStyle };
//# sourceMappingURL=client.mjs.map
