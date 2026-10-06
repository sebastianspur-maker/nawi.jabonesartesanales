import {get,put} from '@vercel/blob';
export async function readJSON(path){const blob=await get(path,{access:'private',useCache:false});if(!blob)return null;return JSON.parse(await new Response(blob.stream).text());}
export async function writeJSON(path,value){await put(path,JSON.stringify(value),{access:'private',addRandomSuffix:false,allowOverwrite:true,contentType:'application/json',cacheControlMaxAge:60});}
