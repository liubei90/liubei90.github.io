/*
 * @Author: liubei
 * @Date: 2021-08-20 14:27:55
 * @LastEditTime: 2021-08-20 14:37:43
 * @Description: 
 */
import formatDate from './formatDate';

const start = new Date('1977-01-01 00:00:00').getTime();
const end = new Date().getTime();

export default class RandomDate {
    constructor() {}

    toString() {
        return formatDate(new Date(Math.random() * (end - start)));
    }
}