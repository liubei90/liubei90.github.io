const p = function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload")
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  function getFetchOpts(script) {
    const fetchOpts = {};
    if (script.integrity)
      fetchOpts.integrity = script.integrity;
    if (script.referrerpolicy)
      fetchOpts.referrerPolicy = script.referrerpolicy;
    if (script.crossorigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (script.crossorigin === "anonymous")
      fetchOpts.credentials = "omit";
    else
      fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep)
      return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
};
p();
const articleList = [
  { id: 1, title: "\u5C06\u5927\u8C61\u88C5\u8FDB\u51B0\u7BB1\uFF0C\u603B\u5171\u5206\u51E0\u6B65\uFF1F", content: "# \u5C06\u5927\u8C61\u88C5\u8FDB\u51B0\u7BB1\u7684\u6B65\u9AA4\n1. \u6253\u5F00\u51B0\u7BB1\u95E8\n2. \u5C06\u5927\u8C61\u585E\u8FDB\u51B0\u7BB1\n3. \u5173\u4E0A\u51B0\u7BB1\u95E8\n" }
];
async function fetchArticles() {
  return Promise.resolve(articleList);
}
async function fetchArticleById(id) {
  const article = articleList.filter((item) => item["id"] == id)[0];
  return article && Promise.resolve(article) || Promise.reject();
}
export { fetchArticleById as a, fetchArticles as f };
