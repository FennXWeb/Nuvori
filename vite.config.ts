import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
const buildId = process.env.GITHUB_SHA || `local-${Date.now()}`;
export default defineConfig({
  plugins: [react(), { name: "nuvori-release", generateBundle() { this.emitFile({type:"asset",fileName:"version.json",source:JSON.stringify({id:buildId})}); }, configureServer(server) { server.middlewares.use("/version.json",(_req,res)=>{res.setHeader("Content-Type","application/json");res.end(JSON.stringify({id:buildId}));}); } }],
  define: { __BUILD_ID__: JSON.stringify(buildId) },
  base: "./",
  build: { chunkSizeWarningLimit: 750 },
});
