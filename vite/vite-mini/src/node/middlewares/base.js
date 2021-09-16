/*
 * @Author: liubei
 * @Date: 2021-09-16 14:39:11
 * @LastEditTime: 2021-09-16 14:43:04
 * @Description: 
 */
import { parse } from 'url';

export function baseMiddleware({
    config
  }) {
    const base = config.base

    return function viteBaseMiddleware(req, res, next) {
      const url = req.url;
      const parsedUrl = parse(url);
      const path = parsedUrl.pathname || '/';

      if (path.startsWith(base)) {
          req.url = url.replace(base, '/');
          return next();
      }

      if (path === '/' || path === '/index.html') {
          res.writeHead(302, {
            Location: base
          });

          res.end();
          return next();
      }

      next();
    }
  }