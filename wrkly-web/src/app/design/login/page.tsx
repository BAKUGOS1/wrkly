
export default function LoginPage() {
  return (
    <div className="bg-surface font-body text-on-surface antialiased overflow-hidden h-screen">

<main className="flex h-full w-full">
<section className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-inverse-surface items-center justify-center p-12">
<div className="absolute inset-0 bg-auth-mesh opacity-60"></div>
<div className="absolute inset-0 backdrop-blur-3xl"></div>
<div className="relative z-10 w-full max-w-lg">
<div className="mb-12">
<span className="inline-block px-4 py-1.5 rounded-full bg-primary/20 border border-primary/30 text-primary-container text-[11px] uppercase tracking-[0.1em] font-bold mb-6">
                        System v2.4
                    </span>
<h1 className="font-headline text-display-lg text-6xl font-extrabold tracking-tight text-surface-container-lowest leading-[1.1] mb-6">
                        Curate your <br/><span className="text-primary-container">productivity.</span>
</h1>
<p className="text-xl text-outline-variant font-medium max-w-md leading-relaxed">
                        Experience a workspace that breathes with you. Precision engineering meets editorial elegance.
                    </p>
</div>
<div className="grid grid-cols-2 gap-4">
<div className="p-6 rounded-2xl bg-surface-container-lowest/5 backdrop-blur-md border border-surface-container-lowest/10">
<span className="material-symbols-outlined text-primary-container mb-4" >fluid</span>
<h3 className="text-surface-container-lowest font-semibold mb-1">Focus Flow</h3>
<p className="text-outline-variant text-sm">Adaptive interfaces for deep work sessions.</p>
</div>
<div className="p-6 rounded-2xl bg-surface-container-lowest/5 backdrop-blur-md border border-surface-container-lowest/10">
<span className="material-symbols-outlined text-primary-container mb-4" >layers</span>
<h3 className="text-surface-container-lowest font-semibold mb-1">Layered Logic</h3>
<p className="text-outline-variant text-sm">Organize projects with multi-dimensional depth.</p>
</div>
</div>
</div>
<div className="absolute -bottom-24 -right-24 w-96 h-96 bg-primary opacity-20 blur-[120px] rounded-full"></div>
<div className="absolute -top-24 -left-24 w-64 h-64 bg-secondary opacity-20 blur-[100px] rounded-full"></div>
</section>
<section className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 md:p-12 lg:p-24 bg-surface">
<div className="w-full max-w-md">
<div className="mb-10 text-center lg:text-left">
<div className="flex items-center justify-center lg:justify-start gap-2 mb-8">
<div className="w-10 h-10 rounded-xl bg-primary-gradient flex items-center justify-center shadow-lg shadow-primary/20">
<span className="material-symbols-outlined text-white text-2xl" >blur_on</span>
</div>
<span className="font-headline text-2xl font-bold tracking-tight text-on-surface">Lucid Curator</span>
</div>
<h2 className="text-3xl font-bold text-on-surface tracking-tight mb-2">Welcome back</h2>
<p className="text-on-surface-variant font-medium">Please enter your details to access your workspace.</p>
</div>
<form className="space-y-6">
<div>
<label className="block text-[11px] uppercase tracking-[0.05em] font-bold text-on-surface-variant mb-2 ml-1" htmlFor="email">Email Address</label>
<input className="w-full px-4 py-3.5 rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest text-on-surface transition-all placeholder:text-outline" id="email" name="email" placeholder="name@company.com" type="email"/>
</div>
<div>
<div className="flex justify-between items-center mb-2 ml-1">
<label className="block text-[11px] uppercase tracking-[0.05em] font-bold text-on-surface-variant" htmlFor="password">Password</label>
<a className="text-[11px] uppercase tracking-[0.05em] font-bold text-primary hover:text-primary-dim transition-colors" href="#">Forgot Password?</a>
</div>
<div className="relative">
<input className="w-full px-4 py-3.5 rounded-xl bg-surface-container-high border-none focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest text-on-surface transition-all placeholder:text-outline" id="password" name="password" placeholder="••••••••" type="password"/>
<button className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary transition-colors" type="button">
<span className="material-symbols-outlined text-xl">visibility</span>
</button>
</div>
</div>
<div className="flex items-center space-x-3 ml-1">
<input className="w-5 h-5 rounded border-outline-variant bg-surface-container-high text-primary focus:ring-primary/20 transition-all" id="remember" name="remember" type="checkbox"/>
<label className="text-sm font-medium text-on-surface-variant select-none" htmlFor="remember">Remember Me</label>
</div>
<button className="w-full py-4 rounded-xl bg-primary-gradient text-on-primary font-bold text-base shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all duration-200" type="submit">
                        Sign In
                    </button>
</form>
<div className="relative my-10">
<div className="absolute inset-0 flex items-center">
<div className="w-full border-t border-surface-container-highest"></div>
</div>
<div className="relative flex justify-center text-[10px] uppercase tracking-[0.1em] font-bold">
<span className="bg-surface px-4 text-on-surface-variant">Or continue with</span>
</div>
</div>
<button className="w-full py-4 flex items-center justify-center gap-3 rounded-xl bg-surface-container-highest text-primary font-bold text-base hover:bg-surface-container-high transition-colors active:scale-95 duration-200" type="button">
<svg className="w-5 h-5" viewBox="0 0 24 24">
<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor"></path>
<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor"></path>
<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="currentColor"></path>
<path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor"></path>
</svg>
                    Sign In with Google
                </button>
<p className="mt-12 text-center text-sm font-medium text-on-surface-variant">
                    Don&apos;t have an account? 
                    <a className="text-primary font-bold hover:underline underline-offset-4 ml-1" href="#">Sign Up</a>
</p>
</div>
<footer className="mt-auto pt-12 flex items-center justify-center space-x-6 text-[11px] uppercase tracking-[0.05em] font-semibold text-slate-500">
<a className="hover:text-primary transition-colors" href="#">Terms of Service</a>
<span className="w-1 h-1 rounded-full bg-surface-container-highest"></span>
<a className="hover:text-primary transition-colors" href="#">Privacy Policy</a>
<span className="w-1 h-1 rounded-full bg-surface-container-highest"></span>
<a className="hover:text-primary transition-colors" href="#">Help Center</a>
</footer>
</section>
</main>
<div className="fixed top-0 left-0 w-full h-1 bg-primary-gradient z-[100]"></div>

</div>
  );
}
