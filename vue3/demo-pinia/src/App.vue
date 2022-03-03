<!--
 * @Author: liubei
 * @Date: 2022-03-03 16:35:11
 * @LastEditTime: 2022-03-03 16:44:22
 * @Description: 
-->
<template>
  <div>{{ appState.count }}</div>
</template>

<script setup>
    import useAppState from './store'

    const appState = useAppState()

    console.log(appState)

    const appState2 = useAppState()

    console.log(appState2)

    // 多次调用 useAppState，返回同一个 state
    console.log(appState === appState2)

    setTimeout(() => {
        appState2.add()
    }, 2000)
</script>

<style>

</style>