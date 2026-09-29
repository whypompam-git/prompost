// Thai banks with a best-effort mobile app URL scheme, for the owner's
// one-tap "pay" button. Schemes aren't a documented public API — some apps
// may not register theirs, or may change it — so this only ever opens the
// app (nothing is pre-filled); the account number is copied to the
// clipboard first so the owner just pastes it once inside the app.
export const THAI_BANKS: { name: string; scheme: string }[] = [
  { name: "กสิกรไทย (K PLUS)", scheme: "kplus://" },
  { name: "ไทยพาณิชย์ (SCB Easy)", scheme: "scbeasy://" },
  { name: "กรุงเทพ (Bualuang mBanking)", scheme: "bualuang://" },
  { name: "กรุงไทย (Krungthai NEXT)", scheme: "krungthainext://" },
  { name: "กรุงศรีอยุธยา (KMA)", scheme: "kma://" },
  { name: "ทหารไทยธนชาต (ttb touch)", scheme: "ttbtouch://" },
  { name: "ออมสิน (MyMo)", scheme: "mymo://" },
  { name: "ธ.ก.ส. (BAAC Mobile)", scheme: "baacmobile://" },
  { name: "ยูโอบี (TMRW by UOB)", scheme: "tmrwbyuob://" },
  { name: "ซีไอเอ็มบี (CIMB Thai)", scheme: "cimbthai://" },
];
