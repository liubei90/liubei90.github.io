/*
 * @Author: liubei
 * @Date: 2021-08-24 11:08:45
 * @LastEditTime: 2021-08-24 18:33:02
 * @Description: 
 */
// const reactivity = require('@vue/reactivity');

import * as reactivity from '@vue/reactivity';

// console.log(reactivity);

// 响应式对象
(function() {
    const orgState = {
        count: 1,
        nest: {
            desc: 'hello, nest',
        },
    };
    const state = reactivity.reactive(orgState);

    console.dir(orgState); // Object
    console.dir(state); // Proxy
    console.dir(state.nest); // Proxy

    reactivity.effect(function() {
        console.log(state.count);
        // 嵌套的对象也是响应式对象
        console.log(state.nest.desc);
    });

    console.log('state.count++');
    state.count++;

    console.log('state.nest.desc = "hahaha"');
    state.nest.desc = 'hahaha';
});

// 响应式值
(function() {
    const count = reactivity.ref(0);

    // console.log(count); // RefImpl {_shallow: false, dep: undefined, __v_isRef: true, _rawValue: 0, _value: 0}

    reactivity.effect(function() {
        // ref 对象是一个响应式对象，监听的属性是 value
        console.log(count.value);
    });

    console.log('count.value++');
    count.value++;
});

// 响应式数组
(function() {
    const arr = reactivity.reactive([1, 2, 3]);

    console.dir(arr);

    reactivity.effect(function() {
        // 由于只获取了特定索引上的值，只能监听该索引的改变
        console.log(arr[0]);
    });

    console.log('arr.push(4)');
    // 不会触发 effect 函数
    arr.push(4);

    console.log("arr[0] = 'hello, arr'");
    // 触发 effect 函数执行
    arr[0] = 'hello, arr';

    const arr2 = reactivity.reactive({
        list: [1, 2, 3],
    });

    reactivity.effect(function() {
        // 追踪 list 属性
        console.log(arr2.list);
    });

    console.log('arr2.list.push(4)');
    // effect 函数追踪的是 list 属性，向数组里添加元素不会触发 effect 的执行
    arr2.list.push(4);

    console.log('arr2.list = [222]');
    // 修改 list 属性的值，会触发 effect 的执行
    arr2.list = [222];

    const arr3 = reactivity.reactive([1, 2, 3]);

    reactivity.effect(function() {
        // 追踪数组的 length 属性
        console.log(arr3.length);

        // 对数组执行 ... 操作，可以追踪数组的元素个数变化
        // const narr = [...arr3];

        // console.log(narr);
    });

    console.log('arr3.push(4)');
    arr3.push(4);

    console.log('arr3[0] = 233');
    // effect 中没有追踪索引 0，修改索引 0 的值不会触发 effect 的执行
    arr3[0] = 233;
});

// computed
(function() {
    const state = reactivity.reactive({
        count: 1,
    });
    const countPlus1 = reactivity.computed(function() {
        console.log('computed');
        return state.count + 1;
    });

    console.log(countPlus1); // ComputedRefImpl {dep: undefined, _dirty: true, __v_isRef: true, effect: ReactiveEffect, _setter: ƒ, …}
    console.log(countPlus1.value); // 2
    console.log('state.count++');
    state.count++
    console.log('tttt');
    // computed 是懒加载的，只有在获取值的时候才执行副作用函数
    console.log(countPlus1.value); // 3
});

// watch
// watch 相关函数在 runtime-core 中被定义

// effect
(function() {
    const state = reactivity.reactive({ count: 1, });
    const runner = reactivity.effect(function() {
        console.log(state.count);
    }, {
        lazy: true
    });

    console.log('state.count++');
    state.count++;

    // run 用来执行 fn，启动追踪
    console.log('runner()');
    runner();
    console.log('state.count++');
    state.count++;

    console.log('stop(runner)');
    reactivity.stop(runner);
    console.log('state.count++');
    state.count++;

    // stop 后，内部的 active 属性置为 false, run 只有执行 fn 的能力，不能再次启动追踪
    console.log('runner()');
    runner();
    console.log('state.count++');
    state.count++;
})();

// ReactiveEffect
// effect 的基础
(function() {
    const state = reactivity.reactive({ count: 1, });
    const re = new reactivity.ReactiveEffect(function() {
        console.log(state.count);
    });

    console.log(re);

    console.log('re.run()');
    re.run(); // 1 会执行一次 fn 函数，并追踪 fn 中使用到的响应式对象

    console.log('state.count++');
    state.count++; // 2

    console.log('re.stop()');
    re.stop(); // 停止追踪 fn
    console.log('state.count++');
    state.count++; // 无输出

    console.log('re.run()');
    re.run(); // 3 执行 fn 函数， 但不会再次追踪 fn

    console.log('state.count++');
    state.count++; // 无输出
});

// isRef isProxy isReactive isReadonly
(function() {
    const state = reactivity.reactive({ count: 1 });

    // console.log(reactivity.isRef(state)); // false
    // console.log(reactivity.isProxy(state)); // true
    // console.log(reactivity.isReactive(state)); // true
    // console.log(reactivity.isReadonly(state)); // false

    // console.log(reactivity.isRef(state.count)); // false
    // console.log(reactivity.isProxy(state.count)); // false
    // console.log(reactivity.isReactive(state.count)); // false
    // console.log(reactivity.isReadonly(state.count)); // false

    const stateRefs = reactivity.toRefs(state);

    console.log(reactivity.isReactive(stateRefs)); // false
    console.log(reactivity.isRef(stateRefs.count)); // true


    // const r1 = reactivity.ref(0);
    // console.log(reactivity.isRef(r1)); // true
    // console.log(reactivity.isProxy(r1)); // false
    // console.log(reactivity.isReactive(r1)); // false
    // console.log(reactivity.isReadonly(r1)); // false


    // const c1 = reactivity.computed(function() {});

    // console.log(reactivity.isRef(c1)); // true
    // console.log(reactivity.isProxy(c1)); // true
    // console.log(reactivity.isReactive(c1)); // false
    // console.log(reactivity.isReadonly(c1)); // true


    // const c2 = reactivity.computed({
    //     get: function() {},
    //     set: function() {},
    // });

    // console.log(reactivity.isRef(c2)); // true
    // console.log(reactivity.isProxy(c2)); // false
    // console.log(reactivity.isReactive(c2)); // false
    // console.log(reactivity.isReadonly(c2)); // false
});
