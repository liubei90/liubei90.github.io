/*
 * @Author: liubei
 * @Date: 2021-09-15 17:08:01
 * @LastEditTime: 2021-10-09 11:22:29
 * @Description: 
 */
import fs from 'fs';

import { cleanUrl, removeTimestampQuery, isObject, isJSRequest, isImportRequest } from '../utils.js';
import { isHTMLProxy } from '../plugins/html.js';

export function transformMiddleware(server) {
    return async function viteTransformMiddleware(req, res, next) {
        if (req.method != 'GET') {
            return next();
        }

        let url = decodeURI(removeTimestampQuery(req.url));

        if (
            isHTMLProxy(url) ||
            isJSRequest(url) ||
            isImportRequest(url)
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
    console.log('resolved id:', id);
    const file = cleanUrl(id);
    let code;

    // 执行 load 钩子
    const loadResult = await pluginContainer.load(id);

    if (loadResult == null) {
        // 没有钩子处理 load ，在此处直接读取文件内容
        code = fs.readFileSync(file, { encoding: 'utf-8' });
    } else {
        code = isObject(loadResult) ? loadResult.code : loadResult;
    }

    // 执行 transform 钩子
    const transformResult = await pluginContainer.transform(code, id);
    code = isObject(transformResult) ? transformResult.code : transformResult;

    return { code };
}
