/*
 * @Author: liubei
 * @Date: 2021-09-17 17:05:11
 * @LastEditTime: 2021-10-09 11:16:06
 * @Description: 
 */
import path from 'path';

import { init, parse as parseImports } from 'es-module-lexer';
import MagicString from 'magic-string';

import { isJSRequest, isCSSRequest, injectQuery } from '../utils.js';


export function importAnalysisPlugin(config) {
    const { root } = config;
    let server;

    return {
        name: 'vite:import-analysis',

        configureServer(_server) {
            server = _server;
        },

        async transform(source, importer) {
            await init;

            const s = new MagicString(source);
            const imports = parseImports(source)[0];

            for (let i = 0; i < imports.length; i++) {
                // 拿到导入模块信息
                const {
                    s: start,
                    e: end,
                    ss: expStart,
                    se: expEnd,
                    d: dynamicIndex,
                    n: specifier
                } = imports[i];

                const resolvedRes = await this.resolve(specifier, importer);

                if (!resolvedRes || !resolvedRes.id) continue;

                let url = resolvedRes.id;
                let normalizedUrl;

                if (resolvedRes.id.startsWith(root)) {
                    url = resolvedRes.id.slice(root.length);
                    // 兼容 window 系统的路径格式
                    url = url.replace(/\\/g, '/');
                }

                // 对非 js/css 导入增加 import 标识
                if (!isJSRequest(url) && !isCSSRequest(url)) {
                    url = injectQuery(url, 'import');
                }

                s.overwrite(start, end, url);
            }

            return s.toString();
        },
    }
}