<template>
    <div class="card">
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
/* Yoinked from CodePen, but improved the animation
so that it is smooth among other more minor things */

.codepen-button {
    display: block;
    cursor: pointer;
    color: white;
    margin: 0 auto;
    position: relative;
    text-decoration: none;
    font-weight: 600;
    border-radius: 6px;
    overflow: hidden;
    padding: 3px;
    isolation: isolate;
}

.codepen-button::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 400%;
    height: 100%;
    background: linear-gradient(115deg, #4fcf70, #fad648, #a767e5, #12bcfe, #44ce7b);
    background-size: 25% 100%;
    animation: an-at-keyframe-css-at-rule-that-translates-via-the-transform-property-the-background-by-negative-25-percent-of-its-width-so-that-it-gives-a-nice-border-animation_-We-use-the-translate-property-to-have-a-nice-transition-so-it_s-not-a-jerk-of-a-start-or-stop
        0.75s linear infinite;
    animation-play-state: paused;
    translate: -5% 0%;
    transition: translate 0.25s ease-out;
}

.codepen-button:hover::before {
    animation-play-state: running;
    transition-duration: 0.75s;
    translate: 0% 0%;
}

@keyframes an-at-keyframe-css-at-rule-that-translates-via-the-transform-property-the-background-by-negative-25-percent-of-its-width-so-that-it-gives-a-nice-border-animation_-We-use-the-translate-property-to-have-a-nice-transition-so-it_s-not-a-jerk-of-a-start-or-stop {
    to {
        transform: translateX(-25%);
    }
}

.codepen-button span {
    position: relative;
    display: block;
    padding: 1rem 1.5rem;
    font-size: 1.1rem;
    background: #000;
    border-radius: 3px;
    height: 100%;
}

.notification {
    display: flex;
    flex-direction: column;
    isolation: isolate;
    position: relative;
    width: 16rem;
    height: 14rem;
    background: #29292c;
    border-radius: 1rem;
    overflow: hidden;
    font-family: "Gill Sans", "Gill Sans MT", Calibri, "Trebuchet MS", sans-serif;
    font-size: 16px;
    --gradient: linear-gradient(to bottom, #2eadff, #3d83ff, #7e61ff);
    --color: #32a6ff;
}

.notification:before {
    position: absolute;
    content: "";
    inset: 0.0625rem;
    border-radius: 0.9375rem;
    background: #18181b;
    z-index: 2;
}

.notification:after {
    position: absolute;
    content: "";
    width: 0.25rem;
    inset: 0.65rem auto 0.65rem 0.5rem;
    border-radius: 0.125rem;
    background: var(--gradient);
    transition: transform 300ms ease;
    z-index: 4;
}

.notification:hover:after {
    transform: translateX(0.15rem);
}

.notititle {
    color: var(--color);
    padding: 0.65rem 0.25rem 0.4rem 1.25rem;
    font-weight: bolder;
    font-size: 1.1rem;
    transition: transform 300ms ease;
    z-index: 5;
}

.notification:hover .notititle {
    transform: translateX(0.15rem);
}

.notibody {
    color: #99999d;
    padding: 0 1.25rem;
    font-weight: bolder;
    transition: transform 300ms ease;
    z-index: 5;
}

.notification:hover .notibody {
    transform: translateX(0.25rem);
}

.notiglow,
.notiborderglow {
    position: absolute;
    width: 20rem;
    height: 20rem;
    transform: translate(-50%, -50%);
    background: radial-gradient(circle closest-side at center, white, transparent);
    opacity: 0;
    transition: opacity 300ms ease;
}

.notiglow {
    z-index: 3;
}

.notiborderglow {
    z-index: 1;
}

.notification:hover .notiglow {
    opacity: 0.1;
}

.notification:hover .notiborderglow {
    opacity: 0.1;
}

.note {
    color: var(--color);
    position: fixed;
    top: 80%;
    left: 50%;
    transform: translateX(-50%);
    text-align: center;
    font-size: 0.9rem;
    width: 75%;
}
</style>
async
