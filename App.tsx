
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
  Filter,
  ExternalLink,
  Info
} from 'lucide-react';
import { Surat, KategoriSurat, StatusSurat, Stats, User } from './types.ts';
import { summarizeDocument } from './services/geminiService.ts';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
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
  // Persistence Logic with enhanced error safety
  const [suratList, setSuratList] = useState<Surat[]>(() => {
    try {
      if (typeof window === 'undefined') return INITIAL_DATA;
      const saved = localStorage.getItem('lpse_earsip_data');
      if (!saved) return INITIAL_DATA;
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : INITIAL_DATA;
    } catch (err) {
      console.error("Critical: Error loading initial data:", err);
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
  const itemsPerPage = 8;
  
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

  // Effect for development/debugging mount
  useEffect(() => {
    console.log("Aplikasi E-Arsip LPSE NTB Berhasil Dimuat.");
  }, []);

  // Sync to Storage whenever list changes
  useEffect(() => {
    try {
      localStorage.setItem('lpse_earsip_data', JSON.stringify(suratList));
    } catch (e) {
      console.warn("Storage warning: Possibly quota exceeded", e);
    }
  }, [suratList]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  const filteredList = useMemo(() => {
    if (activeTab === 'system') return [];
    return suratList.filter(s => {
      const categoryMatch = activeTab === 'dashboard' || activeTab === 'semua' || s.kategori.toLowerCase() === activeTab;
      const searchStr = searchTerm.toLowerCase();
      const searchMatch = (s.perihal || '').toLowerCase().includes(searchStr) || 
                          (s.noSurat || '').toLowerCase().includes(searchStr) ||
                          (s.pihak || '').toLowerCase().includes(searchStr);
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
      const { username, password } = loginForm;
      if (username === 'admin' && password === 'admin123') {
        setCurrentUser({ username: 'admin', fullName: 'Administrator LPSE', role: 'Administrator', lastLogin: new Date().toLocaleString() });
      } else if (username === 'staf' && password === 'staf123') {
        setCurrentUser({ username: 'staf', fullName: 'Staf Administrasi', role: 'User', lastLogin: new Date().toLocaleString() });
      } else {
        setLoginError('Kredensial tidak ditemukan.');
      }
      setIsLoginLoading(false);
    }, 600);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        alert('Tipe file tidak didukung. Gunakan PDF atau Gambar.');
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        alert('File terlalu besar (Maks 15MB).');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ 
          ...prev, 
          fileName: file.name, 
          fileType: file.type, 
          fileData: reader.result as string 
        }));
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
          if (window.confirm('Pulihkan data dari backup? Seluruh data saat ini akan terhapus.')) {
            setSuratList(json);
            alert('Restorasi Berhasil!');
          }
        }
      } catch (err) { alert('File cadangan tidak valid.'); }
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
    if (window.confirm('Hapus arsip secara permanen?')) {
      setSuratList(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let data = { ...formData } as Surat;
    
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

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-25 scale-105" style={{ backgroundImage: "url('https://storage.ntbprov.go.id/biropbj/media/kantor-gubernur-ntb.jpg')" }}></div>
        <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-[3rem] p-12 relative z-10 shadow-2xl border border-white/20">
          <div className="text-center mb-10">
            <div className="bg-yellow-500 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-yellow-500/20"><ShieldCheck className="text-slate-900" size={40} /></div>
            <h1 className="text-3xl font-black text-slate-900">E-Arsip Digital</h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] mt-2">LPSE PROV NTB</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            {loginError && <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl text-[10px] font-black uppercase text-center border border-rose-100">{loginError}</div>}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Username</label>
              <div className="relative group">
                <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500" size={20} />
                <input required type="text" className="w-full pl-14 pr-6 py-4 bg-slate-100/50 border-2 border-transparent focus:border-blue-500 rounded-[1.5rem] outline-none font-bold text-slate-700" value={loginForm.username} onChange={(e) => setLoginForm({...loginForm, username: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Password</label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500" size={20} />
                <input required type={showPassword ? 'text' : 'password'} className="w-full pl-14 pr-14 py-4 bg-slate-100/50 border-2 border-transparent focus:border-blue-500 rounded-[1.5rem] outline-none font-bold text-slate-700" value={loginForm.password} onChange={(e) => setLoginForm({...loginForm, password: e.target.value})} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300">
                  {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                </button>
              </div>
            </div>
            <button disabled={isLoginLoading} type="submit" className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black tracking-widest uppercase text-[10px] shadow-xl hover:bg-blue-900 transition-all flex items-center justify-center gap-3">
              {isLoginLoading ? <Loader2 className="animate-spin" size={20}/> : 'Masuk Sistem'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      <aside className={`${isSidebarOpen ? 'w-80' : 'w-24'} bg-[#0F172A] transition-all duration-500 flex flex-col z-30 shadow-2xl no-print relative`}>
        <div className="p-8 flex items-center gap-4 border-b border-white/5 h-24">
          <div className="bg-[#EAB308] p-2.5 rounded-2xl shrink-0"><ShieldCheck className="w-7 h-7 text-[#0F172A]" /></div>
          {isSidebarOpen && <div className="truncate"><h1 className="font-black text-white text-xl tracking-tight">E-Arsip</h1><span className="text-[10px] text-blue-400 uppercase tracking-widest font-black">LPSE NTB</span></div>}
        </div>
        <nav className="flex-1 px-4 mt-10 space-y-3 overflow-y-auto">
          <SidebarLink icon={<LayoutDashboard />} label="Dashboard" active={activeTab === 'dashboard'} collapsed={!isSidebarOpen} onClick={() => setActiveTab('dashboard')} />
          <div className="py-2"><div className="h-px bg-white/5 mx-4"></div></div>
          <SidebarLink icon={<FileText />} label="Semua Arsip" active={activeTab === 'semua'} collapsed={!isSidebarOpen} onClick={() => setActiveTab('semua')} />
          <SidebarLink icon={<FileCheck />} label="Surat Masuk" active={activeTab === 'masuk'} collapsed={!isSidebarOpen} onClick={() => setActiveTab('masuk')} />
          <SidebarLink icon={<Share2 />} label="Surat Keluar" active={activeTab === 'keluar'} collapsed={!isSidebarOpen} onClick={() => setActiveTab('keluar')} />
          {currentUser.role === 'Administrator' && <SidebarLink icon={<Settings />} label="Sistem" active={activeTab === 'system'} collapsed={!isSidebarOpen} onClick={() => setActiveTab('system')} />}
        </nav>
        <div className="p-6 mt-auto">
          <button onClick={() => setCurrentUser(null)} className="w-full flex items-center justify-center gap-3 bg-rose-500/10 text-rose-500 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all">
            <LogOut size={18}/> {isSidebarOpen && 'Keluar'}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        <header className="h-24 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-10 sticky top-0 z-20 no-print">
          <div className="flex items-center gap-6">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400"><Menu size={24} /></button>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight capitalize">{activeTab}</h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5 group-focus-within:text-blue-500" />
              <input type="text" placeholder="Cari arsip..." className="pl-14 pr-6 py-3.5 bg-slate-100/50 rounded-[1.25rem] text-sm w-72 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all font-medium" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="relative">
               <button onClick={() => setShowReportDropdown(!showReportDropdown)} className="bg-white border-2 border-slate-100 text-slate-600 px-6 py-3.5 rounded-[1.25rem] flex items-center gap-3 hover:bg-slate-50 transition-all font-bold text-sm shadow-sm">
                 <Printer size={20} /><span>Laporan</span><ChevronDown size={14} className={showReportDropdown ? 'rotate-180' : ''} />
               </button>
               {showReportDropdown && (
                  <div className="absolute right-0 mt-3 w-64 bg-white border border-slate-100 rounded-[1.5rem] shadow-2xl py-3 z-[60] animate-in fade-in slide-in-from-top-4">
                     <button onClick={() => handleGenerateReport('Semua')} className="w-full text-left px-6 py-4 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-4 transition-colors"><FileText size={18} className="text-blue-500" /> Semua Dokumen</button>
                     <button onClick={() => handleGenerateReport('Masuk')} className="w-full text-left px-6 py-4 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-4 transition-colors"><FileCheck size={18} className="text-emerald-500" /> Surat Masuk</button>
                     <button onClick={() => handleGenerateReport('Keluar')} className="w-full text-left px-6 py-4 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-4 transition-colors"><Share2 size={18} className="text-indigo-500" /> Surat Keluar</button>
                  </div>
               )}
            </div>
            {currentUser.role === 'Administrator' && (
              <button onClick={handleOpenAdd} className="bg-slate-900 text-white px-8 py-3.5 rounded-[1.25rem] flex items-center gap-3 font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all">
                <Plus size={20} /><span>Arsip Baru</span>
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-12 no-print custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-12">
            {activeTab === 'dashboard' ? (
              <div className="space-y-12 animate-in fade-in duration-700">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  <StatCard label="Total Arsip" value={stats.total} icon={<FileText />} color="text-blue-600" bg="bg-blue-50" />
                  <StatCard label="Arsip Masuk" value={stats.masuk} icon={<FileCheck />} color="text-emerald-600" bg="bg-emerald-50" />
                  <StatCard label="Arsip Keluar" value={stats.keluar} icon={<Share2 />} color="text-indigo-600" bg="bg-indigo-50" />
                  <StatCard label="Selesai" value={stats.total - stats.proses} icon={<Clock />} color="text-amber-600" bg="bg-amber-50" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm h-[450px]">
                    <h3 className="font-black text-slate-900 mb-10 flex items-center gap-4 tracking-tight text-xl"><TrendingUp size={24} className="text-blue-500" /> Ringkasan Aktivitas</h3>
                    <div className="h-full w-full pb-16">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={CHART_DATA}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} dy={15} />
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                          <Tooltip />
                          <Area type="monotone" dataKey="masuk" stroke="#10b981" fill="#10b981" fillOpacity={0.05} strokeWidth={4} />
                          <Area type="monotone" dataKey="keluar" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.05} strokeWidth={4} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="bg-slate-900 p-10 rounded-[3rem] text-white flex flex-col relative overflow-hidden group shadow-2xl">
                    <Bot className="absolute -right-6 -bottom-6 opacity-10 group-hover:scale-110 transition-transform" size={180} />
                    <div className="relative z-10">
                      <div className="bg-blue-500 w-14 h-14 rounded-2xl flex items-center justify-center mb-8 shadow-xl"><Bot size={28}/></div>
                      <h4 className="font-black text-2xl mb-4 tracking-tight">AI Insights</h4>
                      <p className="text-slate-400 text-sm leading-relaxed">Sistem arsip digital mendeteksi kestabilan data. Gunakan fitur ringkasan otomatis untuk verifikasi cepat dokumen LPSE Prov. NTB.</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTab === 'system' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-in slide-in-from-bottom-8">
                <div className="bg-white p-12 rounded-[3rem] border border-slate-100 shadow-sm">
                  <div className="bg-blue-50 w-16 h-16 rounded-3xl flex items-center justify-center text-blue-600 mb-8"><CloudDownload size={28}/></div>
                  <h4 className="font-black text-2xl text-slate-900 mb-4 tracking-tight">Export Database</h4>
                  <p className="text-slate-500 text-sm leading-relaxed mb-10">Unduh seluruh basis data arsip untuk cadangan eksternal (format JSON).</p>
                  <button onClick={() => {
                    const blob = new Blob([JSON.stringify(suratList, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = `backup_lpse_ntb.json`; a.click();
                  }} className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black tracking-widest uppercase text-[10px] flex items-center justify-center gap-4 hover:bg-blue-600 transition-all">
                    <Download size={20}/> Download JSON
                  </button>
                </div>
                <div className="bg-white p-12 rounded-[3rem] border border-slate-100 shadow-sm">
                  <div className="bg-emerald-50 w-16 h-16 rounded-3xl flex items-center justify-center text-emerald-600 mb-8"><CloudUpload size={28}/></div>
                  <h4 className="font-black text-2xl text-slate-900 mb-4 tracking-tight">Restore Database</h4>
                  <p className="text-slate-500 text-sm leading-relaxed mb-10">Unggah file backup untuk memulihkan seluruh data arsip surat digital.</p>
                  <button onClick={() => restoreInputRef.current?.click()} className="w-full py-5 bg-emerald-600 text-white rounded-[1.5rem] font-black tracking-widest uppercase text-[10px] flex items-center justify-center gap-4 hover:bg-emerald-700 transition-all">
                    <RefreshCw size={20}/> Restore Data
                  </button>
                  <input type="file" ref={restoreInputRef} className="hidden" accept=".json" onChange={handleRestore} />
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-sm animate-in fade-in">
                <div className="overflow-x-auto p-6">
                  <table className="w-full text-left border-separate border-spacing-y-4">
                    <thead>
                      <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-8">
                        <th className="px-8 py-4">Rincian Arsip</th>
                        <th className="px-8 py-4">Instansi</th>
                        <th className="px-8 py-4">Tgl Dokumen</th>
                        <th className="px-8 py-4 text-center">Status</th>
                        <th className="px-8 py-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedList.map(item => (
                        <tr key={item.id} className="group hover:bg-slate-50 transition-all">
                          <td className="px-8 py-6 first:rounded-l-[2rem] border-y border-l border-transparent group-hover:border-slate-100">
                            <p className="font-black text-slate-900 text-sm line-clamp-1">{item.perihal}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1.5">{item.noSurat}</p>
                          </td>
                          <td className="px-8 py-6 border-y border-transparent group-hover:border-slate-100 text-sm font-bold text-slate-600">{item.pihak}</td>
                          <td className="px-8 py-6 border-y border-transparent group-hover:border-slate-100 text-sm font-semibold text-slate-400">{item.tanggalSurat}</td>
                          <td className="px-8 py-6 border-y border-transparent group-hover:border-slate-100 text-center"><StatusBadge status={item.status}/></td>
                          <td className="px-8 py-6 last:rounded-r-[2rem] border-y border-r border-transparent group-hover:border-slate-100 text-right">
                            <div className="flex justify-end gap-3 opacity-60 group-hover:opacity-100">
                              <button onClick={() => { setSelectedSurat(item); setShowDetailModal(true); }} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-white rounded-2xl transition-all shadow-sm"><Eye size={20}/></button>
                              {currentUser.role === 'Administrator' && (
                                <>
                                  <button onClick={() => handleEdit(item)} className="p-3 text-slate-400 hover:text-emerald-600 hover:bg-white rounded-2xl transition-all shadow-sm"><Edit3 size={20}/></button>
                                  <button onClick={() => handleDelete(item.id)} className="p-3 text-slate-400 hover:text-rose-600 hover:bg-white rounded-2xl transition-all shadow-sm"><Trash2 size={20}/></button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredList.length > itemsPerPage && (
                    <div className="px-8 py-10 border-t border-slate-50 flex justify-between items-center">
                      <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Halaman {currentPage} Dari {totalPages}</p>
                      <div className="flex gap-4">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-4 border-2 border-slate-50 rounded-2xl disabled:opacity-20 hover:bg-slate-50 transition-all"><ChevronLeft size={20}/></button>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-4 border-2 border-slate-50 rounded-2xl disabled:opacity-20 hover:bg-slate-50 transition-all"><ChevronRight size={20}/></button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal: Form */}
        {showFormModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden">
              <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                <div className="flex items-center gap-5"><Plus size={24} className="text-yellow-500"/><h3 className="text-2xl font-black">{selectedSurat ? 'Edit Arsip' : 'Arsip Baru'}</h3></div>
                <button onClick={() => setShowFormModal(false)} className="p-3 hover:bg-white/10 rounded-2xl transition-colors"><X/></button>
              </div>
              <form onSubmit={handleFormSubmit} className="p-10 space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-8">
                  <div className="col-span-2 space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Perihal Dokumen</label>
                    <input required className="w-full px-6 py-4 bg-slate-100/50 border-2 border-transparent focus:border-blue-500 rounded-[1.5rem] outline-none font-bold text-sm" value={formData.perihal} onChange={e => setFormData({...formData, perihal: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Nomor Surat</label>
                    <input required className="w-full px-6 py-4 bg-slate-100/50 border-2 border-transparent focus:border-blue-500 rounded-[1.5rem] outline-none font-bold text-sm" value={formData.noSurat} onChange={e => setFormData({...formData, noSurat: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Pihak / Instansi</label>
                    <input required className="w-full px-6 py-4 bg-slate-100/50 border-2 border-transparent focus:border-blue-500 rounded-[1.5rem] outline-none font-bold text-sm" value={formData.pihak} onChange={e => setFormData({...formData, pihak: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Status</label>
                    <select className="w-full px-6 py-4 bg-slate-100/50 border-2 border-transparent focus:border-blue-500 rounded-[1.5rem] outline-none font-bold text-sm" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as StatusSurat})}>
                      <option value="Proses">Dalam Proses</option>
                      <option value="Selesai">Selesai / Arsip</option>
                      <option value="Penting">Penting / Segera</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Tanggal Surat</label>
                    <input type="date" className="w-full px-6 py-4 bg-slate-100/50 border-2 border-transparent focus:border-blue-500 rounded-[1.5rem] outline-none font-bold text-sm" value={formData.tanggalSurat} onChange={e => setFormData({...formData, tanggalSurat: e.target.value})} />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Unggah Dokumen (PDF/Gambar)</label>
                    {!formData.fileData ? (
                       <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-200 rounded-[2rem] p-10 flex flex-col items-center justify-center bg-slate-50 cursor-pointer hover:bg-slate-100 transition-all">
                         <Upload className="text-blue-500 mb-4" size={32} />
                         <p className="text-sm font-bold text-slate-400">Pilih file digital (Maks 15MB)</p>
                         <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.docx,.jpg,.jpeg,.png" onChange={handleFileChange} />
                       </div>
                    ) : (
                       <div className="p-6 bg-blue-50 rounded-[1.5rem] flex items-center justify-between border-2 border-blue-100 shadow-sm">
                         <div className="flex items-center gap-4">
                           <FileIcon size={24} className="text-blue-600" />
                           <span className="text-sm font-black text-blue-900 truncate max-w-[400px]">{formData.fileName}</span>
                         </div>
                         <button type="button" onClick={() => setFormData({...formData, fileData: '', fileName: ''})} className="bg-white text-rose-500 p-3 rounded-2xl transition-all shadow-sm"><X size={20}/></button>
                       </div>
                    )}
                  </div>
                </div>
                <div className="pt-8 flex gap-6">
                  <button type="submit" className="flex-1 bg-slate-900 text-white py-5 rounded-[1.5rem] font-black tracking-widest uppercase text-[10px] shadow-2xl hover:bg-blue-600 transition-all">Simpan Arsip</button>
                  <button type="button" onClick={() => setShowFormModal(false)} className="px-10 bg-slate-100 text-slate-600 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all">Batal</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Detail & Preview */}
        {showDetailModal && selectedSurat && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-md animate-in fade-in">
            <div className="bg-white rounded-[3rem] w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
              <div className="p-8 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-6">
                   <div className="p-4 bg-white rounded-2xl shadow-sm"><FileIcon className="text-blue-500" size={24}/></div>
                   <div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">{selectedSurat.perihal}</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-widest">{selectedSurat.noSurat}</p>
                   </div>
                </div>
                <div className="flex items-center gap-4">
                  {selectedSurat.fileData && (
                     <button 
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = selectedSurat.fileData!;
                          link.download = selectedSurat.fileName || `arsip_digital`;
                          link.click();
                        }} 
                        className="flex items-center gap-3 bg-emerald-600 text-white px-8 py-3.5 rounded-[1.25rem] font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all"
                      >
                        <Download size={20}/> Download File
                      </button>
                  )}
                  <button onClick={() => setShowDetailModal(false)} className="p-3 hover:bg-slate-200 rounded-2xl transition-all text-slate-400"><X size={24}/></button>
                </div>
              </div>
              <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                <div className="w-full lg:w-[350px] p-10 bg-white border-r border-slate-50 overflow-y-auto custom-scrollbar space-y-10">
                  <DetailItem label="Instansi / Pihak" value={selectedSurat.pihak}/>
                  <div className="grid grid-cols-2 gap-4">
                    <DetailItem label="Tgl Surat" value={selectedSurat.tanggalSurat}/>
                    <DetailItem label="Status" value={selectedSurat.status} isStatus/>
                  </div>
                  <div className="p-6 bg-blue-50/50 rounded-[1.5rem] border border-blue-100">
                    <p className="text-[10px] font-black uppercase text-blue-500 mb-3 flex items-center gap-2 tracking-[0.2em]"><Bot size={14}/> Ringkasan AI</p>
                    <p className="text-sm font-bold text-blue-900 leading-relaxed italic">"{selectedSurat.isiRingkas || 'Memproses...'}"</p>
                  </div>
                </div>
                <div className="flex-1 bg-slate-100 flex flex-col p-6 overflow-hidden">
                  <div className="flex justify-between items-center mb-4 px-2">
                     <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Pratinjau Dokumen</p>
                     {selectedSurat.fileData && (
                        <button onClick={() => window.open()?.document.write(`<iframe src="${selectedSurat.fileData}" frameborder="0" style="width:100%; height:100%;"></iframe>`)} className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Buka Tab Baru <ExternalLink size={14} className="inline ml-1"/></button>
                     )}
                  </div>
                  <div className="bg-white border-2 border-slate-200 rounded-[2.5rem] overflow-hidden flex-1 shadow-inner flex items-center justify-center">
                    {selectedSurat.fileData ? (
                      selectedSurat.fileType?.startsWith('image/') ? (
                        <img src={selectedSurat.fileData} className="w-full h-full object-contain" alt="preview" />
                      ) : selectedSurat.fileType === 'application/pdf' ? (
                        <iframe src={`${selectedSurat.fileData}#toolbar=0`} className="w-full h-full border-none" title="pdf" />
                      ) : (
                        <div className="text-center p-16">
                          <FileIcon size={48} className="text-slate-200 mx-auto mb-4" />
                          <p className="text-slate-400 font-bold text-sm">Pratinjau tidak didukung. Silakan download file.</p>
                        </div>
                      )
                    ) : (
                      <Activity size={48} className="text-slate-100 opacity-40" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Print Preview */}
        {showPrintPreview && (
           <div className="fixed inset-0 z-[200] bg-slate-900 flex items-center justify-center p-6 animate-in fade-in">
              <div className="bg-white w-full max-w-6xl h-[95vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden">
                 <div className="p-8 bg-[#0F172A] text-white flex justify-between items-center no-print">
                    <div className="flex items-center gap-6"><Printer className="text-yellow-500" size={28}/><h3 className="text-2xl font-black uppercase tracking-tight">Cetak Laporan: {reportType}</h3></div>
                    <div className="flex items-center gap-4">
                      <button onClick={() => window.print()} className="bg-yellow-500 text-slate-900 px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl hover:bg-yellow-400 transition-all flex items-center gap-3">
                        <Printer size={20} /><span>Cetak Sekarang</span>
                      </button>
                      <button onClick={() => setShowPrintPreview(false)} className="bg-white/10 p-3.5 rounded-2xl hover:bg-white/20 transition-all"><X size={24}/></button>
                    </div>
                 </div>
                 <div className="flex-1 overflow-y-auto p-16 bg-slate-200 flex justify-center custom-scrollbar">
                    <div className="bg-white w-[210mm] min-h-[297mm] p-[25mm] flex flex-col text-black shadow-2xl border border-slate-300">
                       <div className="flex items-center gap-8 border-b-[4px] border-black pb-6 mb-12">
                          <div className="w-24 h-24 bg-slate-100 border-2 border-black flex items-center justify-center text-[10px] font-black text-center p-3">LOGO PROV NTB</div>
                          <div className="text-center flex-1">
                             <h4 className="text-xl font-bold uppercase leading-tight">Pemerintah Provinsi Nusa Tenggara Barat</h4>
                             <h4 className="text-2xl font-black uppercase">Biro Pengadaan Barang dan Jasa</h4>
                             <p className="text-base font-bold">Layanan Pengadaan Secara Elektronik (LPSE)</p>
                          </div>
                          <div className="w-24 h-24 border-2 border-black flex items-center justify-center"><QrCode size={64}/></div>
                       </div>
                       <h5 className="text-center font-black text-xl underline mb-10 uppercase tracking-widest">LAPORAN ARSIP DIGITAL SURAT {reportType.toUpperCase()}</h5>
                       <table className="w-full border-collapse border-[2.5px] border-black text-[11px]">
                          <thead className="bg-slate-50 font-black uppercase text-center tracking-widest">
                             <tr>
                                <th className="border-2 border-black p-3 w-10">No</th>
                                <th className="border-2 border-black p-3">Nomor Surat</th>
                                <th className="border-2 border-black p-3">Tgl Dokumen</th>
                                <th className="border-2 border-black p-3 text-left">Perihal</th>
                                <th className="border-2 border-black p-3 text-left">Instansi</th>
                             </tr>
                          </thead>
                          <tbody>
                             {(reportType === 'Semua' ? suratList : suratList.filter(s => s.kategori === reportType)).map((s, idx) => (
                                <tr key={s.id}>
                                   <td className="border-2 border-black p-3 text-center font-bold">{idx + 1}</td>
                                   <td className="border-2 border-black p-3 text-center font-bold">{s.noSurat}</td>
                                   <td className="border-2 border-black p-3 text-center">{s.tanggalSurat}</td>
                                   <td className="border-2 border-black p-3">{s.perihal}</td>
                                   <td className="border-2 border-black p-3">{s.pihak}</td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                       <div className="mt-20 flex justify-end text-center">
                          <div className="w-72">
                             <p className="text-sm font-bold mb-2">Mataram, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                             <p className="text-sm font-black uppercase mb-24">Kepala LPSE Prov. NTB</p>
                             <div className="h-px bg-black mb-1"></div>
                             <p className="text-sm font-black uppercase tracking-widest underline">LALU MAJEMUK, S.Sos.</p>
                             <p className="text-xs font-bold mt-1">NIP. 19800101 200501 1 001</p>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        )}
      </main>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.1); }
      `}</style>
    </div>
  );
};

const SidebarLink: React.FC<{ icon: React.ReactNode, label: string, active: boolean, collapsed: boolean, onClick: () => void }> = ({ icon, label, active, collapsed, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-5 p-4 rounded-2xl transition-all duration-300 relative group ${active ? 'bg-yellow-500 text-slate-900 shadow-xl' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
    <div className={`shrink-0 transition-transform ${active ? 'scale-110' : ''}`}>{React.cloneElement(icon as React.ReactElement<any>, { size: 24 })}</div>
    {!collapsed && <span className="text-sm font-black tracking-tight">{label}</span>}
    {active && <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-slate-900"></div>}
  </button>
);

const StatCard: React.FC<{ label: string, value: number, icon: React.ReactNode, color: string, bg: string }> = ({ label, value, icon, color, bg }) => (
  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 group">
    <div className={`${bg} ${color} p-5 rounded-[1.5rem] shadow-inner transition-transform group-hover:scale-110`}>{React.cloneElement(icon as React.ReactElement<any>, { size: 30 })}</div>
    <div><p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{label}</p><h4 className="text-3xl font-black text-slate-900 tracking-tighter">{value}</h4></div>
  </div>
);

const StatusBadge: React.FC<{ status: StatusSurat }> = ({ status }) => {
  const styles = { 
    'Selesai': 'bg-emerald-50 text-emerald-700 border-emerald-100', 
    'Penting': 'bg-rose-50 text-rose-700 border-rose-100', 
    'Proses': 'bg-amber-50 text-amber-700 border-amber-100' 
  };
  return <span className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${styles[status]}`}>{status}</span>;
};

const DetailItem: React.FC<{ label: string, value: string, full?: boolean, isStatus?: boolean }> = ({ label, value, full, isStatus }) => (
  <div className={full ? 'col-span-2' : ''}>
    <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">{label}</p>
    {isStatus ? <StatusBadge status={value as StatusSurat}/> : <p className="font-black text-slate-900 text-base tracking-tight">{value || '-'}</p>}
  </div>
);

export default App;
