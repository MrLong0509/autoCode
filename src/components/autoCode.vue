<template>
    <div id="autoCode">
        <div class="Renderings"></div>
    </div>
</template>

<script setup lang="ts">
import { bitable, UIBuilder } from "@lark-base-open/js-sdk";
import { onMounted } from "vue";
import callback from "./runUIBuilder";

onMounted(async () => {
    const translation = {
        i18n: {
            language: "en",
        },
    };
    new UIBuilder(document.querySelector("#autoCode") as HTMLElement, {
        bitable,
        callback,
        translation,
    });
});
</script>

<style scoped>
.Renderings {
    background-image: url("/public/效果图.png");
    background-size: cover; /* 背景图的适应方式 */
    height: 12em; /* 设置div的高度以展示背景图 */
    width: 100%; /* 设置div的宽度以适应屏幕 */
    border: 2px solid #333333; /* 设置边框样式 */
    border-radius: 10px; /* 设置圆角边框 */
    margin-bottom: 1em;
}
</style>
