import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { MBitable } from "./MBitable";
import { INumberField, IOpenSegment, IOpenSingleSelect, ISingleSelectField, ITextField } from "@lark-base-open/js-sdk";

interface simpleRowData {
    存货编码: string;
    单件箱体设计用量: number | string;
}

const getValueText = (values: IOpenSegment[]) => (values ? values.map((item: IOpenSegment) => item.text) : []);

export class MExportBOMToOne {
    private mBitable: MBitable | undefined = undefined;

    private boxNameField: ISingleSelectField | undefined = undefined;
    private materialCodeField: ITextField | undefined = undefined;
    private materialQuantity: INumberField | undefined = undefined;
    private productPosField: ITextField | undefined = undefined;
    private productCodeField: ITextField | undefined = undefined;
    private productPos: string = "";

    private recordIdsToGroupMap: Map<string, string[]> = new Map();
    private recordIdsToProductCodeMap: Map<string, string[]> = new Map();

    async action(productPos: string = "") {
        this.productPos = productPos;
        if (!productPos) return;

        // 初始化 Bitable
        await this.initBitable();
        if (!this.mBitable) return;

        // 初始化字段
        await this.initFields();
        if (
            !this.boxNameField ||
            !this.productCodeField ||
            !this.materialCodeField ||
            !this.materialQuantity ||
            !this.productPosField
        )
            return;

        // 构造箱体名称与 ID 映射表
        await this.initKeyMap();

        // 导出数据
        await this.exportRecords();
    }

    async initBitable() {
        this.mBitable = new MBitable();
        await this.mBitable.initializeByTableIdAndViewId("tblJ6DVNyWUEDmCd", "vewBidE40k");
    }

    async initFields() {
        console.time("initFields");

        if (!this.mBitable) return;

        // 获取箱体名称字段
        this.boxNameField = await this.mBitable.getSingleSelectFieldByName("箱体名称");
        this.materialCodeField = await this.mBitable.getTextFieldByName("存货编码");
        this.materialQuantity = await this.mBitable.getNumberFieldByName("单件箱体设计用量");
        this.productCodeField = await this.mBitable.getTextFieldByName("产品编码");
        this.productPosField = await this.mBitable.getTextFieldByName("生产基地");

        console.timeEnd("initFields");
    }

    async initKeyMap() {
        console.time("initKeyMap");

        // 清空原有的映射
        this.clearMappings();

        // 使用 recordIdsToGroupMap 构建映射
        await this.buildGroupMap();

        // 批量获取所有的值
        const [boxNameResults, productCodeResults, productPosResults] = await this.fetchAllData();

        // 将结果填充到 map 中
        this.populateMaps(boxNameResults, productCodeResults, productPosResults);

        console.timeEnd("initKeyMap");
    }

    // 清空原有的映射
    clearMappings() {
        this.recordIdsToGroupMap.clear();
        this.recordIdsToProductCodeMap.clear();
    }

    // 使用 recordIdsToGroupMap 构建映射
    async buildGroupMap() {
        const boxNames = await this.boxNameField!.getOptions();
        this.recordIdsToGroupMap = new Map<string, string[]>(boxNames.map(option => [option.name, []]));
    }

    // 批量获取所有的值
    async fetchAllData() {
        const recordIds = this.mBitable!.recordIds; // 存储 recordIds，减少数组访问
        const boxNamePromises = recordIds.map(recordId => this.boxNameField!.getValue(recordId));
        const productCodesPromises = recordIds.map(recordId => this.productCodeField!.getValue(recordId));
        const productPosPromises = recordIds.map(recordId => this.productPosField!.getValue(recordId));

        return Promise.all([
            Promise.all(boxNamePromises),
            Promise.all(productCodesPromises),
            Promise.all(productPosPromises),
        ]);
    }

    // 将结果填充到 map 中
    populateMaps(
        boxNameResults: IOpenSingleSelect[],
        productCodeResults: IOpenSegment[][],
        productPosResults: IOpenSegment[][]
    ) {
        const recordIds = this.mBitable!.recordIds;

        for (let i = 0; i < recordIds.length; i++) {
            const boxName = boxNameResults[i].text; // 取出对应的 boxName
            const recordId = recordIds[i];

            // 将 recordId 添加到对应 boxName 的 groupIds 中
            const groupIds = this.recordIdsToGroupMap.get(boxName);
            if (groupIds) {
                groupIds.push(recordId);
            }

            // 获取 productPos 只调用一次
            const productPosArray = getValueText(productPosResults[i])[0].split("/");
            const productCodeArray = productCodeResults[i].filter(item => item.text !== ",");

            // 将 productCode 添加到 recordIdsToProductCodeMap 中
            for (let j = 0; j < productCodeArray.length; j++) {
                const productPos = productPosArray[j];
                const productCode = productCodeArray[j].text;
                this.recordIdsToProductCodeMap.set(`${productCode}/${productPos}`, groupIds || []);
            }
        }
    }

    async exportRecordsToGroup(productCode: string, group_ids: string[] = []) {
        const group: simpleRowData[] = [];

        // 构建第一行数据
        group.push({
            存货编码: productCode,
            单件箱体设计用量: "",
        });

        for (const rowId of group_ids) {
            // 批量获取字段的值
            const [materialCode, materialQuantity] = await Promise.all([
                this.materialCodeField!.getValue(rowId),
                this.materialQuantity!.getValue(rowId),
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

    async exportRecords() {
        console.time("exportRecordsToExcel");

        const allGroups: simpleRowData[] = []; // 用于存储合并后的所有数据

        // 开始导出数据
        await Promise.all(
            Array.from(this.recordIdsToProductCodeMap.entries()).map(async ([key, group_ids]) => {
                // 解析 key
                const productCode = key.split("/")[0];
                const productPos = key.split("/")[1];
                // console.log(`正在导出 ${productPos} 的数据`);

                if (group_ids.length !== 0 && productPos.includes(this.productPos)) {
                    // 导出当前组的数据
                    const group = await this.exportRecordsToGroup(productCode, group_ids);

                    // 合并到 allGroups 数组中
                    allGroups.push(...group);
                }
            })
        );

        // 生成 Excel 文件
        if (allGroups.length > 0) {
            const blob = this.exportRecordsToXlsx(allGroups); // 生成一个包含所有数据的 Excel 文件
            saveAs(blob, `${this.productPos}.xlsx`); // 直接保存单一 Excel 文件
        }

        console.timeEnd("exportRecordsToExcel");
    }
}
