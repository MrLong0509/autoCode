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

        let selectedRecordIdList = await this.mBitable.view.getSelectedRecordIdList();
        let fieldCopyList = await this.setupCopyList();

        if (!fieldCopyList || fieldCopyList.length === 0) return;
        let newRecords = await this.addRecords(fieldCopyList, selectedRecordIdList);

        if (!newRecords) return;
        let codeMap = await this.setupIdMap(newRecords);

        if (!codeMap) return;
        await this.setParentValue(newRecords, codeMap);
    };

    setupCopyList = async () => {
        let fieldCopyList: IField[] = [];

        if (!this.mBitable || !this.mBitable.table) return;

        const fieldList = await this.mBitable.table.getFieldList();
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

        let aCells: ICell[][] = [];
        let ignoreID = this.parentField.id;

        for (let index = 0; index < selectedRecordIdList.length; index++) {
            const selectedRecordID = selectedRecordIdList[index];
            let cells = await this.copyRowCellsByRecordID(fieldCopyList, selectedRecordID, ignoreID);
            aCells.push(cells);
        }

        return await this.mBitable.table.addRecords(aCells);
    };

    copyRowCellsByRecordID = async (fieldCopyList: IField[], RecordID: string, ignoreID: string) => {
        let cells: ICell[] = [];
        for (let index = 0; index < fieldCopyList.length; index++) {
            const field = fieldCopyList[index];
            const cellValue = await field.getValue(RecordID);

            if (!cellValue || field.id === ignoreID) continue;

            let cell = await field.createCell(cellValue);
            cells.push(cell);
        }
        return cells;
    };

    setupIdMap = async (newRecords: string[]) => {
        let codeMap = new Map<string, string>();

        for (let index = 0; index < newRecords.length; index++) {
            if (!this.hierarchyCodeField) return;

            const recordID = newRecords[index];
            let autoCodeObj = await this.hierarchyCodeField.getValue(recordID);

            if (autoCodeObj) {
                let autCodeText = autoCodeObj[0].text;
                codeMap.set(autCodeText, recordID);
            }
        }

        return codeMap;
    };

    setParentValue = async (newRecords: string[], codeMap: Map<string, string>) => {
        let records: IRecord[] = [];
        if (!this.mBitable || !this.mBitable.table || !this.parentField || !this.hierarchyCodeField) return;

        for (let index = 0; index < newRecords.length; index++) {
            const recordID = newRecords[index];

            let autoCodeObj = await this.hierarchyCodeField.getValue(recordID);
            let autCodeText = autoCodeObj[0].text;
            let value = autCodeText.replace(/\.\d+$/, "");
            if (autCodeText.includes(".")) {
                let record: IRecord = {
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

        await this.mBitable.table.setRecords(records);
    };
}
