/*
 * @Author: liubei
 * @Date: 2021-09-14 18:15:00
 * @LastEditTime: 2021-09-16 14:46:06
 * @Description: 
 */
import path from 'path';
import connect from 'connect';
import http from 'http';

import { baseMiddleware } from './middlewares/base.js';
import { indexHtmlMiddleware } from './middlewares/indexHtml.js';
import { transformMiddleware } from './middlewares/transform.js';

async function createServer(config) {
    config.root = path.resolve('./', config.root);
    console.dir(config, { depth: 10 });

    const { plugins } = config;
    const middlewares = connect();
    const httpServer = http.createServer(middlewares);
    const container = await createPluginContainer(config);
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

    
    // 主要的处理逻辑都在这个中间件执行
    middlewares.use(transformMiddleware(server));

    // 处理 req.url 中的 base
    middlewares.use(baseMiddleware(server));

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
            ;
        },

        async load(id) {
            ;
        },

        async transform(code, id) {
            ;
        },
    };
}

class ModuleGraph {}

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
