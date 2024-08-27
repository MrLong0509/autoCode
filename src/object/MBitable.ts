import { ITable, IGridView, bitable, ITextField, ISingleLinkField, IRecord, ICell } from "@lark-base-open/js-sdk";

const _MAX_RECORD_COUNT = 200;

export class MBitable {
    private _table: ITable | null = null;
    private _view: IGridView | null = null;

    private _recordIds: string[] = [];
    private _totalCount: number = 0;
    private _pageToken: number | undefined = 0;
    private _hasMore: boolean = false;

    private _childRecordIds: string[] = [];
    private _parentRecordIds: string[] = [];

    initialize = async () => {
        this._table = await bitable.base.getActiveTable();
        this._view = (await this._table.getActiveView()) as IGridView;
        await this.getRecordIds();
        await this.setupRecordIds();
    };

    private getRecordIds = async () => {
        let recordIds: string[] = [];

        if (this._view) {
            ({
                total: this._totalCount,
                pageToken: this._pageToken,
                hasMore: this._hasMore,
                recordIds: recordIds,
            } = await this._view.getVisibleRecordIdListByPage({
                pageSize: this.MAX_RECORD_COUNT,
                pageToken: this._pageToken,
            }));

            this._recordIds.push(...recordIds);

            if (this._hasMore) {
                this.getRecordIds();
            }
        }
    };

    private setupRecordIds = async () => {
        for (let i = 0; i < this._recordIds.length; i++) {
            const recordId = this._recordIds[i];

            const childRecordIds = await this.getChildRecordIdsByName(recordId);
            if (!childRecordIds) continue;

            this._childRecordIds.push(...childRecordIds);
        }

        this._parentRecordIds = this.recordIds.filter(
            element => !this._childRecordIds.includes(element as string)
        ) as string[];
    };

    getSelectedRecordIds = async () => {
        if (!this._view) return;
        const selectedRecordIds = await this._view.getSelectedRecordIdList();
        return selectedRecordIds;
    };

    getFields = async () => {
        if (!this._table) return;
        //获取表格的所有字段(耗时较多，待解决)
        return await this._table.getFieldList();
    };

    getChildRecordIdsByName = async (parentId: string) => {
        if (!this._view) return;
        return (
            await this._view.getChildRecordIdListByPage({
                parentRecordId: parentId,
            })
        ).recordIds;
    };

    getTextFieldByName = async (name: string) => {
        if (this._table) return await this._table.getField<ITextField>(name);
    };

    getSingleLinkFieldByName = async (name: string) => {
        if (this._table) return await this._table.getField<ISingleLinkField>(name);
    };

    setRecordsToBitable = async (records: IRecord[] = []) => {
        if (records.length === 0 || !this._table) return;

        //分批次设置数据到表格
        const N = Math.ceil(records.length / _MAX_RECORD_COUNT);

        for (let index = 1; index <= N; index++) {
            const subRecords = records.slice((index - 1) * _MAX_RECORD_COUNT, index * _MAX_RECORD_COUNT);
            await this._table.setRecords(subRecords);
        }
    };

    addRecordsToBitalbeByCells = async (cells: ICell[][] = []) => {
        if (cells.length === 0 || !this._table) return;

        //分批次添加数据到表格
        const records: string[] = [];
        const N = Math.ceil(cells.length / _MAX_RECORD_COUNT);
        for (let index = 1; index <= N; index++) {
            const subRecords = cells.slice((index - 1) * _MAX_RECORD_COUNT, index * _MAX_RECORD_COUNT);
            const newRecords = await this._table.addRecords(subRecords);
            records.push(...newRecords);
        }

        return records;
    };

    get view() {
        return this._view;
    }

    get table() {
        return this._table;
    }

    get recordIds() {
        return this._recordIds;
    }

    get parentRecordIds() {
        return this._parentRecordIds;
    }

    get totalCount() {
        return this._totalCount;
    }

    get MAX_RECORD_COUNT() {
        return _MAX_RECORD_COUNT;
    }
}
