/*
 * @Author: liubei
 * @Date: 2021-08-20 14:35:59
 * @LastEditTime: 2021-08-20 14:40:53
 * @Description:
 */
export default function (date, fmt) {
  //author: meizz
  var me = this;
  if (!date) {
    date = new Date();
  }
  date = new Date(date); //可以将字符串，long型的日期转为Date
  if (!fmt) {
    fmt = "yyyy-MM-dd hh:mm:ss";
  }
  var o = {
    "M+": date.getMonth() + 1, //月份
    "Y+": date.getMonth() + 1, //月份
    "d+": date.getDate(), //日
    "h+": date.getHours(), //小时
    "H+": date.getHours(), //小时
    "m+": date.getMinutes(), //分
    "s+": date.getSeconds(), //秒
    "q+": Math.floor((date.getMonth() + 3) / 3), //季度
    S: date.getMilliseconds(), //毫秒
  };
  if (/(y+)/.test(fmt))
    fmt = fmt.replace(
      RegExp.$1,
      (date.getFullYear() + "").substr(4 - RegExp.$1.length)
    );
  for (var k in o)
    if (new RegExp("(" + k + ")").test(fmt))
      fmt = fmt.replace(
        RegExp.$1,
        RegExp.$1.length == 1 ? o[k] : ("00" + o[k]).substr(("" + o[k]).length)
      );
  return fmt;
}
