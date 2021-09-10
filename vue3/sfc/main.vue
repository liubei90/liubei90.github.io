<template>
    <div class="main">hello, {{ world }}</div>
</template>

<script>
import { ref } from 'vue';

export default {
    setup(props) {
        let world = ref('world')

        setTimeout(function() {
            world.value = 'vue';
        }, 1000);

        return { world: world };
    },
}
</script>

<style scoped>
.main {
    border: 1px solid black;
}
</style>
