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
            <el-card style="max-width: 40em">
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
                <el-button
                    v-loading.fullscreen.lock="fullscreenLoading"
                    type="primary"
                    @click="onExportBOM"
                    size="large"
                    color="#1456f0"
                >
                    导出BOM
                </el-button>
            </el-card>
        </el-row>
        <el-row :gutter="30">
            <el-col :span="12">
                <el-select v-model="selectedValue" placeholder="请选择" @visible-change="onSelectedVisible">
                    <el-option
                        v-for="item in selectedOptions"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                    ></el-option>
                </el-select>
            </el-col>
            <el-col :span="12">
                <el-button
                    v-loading.fullscreen.lock="fullscreenLoading"
                    type="primary"
                    @click="onExportBOMtoOne"
                    size="medium "
                    color="#1456f0"
                >
                    导出BOM(系统对接)
                </el-button>
            </el-col>
        </el-row>
        <el-row :gutter="30">
            <el-col :span="12" :offset="6">
                <el-progress type="circle" :percentage="progress" :format="format" v-if="isExportVisible"></el-progress>
            </el-col>
        </el-row>
    </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { MCopy } from "../object/MCopy";
import { MAutoCode } from "../object/MAutoCode";
import { MExportBOM } from "../object/MExportBOM";
import { MExportBOMToOne } from "../object/MExportBOMToOne";
import { MSlectedPos } from "../object/MSlectedPos";
import { MExportBOMFromMapTable } from "../object/MExportBOMFromMapTable";

const fullscreenLoading = ref(false);
const progress = ref(0);
const isExportVisible = ref(false);
const selectedOptions = ref([
    {
        value: "",
        label: "",
    },
]);
const selectedValue = ref("");

let tipsArr = [
    "本工具自动完成多层级记录的顺序编码;",
    "需要有一列名为“层级编码”的文本字段;",
    "工具自动完成子记录的顺序编码,如:1.1.1.1。",
    "工具可以根据选择的层级记录，自动复制记录",
    "工具可以直接导出制造BOM",
];

const onAutoCode = async () => {
    //开始Loading
    fullscreenLoading.value = true;

    const autoCode: MAutoCode = new MAutoCode();
    await autoCode.action();

    //结束loading
    fullscreenLoading.value = false;
};

const onAutoCopy = async () => {
    //开始Loading
    fullscreenLoading.value = true;

    const copy: MCopy = new MCopy();
    await copy.action();

    //结束loading
    fullscreenLoading.value = false;
};

const onExportBOM = async () => {
    const exportBom: MExportBOM = new MExportBOM();

    isExportVisible.value = true;

    await exportBom.action(onProgress);
};

const onProgress = (current: number, total: number) => {
    progress.value = Math.round((current / total) * 100);

    if (current === total) {
        isExportVisible.value = false;
        progress.value = 0;
    }
};

const format = (percentage: number) => {
    return percentage >= 1 ? `${percentage}%` : "正在解析表格...";
};

const onExportBOMtoOne = async () => {
    const exportBom: MExportBOMFromMapTable = new MExportBOMFromMapTable();

    isExportVisible.value = true;

    await exportBom.action(selectedValue.value, onProgress);
};

const onSelectedVisible = async (visible: boolean) => {
    if (visible) {
        const select: MSlectedPos = new MSlectedPos();
        await select.action(); // 等待获取选项完成
        selectedOptions.value = []; // 清空之前的选项

        // 假设 boxProductPosOptions 是一个对象数组，包含 label 和 value
        select.boxProductPosOptions.forEach(item => {
            selectedOptions.value.push({
                value: item, // 根据你的数据结构选择合适的属性
                label: item, // 同上
            });
        });
    }
};
</script>

<style scoped>
.el-row {
    margin-bottom: 20px;
}
</style>
