import { a as fetchArticleById } from "./article.ab7e3d6e.js";
import { l as lib, m as marked_1 } from "./vendor.f9fdba10.js";
document.addEventListener("DOMContentLoaded", function() {
  pageInit();
});
function pageInit() {
  const queryParams = lib.parse(window.location.search.replace("?", ""));
  if (queryParams["id"]) {
    fetchArticleById(queryParams["id"]).then((art) => {
      buildApp(art);
    });
  }
}
function buildApp(art) {
  const app = document.querySelector("#app");
  const { title, content } = art;
  const head = document.createElement("h1");
  const div = document.createElement("div");
  head.textContent = title;
  div.innerHTML = marked_1(content);
  app.innerHTML = "";
  app.appendChild(head);
  app.appendChild(div);
}
