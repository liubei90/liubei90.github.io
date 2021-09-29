/*
 * @Author: liubei
 * @Date: 2021-09-27 11:08:54
 * @LastEditTime: 2021-09-27 11:30:40
 * @Description: 
 */
import path from 'path';
import fs from 'fs';
import { init, parse as parseImports } from 'es-module-lexer';
import resolve from 'resolve';

async function test() {
    const url = path.resolve('./example/demo.js');
    const code = fs.readFileSync(url, { encoding: 'utf-8' });

    console.log(url);
    console.log(code);

    // 解析 import
    await init;

    const imports = parseImports(code)[0];

    // [ { n: 'marked', s: 138, e: 144, ss: 118, se: 145, d: -1, a: -1 } ]
    console.log(imports);

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

        const rawUrl = code.slice(start, end)

        console.log(rawUrl);
        console.log(specifier);

        const bareImportRE = /^[\w@](?!.*:\/\/)/

        // 裸导入
        if (bareImportRE.test(specifier)) {
            const resolvedSrc = resolve.sync(specifier, path.dirname(url));
            console.log(resolvedSrc);
        }
    }
}

test();
