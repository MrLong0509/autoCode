import {
    ITable,
    IGridView,
    bitable,
    ITextField,
    ISingleLinkField,
    IRecord,
    ICell,
    ISingleSelectField,
    INumberField,
    IFormulaField,
    ILookupField,
} from "@lark-base-open/js-sdk";

const MAX_RECORD_COUNT = 200;
const MAX_CONCURRENT_REQUESTS = 500;

export class MBitable {
    private _table: ITable | null = null;
    private _view: IGridView | null = null;

    private _totalRecordIds: string[] = [];
    private _parentRecordIds: string[] = [];

    initialize = async () => {
        this._table = await bitable.base.getActiveTable();
        this._view = (await this._table.getActiveView()) as IGridView;

        console.time("MBitable getTotalRecordIds");
        const result = await this.getTotalRecordIds();
        console.timeEnd("MBitable getTotalRecordIds");
        if (result) {
            this._totalRecordIds = result;
            await this.filterRecordIds();
        }
    };

    private fetchRecordIdsByPageFunc = async (
        fetchPageData: (params: { pageSize: number; pageToken?: number }) => Promise<{
            pageToken?: number;
            hasMore: boolean;
            recordIds: string[];
        }>,
        params: { pageSize: number; pageToken?: number } = { pageSize: MAX_RECORD_COUNT }
    ): Promise<string[]> => {
        let pageToken: number | undefined = params.pageToken;
        let hasMore: boolean = true; // 初始化为 true，直到没有更多数据
        const allRecordIds: string[] = [];

        while (hasMore) {
            const {
                pageToken: newPageToken,
                hasMore: newHasMore,
                recordIds,
            } = await fetchPageData({ pageSize: params.pageSize, pageToken });

            allRecordIds.push(...recordIds);

            pageToken = newPageToken; // 更新页码
            hasMore = newHasMore; // 更新是否还有更多记录
        }

        return allRecordIds;
    };

    private processInBatches = async <T>(
        items: T[],
        processBatch: (batch: T[]) => Promise<any>,
        batchSize: number,
        maxConcurrentRequests: number
    ): Promise<any[]> => {
        if (items.length === 0) return [];

        const totalItems = items.length;
        const numBatches = Math.ceil(totalItems / batchSize);
        const batchPromises: Promise<any>[] = [];

        // 创建批处理任务
        for (let i = 0; i < numBatches; i++) {
            const subItems = items.slice(i * batchSize, (i + 1) * batchSize);
            batchPromises.push(processBatch(subItems));
        }

        // 控制并发请求数量
        const results: any[] = [];
        for (let i = 0; i < batchPromises.length; i += maxConcurrentRequests) {
            const batch = batchPromises.slice(i, i + maxConcurrentRequests);
            const batchResults = await Promise.all(batch);
            results.push(...batchResults);
        }

        return results;
    };

    private filterRecordIds = async () => {
        console.time("MBitable filterRecordIds");

        // 使用 Set 来存储所有的 childRecordIds，避免重复
        const childRecordIdsSet = new Set<string>();
        // 使用 Set 来存储所有的 totalRecordIds
        const parentRecordIdsSet = new Set<string>(this._totalRecordIds);

        // 将所有的异步操作包装成一个数组
        const childRecordPromises = this._totalRecordIds.map(async recordId => {
            const childRecordIds = await this.getChildRecordIdsByName(recordId);
            if (childRecordIds) {
                childRecordIds.forEach(id => childRecordIdsSet.add(id));
            }
        });

        // 等待所有的异步操作完成
        await Promise.all(childRecordPromises);

        // 计算 parentRecordIds
        this._parentRecordIds = Array.from(parentRecordIdsSet).filter(
            element => !childRecordIdsSet.has(element as string)
        ) as string[];

        console.timeEnd("MBitable filterRecordIds");
    };

    // 使用通用方法获取总记录 ID
    getTotalRecordIds = async () => {
        if (!this._view) return [];
        const getVisibleRecordIdListByPage = this._view.getVisibleRecordIdListByPage.bind(this._view);

        return this.fetchRecordIdsByPageFunc(params => getVisibleRecordIdListByPage(params));
    };

    // 使用通用方法获取子记录 ID
    getChildRecordIdsByName = async (parentId: string) => {
        if (!this._view) return [];
        const getChildRecordIdListByPage = this._view.getChildRecordIdListByPage.bind(this._view);

        return this.fetchRecordIdsByPageFunc(params =>
            getChildRecordIdListByPage({ parentRecordId: parentId, ...params })
        );
    };

    //获取选中记录ID
    getSelectedRecordIds = async () => {
        if (!this._view) return;
        const selectedRecordIds = await this._view.getSelectedRecordIdList();
        return selectedRecordIds;
    };

    getFields = async () => {
        if (!this._table) return;
        return await this._table.getFieldList();
    };

    getTextFieldByName = async (name: string) => {
        if (this._table) return await this._table.getField<ITextField>(name);
    };

    getSingleLinkFieldByName = async (name: string) => {
        if (this._table) return await this._table.getField<ISingleLinkField>(name);
    };

    getSingleSelectFieldByName = async (name: string) => {
        if (this._table) return await this._table.getField<ISingleSelectField>(name);
    };

    getNumberFieldByName = async (name: string) => {
        if (this._table) return await this._table.getField<INumberField>(name);
    };

    getFormulaFieldbyName = async (name: string) => {
        if (this._table) return await this._table.getField<IFormulaField>(name);
    };

    getLookupFieldbyName = async (name: string) => {
        if (this._table) return await this._table.getField<ILookupField>(name);
    };

    setRecordsToBitable = async (records: IRecord[] = []) => {
        console.time("MBitable setRecordsToBitable");

        if (records.length === 0 || !this._table) return;

        const setRecords = this._table.setRecords.bind(this._table);
        await this.processInBatches(records, batch => setRecords(batch), MAX_RECORD_COUNT, MAX_CONCURRENT_REQUESTS);

        console.timeEnd("MBitable setRecordsToBitable");
    };

    addRecordsToBitalbeByCells = async (cells: ICell[][] = []) => {
        console.time("MBitable addRecordsToBitalbeByCells");

        if (cells.length === 0 || !this._table) return [];

        const addRecords = this._table.addRecords.bind(this._table);
        const result = await this.processInBatches(
            cells,
            batch => addRecords(batch),
            MAX_RECORD_COUNT,
            MAX_CONCURRENT_REQUESTS
        );

        console.timeEnd("MBitable addRecordsToBitalbeByCells");

        return result.flat();
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

    get MAX_RECORD_COUNT() {
        return MAX_RECORD_COUNT;
    }
}
