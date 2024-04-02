import { ITable, ITextField, IGridView, ISingleLinkField, bitable } from "@lark-base-open/js-sdk";

export class MAutoCode {
    table: ITable | null = null;
    view: IGridView | null = null;
    recordIdList: (string | undefined)[] | null = null;
    hierarchyCodeField: ITextField | null = null;
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

        //设置层级编码
        await this.setHierarchyID();
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

    setHierarchyID = async () => {
        if (this.view && this.hierarchyCodeField) {
            for (let i = 0; i < this.parentArr.length; i++) {
                const recordID = this.parentArr[i];
                let hierarchyCode = (i + 1).toString();

                this.hierarchyCodeField.setValue(recordID, hierarchyCode);
                await this.setChildHierarchyID(this.view, hierarchyCode, recordID);
            }
        }
    };

    setChildHierarchyID = async (view: IGridView, hierarchyCode: string, recordID: string) => {
        let childRecordIdArr = await view.getChildRecordIdList(recordID);

        if (childRecordIdArr) {
            for (let i = 0; i < childRecordIdArr.length; i++) {
                let childRecordID = childRecordIdArr[i];

                let childHierarchyCode = hierarchyCode + "." + (i + 1);

                if (this.hierarchyCodeField) {
                    this.hierarchyCodeField.setValue(childRecordID, childHierarchyCode);
                }
                this.setChildHierarchyID(view, childHierarchyCode, childRecordID);
            }
        }
    };
}
