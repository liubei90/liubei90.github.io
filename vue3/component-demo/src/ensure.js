/*
 * @Author: liubei
 * @Date: 2021-11-16 16:35:10
 * @LastEditTime: 2021-11-16 17:17:44
 * @Description: 
 */
const installedChunks = {}

// @ts-ignore
window.module = {}

export function requireEnsure(url) {
    if (!installedChunks[url]) installedChunks[url] = {
        status: null,
        exports: null,
    };

    var installedChunkData = installedChunks[url]

    if(installedChunkData.status === 0) {
        return new Promise(function(resolve) { resolve(installedChunkData.exports); });
    }
    // a Promise means "currently loading".
    if(installedChunkData.status) {
        return installedChunkData.status[2];
    }
    // setup Promise in chunk cache
    var promise = new Promise(function(resolve, reject) {
        installedChunkData.status = [resolve, reject];
    });
    installedChunkData.status[2] = promise;

    // start chunk loading
    var head = document.getElementsByTagName('head')[0];
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.async = true;
    // script.timeout = 120000;
    script.src = url;
    var timeout = setTimeout(onScriptError, 120000);
    script.onerror = onScriptError;
    script.onload = onScriptComplete;

    // 使用 window.exports 接收模块的导出时，不能并行加载模块，
    // 否则多个模块会共用一个 exports，导致先加载但后成功的模块获取到错误的数据数据
    window.exports = {}
    function onScriptError() {
        script.onerror = null;
        clearTimeout(timeout);

        installedChunkData.status[1](new Error('Loading chunk ' + url + ' failed.'));
        installedChunkData.status = undefined;
    }
    function onScriptComplete() {
        console.log('onload!!!')
        // avoid mem leaks in IE.
        script.onload = null;
        clearTimeout(timeout);

        installedChunkData.exports = window.exports
        installedChunkData.status[0](window.exports)
        installedChunkData.status = 0
        window.exports = {}
    };
    head.appendChild(script);
    return promise;
};

// @ts-ignore
// window.define = function winDefine(depends, factory) {
//     const exports = {}

//     factory(exports)

//     // 将 installedChunkData 中该模块的 Promise 置为 resolve
//     // vite 打包 umd 格式的模块加载后，执行 define/exports 时， 没办法定位到 installedChunkData 中该模块对应的缓存
//     // 所以使用 umd 方式动态加载是行不通的
// }

// winDefine.amd = true
