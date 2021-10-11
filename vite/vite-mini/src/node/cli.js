/*
 * @Author: liubei
 * @Date: 2021-09-14 18:15:00
 * @LastEditTime: 2021-10-11 09:12:58
 * @Description: 
 */
import path from 'path';
import connect from 'connect';
import http from 'http';

import { CLIENT_ENTRY } from './constants.js';

import { createPluginContainer } from './pluginContainer.js';
import { baseMiddleware } from './middlewares/base.js';
import { serveStaticMiddleware, servePublicMiddleware } from './middlewares/static.js';
import { indexHtmlMiddleware } from './middlewares/indexHtml.js';
import { transformMiddleware } from './middlewares/transform.js';

import aliasPlugin from '@rollup/plugin-alias';
import { htmlInlineScriptProxyPlugin } from './plugins/html.js';
import { resolvePlugin } from './plugins/resolve.js';
import { importAnalysisPlugin } from './plugins/importAnalysis.js';
import { assetPlugin } from './plugins/assets.js';
import { cssPlugin, cssPostPlugin } from './plugins/css.js';
import { esbuildPlugin } from './plugins/esbuild.js';

async function createServer(config) {
    config.root = path.resolve('./', config.root);
    config.plugins = [
        // alias 插件
        aliasPlugin({
            entries: [
                { find: /^[\/]?@vite\/client/, replacement: () => CLIENT_ENTRY },
                { find: '/@', replacement: path.resolve(config.root, 'example') },
            ]
        }),
        resolvePlugin(config),
        htmlInlineScriptProxyPlugin(),
        assetPlugin(config),
        esbuildPlugin(config),
        importAnalysisPlugin(config),
        cssPlugin(config),
        cssPostPlugin(config),
        ...config.plugins,
    ]
    config.publicDir && (config.publicDir = path.resolve(config.root, config.publicDir));

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

    // 读取 publicDir 中的内容，publicDir 中的文件会在构建时原封不动的拷贝到目标文件夹
    if (config.publicDir) {
        middlewares.use(servePublicMiddleware(config.publicDir));
    }

    // 主要的处理逻辑都在这个中间件执行
    middlewares.use(transformMiddleware(server));

    // 读取非 html 文件内容
    middlewares.use(serveStaticMiddleware(config.root, config));

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



class ModuleGraph {
    async getModuleByUrl() {}
}

(async function () {
    const server = await createServer({
        root: './',
        base: '/foo/',
        publicDir: './public',
        plugins: [],
        build: {
            rollupOptions: {}
        }
    });

    await server.listen();
})();
