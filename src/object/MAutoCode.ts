import { ITextField, ISingleLinkField, IRecord } from "@lark-base-open/js-sdk";
import { MBitable } from "./MBitable";

export class MAutoCode {
    mBitable: MBitable | undefined = undefined;
    hierarchyCodeField: ITextField | undefined = undefined;
    hierarchyCodes: IRecord[] = [];
    parentField: ISingleLinkField | undefined = undefined;

    action = async () => {
        try {
            this.mBitable = new MBitable();
            await this.mBitable.initialize();

            if (!this.mBitable) throw new Error("MBitable 初始化失败");

            this.hierarchyCodeField = await this.mBitable.getTextFieldByName("层级编码");
            this.parentField = await this.mBitable.getSingleLinkFieldByName("父记录");

            // 设置层级编码数据
            await this.setupHierarchyCode();

            // 设置层级编码到表格
            await this.setHierarchyCodetoBitable();
        } catch (error) {
            console.error("操作过程中发生错误:", error);
        }
    };

    setupHierarchyCode = async () => {
        if (!this.mBitable) return;

        for (const [index, parentRecordId] of this.mBitable.parentRecordIds.entries()) {
            const hierarchyCode = (index + 1).toString();
            this.pushHierarchyCode(parentRecordId, hierarchyCode);
            await this.setupChildHierarchyCode(parentRecordId, hierarchyCode);
        }
    };

    setupChildHierarchyCode = async (parentRecordId: string, parentHierarchyCode: string) => {
        if (!this.mBitable) return;

        const childRecordIds = await this.mBitable.getChildRecordIdsByName(parentRecordId);
        if (!childRecordIds || childRecordIds.length === 0) return;

        for (const [index, childRecordID] of childRecordIds.entries()) {
            const childHierarchyCode = `${parentHierarchyCode}.${index + 1}`;
            this.pushHierarchyCode(childRecordID, childHierarchyCode);
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
        if (!this.mBitable || this.hierarchyCodes.length === 0) return;
        await this.mBitable.setRecordsToBitable(this.hierarchyCodes);
    };
}
