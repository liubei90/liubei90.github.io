/*
 * @Author: liubei
 * @Date: 2021-09-15 17:26:48
 * @LastEditTime: 2021-09-22 09:56:24
 * @Description: 
 */
import path from 'path';
import fs from 'fs';
import MagicString from 'magic-string';
import { parse, transform } from '@vue/compiler-dom';
import { FS_PREFIX } from '../constants.js';
import { cleanUrl } from '../utils.js';

export const assetAttrsConfig = {
    link: ['href'],
    video: ['src', 'poster'],
    source: ['src', 'srcset'],
    img: ['src', 'srcset'],
    image: ['xlink:href', 'href'],
    use: ['xlink:href', 'href']
};

function getScriptInfo(node) {
    let src
    let isModule = false
    for (let i = 0; i < node.props.length; i++) {
        const p = node.props[i]
        if (p.type === 6) {
            if (p.name === 'src') {
                src = p
            } else if (p.name === 'type' && p.value && p.value.content === 'module') {
                isModule = true
            }
        }
    }
    return { src, isModule }
}

function processNodeUrl(node, s, config) {
    const { base = '/' } = config;
    const startsWithSingleSlashRE = /^\/(?!\/)/
    const url = node.value.content || '';

    if (startsWithSingleSlashRE.test(url)) {
        s.overwrite(
            node.value.loc.start.offset,
            node.value.loc.end.offset,
            `"${base + url.slice(1)}"`,
        );
    }
}

function traverseHtml(html, filePath, visitor) {
    html = html.replace(/<!doctype\s/i, '<!DOCTYPE ');
    const ast = parse(html, { comments: true });

    transform(ast, {
        nodeTransforms: [visitor]
    });
}

async function devHtmlHook(html, { path: htmlPath, server, originalUrl }) {
    const { config = {} } = server;
    const { base = '/' } = config;
    const s = new MagicString(html);
    let scriptModuleIndex = -1;

    traverseHtml(html, htmlPath, function (node) {
        if (node.type !== 1) {
            return;
        }

        if (node.tag === 'script') {
            const { src, isModule } = getScriptInfo(node);

            if (isModule) {
                scriptModuleIndex++;
            }

            if (src) {
                // 处理脚本的 src，加上 base 前缀
                processNodeUrl(src, s, config);
            } else if (isModule) {
                // 处理内联脚本，转为 html-proxy
                s.overwrite(
                    node.loc.start.offset,
                    node.loc.end.offset,
                    `<script type="module" src="${base + htmlPath.slice(1)
                    }?html-proxy&index=${scriptModuleIndex}.js"></script>`
                )
            }
        }

        // 处理资源 url， 加上 base 前缀
        const assetAttrs = assetAttrsConfig[node.tag];

        if (assetAttrs) {
            for (const p of node.props) {
                if (p.type == 6 &&
                    p.value &&
                    assetAttrs.includes(p.name)) {
                    processNodeUrl(p, s, config);
                }
            }
        }
    });

    html = s.toString();

    return html;
}

function getHtmlFilename(url, server) {
    return path.join(server.config.root, url.slice(1))
}

export function indexHtmlMiddleware(server) {
    const { config } = server;

    return async function viteIndexHtmlMiddleware(req, res, next) {
        const url = req.url && cleanUrl(req.url);

        if (url.endsWith('.html') && req.headers['sec-fetch-dest'] !== 'script') {
            const filename = getHtmlFilename(url, server);

            if (fs.existsSync(filename)) {
                let html = fs.readFileSync(filename, 'utf-8');

                html = await devHtmlHook(html, { path: url, server, originalUrl: req.originalUrl });

                res.statusCode = 200;
                return res.end(html);
            }
        }

        next();
    }
}