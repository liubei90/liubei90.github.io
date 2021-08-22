/*
 * @Author: liubei
 * @Date: 2021-08-21 19:09:47
 * @LastEditTime: 2021-08-21 20:33:02
 * @Description: 
 */

import * as qs from 'qs';
import { add } from './utils.js';

import Worker from './work.js?worker';

import imgsrc from '../src/assets/plaid.svg';

console.log(imgsrc); // /src/assets/plaid.svg

const imgsrc2 = new URL('../src/assets/plaid.svg', import.meta.url);

console.log(imgsrc2); // URL { href: "http://localhost:3000/src/assets/plaid.svg" }

console.log(add(1, 2));

const w = new Worker();



document.addEventListener('DOMContentLoaded', function() {
    var img = document.getElementById('import-img');

    img.src = imgsrc2;
});


import txtraw from './content.txt?raw';

console.log(txtraw); // 这是一段纯文本

import user from './user.json';

console.log(user); // {name: "小小程序员"}

import { name } from './user.json';

console.log(name); // 小小程序员

import asyncUrl from './async_demo.js?url';

console.log(asyncUrl); // /importassets/async_demo.js

if (true) {
    
    import(/* @vite-ignore */asyncUrl).then(m => {
        console.log(m) // Module {Symbol(Symbol.toStringTag): "Module"}
    });
}


console.log(import.meta.env.BASE_URL); // /foo/
