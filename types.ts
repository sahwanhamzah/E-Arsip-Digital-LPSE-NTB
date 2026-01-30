
export type KategoriSurat = 'Masuk' | 'Keluar';
export type StatusSurat = 'Proses' | 'Selesai' | 'Penting';
export type UserRole = 'Administrator' | 'User';

export interface User {
  username: string;
  fullName: string;
  role: UserRole;
  lastLogin: string;
}

export interface Surat {
  id: string;
  noSurat: string;
  kodeHal: string;
  perihal: string;
  pihak: string;
  tanggal: string; // Tanggal Arsip (Internal)
  tanggalSurat: string; // Tanggal yang tertera di dokumen
  tanggalTerima: string; // Tanggal dokumen diterima/dikirim
  kategori: KategoriSurat;
  status: StatusSurat;
  fileName?: string;
  fileData?: string; 
  fileType?: string;
  ttd?: string;
  isiRingkas?: string;
}

export interface Stats {
  total: number;
  masuk: number;
  keluar: number;
  proses: number;
}
