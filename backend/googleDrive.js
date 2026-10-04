const TEMPLATE_FILE_IDS = {
  'yks-sayisal': '15rAyRfyjF1ofiDffx5a6Ggg71qFRm9IP0T4MNPyLtf0',
  'yks-ea': '1osH3DDAcQeQ85hWxRhh605H7oMkWeRYXxSHImhO8Vms',
  'yks-sozel': '1xHpaurgDZe-scxI5GbahN5rKhp54IycSql72a0lpyNA',
  '12': '1PUv_5UTxQ5rgQHj0C4Z7W-t-VIPvr8pd5kR2edsXg_g',
  '11': '1MlpjUvCGv-cyN8fj4nQW5k_u8W68wvaiOHPFKcZFEhg',
  '10': '1LAaYrhU1PBQBbkiyp83WcBUziFZzsQzEdru6QMl5aQI',
  '9': '1Pr-LycOtC1NF06Mqj3iFAR-5CUc0ZaiBZNj3gzExOAY',
  '8': '1as8WSzeP3bWVypX1vhlyR-lNHizlEyUxqTSBvZyTBjE',
  '7': '131A-BUjoQSuo0fnIqiPczc5RmgNTc0Nh2XZoEW49ACI',
  '6': '1jedMnVTdC-J-MgxJ0Yq7B4PybkjLxgyztTavyFxm5zU',
  '5': '1qpRIjj48PkCmx0KPfi7vW3Y4cagaj4YXhv5zDathBRQ'
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
