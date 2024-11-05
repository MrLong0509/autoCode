import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { MBitable } from "./MBitable";
import { INumberField, IOpenSegment, IOpenSingleSelect, ISingleSelectField, ITextField } from "@lark-base-open/js-sdk";
import { el } from "element-plus/es/locales.mjs";

interface simpleRowData {
    存货编码: string;
    单件箱体设计用量: number | string;
}

const getValueText = (values: IOpenSegment[]) => (values ? values.map((item: IOpenSegment) => item.text) : []);

export class MExportBOMFromMapTable {
    private productPos: string = "";

    private mBitableBOMMAP: MBitable | undefined = undefined;
    private mBitableBOMBOX: MBitable | undefined = undefined;

    private materialCodeFieldInBOMBOX: ITextField | undefined = undefined;
    private materialQuantityFieldInBOMBOX: INumberField | undefined = undefined;
    private boxSortFieldInBOMBOX: INumberField | undefined = undefined;

    private boxCodeFieldInBOMMAP: ITextField | undefined = undefined;
    private boxSortFieldInBOMMAP: INumberField | undefined = undefined;
    private boxPosFieldInBOMMAP: ISingleSelectField | undefined = undefined;

    private recordIdsToBoxSortMap: Map<number, string[]> = new Map();
    private boxSortToBoxCodeMap: Map<string, number> = new Map();

    async action(productPos: string = "", onProgress: (current: number, total: number) => void) {
        this.productPos = productPos;
        if (!productPos) return;

        // 初始化 Bitable
        await this.initBitable();
        if (!this.mBitableBOMBOX || !this.mBitableBOMMAP) return;

        // 初始化字段
        if (await this.initFields()) return;

        // 构造箱体名称与 ID 映射表
        await this.initKeyMap();

        // 导出数据
        await this.exportRecords(onProgress);
    }

    async initBitable() {
        this.mBitableBOMBOX = new MBitable();
        await this.mBitableBOMBOX.initializeByTableIdAndViewId("tblJ6DVNyWUEDmCd", "vewBidE40k");
        this.mBitableBOMMAP = new MBitable();
        await this.mBitableBOMMAP.initializeByTableIdAndViewId("tblVoCjAWFt66b3O", "vew1nK3JO4");
    }

    async initFields() {
        console.time("initFields");

        // 获取制造BOM整体表格的字段
        this.boxSortFieldInBOMBOX = await this.mBitableBOMBOX!.getNumberFieldByName("箱体序号");
        this.materialCodeFieldInBOMBOX = await this.mBitableBOMBOX!.getTextFieldByName("存货编码");
        this.materialQuantityFieldInBOMBOX = await this.mBitableBOMBOX!.getNumberFieldByName("单件箱体设计用量");
        // 获取产品型号-BOM映射表的字段
        this.boxCodeFieldInBOMMAP = await this.mBitableBOMMAP!.getTextFieldByName("产品编码");
        this.boxSortFieldInBOMMAP = await this.mBitableBOMMAP!.getNumberFieldByName("BOM序号");
        this.boxPosFieldInBOMMAP = await this.mBitableBOMMAP!.getSingleSelectFieldByName("生产基地");

        console.timeEnd("initFields");

        return (
            !this.boxSortFieldInBOMBOX ||
            !this.materialQuantityFieldInBOMBOX ||
            !this.materialCodeFieldInBOMBOX ||
            !this.boxCodeFieldInBOMMAP ||
            !this.boxSortFieldInBOMMAP ||
            !this.boxPosFieldInBOMMAP
        );
    }

    async initKeyMap() {
        console.time("initKeyMap");

        // 清空原有的映射
        this.clearMappings();

        // 批量获取所有的值
        const [boxCodeInBOMMAPResults, boxsortInBOMMAPResults, boxPosInBOMMAPResults, boxSortInBOMBOXResults] =
            await this.fetchAllData();

        // 将结果填充到 map 中
        this.populateMaps(
            boxCodeInBOMMAPResults,
            boxsortInBOMMAPResults,
            boxPosInBOMMAPResults,
            boxSortInBOMBOXResults
        );

        console.timeEnd("initKeyMap");
    }

    // 清空原有的映射
    clearMappings() {
        this.recordIdsToBoxSortMap.clear();
        this.boxSortToBoxCodeMap.clear();
    }

