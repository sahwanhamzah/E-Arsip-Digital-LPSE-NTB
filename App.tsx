
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  LayoutDashboard, 
  FileCheck, 
  FileText, 
  Plus, 
  Search, 
  Menu, 
  X,
  Clock,
  Edit3,
  ShieldCheck,
  FileSpreadsheet,
  Printer,
  ChevronDown,
  Share2,
  Trash2,
  Eye,
  Bot,
  Loader2,
  Upload,
  Paperclip,
  File as FileIcon,
  LogOut,
  User as UserIcon,
  Lock,
  EyeOff,
  Building2,
  CheckCircle2,
  QrCode,
  Download,
  Settings,
  Database,
  CloudDownload,
  CloudUpload,
  RefreshCw,
  AlertTriangle,
  Filter,
  ChevronLeft,
  ChevronRight,
  Calendar,
  RotateCcw,
  TrendingUp,
  Activity
} from 'lucide-react';
import { Surat, KategoriSurat, StatusSurat, Stats, User, UserRole } from './types';
import { summarizeDocument } from './services/geminiService';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png', 'image/jpg'];

const CHART_DATA = [
  { name: 'Jan', masuk: 12, keluar: 8 },
  { name: 'Feb', masuk: 19, keluar: 12 },
  { name: 'Mar', masuk: 15, keluar: 22 },
  { name: 'Apr', masuk: 25, keluar: 18 },
  { name: 'Mei', masuk: 20, keluar: 15 },
];

const INITIAL_DATA: Surat[] = [
  { id: '1', noSurat: '001/LPSE-NTB/I/2024', kodeHal: '800.1.3', perihal: 'Undangan Rapat Koordinasi IT', pihak: 'Kominfo NTB', tanggal: '2024-01-15', tanggalSurat: '2024-01-10', tanggalTerima: '2024-01-15', kategori: 'Masuk', status: 'Selesai', ttd: 'Kepala Dinas', isiRingkas: 'Koordinasi teknis implementasi server baru.' },
];

