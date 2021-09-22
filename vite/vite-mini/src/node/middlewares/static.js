/*
 * @Author: liubei
 * @Date: 2021-09-22 10:19:00
 * @LastEditTime: 2021-09-22 10:52:17
 * @Description: 
 */

import path from 'path';
import sirv from 'sirv';

import { cleanUrl } from '../utils.js';

export function serveStaticMiddleware( dir, config, ) {
    const serve = sirv(dir, {
        dev: true,
        etag: true,
        extensions: [],
        setHeaders(res, pathname) {
          if (/\.[tj]sx?$/.test(pathname)) {
            res.setHeader('Content-Type', 'application/javascript')
          }
        }
      })

    return function viteServeStaticMiddleware(req, res, next) {
        // 不处理 html 请求
        if (path.extname(cleanUrl(req.url)) == '.html') {
            return next();
        };

        // 将其它请求当作静态文件处理
        serve(req, res, next);
    }
}