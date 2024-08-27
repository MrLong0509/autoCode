import { ITextField, ISingleLinkField, IRecord } from "@lark-base-open/js-sdk";
import { MBitable } from "./MBitable";

export class MAutoCode {
    mBitable: MBitable | undefined = undefined;
    hierarchyCodeField: ITextField | undefined = undefined;
    hierarchyCodes: IRecord[] = [];
    parentField: ISingleLinkField | undefined = undefined;
    childArr: string[] = [];
    parentArr: string[] = [];

    action = async () => {
        this.mBitable = new MBitable();
        await this.mBitable.initialize();
        if (!this.mBitable) return;

        this.hierarchyCodeField = await this.mBitable.getTextFieldByName("层级编码");
        this.parentField = await this.mBitable.getSingleLinkFieldByName("父记录");

        //设置层级编码数据
        await this.setupHierarchyCode();

        //设置层级编码到表格
        await this.setHierarchyCodetoBitable();
    };

    setupHierarchyCode = async () => {
        if (!this.mBitable || !this.mBitable.recordIds || !this.mBitable.view) return;

        //设置子记录
        for (let i = 0; i < this.mBitable.parentRecordIds.length; i++) {
            const parentRecordId = this.mBitable.parentRecordIds[i];
            const hierarchyCode = (i + 1).toString();
            this.pushHierarchyCode(parentRecordId, hierarchyCode);

            await this.setupChildHierarchyCode(parentRecordId, hierarchyCode);
        }
    };

    setupChildHierarchyCode = async (parentRecordId: string, parentHierarchyCode: string) => {
        if (!this.mBitable) return;

        const childRecordIds = await this.mBitable.getChildRecordIdsByName(parentRecordId);
        if (!childRecordIds) return;

        for (let i = 0; i < childRecordIds.length; i++) {
            const childRecordID = childRecordIds[i];
            const childHierarchyCode = parentHierarchyCode + "." + (i + 1);
            this.pushHierarchyCode(childRecordID, childHierarchyCode);

            //递归设置子记录的层级编码数据
            await this.setupChildHierarchyCode(childRecordID, childHierarchyCode);
        }
    };

    pushHierarchyCode = (recordID: string, hierarchyCode: string) => {
        if (!this.hierarchyCodeField) return;

        this.hierarchyCodes.push({
            recordId: recordID,
            fields: {
                [this.hierarchyCodeField.id]: hierarchyCode,
            },
        });
    };

    setHierarchyCodetoBitable = async () => {
        if (!this.mBitable) return;
        this.mBitable.setRecordsToBitable(this.hierarchyCodes);
    };
}
