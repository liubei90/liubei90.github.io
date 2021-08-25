<!--
 * @Author: liubei
 * @Date: 2021-08-24 09:45:11
 * @LastEditTime: 2021-08-24 09:55:44
 * @Description: 
-->
# 获取 URL Scheme
1. urlscheme.generate POST https://api.weixin.qq.com/wxa/generatescheme?access_token=ACCESS_TOKEN
2. 小程序管理后台，工具

示例： weixin://dl/business/?t=XfQsRmWDTDj

# URL Scheme 类型
1. 短期有效Scheme
2. 长期有效Scheme

# URL Scheme 使用限制
1. 单个小程序每日生成 Scheme 上限为50万个（包含短期有效 Scheme 与长期有效 Scheme）
2. 有效时间超过31天的 Scheme 或永久有效的 Scheme 为长期有效Scheme，单个小程序总共可生成长期有效 Scheme 上限为10万个，请谨慎调用
3. 安卓短信不能识别 Scheme， 需要借助浏览器打开
4. ios可以识别 Scheme
