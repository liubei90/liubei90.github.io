/*
 * @Author: liubei
 * @Date: 2021-09-16 17:42:19
 * @LastEditTime: 2021-10-09 16:28:15
 * @Description: 
 */

import path from 'path';

import resolve from 'resolve';

import { cleanUrl, normalizePath } from '../utils.js';


export function resolvePlugin(baseOptions) {
    const { root } = baseOptions;
    let server;

    return {
        name: 'vite:resolve',

        configureServer(_server) {
            server = _server
        },

        resolveId(id, importer, resolveOpts, ssr) {
            // 将绝对导入转换为真实路径
            if (id.startsWith('/')) {
                return path.resolve(root, id.slice(1));
            }

            // 处理相对路径
            if (id.startsWith('.')) {
                const basedir = importer ? path.dirname(importer) : process.cwd();
                const fsPath = path.resolve(basedir, id);
                // const normalizedFsPath = normalizePath(fsPath);

                return fsPath;
            }

            // 处理真实路径，C://xxx/x.x
            if (path.isAbsolute(id)) {
                return id;
            }

            // 将裸导入转换为node_modules文件夹路径
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

