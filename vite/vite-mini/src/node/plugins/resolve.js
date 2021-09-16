/*
 * @Author: liubei
 * @Date: 2021-09-16 17:42:19
 * @LastEditTime: 2021-09-16 18:11:59
 * @Description: 
 */

import path from 'path';
import { cleanUrl } from '../utils.js';

export function resolvePlugin(baseOptions) {
    const { root } = baseOptions;
    let server;

    return {
        name: 'vite:resolve',

        configureServer(_server) {
            server = _server
        },

        resolveId(id, importer, resolveOpts, ssr) {
            if (id.startsWith('/')) {
                return path.resolve(root, id.slice(1));
            }
        },

    };
}
