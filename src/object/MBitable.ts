import { ITable, IGridView, bitable, ITextField, ISingleLinkField, IRecord, ICell } from "@lark-base-open/js-sdk";

const MAX_RECORD_COUNT = 200;
const MAX_CONCURRENT_REQUESTS = 200;

export class MBitable {
    private _table: ITable | null = null;
    private _view: IGridView | null = null;

    private _totalRecordIds: string[] = [];
    private _parentRecordIds: string[] = [];

    initialize = async () => {
        this._table = await bitable.base.getActiveTable();
        this._view = (await this._table.getActiveView()) as IGridView;
        const result = await this.getTotalRecordIds();
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

    private filterRecordIds = async () => {
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

    setRecordsToBitable = async (records: IRecord[] = []) => {
        if (records.length === 0 || !this._table) return;
        // 计算需要处理的批次数
        const totalRecords = records.length;
        const numBatches = Math.ceil(totalRecords / MAX_RECORD_COUNT);

        // 如果 `setRecords` 方法支持批量操作，将所有数据合并到一个请求中处理
        // (假设你可以根据具体需求修改 setRecords 方法以支持批量操作)
        if (numBatches === 1) {
            await this._table.setRecords(records);
        } else {
            // 异步并发处理批次
            const batchPromises = [];
            for (let i = 0; i < numBatches; i++) {
                const subRecords = records.slice(i * MAX_RECORD_COUNT, (i + 1) * MAX_RECORD_COUNT);
                batchPromises.push(this._table.setRecords(subRecords));
            }

            // 控制并发量
            for (let i = 0; i < batchPromises.length; i += MAX_CONCURRENT_REQUESTS) {
                await Promise.all(batchPromises.slice(i, i + MAX_CONCURRENT_REQUESTS));
            }
        }
    };

    addRecordsToBitalbeByCells = async (cells: ICell[][] = []) => {
        if (cells.length === 0 || !this._table) return [];

        // 分批次处理记录
        const totalRecords = cells.length;
        const batchSize = MAX_RECORD_COUNT;
        const numBatches = Math.ceil(totalRecords / batchSize);
        const batchPromises: Promise<string[]>[] = [];

        for (let i = 0; i < numBatches; i++) {
            const subRecords = cells.slice(i * batchSize, (i + 1) * batchSize);
            batchPromises.push(this._table.addRecords(subRecords));
        }

        // 控制并发请求数量
        const result: string[] = [];
        for (let i = 0; i < batchPromises.length; i += MAX_CONCURRENT_REQUESTS) {
            const batch = batchPromises.slice(i, i + MAX_CONCURRENT_REQUESTS);
            const batchResults = await Promise.all(batch);
            batchResults.forEach(res => result.push(...res));
        }

        return result;
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
