/*
 * @Author: liubei
 * @Date: 2021-09-16 17:42:19
 * @LastEditTime: 2021-09-28 09:51:36
 * @Description: 
 */

import path from 'path';

import resolve from 'resolve';

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

            // 裸导入
            const bareImportRE = /^[\w@](?!.*:\/\/)/;

            if (bareImportRE.test(id)) {
                const resolvedSrc = resolve.sync(id, {
                    basedir: path.dirname(importer),
                    packageFilter: function packageFilter(pkg) {
                        if (pkg.module) {
                            pkg.main = pkg.module;
                            delete pkg.module;
                        }
                        return pkg;
                    }
                });

                return resolvedSrc;
            }
        },

    };
}

export function tryOptimizedResolve(id, server, importer) {
    ;
}

