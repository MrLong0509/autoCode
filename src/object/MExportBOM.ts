import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { MBitable } from "./MBitable";
import { INumberField, ISingleSelectField, ITextField } from "@lark-base-open/js-sdk";
import JSZip from "jszip";

interface RowData {
    箱体名称: string;
    箱体序号: number;
    箱体数量: number;
    存货编码: string;
    物料属性: string;
    小类: string;
    单件箱体设计用量: number;
    采购总量: number;
    设计量纲: string;
}

export class MExportBOM {
    private mBitable: MBitable | undefined = undefined;

    private boxNameField: ISingleSelectField | undefined = undefined;
    private boxSortNumField: INumberField | undefined = undefined;
    private boxNumField: INumberField | undefined = undefined;
    private materialCodeField: ITextField | undefined = undefined;
    private materialAttributes: ITextField | undefined = undefined;
    private subdivisionField: ITextField | undefined = undefined;
    private MaterialQuantity: INumberField | undefined = undefined;
    private procurementTotal: INumberField | undefined = undefined;
    private materialDimensional: ITextField | undefined = undefined;

    private recordIdsToGroupMap: Map<string, string[]> = new Map();

    async action(onProgress: (current: number, total: number) => void) {
        // 初始化 Bitable
        await this.initBitable();
        if (!this.mBitable) return;

        // 初始化字段
        await this.initFields();
        if (
            !this.boxNameField ||
            !this.boxSortNumField ||
            !this.boxNumField ||
            !this.materialCodeField ||
            !this.materialAttributes ||
            !this.subdivisionField ||
            !this.MaterialQuantity ||
            !this.procurementTotal ||
            !this.materialDimensional
        )
            return;

        // 构造箱体名称与 ID 映射表
        await this.initKeyMap();

        // 导出数据
        await this.exportRecordsToZip(onProgress);
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
        this.boxSortNumField = await this.mBitable.getNumberFieldByName("箱体序号");
        this.boxNumField = await this.mBitable.getNumberFieldByName("箱体数量");
        this.materialCodeField = await this.mBitable.getTextFieldByName("存货编码");
        this.materialAttributes = await this.mBitable.getTextFieldByName("物料属性（拼接）");
        this.subdivisionField = await this.mBitable.getTextFieldByName("小类");
        this.MaterialQuantity = await this.mBitable.getNumberFieldByName("单件箱体设计用量");
        this.procurementTotal = await this.mBitable.getNumberFieldByName("采购总量");
        this.materialDimensional = await this.mBitable.getTextFieldByName("设计量纲");

        console.timeEnd("initFields");
    }

    async initKeyMap() {
        console.time("initKeyMap");

        // 获取箱体名称的选项
        const boxNames = await this.boxNameField!.getOptions();

        // 清空原有的映射
        this.recordIdsToGroupMap.clear();

        // 使用 reduce 来构建映射
        this.recordIdsToGroupMap = boxNames.reduce((map, option) => {
            map.set(option.name, []);
            return map;
        }, new Map<string, string[]>());

        // 记录 ID 的数组和获取 box name 的所有 Promise
        const boxNamePromises = this.mBitable!.recordIds.map(recordId => this.boxNameField!.getValue(recordId));

        // 批量获取所有 box name 的值
        const boxNameResults = await Promise.all(boxNamePromises);

        // 将结果填充到 map 中
        for (let i = 0; i < this.mBitable!.recordIds.length; i++) {
            const boxName = boxNameResults[i].text; // 取出对应的 boxName
            this.recordIdsToGroupMap.get(boxName)?.push(this.mBitable!.recordIds[i]);
        }

        console.timeEnd("initKeyMap");
    }

    async exportRecordsToGroup(group_ids: string[] = []) {
        let fileNameNum = -1;
        const group: RowData[] = [];

        const getValueText = (value: any) => (value ? value[0].text : "");

        for (const rowId of group_ids) {
            // 批量获取字段的值
            const [
                boxSortNum,
                boxName,
                boxNum,
                materialCode,
                materialAttributes,
                subdivision,
                MaterialQuantity,
                procurementTotal,
                materialDimensional,
            ] = await Promise.all([
                this.boxSortNumField!.getValue(rowId),
                this.boxNameField!.getValue(rowId),
                this.boxNumField!.getValue(rowId),
                this.materialCodeField!.getValue(rowId),
                this.materialAttributes!.getValue(rowId),
                this.subdivisionField!.getValue(rowId),
                this.MaterialQuantity!.getValue(rowId),
                this.procurementTotal!.getValue(rowId),
                this.materialDimensional!.getValue(rowId),
            ]);

            // 构建行对象
            const row: RowData = {
                箱体名称: String(boxName.text),
                箱体序号: Number(boxSortNum),
                箱体数量: Number(boxNum),
                存货编码: String(getValueText(materialCode)),
                物料属性: String(getValueText(materialAttributes)),
                小类: String(getValueText(subdivision)),
                单件箱体设计用量: Number(MaterialQuantity) || 0,
                采购总量: Number(procurementTotal) || 0,
                设计量纲: String(getValueText(materialDimensional)),
            };

            fileNameNum = boxSortNum;
            group.push(row);
        }

        return { group, fileNameNum };
    }

    exportRecordsToXlsx(group: RowData[] = []) {
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

    async exportRecordsToZip(onProgress: (current: number, total: number) => void) {
        console.time("exportRecordsToZip");

        const zip = new JSZip(); // 创建一个新的 ZIP 对象
        let currentTotalFileNum = 0; // 用于计算当前进度

        // 计算有效的组的数量
        const validGroupCount = [...this.recordIdsToGroupMap.values()].filter(group_ids => group_ids.length > 0).length;

        // 开始导出数据
        await Promise.all(
            Array.from(this.recordIdsToGroupMap.entries()).map(async ([_key, group_ids]) => {
                // 导出当前组的数据到各个分组的 Excel 文件中
                const { group, fileNameNum } = await this.exportRecordsToGroup(group_ids);

                // 分组有数据时生成 Excel 文件并添加到 ZIP 文件中
                if (group.length > 0) {
                    currentTotalFileNum++;
                    const blob = this.exportRecordsToXlsx(group);
                    zip.file(`data${Number(fileNameNum)}.xlsx`, blob);

                    // 使用回调函数发射进度
                    onProgress(currentTotalFileNum, validGroupCount); // 使用有效组的数量
                }
            })
        );

        // 生成压缩包并下载
        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, "制造BOM.zip");

        console.timeEnd("exportRecordsToZip");
    }
}
