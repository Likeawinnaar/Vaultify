import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { Readable, PassThrough } from "node:stream";
import { pipeline } from "node:stream/promises";
import { put, get, del } from "@vercel/blob";

const isVercel=Boolean(process.env.VERCEL);
const dataRoot=path.resolve(/*turbopackIgnore: true*/ process.env.VAULTIFY_DATA_DIR?.trim()||"./data");
const root=path.join(dataRoot,"files");
function validateStorageName(storageName:string):void{if(!/^[a-f0-9]{48}\.bin$/.test(storageName))throw new Error("Invalid storage identifier");}
function blobOptions(){const token=process.env.BLOB_READ_WRITE_TOKEN?.trim();return token?{token}:{};}
export function blobStorageConfigured():boolean{return !isVercel||Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim()||(process.env.VERCEL_OIDC_TOKEN?.trim()&&process.env.BLOB_STORE_ID?.trim()));}
export async function ensureStorage():Promise<void>{if(!isVercel)await fsp.mkdir(root,{recursive:true,mode:0o700});}
export function storagePath(storageName:string):string{validateStorageName(storageName);return path.join(root,storageName);}
export async function encryptUpload(stream:ReadableStream<Uint8Array>,storageName:string,key:Buffer):Promise<{iv:string;authTag:string;size:number}>{validateStorageName(storageName);const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv("aes-256-gcm",key,iv),counting=new PassThrough();let size=0;counting.on("data",chunk=>{size+=chunk.length;});if(isVercel){if(!blobStorageConfigured())throw new Error("Persistent Vercel Blob storage is not configured");const encrypted=Readable.fromWeb(stream as never).pipe(counting).pipe(cipher);await put(`vaultify/${storageName}`,encrypted,{access:"private",addRandomSuffix:false,...blobOptions()});}else{await ensureStorage();const temp=storagePath(storageName)+".tmp";try{await pipeline(Readable.fromWeb(stream as never),counting,cipher,fs.createWriteStream(temp,{mode:0o600}));await fsp.rename(temp,storagePath(storageName));}catch(error){await fsp.rm(temp,{force:true});throw error;}}return{iv:iv.toString("base64url"),authTag:cipher.getAuthTag().toString("base64url"),size};}
export async function removeStoredFile(storageName:string):Promise<void>{validateStorageName(storageName);if(isVercel){await del(`vaultify/${storageName}`,blobOptions());return;}await fsp.rm(storagePath(storageName),{force:true});}
export async function decryptedStream(storageName:string,iv:string,authTag:string,key:Buffer):Promise<ReadableStream<Uint8Array>>{validateStorageName(storageName);const decipher=crypto.createDecipheriv("aes-256-gcm",key,Buffer.from(iv,"base64url"));decipher.setAuthTag(Buffer.from(authTag,"base64url"));if(isVercel){const response=await get(`vaultify/${storageName}`,{access:"private",...blobOptions()});if(!response?.stream)throw new Error("Encrypted file not found");return Readable.toWeb(Readable.fromWeb(response.stream as never).pipe(decipher)) as ReadableStream<Uint8Array>;}return Readable.toWeb(fs.createReadStream(storagePath(storageName)).pipe(decipher)) as ReadableStream<Uint8Array>;}
export function masterKey():Buffer{const raw=process.env.VAULTIFY_MASTER_KEY;if(!raw)throw new Error("Vaultify is not configured: VAULTIFY_MASTER_KEY is missing");const key=Buffer.from(raw,"base64");if(key.length!==32)throw new Error("Vaultify master key must decode to exactly 32 bytes");return key;}
