import {defineConfig} from "@playwright/test";
export default defineConfig({testDir:"./tests",fullyParallel:false,workers:1,retries:0,reporter:"line",use:{baseURL:"http://127.0.0.1:3000",trace:"retain-on-failure"},webServer:{command:"npm start -- -H 127.0.0.1 -p 3000",url:"http://127.0.0.1:3000",reuseExistingServer:false,timeout:120000}});
