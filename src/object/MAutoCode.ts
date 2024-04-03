import { ITable, ITextField, IGridView, ISingleLinkField, bitable, IRecord } from "@lark-base-open/js-sdk";

export class MAutoCode {
    table: ITable | null = null;
    view: IGridView | null = null;
    recordIdList: (string | undefined)[] | null = null;
    hierarchyCodeField: ITextField | null = null;
    hierarchyCodes: IRecord[] = [];
    parentField: ISingleLinkField | null = null;
    childArr: string[] = [];
    parentArr: string[] = [];

    action = async () => {
        this.table = await bitable.base.getActiveTable();
        this.view = (await this.table.getActiveView()) as IGridView;
        this.recordIdList = await this.view.getVisibleRecordIdList();
        this.hierarchyCodeField = await this.table.getField<ITextField>("层级编码");
        this.parentField = await this.table.getField<ISingleLinkField>("父记录");

        //初始化层级数组
        await this.setupParentArr();

        //创建层级编码
        await this.createHierarchyCode();

        //设置层级编码
        await this.setHierarchyCode();
    };

    setupParentArr = async () => {
        if (this.recordIdList && this.view) {
            for (let i = 0; i < this.recordIdList.length; i++) {
                const recordID = this.recordIdList[i];

                if (recordID) {
                    await this.setupChildArr(this.view, recordID);
                }
            }
            this.parentArr = this.recordIdList.filter(
                element => !this.childArr.includes(element as string)
            ) as string[];
        }
    };

    setupChildArr = async (view: IGridView, recordID: string) => {
        let childRecordIdArr = await view.getChildRecordIdList(recordID);

        if (childRecordIdArr) {
            for (let i = 0; i < childRecordIdArr.length; i++) {
                let childRecordID = childRecordIdArr[i];
                this.childArr.push(childRecordID);

                this.setupChildArr(view, childRecordID);
            }
        }
    };

    createHierarchyCode = async () => {
        if (this.view && this.hierarchyCodeField) {
            for (let i = 0; i < this.parentArr.length; i++) {
                const recordID = this.parentArr[i];
                let hierarchyCode = (i + 1).toString();

                this.hierarchyCodeField.setValue(recordID, hierarchyCode);
                await this.createChildHierarchyCode(this.view, hierarchyCode, recordID);
            }
        }
    };

    createChildHierarchyCode = async (view: IGridView, hierarchyCode: string, recordID: string) => {
        let childRecordIdArr = await view.getChildRecordIdList(recordID);

        if (childRecordIdArr) {
            for (let i = 0; i < childRecordIdArr.length; i++) {
                if (this.hierarchyCodeField) {
                    let childRecordID = childRecordIdArr[i];
                    let childHierarchyCode = hierarchyCode + "." + (i + 1);

                    this.hierarchyCodes.push({
                        recordId: childRecordID,
                        fields: {
                            [this.hierarchyCodeField.id]: childHierarchyCode,
                        },
                    });
                    await this.createChildHierarchyCode(view, childHierarchyCode, childRecordID);
                }
            }
        }
    };

    setHierarchyCode = async () => {
        const arr = this.hierarchyCodes;
        const limitedNum = 5000;

        if (arr.length > 0 && this.table) {
            const N = Math.ceil(arr.length / limitedNum);

            for (let index = 1; index <= N; index++) {
                const subArr = arr.slice((index - 1) * limitedNum, index * limitedNum);
                await this.table.setRecords(subArr);
            }
        }
    };
}
