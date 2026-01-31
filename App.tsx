
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
import { Surat, KategoriSurat, StatusSurat, Stats, User } from './types';
import { summarizeDocument } from './services/geminiService';
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
  // Persistence Logic with defensive error handling for Vercel stability
  const [suratList, setSuratList] = useState<Surat[]>(() => {
    try {
      const saved = localStorage.getItem('lpse_earsip_data');
      if (!saved) return INITIAL_DATA;
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : INITIAL_DATA;
    } catch (err) {
      console.error("Error loading data:", err);
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

  // Sync to Storage whenever list changes
  useEffect(() => {
    try {
      localStorage.setItem('lpse_earsip_data', JSON.stringify(suratList));
    } catch (e) {
      console.warn("Storage full or unavailable", e);
    }
  }, [suratList]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab]);

  const filteredList = useMemo(() => {
    if (activeTab === 'system') return [];
    return suratList.filter(s => {
      const categoryMatch = activeTab === 'dashboard' || activeTab === 'semua' || s.kategori.toLowerCase() === activeTab;
      const searchMatch = (s.perihal || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (s.noSurat || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (s.pihak || '').toLowerCase().includes(searchTerm.toLowerCase());
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
    // Simulated auth delay
    setTimeout(() => {
      if (loginForm.username === 'admin' && loginForm.password === 'admin123') {
        setCurrentUser({ username: 'admin', fullName: 'Administrator LPSE', role: 'Administrator', lastLogin: new Date().toLocaleString() });
      } else if (loginForm.username === 'staf' && loginForm.password === 'staf123') {
        setCurrentUser({ username: 'staf', fullName: 'Staf Administrasi', role: 'User', lastLogin: new Date().toLocaleString() });
      } else {
        setLoginError('Username atau password tidak valid.');
      }
      setIsLoginLoading(false);
    }, 800);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        alert('Tipe file tidak didukung. Gunakan PDF, JPG, atau PNG.');
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        alert('File terlalu besar. Maksimum 15MB.');
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
          if (window.confirm('Ganti seluruh data saat ini dengan data dari cadangan?')) {
            setSuratList(json);
            alert('Data berhasil dipulihkan!');
          }
        } else {
          alert('Format file cadangan tidak valid.');
        }
      } catch (err) { alert('Terjadi kesalahan saat membaca file.'); }
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
    if (window.confirm('Apakah Anda yakin ingin menghapus arsip ini secara permanen?')) {
      setSuratList(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let data = { ...formData } as Surat;
    
    // Auto-summarize with AI if new
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

  // --- Auth View ---
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 relative bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-30 scale-105 transition-transform duration-1000" style={{ backgroundImage: "url('https://storage.ntbprov.go.id/biropbj/media/kantor-gubernur-ntb.jpg')" }}></div>
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-transparent to-slate-900/80"></div>
        <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-[3rem] p-12 relative z-10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.4)] border border-white/20">
          <div className="text-center mb-10">
            <div className="bg-yellow-500 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-yellow-500/30 transform hover:rotate-6 transition-transform"><ShieldCheck className="text-slate-900" size={40} /></div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">E-Arsip Digital</h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.2em] mt-2">LPSE PROV NTB</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            {loginError && <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-xs font-bold text-center animate-bounce">{loginError}</div>}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Username</label>
              <div className="relative group">
                <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                <input required type="text" placeholder="Masukkan username" className="w-full pl-14 pr-6 py-4 bg-slate-100/50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-[1.5rem] outline-none transition-all font-bold text-slate-700" value={loginForm.username} onChange={(e) => setLoginForm({...loginForm, username: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Password</label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                <input required type={showPassword ? 'text' : 'password'} placeholder="Masukkan password" className="w-full pl-14 pr-14 py-4 bg-slate-100/50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-[1.5rem] outline-none transition-all font-bold text-slate-700" value={loginForm.password} onChange={(e) => setLoginForm({...loginForm, password: e.target.value})} />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600">
                  {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                </button>
              </div>
            </div>
            <button disabled={isLoginLoading} type="submit" className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black tracking-widest uppercase text-xs shadow-2xl hover:bg-blue-900 hover:shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3">
              {isLoginLoading ? <Loader2 className="animate-spin" size={20}/> : 'Masuk Sekarang'}
            </button>
          </form>
          <div className="mt-10 pt-8 border-t border-slate-100 text-center">
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Biro Pengadaan Barang dan Jasa</p>
          </div>
        </div>
      </div>
    );
  }

  // --- Dashboard View ---
  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden text-slate-900">
      {/* Sidebar Navigation */}
      <aside className={`${isSidebarOpen ? 'w-80' : 'w-24'} bg-[#0F172A] transition-all duration-500 flex flex-col z-30 shadow-[4px_0_24px_rgba(0,0,0,0.1)] no-print relative`}>
        <div className="p-8 flex items-center gap-4 border-b border-white/5 h-24">
          <div className="bg-[#EAB308] p-2.5 rounded-2xl shrink-0 shadow-lg shadow-yellow-500/20"><ShieldCheck className="w-7 h-7 text-[#0F172A]" /></div>
          {isSidebarOpen && <div className="truncate"><h1 className="font-black text-white text-xl tracking-tight leading-none">E-Arsip</h1><span className="text-[10px] text-blue-400 uppercase tracking-[0.2em] font-black mt-1 block">LPSE NTB</span></div>}
        </div>
        
        <nav className="flex-1 px-4 mt-10 space-y-3 overflow-y-auto custom-scrollbar">
          <SidebarLink icon={<LayoutDashboard />} label="Dashboard" active={activeTab === 'dashboard'} collapsed={!isSidebarOpen} onClick={() => setActiveTab('dashboard')} />
          <div className="py-2"><div className="h-px bg-white/5 mx-4"></div></div>
          <SidebarLink icon={<FileText />} label="Semua Arsip" active={activeTab === 'semua'} collapsed={!isSidebarOpen} onClick={() => setActiveTab('semua')} />
          <SidebarLink icon={<FileCheck />} label="Surat Masuk" active={activeTab === 'masuk'} collapsed={!isSidebarOpen} onClick={() => setActiveTab('masuk')} />
          <SidebarLink icon={<Share2 />} label="Surat Keluar" active={activeTab === 'keluar'} collapsed={!isSidebarOpen} onClick={() => setActiveTab('keluar')} />
          {currentUser.role === 'Administrator' && (
            <>
              <div className="py-2"><div className="h-px bg-white/5 mx-4"></div></div>
              <SidebarLink icon={<Settings />} label="Sistem & Backup" active={activeTab === 'system'} collapsed={!isSidebarOpen} onClick={() => setActiveTab('system')} />
            </>
          )}
        </nav>
        
        <div className="p-6 mt-auto bg-slate-900/50 border-t border-white/5">
          <div className={`flex items-center gap-4 mb-6 ${!isSidebarOpen ? 'justify-center' : ''}`}>
             <div className="w-10 h-10 rounded-2xl bg-blue-500 flex items-center justify-center font-black text-white shadow-lg">{currentUser.fullName.charAt(0)}</div>
             {isSidebarOpen && (
               <div className="truncate">
                  <p className="text-sm font-bold text-white leading-none">{currentUser.fullName}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">{currentUser.role}</p>
               </div>
             )}
          </div>
          <button onClick={() => setCurrentUser(null)} className="w-full flex items-center justify-center gap-3 bg-rose-500/10 text-rose-500 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all shadow-sm">
            <LogOut size={18}/> {isSidebarOpen && 'Log Keluar'}
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Top Header */}
        <header className="h-24 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-10 sticky top-0 z-20 no-print">
          <div className="flex items-center gap-6">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 transition-all hover:text-slate-900"><Menu size={24} /></button>
            <div className="h-8 w-px bg-slate-100"></div>
            <h2 className="text-2xl font-black text-slate-900 capitalize tracking-tight">{activeTab === 'system' ? 'Manajemen Sistem' : activeTab}</h2>
          </div>
          
          <div className="flex items-center gap-6">
            {/* Search Box */}
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
              <input type="text" placeholder="Cari nomor, perihal, atau instansi..." className="pl-14 pr-6 py-3.5 bg-slate-100/50 rounded-[1.25rem] text-sm w-80 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all border border-transparent font-medium" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>

            {/* Print Action */}
            <div className="relative">
               <button onClick={() => setShowReportDropdown(!showReportDropdown)} className="bg-white border-2 border-slate-100 text-slate-600 px-6 py-3.5 rounded-[1.25rem] flex items-center gap-3 hover:bg-slate-50 transition-all font-bold text-sm shadow-sm group">
                 <Printer size={20} className="group-hover:text-blue-500 transition-colors" /><span>Laporan</span><ChevronDown size={14} className={`transition-transform duration-300 ${showReportDropdown ? 'rotate-180' : ''}`} />
               </button>
               {showReportDropdown && (
                  <div className="absolute right-0 mt-3 w-64 bg-white border border-slate-100 rounded-[1.5rem] shadow-[0_20px_40px_rgba(0,0,0,0.1)] py-3 z-[60] animate-in fade-in slide-in-from-top-4 duration-300">
                     <p className="px-6 py-2 text-[10px] font-black uppercase text-slate-400 tracking-widest">Pilih Kategori</p>
                     <button onClick={() => handleGenerateReport('Semua')} className="w-full text-left px-6 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-4 transition-colors"><FileText size={18} className="text-blue-500" /> Semua Arsip</button>
                     <button onClick={() => handleGenerateReport('Masuk')} className="w-full text-left px-6 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-4 transition-colors"><FileCheck size={18} className="text-emerald-500" /> Surat Masuk</button>
                     <button onClick={() => handleGenerateReport('Keluar')} className="w-full text-left px-6 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-4 transition-colors"><Share2 size={18} className="text-indigo-500" /> Surat Keluar</button>
                  </div>
               )}
            </div>

            {currentUser.role === 'Administrator' && (
              <button onClick={handleOpenAdd} className="bg-slate-900 text-white px-8 py-3.5 rounded-[1.25rem] flex items-center gap-3 font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-900/10 hover:bg-blue-600 hover:shadow-blue-500/20 transition-all active:scale-[0.98]">
                <Plus size={20} /><span>Arsip Baru</span>
              </button>
            )}
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-12 no-print custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-12">
            {activeTab === 'dashboard' ? (
              <div className="space-y-12 animate-in fade-in duration-700">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  <StatCard label="Total Dokumen" value={stats.total} icon={<FileText />} color="text-blue-600" bg="bg-blue-50" />
                  <StatCard label="Arsip Masuk" value={stats.masuk} icon={<FileCheck />} color="text-emerald-600" bg="bg-emerald-50" />
                  <StatCard label="Arsip Keluar" value={stats.keluar} icon={<Share2 />} color="text-indigo-600" bg="bg-indigo-50" />
                  <StatCard label="Sedang Proses" value={stats.proses} icon={<Clock />} color="text-amber-600" bg="bg-amber-50" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm h-[450px] relative">
                    <div className="flex justify-between items-center mb-10 px-2">
                       <h3 className="font-black text-slate-900 flex items-center gap-4 tracking-tight text-xl"><TrendingUp size={24} className="text-blue-500" /> Grafik Aktivitas Bulanan</h3>
                       <div className="flex gap-4">
                          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div><span className="text-[10px] font-bold text-slate-400 uppercase">Masuk</span></div>
                          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div><span className="text-[10px] font-bold text-slate-400 uppercase">Keluar</span></div>
                       </div>
                    </div>
                    <div className="h-full w-full pb-16">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={CHART_DATA}>
                          <defs>
                            <linearGradient id="colorMasuk" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorKeluar" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} dy={15} />
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                          <Tooltip contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 'bold'}} />
                          <Area type="monotone" dataKey="masuk" stroke="#10b981" fillOpacity={1} fill="url(#colorMasuk)" strokeWidth={4} />
                          <Area type="monotone" dataKey="keluar" stroke="#3b82f6" fillOpacity={1} fill="url(#colorKeluar)" strokeWidth={4} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="bg-slate-900 p-10 rounded-[3rem] text-white flex flex-col relative overflow-hidden group shadow-2xl shadow-slate-900/20">
                    <Bot className="absolute -right-6 -bottom-6 opacity-10 group-hover:scale-110 group-hover:-rotate-12 transition-all duration-700" size={180} />
                    <div className="relative z-10">
                      <div className="bg-blue-500 w-14 h-14 rounded-2xl flex items-center justify-center mb-8 shadow-xl shadow-blue-500/20"><Bot size={28}/></div>
                      <h4 className="font-black text-2xl mb-4 tracking-tight">AI Data Analysis</h4>
                      <div className="h-px bg-white/10 w-20 mb-6"></div>
                      <p className="text-slate-400 text-sm leading-relaxed mb-8">Selamat datang! Saya mendeteksi peningkatan volume arsip pada periode ini. Pastikan untuk memperbarui status surat penting secara berkala.</p>
                      <button className="text-blue-400 font-black text-[10px] uppercase tracking-widest flex items-center gap-3 hover:text-white transition-colors group/btn">Mulai Insight Lanjutan <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform"/></button>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeTab === 'system' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-in slide-in-from-bottom-8 duration-500">
                <div className="bg-white p-12 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500">
                  <div className="bg-blue-50 w-16 h-16 rounded-3xl flex items-center justify-center text-blue-600 mb-8 shadow-inner"><CloudDownload size={28}/></div>
                  <h4 className="font-black text-2xl text-slate-900 mb-4 tracking-tight">Ekspor Database Lokal</h4>
                  <p className="text-slate-500 text-sm leading-relaxed mb-10">Unduh seluruh arsip surat dalam format JSON. File ini dapat digunakan untuk cadangan (backup) atau pemulihan data di kemudian hari.</p>
                  <button onClick={() => {
                    const blob = new Blob([JSON.stringify(suratList, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = `backup_lpse_ntb_${today}.json`; a.click();
                  }} className="w-full py-5 bg-slate-900 text-white rounded-[1.5rem] font-black tracking-widest uppercase text-[10px] flex items-center justify-center gap-4 hover:bg-blue-600 hover:-translate-y-1 transition-all shadow-xl shadow-slate-900/5">
                    <Download size={20}/> Download Cadangan (JSON)
                  </button>
                </div>

                <div className="bg-white p-12 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500">
                  <div className="bg-emerald-50 w-16 h-16 rounded-3xl flex items-center justify-center text-emerald-600 mb-8 shadow-inner"><CloudUpload size={28}/></div>
                  <h4 className="font-black text-2xl text-slate-900 mb-4 tracking-tight">Restorasi & Pemulihan</h4>
                  <p className="text-slate-500 text-sm leading-relaxed mb-10">Pilih file backup yang telah diunduh sebelumnya untuk mengembalikan seluruh data arsip ke kondisi cadangan tersebut.</p>
                  <button onClick={() => restoreInputRef.current?.click()} className="w-full py-5 bg-emerald-600 text-white rounded-[1.5rem] font-black tracking-widest uppercase text-[10px] flex items-center justify-center gap-4 hover:bg-emerald-700 hover:-translate-y-1 transition-all shadow-xl shadow-emerald-600/5">
                    <RefreshCw size={20}/> Unggah File Restorasi
                  </button>
                  <input type="file" ref={restoreInputRef} className="hidden" accept=".json" onChange={handleRestore} />
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-sm animate-in fade-in duration-500">
                <div className="overflow-x-auto p-6">
                  <table className="w-full text-left border-separate border-spacing-y-4">
                    <thead>
                      <tr className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
                        <th className="px-8 py-4">Rincian Dokumen</th>
                        <th className="px-8 py-4">Instansi Terkait</th>
                        <th className="px-8 py-4">Tanggal Dokumen</th>
                        <th className="px-8 py-4 text-center">Status</th>
                        <th className="px-8 py-4 text-right">Tindakan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedList.map(item => (
                        <tr key={item.id} className="group hover:bg-slate-50/80 transition-all cursor-default">
                          <td className="px-8 py-6 first:rounded-l-[2rem] border-y border-l border-transparent group-hover:border-slate-100">
                            <p className="font-black text-slate-900 line-clamp-1 text-sm tracking-tight">{item.perihal}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1.5 flex items-center gap-2"><Info size={10} className="text-blue-500"/> {item.noSurat}</p>
                          </td>
                          <td className="px-8 py-6 border-y border-transparent group-hover:border-slate-100 text-sm font-bold text-slate-600">{item.pihak}</td>
                          <td className="px-8 py-6 border-y border-transparent group-hover:border-slate-100 text-sm font-semibold text-slate-400">{item.tanggalSurat}</td>
                          <td className="px-8 py-6 border-y border-transparent group-hover:border-slate-100 text-center"><StatusBadge status={item.status}/></td>
                          <td className="px-8 py-6 last:rounded-r-[2rem] border-y border-r border-transparent group-hover:border-slate-100 text-right">
                            <div className="flex justify-end gap-3 opacity-60 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setSelectedSurat(item); setShowDetailModal(true); }} className="p-3 text-slate-400 hover:text-blue-600 hover:bg-white rounded-2xl transition-all shadow-sm hover:shadow-md"><Eye size={20}/></button>
                              {currentUser.role === 'Administrator' && (
                                <>
                                  <button onClick={() => handleEdit(item)} className="p-3 text-slate-400 hover:text-emerald-600 hover:bg-white rounded-2xl transition-all shadow-sm hover:shadow-md"><Edit3 size={20}/></button>
                                  <button onClick={() => handleDelete(item.id)} className="p-3 text-slate-400 hover:text-rose-600 hover:bg-white rounded-2xl transition-all shadow-sm hover:shadow-md"><Trash2 size={20}/></button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {paginatedList.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-20 text-center">
                             <div className="flex flex-col items-center gap-4">
                                <Activity size={40} className="text-slate-100" />
                                <p className="text-slate-400 font-bold text-sm tracking-tight italic">Tidak ditemukan arsip surat.</p>
                             </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  
                  {filteredList.length > itemsPerPage && (
                    <div className="px-8 py-10 border-t border-slate-50 flex justify-between items-center">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Halaman {currentPage} Dari {totalPages}</p>
                      <div className="flex gap-4">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-4 border-2 border-slate-50 rounded-2xl disabled:opacity-20 hover:bg-slate-50 transition-all text-slate-600"><ChevronLeft size={20}/></button>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-4 border-2 border-slate-50 rounded-2xl disabled:opacity-20 hover:bg-slate-50 transition-all text-slate-600"><ChevronRight size={20}/></button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal: Form Tambah/Edit */}
        {showFormModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[3rem] w-full max-w-3xl shadow-2xl overflow-hidden border border-white/20">
              <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                <div className="flex items-center gap-5"><div className="p-3 bg-white/10 rounded-2xl"><Plus size={24} className="text-yellow-500"/></div><h3 className="text-2xl font-black tracking-tight">{selectedSurat ? 'Edit Data Arsip' : 'Tambah Arsip Surat Digital'}</h3></div>
                <button onClick={() => setShowFormModal(false)} className="p-3 hover:bg-white/10 rounded-2xl transition-colors"><X/></button>
              </div>
              <form onSubmit={handleFormSubmit} className="p-10 space-y-8 max-h-[85vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-8">
                  <div className="col-span-2 space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Perihal / Isi Ringkas Surat</label>
                    <input required className="w-full px-6 py-4 bg-slate-100/50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-[1.5rem] outline-none font-bold text-sm transition-all" value={formData.perihal} onChange={e => setFormData({...formData, perihal: e.target.value})} placeholder="Contoh: Permohonan User ID Vendor..." />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Nomor Surat</label>
                    <input required className="w-full px-6 py-4 bg-slate-100/50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-[1.5rem] outline-none font-bold text-sm transition-all" value={formData.noSurat} onChange={e => setFormData({...formData, noSurat: e.target.value})} placeholder="X/LPSE/2024..." />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Instansi / Pihak</label>
                    <input required className="w-full px-6 py-4 bg-slate-100/50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-[1.5rem] outline-none font-bold text-sm transition-all" value={formData.pihak} onChange={e => setFormData({...formData, pihak: e.target.value})} placeholder="Nama Instansi atau Orang..." />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Kategori Arsip</label>
                    <select className="w-full px-6 py-4 bg-slate-100/50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-[1.5rem] outline-none font-bold text-sm transition-all appearance-none" value={formData.kategori} onChange={e => setFormData({...formData, kategori: e.target.value as KategoriSurat})}>
                      <option value="Masuk">Arsip Masuk</option>
                      <option value="Keluar">Arsip Keluar</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Status Dokumen</label>
                    <select className="w-full px-6 py-4 bg-slate-100/50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-[1.5rem] outline-none font-bold text-sm transition-all appearance-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as StatusSurat})}>
                      <option value="Proses">Dalam Proses</option>
                      <option value="Selesai">Selesai / Diarsipkan</option>
                      <option value="Penting">Penting / Segera</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Tanggal Surat</label>
                    <input type="date" className="w-full px-6 py-4 bg-slate-100/50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-[1.5rem] outline-none font-bold text-sm transition-all" value={formData.tanggalSurat} onChange={e => setFormData({...formData, tanggalSurat: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Tanggal Diterima</label>
                    <input type="date" className="w-full px-6 py-4 bg-slate-100/50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-[1.5rem] outline-none font-bold text-sm transition-all" value={formData.tanggalTerima} onChange={e => setFormData({...formData, tanggalTerima: e.target.value})} />
                  </div>

                  {/* Upload Dropzone */}
                  <div className="col-span-2 space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Unggah Dokumen (PDF/Gambar - Maks 15MB)</label>
                    {!formData.fileData ? (
                       <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-slate-200 rounded-[2rem] p-10 flex flex-col items-center justify-center bg-slate-50 cursor-pointer hover:bg-slate-100 hover:border-blue-300 transition-all group">
                         <div className="bg-white p-5 rounded-2xl shadow-sm mb-4 group-hover:scale-110 transition-transform duration-300"><Upload className="text-blue-500" size={32} /></div>
                         <p className="text-sm font-bold text-slate-500">Klik untuk memilih file dokumen digital</p>
                         <p className="text-[10px] text-slate-300 font-bold uppercase mt-2 tracking-widest">Format: PDF, JPG, PNG</p>
                         <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.docx,.jpg,.jpeg,.png" onChange={handleFileChange} />
                       </div>
                    ) : (
                       <div className="p-6 bg-blue-50 rounded-[1.5rem] flex items-center justify-between border-2 border-blue-100 group shadow-sm">
                         <div className="flex items-center gap-4">
                           <div className="bg-white p-3 rounded-xl shadow-sm"><FileIcon size={24} className="text-blue-600" /></div>
                           <div className="truncate">
                              <span className="text-sm font-black text-blue-900 block truncate max-w-[400px]">{formData.fileName}</span>
                              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">File Berhasil Disematkan</span>
                           </div>
                         </div>
                         <button type="button" onClick={() => setFormData({...formData, fileData: '', fileName: ''})} className="bg-white text-rose-500 hover:bg-rose-500 hover:text-white p-3 rounded-2xl transition-all shadow-sm"><X size={20}/></button>
                       </div>
                    )}
                  </div>
                </div>
                <div className="pt-8 flex gap-6">
                  <button type="submit" className="flex-1 bg-slate-900 text-white py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-slate-900/10 hover:bg-blue-600 transition-all active:scale-[0.98]">Simpan Data Arsip</button>
                  <button type="button" onClick={() => setShowFormModal(false)} className="px-10 bg-slate-100 text-slate-600 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">Batalkan</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Detail Dokumen & Preview (FITUR TERBARU) */}
        {showDetailModal && selectedSurat && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[3rem] w-full max-w-6xl shadow-2xl p-0 overflow-hidden flex flex-col max-h-[92vh] border border-white/20">
              {/* Toolbar Atas */}
              <div className="p-8 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-6">
                   <div className="p-4 bg-white rounded-2xl shadow-sm"><FileIcon className="text-blue-500" size={24}/></div>
                   <div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none">{selectedSurat.perihal}</h3>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-2 tracking-widest flex items-center gap-2"><Info size={12} className="text-blue-500"/> {selectedSurat.noSurat}</p>
                   </div>
                </div>
                <div className="flex items-center gap-4">
                  {selectedSurat.fileData && (
                     <button 
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = selectedSurat.fileData!;
                          link.download = selectedSurat.fileName || `arsip_${selectedSurat.noSurat.replace(/[/\\?%*:|"<>]/g, '-')}`;
                          link.click();
                        }} 
                        className="flex items-center gap-3 bg-emerald-600 text-white px-8 py-3.5 rounded-[1.25rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 hover:-translate-y-1 transition-all"
                      >
                        <Download size={20}/> Download File
                      </button>
                  )}
                  <button onClick={() => setShowDetailModal(false)} className="p-3 hover:bg-slate-200 rounded-2xl transition-all text-slate-400"><X size={24}/></button>
                </div>
              </div>
              
              <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                {/* Panel Informasi Sebelah Kiri */}
                <div className="w-full lg:w-[350px] p-10 bg-white border-r border-slate-50 overflow-y-auto custom-scrollbar space-y-10">
                  <div className="space-y-8">
                    <DetailItem label="Instansi / Pengirim" value={selectedSurat.pihak}/>
                    <div className="grid grid-cols-1 gap-6">
                      <DetailItem label="Kategori" value={selectedSurat.kategori}/>
                      <DetailItem label="Status Dokumen" value={selectedSurat.status} isStatus/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <DetailItem label="Tanggal Surat" value={selectedSurat.tanggalSurat}/>
                      <DetailItem label="Tgl Terima" value={selectedSurat.tanggalTerima}/>
                    </div>
                  </div>
                  
                  <div className="p-6 bg-blue-50/50 rounded-[1.5rem] border border-blue-100 shadow-inner">
                    <p className="text-[10px] font-black uppercase text-blue-500 mb-3 flex items-center gap-2 tracking-[0.2em]"><Bot size={14}/> Ringkasan AI</p>
                    <p className="text-sm font-bold text-blue-900 leading-relaxed italic">"{selectedSurat.isiRingkas || 'Menunggu pemrosesan data...'}"</p>
                  </div>

                  <div className="pt-6">
                     <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Meta Data Arsip</p>
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-100 shadow-sm"><Activity size={18} className="text-blue-400"/></div>
                           <div>
                              <p className="text-[10px] font-bold text-slate-800">ID Sistem: {selectedSurat.id}</p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Status Storage: Aktif</p>
                           </div>
                        </div>
                     </div>
                  </div>
                </div>

                {/* Panel Pratinjau (Preview) Sebelah Kanan */}
                <div className="flex-1 bg-slate-100 flex flex-col p-6 overflow-hidden">
                  <div className="flex justify-between items-center mb-4 px-2">
                     <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><Eye size={12}/> Pratinjau Dokumen Digital</p>
                     {selectedSurat.fileData && (
                        <button 
                          onClick={() => {
                            const win = window.open();
                            win?.document.write(`<iframe src="${selectedSurat.fileData}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                          }}
                          className="flex items-center gap-2 text-[10px] font-black uppercase text-blue-600 hover:text-blue-800 tracking-widest transition-colors"
                        >
                          Buka Tab Baru <ExternalLink size={14}/>
                        </button>
                     )}
                  </div>
                  
                  <div className="bg-white border-2 border-slate-200 rounded-[2.5rem] overflow-hidden flex-1 shadow-inner flex items-center justify-center relative group/preview">
                    {selectedSurat.fileData ? (
                      selectedSurat.fileType?.startsWith('image/') ? (
                        <img 
                          src={selectedSurat.fileData} 
                          alt="Document Preview" 
                          className="w-full h-full object-contain animate-in fade-in duration-700" 
                        />
                      ) : selectedSurat.fileType === 'application/pdf' ? (
                        <iframe 
                          src={`${selectedSurat.fileData}#toolbar=0&navpanes=0&scrollbar=1`} 
                          className="w-full h-full border-none"
                          title="PDF Viewer"
                        />
                      ) : (
                        <div className="text-center p-16 max-w-sm">
                          <div className="bg-slate-50 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-sm"><FileIcon size={48} className="text-slate-200" /></div>
                          <p className="text-slate-900 font-black text-lg tracking-tight mb-2">Format File Khusus</p>
                          <p className="text-slate-400 text-sm font-medium leading-relaxed">Format dokumen ini tidak mendukung pratinjau langsung. Silakan gunakan tombol unduh untuk melihat konten selengkapnya.</p>
                        </div>
                      )
                    ) : (
                      <div className="text-center p-16 max-w-sm">
                        <div className="bg-slate-50 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-sm"><Activity size={48} className="text-slate-100" /></div>
                        <p className="text-slate-400 font-black text-lg tracking-tight italic opacity-40">Dokumen Digital Belum Terarsip</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Print Preview Formal */}
        {showPrintPreview && (
           <div className="fixed inset-0 z-[200] bg-slate-900/95 flex items-center justify-center p-6 animate-in fade-in duration-500">
              <div className="bg-white w-full max-w-6xl h-[95vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden border border-white/20">
                 <div className="p-8 bg-[#0F172A] text-white flex justify-between items-center no-print">
                    <div className="flex items-center gap-6"><div className="p-3 bg-white/10 rounded-2xl text-yellow-500"><Printer size={28}/></div><h3 className="text-2xl font-black tracking-tight uppercase">Pratinjau Laporan: {reportType}</h3></div>
                    <div className="flex items-center gap-4">
                      <button onClick={() => window.print()} className="bg-yellow-500 text-slate-900 px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-yellow-500/20 hover:bg-yellow-400 active:scale-[0.98] transition-all flex items-center gap-3">
                        <Printer size={20} /><span>Cetak Laporan</span>
                      </button>
                      <button onClick={() => setShowPrintPreview(false)} className="bg-white/10 p-3.5 rounded-2xl hover:bg-white/20 transition-all"><X size={24}/></button>
                    </div>
                 </div>
                 <div className="flex-1 overflow-y-auto p-16 bg-slate-200 flex justify-center custom-scrollbar">
                    <div className="bg-white w-[210mm] min-h-[297mm] p-[30mm] flex flex-col text-black shadow-2xl border border-slate-300">
                       <div className="flex items-center gap-8 border-b-[4px] border-black pb-6 mb-12">
                          <div className="w-24 h-24 bg-slate-100 border-2 border-black flex items-center justify-center text-[10px] font-black text-center p-3 leading-none uppercase">Logo Pemerintah Prov NTB</div>
                          <div className="text-center flex-1 space-y-1">
                             <h4 className="text-xl font-bold uppercase tracking-wide leading-tight">Pemerintah Provinsi Nusa Tenggara Barat</h4>
                             <h4 className="text-2xl font-black uppercase tracking-tight">Biro Pengadaan Barang dan Jasa</h4>
                             <p className="text-base font-bold tracking-tight">Layanan Pengadaan Secara Elektronik (LPSE)</p>
                             <p className="text-[10px] font-medium italic opacity-60">Jalan Pejanggik No. 12, Mataram - NTB</p>
                          </div>
                          <div className="w-24 h-24 border-2 border-black flex items-center justify-center bg-slate-50"><QrCode size={64}/></div>
                       </div>
                       <h5 className="text-center font-black text-xl underline mb-10 uppercase tracking-widest">LAPORAN ARSIP DIGITAL {reportType !== 'Semua' ? `SURAT ${reportType.toUpperCase()}` : 'SELURUH DOKUMEN'}</h5>
                       <table className="w-full border-collapse border-[2.5px] border-black text-xs">
                          <thead className="bg-slate-50 font-black uppercase text-center tracking-widest">
                             <tr>
                                <th className="border-2 border-black p-3 w-10">No</th>
                                <th className="border-2 border-black p-3">Nomor Surat</th>
                                <th className="border-2 border-black p-3">Tgl Dokumen</th>
                                <th className="border-2 border-black p-3 text-left">Perihal</th>
                                <th className="border-2 border-black p-3 text-left">Instansi / Pihak</th>
                             </tr>
                          </thead>
                          <tbody>
                             {(reportType === 'Semua' ? suratList : suratList.filter(s => s.kategori === reportType)).map((s, idx) => (
                                <tr key={s.id} className="font-medium">
                                   <td className="border-2 border-black p-3 text-center font-bold">{idx + 1}</td>
                                   <td className="border-2 border-black p-3 text-center font-bold">{s.noSurat}</td>
                                   <td className="border-2 border-black p-3 text-center">{s.tanggalSurat}</td>
                                   <td className="border-2 border-black p-3 leading-relaxed">{s.perihal}</td>
                                   <td className="border-2 border-black p-3">{s.pihak}</td>
                                </tr>
                             ))}
                             {suratList.length === 0 && (
                               <tr><td colSpan={5} className="border-2 border-black p-10 text-center italic opacity-40">Data tidak tersedia untuk periode ini.</td></tr>
                             )}
                          </tbody>
                       </table>
                       <div className="mt-20 flex justify-end text-center">
                          <div className="w-72">
                             <p className="text-sm font-bold mb-2">Mataram, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                             <p className="text-sm font-black uppercase mb-24 leading-none">Kepala LPSE Prov. NTB</p>
                             <div className="h-px bg-black mb-1"></div>
                             <p className="text-sm font-black uppercase tracking-widest underline">LALU MAJEMUK, S.Sos.</p>
                             <p className="text-xs font-bold mt-1 opacity-80">NIP. 19800101 200501 1 001</p>
                          </div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        )}
      </main>
      
      {/* Global Styles for Scrollbar & Clean Look */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.1); }
        
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-in-top { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-in { animation: fade-in 0.3s ease-out; }
        .slide-in-top { animation: slide-in-top 0.3s ease-out; }
      `}</style>
    </div>
  );
};

// --- Functional Components ---
const SidebarLink: React.FC<{ icon: React.ReactNode, label: string, active: boolean, collapsed: boolean, onClick: () => void }> = ({ icon, label, active, collapsed, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-5 p-4 rounded-2xl transition-all duration-300 relative group ${active ? 'bg-yellow-500 text-slate-900 shadow-xl shadow-yellow-500/10' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
    <div className={`shrink-0 transition-transform duration-300 group-hover:scale-110 ${active ? 'scale-110' : ''}`}>{React.cloneElement(icon as React.ReactElement<any>, { size: 24 })}</div>
    {!collapsed && <span className="text-sm font-black tracking-tight">{label}</span>}
    {active && <div className="absolute right-4 w-1.5 h-1.5 rounded-full bg-slate-900"></div>}
  </button>
);

const StatCard: React.FC<{ label: string, value: number, icon: React.ReactNode, color: string, bg: string }> = ({ label, value, icon, color, bg }) => (
  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-500 group">
    <div className={`${bg} ${color} p-5 rounded-[1.5rem] shadow-inner transition-transform duration-500 group-hover:scale-110`}>{React.cloneElement(icon as React.ReactElement<any>, { size: 30 })}</div>
    <div><p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{label}</p><h4 className="text-3xl font-black text-slate-900 tracking-tighter">{value}</h4></div>
  </div>
);

const StatusBadge: React.FC<{ status: StatusSurat }> = ({ status }) => {
  const styles = { 
    'Selesai': 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-emerald-500/5', 
    'Penting': 'bg-rose-50 text-rose-700 border-rose-100 shadow-rose-500/5', 
    'Proses': 'bg-amber-50 text-amber-700 border-amber-100 shadow-amber-500/5' 
  };
  return <span className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${styles[status]}`}>{status}</span>;
};

const DetailItem: React.FC<{ label: string, value: string, full?: boolean, isStatus?: boolean }> = ({ label, value, full, isStatus }) => (
  <div className={full ? 'col-span-2' : ''}>
    <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">{label}</p>
    {isStatus ? <StatusBadge status={value as StatusSurat}/> : <p className="font-black text-slate-900 leading-tight text-base tracking-tight">{value || '-'}</p>}
  </div>
);

export default App;
