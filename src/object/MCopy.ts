import {
    ITable,
    ITextField,
    IGridView,
    ISingleLinkField,
    FieldType,
    ICell,
    IField,
    bitable,
} from "@lark-base-open/js-sdk";

export class MCopy {
    table: ITable | null = null;
    view: IGridView | null = null;
    recordIdList: (string | undefined)[] | null = null;
    hierarchyCodeField: ITextField | null = null;
    parentField: ISingleLinkField | null = null;

    action = async () => {
        this.table = await bitable.base.getActiveTable();
        this.view = (await this.table.getActiveView()) as IGridView;
        this.recordIdList = await this.view.getVisibleRecordIdList();
        this.hierarchyCodeField = await this.table.getField<ITextField>("层级编码");
        this.parentField = await this.table.getField<ISingleLinkField>("父记录");
        let selectedRecordIdList = await this.view.getSelectedRecordIdList();

        let fieldCopyList = await this.setupCopyList(selectedRecordIdList);

        let newRecords = await this.addRecords(fieldCopyList, selectedRecordIdList);

        if (newRecords) {
            let codeMap = await this.setupIdMap(newRecords);

            await this.setParentValue(newRecords, codeMap);
        }
    };

    setupCopyList = async (selectedRecordIdList: string[]) => {
        let fieldCopyList: IField[] = [];

        if (this.table && selectedRecordIdList) {
            const fieldList = await this.table.getFieldList();
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
        }

        return fieldCopyList;
    };

    addRecords = async (fieldCopyList: IField[], selectedRecordIdList: string[]) => {
        if (this.table && selectedRecordIdList && this.parentField) {
            let aCells: ICell[][] = [];
            let ignoreID = this.parentField.id;

            for (let index = 0; index < selectedRecordIdList.length; index++) {
                const selectedRecordID = selectedRecordIdList[index];
                let cells = await this.copyRowCellsByRecordID(fieldCopyList, selectedRecordID, ignoreID);
                aCells.push(cells);
            }

            return await this.table.addRecords(aCells);
        }
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
            const recordID = newRecords[index];
            if (this.hierarchyCodeField && recordID) {
                let autoCodeObj = await this.hierarchyCodeField.getValue(recordID);
                let autCodeText = autoCodeObj[0].text;
                codeMap.set(autCodeText, recordID);
            }
        }
        return codeMap;
    };

    setParentValue = async (newRecords: string[], codeMap: Map<string, string>) => {
        for (let index = 0; index < newRecords.length; index++) {
            const recordID = newRecords[index];
            if (this.hierarchyCodeField && recordID) {
                let autoCodeObj = await this.hierarchyCodeField.getValue(recordID);
                let autCodeText = autoCodeObj[0].text;
                let value = autCodeText.replace(/\.\d+$/, "");
                if (autCodeText.includes(".") && this.parentField) {
                    await this.parentField.setValue(recordID, {
                        text: "",
                        type: "",
                        recordIds: [codeMap.get(value) as string],
                        tableId: "",
                        record_ids: [codeMap.get(value) as string],
                        table_id: "",
                    });
                }
            }
        }
    };
}
