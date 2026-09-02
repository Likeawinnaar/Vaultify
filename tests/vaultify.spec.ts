import {test,expect} from "@playwright/test";
import {createClient} from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

const ADMIN_USER="vaultadmin",ADMIN_EMAIL="admin@example.invalid",ADMIN_PASSWORD="Vaultify-Test-Password-123!",USER_USER="normaluser",USER_EMAIL="user@example.invalid",USER_PASSWORD="Vaultify-User-Password-123!",USER_NEW_PASSWORD="Vaultify-New-Password-456!";
const dataDir=process.env.VAULTIFY_DATA_DIR||"/tmp/vaultify-e2e";

async function csrf(context:import("@playwright/test").BrowserContext){const response=await context.request.get("/api/auth/csrf");expect(response.ok()).toBeTruthy();return (await response.json()).token as string;}

test("Vaultify complete secure daily-user and admin flow",async({page,browser})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.goto("/");expect(page.url()).toMatch(/\/setup$/);
  await page.getByLabel("Website name").fill("Vaultify Test");await page.getByLabel("Username").fill(ADMIN_USER);await page.getByLabel("Email").fill(ADMIN_EMAIL);await page.getByLabel(/^Password /).fill(ADMIN_PASSWORD);await page.getByLabel("Confirm password").fill(ADMIN_PASSWORD);await page.getByLabel("Default quota (GB)").fill("1");await page.getByLabel("Max upload (GB)").fill("1");await page.getByRole("button",{name:"Create secure vault"}).click();await page.waitForURL(/\/dashboard$/);expect(await page.getByText("Your files").isVisible()).toBeTruthy();
  await page.goto("/setup");await page.waitForURL(/\/dashboard$/);expect(page.url()).not.toContain("/setup");
  await expect(page.getByRole("link",{name:"Admin"})).toBeVisible();

  const secret="This is Vaultify encrypted browser-test content.";
  await page.getByTestId("file-input").setInputFiles({name:"secret-note.txt",mimeType:"text/plain",buffer:Buffer.from(secret)});await expect(page.getByText("secret-note.txt")).toBeVisible();
  const row=page.locator("[data-file-id]",{hasText:"secret-note.txt"});const fileId=await row.getAttribute("data-file-id");expect(fileId).toBeTruthy();
  const stored=fs.readdirSync(path.join(dataDir,"files")).filter(name=>name.endsWith(".bin"));expect(stored.length).toBe(1);const encrypted=fs.readFileSync(path.join(dataDir,"files",stored[0]));expect(encrypted.includes(Buffer.from(secret))).toBeFalsy();
  const preview=await page.context().request.get(`/api/files/${fileId}?preview=1`);expect(preview.status()).toBe(200);expect((await preview.body()).toString()).toBe(secret);
  const downloadPromise=page.waitForEvent("download");await row.getByRole("link",{name:"Download"}).click();const download=await downloadPromise;expect(download.suggestedFilename()).toBe("secret-note.txt");expect(fs.readFileSync(await download.path()!,"utf8")).toBe(secret);
  page.once("dialog",dialog=>dialog.accept("renamed-note.txt"));await row.getByRole("button",{name:"Rename"}).click();await expect(page.getByText("renamed-note.txt")).toBeVisible();await page.getByLabel("File type").selectOption("images");await expect(page.getByText("No matching files")).toBeVisible();await page.getByLabel("File type").selectOption("documents");await expect(page.getByText("renamed-note.txt")).toBeVisible();await page.getByPlaceholder("Search files…").fill("renamed");await expect(page.getByText("renamed-note.txt")).toBeVisible();

  await page.goto("/admin");await expect(page.getByText("Admin dashboard")).toBeVisible();await page.getByRole("button",{name:/Users/}).click();await page.getByPlaceholder("Username").fill("extraadmin");await page.getByPlaceholder("Email").fill("extraadmin@example.invalid");await page.getByPlaceholder("Password (12+ characters)").fill("Extra-Admin-Password-123!");await page.getByPlaceholder("Confirm password").fill("Extra-Admin-Password-123!");await page.locator('select[name="role"]').selectOption("ADMIN");await page.getByRole("button",{name:"Create account"}).click();await page.waitForTimeout(700);await expect(page.getByText("extraadmin")).toBeVisible();

  const db=createClient({url:`file:${path.join(dataDir,"vaultify.db")}`});const primary=await db.execute("SELECT id FROM users WHERE is_primary=1");const primaryId=String(primary.rows[0]?.id||"");expect(primaryId).not.toBe("");const adminToken=await csrf(page.context());let response=await page.context().request.patch(`/api/admin/users/${primaryId}`,{headers:{"x-csrf-token":adminToken},data:{role:"USER"}});expect(response.status()).toBe(409);response=await page.context().request.patch(`/api/admin/users/${primaryId}`,{headers:{"x-csrf-token":adminToken},data:{status:"SUSPENDED"}});expect(response.status()).toBe(409);response=await page.context().request.delete(`/api/admin/users/${primaryId}`,{headers:{"x-csrf-token":adminToken}});expect(response.status()).toBe(409);

  const userContext=await browser.newContext();const userPage=await userContext.newPage();await userPage.goto("/register");await userPage.getByLabel("Username").fill(USER_USER);await userPage.getByLabel("Email").fill(USER_EMAIL);await userPage.getByLabel("Password").fill(USER_PASSWORD);await userPage.getByLabel("Confirm password").fill(USER_PASSWORD);await userPage.getByRole("button",{name:"Create account"}).click();await userPage.waitForURL(/\/dashboard$/);await expect(userPage.getByRole("link",{name:"Admin"})).toHaveCount(0);await userPage.goto("/admin");await userPage.waitForURL(/\/dashboard$/);expect(await userPage.getByText("Admin dashboard").count()).toBe(0);
  response=await userContext.request.get(`/api/files/${fileId}`);expect(response.status()).toBe(404);

  const second=await db.execute({sql:"SELECT id FROM users WHERE username=?",args:[USER_USER]});const secondId=String(second.rows[0]?.id||"");expect(secondId).not.toBe("");await page.goto("/admin");const token2=await csrf(page.context());response=await page.context().request.patch(`/api/admin/users/${secondId}`,{headers:{"x-csrf-token":token2},data:{quotaBytes:1}});expect(response.ok()).toBeTruthy();const userToken=await csrf(userContext);response=await userContext.request.post("/api/files",{headers:{"x-csrf-token":userToken},multipart:{file:{name:"too-big.txt",mimeType:"text/plain",buffer:Buffer.from("too big")}}});expect(response.status()).toBe(413);

  await userPage.goto("/account");await userPage.getByLabel("Current password").fill(USER_PASSWORD);await userPage.getByLabel("New password").fill(USER_NEW_PASSWORD);await userPage.getByLabel("Confirm new password").fill(USER_NEW_PASSWORD);await userPage.getByRole("button",{name:"Change password"}).click();await expect(userPage.getByText("Password changed securely")).toBeVisible();await userPage.getByRole("button",{name:"Sign out"}).click();await userPage.waitForURL(/\/login$/);await userPage.getByLabel("Username or email").fill(USER_USER);await userPage.getByLabel("Password").fill(USER_NEW_PASSWORD);await userPage.getByRole("button",{name:"Sign in"}).click();await userPage.waitForURL(/\/dashboard$/);

  await page.setViewportSize({width:390,height:844});await page.goto("/admin");await expect(page.locator("header select")).toBeVisible();const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth);expect(overflow).toBeFalsy();await page.setViewportSize({width:1440,height:900});

  await page.goto("/admin");const settingsToken=await csrf(page.context());response=await page.context().request.patch("/api/admin/settings",{headers:{"x-csrf-token":settingsToken},data:{websiteName:"Vaultify Test",logoUrl:"",defaultQuotaBytes:1073741824,maxUploadBytes:1073741824,publicRegistration:false,allowedExtensions:[],blockedExtensions:[]}});expect(response.ok()).toBeTruthy();const fresh=await browser.newContext();const freshPage=await fresh.newPage();await freshPage.goto("/register");await freshPage.waitForURL(/\/login$/);response=await fresh.request.post("/api/auth/register",{data:{username:"blockeduser",email:"blocked@example.invalid",password:"Blocked-User-Password-123!"}});expect(response.status()).toBe(403);await fresh.close();

  await page.goto("/dashboard");const renamedRow=page.locator("[data-file-id]",{hasText:"renamed-note.txt"});page.once("dialog",dialog=>dialog.accept());await renamedRow.getByRole("button",{name:"Delete"}).click();await expect(page.getByText("renamed-note.txt")).toHaveCount(0);expect(fs.readdirSync(path.join(dataDir,"files")).filter(name=>name.endsWith(".bin")).length).toBe(0);
  await userContext.close();await db.close();
});
