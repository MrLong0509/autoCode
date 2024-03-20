import { bitable, ITextField, IGridView, UIBuilder } from "@lark-base-open/js-sdk";

const tips =
    "针对存在子记录情况的多维表格层级编码工具，需要有一列名为“层级编码”的文本字段，同时先在最顶层的层级编码中编写编码（如：“1 2 3 4”），不可以带标点符号，工具自动完成子记录的顺序编码";
let table = null;
let view: IGridView | null = null;
let recordIdList: (string | undefined)[] | null = null;
let hierarchyCodeField: ITextField | null = null;

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

export default async function main(uiBuilder: UIBuilder) {
    uiBuilder.text(tips);
    uiBuilder.buttons("", ["开始编码"], () => {
        onclick();
    });
}
