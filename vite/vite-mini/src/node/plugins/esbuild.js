import { transform } from 'esbuild';

import { cleanUrl } from '../utils.js';


export function esbuildPlugin(options) {
    return {
        name: 'vite:esbuild',

        async transform(code, id) {
            if (!/\.(tsx?)$/.test(cleanUrl(id))) return;

            const result = await transform(code, { loader: 'ts' });

            return result.code;
        },
    };
}
