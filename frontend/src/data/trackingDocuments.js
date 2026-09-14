const documentUrl = (id) => `https://docs.google.com/spreadsheets/d/${id}/edit?usp=drivesdk`;

export const TRACKING_DOCUMENT_OPTIONS = [
  { value: '', label: 'Sınıfa göre otomatik' },
  { value: 'yks-sayisal', label: 'YKS Sayısal Takip Dokümanı' },
  { value: 'yks-ea', label: 'YKS Eşit Ağırlık Takip Dokümanı' },
  { value: 'yks-sozel', label: 'YKS Sözel Takip Dokümanı' }
];

const TRACKING_DOCUMENTS = {
  'yks-sayisal': { label: 'YKS Sayısal Takip', url: documentUrl('1l644ea88QT-2s5Ow5DdnmSu2Wfhqvhf6us55M9lGMDU') },
  'yks-ea':      { label: 'YKS EA Takip',      url: documentUrl('1HIhdjN1-ih-_-m8uW4wgZzHLUik-z5iA42JcioCRtBo') },
  'yks-sozel':   { label: 'YKS Sözel Takip',   url: documentUrl('1Mmp_xSe7rKCscnM7o9gukKzwkD6fkEPxE4nnvUScKJo') },
  '12': { label: '12. Sınıf Takip Dokümanı', url: documentUrl('1olLZjIQ369s369NkrbQnnKODDpx6owIaISDpyl1PDLo') },
  '11': { label: '11. Sınıf Takip Dokümanı', url: documentUrl('1PLraX9LZXgKxg51fnRJni0ZBldxvdakiTh-Ka9cg7LQ') },
  '10': { label: '10. Sınıf Takip Dokümanı', url: documentUrl('1NcmjgSZLJ6iue5kwxRz2ki9S7lXqO-WwH-LuZ-gwkOk') },
  '9':  { label: '9. Sınıf Takip Dokümanı',  url: documentUrl('10F627AiFy3VcE-6_Knge18pZRX-XaE_Ch3dPhL8muP8') },
  '8':  { label: 'LGS Takip Dokümanı',        url: documentUrl('1aEeA4zYRH_l20Xn8z4hvRxsPBnCg5OLixGkb2IfiLFM') },
  '7':  { label: '7. Sınıf Takip Dokümanı',  url: documentUrl('1Mqj7qgXIumzJtbqapbfvmaQHATyVYN-46xBYPIr3W3E') },
  '6':  { label: '6. Sınıf Takip Dokümanı',  url: documentUrl('1upajaQ0jszFrdzDCtBRj8n_TIucshMLQSrvq7bc_JpA') },
  '5':  { label: '5. Sınıf Takip Dokümanı',  url: documentUrl('1Fm0Ka9ZYjYEvV6zhzyhRcK5__cg_ihn1kRyvmuGi1y0') }
};

export const getTrackingDocument = (className, trackingDocumentKey) => {
  // If a specific key is selected (e.g. yks-sayisal), use that
  if (trackingDocumentKey && TRACKING_DOCUMENTS[trackingDocumentKey]) {
    return TRACKING_DOCUMENTS[trackingDocumentKey];
  }
  // Otherwise fall back to class number
  const key = String(className || '').trim();
  return TRACKING_DOCUMENTS[key] || null;
};

