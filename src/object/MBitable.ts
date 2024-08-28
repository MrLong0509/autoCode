import { ITable, IGridView, bitable, ITextField, ISingleLinkField, IRecord, ICell } from "@lark-base-open/js-sdk";

const MAX_RECORD_COUNT = 200;

//临时存储总分页记录标记
let totalCount: number = 0;
let pageToken: number | undefined = 0;
let hasMore: boolean = false;
//临时存储子分页记录标记
let childTotalCount: number = 0;
let childPageToken: number | undefined = 0;
let childHasMore: boolean = false;
let childRecordIds: string[] = [];

export class MBitable {
    private _table: ITable | null = null;
    private _view: IGridView | null = null;

    private _totalRecordIds: string[] = [];
    private _childRecordIds: string[] = [];
    private _parentRecordIds: string[] = [];

    initialize = async () => {
        this._table = await bitable.base.getActiveTable();
        this._view = (await this._table.getActiveView()) as IGridView;
        await this.setupRecordIds();
        await this.filterRecordIds();
    };

    private setupRecordIds = async () => {
        if (!this._view) return;

        let recordIds: string[] = [];
        ({
            total: totalCount,
            pageToken: pageToken,
            hasMore: hasMore,
            recordIds: recordIds,
        } = await this._view.getVisibleRecordIdListByPage({
            pageSize: MAX_RECORD_COUNT,
            pageToken: pageToken,
        }));

        this._totalRecordIds.push(...recordIds);

        if (hasMore) {
            await this.setupRecordIds();
        } else {
            totalCount = 0;
            pageToken = 0;
            hasMore = false;
        }
    };

    private filterRecordIds = async () => {
        for (let i = 0; i < this._totalRecordIds.length; i++) {
            const recordId = this._totalRecordIds[i];

            const childRecordIds = await this.getChildRecordIdsByName(recordId);
            if (!childRecordIds) continue;

            this._childRecordIds.push(...childRecordIds);
        }

        this._parentRecordIds = this._totalRecordIds.filter(
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

        let recordIds: string[] = [];
        ({
            total: childTotalCount,
            pageToken: childPageToken,
            hasMore: childHasMore,
            recordIds: recordIds,
        } = await this._view.getChildRecordIdListByPage({
            parentRecordId: parentId,
            pageSize: MAX_RECORD_COUNT,
            pageToken: childPageToken,
        }));

        childRecordIds.push(...recordIds);

        if (childHasMore) {
            await this.getChildRecordIdsByName(parentId);
        }

        if (!childHasMore) {
            childTotalCount = 0;
            childPageToken = 0;
            childHasMore = false;
            recordIds = childRecordIds;
            childRecordIds = [];
            return recordIds;
        }
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
        const N = Math.ceil(records.length / MAX_RECORD_COUNT);

        for (let index = 1; index <= N; index++) {
            const subRecords = records.slice((index - 1) * MAX_RECORD_COUNT, index * MAX_RECORD_COUNT);
            await this._table.setRecords(subRecords);
        }
    };

    addRecordsToBitalbeByCells = async (cells: ICell[][] = []) => {
        if (cells.length === 0 || !this._table) return;

        //分批次添加数据到表格
        const records: string[] = [];
        const N = Math.ceil(cells.length / MAX_RECORD_COUNT);
        for (let index = 1; index <= N; index++) {
            const subRecords = cells.slice((index - 1) * MAX_RECORD_COUNT, index * MAX_RECORD_COUNT);
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
        return this._totalRecordIds;
    }

    get parentRecordIds() {
        return this._parentRecordIds;
    }

    get totalCount() {
        return totalCount;
    }

    get childTotalCount() {
        return childTotalCount;
    }

    get MAX_RECORD_COUNT() {
        return MAX_RECORD_COUNT;
    }
}
