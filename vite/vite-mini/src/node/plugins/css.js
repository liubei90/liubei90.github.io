import path from 'path';

import { CLIENT_PUBLIC_PATH } from '../constants.js';
import { isCSSRequest, normalizePath } from '../utils.js';


export function cssPlugin(config) {
    return {
        name: 'vite:css',

        async transform(raw, id) {
            if (!isCSSRequest(id)) return;

            // 只处理 css 格式，暂不处理 @import
            const code = raw;

            return code;
        },
    }
}

export function cssPostPlugin(config) {
    return {
        name: 'vite:css-post',

        async transform(css, id) {
            if (!isCSSRequest(id)) return;

            return [
                `import { updateStyle, removeStyle } from ${JSON.stringify(normalizePath(path.join(config.base, CLIENT_PUBLIC_PATH)))};`,
                `const id = ${JSON.stringify(id)}`,
                `const css = ${JSON.stringify(css)}`,
                `updateStyle(id, css)`,
            ].join('\n');
        }
    }
}