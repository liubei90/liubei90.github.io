/*
 * @Author: liubei
 * @Date: 2021-09-17 17:05:11
 * @LastEditTime: 2021-09-17 17:22:53
 * @Description: 
 */
import { init, parse as parseImports } from 'es-module-lexer'

export function importAnalysisPlugin(config) {
    let server;

    return {
        name: 'vite:import-analysis',

        configureServer(_server) {
            server = _server;
        },

        async transform(source, importer, ssr) {
            const imports = parseImports(source);

            console.log(imports);

            return source;
        },
    }
}