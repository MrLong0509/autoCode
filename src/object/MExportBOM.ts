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

    private totalFileNum: number = 0;
    private fileCurrentNum: number = 0;

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
        await this.mBitable.initialize();
    }

    async initFields() {
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
    }

    async initKeyMap() {
        // 构造箱体名称与 ID 映射表
        const boxNames = await this.boxNameField!.getOptions();
        boxNames.forEach(option => {
            const ids: string[] = [];
            this.recordIdsToGroupMap.set(option.name, ids);
        });

        // 获取所有记录的 ID对应的箱体类型
        for (const recordId of this.mBitable!.recordIds) {
            const boxName = (await this.boxNameField!.getValue(recordId)).text;
            this.recordIdsToGroupMap.get(boxName)?.push(recordId);
        }
    }

    async exportRecordsToGroup(group_ids: string[] = []) {
        let fileNameNum = -1;
        const group: RowData[] = [];

        for (const rowId of group_ids) {
            const boxSortNum = await this.boxSortNumField!.getValue(rowId);
            const boxName = (await this.boxNameField!.getValue(rowId)).text;
            const boxNum = await this.boxNumField!.getValue(rowId);
            const materialCode = (await this.materialCodeField!.getValue(rowId))
                ? (await this.materialCodeField!.getValue(rowId))[0].text
                : "";
            const materialAttributes = (await this.materialAttributes!.getValue(rowId))
                ? (await this.materialAttributes!.getValue(rowId))[0].text
                : "";
            const subdivision = (await this.subdivisionField!.getValue(rowId))
                ? (await this.subdivisionField!.getValue(rowId))[0].text
                : "";
            const MaterialQuantity = await this.MaterialQuantity!.getValue(rowId);
            const procurementTotal = await this.procurementTotal!.getValue(rowId);
            const materialDimensional = (await this.materialDimensional!.getValue(rowId))
                ? (await this.materialDimensional!.getValue(rowId))[0].text
                : "";

            // 构建行对象
            const row = {
                箱体名称: String(boxName),
                箱体序号: Number(boxSortNum),
                箱体数量: Number(boxNum),
                存货编码: String(materialCode),
                物料属性: String(materialAttributes),
                小类: String(subdivision),
                单件箱体设计用量: Number(MaterialQuantity),
                采购总量: Number(procurementTotal),
                设计量纲: String(materialDimensional),
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

        // 生成 Excel 文件的二进制数据（ArrayBuffer）
        const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });

        // 将 ArrayBuffer 转换为 Blob
        const blob = new Blob([excelBuffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        return blob;
    }

    async exportRecordsToZip(onProgress: (current: number, total: number) => void) {
        const zip = new JSZip(); // 创建一个新的 ZIP 对象

        await Promise.all(
            Array.from(this.recordIdsToGroupMap.entries()).map(async ([_key, group_ids]) => {
                // 计算当前组的总文件数
                if (group_ids.length !== 0) this.totalFileNum++;

                // 导出当前组的数据到各个分组的 Excel 文件中
                const { group, fileNameNum } = await this.exportRecordsToGroup(group_ids);

                // 仅当当前组内有数据时才生成 Excel 文件并添加到 ZIP 文件中
                if (group.length > 0) {
                    // 计算当前文件序号
                    this.fileCurrentNum++;

                    // 生成 Excel 文件的 Blob
                    const blob = this.exportRecordsToXlsx(group);

                    // 使用回调函数发射进度
                    onProgress(this.fileCurrentNum, this.totalFileNum);

                    // 将 Blob 添加到 ZIP 文件中
                    zip.file(`data${Number(fileNameNum)}.xlsx`, blob);
                }
            })
        );

        // 生成压缩包并下载
        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, "制造BOM.zip");
    }
}
