# proxy

## getPrototypeOf

- Object.getPrototypeOf
- Reflect.getPrototypeOf

## setPrototypeOf

- Object.setPrototypeOf
- Reflect.setPrototypeOf

## isExtensible

- Object.isExtensible
- Reflect.isExtensible

## preventExtensions

- Object.preventExtensions
- Reflect.preventExtensions

## getOwnPropertyDescriptor

- Object.getOwnPropertyDescriptor
- Reflect.getOwnPropertyDescriptor
- =操作符
    =操作符会触发set，内部会触发getOwnPropertyDescriptor，用来判断属性是否可写

## defineProperty

- Object.defineProperty
- Reflect.defineProperty
- =操作符
    =操作符会触发set，内部会触发getOwnPropertyDescriptor，再触发defineProperty，更新设置属性值

## has
- in 操作 （'count' in pro）
- 原型链上的in操作
- Reflect.has

## get

- .操作 （pro.count）
- []操作 （pro['count']）
- Reflect.get

## set

- =操作
- Reflect.set

## deleteProperty

- delete操作
- Reflect.deleteProperty

## ownKeys

- Object.getOwnPropertyNames
- Object.getOwnPropertySymbols
- Reflect.ownKeys
- Object.keys
    该方法在触发ownKeys后，还会触发getOwnPropertyDescriptor，用来过滤掉enumerable为false的属性

## apply

- func()
- func.apply()
- func.call()

## construct

- new 操作
    会触发get, 获取func的prototype对象，用来关联原型链。之后触发construct。


[例子](./proxy_demo.html)