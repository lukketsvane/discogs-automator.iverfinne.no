const IMGBB_API_KEY = '20b536376630f4908f76ce53a80995a4';

export async function uploadToImgBB(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);

  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (!data.success) throw new Error('ImgBB upload failed');
  return data.data.display_url;
}

export async function uploadBase64ToImgBB(base64: string): Promise<string> {
  const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
  const formData = new FormData();
  formData.append('image', cleanBase64);

  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (!data.success) throw new Error('ImgBB upload failed');
  return data.data.display_url;
}
