/*
 * @Author: liubei
 * @Date: 2021-09-15 17:08:01
 * @LastEditTime: 2021-09-15 17:47:39
 * @Description: 
 */
export function transformMiddleware(server) {
    return async function viteTransformMiddleware(req, res, next) {
        next();
    };
}