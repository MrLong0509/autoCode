import { ITextField, ISingleLinkField, FieldType, ICell, IField, IRecord } from "@lark-base-open/js-sdk";
import { MBitable } from "./MBitable";

export class MCopy {
    mBitable: MBitable | undefined = undefined;
    hierarchyCodeField: ITextField | undefined = undefined;
    parentField: ISingleLinkField | undefined = undefined;

    action = async () => {
        this.mBitable = new MBitable();
        await this.mBitable.initialize();
        if (!this.mBitable || !this.mBitable.view) return;

        // 获取层级编码字段和父记录字段
        this.hierarchyCodeField = await this.mBitable.getTextFieldByName("层级编码");
        this.parentField = await this.mBitable.getSingleLinkFieldByName("父记录");

        const selectedRecordIdList = await this.mBitable.getSelectedRecordIds();
        const fieldCopyList = await this.setupFieldCopyList();

        if (!fieldCopyList || !selectedRecordIdList) return;
        const newRecords = await this.addRecords(fieldCopyList, selectedRecordIdList);

        if (!newRecords) return;
        const codeMap = await this.setupIdMap(newRecords);

        if (!codeMap) return;
        await this.setParentValue(newRecords, codeMap);
    };

    setupFieldCopyList = async () => {
        if (!this.mBitable || !this.mBitable.table) return;

        const fieldList = await this.mBitable.getFields();
        if (!fieldList) return;

        const fieldCopyList: IField[] = [];
        for (const field of fieldList) {
            const eType = await field.getType();
            if (
                eType === FieldType.Number ||
                eType === FieldType.Text ||
                eType === FieldType.SingleSelect ||
                eType === FieldType.MultiSelect
            ) {
                fieldCopyList.push(field);
            }
        }

        return fieldCopyList;
    };

    addRecords = async (fieldCopyList: IField[], selectedRecordIdList: string[]) => {
        if (!this.mBitable || !this.mBitable.table || !this.parentField) return;

        const ignoreID = this.parentField.id;
        const aCells: ICell[][] = await Promise.all(
            selectedRecordIdList.map(selectedRecordID =>
                this.copyRowCellsByRecordID(fieldCopyList, selectedRecordID, ignoreID)
            )
        );

        return await this.mBitable.addRecordsToBitalbeByCells(aCells);
    };

    copyRowCellsByRecordID = async (fieldCopyList: IField[], RecordID: string, ignoreID: string) => {
        const cells: ICell[] = [];
        for (const field of fieldCopyList) {
            if (field.id === ignoreID) continue;
            const cellValue = await field.getValue(RecordID);
            if (!cellValue) continue;
            const cell = await field.createCell(cellValue);
            cells.push(cell);
        }
        return cells;
    };

    setupIdMap = async (newRecords: string[]) => {
        if (!this.hierarchyCodeField) return;

        const hierarchyCodeField = this.hierarchyCodeField;

        const codeMap = new Map<string, string>();
        await Promise.all(
            newRecords.map(async recordID => {
                const autoCodeObj = await hierarchyCodeField.getValue(recordID);
                if (autoCodeObj) {
                    const autCodeText = autoCodeObj[0].text;
                    codeMap.set(autCodeText, recordID);
                }
            })
        );

        return codeMap;
    };

    setParentValue = async (newRecords: string[], codeMap: Map<string, string>) => {
        if (!this.mBitable || !this.mBitable.table || !this.parentField || !this.hierarchyCodeField) return;

        const hierarchyCodeField = this.hierarchyCodeField;
        const parentField = this.parentField;

        const records: IRecord[] = [];
        await Promise.all(
            newRecords.map(async recordID => {
                const autoCodeObj = await hierarchyCodeField.getValue(recordID);
                const autCodeText = autoCodeObj[0].text;
                const value = autCodeText.replace(/\.\d+$/, "");
                if (autCodeText.includes(".")) {
                    const record: IRecord = {
                        recordId: recordID,
                        fields: {
                            [parentField.id]: {
                                text: "",
                                type: "",
                                recordIds: [codeMap.get(value) as string],
                                tableId: "",
                                record_ids: [codeMap.get(value) as string],
                                table_id: "",
                            },
                        },
                    };
                    records.push(record);
                }
            })
        );

        await this.mBitable.setRecordsToBitable(records);
    };
}
