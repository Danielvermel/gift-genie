import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), "");

    return {
        base: '/',
        // Proxy API requests to Express backend during development
        server: {
            proxy: {
                "/api": {
                    target: "http://localhost:4000",
                    changeOrigin: true,
                },
            },
        },
        build: {
            outDir: 'dist',
        },
    };
});
