<template>
    <div id="autoCode">
        <el-row :gutter="30">
            <el-image
                style="height: 10em; width: 25em; border: 2px solid #333333; border-radius: 10px"
                fit="cover"
                src="/效果图.png"
            />
        </el-row>
        <el-row :gutter="30">
            <el-card style="max-width: 40em">
                <p v-for="(k, i) in tipsArr" :key="k" class="text item">{{ i + 1 + ". " + k }}</p>
            </el-card>
        </el-row>
        <el-row :gutter="30">
            <el-button
                v-loading.fullscreen.lock="fullscreenLoading"
                type="primary"
                @click="onAutoCode"
                size="large"
                color="#1456f0"
            >
                开始编码
            </el-button>
            <el-button
                v-loading.fullscreen.lock="fullscreenLoading"
                type="primary"
                @click="onAutoCopy"
                size="large"
                color="#1456f0"
            >
                复制选中记录
            </el-button>
        </el-row>
    </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { MCopy } from "../object/MCopy";
import { MAutoCode } from "../object/MAutoCode";

const fullscreenLoading = ref(false);

let tipsArr = [
    "本工具自动完成多层级记录的顺序编码;",
    "需要有一列名为“层级编码”的文本字段;",
    "工具自动完成子记录的顺序编码,如:1.1.1.1。",
    "工具可以根据选择的层级记录，自动复制记录",
];

const onAutoCode = async () => {
    //开始Loading
    fullscreenLoading.value = true;

    let autoCode: MAutoCode = new MAutoCode();
    await autoCode.action();

    //结束loading
    fullscreenLoading.value = false;
};

const onAutoCopy = async () => {
    //开始Loading
    fullscreenLoading.value = true;

    let copy: MCopy = new MCopy();
    await copy.action();

    //结束loading
    fullscreenLoading.value = false;
};
</script>

<style scoped>
.el-row {
    margin-bottom: 20px;
}
</style>
