/*
 * @Author: liubei
 * @Date: 2021-09-14 18:15:00
 * @LastEditTime: 2021-09-14 18:43:48
 * @Description: 
 */
import connect from 'connect';
import http from 'http';

async function createServer(config) {
    const middlewares = connect();
    const httpServer = http.createServer(middlewares);
    const container = await createPluginContainer(config);
    const moduleGraph = new ModuleGraph(container);

    middlewares.use(function(req, res, next) {
        res.end('hello, world');

        return next();
    });

    const server = {
        config,
        httpServer,
        pluginContainer: container,
        moduleGraph,
        listen(port = 8090) {
            return startServer(server, port);
        },
    }

    return server;
}

function startServer(server, port) {
    const httpServer = server.httpServer;

    return new Promise(function(resolve, reject) {
        httpServer.on('error', reject)
    
        httpServer.listen(port, () => {
            console.log('http://localhost:' + port);
          httpServer.removeListener('error', reject)
          resolve()
        })
    });

}

async function createPluginContainer() {
    return {};
}

class ModuleGraph {}

(async function () {
    const server = await createServer();

    await server.listen();
})();
