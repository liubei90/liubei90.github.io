/*
 * @Author: liubei
 * @Date: 2021-09-15 17:08:01
 * @LastEditTime: 2021-09-16 17:26:11
 * @Description: 
 */

import { cleanUrl, removeTimestampQuery, isObject } from '../utils.js';
import { isHTMLProxy } from '../plugins/html.js';

export function transformMiddleware(server) {
    return async function viteTransformMiddleware(req, res, next) {
        if (req.method != 'GET') {
            return next();
        }

        let url = decodeURI(removeTimestampQuery(req.url));

        if (
            isHTMLProxy(url)
        ) {
            const result = await transformRequest(url, server);

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/javascript');
            return res.end(result.code);
        }

        next();
    };
}


async function transformRequest(url, server) {
    const { config, pluginContainer, moduleGraph } = server;
    const { root } = config;

    // 执行 resolveId 钩子
    const resolved = await pluginContainer.resolveId(url);
    const id = resolved && resolved.id || url;
    const file = cleanUrl(id);

    // 执行 load 钩子
    const loadResult = await pluginContainer.load(id);
    let code = isObject(loadResult) ? loadResult.code : loadResult;

    // 执行 transform 钩子
    const transformResult = await pluginContainer.transform(code, id);
    code = isObject(transformResult) ? transformResult.code : transformResult;

    return { code };
}
