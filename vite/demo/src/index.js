/*
 * @Author: liubei
 * @Date: 2021-08-19 16:46:46
 * @LastEditTime: 2021-08-20 17:50:09
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


document.addEventListener('DOMContentLoaded', function() {
    pageInit();
});

/**
 * 页面初始化
 */
function pageInit() {
    const app = document.querySelector('#app');

    fetchArticles().then(artList => {
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
