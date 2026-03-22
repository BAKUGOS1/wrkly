
export default function WorkspaceDashboard() {
  return (
    <div className="bg-surface font-body text-on-surface min-h-screen">

{/* SideNavBar */}
<aside className="fixed left-0 top-0 h-full w-64 z-40 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-xl flex flex-col p-6 gap-y-8 border-r border-slate-200/50 dark:border-slate-800/50">
<div className="flex items-center gap-3">
<div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-container rounded-xl flex items-center justify-center text-white">
<span className="material-symbols-outlined" data-icon="dashboard">dashboard</span>
</div>
<div>
<h2 className="text-lg font-bold text-slate-900 dark:text-slate-50 font-headline leading-tight">Lucid Curator</h2>
<p className="text-xs text-slate-500 font-medium">Workspace</p>
</div>
</div>
<nav className="flex flex-col gap-y-2 flex-1">
<a className="flex items-center gap-3 px-4 py-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl transition-all duration-300 ease-in-out active:scale-[0.98]" href="#">
<span className="material-symbols-outlined" data-icon="home">home</span>
<span className="font-manrope">Home</span>
</a>
<a className="flex items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-xl transition-all duration-300 ease-in-out active:scale-[0.98]" href="#">
<span className="material-symbols-outlined" data-icon="dashboard_customize">dashboard_customize</span>
<span className="font-manrope">Boards</span>
</a>
<a className="flex items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-xl transition-all duration-300 ease-in-out active:scale-[0.98]" href="#">
<span className="material-symbols-outlined" data-icon="group">group</span>
<span className="font-manrope">Team</span>
</a>
<a className="flex items-center gap-3 px-4 py-3 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-xl transition-all duration-300 ease-in-out active:scale-[0.98]" href="#">
<span className="material-symbols-outlined" data-icon="settings">settings</span>
<span className="font-manrope">Settings</span>
</a>
</nav>
<div className="mt-auto p-4 bg-surface-container rounded-2xl">
<p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-2">Storage</p>
<div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden mb-2">
<div className="h-full bg-gradient-to-r from-primary to-primary-container" ></div>
</div>
<p className="text-[11px] text-on-surface-variant">6.5 GB of 10 GB used</p>
</div>
</aside>
{/* TopAppBar */}
<header className="fixed top-0 right-0 left-64 z-50 bg-slate-50/70 dark:bg-slate-900/70 backdrop-blur-2xl flex justify-between items-center px-8 py-4 font-manrope antialiased tracking-tight">
<div className="flex items-center bg-surface-container-high px-4 py-2 rounded-xl w-96 group focus-within:bg-surface-container-lowest transition-all">
<span className="material-symbols-outlined text-outline" data-icon="search">search</span>
<input className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-outline" placeholder="Search boards or tasks..." type="text"/>
</div>
<div className="flex items-center gap-6">
<button className="text-slate-600 dark:text-slate-400 font-medium hover:text-indigo-500 transition-colors duration-200 active:scale-95">Support</button>
<div className="relative active:scale-95 transition-transform cursor-pointer">
<span className="material-symbols-outlined text-slate-600" data-icon="notifications">notifications</span>
<span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full"></span>
</div>
<div className="flex items-center gap-3 pl-4 border-l border-outline-variant/30">
<img alt="User Profile Avatar" className="w-9 h-9 rounded-full object-cover border-2 border-primary-fixed" data-alt="Close-up portrait of a professional woman profile avatar" src="https://lh3.googleusercontent.com/aida-public/AB6AXuChYcSEeRtegCtCEkefEi3QKGvooXznW8yXYhTxxAYW0qwYFij0g-w1hosMRkuDmr95gtskL5lSQ_MuKP1FJFXJfIG4yskdwDhFwmXHNvaY07yPDEv3cfWm8GOZCZk2haSPqYrOnMoZbnC4336rU1lUM814D1qknAeCa_ZZS0J1yvwn4ty7I8JPBsRSJiFCfUR9WZKsman9-BtXooFrQOFRERwbwwK8B8XOhe-wdf01Dk-6KpcGpK5mD8f4F2Oi5feNVxxgLRUebVw"/>
</div>
</div>
</header>
{/* Main Canvas */}
<main className="pl-64 pt-24 pb-12 min-h-screen">
<div className="max-w-7xl mx-auto px-10">
{/* Hero Header Section */}
<section className="mb-12 flex justify-between items-end">
<div>
<h1 className="text-5xl font-extrabold font-headline tracking-tighter text-on-surface mb-2">Good morning, Alex</h1>
<p className="text-on-surface-variant text-lg">Here's what's happening across your workspace today.</p>
</div>
<div className="flex gap-4">
<button className="px-6 py-3 rounded-xl border border-outline-variant text-primary font-bold hover:bg-surface-container-high transition-all active:scale-95 flex items-center gap-2">
<span className="material-symbols-outlined" data-icon="person_add">person_add</span>
                        Invite Members
                    </button>
<button className="px-8 py-3 rounded-xl bg-gradient-to-br from-primary to-primary-container text-white font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all active:scale-95 flex items-center gap-2">
<span className="material-symbols-outlined" data-icon="add">add</span>
                        Create Board
                    </button>
</div>
</section>
{/* Bento Grid - Content Sections */}
<div className="grid grid-cols-12 gap-8">
{/* Recent Boards (Grid) */}
<div className="col-span-12 lg:col-span-8">
<div className="flex items-center justify-between mb-6">
<h3 className="text-xl font-bold font-headline tracking-tight text-on-surface">Recent Boards</h3>
<button className="text-sm font-semibold text-primary flex items-center gap-1 hover:underline">View All <span className="material-symbols-outlined text-sm" data-icon="arrow_forward">arrow_forward</span></button>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
{/* Card 1 */}
<div className="bg-surface-container-lowest rounded-[1.5rem] p-5 shadow-sm hover:shadow-xl transition-all duration-300 group border border-transparent hover:border-outline-variant/20">
<div className="h-32 rounded-xl mb-4 overflow-hidden relative">
<div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-blue-400 opacity-90 group-hover:scale-110 transition-transform duration-500"></div>
<div className="absolute inset-0 flex items-center justify-center">
<span className="material-symbols-outlined text-white/50 text-4xl" data-icon="trending_up">trending_up</span>
</div>
</div>
<h4 className="font-bold text-on-surface mb-1">Q1 Marketing Plan</h4>
<p className="text-xs text-on-surface-variant flex items-center gap-1">
<span className="material-symbols-outlined text-xs" data-icon="schedule">schedule</span> 2 hours ago
                            </p>
</div>
{/* Card 2 */}
<div className="bg-surface-container-lowest rounded-[1.5rem] p-5 shadow-sm hover:shadow-xl transition-all duration-300 group border border-transparent hover:border-outline-variant/20">
<div className="h-32 rounded-xl mb-4 overflow-hidden relative">
<div className="absolute inset-0 bg-gradient-to-tr from-purple-500 to-pink-400 opacity-90 group-hover:scale-110 transition-transform duration-500"></div>
<div className="absolute inset-0 flex items-center justify-center">
<span className="material-symbols-outlined text-white/50 text-4xl" data-icon="rocket_launch">rocket_launch</span>
</div>
</div>
<h4 className="font-bold text-on-surface mb-1">Product Roadmap</h4>
<p className="text-xs text-on-surface-variant flex items-center gap-1">
<span className="material-symbols-outlined text-xs" data-icon="schedule">schedule</span> Yesterday
                            </p>
</div>
{/* Card 3 */}
<div className="bg-surface-container-lowest rounded-[1.5rem] p-5 shadow-sm hover:shadow-xl transition-all duration-300 group border border-transparent hover:border-outline-variant/20">
<div className="h-32 rounded-xl mb-4 overflow-hidden relative">
<div className="absolute inset-0 bg-gradient-to-tr from-emerald-500 to-teal-400 opacity-90 group-hover:scale-110 transition-transform duration-500"></div>
<div className="absolute inset-0 flex items-center justify-center">
<span className="material-symbols-outlined text-white/50 text-4xl" data-icon="search_check">search_check</span>
</div>
</div>
<h4 className="font-bold text-on-surface mb-1">Design Audit</h4>
<p className="text-xs text-on-surface-variant flex items-center gap-1">
<span className="material-symbols-outlined text-xs" data-icon="schedule">schedule</span> 3 days ago
                            </p>
</div>
</div>
{/* Task Progress Overlay Card (Editorial Style) */}
<div className="mt-8 bg-surface-container-high rounded-[2rem] p-8 flex items-center justify-between relative overflow-hidden group">
<div className="relative z-10">
<span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-full uppercase tracking-widest mb-4 inline-block">Active Sprint</span>
<h3 className="text-2xl font-bold font-headline text-on-surface mb-2">Platform Redesign 2.0</h3>
<div className="flex items-center gap-6 mt-4">
<div className="flex -space-x-3">
<img alt="Team member" className="w-8 h-8 rounded-full border-2 border-surface-container-high" data-alt="Profile of a male team member" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBBCaYGjdd1Pr0BB1wjjI8SxKCDbspQYj1Sx239L3cipnwP5ZB5L2qvdCPy9WsPzZid5sD358yutS8gHsimFrGTEgc2V1gm5t27iRaW4bY2m7cth6UYQuuLNgvIvRLAE8m-6F7uG_XKiaDM3aPNjgKJRflLob8Fgpw8D7wsE1t3IwndwFw1iotgqXMN9Q6MLQleHnMZf0sKhrlKAxNTVX2tSJi-7GeNfLphLUOGgQ3uIpreV5LQpmFU1hke7U31KhkbErrPbbTPiGc"/>
<img alt="Team member" className="w-8 h-8 rounded-full border-2 border-surface-container-high" data-alt="Profile of a female team member" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDbyX65s7FYW9ieRpI2O_L4zHyl1nE6Chc5JlRkhxdS2d5EQ6gs0cf-wBxM84u9CQGTPflsKHeWLfTD5GlS_4SJdDkGwH9QPPALQ0g31snCzUCMZxg-rNuXnWtSR4Y_Kr7LCKkb279UiYqz0lOg3WKsmAwiJqmSdUyDD6kleWf9xI6mfNRQuJ4ojr1SC6dV9tj6e2mO34Rj9MQyFo1m_qGoyMAtzmw77FxA4JHj8PzKBBio6pUPhgqEae-mWL1pDVmrW7BsBmQkdQc"/>
<div className="w-8 h-8 rounded-full bg-primary-fixed text-[10px] font-bold flex items-center justify-center border-2 border-surface-container-high">+4</div>
</div>
<div className="flex-1 min-w-[200px]">
<div className="flex justify-between text-xs font-bold text-on-surface-variant mb-1">
<span>Progress</span>
<span>74%</span>
</div>
<div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
<div className="h-full bg-gradient-to-r from-secondary to-secondary-container" ></div>
</div>
</div>
</div>
</div>
<div className="absolute -right-12 -bottom-12 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors"></div>
</div>
</div>
{/* Activity Stream (Sidebar Style) */}
<div className="col-span-12 lg:col-span-4">
<div className="bg-surface-container-low rounded-[1.5rem] p-6 h-full border border-outline-variant/10">
<h3 className="text-xl font-bold font-headline tracking-tight text-on-surface mb-6">Activity Stream</h3>
<div className="space-y-6">
{/* Activity Item 1 */}
<div className="flex gap-4 group cursor-pointer">
<div className="relative">
<img alt="Sarah" className="w-10 h-10 rounded-full object-cover" data-alt="Sarah profile picture" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDuP6fB9pLjGdUdAKI9CC75zl_Dnx_Vlx2UpprSWhG8ZlKPSTk2BPS36hy78wJCPbGFVAa6_pncI8bDOC1it07nsRzjIctZ6uiEf_KJR4Y-pWN8bwdOofmzZ_Tpjls0U2I9mCubkEYKTYLwfV5hTSy89Spoay7xUxrkSlnKoxZKQCTo9LhEK4cKTRsJVOoDAbTKk3NIq7SFOboRURhvPUUnM0hB4V8w_MVfRE5LDWI5zPo9mcRkMa1WvkiPg1CQpJfRRYbgVsUCP1M"/>
<div className="absolute -bottom-1 -right-1 w-5 h-5 bg-tertiary-container rounded-full flex items-center justify-center">
<span className="material-symbols-outlined text-[10px] text-white" data-icon="chat_bubble">chat_bubble</span>
</div>
</div>
<div className="flex-1">
<p className="text-sm text-on-surface leading-snug">
<span className="font-bold">Sarah</span> commented on <span className="font-semibold text-primary">Design Audit</span>
</p>
<p className="text-[11px] text-on-surface-variant mt-1 italic">"The contrast in the header needs adjustment..."</p>
<p className="text-[10px] text-outline mt-1 font-semibold uppercase tracking-tight">12 MIN AGO</p>
</div>
</div>
{/* Activity Item 2 */}
<div className="flex gap-4 group cursor-pointer">
<div className="relative">
<img alt="James" className="w-10 h-10 rounded-full object-cover" data-alt="James profile picture" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAUfx-_ggZE8PCYrNhgwkN_dZAcNopwxoP3gH2614Qw2RwJLUxprU2Gh5QvqBU_gZNUco18VU5OcJAs8_3sd1hAL80i4YQ0eEs78kPIXX1vpFoEjsXR_2gtm4Nbx7JXExI3yDoIK3DtdPBV_ZAyn5gG7vblhgo1X2R4ZRKerqJftSKpoy-l10FDUFYLxZKmYlzFiZ6q1CVN3rEctwsvrFr9O6c0OFsFbpqDCGINb1UxoMPH3LsixH6vkBT3eLenPL5AeR8_BEjXDf4"/>
<div className="absolute -bottom-1 -right-1 w-5 h-5 bg-secondary-container rounded-full flex items-center justify-center">
<span className="material-symbols-outlined text-[10px] text-on-secondary-container" data-icon="share">share</span>
</div>
</div>
<div className="flex-1">
<p className="text-sm text-on-surface leading-snug">
<span className="font-bold">James</span> shared a new board <span className="font-semibold text-primary">Investor Pitch</span>
</p>
<p className="text-[10px] text-outline mt-1 font-semibold uppercase tracking-tight">1 HOUR AGO</p>
</div>
</div>
{/* Activity Item 3 */}
<div className="flex gap-4 group cursor-pointer">
<div className="relative">
<div className="w-10 h-10 rounded-full bg-primary-fixed-dim flex items-center justify-center text-white">
<span className="material-symbols-outlined" data-icon="edit_note">edit_note</span>
</div>
<div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
<span className="material-symbols-outlined text-[10px] text-white" data-icon="check">check</span>
</div>
</div>
<div className="flex-1">
<p className="text-sm text-on-surface leading-snug">
<span className="font-bold">System</span> automatically updated <span className="font-semibold text-primary">Q1 Marketing Plan</span>
</p>
<p className="text-[10px] text-outline mt-1 font-semibold uppercase tracking-tight">3 HOURS AGO</p>
</div>
</div>
{/* Activity Item 4 */}
<div className="flex gap-4 group cursor-pointer">
<div className="relative">
<img alt="Mike" className="w-10 h-10 rounded-full object-cover" data-alt="Mike profile picture" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAxmHSqWcrfdhOqNk2ILfi0Mz5ptac_RcbPIcwYMCMG3s8tPcFVavhOcqEfs5VoF4GyDVwFXH_0HW8U866k9BdAr9Pwt4HqtdR4BHfvUCiq62o97ZQBX7W5QwlB7sWGgqk0VmQPZWhqcuHNJ9MnNhwukaES9BHiuidiMq-0R1h5EBlowvfcZWux2btTrvrcUcoD9ZYCK16btzzrGtTysHUOFc-mg2WG45nsvKNanWJPVf6B2nPBRKjlzjVm213m8hAb00kU-ZKPMbM"/>
<div className="absolute -bottom-1 -right-1 w-5 h-5 bg-error-container rounded-full flex items-center justify-center">
<span className="material-symbols-outlined text-[10px] text-white" data-icon="priority_high">priority_high</span>
</div>
</div>
<div className="flex-1">
<p className="text-sm text-on-surface leading-snug">
<span className="font-bold">Mike</span> flagged <span className="font-semibold text-primary">Technical Specs</span> as urgent
                                    </p>
<p className="text-[10px] text-outline mt-1 font-semibold uppercase tracking-tight">5 HOURS AGO</p>
</div>
</div>
</div>
<button className="w-full mt-8 py-3 rounded-xl border border-outline-variant text-on-surface-variant text-xs font-bold uppercase tracking-widest hover:bg-surface-container-highest transition-colors">
                            Load More Updates
                        </button>
</div>
</div>
</div>
</div>
</main>
{/* Footer Component */}
<footer className="pl-64 w-full py-12 flex flex-row justify-center items-center space-x-8 font-inter text-[11px] uppercase tracking-[0.05em] font-semibold">
<span className="text-slate-500 dark:text-slate-400">© 2024 The Fluid Workspace</span>
<div className="flex space-x-8">
<a className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 underline underline-offset-4 cursor-pointer transition-all" href="#">Terms of Service</a>
<a className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 underline underline-offset-4 cursor-pointer transition-all" href="#">Privacy Policy</a>
<a className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 underline underline-offset-4 cursor-pointer transition-all" href="#">Help Center</a>
</div>
</footer>

</div>
  );
}
