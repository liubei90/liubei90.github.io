/*
 * @Author: liubei
 * @Date: 2021-09-14 18:15:00
 * @LastEditTime: 2021-09-16 18:13:16
 * @Description: 
 */
import path from 'path';
import connect from 'connect';
import http from 'http';

import { isObject } from './utils.js';
import { baseMiddleware } from './middlewares/base.js';
import { indexHtmlMiddleware } from './middlewares/indexHtml.js';
import { transformMiddleware } from './middlewares/transform.js';

import { htmlInlineScriptProxyPlugin } from './plugins/html.js';
import { resolvePlugin } from './plugins/resolve.js';

async function createServer(config) {
    config.root = path.resolve('./', config.root);
    config.plugins = [
        resolvePlugin(config),
        htmlInlineScriptProxyPlugin(),
        ...config.plugins,
    ]

    console.dir(config, { depth: 10 });

    const { plugins } = config;

    // 请求中间件
    const middlewares = connect();
    // 开发服务器
    const httpServer = http.createServer(middlewares);
    // 钩子容器
    const container = await createPluginContainer(config);
    // 创建模块图，缓存模块
    const moduleGraph = new ModuleGraph(container);

    // middlewares.use(function(req, res, next) {
    //     res.end('hello, world');

    //     return next();
    // });

    const server = {
        config,
        httpServer,
        pluginContainer: container,
        moduleGraph,
        async listen(port = 8090) {
            await container.buildStart({});

            return startServer(server, port);
        },
    }

    // 执行 configureServer 钩子
    const postHooks = []
    for (const plugin of plugins) {
        if (plugin.configureServer) {
            postHooks.push(await plugin.configureServer(server));
        }
    }

    // 处理 req.url 中的 base
    middlewares.use(baseMiddleware(server));

    // 主要的处理逻辑都在这个中间件执行
    middlewares.use(transformMiddleware(server));

    // 处理 html 文件
    middlewares.use(indexHtmlMiddleware(server));

    return server;
}

function startServer(server, port) {
    const httpServer = server.httpServer;

    return new Promise(function(resolve, reject) {
        httpServer.on('error', reject);

        httpServer.listen(port, () => {
            console.log('http://localhost:' + port);
            httpServer.removeListener('error', reject);
            resolve();
        });
    });

}

async function createPluginContainer(config) {
    const { plugins, build: { rollupOptions } = {} } = config;
    return {
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

        async resolveId(rawId, importer) {
            const res = {};
            let id = null;

            for (const plugin of plugins) {
                if (!plugin.resolveId) continue;

                const result = await plugin.resolveId.call({}, rawId, importer);

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

                const result = await plugin.load.call({}, id)

                if (result) return result;
            }

            return null;
        },

        async transform(code, id) {
            for (const plugin of plugins) {
                if (!plugin.transform) continue;

                const result = await plugin.transform.call({}, code, id);

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
}

class ModuleGraph {
    async getModuleByUrl() {}
}

(async function () {
    const server = await createServer({
        root: './',
        base: '/foo/',
        plugins: [],
        build: {
            rollupOptions: {}
        }
    });

    await server.listen();
})();
