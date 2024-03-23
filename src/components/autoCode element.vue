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
                @click="onclick"
                size="large"
                color="#1456f0"
            >
                开始编码
            </el-button>
        </el-row>
    </div>
</template>

<script setup lang="ts">
import { bitable, ITextField, IGridView } from "@lark-base-open/js-sdk";
import { ref } from "vue";

const fullscreenLoading = ref(false);

let table = null;
let view: IGridView | null = null;
let recordIdList: (string | undefined)[] | null = null;
let hierarchyCodeField: ITextField | null = null;
let childArr: string[] = [];
let parentArr: string[] = [];

let tipsArr = [
    "本工具自动完成多层级记录的顺序编码;",
    "需要有一列名为“层级编码”的文本字段;",
    "工具自动完成子记录的顺序编码,如:1.1.1.1。",
];

const onclick = async () => {
    //开始Loading
    fullscreenLoading.value = true;

    //获取初始化数据
    table = await bitable.base.getActiveTable();
    view = (await table.getActiveView()) as IGridView;
    recordIdList = await view.getVisibleRecordIdList();
    hierarchyCodeField = await table.getField<ITextField>("层级编码");

    //初始化层级数组
    await setupParentArr();

    //设置层级编码
    await setHierarchyID();

    //结束loading
    fullscreenLoading.value = false;
};

const setupParentArr = async () => {
    if (recordIdList && view) {
        for (let i = 0; i < recordIdList.length; i++) {
            const recordID = recordIdList[i];

            if (recordID) {
                await setupChildArr(view, recordID);
            }
        }
        parentArr = recordIdList.filter(element => !childArr.includes(element as string)) as string[];
    }
};

const setupChildArr = async (view: IGridView, recordID: string) => {
    let childRecordIdArr = await view.getChildRecordIdList(recordID);

    if (childRecordIdArr) {
        for (let i = 0; i < childRecordIdArr.length; i++) {
            let childRecordID = childRecordIdArr[i];
            childArr.push(childRecordID);

            setupChildArr(view, childRecordID);
        }
    }
};

const setHierarchyID = async () => {
    if (view && hierarchyCodeField) {
        for (let i = 0; i < parentArr.length; i++) {
            const recordID = parentArr[i];
            let hierarchyCode = (i + 1).toString();

            hierarchyCodeField.setValue(recordID, hierarchyCode);
            await setChildHierarchyID(view, hierarchyCode, recordID);
        }
    }
};

const setChildHierarchyID = async (view: IGridView, hierarchyCode: string, recordID: string) => {
    let childRecordIdArr = await view.getChildRecordIdList(recordID);

    if (childRecordIdArr) {
        for (let i = 0; i < childRecordIdArr.length; i++) {
            let childRecordID = childRecordIdArr[i];

            let childHierarchyCode = hierarchyCode + "." + (i + 1);

            if (hierarchyCodeField) {
                hierarchyCodeField.setValue(childRecordID, childHierarchyCode);
            }
            setChildHierarchyID(view, childHierarchyCode, childRecordID);
        }
    }
};
</script>

<style scoped>
.el-row {
    margin-bottom: 20px;
}
</style>
