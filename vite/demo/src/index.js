/*
 * @Author: liubei
 * @Date: 2021-08-19 16:46:46
 * @LastEditTime: 2021-08-22 16:31:38
 * @Description: 
 */

// 转换后 import { fetchArticles, fetchArticleById } from '/src/api/article.js';

// build构建后 import { f as fetchArticles } from "./article.ab7e3d6e.js";

// 使用@vitejs/plugin-legacy构建后
// 通过systemjs注册和导入

import { fetchArticles, fetchArticleById } from './api/article.js';

// build构建后 var plaidImgUrl = "/assets/plaid.10559d73.svg";
// 在html中引入相同的图片，构建后的资源url相同
import plaidImgUrl from './assets/plaid.svg';

// console.log(plaidImgUrl);


document.addEventListener('DOMContentLoaded', function() {
    pageInit();
});

/**
 * 页面初始化
 */
function pageInit(newModule) {
    const app = document.querySelector('#app');

    (newModule && newModule.fetchArticles || fetchArticles)().then(artList => {
        const artUl = document.createElement('ul');

        artList.forEach(art => {
            artUl.appendChild(createArticleItem(art));
        });

        app.innerHTML = '';
        app.appendChild(artUl);
    });

    const plaidImg = document.getElementById('plaid-img');

    // plaidImg.src = plaidImgUrl;
    plaidImg.src = new URL('./assets/plaid.svg', import.meta.url);

}

function createArticleItem(art) {
    const liElm = document.createElement('li');
    const aElm = document.createElement('a');

    aElm.href = './article.html?id=' + art['id'];
    aElm.textContent = art['title'];
    liElm.appendChild(aElm);

    return liElm;
}

// hmr：修改index.js， 会触发一个 {type: "full-reload"} 事件，导致整个页面被刷新
// hmr：加入hmr代码后，修改index.js，ws会接受到如下事件
// {"type":"update","updates":[{"type":"js-update","timestamp":1629619057925,"path":"/src/index.js","acceptedPath":"/src/index.js"}]}

if (import.meta.hot) {
    // import.meta.hot.accept('./api/article.js', pageInit);
    // import.meta.hot.decline();
}