const App: React.FC = () => {
  // Load initial data from localStorage if exists
  const [suratList, setSuratList] = useState<Surat[]>(() => {
    const saved = localStorage.getItem('lpse_earsip_data');
    return saved ? JSON.parse(saved) : INITIAL_DATA;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'semua' | 'masuk' | 'keluar' | 'system'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showReportDropdown, setShowReportDropdown] = useState(false);
  
  const [filterStatus, setFilterStatus] = useState<string>('Semua');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [selectedSurat, setSelectedSurat] = useState<Surat | null>(null);
  const [reportType, setReportType] = useState<'Semua' | 'Masuk' | 'Keluar'>('Semua');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState<Partial<Surat>>({
    noSurat: '', kodeHal: '', perihal: '', pihak: '',
    tanggal: today, tanggalSurat: today, tanggalTerima: today,
    kategori: 'Masuk', status: 'Proses', ttd: '',
    fileName: '', fileData: '', fileType: ''
  });

  // Save to localStorage whenever suratList changes
  useEffect(() => {
    localStorage.setItem('lpse_earsip_data', JSON.stringify(suratList));
  }, [suratList]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, startDate, endDate, activeTab]);

  const filteredList = useMemo(() => {
    if (activeTab === 'system') return [];
    return suratList.filter(s => {
      const categoryMatch = activeTab === 'dashboard' || activeTab === 'semua' || s.kategori.toLowerCase() === activeTab;
      const searchMatch = s.perihal.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.noSurat.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.pihak.toLowerCase().includes(searchTerm.toLowerCase());
      const statusMatch = filterStatus === 'Semua' || s.status === filterStatus;
      const dateMatch = (!startDate || s.tanggal >= startDate) && (!endDate || s.tanggal <= endDate);
      return categoryMatch && searchMatch && statusMatch && dateMatch;
    });
  }, [suratList, activeTab, searchTerm, filterStatus, startDate, endDate]);

  const totalPages = Math.ceil(filteredList.length / itemsPerPage);
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredList.slice(start, start + itemsPerPage);
  }, [filteredList, currentPage]);

  const stats: Stats = useMemo(() => ({
    total: suratList.length,
    masuk: suratList.filter(s => s.kategori === 'Masuk').length,
    keluar: suratList.filter(s => s.kategori === 'Keluar').length,
    proses: suratList.filter(s => s.status === 'Proses').length,
  }), [suratList]);

  const recentArchives = useMemo(() => {
    return [...suratList].sort((a, b) => b.id.localeCompare(a.id)).slice(0, 4);
  }, [suratList]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoginLoading(true);
    setTimeout(() => {
      if (loginForm.username === 'admin' && loginForm.password === 'admin123') {
        setCurrentUser({ username: 'admin', fullName: 'Administrator LPSE', role: 'Administrator', lastLogin: new Date().toLocaleString() });
      } else if (loginForm.username === 'staf' && loginForm.password === 'staf123') {
        setCurrentUser({ username: 'staf', fullName: 'Siti Rohana (Staf)', role: 'User', lastLogin: new Date().toLocaleString() });
      } else {
        setLoginError('Username atau password salah.');
      }
      setIsLoginLoading(false);
    }, 1000);
  };

  const handleLogout = () => setCurrentUser(null);

  const handleOpenAdd = () => {
    if (currentUser?.role !== 'Administrator') return;
    const defaultKategori: KategoriSurat = activeTab === 'keluar' ? 'Keluar' : 'Masuk';
    setFormData({ noSurat: '', kodeHal: '', perihal: '', pihak: '', tanggal: today, tanggalSurat: today, tanggalTerima: today, kategori: defaultKategori, status: 'Proses', ttd: '', fileName: '', fileData: '', fileType: '' });
    setSelectedSurat(null);
    setShowFormModal(true);
  };

  const handleEdit = (item: Surat) => {
    if (currentUser?.role !== 'Administrator') return;
    setFormData(item);
    setSelectedSurat(item);
    setShowFormModal(true);
  };

  const handleDelete = (id: string) => {
    if (currentUser?.role !== 'Administrator') return;
    if (window.confirm('Hapus arsip ini?')) {
      setSuratList(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = formData as Surat;
    if (selectedSurat) {
      setSuratList(prev => prev.map(s => s.id === selectedSurat.id ? { ...data, id: selectedSurat.id } : s));
    } else {
      setSuratList(prev => [{ ...data, id: Date.now().toString() }, ...prev]);
    }
    setShowFormModal(false);
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      {!currentUser ? (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative bg-slate-900">
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('https://storage.ntbprov.go.id/biropbj/media/kantor-gubernur-ntb.jpg')" }}>
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"></div>
          </div>
          <div className="w-full max-w-md bg-white rounded-[2.5rem] p-10 relative z-10 shadow-2xl">
            <div className="text-center mb-10">
              <div className="bg-yellow-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-yellow-500/20"><ShieldCheck className="text-slate-900" size={32} /></div>
              <h1 className="text-2xl font-black text-slate-900">E-Arsip LPSE NTB</h1>
              <p className="text-slate-500 text-sm font-medium">Silakan masuk untuk akses dasbor</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-5">
              {loginError && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold">{loginError}</div>}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Username</label>
                <input required type="text" className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none transition-all font-bold" value={loginForm.username} onChange={(e) => setLoginForm({...loginForm, username: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Password</label>
                <input required type="password" className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none transition-all font-bold" value={loginForm.password} onChange={(e) => setLoginForm({...loginForm, password: e.target.value})} />
              </div>
              <button disabled={isLoginLoading} type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold shadow-xl flex items-center justify-center gap-2 hover:bg-blue-900 transition-all">{isLoginLoading ? <Loader2 className="animate-spin" size={20}/> : 'Masuk Sekarang'}</button>
            </form>
          </div>
        </div>
      ) : (
        <>
          <aside className={`${isSidebarOpen ? 'w-72' : 'w-20'} bg-[#0F172A] transition-all duration-300 flex flex-col z-30 shadow-2xl no-print`}>
            <div className="p-6 flex items-center gap-4 border-b border-white/5">
              <div className="bg-[#EAB308] p-2 rounded-xl shrink-0"><ShieldCheck className="w-6 h-6 text-[#0F172A]" /></div>
              {isSidebarOpen && <div className="truncate"><h1 className="font-bold text-white text-lg">E-Arsip Digital</h1><span className="text-[10px] text-blue-400 uppercase tracking-widest font-bold">LPSE PROV NTB</span></div>}
            </div>
            <nav className="flex-1 px-3 mt-8 space-y-2">
              <SidebarLink icon={<LayoutDashboard />} label="Dashboard" active={activeTab === 'dashboard'} collapsed={!isSidebarOpen} onClick={() => setActiveTab('dashboard')} />
              <SidebarLink icon={<FileText />} label="Semua Arsip" active={activeTab === 'semua'} collapsed={!isSidebarOpen} onClick={() => setActiveTab('semua')} />
              <SidebarLink icon={<FileCheck />} label="Surat Masuk" active={activeTab === 'masuk'} collapsed={!isSidebarOpen} onClick={() => setActiveTab('masuk')} />
              <SidebarLink icon={<Share2 />} label="Surat Keluar" active={activeTab === 'keluar'} collapsed={!isSidebarOpen} onClick={() => setActiveTab('keluar')} />
              {currentUser.role === 'Administrator' && <SidebarLink icon={<Settings />} label="Sistem" active={activeTab === 'system'} collapsed={!isSidebarOpen} onClick={() => setActiveTab('system')} />}
            </nav>
            <div className="p-4 mt-auto">
              <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 bg-rose-500/10 text-rose-500 p-3 rounded-2xl font-bold text-sm hover:bg-rose-500 hover:text-white transition-all"><LogOut size={18}/> {isSidebarOpen && 'Logout'}</button>
            </div>
          </aside>

          <main className="flex-1 flex flex-col relative overflow-hidden">
            <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-20 no-print">
              <div className="flex items-center gap-4">
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><Menu size={20} /></button>
                <h2 className="text-xl font-bold text-slate-800 capitalize">{activeTab}</h2>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input type="text" placeholder="Cari arsip..." className="pl-10 pr-4 py-2 bg-slate-100 rounded-xl text-sm w-64 outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                {currentUser.role === 'Administrator' && (
                  <button onClick={handleOpenAdd} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold text-sm shadow-lg shadow-slate-200"><Plus size={18} /><span>Arsip Baru</span></button>
                )}
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-7xl mx-auto">
                {activeTab === 'dashboard' ? (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <StatCard label="Total Dokumen" value={stats.total} icon={<FileText />} color="text-blue-600" bg="bg-blue-100" />
                      <StatCard label="Masuk" value={stats.masuk} icon={<FileCheck />} color="text-emerald-600" bg="bg-emerald-100" />
                      <StatCard label="Keluar" value={stats.keluar} icon={<Share2 />} color="text-indigo-600" bg="bg-indigo-100" />
                      <StatCard label="Proses" value={stats.proses} icon={<Clock />} color="text-amber-600" bg="bg-amber-100" />
                    </div>
                    
                    <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Aktivitas Terakhir</h3>
                        <button onClick={() => setActiveTab('semua')} className="text-blue-600 text-sm font-bold">Lihat Semua</button>
                      </div>
                      <div className="divide-y divide-slate-50">
                        {recentArchives.map(item => (
                          <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-all">
                            <div className="flex items-center gap-4">
                              <div className={`p-3 rounded-xl ${item.kategori === 'Masuk' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                {item.kategori === 'Masuk' ? <FileCheck size={18}/> : <Share2 size={18}/>}
                              </div>
                              <div>
                                <p className="font-bold text-sm text-slate-800">{item.perihal}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">{item.noSurat} • {item.pihak}</p>
                              </div>
                            </div>
                            <button onClick={() => { setSelectedSurat(item); setShowDetailModal(true); }} className="p-2 text-slate-400 hover:text-blue-600"><Eye size={18}/></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : activeTab === 'system' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                      <div className="bg-blue-50 w-12 h-12 rounded-xl flex items-center justify-center text-blue-600 mb-6"><CloudDownload size={24}/></div>
                      <h4 className="font-bold text-slate-900 mb-2">Backup Data</h4>
                      <p className="text-slate-500 text-sm mb-6">Unduh semua data arsip dalam format JSON.</p>
                      <button onClick={() => {
                        const blob = new Blob([JSON.stringify(suratList, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url; a.download = 'backup_lpse.json'; a.click();
                      }} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold">Download Backup</button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                    <div className="p-4 overflow-x-auto">
                      <table className="w-full text-left border-separate border-spacing-y-2">
                        <thead>
                          <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                            <th className="px-4 py-2">Dokumen</th>
                            <th className="px-4 py-2">Pihak</th>
                            <th className="px-4 py-2">Tgl Dokumen</th>
                            <th className="px-4 py-2 text-center">Status</th>
                            <th className="px-4 py-2 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedList.map(item => (
                            <tr key={item.id} className="group hover:bg-slate-50 transition-all">
                              <td className="px-4 py-4 first:rounded-l-2xl border-y border-l border-transparent group-hover:border-slate-200">
                                <p className="font-bold text-sm text-slate-800 line-clamp-1">{item.perihal}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">{item.noSurat}</p>
                              </td>
                              <td className="px-4 py-4 border-y border-transparent group-hover:border-slate-200 text-sm font-semibold">{item.pihak}</td>
                              <td className="px-4 py-4 border-y border-transparent group-hover:border-slate-200 text-sm text-slate-500">{item.tanggalSurat}</td>
                              <td className="px-4 py-4 border-y border-transparent group-hover:border-slate-200 text-center"><StatusBadge status={item.status}/></td>
                              <td className="px-4 py-4 last:rounded-r-2xl border-y border-r border-transparent group-hover:border-slate-200 text-right">
                                <div className="flex justify-end gap-1">
                                  <button onClick={() => { setSelectedSurat(item); setShowDetailModal(true); }} className="p-2 text-slate-400 hover:text-blue-600"><Eye size={18}/></button>
                                  {currentUser.role === 'Administrator' && (
                                    <>
                                      <button onClick={() => handleEdit(item)} className="p-2 text-slate-400 hover:text-emerald-600"><Edit3 size={18}/></button>
                                      <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-rose-600"><Trash2 size={18}/></button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </main>
          
          {/* Form Modal */}
          {showFormModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                  <h3 className="text-xl font-bold">{selectedSurat ? 'Edit Arsip' : 'Tambah Arsip'}</h3>
                  <button onClick={() => setShowFormModal(false)}><X/></button>
                </div>
                <form onSubmit={handleFormSubmit} className="p-8 space-y-5 max-h-[80vh] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400">Perihal</label>
                      <input required className="w-full px-4 py-2.5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl outline-none font-bold text-sm" value={formData.perihal} onChange={e => setFormData({...formData, perihal: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400">No Surat</label>
                      <input required className="w-full px-4 py-2.5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl outline-none font-bold text-sm" value={formData.noSurat} onChange={e => setFormData({...formData, noSurat: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400">Pihak</label>
                      <input required className="w-full px-4 py-2.5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl outline-none font-bold text-sm" value={formData.pihak} onChange={e => setFormData({...formData, pihak: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400">Kategori</label>
                      <select className="w-full px-4 py-2.5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl outline-none font-bold text-sm" value={formData.kategori} onChange={e => setFormData({...formData, kategori: e.target.value as KategoriSurat})}>
                        <option value="Masuk">Masuk</option>
                        <option value="Keluar">Keluar</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400">Status</label>
                      <select className="w-full px-4 py-2.5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl outline-none font-bold text-sm" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as StatusSurat})}>
                        <option value="Proses">Proses</option>
                        <option value="Selesai">Selesai</option>
                        <option value="Penting">Penting</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400">Tgl Surat</label>
                      <input type="date" className="w-full px-4 py-2.5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl outline-none font-bold text-sm" value={formData.tanggalSurat} onChange={e => setFormData({...formData, tanggalSurat: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400">Tgl Terima</label>
                      <input type="date" className="w-full px-4 py-2.5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl outline-none font-bold text-sm" value={formData.tanggalTerima} onChange={e => setFormData({...formData, tanggalTerima: e.target.value})} />
                    </div>
                  </div>
                  <div className="pt-5 flex gap-3">
                    <button type="submit" className="flex-1 bg-slate-900 text-white py-3.5 rounded-2xl font-bold">Simpan Data</button>
                    <button type="button" onClick={() => setShowFormModal(false)} className="px-6 bg-slate-100 text-slate-600 rounded-2xl font-bold">Batal</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Detail Modal */}
          {showDetailModal && selectedSurat && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-slate-900">Rincian Arsip</h3>
                  <button onClick={() => setShowDetailModal(false)} className="text-slate-400"><X/></button>
                </div>
                <div className="space-y-4">
                  <DetailItem label="Perihal" value={selectedSurat.perihal}/>
                  <DetailItem label="Nomor" value={selectedSurat.noSurat}/>
                  <DetailItem label="Instansi" value={selectedSurat.pihak}/>
                  <div className="grid grid-cols-2 gap-4">
                    <DetailItem label="Tgl Surat" value={selectedSurat.tanggalSurat}/>
                    <DetailItem label="Tgl Terima" value={selectedSurat.tanggalTerima}/>
                  </div>
                  <DetailItem label="Status" value={selectedSurat.status}/>
                  <div className="pt-6">
                    <button onClick={() => setShowDetailModal(false)} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold">Tutup</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const SidebarLink: React.FC<{ icon: React.ReactNode, label: string, active: boolean, collapsed: boolean, onClick: () => void }> = ({ icon, label, active, collapsed, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 p-3.5 rounded-2xl transition-all ${active ? 'bg-yellow-500 text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
    {icon}
    {!collapsed && <span className="text-sm font-bold">{label}</span>}
  </button>
);

const StatCard: React.FC<{ label: string, value: number, icon: React.ReactNode, color: string, bg: string }> = ({ label, value, icon, color, bg }) => (
  <div className="bg-white p-6 rounded-3xl border border-slate-200 flex items-center gap-4">
    <div className={`${bg} ${color} p-3 rounded-2xl`}>{icon}</div>
    <div><p className="text-[10px] font-black uppercase text-slate-400">{label}</p><h4 className="text-2xl font-black text-slate-900">{value}</h4></div>
  </div>
);

const StatusBadge: React.FC<{ status: StatusSurat }> = ({ status }) => {
  const styles = { 'Selesai': 'bg-emerald-50 text-emerald-600', 'Penting': 'bg-rose-50 text-rose-600', 'Proses': 'bg-amber-50 text-amber-600' };
  return <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${styles[status]}`}>{status}</span>;
};

const DetailItem: React.FC<{ label: string, value: string }> = ({ label, value }) => (
  <div><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{label}</p><p className="font-bold text-slate-800">{value}</p></div>
);

export default App;
