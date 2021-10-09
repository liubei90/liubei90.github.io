/*
 * @Author: liubei
 * @Date: 2021-10-09 08:54:16
 * @LastEditTime: 2021-10-09 11:35:42
 * @Description: 
 */
import path from 'path';
import fs from 'fs';

import { cleanUrl, normalizePath } from '../utils.js';
import { DEFAULT_ASSETS_RE, FS_PREFIX } from '../constants.js';

const rawRE = /(\?|&)raw(?:&|$)/
const urlRE = /(\?|&)url(?:&|$)/


export function assetPlugin(config) {
    return {
        name: 'vite:asset',
        async load(id) {
            // 处理 raw 标识，将文件内容作为纯文本导出
            if (rawRE.test(id)) {
                const file = checkPublicFile(id, config) || cleanUrl(id);

                return `export default ${JSON.stringify(fs.readFileSync(file, { encoding: 'utf-8' }))}`;
            };

            // 处理资源类型文件和 url 标识，将文件路径导出
            if (!DEFAULT_ASSETS_RE.test(id) && !urlRE.test(id)) return;

            const url = await fileToUrl(cleanUrl(id), config);

            return `export default ${JSON.stringify(url)}`;
        }
    }
}

export function checkPublicFile(url, { publicDir }) {
    if (!publicDir || !url.startsWith('/')) return;

    const publicFile = path.join(publicDir, cleanUrl(url));

    if (fs.existsSync(publicFile)) {
        return publicFile;
    }
}

export function fileToUrl(id, config) {
    let rtn;

    if (checkPublicFile(id, config)) {
        // 在 publicDir 文件夹内，保持原样
        rtn = id;
    } else if (id.startsWith(config.root)) {
        // 在项目根目录下，转换为绝对路径
        rtn = '\\' + path.relative(config.root, id);
    } else {
        // 其它情况，都默认为在项目根目录之外，转换为 fs path
        rtn = path.join(FS_PREFIX + id);
    }

    rtn = normalizePath(rtn);

    // 拼接上 base
    return config.base + rtn.replace(/^\//, '');
}
