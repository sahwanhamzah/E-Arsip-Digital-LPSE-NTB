
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
  Printer,
  ChevronDown,
  Share2,
  Trash2,
  Eye,
  Bot,
  Loader2,
  Upload,
  File as FileIcon,
  LogOut,
  User as UserIcon,
  Lock,
  EyeOff,
  QrCode,
  Download,
  Settings,
  Database,
  CloudDownload,
  CloudUpload,
  RefreshCw,
  TrendingUp,
  Activity,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';
import { Surat, KategoriSurat, StatusSurat, Stats, User } from './types';
import { summarizeDocument } from './services/geminiService';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
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
  // Persistence Logic with Error Handling to prevent blank screen
  const [suratList, setSuratList] = useState<Surat[]>(() => {
    try {
      const saved = localStorage.getItem('lpse_earsip_data');
      if (!saved) return INITIAL_DATA;
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : INITIAL_DATA;
    } catch (err) {
      console.error("Error loading data from localStorage:", err);
      return INITIAL_DATA;
    }
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

  // Sync to Storage
  useEffect(() => {
    localStorage.setItem('lpse_earsip_data', JSON.stringify(suratList));
  }, [suratList]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  const filteredList = useMemo(() => {
    if (activeTab === 'system') return [];
    return suratList.filter(s => {
      const categoryMatch = activeTab === 'dashboard' || activeTab === 'semua' || s.kategori.toLowerCase() === activeTab;
      const searchMatch = s.perihal?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          s.noSurat?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.pihak?.toLowerCase().includes(searchTerm.toLowerCase());
      return categoryMatch && searchMatch;
    });
  }, [suratList, activeTab, searchTerm]);

  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        alert('Format file tidak didukung (Gunakan PDF/Gambar).');
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        alert('File terlalu besar (Maks 10MB).');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, fileName: file.name, fileType: file.type, fileData: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          if (window.confirm('Pulihkan data dari file cadangan? Data saat ini akan diganti.')) {
            setSuratList(json);
            alert('Restorasi berhasil!');
          }
        }
      } catch (err) { alert('Gagal membaca file backup.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleOpenAdd = () => {
    if (currentUser?.role !== 'Administrator') return;
    const defaultKategori: KategoriSurat = activeTab === 'keluar' ? 'Keluar' : 'Masuk';
    setFormData({ 
      noSurat: '', kodeHal: '', perihal: '', pihak: '', 
      tanggal: today, tanggalSurat: today, tanggalTerima: today, 
      kategori: defaultKategori, status: 'Proses', ttd: '', 
      fileName: '', fileData: '', fileType: '' 
    });
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
    if (window.confirm('Hapus arsip ini secara permanen?')) {
      setSuratList(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let data = { ...formData } as Surat;
    
    // Auto-summarize with AI if it's a new entry
    if (!selectedSurat && data.perihal && data.pihak) {
      data.isiRingkas = await summarizeDocument(data.perihal, data.pihak);
    }

    if (selectedSurat) {
      setSuratList(prev => prev.map(s => s.id === selectedSurat.id ? { ...data, id: selectedSurat.id } : s));
    } else {
      setSuratList(prev => [{ ...data, id: Date.now().toString() }, ...prev]);
    }
    setShowFormModal(false);
  };

  const handleGenerateReport = (type: 'Semua' | 'Masuk' | 'Keluar') => {
    setReportType(type);
    setShowReportDropdown(false);
    setShowPrintPreview(true);
  };

  // --- Auth Render ---
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative bg-slate-900">
        <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: "url('https://storage.ntbprov.go.id/biropbj/media/kantor-gubernur-ntb.jpg')" }}></div>
        <div className="w-full max-w-md bg-white rounded-[2.5rem] p-10 relative z-10 shadow-2xl animate-in zoom-in-95 duration-500">
          <div className="text-center mb-8">
            <div className="bg-yellow-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl"><ShieldCheck className="text-slate-900" size={32} /></div>
            <h1 className="text-2xl font-black text-slate-900">E-Arsip Digital</h1>
            <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">LPSE PROV NTB</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            {loginError && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold text-center border border-red-100">{loginError}</div>}
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Username</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input required type="text" className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none transition-all font-bold" value={loginForm.username} onChange={(e) => setLoginForm({...loginForm, username: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1 mb-1 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input required type={showPassword ? 'text' : 'password'} className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none transition-all font-bold" value={loginForm.password} onChange={(e) => setLoginForm({...loginForm, password: e.target.value})} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                  {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
              </div>
            </div>
            <button disabled={isLoginLoading} type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold shadow-xl hover:bg-blue-900 transition-all flex items-center justify-center gap-3">
              {isLoginLoading ? <Loader2 className="animate-spin" size={20}/> : 'Masuk Dasbor'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- Main App Render ---
  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      {/* Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-72' : 'w-20'} bg-[#0F172A] transition-all duration-300 flex flex-col z-30 shadow-2xl no-print`}>
        <div className="p-6 flex items-center gap-4 border-b border-white/5">
          <div className="bg-[#EAB308] p-2 rounded-xl shrink-0"><ShieldCheck className="w-6 h-6 text-[#0F172A]" /></div>
          {isSidebarOpen && <div className="truncate"><h1 className="font-bold text-white text-lg">E-Arsip</h1><span className="text-[10px] text-blue-400 uppercase tracking-widest font-bold">LPSE NTB</span></div>}
        </div>
        <nav className="flex-1 px-3 mt-8 space-y-2">
          <SidebarLink icon={<LayoutDashboard />} label="Dashboard" active={activeTab === 'dashboard'} collapsed={!isSidebarOpen} onClick={() => setActiveTab('dashboard')} />
          <SidebarLink icon={<FileText />} label="Semua Arsip" active={activeTab === 'semua'} collapsed={!isSidebarOpen} onClick={() => setActiveTab('semua')} />
          <SidebarLink icon={<FileCheck />} label="Surat Masuk" active={activeTab === 'masuk'} collapsed={!isSidebarOpen} onClick={() => setActiveTab('masuk')} />
          <SidebarLink icon={<Share2 />} label="Surat Keluar" active={activeTab === 'keluar'} collapsed={!isSidebarOpen} onClick={() => setActiveTab('keluar')} />
          {currentUser.role === 'Administrator' && <SidebarLink icon={<Settings />} label="Sistem" active={activeTab === 'system'} collapsed={!isSidebarOpen} onClick={() => setActiveTab('system')} />}
        </nav>
        <div className="p-4 mt-auto">
          <button onClick={() => setCurrentUser(null)} className="w-full flex items-center justify-center gap-2 bg-rose-500/10 text-rose-500 p-3 rounded-2xl font-bold text-sm hover:bg-rose-500 hover:text-white transition-all">
            <LogOut size={18}/> {isSidebarOpen && 'Logout'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-20 no-print">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"><Menu size={20} /></button>
            <h2 className="text-xl font-bold text-slate-800 capitalize tracking-tight">{activeTab}</h2>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-blue-500" />
              <input type="text" placeholder="Cari arsip..." className="pl-10 pr-4 py-2 bg-slate-100 rounded-xl text-sm w-64 outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>

            {/* Tombol Laporan */}
            <div className="relative">
               <button onClick={() => setShowReportDropdown(!showReportDropdown)} className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-slate-50 transition-all font-bold text-sm">
                 <Printer size={18} /><span>Laporan</span><ChevronDown size={14} />
               </button>
               {showReportDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-2xl py-2 z-[60] animate-in fade-in slide-in-from-top-2">
                     <button onClick={() => handleGenerateReport('Semua')} className="w-full text-left px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3"><FileText size={16} className="text-blue-500" /> Semua Arsip</button>
                     <button onClick={() => handleGenerateReport('Masuk')} className="w-full text-left px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3"><FileCheck size={16} className="text-emerald-500" /> Surat Masuk</button>
                     <button onClick={() => handleGenerateReport('Keluar')} className="w-full text-left px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3"><Share2 size={16} className="text-indigo-500" /> Surat Keluar</button>
                  </div>
               )}
            </div>

            {currentUser.role === 'Administrator' && (
              <button onClick={handleOpenAdd} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold text-sm shadow-xl shadow-slate-200 hover:bg-blue-900 transition-colors">
                <Plus size={18} /><span>Arsip Baru</span>
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 no-print">
          <div className="max-w-7xl mx-auto space-y-8">
            {activeTab === 'dashboard' ? (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <StatCard label="Total Dokumen" value={stats.total} icon={<FileText />} color="text-blue-600" bg="bg-blue-100" />
                  <StatCard label="Masuk" value={stats.masuk} icon={<FileCheck />} color="text-emerald-600" bg="bg-emerald-100" />
                  <StatCard label="Keluar" value={stats.keluar} icon={<Share2 />} color="text-indigo-600" bg="bg-indigo-100" />
                  <StatCard label="Proses" value={stats.proses} icon={<Clock />} color="text-amber-600" bg="bg-amber-100" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm h-[400px]">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><TrendingUp size={20} className="text-blue-500" /> Statistik Bulanan</h3>
                    <div className="h-full w-full pb-10">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={CHART_DATA}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                          <Tooltip />
                          <Area type="monotone" dataKey="masuk" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={3} />
                          <Area type="monotone" dataKey="keluar" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={3} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white flex flex-col justify-center relative overflow-hidden group">
                    <Bot className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform" size={160} />
                    <div className="relative z-10">
                      <div className="bg-blue-500 w-10 h-10 rounded-xl flex items-center justify-center mb-4"><Bot size={20}/></div>
                      <h4 className="font-bold text-lg mb-2">AI Data Insight</h4>
                      <p className="text-slate-400 text-sm leading-relaxed">Sistem mendeteksi kenaikan 15% pada volume surat masuk minggu ini. Prioritaskan verifikasi berkas SIKAP yang masuk.</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTab === 'system' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                  <div className="bg-blue-50 w-12 h-12 rounded-xl flex items-center justify-center text-blue-600 mb-6"><CloudDownload size={24}/></div>
                  <h4 className="font-bold text-slate-900 mb-2">Ekspor Database</h4>
                  <p className="text-slate-500 text-sm mb-6">Unduh cadangan data untuk keperluan arsip fisik atau pindah perangkat.</p>
                  <button onClick={() => {
                    const blob = new Blob([JSON.stringify(suratList, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = `backup_earsip_lpse_${today}.json`; a.click();
                  }} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3">
                    <Download size={20}/> Download JSON
                  </button>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                  <div className="bg-emerald-50 w-12 h-12 rounded-xl flex items-center justify-center text-emerald-600 mb-6"><CloudUpload size={24}/></div>
                  <h4 className="font-bold text-slate-900 mb-2">Pulihkan Data</h4>
                  <p className="text-slate-500 text-sm mb-6">Unggah file backup (.json) untuk mengembalikan data yang pernah dicadangkan.</p>
                  <button onClick={() => restoreInputRef.current?.click()} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3">
                    <RefreshCw size={20}/> Unggah Backup
                  </button>
                  <input type="file" ref={restoreInputRef} className="hidden" accept=".json" onChange={handleRestore} />
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto p-4">
                  <table className="w-full text-left border-separate border-spacing-y-2">
                    <thead>
                      <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-4">
                        <th className="px-6 py-3">Rincian Dokumen</th>
                        <th className="px-6 py-3">Pihak/Instansi</th>
                        <th className="px-6 py-3">Tgl Dokumen</th>
                        <th className="px-6 py-3 text-center">Status</th>
                        <th className="px-6 py-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedList.map(item => (
                        <tr key={item.id} className="group hover:bg-slate-50 transition-all">
                          <td className="px-6 py-4 first:rounded-l-2xl border-y border-l border-transparent group-hover:border-slate-200">
                            <p className="font-bold text-sm text-slate-800 line-clamp-1">{item.perihal}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{item.noSurat}</p>
                          </td>
                          <td className="px-6 py-4 border-y border-transparent group-hover:border-slate-200 text-sm font-semibold text-slate-600">{item.pihak}</td>
                          <td className="px-6 py-4 border-y border-transparent group-hover:border-slate-200 text-sm text-slate-500">{item.tanggalSurat}</td>
                          <td className="px-6 py-4 border-y border-transparent group-hover:border-slate-200 text-center"><StatusBadge status={item.status}/></td>
                          <td className="px-6 py-4 last:rounded-r-2xl border-y border-r border-transparent group-hover:border-slate-200 text-right">
                            <div className="flex justify-end gap-2">
                              <button onClick={() => { setSelectedSurat(item); setShowDetailModal(true); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Eye size={18}/></button>
                              {currentUser.role === 'Administrator' && (
                                <>
                                  <button onClick={() => handleEdit(item)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"><Edit3 size={18}/></button>
                                  <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={18}/></button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {filteredList.length > itemsPerPage && (
                    <div className="p-6 border-t border-slate-100 flex justify-between items-center">
                      <p className="text-xs font-bold text-slate-400">Hal {currentPage} dari {totalPages}</p>
                      <div className="flex gap-2">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 border border-slate-200 rounded-xl disabled:opacity-30"><ChevronLeft size={18}/></button>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-2 border border-slate-200 rounded-xl disabled:opacity-30"><ChevronRight size={18}/></button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Form */}
        {showFormModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden">
              <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                <div className="flex items-center gap-3"><Plus size={20}/><h3 className="text-xl font-bold">{selectedSurat ? 'Edit Arsip' : 'Tambah Arsip Baru'}</h3></div>
                <button onClick={() => setShowFormModal(false)} className="p-2 hover:bg-white/10 rounded-xl"><X/></button>
              </div>
              <form onSubmit={handleFormSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Perihal / Judul Surat</label>
                    <input required className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold text-sm" value={formData.perihal} onChange={e => setFormData({...formData, perihal: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nomor Surat</label>
                    <input required className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold text-sm" value={formData.noSurat} onChange={e => setFormData({...formData, noSurat: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Instansi Terkait</label>
                    <input required className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold text-sm" value={formData.pihak} onChange={e => setFormData({...formData, pihak: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Kategori</label>
                    <select className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold text-sm" value={formData.kategori} onChange={e => setFormData({...formData, kategori: e.target.value as KategoriSurat})}>
                      <option value="Masuk">Surat Masuk</option>
                      <option value="Keluar">Surat Keluar</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Status Dokumen</label>
                    <select className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold text-sm" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as StatusSurat})}>
                      <option value="Proses">Dalam Proses</option>
                      <option value="Selesai">Selesai / Diarsipkan</option>
                      <option value="Penting">Segera / Penting</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Tanggal Surat</label>
                    <input type="date" className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold text-sm" value={formData.tanggalSurat} onChange={e => setFormData({...formData, tanggalSurat: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Tanggal Terima</label>
                    <input type="date" className="w-full px-5 py-3.5 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none font-bold text-sm" value={formData.tanggalTerima} onChange={e => setFormData({...formData, tanggalTerima: e.target.value})} />
                  </div>

                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Lampiran Digital (Maks 10MB)</label>
                    {!formData.fileData ? (
                       <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center bg-slate-50 cursor-pointer hover:bg-slate-100 transition-all group">
                         <Upload className="text-slate-300 mb-2 group-hover:text-blue-500 transition-colors" />
                         <p className="text-sm font-bold text-slate-400">Klik untuk pilih file (PDF/JPG/PNG)</p>
                         <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.docx,.jpg,.jpeg,.png" onChange={handleFileChange} />
                       </div>
                    ) : (
                       <div className="p-4 bg-blue-50 rounded-2xl flex items-center justify-between border border-blue-100">
                         <div className="flex items-center gap-3">
                           <FileIcon size={20} className="text-blue-500" />
                           <span className="text-sm font-bold text-blue-900 truncate max-w-[400px]">{formData.fileName}</span>
                         </div>
                         <button type="button" onClick={() => setFormData({...formData, fileData: '', fileName: ''})} className="text-rose-500 hover:bg-white p-1.5 rounded-lg transition-all"><X size={18}/></button>
                       </div>
                    )}
                  </div>
                </div>
                <div className="pt-4 flex gap-4">
                  <button type="submit" className="flex-1 bg-slate-900 text-white py-4 rounded-[1.5rem] font-bold shadow-xl hover:bg-blue-900 transition-all">Simpan Arsip</button>
                  <button type="button" onClick={() => setShowFormModal(false)} className="px-8 bg-slate-100 text-slate-600 rounded-[1.5rem] font-bold hover:bg-slate-200 transition-all">Batal</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Detail */}
        {showDetailModal && selectedSurat && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl p-10 overflow-hidden">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Rincian Dokumen</h3>
                <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:bg-slate-50 p-2 rounded-xl"><X/></button>
              </div>
              <div className="space-y-5">
                <DetailItem label="Perihal" value={selectedSurat.perihal} full/>
                <div className="grid grid-cols-2 gap-6">
                  <DetailItem label="Nomor Surat" value={selectedSurat.noSurat}/>
                  <DetailItem label="Instansi" value={selectedSurat.pihak}/>
                  <DetailItem label="Tgl Surat" value={selectedSurat.tanggalSurat}/>
                  <DetailItem label="Tgl Terima" value={selectedSurat.tanggalTerima}/>
                  <DetailItem label="Status" value={selectedSurat.status} isStatus/>
                  <DetailItem label="Kategori" value={selectedSurat.kategori}/>
                </div>
                <div className="mt-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <p className="text-[10px] font-black uppercase text-blue-400 mb-1">Ringkasan AI</p>
                  <p className="text-sm font-medium text-blue-900 leading-relaxed italic">"{selectedSurat.isiRingkas || 'Sedang memproses ringkasan...'}"</p>
                </div>
                {selectedSurat.fileData && (
                  <button onClick={() => {
                    const link = document.createElement('a');
                    link.href = selectedSurat.fileData!;
                    link.download = selectedSurat.fileName!;
                    link.click();
                  }} className="w-full flex items-center justify-center gap-2 bg-emerald-50 text-emerald-600 py-3 rounded-2xl font-bold text-sm hover:bg-emerald-600 hover:text-white transition-all">
                    <Download size={18}/> Download Lampiran
                  </button>
                )}
                <div className="pt-6">
                  <button onClick={() => setShowDetailModal(false)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl">Tutup Detail</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Print Preview */}
        {showPrintPreview && (
           <div className="fixed inset-0 z-[200] bg-slate-900/95 flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white w-full max-w-5xl h-[95vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden">
                 <div className="p-6 bg-[#0F172A] text-white flex justify-between items-center no-print">
                    <div className="flex items-center gap-4"><Printer className="text-yellow-500" size={24}/><h3 className="text-xl font-bold">Cetak Laporan: {reportType}</h3></div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => window.print()} className="bg-yellow-500 text-slate-900 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-yellow-400">
                        <Printer size={18} /><span>Cetak Sekarang</span>
                      </button>
                      <button onClick={() => setShowPrintPreview(false)} className="bg-white/10 p-2.5 rounded-xl hover:bg-white/20 transition-all"><X size={20}/></button>
                    </div>
                 </div>
                 <div className="flex-1 overflow-y-auto p-12 bg-slate-100 flex justify-center">
                    <div className="bg-white w-[210mm] min-h-[297mm] p-16 flex flex-col text-black shadow-lg">
                       <div className="flex items-center gap-6 border-b-[3px] border-black pb-4 mb-8">
                          <div className="w-20 h-20 bg-slate-200 border-2 border-black flex items-center justify-center text-[8px] font-bold text-center p-2">LOGO PROV NTB</div>
                          <div className="text-center flex-1">
                             <h4 className="text-lg font-bold uppercase leading-tight">Pemerintah Provinsi Nusa Tenggara Barat</h4>
                             <h4 className="text-xl font-black uppercase">Biro Pengadaan Barang dan Jasa</h4>
                             <p className="text-sm font-bold">Layanan Pengadaan Secara Elektronik (LPSE)</p>
                          </div>
                          <div className="w-20 h-20 border-2 border-black flex items-center justify-center"><QrCode size={50}/></div>
                       </div>
                       <h5 className="text-center font-black text-lg underline mb-8 uppercase">LAPORAN ARSIP DIGITAL {reportType !== 'Semua' ? `SURAT ${reportType.toUpperCase()}` : 'SEMUA SURAT'}</h5>
                       <table className="w-full border-collapse border-2 border-black text-[10px]">
                          <thead className="bg-slate-100 font-black uppercase">
                             <tr>
                                <th className="border-2 border-black p-2 text-center w-8">No</th>
                                <th className="border-2 border-black p-2 text-center">Nomor Surat</th>
                                <th className="border-2 border-black p-2 text-center">Tanggal</th>
                                <th className="border-2 border-black p-2 text-left">Perihal</th>
                                <th className="border-2 border-black p-2 text-left">Instansi</th>
                             </tr>
                          </thead>
                          <tbody>
                             {(reportType === 'Semua' ? suratList : suratList.filter(s => s.kategori === reportType)).map((s, idx) => (
                                <tr key={s.id}>
                                   <td className="border-2 border-black p-2 text-center">{idx + 1}</td>
                                   <td className="border-2 border-black p-2 text-center font-bold">{s.noSurat}</td>
                                   <td className="border-2 border-black p-2 text-center">{s.tanggalSurat}</td>
                                   <td className="border-2 border-black p-2 font-semibold">{s.perihal}</td>
                                   <td className="border-2 border-black p-2">{s.pihak}</td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                       <div className="mt-12 flex justify-end text-center">
                          <div className="w-64">
                             <p className="text-xs font-bold mb-1">Mataram, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                             <p className="text-xs font-bold uppercase mb-16">Kepala LPSE Prov. NTB</p>
                             <p className="text-xs font-black uppercase underline">LALU MAJEMUK, S.Sos.</p>
                             <p className="text-[10px] font-bold">NIP. 19800101 200501 1 001</p>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        )}
      </main>
    </div>
  );
};

// --- Sub-Components ---
const SidebarLink: React.FC<{ icon: React.ReactNode, label: string, active: boolean, collapsed: boolean, onClick: () => void }> = ({ icon, label, active, collapsed, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-4 p-3.5 rounded-2xl transition-all duration-300 ${active ? 'bg-yellow-500 text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
    <div className="shrink-0">{React.cloneElement(icon as React.ReactElement<any>, { size: 20 })}</div>
    {!collapsed && <span className="text-sm font-bold tracking-tight">{label}</span>}
  </button>
);

const StatCard: React.FC<{ label: string, value: number, icon: React.ReactNode, color: string, bg: string }> = ({ label, value, icon, color, bg }) => (
  <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
    <div className={`${bg} ${color} p-4 rounded-2xl`}>{React.cloneElement(icon as React.ReactElement<any>, { size: 24 })}</div>
    <div><p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{label}</p><h4 className="text-3xl font-black text-slate-900 tracking-tighter">{value}</h4></div>
  </div>
);

const StatusBadge: React.FC<{ status: StatusSurat }> = ({ status }) => {
  const styles = { 
    'Selesai': 'bg-emerald-50 text-emerald-700 border-emerald-100', 
    'Penting': 'bg-rose-50 text-rose-700 border-rose-100', 
    'Proses': 'bg-amber-50 text-amber-700 border-amber-100' 
  };
  return <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${styles[status]}`}>{status}</span>;
};

const DetailItem: React.FC<{ label: string, value: string, full?: boolean, isStatus?: boolean }> = ({ label, value, full, isStatus }) => (
  <div className={full ? 'col-span-2' : ''}>
    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{label}</p>
    {isStatus ? <StatusBadge status={value as StatusSurat}/> : <p className="font-bold text-slate-800">{value}</p>}
  </div>
);

export default App;
