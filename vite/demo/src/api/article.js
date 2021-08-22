/*
 * @Author: liubei
 * @Date: 2021-08-20 10:53:15
 * @LastEditTime: 2021-08-20 10:59:30
 * @Description: 
 */

const articleList = [
    { id: 1, title: '将大象装进冰箱，总共分几步？', content: '# 将大象装进冰箱的步骤\n1. 打开冰箱门\n2. 将大象塞进冰箱\n3. 关上冰箱门\n' },
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
