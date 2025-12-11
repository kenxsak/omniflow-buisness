
'use server';

export async function uploadImageToImgBB(base64Data: string): Promise<string> {
  const apiKey = process.env.IMGBB_API_KEY;
  
  if (!apiKey) {
    throw new Error('IMGBB_API_KEY environment variable is not set');
  }

  if (!base64Data || !base64Data.startsWith('data:image')) {
    throw new Error('Invalid base64 data URI provided');
  }

  try {
    const base64Match = base64Data.match(/^data:image\/[a-zA-Z]+;base64,(.+)$/);
    if (!base64Match || !base64Match[1]) {
      throw new Error('Failed to extract base64 data from data URI');
    }

    const base64WithoutPrefix = base64Match[1];

    const formData = new URLSearchParams();
    formData.append('key', apiKey);
    formData.append('image', base64WithoutPrefix);

    const response = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ImgBB API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    if (!result.data || !result.data.url) {
      throw new Error('Invalid response from ImgBB API: missing URL');
    }

    return result.data.url;
  } catch (error) {
    console.error('Error uploading image to ImgBB:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to upload image to ImgBB: ${error.message}`);
    }
    throw new Error('Failed to upload image to ImgBB: Unknown error');
  }
}
