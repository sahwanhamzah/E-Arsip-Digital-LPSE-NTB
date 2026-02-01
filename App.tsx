
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
  CheckCircle2,
  Activity,
  // Fix: Added missing Settings icon import from lucide-react
  Settings
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
  const [suratList, setSuratList] = useState<Surat[]>(() => {
    try {
      if (typeof window === 'undefined') return INITIAL_DATA;
      const saved = localStorage.getItem('lpse_earsip_data');
      if (!saved) return INITIAL_DATA;
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : INITIAL_DATA;
    } catch (err) {
      console.error("Storage Error:", err);
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

  useEffect(() => {
    try {
      localStorage.setItem('lpse_earsip_data', JSON.stringify(suratList));
    } catch (e) {
      console.warn("Storage warning", e);
    }
  }, [suratList]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  const filteredList = useMemo(() => {
    if (activeTab === 'system') return [];
    return (suratList || []).filter(s => {
      const categoryMatch = activeTab === 'dashboard' || activeTab === 'semua' || s.kategori.toLowerCase() === activeTab;
      const searchStr = searchTerm.toLowerCase();
      const searchMatch = (s.perihal || '').toLowerCase().includes(searchStr) || 
                          (s.noSurat || '').toLowerCase().includes(searchStr) ||
                          (s.pihak || '').toLowerCase().includes(searchStr);
      return categoryMatch && searchMatch;
    });
  }, [suratList, activeTab, searchTerm]);

  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredList.slice(start, start + itemsPerPage);
  }, [filteredList, currentPage]);

  const stats: Stats = useMemo(() => {
    const list = Array.isArray(suratList) ? suratList : [];
    return {
      total: list.length,
      masuk: list.filter(s => s.kategori === 'Masuk').length,
      keluar: list.filter(s => s.kategori === 'Keluar').length,
      proses: list.filter(s => s.status === 'Proses').length,
    };
  }, [suratList]);

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
        setLoginError('Kredensial tidak valid.');
      }
      setIsLoginLoading(false);
    }, 600);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        alert('Tipe file tidak didukung.');
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        alert('File terlalu besar.');
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
          if (window.confirm('Pulihkan data?')) {
            setSuratList(json);
            alert('Berhasil!');
          }
        }
      } catch (err) { alert('Format tidak sesuai.'); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleOpenAdd = () => {
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
    setFormData(item);
    setSelectedSurat(item);
    setShowFormModal(true);
  };

  const handleDelete = (id: string) => {
    if (currentUser?.role !== 'Administrator') {
      alert('Hanya Administrator yang dapat menghapus arsip.');
      return;
    }
    if (window.confirm('Hapus arsip ini?')) {
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
      <div className="min-h-screen flex items-center justify-center p-4 overflow-hidden relative bg-slate-900">
        <div className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-105" style={{ backgroundImage: "url('https://storage.ntbprov.go.id/biropbj/media/kantor-gubernur-ntb.jpg')" }}>
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-blue-900/40 backdrop-blur-[2px]"></div>
        </div>
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] overflow-hidden animate-in fade-in zoom-in duration-700 relative z-10">
          <div className="p-12 bg-gradient-to-br from-white/5 to-transparent flex flex-col justify-between relative hidden lg:flex border-r border-white/5">
             <div className="relative z-10">
                <div className="bg-[#EAB308] w-14 h-14 rounded-2xl flex items-center justify-center mb-8 shadow-2xl shadow-yellow-500/30 ring-4 ring-yellow-500/20"><ShieldCheck className="w-8 h-8 text-[#0F172A]" /></div>
                <h1 className="text-4xl font-extrabold text-white leading-tight drop-shadow-md">Sistem E-Arsip <br /><span className="text-blue-400">Digital LPSE NTB</span></h1>
                <p className="mt-4 text-slate-300 text-lg font-medium">Manajemen arsip surat dinas yang modern, aman, dan efisien untuk integritas pengadaan.</p>
             </div>
             <div className="relative z-10 mt-12">
                <div className="flex items-center gap-4 p-5 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md">
                   <div className="bg-emerald-500/20 p-2.5 rounded-xl"><CheckCircle2 className="w-6 h-6 text-emerald-400" /></div>
                   <div><p className="text-sm text-white font-bold">Terverifikasi Sistem</p><p className="text-xs text-slate-400 font-medium">Infrastruktur Digital Pemprov NTB</p></div>
                </div>
                <div className="mt-10 flex items-center gap-3"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></div><p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Biro Pengadaan Barang/Jasa Setda Provinsi NTB</p></div>
             </div>
          </div>
          <div className="p-8 lg:p-16 flex flex-col justify-center bg-white">
            <div className="mb-10 text-center lg:text-left"><h2 className="text-3xl font-black text-slate-900 tracking-tight">Selamat Datang</h2><p className="text-slate-500 mt-2 font-medium">Silakan akses kredensial Anda untuk melanjutkan</p></div>
            <form onSubmit={handleLogin} className="space-y-6">
               {loginError && <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-bold rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2"><X size={18} />{loginError}</div>}
               <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Username</label>
                  <div className="relative group"><UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} /><input required type="text" placeholder="username" className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all font-semibold text-slate-800" value={loginForm.username} onChange={(e) => setLoginForm({...loginForm, username: e.target.value})} /></div>
               </div>
               <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Password</label>
                  <div className="relative group"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} /><input required type={showPassword ? 'text' : 'password'} placeholder="••••••••" className="w-full pl-12 pr-12 py-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all font-semibold text-slate-800" value={loginForm.password} onChange={(e) => setLoginForm({...loginForm, password: e.target.value})} /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button></div>
               </div>
               <button disabled={isLoginLoading} type="submit" className="w-full bg-[#0F172A] hover:bg-blue-900 text-white py-4 rounded-2xl font-bold shadow-xl shadow-slate-200 flex items-center justify-center gap-3 transition-all">{isLoginLoading ? <Loader2 size={20} className="animate-spin" /> : <>Akses Dasbor</>}</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <aside className={`${isSidebarOpen ? 'w-80' : 'w-24'} bg-[#0F172A] transition-all duration-500 flex flex-col z-30 no-print`}>
        <div className="p-8 flex items-center gap-4 h-24 border-b border-white/5">
          <div className="bg-[#EAB308] p-2.5 rounded-2xl shrink-0"><ShieldCheck className="w-7 h-7 text-[#0F172A]" /></div>
          {isSidebarOpen && <div className="truncate"><h1 className="font-black text-white text-xl">E-Arsip</h1><span className="text-[10px] text-blue-400 font-black uppercase tracking-widest">LPSE NTB</span></div>}
        </div>
        <nav className="flex-1 px-4 mt-10 space-y-3">
          <SidebarLink icon={<LayoutDashboard />} label="Dashboard" active={activeTab === 'dashboard'} collapsed={!isSidebarOpen} onClick={() => setActiveTab('dashboard')} />
          <SidebarLink icon={<FileText />} label="Semua Arsip" active={activeTab === 'semua'} collapsed={!isSidebarOpen} onClick={() => setActiveTab('semua')} />
          <SidebarLink icon={<FileCheck />} label="Surat Masuk" active={activeTab === 'masuk'} collapsed={!isSidebarOpen} onClick={() => setActiveTab('masuk')} />
          <SidebarLink icon={<Share2 />} label="Surat Keluar" active={activeTab === 'keluar'} collapsed={!isSidebarOpen} onClick={() => setActiveTab('keluar')} />
          {currentUser.role === 'Administrator' && <SidebarLink icon={<Settings />} label="Sistem" active={activeTab === 'system'} collapsed={!isSidebarOpen} onClick={() => setActiveTab('system')} />}
        </nav>
        <div className="p-6 mt-auto">
          <button onClick={() => setCurrentUser(null)} className="w-full flex items-center justify-center gap-3 bg-rose-500/10 text-rose-500 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest">
            <LogOut size={18}/> {isSidebarOpen && 'Keluar'}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative overflow-hidden">
        <header className="h-24 bg-white border-b border-slate-100 flex items-center justify-between px-10 no-print">
          <div className="flex items-center gap-6">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400"><Menu size={24} /></button>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight capitalize">{activeTab}</h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
              <input type="text" placeholder="Cari arsip..." className="pl-14 pr-6 py-3.5 bg-slate-100/50 rounded-[1.25rem] text-sm w-72 outline-none font-medium" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <button onClick={() => setShowReportDropdown(!showReportDropdown)} className="bg-white border-2 border-slate-100 text-slate-600 px-6 py-3.5 rounded-[1.25rem] flex items-center gap-3 font-bold text-sm shadow-sm">
              <Printer size={20} /><span>Laporan</span><ChevronDown size={14} />
            </button>
            {showReportDropdown && (
              <div className="absolute right-10 top-24 w-64 bg-white border border-slate-100 rounded-[1.5rem] shadow-2xl py-3 z-[60]">
                <button onClick={() => handleGenerateReport('Semua')} className="w-full text-left px-6 py-4 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-4">Semua Dokumen</button>
                <button onClick={() => handleGenerateReport('Masuk')} className="w-full text-left px-6 py-4 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-4">Surat Masuk</button>
                <button onClick={() => handleGenerateReport('Keluar')} className="w-full text-left px-6 py-4 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-4">Surat Keluar</button>
              </div>
            )}
            {/* Staff / User should also see this button */}
            <button onClick={handleOpenAdd} className="bg-slate-900 text-white px-8 py-3.5 rounded-[1.25rem] flex items-center gap-3 font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-blue-600 transition-all">
              <Plus size={20} /><span>Arsip Baru</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-12 no-print custom-scrollbar">
          {activeTab === 'dashboard' ? (
            <div className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <StatCard label="Total Arsip" value={stats.total} icon={<FileText />} color="text-blue-600" bg="bg-blue-50" />
                <StatCard label="Arsip Masuk" value={stats.masuk} icon={<FileCheck />} color="text-emerald-600" bg="bg-emerald-50" />
                <StatCard label="Arsip Keluar" value={stats.keluar} icon={<Share2 />} color="text-indigo-600" bg="bg-indigo-50" />
                <StatCard label="Proses" value={stats.proses} icon={<Clock />} color="text-amber-600" bg="bg-amber-50" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={CHART_DATA}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                      <Tooltip />
                      <Area type="monotone" dataKey="masuk" stroke="#10b981" fill="#10b981" fillOpacity={0.05} />
                      <Area type="monotone" dataKey="keluar" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.05} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-slate-900 p-10 rounded-[3rem] text-white flex flex-col relative overflow-hidden group">
                  <Bot className="absolute -right-6 -bottom-6 opacity-10" size={180} />
                  <div className="relative z-10">
                    <div className="bg-blue-500 w-14 h-14 rounded-2xl flex items-center justify-center mb-8"><Bot size={28}/></div>
                    <h4 className="font-black text-2xl mb-4">AI Insights</h4>
                    <p className="text-slate-400 text-sm leading-relaxed">Gunakan fitur ringkasan otomatis untuk membantu verifikasi cepat setiap dokumen yang masuk ke LPSE NTB.</p>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'system' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="bg-white p-12 rounded-[3rem] border border-slate-100 shadow-sm">
                <h4 className="font-black text-2xl text-slate-900 mb-4">Export Database</h4>
                <button onClick={() => {
                  const blob = new Blob([JSON.stringify(suratList, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a'); a.href = url; a.download = 'backup_arsip.json'; a.click();
                }} className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-4">Download JSON</button>
              </div>
              <div className="bg-white p-12 rounded-[3rem] border border-slate-100 shadow-sm">
                <h4 className="font-black text-2xl text-slate-900 mb-4">Restore Database</h4>
                <button onClick={() => restoreInputRef.current?.click()} className="w-full py-5 bg-emerald-600 text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-4">Unggah File</button>
                <input type="file" ref={restoreInputRef} className="hidden" accept=".json" onChange={handleRestore} />
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-sm">
              <div className="overflow-x-auto p-6">
                <table className="w-full text-left border-separate border-spacing-y-4">
                  <thead>
                    <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                      <th className="px-8 py-4">Rincian Dokumen</th>
                      <th className="px-8 py-4">Pihak</th>
                      <th className="px-8 py-4">Tgl</th>
                      <th className="px-8 py-4 text-center">Status</th>
                      <th className="px-8 py-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedList.map(item => (
                      <tr key={item.id} className="group hover:bg-slate-50 transition-all">
                        <td className="px-8 py-6 first:rounded-l-[2rem] border-y border-l border-transparent group-hover:border-slate-100">
                          <p className="font-black text-slate-900 text-sm line-clamp-1">{item.perihal}</p>
                          <p className="text-[10px] text-slate-400 font-bold mt-1.5 uppercase">{item.noSurat}</p>
                        </td>
                        <td className="px-8 py-6 border-y border-transparent group-hover:border-slate-100 text-sm font-bold text-slate-600">{item.pihak}</td>
                        <td className="px-8 py-6 border-y border-transparent group-hover:border-slate-100 text-sm font-semibold text-slate-400">{item.tanggalSurat}</td>
                        <td className="px-8 py-6 border-y border-transparent group-hover:border-slate-100 text-center"><StatusBadge status={item.status}/></td>
                        <td className="px-8 py-6 last:rounded-r-[2rem] border-y border-r border-transparent group-hover:border-slate-100 text-right">
                          <div className="flex justify-end gap-3 opacity-60 group-hover:opacity-100">
                            <button onClick={() => { setSelectedSurat(item); setShowDetailModal(true); }} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-white rounded-2xl shadow-sm"><Eye size={20}/></button>
                            <button onClick={() => handleEdit(item)} className="p-3 text-slate-400 hover:text-emerald-600 hover:bg-white rounded-2xl shadow-sm"><Edit3 size={20}/></button>
                            {currentUser.role === 'Administrator' && (
                              <button onClick={() => handleDelete(item.id)} className="p-3 text-slate-400 hover:text-rose-600 hover:bg-white rounded-2xl shadow-sm"><Trash2 size={20}/></button>
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

        {/* Modal Detail & Preview */}
        {showDetailModal && selectedSurat && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-md">
            <div className="bg-white rounded-[3rem] w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-8 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-6">
                   <div className="p-4 bg-white rounded-2xl shadow-sm"><FileIcon className="text-blue-500" size={24}/></div>
                   <div>
                      <h3 className="text-2xl font-black text-slate-900">{selectedSurat.perihal}</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{selectedSurat.noSurat}</p>
                   </div>
                </div>
                <div className="flex items-center gap-4">
                  {selectedSurat.fileData && (
                     <button onClick={() => {
                        const link = document.createElement('a'); link.href = selectedSurat.fileData!;
                        link.download = selectedSurat.fileName || 'dokumen'; link.click();
                     }} className="bg-emerald-600 text-white px-8 py-3.5 rounded-[1.25rem] font-black text-[10px] uppercase tracking-widest">Download File</button>
                  )}
                  <button onClick={() => setShowDetailModal(false)} className="p-3 text-slate-400"><X size={24}/></button>
                </div>
              </div>
              <div className="flex flex-1 overflow-hidden">
                <div className="w-[350px] p-10 bg-white border-r border-slate-50 overflow-y-auto space-y-8">
                  <DetailItem label="Pihak/Instansi" value={selectedSurat.pihak}/>
                  <DetailItem label="Status" value={selectedSurat.status} isStatus/>
                  <DetailItem label="Tgl Surat" value={selectedSurat.tanggalSurat}/>
                  <DetailItem label="Tgl Terima" value={selectedSurat.tanggalTerima}/>
                  <div className="p-6 bg-blue-50 rounded-[1.5rem]">
                    <p className="text-[10px] font-black uppercase text-blue-500 mb-2">Ringkasan AI</p>
                    <p className="text-sm font-bold text-blue-900 italic">"{selectedSurat.isiRingkas || 'Memproses...'}"</p>
                  </div>
                </div>
                <div className="flex-1 bg-slate-100 p-6 flex items-center justify-center overflow-hidden">
                  {selectedSurat.fileData ? (
                    selectedSurat.fileType?.startsWith('image/') ? (
                      <img src={selectedSurat.fileData} className="max-w-full max-h-full object-contain" alt="Preview" />
                    ) : (
                      <iframe src={selectedSurat.fileData} className="w-full h-full border-none" title="Document Viewer" />
                    )
                  ) : <Activity className="text-slate-200" size={48} />}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Form */}
        {showFormModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-sm">
            <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl p-10 space-y-8 max-h-[90vh] overflow-y-auto">
               <h3 className="text-2xl font-black">{selectedSurat ? 'Edit Arsip' : 'Arsip Baru'}</h3>
               <form onSubmit={handleFormSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Perihal Dokumen</label>
                    <input required className="w-full px-6 py-4 bg-slate-100 rounded-[1.5rem] outline-none font-bold" value={formData.perihal} onChange={e => setFormData({...formData, perihal: e.target.value})} placeholder="Contoh: Undangan Rapat..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">No Surat</label>
                      <input required className="w-full px-6 py-4 bg-slate-100 rounded-[1.5rem] outline-none font-bold" value={formData.noSurat} onChange={e => setFormData({...formData, noSurat: e.target.value})} placeholder="X/LPSE/2024" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Instansi / Pihak</label>
                      <input required className="w-full px-6 py-4 bg-slate-100 rounded-[1.5rem] outline-none font-bold" value={formData.pihak} onChange={e => setFormData({...formData, pihak: e.target.value})} placeholder="Nama Instansi" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Tanggal Surat</label>
                      <input required type="date" className="w-full px-6 py-4 bg-slate-100 rounded-[1.5rem] outline-none font-bold" value={formData.tanggalSurat} onChange={e => setFormData({...formData, tanggalSurat: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Tanggal Terima</label>
                      <input required type="date" className="w-full px-6 py-4 bg-slate-100 rounded-[1.5rem] outline-none font-bold" value={formData.tanggalTerima} onChange={e => setFormData({...formData, tanggalTerima: e.target.value})} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Status Arsip</label>
                    <select className="w-full px-6 py-4 bg-slate-100 rounded-[1.5rem] outline-none font-bold" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as StatusSurat})}>
                      <option value="Proses">Dalam Proses</option>
                      <option value="Selesai">Selesai / Diarsipkan</option>
                      <option value="Penting">Penting / Segera</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Unggah Dokumen (PDF/Gambar)</label>
                    {!formData.fileData ? (
                       <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-200 rounded-[2rem] p-8 flex flex-col items-center justify-center bg-slate-50 cursor-pointer hover:bg-slate-100 transition-all">
                         <Upload className="text-blue-500 mb-2" size={32} />
                         <p className="text-xs font-bold text-slate-400 text-center">Klik untuk memilih file digital (Maks 15MB)</p>
                         <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.docx,.jpg,.jpeg,.png" onChange={handleFileChange} />
                       </div>
                    ) : (
                       <div className="p-6 bg-blue-50 rounded-[1.5rem] flex items-center justify-between border-2 border-blue-100">
                         <div className="flex items-center gap-4 truncate">
                           <FileIcon size={24} className="text-blue-600 shrink-0" />
                           <span className="text-sm font-black text-blue-900 truncate">{formData.fileName}</span>
                         </div>
                         <button type="button" onClick={() => setFormData({...formData, fileData: '', fileName: ''})} className="bg-white text-rose-500 p-3 rounded-2xl shadow-sm"><X size={20}/></button>
                       </div>
                    )}
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button type="submit" className="flex-1 bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest shadow-xl hover:bg-blue-600 transition-all">Simpan Arsip</button>
                    <button type="button" onClick={() => setShowFormModal(false)} className="px-10 bg-slate-100 rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest transition-all">Batal</button>
                  </div>
               </form>
            </div>
          </div>
        )}

        {/* Print Preview */}
        {showPrintPreview && (
          <div className="fixed inset-0 z-[200] bg-white flex flex-col p-10 overflow-y-auto">
             <div className="flex justify-between items-center mb-10 no-print">
                <button onClick={() => window.print()} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold shadow-lg">Cetak Laporan</button>
                <button onClick={() => setShowPrintPreview(false)} className="text-slate-400 p-2 hover:bg-slate-100 rounded-full transition-all"><X size={24}/></button>
             </div>
             <div className="max-w-[800px] mx-auto w-full border-2 border-slate-100 p-10 bg-white shadow-xl">
                <div className="text-center mb-10 border-b-4 border-black pb-6">
                   <h4 className="text-xl font-bold uppercase leading-tight">Pemerintah Provinsi Nusa Tenggara Barat</h4>
                   <h2 className="text-2xl font-black uppercase mb-1">Laporan Arsip Surat Digital</h2>
                   <p className="text-sm font-medium tracking-widest">LPSE PROV NTB - {reportType}</p>
                </div>
                <table className="w-full border-collapse border-2 border-black">
                   <thead className="bg-slate-50 font-black uppercase text-[11px] tracking-wider">
                      <tr>
                         <th className="border-2 border-black p-3 w-10">No</th>
                         <th className="border-2 border-black p-3">No Surat</th>
                         <th className="border-2 border-black p-3 text-left">Perihal</th>
                         <th className="border-2 border-black p-3">Tgl Surat</th>
                         <th className="border-2 border-black p-3">Tgl Terima</th>
                      </tr>
                   </thead>
                   <tbody className="text-[12px]">
                      {(reportType === 'Semua' ? suratList : suratList.filter(s => s.kategori === reportType)).map((s, i) => (
                         <tr key={s.id}>
                            <td className="border-2 border-black p-3 text-center font-bold">{i+1}</td>
                            <td className="border-2 border-black p-3 text-center font-bold">{s.noSurat}</td>
                            <td className="border-2 border-black p-3">{s.perihal}</td>
                            <td className="border-2 border-black p-3 text-center">{s.tanggalSurat}</td>
                            <td className="border-2 border-black p-3 text-center">{s.tanggalTerima}</td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

// Sub-components
const SidebarLink: React.FC<{ icon: React.ReactNode, label: string, active: boolean, collapsed: boolean, onClick: () => void }> = ({ icon, label, active, collapsed, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-5 p-4 rounded-2xl transition-all ${active ? 'bg-yellow-500 text-slate-900 shadow-xl scale-105' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
    <div className={`${active ? 'scale-110' : ''}`}>{icon}</div>
    {!collapsed && <span className="text-sm font-black tracking-tight">{label}</span>}
  </button>
);

const StatCard: React.FC<{ label: string, value: number, icon: React.ReactNode, color: string, bg: string }> = ({ label, value, icon, color, bg }) => (
  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-6 group hover:shadow-xl transition-all duration-300">
    <div className={`${bg} ${color} p-5 rounded-[1.5rem] transition-transform group-hover:scale-110 shadow-inner`}>{icon}</div>
    <div><p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{label}</p><h4 className="text-3xl font-black text-slate-900 tracking-tighter">{value}</h4></div>
  </div>
);

const StatusBadge: React.FC<{ status: StatusSurat }> = ({ status }) => {
  const styles = { 
    Selesai: 'bg-emerald-50 text-emerald-700 border-emerald-100', 
    Penting: 'bg-rose-50 text-rose-700 border-rose-100', 
    Proses: 'bg-amber-50 text-amber-700 border-amber-100' 
  };
  return <span className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase border shadow-sm ${styles[status]}`}>{status}</span>;
};

const DetailItem: React.FC<{ label: string, value: string, isStatus?: boolean }> = ({ label, value, isStatus }) => (
  <div>
    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5">{label}</p>
    {isStatus ? <StatusBadge status={value as StatusSurat}/> : <p className="font-black text-slate-900 text-base">{value || '-'}</p>}
  </div>
);

export default App;
