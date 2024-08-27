import { ITextField, ISingleLinkField, FieldType, ICell, IField, IRecord } from "@lark-base-open/js-sdk";

import { MBitable } from "./MBitable";

export class MCopy {
    mBitable: MBitable | undefined = undefined;
    recordIdList: (string | undefined)[] | undefined = undefined;
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

        const fieldCopyList: IField[] = [];
        const fieldList = await this.mBitable.getFields();
        if (!fieldList) return;

        for (let index = 0; index < fieldList.length; index++) {
            const field = fieldList[index];
            const eType = await field.getType();
            if (
                eType === (FieldType.Number as Number) ||
                eType === (FieldType.Text as Number) ||
                eType === (FieldType.SingleSelect as Number) ||
                eType === (FieldType.MultiSelect as Number)
            ) {
                fieldCopyList.push(field);
            }
        }

        return fieldCopyList;
    };

    addRecords = async (fieldCopyList: IField[], selectedRecordIdList: string[]) => {
        if (!this.mBitable || !this.mBitable.table || !this.parentField) return;

        const aCells: ICell[][] = [];
        const ignoreID = this.parentField.id;

        for (let index = 0; index < selectedRecordIdList.length; index++) {
            const selectedRecordID = selectedRecordIdList[index];
            const cells = await this.copyRowCellsByRecordID(fieldCopyList, selectedRecordID, ignoreID);
            aCells.push(cells);
        }

        return await this.mBitable.addRecordsToBitalbeByCells(aCells);
    };

    copyRowCellsByRecordID = async (fieldCopyList: IField[], RecordID: string, ignoreID: string) => {
        const cells: ICell[] = [];
        for (let index = 0; index < fieldCopyList.length; index++) {
            const field = fieldCopyList[index];
            const cellValue = await field.getValue(RecordID);

            if (!cellValue || field.id === ignoreID) continue;

            const cell = await field.createCell(cellValue);
            cells.push(cell);
        }
        return cells;
    };

    setupIdMap = async (newRecords: string[]) => {
        if (!this.hierarchyCodeField) return;

        const codeMap = new Map<string, string>();

        for (let index = 0; index < newRecords.length; index++) {
            const recordID = newRecords[index];

            const autoCodeObj = await this.hierarchyCodeField.getValue(recordID);
            if (autoCodeObj) {
                const autCodeText = autoCodeObj[0].text;
                codeMap.set(autCodeText, recordID);
            }
        }

        return codeMap;
    };

    setParentValue = async (newRecords: string[], codeMap: Map<string, string>) => {
        const records: IRecord[] = [];
        if (!this.mBitable || !this.mBitable.table || !this.parentField || !this.hierarchyCodeField) return;

        for (let index = 0; index < newRecords.length; index++) {
            const recordID = newRecords[index];

            const autoCodeObj = await this.hierarchyCodeField.getValue(recordID);
            const autCodeText = autoCodeObj[0].text;
            const value = autCodeText.replace(/\.\d+$/, "");
            if (autCodeText.includes(".")) {
                const record: IRecord = {
                    recordId: recordID,
                    fields: {
                        [this.parentField.id]: {
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
        }

        await this.mBitable.setRecordsToBitable(records);
    };
}
