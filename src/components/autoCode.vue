<template>
    <div class="card">
        <div class="Renderings"></div>
        <div class="notification">
            <div class="notiglow"></div>
            <div class="notiborderglow"></div>
            <div class="notititle">子记录层级编码器</div>
            <div class="notibody">
                针对存在子记录情况的多维表格层级编码工具，需要有一列名为“层级编码”的文本字段，同时先在最顶层的层级编码中编写编码（如：“1
                2 3 4”），不可以带标点符号，工具自动完成子记录的顺序编码
            </div>
        </div>
        <a class="codepen-button" @click="onclick"><span>开始编码</span></a>
    </div>
</template>

<script setup lang="ts">
import { bitable, ITextField, IGridView } from "@lark-base-open/js-sdk";
import { onMounted } from "vue";

let table = null;
let view: IGridView | null = null;
let recordIdList: (string | undefined)[] | null = null;
let hierarchyCodeField: ITextField | null = null;

onMounted(async () => {
    table = await bitable.base.getActiveTable();
    view = (await table.getViewById("vewvsx2o1q")) as IGridView;
    recordIdList = await view.getVisibleRecordIdList();
    hierarchyCodeField = await table.getField<ITextField>("层级编码");
});

const onclick = async () => {
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
@import "../button.css";
@import "../notion.css";

.Renderings {
    background-image: url("/public/效果图.png");
    background-size: cover; /* 背景图的适应方式 */
    height: 14em; /* 设置div的高度以展示背景图 */
    width: 25em; /* 设置div的宽度以适应屏幕 */
    border: 2px solid #333333; /* 设置边框样式 */
    border-radius: 10px; /* 设置圆角边框 */
}
</style>
async
