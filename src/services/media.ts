/** Decode and resize reference photos in the browser before sending bytes to Storage. */
export async function preparePhoto(file:File):Promise<File>{
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5242880)throw new Error('Choose a JPG, PNG or WebP image up to 5 MB.');
 const bitmap=await createImageBitmap(file);
 try{
  if(bitmap.width<=1280&&bitmap.height<=1280&&file.size<=500000)return file;
  const scale=Math.min(1,1280/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const context=canvas.getContext('2d');if(!context)throw new Error('Could not prepare this image');context.drawImage(bitmap,0,0,canvas.width,canvas.height);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('Could not prepare this image')),'image/webp',0.85));
  return new File([blob],'reference.webp',{type:blob.type});
 }finally{bitmap.close();}
}
