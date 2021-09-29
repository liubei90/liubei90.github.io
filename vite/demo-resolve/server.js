/*
 * @Author: liubei
 * @Date: 2021-09-27 09:33:55
 * @LastEditTime: 2021-09-27 18:26:51
 * @Description: 
 */

import path from 'path';
import connect from 'connect';
import http from 'http';
import fs from 'fs';
import sirv from 'sirv';
import { init, parse as parseImports } from 'es-module-lexer';
import resolve from 'resolve';
import MagicString from 'magic-string';


function serveStaticMiddleware( dir ) {
    const serve = sirv(dir, {})

    return function viteServeStaticMiddleware(req, res, next) {
        // 将其它请求当作静态文件处理
        serve(req, res, next);
    }
}

/**
 * 
 * @returns 
 */
function serveJsMiddleware(root) {
    return async function jsMiddleware(req, res, next) {
        if (path.extname(req.url) !== '.js') {
            return next();
        }

        // 读取 js 文件
        const url = req.url;
        const file = path.resolve(root, url.startsWith('/') ? url.slice(1) : url);
        const code = fs.readFileSync(file, 'utf-8');
        const s = new MagicString(code);

        // 解析 js 文件中的 import
        await init;
        const imports = parseImports(code)[0];
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

            const bareImportRE = /^[\w@](?!.*:\/\/)/
    
            // 裸导入
            if (bareImportRE.test(specifier)) {
                const resolvedSrc = resolve.sync(specifier, {
                    basedir: path.dirname(file),
                    packageFilter: function packageFilter(pkg) {
                        if (pkg.module) {
                            pkg.main = pkg.module;
                            delete pkg.module;
                        }
                        return pkg;
                    }
                });
                console.log(resolvedSrc);

                if (resolvedSrc.startsWith(root)) {
                    let specifierUrl = resolvedSrc.slice(root.length);
                    // 兼容 window 系统的路径格式
                    specifierUrl = specifierUrl.replace(/\\/g, '/');
                    s.overwrite(start, end, specifierUrl);
                }
            }


        }

        res.setHeader('Content-Type', 'application/javascript');
        res.statusCode = 200;
        res.end(s.toString());
    }
}


(function startServer() {
    // 请求中间件
    const middlewares = connect();
    // 开发服务器
    const httpServer = http.createServer(middlewares);
    const port = 3000;
    const root = path.resolve('./');

    console.log(root);

    // 拦截 js 请求
    middlewares.use(serveJsMiddleware(root));

    // 静态文件
    middlewares.use(serveStaticMiddleware(root));

    httpServer.on('error', (err) => {
        console.error(err);
    });

    httpServer.listen(port, () => {
        console.log('http://localhost:' + port);
    });
})();

