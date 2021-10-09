/*
 * @Author: liubei
 * @Date: 2021-09-28 08:44:38
 * @LastEditTime: 2021-10-08 15:07:30
 * @Description: 
 */
import path from 'path';
import { isObject } from './utils.js';


export async function createPluginContainer(config) {
    const { plugins, root, build: { rollupOptions } = {} } = config;

    class Context {
        async resolve(id, importer, options) {
            const res = await container.resolveId(id, importer);
            return res;
        }
    }

    const container = {
        async buildStart() {
            // 执行插件中的 buildStart 钩子
            await Promise.all(
                plugins.map((plugin) => {
                    if (plugin.buildStart) {
                        return plugin.buildStart.call({}, rollupOptions);
                    };
                })
            )
        },

        async resolveId(rawId, importer = path.join(root, 'index.html')) {
            const res = {};
            let id = null;

            for (const plugin of plugins) {
                if (!plugin.resolveId) continue;

                const _ctx = new Context();
                const result = await plugin.resolveId.call(_ctx, rawId, importer);

                if (!result) continue

                id = isObject(result) ? result.id : result;

                break;
            };

            if (id) {
                res['id'] = id;
                return res;
            }

            return null;
        },

        async load(id) {
            for (const plugin of plugins) {
                if (!plugin.load) continue;

                const _ctx = new Context();
                const result = await plugin.load.call(_ctx, id)

                if (result) return result;
            }

            return null;
        },

        async transform(code, id) {
            for (const plugin of plugins) {
                if (!plugin.transform) continue;

                const _ctx = new Context();
                const result = await plugin.transform.call(_ctx, code, id);

                if (!result) continue;

                if (isObject(result)) {
                    code = result.code;
                } else {
                    code = result;
                }
            }

            return { code };
        },
    };

    return container;
}