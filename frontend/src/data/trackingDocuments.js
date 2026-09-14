const documentUrl = (id) => `https://docs.google.com/spreadsheets/d/${id}/edit?usp=drivesdk`;

export const TRACKING_DOCUMENT_OPTIONS = [
  { value: '', label: 'Sınıfa göre otomatik' },
  { value: 'yks-sayisal', label: 'YKS Sayısal Takip Dokümanı' },
  { value: 'yks-ea', label: 'YKS Eşit Ağırlık Takip Dokümanı' },
  { value: 'yks-sozel', label: 'YKS Sözel Takip Dokümanı' }
];

const TRACKING_DOCUMENTS = {
  'yks-sayisal': { label: 'YKS Sayısal Takip Dokümanı', url: documentUrl('1I644ea88QT-2s5Ow5DdnmSu2Wfhqvhf6us55M9IGMDU') },
  'yks-ea': { label: 'YKS Eşit Ağırlık Takip Dokümanı', url: documentUrl('1HhdjN1-ih-_m8uW4wgGzHLUk-z5iA42JcioCRtBo') },
  'yks-sozel': { label: 'YKS Sözel Takip Dokümanı', url: documentUrl('1Mmp_xSe7rKCscnM7o9qukKzwkD6fkEPxE4nnvUSckJo') },
  '12': { label: '12. Sınıf Takip Dokümanı', url: documentUrl('1oILZjIQ369s369NkrbQnnK0DDpx6owlaISDpyI1PDLo') },
  '11': { label: '11. Sınıf Takip Dokümanı', url: documentUrl('1PLraX9LZXgKxq51fnRJni0ZBldxvdakiTh-Ka9cg7LQ') },
  '10': { label: '10. Sınıf Takip Dokümanı', url: documentUrl('1NcmjgSZLJ6iue5kwxRz2ki9S7IXqO-WwH-LuZ-gwkOk') },
  '9': { label: '9. Sınıf Takip Dokümanı', url: documentUrl('1OF627AiFy3VcE-6_Knqe18pZRX-XaE_Ch3dPhL8muP8') },
  '8': { label: 'LGS Takip Dokümanı', url: documentUrl('1aEeA4zYRH_l20Xn8z4hvRxsPBnCg5OLixGkb2lfiLFM') },
  '7': { label: '7. Sınıf Takip Dokümanı', url: documentUrl('1Mqj7qgXlumzJtbqapbfvmaQHATyVYN-46xBYP1r3W3E') },
  '6': { label: '6. Sınıf Takip Dokümanı', url: documentUrl('1upaja0QjszFrdzDCtBRj8n_TlucshMLQSrvg7bc_JpA') },
  '5': { label: '5. Sınıf Takip Dokümanı', url: documentUrl('1Fm0Ka9ZYjYEvV6zhzyhRcK5__cg_ihn1kRyvmugGi1y0') }
};

export const getTrackingDocument = (className, trackingDocumentKey) => {
  const selectedKey = trackingDocumentKey || String(className || '').trim();
  return TRACKING_DOCUMENTS[selectedKey] || null;
};