    // 批量获取所有的值
    async fetchAllData() {
        const recordIdsInBOMMAP = this.mBitableBOMMAP!.recordIds;
        const boxCodeInBOMMAPPromise = recordIdsInBOMMAP.map(recordId => this.boxCodeFieldInBOMMAP!.getValue(recordId));
        const boxSortInBOMMAPPromise = recordIdsInBOMMAP.map(recordId => this.boxSortFieldInBOMMAP!.getValue(recordId));
        const boxPosInBOMMAPPromise = recordIdsInBOMMAP.map(recordId => this.boxPosFieldInBOMMAP!.getValue(recordId));

        const recordIdsInBOMBOX = this.mBitableBOMBOX!.recordIds;
        const boxSortInBOMBOXPromise = recordIdsInBOMBOX.map(recordId => this.boxSortFieldInBOMBOX!.getValue(recordId));

        return Promise.all([
            Promise.all(boxCodeInBOMMAPPromise),
            Promise.all(boxSortInBOMMAPPromise),
            Promise.all(boxPosInBOMMAPPromise),
            Promise.all(boxSortInBOMBOXPromise),
        ]);
    }

    // 将结果填充到 map 中
    populateMaps(
        boxCodeInBOMMAPResults: IOpenSegment[][],
        boxsortInBOMMAPResults: number[],
        boxPosInBOMMAPResults: IOpenSingleSelect[],
        boxSortInBOMBOXResults: number[]
    ) {
        const recordIdsInBOMBOX = this.mBitableBOMBOX!.recordIds;
        const recordIdsInBOMMAP = this.mBitableBOMMAP!.recordIds;

        // 处理 BOMBOX
        for (let i = 0; i < recordIdsInBOMBOX.length; i++) {
            const boxSortInBOMBOX = boxSortInBOMBOXResults[i];
            const recordIdInBOMBOX = recordIdsInBOMBOX[i];

            if (this.recordIdsToBoxSortMap.has(boxSortInBOMBOX)) {
                this.recordIdsToBoxSortMap.get(boxSortInBOMBOX)?.push(recordIdInBOMBOX);
            } else {
                this.recordIdsToBoxSortMap.set(boxSortInBOMBOX, [recordIdInBOMBOX]);
            }
        }

        // 处理 BOMMAP
        for (let i = 0; i < recordIdsInBOMMAP.length; i++) {
            const boxCodeInBOMMAP = getValueText(boxCodeInBOMMAPResults[i])[0];
            const boxSortInBOMMAP = boxsortInBOMMAPResults[i];
            const boxPosInBOMMAP = boxPosInBOMMAPResults[i].text;
            this.boxSortToBoxCodeMap.set(`${boxCodeInBOMMAP}/${boxPosInBOMMAP}`, boxSortInBOMMAP);
        }
    }

    async exportRecordsToGroup(boxCode: string, boxSort: number) {
        const group: simpleRowData[] = [];

        // 构建第一行数据
        group.push({
            存货编码: boxCode,
            单件箱体设计用量: "",
        });

        for (const rowId of this.recordIdsToBoxSortMap.get(boxSort) || []) {
            // 批量获取字段的值
            const [materialCode, materialQuantity] = await Promise.all([
                this.materialCodeFieldInBOMBOX!.getValue(rowId),
                this.materialQuantityFieldInBOMBOX!.getValue(rowId),
            ]);

            // 构建行对象
            const row: simpleRowData = {
                存货编码: String(getValueText(materialCode)),
                单件箱体设计用量: Number(materialQuantity) || 0,
            };

            group.push(row);
        }

        return group;
    }

    exportRecordsToXlsx(group: simpleRowData[] = []) {
        // 在所有数据处理完成后生成 Excel 文件
        const ws = XLSX.utils.json_to_sheet(group);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

        // 直接生成 Excel 文件的 Blob
        const blob = new Blob(
            [
                XLSX.write(wb, {
                    bookType: "xlsx",
                    type: "array",
                }),
            ],
            {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            }
        );

        return blob;
    }

    async exportRecords(onProgress: (current: number, total: number) => void) {
        console.time("exportRecordsToExcel");

        // 获取过滤后的数据
        const filteredData = Array.from(this.boxSortToBoxCodeMap.entries()).filter(
            ([key]) => key.split("/")[1] === this.productPos
        );

        // 初始化存储合并后的所有数据的数组和总计数
        const allGroups: simpleRowData[] = [];
        const totalCount = filteredData.length;
        let currentCount = 0;

        // 处理每个数据项并导出数据
        await Promise.all(
            filteredData.map(async ([key, boxSort]) => {
                const boxCode = key.split("/")[0];
                const group = await this.exportRecordsToGroup(boxCode, boxSort);
                allGroups.push(...group);
                onProgress(++currentCount, totalCount);
            })
        );

        // 生成 Excel 文件
        if (allGroups.length > 0) {
            const blob = this.exportRecordsToXlsx(allGroups);
            saveAs(blob, `${this.productPos}.xlsx`);
        }

        console.timeEnd("exportRecordsToExcel");
    }
}
