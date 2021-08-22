import { f as fetchArticles } from "./article.ab7e3d6e.js";
var index = ".plaid-bk-in-css-file {\r\n    width: 164px;\r\n    height: 36px;\r\n    /* \u5F00\u53D1\u65F6 background-image: url('/src/assets/plaid.svg'); */\r\n    /* build \u6784\u5EFA\u540E background-image: url('/assets/plaid.10559d73.svg'); */\r\n    /* \u8BF4\u660EVite\u4F1A\u5904\u7406css\u6587\u4EF6\u4E2D\u7684url\u5BFC\u5165 */\r\n    background-image: url('__VITE_ASSET__10559d73__');\r\n}";
document.addEventListener("DOMContentLoaded", function() {
  pageInit();
});
function pageInit() {
  const app = document.querySelector("#app");
  fetchArticles().then((artList) => {
    const artUl = document.createElement("ul");
    artList.forEach((art) => {
      artUl.appendChild(createArticleItem(art));
    });
    app.innerHTML = "";
    app.appendChild(artUl);
  });
  const plaidImg = document.getElementById("plaid-img");
  plaidImg.src = new URL("/foo/assets/plaid.10559d73.svg", window.location);
}
function createArticleItem(art) {
  const liElm = document.createElement("li");
  const aElm = document.createElement("a");
  aElm.href = "./article.html?id=" + art["id"];
  aElm.textContent = art["title"];
  liElm.appendChild(aElm);
  return liElm;
}
