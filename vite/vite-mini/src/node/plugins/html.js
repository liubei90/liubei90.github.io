/*
 * @Author: liubei
 * @Date: 2021-09-16 17:05:59
 * @LastEditTime: 2021-09-16 17:16:47
 * @Description: 
 */
import { cleanUrl } from "../utils.js";
import fs from 'fs';

const htmlCommentRE = /<!--[\s\S]*?-->/g
const scriptModuleRE =
  /(<script\b[^>]*type\s*=\s*(?:"module"|'module')[^>]*>)(.*?)<\/script>/gims

const htmlProxyRE = /\?html-proxy&index=(\d+)\.js$/;
export const isHTMLProxy = (id) => htmlProxyRE.test(id);

export function htmlInlineScriptProxyPlugin() {
    return {
        name: 'vite:html',

        resolveId(id) {
            if (isHTMLProxy(id)) {
                return id;
            }
        },

        load(id) {
            const proxyMatch = id.match(htmlProxyRE);

            if (proxyMatch) {
                const index = proxyMatch[1];
                const file = cleanUrl(id);
                const html = fs.readFileSync(file, 'utf-8').replace(htmlCommentRE, '');

                let match;
                scriptModuleRE.lastIndex = 0

                for (let i = 0; i <= index; i++) {
                    match = scriptModuleRE.exec(html);
                }

                if (match) {
                    return match[2];
                } else {
                    throw new Error();
                }
            }
        },
    };
}