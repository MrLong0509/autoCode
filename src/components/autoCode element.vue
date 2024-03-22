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
            <el-button type="primary" @click="onclick" size="large" color="#1456f0">开始编码</el-button>
        </el-row>
    </div>
</template>

<script setup lang="ts">
import { bitable, ITextField, IGridView } from "@lark-base-open/js-sdk";

let table = null;
let view: IGridView | null = null;
let recordIdList: (string | undefined)[] | null = null;
let hierarchyCodeField: ITextField | null = null;

let tipsArr = [
    "本工具自动完成多层级记录的顺序编码;",
    "需要有一列名为“层级编码”的文本字段;",
    "先在最顶层(无子记录的数据)的《层级编码》字段中编码,如:“1,2,3,4或者A,B,C,D”;",
    "编写最顶层编码的时候不可以带标点符号；",
    "工具自动完成子记录的顺序编码,如:1.1.1.1。",
];

const onclick = async () => {
    table = await bitable.base.getActiveTable();
    view = (await table.getActiveView()) as IGridView;
    recordIdList = await view.getVisibleRecordIdList();
    hierarchyCodeField = await table.getField<ITextField>("层级编码");

    if (recordIdList && hierarchyCodeField && view) {
        for (let i = 0; i < recordIdList.length; i++) {
            const recordID = recordIdList[i];
            let hierarchyCodes = await (await hierarchyCodeField.getCell(recordID as string)).getValue();
            let hierarchyCode = hierarchyCodes ? hierarchyCodes[0].text : null;
            if (hierarchyCode && !hierarchyCode.includes(".") && recordID) {
                hierarchyCodeField.setValue(recordID as string, hierarchyCode);
                setChildHierarchyID(view, hierarchyCode, recordID);
            }
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
