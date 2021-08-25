/*
 * @Author: liubei
 * @Date: 2021-08-20 10:53:15
 * @LastEditTime: 2021-08-22 17:14:10
 * @Description: 
 */

const articleList = [
    { id: 1, title: '将大象装进冰箱，总共分几步？', content: '# 将大象装进冰箱的步骤\n1. 打开冰箱门\n2. 将大象塞进冰箱\n3. 关上冰箱门\n' },
    { id: 2, title: '将大象装进冰箱，总共分几步？', content: '# 将大象装进冰箱的步骤\n1. 打开冰箱门\n2. 将大象塞进冰箱\n3. 关上冰箱门\n' },
]

/**
 * 获取文章列表
 */
export async function fetchArticles() {
    return Promise.resolve(articleList);
}

/**
 * 获取单条文章
 */
export async function fetchArticleById(id) {
    const article = articleList.filter(item => (item['id'] == id))[0];

    return article && Promise.resolve(article) || Promise.reject();
}

if (import.meta.hot) {
    // import.meta.hot.data.articleList = articleList;
    // // hmr：在hmr时，会执行旧模块的该函数，用来清除旧模块的副作用
    // // 理论上改函数执行完后，新模块才能开始加载
    // import.meta.hot.dispose((data) => {
    //   // 清理副作用
    //   console.log(data);
    // })

    // import.meta.hot.accept('./api/article.js', () => {
    //     ;
    // });

    // import.meta.hot.decline();
  }
