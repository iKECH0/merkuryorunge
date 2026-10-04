const TEMPLATE_FILE_IDS = {
  'yks-sayisal': '1l644ea88QT-2s5Ow5DdnmSu2Wfhqvhf6us55M9lGMDU',
  'yks-ea': '1HIhdjN1-ih-_-m8uW4wgZzHLUik-z5iA42JcioCRtBo',
  'yks-sozel': '1Mmp_xSe7rKCscnM7o9gukKzwkD6fkEPxE4nnvUScKJo',
  '12': '1olLZjIQ369s369NkrbQnnKODDpx6owIaISDpyl1PDLo',
  '11': '1PLraX9LZXgKxg51fnRJni0ZBldxvdakiTh-Ka9cg7LQ',
  '10': '1NcmjgSZLJ6iue5kwxRz2ki9S7lXqO-WwH-LuZ-gwkOk',
  '9': '10F627AiFy3VcE-6_Knge18pZRX-XaE_Ch3dPhL8muP8',
  '8': '1aEeA4zYRH_l20Xn8z4hvRxsPBnCg5OLixGkb2IfiLFM',
  '7': '1Mqj7qgXIumzJtbqapbfvmaQHATyVYN-46xBYPIr3W3E',
  '6': '1upajaQ0jszFrdzDCtBRj8n_TIucshMLQSrvq7bc_JpA',
  '5': '1Fm0Ka9ZYjYEvV6zhzyhRcK5__cg_ihn1kRyvmuGi1y0'
};

const isGoogleDriveConfigured = () => Boolean(
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_REFRESH_TOKEN
);

const resolveTemplateFileId = (className, trackingDocumentKey) => {
  const key = trackingDocumentKey && TEMPLATE_FILE_IDS[trackingDocumentKey]
    ? trackingDocumentKey
    : String(className || '').trim();
  return TEMPLATE_FILE_IDS[key] || null;
};

const getAccessToken = async () => {
  if (!isGoogleDriveConfigured()) {
    throw new Error('Google Drive bağlantısı henüz yapılandırılmadı.');
  }

  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    grant_type: 'refresh_token'
  });
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || 'Google erişim anahtarı alınamadı.');
  }
  return data.access_token;
};

const googleRequest = async (url, accessToken, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || 'Google Drive işlemi başarısız oldu.');
  }
  return data;
};

const createPersonalTrackingDocument = async ({
  fullName,
  googleEmail,
  className,
  trackingDocumentKey
}) => {
  const templateFileId = resolveTemplateFileId(className, trackingDocumentKey);
  if (!templateFileId) {
    throw new Error('Öğrencinin sınıfına uygun takip şablonu bulunamadı.');
  }
  if (!googleEmail) {
    throw new Error('Öğrencinin Google e-posta adresi gerekli.');
  }

  const accessToken = await getAccessToken();
  const metadata = { name: `${fullName} - Merkür Yörünge Takip Dokümanı` };
  if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
    metadata.parents = [process.env.GOOGLE_DRIVE_FOLDER_ID];
  }

  const copiedFile = await googleRequest(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(templateFileId)}/copy?supportsAllDrives=true&fields=id,name,webViewLink`,
    accessToken,
    { method: 'POST', body: JSON.stringify(metadata) }
  );

  await googleRequest(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(copiedFile.id)}/permissions?supportsAllDrives=true&sendNotificationEmail=true`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify({ type: 'user', role: 'writer', emailAddress: googleEmail })
    }
  );

  return {
    fileId: copiedFile.id,
    url: copiedFile.webViewLink || `https://docs.google.com/spreadsheets/d/${copiedFile.id}/edit`
  };
};

module.exports = {
  createPersonalTrackingDocument,
  isGoogleDriveConfigured,
  resolveTemplateFileId
};
