import { MBitable } from "./MBitable";
import { ISingleSelectField } from "@lark-base-open/js-sdk";

export class MSlectedPos {
    private mBitable: MBitable | undefined = undefined;

    private boxProductPosField: ISingleSelectField | undefined = undefined;
    private _boxProductPosOptions: string[] = [];

    async action() {
        // 初始化 Bitable
        await this.initBitable();
        if (!this.mBitable) return;

        // 初始化字段
        await this.initFields();
        if (!this.boxProductPosField) return;

        // 构造箱体名称与 ID 映射表
        await this.getSlectedPos();
    }

    private async initBitable() {
        this.mBitable = new MBitable();
        await this.mBitable.initializeByTableIdAndViewId("tblVoCjAWFt66b3O", "vew1nK3JO4");
    }

    private async initFields() {
        console.time("initFields");

        if (!this.mBitable) return;

        // 获取箱体名称字段
        this.boxProductPosField = await this.mBitable.getSingleSelectFieldByName("生产基地");

        console.timeEnd("initFields");
    }

    private async getSlectedPos() {
        console.time("getSlectedPos");

        // 获取箱体名称的选项
        const options = await this.boxProductPosField!.getOptions();
        this._boxProductPosOptions = options.map(option => option.name);
        console.log("箱体名称选项:", this._boxProductPosOptions);

        console.timeEnd("getSlectedPos");
    }

    get boxProductPosOptions() {
        return this._boxProductPosOptions;
    }
}
