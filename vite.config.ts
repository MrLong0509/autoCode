import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vitejs.dev/config/
export default defineConfig({
    base: "./", //请勿删除此语句，否则将导致部署失败
    plugins: [vue()],
    server: {
        host: "0.0.0.0",
    },
});
