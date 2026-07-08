import { useState, useEffect, useRef } from "react";
import {
  Search, MapPin, Star, User, Building2, Briefcase, Menu, X, ArrowRight, ArrowUpRight,
  Plus, CheckCircle2, LogIn, Sun, Moon, Sparkles, Link2, ShieldCheck, Clock, ImagePlus,
  Eye, MessageCircle, LogOut, Send, Video, Navigation, UserCheck, Camera,
  Instagram, Mail,
} from "lucide-react";
import logo from "./assets/aptura-logo.png";
import { supabase } from "./lib/supabaseClient";
import { signUpUser, signInUser, signOutUser, getCurrentSession, fetchFullProfile, onAuthStateChange } from "./lib/auth";
import { uploadImage, publicUrl, signedUrl } from "./lib/storage";
import * as db from "./lib/db";

const BRAND = "aptura.co";
const FOOTER_LINE = "Construindo o futuro das conexoes entre pessoas, talentos e oportunidades.";

const AREAS = [
  "Designer", "Professor", "Programador", "Marketing", "Eletricista", "Pedreiro", "Pintor", "Encanador",
  "Advogado", "Contador", "Personal Trainer", "Fotografo", "Cozinheiro", "Costureira", "Jardineiro",
  "Diarista", "Cuidador de idosos", "Manicure", "Cabeleireiro", "Mecanico", "Marceneiro", "Tradutor",
  "Redator", "Social Media", "Nutricionista", "Psicologo", "Fisioterapeuta", "Arquiteto", "Engenheiro",
  "Baba", "Tecnico de informatica", "Chaveiro", "Vidraceiro", "Gesseiro", "Personal Organizer", "DJ",
  "Editor de video", "Motorista", "Seguranca",
];

const VALUES = [
  { title: "Pessoas em primeiro lugar", text: "Toda decisao comeca pensando no impacto positivo que podemos gerar para quem utiliza nossa plataforma." },
  { title: "Tecnologia com proposito", text: "Criamos solucoes para resolver problemas reais e facilitar conexoes entre pessoas e oportunidades." },
  { title: "Inovacao continua", text: "Estamos em constante evolucao, aprendendo, testando novas ideias e aprimorando nossas solucoes." },
  { title: "Confianca", text: "Construimos relacoes baseadas em transparencia, seguranca e respeito." },
  { title: "Simplicidade", text: "Acreditamos que as melhores experiencias sao aquelas que tornam o complexo simples." },
];

function avatarUrl(name) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}&backgroundType=gradientLinear&backgroundColor=b6e3f4,c0aede,ffdfbf,ffd5dc,d1d4f9`;
}
function avatarSrc(p) {
  return p.photo_path ? publicUrl("avatars", p.photo_path) : avatarUrl(p.name);
}
function avgRating(reviews) {
  if (!reviews || reviews.length === 0) return null;
  return (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1);
}
function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}
function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocalizacao nao suportada."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}
function loadTheme() {
  try {
    return localStorage.getItem("aptura_theme") || "dark";
  } catch {
    return "dark";
  }
}
function saveTheme(t) {
  try {
    localStorage.setItem("aptura_theme", t);
  } catch {}
}

const THEME_CSS = `
  .ia[data-theme="light"]{
    --bg:#F7F6F2; --bg-alt:#EFEDE5; --surface:#FFFFFF; --surface-2:#FBFAF7;
    --border:#E4E0D4; --text:#17161F; --text-soft:#5B5872; --text-faint:#918D9F;
    --accent:#5B4CF0; --accent-2:#8B5CF6; --accent-soft:#EFEBFF;
    --warm:#F0673A; --warm-soft:#FDE7DE; --success:#1A9A5B; --success-soft:#DDF3E7;
    --danger:#E24C4C; --danger-soft:#FBE1E1; --shadow:0 10px 30px rgba(30,25,60,0.08);
  }
  .ia[data-theme="dark"]{
    --bg:#0D0C14; --bg-alt:#131220; --surface:#181725; --surface-2:#1E1D2E;
    --border:#2B2A3D; --text:#F5F4F9; --text-soft:#A6A3BC; --text-faint:#6E6B85;
    --accent:#8C7CFF; --accent-2:#B490FF; --accent-soft:#231F3D;
    --warm:#FF8A5C; --warm-soft:#332318; --success:#4ADE8A; --success-soft:#153524;
    --danger:#FF6B6B; --danger-soft:#3A1B1B; --shadow:0 10px 30px rgba(0,0,0,0.45);
  }
  .ia{ background:var(--bg); color:var(--text); min-height:100vh; font-family:'Inter',sans-serif; transition:background .25s,color .25s; overflow-x:hidden; width:100%; }
  .ia-display{ font-family:'Space Grotesk','Inter',sans-serif; }
  .ia-card{ background:var(--surface); border:1px solid var(--border); border-radius:22px; box-shadow:var(--shadow); }
  .ia-surface2{ background:var(--surface-2); border:1px solid var(--border); }
  .ia-border{ border:1px solid var(--border); }
  .ia-text-soft{ color:var(--text-soft); }
  .ia-text-faint{ color:var(--text-faint); }
  .ia-input{ background:var(--surface-2); border:1px solid var(--border); color:var(--text); border-radius:12px; }
  .ia-input::placeholder{ color:var(--text-faint); }
  .ia-input:focus{ outline:none; border-color:var(--accent); }
  .ia-input:disabled{ opacity:0.7; }
  .ia-btn-primary{ background:linear-gradient(135deg,var(--accent),var(--accent-2)); color:#fff; border-radius:999px; cursor:pointer; }
  .ia-btn-primary:hover{ filter:brightness(1.08); }
  .ia-btn-primary:disabled{ opacity:0.6; cursor:not-allowed; }
  .ia-btn-ghost{ border:1px solid var(--border); color:var(--text); border-radius:999px; background:transparent; cursor:pointer; }
  .ia-btn-ghost:hover{ border-color:var(--accent); color:var(--accent); }
  .ia-badge{ background:var(--accent-soft); color:var(--accent); border-radius:999px; }
  .ia-badge-warm{ background:var(--warm-soft); color:var(--warm); border-radius:999px; }
  .ia-badge-success{ background:var(--success-soft); color:var(--success); border-radius:999px; }
  .ia-badge-danger{ background:var(--danger-soft); color:var(--danger); border-radius:999px; }
  .ia-link{ color:var(--accent); cursor:pointer; }
  .ia-navlink{ color:var(--text-soft); cursor:pointer; }
  .ia-navlink.active{ color:var(--accent); }
  .ia-ring{ border:2px solid var(--accent-soft); }
  .ia-marquee{ overflow:hidden; width:100%; min-width:0; -webkit-mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent); mask-image:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent); }
  .ia-marquee-track{ display:flex; gap:12px; width:max-content; animation:iaMarquee 26s linear infinite; }
  @keyframes iaMarquee{ from{ transform:translateX(0);} to{ transform:translateX(-50%);} }
  .ia-toggle{ width:52px; height:30px; border-radius:999px; background:var(--surface-2); border:1px solid var(--border); position:relative; cursor:pointer; }
  .ia-toggle-knob{ position:absolute; top:2px; width:24px; height:24px; border-radius:50%; background:linear-gradient(135deg,var(--accent),var(--accent-2)); display:flex; align-items:center; justify-content:center; transition:left .2s ease; }
`;

function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="ia-card fixed top-5 left-1/2 -translate-x-1/2 z-50 px-5 py-3 flex items-center gap-2 text-sm" style={{ borderColor: "var(--accent)" }}>
      <CheckCircle2 size={18} style={{ color: "var(--accent)" }} />
      {message}
    </div>
  );
}

function Logo() {
  return <img src={logo} alt={BRAND} className="h-8 w-auto rounded-lg" />;
}

function ThemeToggle({ theme, setTheme }) {
  const isDark = theme === "dark";
  return (
    <button aria-label="Alternar tema" className="ia-toggle" onClick={() => setTheme(isDark ? "light" : "dark")}>
      <span className="ia-toggle-knob" style={{ left: isDark ? "24px" : "2px" }}>
        {isDark ? <Moon size={13} color="#fff" /> : <Sun size={13} color="#fff" />}
      </span>
    </button>
  );
}

function Navbar({ page, setPage, mobileOpen, setMobileOpen, theme, setTheme, currentUser, onLogout }) {
  const links = currentUser
    ? [
        currentUser.tipo === "prestador" ? { id: "meu-perfil", label: "Meu Perfil" } : { id: "minhas-vagas", label: "Minhas Vagas" },
        { id: "vagas", label: "Vagas" },
        { id: "profissionais", label: "Profissionais" },
        { id: "sobre", label: "Sobre nos" },
      ]
    : [
        { id: "cadastro", label: "Cadastro" },
        { id: "login", label: "Login" },
        { id: "vagas", label: "Vagas" },
        { id: "profissionais", label: "Profissionais" },
        { id: "sobre", label: "Sobre nos" },
      ];
  return (
    <header className="ia-border sticky top-0 z-40" style={{ background: "var(--surface)", borderBottomWidth: 1 }}>
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <button onClick={() => setPage("home")}>
          <Logo />
        </button>
        <nav className="hidden md:flex items-center gap-7">
          {links.map((l) => (
            <button key={l.id} onClick={() => setPage(l.id)} className={`ia-navlink text-sm font-medium ${page === l.id ? "active" : ""}`}>
              {l.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {currentUser && (
            <button onClick={onLogout} className="hidden sm:flex ia-btn-ghost text-xs px-3 py-1.5 items-center gap-1.5">
              <LogOut size={13} /> Sair ({currentUser.name.split(" ")[0]})
            </button>
          )}
          <ThemeToggle theme={theme} setTheme={setTheme} />
          <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
      {mobileOpen && (
        <div className="md:hidden flex flex-col gap-1 px-6 pb-4">
          {links.map((l) => (
            <button
              key={l.id}
              onClick={() => {
                setPage(l.id);
                setMobileOpen(false);
              }}
              className={`ia-navlink text-left py-2 text-sm font-medium ${page === l.id ? "active" : ""}`}
            >
              {l.label}
            </button>
          ))}
          {currentUser && (
            <button onClick={onLogout} className="ia-navlink text-left py-2 text-sm font-medium flex items-center gap-1.5">
              <LogOut size={14} /> Sair ({currentUser.name.split(" ")[0]})
            </button>
          )}
        </div>
      )}
    </header>
  );
}

function Marquee() {
  const items = [...AREAS, ...AREAS];
  return (
    <div className="ia-marquee">
      <div className="ia-marquee-track">
        {items.map((a, i) => (
          <span key={i} className="ia-badge text-sm font-medium px-4 py-2 whitespace-nowrap">
            {a}
          </span>
        ))}
      </div>
    </div>
  );
}

function Home({ setPage, professionals, vagas }) {
  const featured = professionals.slice(0, 3);
  return (
    <div>
      <div className="max-w-4xl mx-auto px-6 pt-10 pb-2 text-center">
        <p className="ia-display text-xl md:text-2xl font-semibold leading-snug">
          Conectando pessoas. <span style={{ color: "var(--accent)" }}>Descobrindo talentos.</span>{" "}
          <span style={{ color: "var(--warm)" }}>Criando oportunidades.</span>
        </p>
      </div>
      <section className="max-w-6xl mx-auto px-6 pt-10 pb-14">
        <div className="grid md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] gap-10 items-start">
          <div className="min-w-0">
            <span className="ia-badge inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 mb-6">
              <Sparkles size={13} /> {BRAND} — conexao com apoio de IA
            </span>
            <h1 className="ia-display text-4xl md:text-6xl leading-[1.08] font-bold mb-6">
              Onde sua <span style={{ color: "var(--accent)" }}>aptidao</span>
              <br />
              encontra <span style={{ color: "var(--warm)" }}>caminho</span>.
            </h1>
            <p className="ia-text-soft text-lg mb-8 max-w-md">
              {BRAND} cruza empresas e pessoas com prestadores de servico de todas as areas, do eletricista ao programador.
            </p>
            <div className="flex flex-wrap gap-3 mb-10">
              <button onClick={() => setPage("cadastro")} className="ia-btn-primary font-semibold px-6 py-3.5 flex items-center gap-2">
                Comecar agora <ArrowUpRight size={17} />
              </button>
              <button onClick={() => setPage("profissionais")} className="ia-btn-ghost font-semibold px-6 py-3.5">
                Ver profissionais
              </button>
            </div>
            <Marquee />
          </div>

          <div className="grid grid-cols-2 gap-4 min-w-0">
            <div className="ia-card p-6 col-span-2">
              <Link2 size={20} style={{ color: "var(--accent)" }} className="mb-3" />
              <p className="ia-display text-3xl font-bold">{professionals.length}</p>
              <p className="ia-text-soft text-sm">profissionais aprovados</p>
            </div>
            <div className="ia-card p-6">
              <Briefcase size={20} style={{ color: "var(--warm)" }} className="mb-3" />
              <p className="ia-display text-3xl font-bold">{vagas.length}</p>
              <p className="ia-text-soft text-sm">vagas abertas</p>
            </div>
            <div className="ia-card p-6">
              <Star size={20} style={{ color: "var(--accent)" }} className="mb-3" />
              <p className="ia-display text-3xl font-bold">{AREAS.length}+</p>
              <p className="ia-text-soft text-sm">areas de atuacao</p>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="flex items-end justify-between mb-7 flex-wrap gap-2">
          <div>
            <h2 className="ia-display text-3xl font-bold mb-1">Em destaque</h2>
            <p className="ia-text-soft">Profissionais aprovados e bem avaliados na plataforma</p>
          </div>
          <button onClick={() => setPage("profissionais")} className="ia-link text-sm font-semibold flex items-center gap-1">
            Ver todos <ArrowRight size={15} />
          </button>
        </div>
        {featured.length === 0 && <p className="ia-text-faint text-sm">Nenhum profissional aprovado ainda.</p>}
        <div className="grid md:grid-cols-3 gap-5">
          {featured.map((p) => (
            <ProCard key={p.id} p={p} onView={() => setPage({ name: "perfil", id: p.id })} />
          ))}
        </div>
      </section>

      <section className="ia-border" style={{ borderTopWidth: 1, background: "var(--bg-alt)" }}>
        <div className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-6">
          <div className="ia-card p-8">
            <User size={26} style={{ color: "var(--accent)" }} className="mb-3" />
            <h3 className="ia-display text-xl font-bold mb-2">Sou prestador de servico</h3>
            <p className="ia-text-soft mb-5 text-sm">Cadastre seus servicos e dados. Apos a analise de um moderador, seu perfil fica visivel para todos.</p>
            <button onClick={() => setPage("cadastro")} className="ia-link font-semibold text-sm flex items-center gap-1">
              Criar meu perfil <ArrowRight size={16} />
            </button>
          </div>
          <div className="ia-card p-8">
            <Building2 size={26} style={{ color: "var(--warm)" }} className="mb-3" />
            <h3 className="ia-display text-xl font-bold mb-2">Sou uma empresa</h3>
            <p className="ia-text-soft mb-5 text-sm">Publique vagas e encontre profissionais confiaveis rapidamente.</p>
            <button onClick={() => setPage("vagas")} className="ia-link font-semibold text-sm flex items-center gap-1">
              Publicar vaga <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function SobreNos() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="text-center mb-14">
        <h1 className="ia-display text-4xl md:text-5xl font-bold mb-4">Sobre nos</h1>
        <p className="ia-text-soft text-lg">Conectando pessoas, talentos e oportunidades.</p>
      </div>
      <div className="space-y-5 mb-14 text-base leading-relaxed" style={{ color: "var(--text)" }}>
        <p>A {BRAND} nasceu da conviccao de que oportunidades tem o poder de transformar vidas.</p>
        <p>
          Todos os dias, milhoes de pessoas procuram um novo emprego, um cliente, um projeto, uma parceria ou uma chance de mostrar o seu
          potencial. Ao mesmo tempo, empresas, empreendedores e organizacoes buscam profissionais qualificados para crescer, inovar e construir
          o futuro.
        </p>
        <p>
          Mesmo vivendo em uma era de constante evolucao tecnologica, essas conexoes ainda acontecem de maneira limitada. Muitas oportunidades
          nunca chegam as pessoas certas, e muitos talentos permanecem invisiveis.
        </p>
        <p>Foi para mudar essa realidade que nasceu a {BRAND}.</p>
        <p>
          Somos uma empresa de tecnologia que esta construindo uma nova forma de conectar pessoas, empresas, profissionais independentes e
          oportunidades por meio da inteligencia artificial, analise de dados e experiencias digitais intuitivas.
        </p>
        <p>Acreditamos que a tecnologia deve reduzir barreiras, aproximar pessoas e criar conexoes mais inteligentes, mais rapidas e mais humanas.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-6 mb-14">
        <div className="ia-card p-8">
          <h2 className="ia-display text-xl font-bold mb-3" style={{ color: "var(--accent)" }}>Nossa missao</h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
            Conectar pessoas, talentos e oportunidades por meio da tecnologia, reduzindo barreiras e criando conexoes que transformam carreiras,
            negocios e vidas.
          </p>
        </div>
        <div className="ia-card p-8">
          <h2 className="ia-display text-xl font-bold mb-3" style={{ color: "var(--warm)" }}>Nossa visao</h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
            Ser uma referencia global em tecnologia para conexoes profissionais, tornando o acesso ao trabalho, aos servicos e as oportunidades
            mais inteligente, acessivel e eficiente para todos. Queremos construir um futuro onde encontrar o profissional certo ou descobrir
            uma nova oportunidade seja um processo simples, confiavel e baseado no verdadeiro potencial de cada pessoa.
          </p>
        </div>
      </div>
      <div className="mb-14">
        <h2 className="ia-display text-2xl font-bold mb-4">O que estamos construindo</h2>
        <div className="space-y-4 text-base leading-relaxed" style={{ color: "var(--text)" }}>
          <p>A {BRAND} esta desenvolvendo um ecossistema digital voltado para conectar pessoas e oportunidades de maneira mais eficiente.</p>
          <p>Nosso proposito vai muito alem de uma plataforma de vagas.</p>
          <p>
            Estamos criando um ambiente onde empresas possam descobrir talentos, profissionais encontrem oportunidades alinhadas aos seus
            objetivos e prestadores de servico possam apresentar suas habilidades para clientes que realmente precisam delas.
          </p>
          <p>Acreditamos que toda habilidade possui valor.</p>
          <p>
            Desde estudantes em busca da primeira oportunidade ate profissionais experientes, freelancers, autonomos, pequenos empreendedores,
            consultores e prestadores de servico, todos merecem ter acesso a um ambiente onde seu potencial possa ser reconhecido.
          </p>
          <p>
            Na {BRAND}, uma oportunidade pode representar um novo emprego, um projeto, um cliente, uma parceria, uma indicacao ou o inicio de uma
            nova trajetoria profissional. Nosso objetivo e tornar essas conexoes cada vez mais inteligentes, acessiveis e eficientes.
          </p>
        </div>
      </div>
      <div className="ia-card p-8 mb-14">
        <h2 className="ia-display text-2xl font-bold mb-4">Tecnologia com proposito</h2>
        <div className="space-y-4 text-base leading-relaxed" style={{ color: "var(--text)" }}>
          <p>A inteligencia artificial esta transformando o mundo.</p>
          <p>
            Na {BRAND}, acreditamos que ela deve ser utilizada para aproximar pessoas, e nao para criar barreiras. Estamos desenvolvendo
            tecnologia capaz de compreender perfis, habilidades, experiencias e objetivos, tornando o processo de conexao muito mais inteligente
            do que simples buscas por palavras-chave.
          </p>
          <p>Para nos, tecnologia e uma ferramenta. As pessoas sempre serao o centro de tudo.</p>
        </div>
      </div>
      <div className="mb-14">
        <h2 className="ia-display text-2xl font-bold mb-6 text-center">Nossos valores</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {VALUES.map((v) => (
            <div key={v.title} className="ia-card p-6">
              <h3 className="ia-display text-base font-bold mb-2">{v.title}</h3>
              <p className="ia-text-soft text-sm leading-relaxed">{v.text}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="mb-14">
        <h2 className="ia-display text-2xl font-bold mb-4">Nossa ambicao</h2>
        <div className="space-y-4 text-base leading-relaxed" style={{ color: "var(--text)" }}>
          <p>Estamos apenas comecando. A {BRAND} nasceu pensando no longo prazo.</p>
          <p>
            Nosso objetivo e construir uma empresa reconhecida por desenvolver tecnologia que gere impacto real na vida das pessoas,
            democratizando o acesso as oportunidades e tornando as conexoes profissionais mais inteligentes.
          </p>
          <p>
            Queremos criar um ecossistema onde pessoas possam descobrir seu potencial, desenvolver suas carreiras, encontrar novos clientes,
            formar parcerias e transformar ideias em oportunidades reais.
          </p>
          <p>Acreditamos que o talento esta distribuido em todos os lugares. Nosso desafio e garantir que as oportunidades tambem estejam.</p>
        </div>
      </div>
      <div className="ia-card p-8 text-center">
        <h2 className="ia-display text-2xl font-bold mb-4">O comeco de uma jornada</h2>
        <div className="space-y-3 text-base leading-relaxed mb-4" style={{ color: "var(--text)" }}>
          <p>Toda grande empresa comecou com um primeiro passo. A {BRAND} tambem.</p>
          <p>Ainda estamos construindo nossa plataforma, aprendendo com nossos usuarios e evoluindo continuamente nossas solucoes.</p>
          <p>Este e apenas o inicio da nossa historia. Obrigado por fazer parte dessa jornada.</p>
        </div>
        <p className="ia-display text-xl font-bold" style={{ color: "var(--accent)" }}>Bem-vindo a {BRAND}.</p>
      </div>
    </div>
  );
}

function Field(props) {
  return <input {...props} className={`ia-input w-full px-4 py-3 text-sm ${props.className || ""}`} />;
}
function TextArea(props) {
  return <textarea rows={3} {...props} className={`ia-input w-full px-4 py-3 text-sm resize-y ${props.className || ""}`} />;
}
function Select(props) {
  return (
    <select {...props} className={`ia-input w-full px-4 py-3 text-sm ${props.className || ""}`}>
      {props.children}
    </select>
  );
}

// Escolhe um arquivo (foto de documento, etc). Guarda o File cru — o upload de
// verdade so acontece no submit do formulario, quando ja existe um usuario logado.
function FilePicker({ label, file, onChange }) {
  const inputId = `file-${label.replace(/\s+/g, "-").toLowerCase()}`;
  const preview = file ? URL.createObjectURL(file) : "";
  return (
    <div>
      <label htmlFor={inputId} className="ia-text-soft text-xs mb-1 block">{label}</label>
      {file ? (
        <div className="flex items-center gap-3">
          <img src={preview} alt={label} className="w-24 h-16 object-cover rounded-lg ia-border" />
          <button type="button" onClick={() => onChange(null)} className="ia-btn-ghost text-xs px-3 py-1.5">Remover</button>
        </div>
      ) : (
        <label htmlFor={inputId} className="ia-input flex items-center justify-center gap-2 text-sm cursor-pointer py-3" style={{ borderStyle: "dashed" }}>
          <ImagePlus size={16} /> Anexar foto
        </label>
      )}
      <input
        id={inputId}
        type="file"
        accept="image/*"
        onChange={(e) => {
          const f = e.target.files && e.target.files[0];
          if (f && !f.type.startsWith("image/")) return;
          onChange(f || null);
        }}
        className="hidden"
      />
    </div>
  );
}

function CameraCapture({ onCapture, onCancel }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Camera nao suportada neste navegador.");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" } })
      .then((stream) => {
        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setError("Nao foi possivel acessar a camera. Verifique a permissao do navegador."));
    return () => {
      active = false;
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const stop = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        stop();
        onCapture(new File([blob], "foto-camera.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.85
    );
  };

  return (
    <div className="ia-card p-4">
      {error ? (
        <p className="ia-text-faint text-sm mb-3">{error}</p>
      ) : (
        <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-lg mb-3 ia-border" style={{ maxHeight: 260, objectFit: "cover" }} />
      )}
      <div className="flex gap-2">
        {!error && (
          <button type="button" onClick={capture} className="ia-btn-primary text-sm px-4 py-2 flex-1">Capturar foto</button>
        )}
        <button type="button" onClick={() => { stop(); onCancel(); }} className="ia-btn-ghost text-sm px-4 py-2">Cancelar</button>
      </div>
    </div>
  );
}

function ProfilePhotoPicker({ file, onChange }) {
  const [showCamera, setShowCamera] = useState(false);
  const preview = file ? URL.createObjectURL(file) : "";
  return (
    <div>
      <label className="ia-text-soft text-xs mb-1 block">Foto de perfil (opcional, visivel para todos)</label>
      <div className="flex items-center gap-3 mb-2">
        {file ? (
          <img src={preview} alt="Foto de perfil" className="ia-ring w-16 h-16 rounded-full object-cover" />
        ) : (
          <div className="ia-surface2 w-16 h-16 rounded-full flex items-center justify-center shrink-0">
            <User size={22} className="ia-text-faint" />
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <label className="ia-btn-ghost text-xs px-3 py-2 cursor-pointer flex items-center gap-1.5">
            <ImagePlus size={14} /> Enviar foto
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files && e.target.files[0];
                if (f) onChange(f);
              }}
              className="hidden"
            />
          </label>
          <button type="button" onClick={() => setShowCamera(true)} className="ia-btn-ghost text-xs px-3 py-2 flex items-center gap-1.5">
            <Camera size={14} /> Tirar foto agora
          </button>
          {file && (
            <button type="button" onClick={() => onChange(null)} className="ia-btn-ghost text-xs px-3 py-2">Remover</button>
          )}
        </div>
      </div>
      {showCamera && (
        <CameraCapture
          onCapture={(f) => { onChange(f); setShowCamera(false); }}
          onCancel={() => setShowCamera(false)}
        />
      )}
    </div>
  );
}

function CategoryPicker({ value, onChange }) {
  const [draft, setDraft] = useState("");
  const add = (v) => {
    const val = (v ?? draft).trim();
    if (!val) return;
    if (!value.includes(val)) onChange([...value, val]);
    setDraft("");
  };
  const remove = (v) => onChange(value.filter((x) => x !== v));
  return (
    <div>
      <label className="ia-text-soft text-xs mb-1 block">Areas de atuacao (pode adicionar mais de uma)</label>
      <div className="flex gap-2 mb-2">
        <input
          list="ia-areas-list"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Digite uma area e pressione Enter"
          className="ia-input flex-1 px-4 py-2.5 text-sm"
        />
        <button type="button" onClick={() => add()} className="ia-btn-ghost px-4 text-sm shrink-0">Adicionar</button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((v) => (
            <span key={v} className="ia-badge text-xs px-3 py-1.5 flex items-center gap-1.5">
              {v}
              <button type="button" onClick={() => remove(v)} aria-label={`Remover ${v}`} className="flex items-center"><X size={12} /></button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CADASTRO — etapa 1: so cria a conta (Supabase Auth). Os detalhes do perfil
// (profissao, documentos etc.) sao preenchidos na tela "Completar cadastro"
// logo em seguida — necessario porque, se a confirmacao de e-mail estiver
// ativa no seu projeto Supabase, ainda nao existe sessao autenticada aqui
// para enviar arquivos com seguranca.
// ---------------------------------------------------------------------------
function Cadastro({ notify, setPage, onSignedUp }) {
  const [presta, setPresta] = useState({ name: "", email: "", senha: "" });
  const [emp, setEmp] = useState({ name: "", email: "", senha: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (tipo, form, reset) => {
    if (!form.name || !form.email || !form.senha) {
      notify("Preencha nome, e-mail e senha.");
      return;
    }
    if (form.senha.length < 6) {
      notify("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    setLoading(true);
    try {
      await signUpUser({ email: form.email, senha: form.senha, name: form.name, tipo });
      const { data } = await supabase.auth.getSession();
      reset();
      if (data.session) {
        notify("Conta criada. Agora complete seu cadastro.");
        onSignedUp(tipo);
      } else {
        notify("Conta criada! Confira seu e-mail para confirmar e depois faca login para continuar.");
        setPage("login");
      }
    } catch (err) {
      notify(err.message || "Nao foi possivel criar a conta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <h1 className="ia-display text-4xl font-bold text-center mb-3">Cadastre-se</h1>
      <p className="ia-text-soft text-center mb-12">Escolha como deseja participar da plataforma</p>
      <div className="grid md:grid-cols-2 gap-6">
        <form
          onSubmit={(e) => { e.preventDefault(); submit("prestador", presta, () => setPresta({ name: "", email: "", senha: "" })); }}
          className="ia-card p-8 space-y-4"
        >
          <div className="flex items-center gap-2 mb-1">
            <User size={20} style={{ color: "var(--accent)" }} />
            <h2 className="ia-display text-2xl font-bold">Prestador</h2>
          </div>
          <p className="ia-text-soft text-sm mb-2">Divulgue seus servicos.</p>
          <Field placeholder="Seu nome completo" value={presta.name} onChange={(e) => setPresta({ ...presta, name: e.target.value })} />
          <Field type="email" placeholder="Seu e-mail" value={presta.email} onChange={(e) => setPresta({ ...presta, email: e.target.value })} />
          <Field type="password" placeholder="Crie uma senha (min. 6 caracteres)" value={presta.senha} onChange={(e) => setPresta({ ...presta, senha: e.target.value })} />
          <button type="submit" disabled={loading} className="ia-btn-primary w-full font-semibold py-3.5">
            {loading ? "Criando conta..." : "Criar conta de prestador"}
          </button>
        </form>

        <form
          onSubmit={(e) => { e.preventDefault(); submit("empresa", emp, () => setEmp({ name: "", email: "", senha: "" })); }}
          className="ia-card p-8 space-y-4"
        >
          <div className="flex items-center gap-2 mb-1">
            <Building2 size={20} style={{ color: "var(--warm)" }} />
            <h2 className="ia-display text-2xl font-bold">Empresa</h2>
          </div>
          <p className="ia-text-soft text-sm mb-2">Publique vagas.</p>
          <Field placeholder="Nome da empresa" value={emp.name} onChange={(e) => setEmp({ ...emp, name: e.target.value })} />
          <Field type="email" placeholder="E-mail corporativo" value={emp.email} onChange={(e) => setEmp({ ...emp, email: e.target.value })} />
          <Field type="password" placeholder="Crie uma senha (min. 6 caracteres)" value={emp.senha} onChange={(e) => setEmp({ ...emp, senha: e.target.value })} />
          <button type="submit" disabled={loading} className="ia-btn-primary w-full font-semibold py-3.5">
            {loading ? "Criando conta..." : "Criar conta de empresa"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// COMPLETAR CADASTRO — etapa 2, com o usuario ja autenticado. Envia RG,
// fotos de documento, foto de perfil, categorias e localizacao.
// ---------------------------------------------------------------------------
function CompletarPrestador({ currentUser, notify, onDone }) {
  const [form, setForm] = useState({
    profession: "", categories: [], city: "", description: "", telefone: "", rg: "", lat: null, lng: null,
  });
  const [rgFrente, setRgFrente] = useState(null);
  const [rgVerso, setRgVerso] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  const usarLocalizacao = async () => {
    setLocating(true);
    try {
      const { lat, lng } = await getCurrentPosition();
      setForm((f) => ({ ...f, lat, lng }));
      notify("Localizacao capturada. Isso ajuda visitantes a te encontrar por proximidade.");
    } catch {
      notify("Nao foi possivel obter sua localizacao.");
    } finally {
      setLocating(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.profession || !form.rg) {
      notify("Preencha ao menos a profissao e o RG.");
      return;
    }
    if (!rgFrente || !rgVerso) {
      notify("Anexe as fotos do documento (frente e verso).");
      return;
    }
    setSaving(true);
    try {
      const rgFrentePath = await uploadImage({ bucket: "documents", folder: currentUser.id, file: rgFrente });
      const rgVersoPath = await uploadImage({ bucket: "documents", folder: currentUser.id, file: rgVerso });
      const photoPath = photo ? await uploadImage({ bucket: "avatars", folder: currentUser.id, file: photo, maxWidth: 700 }) : null;

      await db.createProfessional({
        id: currentUser.id,
        name: currentUser.name,
        profession: form.profession,
        categories: form.categories.length > 0 ? form.categories : [form.profession],
        city: form.city || "Nao informado",
        address: form.city || "Nao informado",
        lat: form.lat,
        lng: form.lng,
        photoPath,
        description: form.description || "Sem descricao ainda.",
        telefone: form.telefone || "Nao informado",
        rg: form.rg,
        rgFrentePath,
        rgVersoPath,
      });

      notify("Cadastro enviado para analise. Voce sera avisado quando um moderador aprovar seu perfil.");
      onDone();
    } catch (err) {
      notify(err.message || "Nao foi possivel concluir o cadastro.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <h1 className="ia-display text-3xl font-bold text-center mb-2">Complete seu cadastro</h1>
      <p className="ia-text-soft text-center mb-10">Falta pouco, {currentUser.name.split(" ")[0]}. Esses dados vao para analise de um moderador.</p>
      <datalist id="ia-areas-list">{AREAS.map((a) => <option key={a} value={a} />)}</datalist>
      <form onSubmit={submit} className="ia-card p-8 space-y-4">
        <ProfilePhotoPicker file={photo} onChange={setPhoto} />
        <Field placeholder="Telefone" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
        <Field placeholder="RG (documento de identidade)" value={form.rg} onChange={(e) => setForm({ ...form, rg: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <FilePicker label="Documento (frente)" file={rgFrente} onChange={setRgFrente} />
          <FilePicker label="Documento (verso)" file={rgVerso} onChange={setRgVerso} />
        </div>
        <Field placeholder="Titulo profissional (ex: Eletricista predial)" value={form.profession} onChange={(e) => setForm({ ...form, profession: e.target.value })} />
        <CategoryPicker value={form.categories} onChange={(categories) => setForm({ ...form, categories })} />
        <Field placeholder="Endereco / cidade" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        <div className="flex items-center gap-2">
          <button type="button" onClick={usarLocalizacao} disabled={locating} className="ia-btn-ghost text-xs px-3 py-2 flex items-center gap-1.5">
            <Navigation size={13} /> {locating ? "Obtendo localizacao..." : "Usar minha localizacao atual"}
          </button>
          {form.lat != null && (
            <span className="ia-badge-success text-xs px-2.5 py-1 flex items-center gap-1"><CheckCircle2 size={12} /> Localizacao capturada</span>
          )}
        </div>
        <div>
          <label className="ia-text-soft text-xs mb-1 block">Sobre voce</label>
          <TextArea rows={4} placeholder="Conte sua experiencia, formacao, ha quanto tempo atua e o que te diferencia." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <p className="ia-text-faint text-xs flex items-start gap-1.5">
          <ShieldCheck size={14} className="mt-0.5 shrink-0" /> Seus dados e as fotos do documento serao analisados por um moderador antes do seu perfil ficar publico.
        </p>
        <button type="submit" disabled={saving} className="ia-btn-primary w-full font-semibold py-3.5">
          {saving ? "Enviando..." : "Concluir cadastro"}
        </button>
      </form>
    </div>
  );
}

function CompletarEmpresa({ currentUser, notify, onDone }) {
  const [form, setForm] = useState({ segment: "", description: "" });
  const [documento, setDocumento] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.segment) {
      notify("Preencha o segmento.");
      return;
    }
    if (!documento) {
      notify("Anexe um documento da empresa (CNPJ ou contrato social).");
      return;
    }
    setSaving(true);
    try {
      const documentoPath = await uploadImage({ bucket: "documents", folder: currentUser.id, file: documento });
      await db.createCompany({ id: currentUser.id, name: currentUser.name, segment: form.segment, description: form.description, documentoPath });
      notify("Empresa cadastrada. Voce ja pode publicar vagas.");
      onDone();
    } catch (err) {
      notify(err.message || "Nao foi possivel concluir o cadastro.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-6 py-16">
      <h1 className="ia-display text-3xl font-bold text-center mb-2">Complete o cadastro da empresa</h1>
      <p className="ia-text-soft text-center mb-10">Falta pouco, {currentUser.name}.</p>
      <form onSubmit={submit} className="ia-card p-8 space-y-4">
        <Field placeholder="Segmento" value={form.segment} onChange={(e) => setForm({ ...form, segment: e.target.value })} />
        <TextArea placeholder="Descricao da empresa" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <FilePicker label="Documento da empresa (CNPJ ou contrato social)" file={documento} onChange={setDocumento} />
        <p className="ia-text-faint text-xs flex items-start gap-1.5">
          <ShieldCheck size={14} className="mt-0.5 shrink-0" /> Pedimos um documento para que apenas contas verificadas possam conversar com prestadores.
        </p>
        <button type="submit" disabled={saving} className="ia-btn-primary w-full font-semibold py-3.5">
          {saving ? "Enviando..." : "Concluir cadastro"}
        </button>
      </form>
    </div>
  );
}

function Login({ notify, setPage }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInUser({ email, senha });
      notify("Login realizado.");
    } catch (err) {
      notify(err.message === "Invalid login credentials" ? "E-mail ou senha invalidos." : err.message || "Nao foi possivel entrar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-6 py-20">
      <h1 className="ia-display text-4xl font-bold text-center mb-3">Login</h1>
      <p className="ia-text-soft text-center mb-10">Acesse sua conta</p>
      <form onSubmit={submit} className="ia-card p-8 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <LogIn size={19} style={{ color: "var(--accent)" }} />
          <h2 className="ia-display text-xl font-bold">Entrar</h2>
        </div>
        <Field type="email" placeholder="Seu e-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field type="password" placeholder="Sua senha" value={senha} onChange={(e) => setSenha(e.target.value)} />
        <button type="submit" disabled={loading} className="ia-btn-primary w-full font-semibold py-3.5">{loading ? "Entrando..." : "Entrar"}</button>
        <p className="ia-text-faint text-xs text-center pt-2">
          Ainda nao tem conta? <button type="button" onClick={() => setPage("cadastro")} className="ia-link">Cadastre-se</button>
        </p>
      </form>
    </div>
  );
}

function Vagas({ vagas, notify, currentUser, onPosted }) {
  const isEmpresa = currentUser && currentUser.tipo === "empresa";
  const [form, setForm] = useState({ title: "", company: isEmpresa ? currentUser.name : "", city: "", category: "", description: "" });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.company || !form.city) {
      notify("Preencha titulo, empresa e cidade.");
      return;
    }
    setSaving(true);
    try {
      await db.createVaga({
        companyId: isEmpresa ? currentUser.id : null,
        companyName: form.company,
        title: form.title,
        city: form.city,
        category: form.category,
        description: form.description,
      });
      notify("Vaga publicada. Ja esta visivel para todos os usuarios.");
      setForm({ title: "", company: isEmpresa ? currentUser.name : "", city: "", category: "", description: "" });
      onPosted();
    } catch (err) {
      notify(err.message || "Nao foi possivel publicar a vaga.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <h1 className="ia-display text-4xl font-bold text-center mb-3">Publicar Vaga</h1>
      <p className="ia-text-soft text-center mb-10">Empresas podem publicar oportunidades</p>
      <datalist id="ia-areas-list">{AREAS.map((a) => <option key={a} value={a} />)}</datalist>
      <form onSubmit={submit} className="ia-card p-8 space-y-4 mb-14">
        <Field placeholder="Titulo da vaga" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <Field placeholder="Empresa" value={form.company} disabled={isEmpresa} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        <Field placeholder="Cidade" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        <Field list="ia-areas-list" placeholder="Categoria do servico procurado (digite livremente)" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <TextArea placeholder="Descricao da vaga" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <button type="submit" disabled={saving} className="ia-btn-primary w-full font-semibold py-3.5">{saving ? "Publicando..." : "Publicar Vaga"}</button>
      </form>

      <h2 className="ia-display text-2xl font-bold mb-5">Vagas publicadas ({vagas.length})</h2>
      <div className="space-y-4">
        {vagas.length === 0 && <p className="ia-text-faint text-sm">Nenhuma vaga publicada ainda.</p>}
        {vagas.map((v) => (
          <div key={v.id} className="ia-card p-6">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <h3 className="ia-display text-lg font-bold">{v.title}</h3>
              <span className="ia-badge text-xs px-3 py-1 font-medium">{v.category}</span>
            </div>
            <p className="ia-text-soft text-sm mb-1">{v.company_name}</p>
            <p className="ia-text-faint text-xs flex items-center gap-1 mb-3"><MapPin size={13} /> {v.city}</p>
            {v.description && <p className="text-sm" style={{ color: "var(--text)" }}>{v.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function MinhasVagas({ currentUser, setPage }) {
  const [minhas, setMinhas] = useState([]);
  useEffect(() => {
    db.fetchMyVagas(currentUser.id).then(setMinhas).catch(() => {});
  }, [currentUser.id]);
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-8">
        <div>
          <h1 className="ia-display text-3xl font-bold mb-1">Minhas Vagas</h1>
          <p className="ia-text-soft text-sm">Vagas publicadas por {currentUser.name}</p>
        </div>
        <button onClick={() => setPage("vagas")} className="ia-btn-primary text-sm px-5 py-2.5 flex items-center gap-2"><Plus size={15} /> Publicar nova vaga</button>
      </div>
      <div className="space-y-4">
        {minhas.length === 0 && <p className="ia-text-faint text-sm">Voce ainda nao publicou nenhuma vaga.</p>}
        {minhas.map((v) => (
          <div key={v.id} className="ia-card p-6">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <h3 className="ia-display text-lg font-bold">{v.title}</h3>
              <span className="ia-badge text-xs px-3 py-1 font-medium">{v.category}</span>
            </div>
            <p className="ia-text-faint text-xs flex items-center gap-1 mb-3"><MapPin size={13} /> {v.city}</p>
            {v.description && <p className="text-sm" style={{ color: "var(--text)" }}>{v.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function StarRow({ rating }) {
  const r = Math.round(rating);
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={14} fill={i <= r ? "var(--warm)" : "none"} color={i <= r ? "var(--warm)" : "var(--border)"} />)}
    </div>
  );
}

function ProCard({ p, onView, distanceKm: dist }) {
  const rating = avgRating(p.reviews);
  return (
    <div className="ia-card p-7 text-center">
      <img src={avatarSrc(p)} alt={p.name} className="ia-ring w-20 h-20 rounded-full mx-auto mb-4" />
      <h3 className="ia-display text-lg font-bold mb-1">{p.name}</h3>
      <p className="ia-text-soft text-sm mb-2">{p.profession}</p>
      <div className="flex flex-wrap gap-1.5 justify-center mb-2">
        {(p.categories || []).slice(0, 3).map((c) => <span key={c} className="ia-badge text-[11px] px-2.5 py-1">{c}</span>)}
      </div>
      <p className="ia-text-faint text-xs flex items-center justify-center gap-1 mb-2">
        <MapPin size={12} /> {p.city}
        {dist != null && <span className="ia-badge-success text-[10px] px-2 py-0.5 ml-1">{dist < 1 ? "menos de 1 km" : `${dist.toFixed(0)} km`}</span>}
      </p>
      {rating ? (
        <div className="flex items-center justify-center gap-1 mb-4 text-xs ia-text-soft"><StarRow rating={rating} /> {rating}</div>
      ) : (
        <div className="mb-4 text-xs ia-text-faint">Sem avaliacoes ainda</div>
      )}
      <button onClick={onView} className="ia-btn-primary w-full font-semibold py-2.5">Ver Perfil</button>
    </div>
  );
}

function Profissionais({ professionals, setPage, notify }) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("Todas");
  const [myLocation, setMyLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const categoryOptions = Array.from(new Set([...AREAS, ...professionals.flatMap((p) => p.categories || [])])).sort((a, b) => a.localeCompare(b));

  const buscarPerto = async () => {
    setLocating(true);
    try {
      const pos = await getCurrentPosition();
      setMyLocation(pos);
      notify("Ordenando profissionais pela sua localizacao atual.");
    } catch {
      notify("Nao foi possivel obter sua localizacao.");
    } finally {
      setLocating(false);
    }
  };

  let filtered = professionals.filter((p) => {
    const matchesCat = cat === "Todas" || (p.categories || []).includes(cat);
    const q = query.toLowerCase();
    const matchesQuery = !q || p.name.toLowerCase().includes(q) || p.profession.toLowerCase().includes(q) || p.city.toLowerCase().includes(q);
    return matchesCat && matchesQuery;
  });

  if (myLocation) {
    filtered = filtered
      .map((p) => ({ ...p, _dist: p.lat != null ? distanceKm(myLocation.lat, myLocation.lng, p.lat, p.lng) : null }))
      .sort((a, b) => {
        if (a._dist == null && b._dist == null) return 0;
        if (a._dist == null) return 1;
        if (b._dist == null) return -1;
        return a._dist - b._dist;
      });
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-16">
      <h1 className="ia-display text-4xl font-bold text-center mb-3">Profissionais</h1>
      <p className="ia-text-soft text-center mb-8">Conheca especialistas aprovados na plataforma</p>
      <div className="flex flex-wrap gap-3 justify-center mb-10">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 ia-text-faint" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar profissionais..." className="ia-input pl-9 pr-4 py-2.5 text-sm w-64" />
        </div>
        <Select value={cat} onChange={(e) => setCat(e.target.value)} className="w-auto">
          <option>Todas</option>
          {categoryOptions.map((a) => <option key={a}>{a}</option>)}
        </Select>
        <button onClick={buscarPerto} disabled={locating} className="ia-btn-ghost text-sm px-4 py-2.5 flex items-center gap-1.5">
          <Navigation size={14} /> {locating ? "Localizando..." : myLocation ? "Atualizar localizacao" : "Perto de mim"}
        </button>
      </div>
      {myLocation && <p className="ia-text-faint text-xs text-center mb-6">Ordenado por proximidade. Profissionais sem localizacao cadastrada aparecem por ultimo.</p>}
      {filtered.length === 0 && <p className="text-center ia-text-faint">Nenhum profissional encontrado.</p>}
      <div className="grid md:grid-cols-3 gap-5">
        {filtered.map((p) => <ProCard key={p.id} p={p} onView={() => setPage({ name: "perfil", id: p.id })} distanceKm={p._dist} />)}
      </div>
    </div>
  );
}

function PortfolioGallery({ items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mb-10">
      <h2 className="ia-display text-xl font-bold mb-4">Portfolio de trabalhos</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map((it) => (
          <a key={it.id} href={it.type === "image" ? publicUrl("portfolio", it.path) : it.path} target="_blank" rel="noreferrer" className="block">
            {it.type === "image" ? (
              <img src={publicUrl("portfolio", it.path)} alt="Trabalho do profissional" className="w-full h-32 object-cover rounded-lg ia-border" />
            ) : (
              <div className="w-full h-32 rounded-lg ia-border flex flex-col items-center justify-center gap-1 ia-text-soft text-xs">
                <Video size={20} /> Ver video
              </div>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}

function ChatImage({ path }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let active = true;
    signedUrl("chat-attachments", path).then((u) => { if (active) setUrl(u); }).catch(() => {});
    return () => { active = false; };
  }, [path]);
  if (!url) return <div className="w-32 h-20 rounded-lg ia-surface2 animate-pulse" />;
  return <img src={url} alt="anexo" className="rounded-lg max-w-full max-h-52 object-cover" />;
}

function MessageBubble({ m, mine }) {
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className="max-w-[75%] text-sm px-3.5 py-2 rounded-2xl space-y-2"
        style={mine ? { background: "linear-gradient(135deg,var(--accent),var(--accent-2))", color: "#fff" } : { background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text)" }}
      >
        {m.image_path && <ChatImage path={m.image_path} />}
        {m.video_url && <a href={m.video_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 underline text-xs"><Video size={13} /> Ver video anexado</a>}
        {m.text && <p>{m.text}</p>}
      </div>
    </div>
  );
}

function MessageComposer({ onSend, notify }) {
  const [text, setText] = useState("");
  const [image, setImage] = useState(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [showVideoField, setShowVideoField] = useState(false);
  const [sending, setSending] = useState(false);
  const preview = image ? URL.createObjectURL(image) : "";

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim() && !image && !videoUrl.trim()) {
      notify("Escreva uma mensagem, anexe uma foto ou cole um link de video.");
      return;
    }
    setSending(true);
    try {
      await onSend({ text: text.trim(), image, videoUrl: videoUrl.trim() });
      setText(""); setImage(null); setVideoUrl(""); setShowVideoField(false);
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-2">
      {image && (
        <div className="flex items-center gap-2">
          <img src={preview} alt="anexo" className="w-16 h-16 object-cover rounded-lg ia-border" />
          <button type="button" onClick={() => setImage(null)} className="ia-btn-ghost text-xs px-2 py-1">Remover foto</button>
        </div>
      )}
      {showVideoField && <Field placeholder="Cole o link do video (YouTube, Drive, etc.)" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />}
      <div className="flex gap-2 items-center">
        <label className="ia-btn-ghost w-10 h-10 flex items-center justify-center shrink-0 cursor-pointer" title="Anexar foto">
          <ImagePlus size={16} />
          <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) setImage(f); }} className="hidden" />
        </label>
        <button type="button" onClick={() => setShowVideoField((v) => !v)} className="ia-btn-ghost w-10 h-10 flex items-center justify-center shrink-0" title="Anexar link de video"><Video size={16} /></button>
        <Field placeholder="Escreva uma mensagem..." value={text} onChange={(e) => setText(e.target.value)} className="flex-1" />
        <button type="submit" disabled={sending} className="ia-btn-primary w-10 h-10 flex items-center justify-center shrink-0"><Send size={16} /></button>
      </div>
    </form>
  );
}

function ChatWidget({ p, currentUser, notify, setPage }) {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!currentUser) return;
    let unsubscribe = () => {};
    db.getOrCreateConversation(p.id, currentUser.id).then(async (conv) => {
      setConversation(conv);
      const msgs = await db.fetchMessages(conv.id);
      setMessages(msgs);
      unsubscribe = db.subscribeToMessages(conv.id, (msg) => setMessages((prev) => [...prev, msg]));
    }).catch((err) => notify(err.message || "Nao foi possivel abrir a conversa."));
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, p.id]);

  if (!currentUser) {
    return (
      <div className="ia-card p-6 text-center">
        <div className="ia-badge w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"><ShieldCheck size={18} /></div>
        <h2 className="ia-display text-lg font-bold mb-2">Crie uma conta para conversar</h2>
        <p className="ia-text-soft text-sm mb-5">Para a seguranca de todos, so quem tem conta verificada (com cadastro e documento enviado) pode enviar mensagens.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => setPage("cadastro")} className="ia-btn-primary text-sm px-5 py-2.5">Criar conta</button>
          <button onClick={() => setPage("login")} className="ia-btn-ghost text-sm px-5 py-2.5">Ja tenho conta</button>
        </div>
      </div>
    );
  }

  const send = async ({ text, image, videoUrl }) => {
    if (!conversation) return;
    let imagePath = null;
    if (image) imagePath = await uploadImage({ bucket: "chat-attachments", folder: conversation.id, file: image });
    await db.sendMessage({ conversationId: conversation.id, senderId: currentUser.id, text, imagePath, videoUrl });
    notify("Mensagem enviada.");
  };

  return (
    <div className="ia-card p-6">
      <h2 className="ia-display text-xl font-bold mb-4 flex items-center gap-2">
        <MessageCircle size={19} style={{ color: "var(--accent)" }} /> Conversar com {p.name.split(" ")[0]}
      </h2>
      <p className="ia-text-faint text-xs flex items-center gap-1.5 mb-4"><UserCheck size={13} /> Enviando como {currentUser.name}</p>
      {messages.length > 0 && (
        <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
          {messages.map((m) => <MessageBubble key={m.id} m={m} mine={m.sender_id === currentUser.id} />)}
        </div>
      )}
      <MessageComposer onSend={send} notify={notify} />
    </div>
  );
}

function PerfilProfissional({ id, setPage, notify, currentUser }) {
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [author, setAuthor] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const isOwner = currentUser && currentUser.tipo === "prestador" && currentUser.id === id;

  const reload = () => db.fetchProfessionalById(id).then(setP).catch(() => setP(null));

  useEffect(() => {
    setLoading(true);
    db.fetchProfessionalById(id).then((data) => {
      setP(data);
      setLoading(false);
      if (data && !isOwner) db.incrementProfessionalViews(id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <div className="max-w-3xl mx-auto px-6 py-24 text-center ia-text-faint text-sm">Carregando...</div>;

  if (!p) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <p className="ia-text-soft mb-4">Profissional nao encontrado.</p>
        <button onClick={() => setPage("profissionais")} className="ia-link font-semibold">Voltar para Profissionais</button>
      </div>
    );
  }

  const submitReview = async (e) => {
    e.preventDefault();
    if (!author || !comment) {
      notify("Preencha seu nome e um comentario.");
      return;
    }
    try {
      await db.addReview(p.id, author, Number(rating), comment);
      notify("Avaliacao enviada. Obrigado!");
      setAuthor(""); setComment(""); setRating(5);
      reload();
    } catch (err) {
      notify(err.message || "Nao foi possivel enviar a avaliacao.");
    }
  };

  const rating_avg = avgRating(p.reviews);

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <button onClick={() => setPage("profissionais")} className="ia-text-soft text-sm mb-8">← Voltar</button>
      <div className="ia-card p-8 mb-8 flex flex-col sm:flex-row gap-6 items-start">
        <img src={avatarSrc(p)} alt={p.name} className="ia-ring w-24 h-24 rounded-full" />
        <div className="flex-1">
          <h1 className="ia-display text-2xl font-bold mb-1">{p.name}</h1>
          <p className="font-medium mb-2" style={{ color: "var(--accent)" }}>{p.profession}</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {(p.categories || []).map((c) => <span key={c} className="ia-badge text-xs px-2.5 py-1">{c}</span>)}
          </div>
          <p className="ia-text-soft text-sm flex items-center gap-1 mb-3"><MapPin size={13} /> {p.address}</p>
          {rating_avg ? (
            <div className="flex items-center gap-2 mb-3 text-sm ia-text-soft"><StarRow rating={rating_avg} /> {rating_avg} ({p.reviews.length} avaliacoes)</div>
          ) : (
            <p className="ia-text-faint text-sm mb-3">Sem avaliacoes ainda</p>
          )}
          <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>{p.description}</p>
        </div>
      </div>

      <PortfolioGallery items={p.portfolio_items} />

      {isOwner ? (
        <div className="ia-card p-6 mb-10 flex items-center gap-2 text-sm ia-text-soft">
          <ShieldCheck size={16} style={{ color: "var(--accent)" }} /> Este e o seu perfil publico. Veja mensagens recebidas em "Meu Perfil".
        </div>
      ) : (
        <div className="mb-10"><ChatWidget p={p} currentUser={currentUser} notify={notify} setPage={setPage} /></div>
      )}

      <h2 className="ia-display text-xl font-bold mb-4">Avaliacoes de terceiros</h2>
      <div className="space-y-3 mb-10">
        {p.reviews.length === 0 && <p className="ia-text-faint text-sm">Ainda sem avaliacoes. Seja o primeiro a avaliar.</p>}
        {p.reviews.map((r) => (
          <div key={r.id} className="ia-card p-5">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-sm">{r.author}</span>
              <StarRow rating={r.rating} />
            </div>
            <p className="ia-text-soft text-sm">{r.comment}</p>
          </div>
        ))}
      </div>

      <h2 className="ia-display text-xl font-bold mb-4">Deixar uma avaliacao</h2>
      <form onSubmit={submitReview} className="ia-card p-6 space-y-4">
        <Field placeholder="Seu nome" value={author} onChange={(e) => setAuthor(e.target.value)} />
        <div>
          <label className="ia-text-soft text-xs mb-1 block">Nota</label>
          <Select value={rating} onChange={(e) => setRating(e.target.value)}>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} estrela{n > 1 ? "s" : ""}</option>)}
          </Select>
        </div>
        <TextArea placeholder="Conte como foi sua experiencia" value={comment} onChange={(e) => setComment(e.target.value)} />
        <button type="submit" className="ia-btn-primary font-semibold px-6 py-2.5 flex items-center gap-2 w-fit"><Plus size={16} /> Enviar avaliacao</button>
      </form>
    </div>
  );
}

function PortfolioManager({ professionalId, items, notify, onChange }) {
  const [videoUrl, setVideoUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const addImage = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = await uploadImage({ bucket: "portfolio", folder: professionalId, file, maxWidth: 1400, quality: 0.78 });
      await db.addPortfolioItem(professionalId, "image", path);
      notify("Foto adicionada ao portfolio.");
      onChange();
    } catch (err) {
      notify(err.message || "Nao foi possivel adicionar a foto.");
    } finally {
      setUploading(false);
    }
  };

  const addVideo = async (e) => {
    e.preventDefault();
    if (!videoUrl.trim()) return;
    try {
      await db.addPortfolioItem(professionalId, "video", videoUrl.trim());
      setVideoUrl("");
      notify("Video adicionado ao portfolio.");
      onChange();
    } catch (err) {
      notify(err.message || "Nao foi possivel adicionar o video.");
    }
  };

  const remove = async (itemId) => {
    try {
      await db.removePortfolioItem(itemId);
      onChange();
    } catch (err) {
      notify(err.message || "Nao foi possivel remover o item.");
    }
  };

  return (
    <div className="ia-card p-6 mb-10">
      <h2 className="ia-display text-xl font-bold mb-2 flex items-center gap-2">
        <ImagePlus size={19} style={{ color: "var(--accent)" }} /> Portfolio de trabalhos
      </h2>
      <p className="ia-text-soft text-sm mb-4">Mostre fotos e videos do seu trabalho para os visitantes verem antes de te contratar. Isso e opcional.</p>
      <div className="flex flex-wrap gap-2 mb-4">
        <label className="ia-btn-ghost text-sm px-4 py-2 cursor-pointer flex items-center gap-1.5">
          <ImagePlus size={14} /> {uploading ? "Enviando..." : "Adicionar foto"}
          <input type="file" accept="image/*" onChange={addImage} className="hidden" disabled={uploading} />
        </label>
      </div>
      <form onSubmit={addVideo} className="flex gap-2 mb-5">
        <Field placeholder="Colar link de video (YouTube, Drive, etc.)" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className="flex-1" />
        <button type="submit" className="ia-btn-ghost text-sm px-4">Adicionar</button>
      </form>
      {(!items || items.length === 0) ? (
        <p className="ia-text-faint text-sm">Nenhum item ainda. Que tal adicionar uma foto de um trabalho recente?</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {items.map((it) => (
            <div key={it.id} className="relative">
              {it.type === "image" ? (
                <img src={publicUrl("portfolio", it.path)} alt="Trabalho" className="w-full h-24 object-cover rounded-lg ia-border" />
              ) : (
                <a href={it.path} target="_blank" rel="noreferrer" className="w-full h-24 rounded-lg ia-border flex flex-col items-center justify-center gap-1 ia-text-soft text-xs">
                  <Video size={18} /> Video
                </a>
              )}
              <button type="button" onClick={() => remove(it.id)} className="absolute -top-2 -right-2 rounded-full w-5 h-5 flex items-center justify-center text-white" style={{ background: "var(--danger)" }} aria-label="Remover item">
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MeuPerfil({ currentUser, setPage, notify }) {
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [editingPhoto, setEditingPhoto] = useState(false);
  const [newPhoto, setNewPhoto] = useState(null);

  const reload = () => db.fetchMyProfessional(currentUser.id).then((data) => { setP(data); setLoading(false); });
  const reloadConversations = () => db.fetchProfessionalConversations(currentUser.id).then(setConversations).catch(() => {});

  useEffect(() => { reload(); reloadConversations(); }, [currentUser.id]);

  if (loading) return <div className="max-w-4xl mx-auto px-6 py-24 text-center ia-text-faint text-sm">Carregando...</div>;
  if (!p) return null;

  const rating_avg = avgRating(p.reviews);
  const totalMessages = conversations.reduce((a, c) => a + (c.messages?.length || 0), 0);
  const statusBadgeClass = p.status === "aprovado" ? "ia-badge-success" : p.status === "rejeitado" ? "ia-badge-danger" : "ia-badge-warm";

  const savePhoto = async () => {
    if (!newPhoto) return;
    try {
      const path = await uploadImage({ bucket: "avatars", folder: currentUser.id, file: newPhoto, maxWidth: 700 });
      await db.updateProfessionalPhoto(currentUser.id, path);
      setNewPhoto(null);
      setEditingPhoto(false);
      reload();
      notify("Foto atualizada.");
    } catch (err) {
      notify(err.message || "Nao foi possivel atualizar a foto.");
    }
  };

  const reply = async (conv, { text, image, videoUrl }) => {
    let imagePath = null;
    if (image) imagePath = await uploadImage({ bucket: "chat-attachments", folder: conv.id, file: image });
    await db.sendMessage({ conversationId: conv.id, senderId: currentUser.id, text, imagePath, videoUrl });
    reloadConversations();
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-14">
      <div className="ia-card p-8 mb-8 flex flex-col sm:flex-row gap-6 items-start">
        <img src={avatarSrc(p)} alt={p.name} className="ia-ring w-20 h-20 rounded-full" />
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="ia-display text-2xl font-bold">{p.name}</h1>
            <span className={`text-xs px-3 py-1 font-medium ${statusBadgeClass}`}>{p.status}</span>
          </div>
          <p className="ia-text-soft text-sm mb-2">{p.profession}</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {(p.categories || []).map((c) => <span key={c} className="ia-badge text-xs px-2.5 py-1">{c}</span>)}
          </div>
          <button onClick={() => setEditingPhoto((v) => !v)} className="ia-link text-xs">{editingPhoto ? "Fechar" : "Alterar foto de perfil"}</button>
        </div>
        <button onClick={() => setPage({ name: "perfil", id: p.id })} className="ia-btn-ghost text-sm px-4 py-2 shrink-0">Ver perfil publico</button>
      </div>

      {editingPhoto && (
        <div className="ia-card p-6 mb-8 space-y-3">
          <ProfilePhotoPicker file={newPhoto} onChange={setNewPhoto} />
          <button onClick={savePhoto} disabled={!newPhoto} className="ia-btn-primary text-sm px-5 py-2">Salvar foto</button>
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        <div className="ia-card p-6"><Eye size={19} style={{ color: "var(--accent)" }} className="mb-2" /><p className="ia-display text-2xl font-bold">{p.views || 0}</p><p className="ia-text-soft text-sm">visualizacoes do perfil</p></div>
        <div className="ia-card p-6"><Star size={19} style={{ color: "var(--warm)" }} className="mb-2" /><p className="ia-display text-2xl font-bold">{rating_avg || "-"}</p><p className="ia-text-soft text-sm">{p.reviews.length} avaliacoes recebidas</p></div>
        <div className="ia-card p-6"><MessageCircle size={19} style={{ color: "var(--accent)" }} className="mb-2" /><p className="ia-display text-2xl font-bold">{totalMessages}</p><p className="ia-text-soft text-sm">mensagens em {conversations.length} conversas</p></div>
      </div>

      <PortfolioManager professionalId={p.id} items={p.portfolio_items} notify={notify} onChange={reload} />

      <h2 className="ia-display text-xl font-bold mb-4">Mensagens</h2>
      <div className="space-y-3">
        {conversations.length === 0 && <p className="ia-text-faint text-sm">Nenhuma mensagem recebida ainda.</p>}
        {conversations.map((c) => {
          const isOpen = openId === c.id;
          const msgs = c.messages || [];
          const last = msgs[msgs.length - 1];
          return (
            <div key={c.id} className="ia-card p-5">
              <button className="w-full flex items-center justify-between text-left" onClick={() => setOpenId(isOpen ? null : c.id)}>
                <div>
                  <p className="font-semibold text-sm">{c.profiles?.name || "Visitante"}</p>
                  <p className="ia-text-faint text-xs">{last ? last.text || (last.image_path ? "Foto anexada" : last.video_url ? "Video anexado" : "") : ""}</p>
                </div>
                <span className="ia-text-faint text-xs">{isOpen ? "fechar" : "abrir"}</span>
              </button>
              {isOpen && (
                <div className="mt-4">
                  <div className="space-y-2 mb-4 max-h-56 overflow-y-auto">
                    {msgs.map((m) => <MessageBubble key={m.id} m={m} mine={m.sender_id === currentUser.id} />)}
                  </div>
                  <MessageComposer onSend={(payload) => reply(c, payload)} notify={notify} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PaginaPendente({ name, setPage }) {
  return (
    <div className="max-w-lg mx-auto px-6 py-24 text-center">
      <div className="ia-badge-warm w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"><Clock size={26} /></div>
      <h1 className="ia-display text-3xl font-bold mb-3">Cadastro em analise</h1>
      <p className="ia-text-soft mb-8">
        Obrigado{name ? `, ${name}` : ""}! Recebemos seus dados. Um moderador vai revisar seu cadastro antes que seu perfil apareca
        publicamente na plataforma. Acompanhe o status em "Meu Perfil".
      </p>
      <div className="flex gap-3 justify-center">
        <button onClick={() => setPage("meu-perfil")} className="ia-btn-primary font-semibold px-6 py-3">Ir para Meu Perfil</button>
        <button onClick={() => setPage("home")} className="ia-btn-ghost font-semibold px-6 py-3">Voltar ao inicio</button>
      </div>
    </div>
  );
}

function PainelModerador({ notify, setPage }) {
  const [list, setList] = useState([]);
  const [tab, setTab] = useState("pendente");
  const [loading, setLoading] = useState(true);

  const reload = () => db.fetchAllProfessionalsForModerator().then((data) => { setList(data); setLoading(false); }).catch((err) => notify(err.message));

  useEffect(() => { reload(); }, []);

  const updateStatus = async (id, status) => {
    try {
      await db.updateProfessionalStatus(id, status);
      notify(status === "aprovado" ? "Prestador aprovado. O perfil ja esta visivel no site." : status === "rejeitado" ? "Cadastro rejeitado." : "Status atualizado.");
      reload();
    } catch (err) {
      notify(err.message || "Nao foi possivel atualizar o status.");
    }
  };

  const verDocumento = async (path) => {
    if (!path) return;
    try {
      const url = await signedUrl("documents", path);
      window.open(url, "_blank");
    } catch (err) {
      notify(err.message || "Nao foi possivel abrir o documento.");
    }
  };

  const tabs = [
    { id: "pendente", label: "Pendentes" },
    { id: "aprovado", label: "Aprovados" },
    { id: "rejeitado", label: "Rejeitados" },
  ];
  const filtered = list.filter((p) => p.status === tab);

  if (loading) return <div className="max-w-4xl mx-auto px-6 py-24 text-center ia-text-faint text-sm">Carregando...</div>;

  return (
    <div className="max-w-4xl mx-auto px-6 py-14">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-8">
        <div>
          <h1 className="ia-display text-3xl font-bold mb-1 flex items-center gap-2"><ShieldCheck size={26} style={{ color: "var(--accent)" }} /> Painel do moderador</h1>
          <p className="ia-text-soft text-sm">Aprove ou recuse cadastros de prestadores antes que fiquem publicos.</p>
        </div>
        <button onClick={() => setPage("home")} className="ia-btn-ghost text-sm px-4 py-2">Sair</button>
      </div>
      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`text-sm font-medium px-4 py-2 ${tab === t.id ? "ia-btn-primary" : "ia-btn-ghost"}`}>
            {t.label} ({list.filter((p) => p.status === t.id).length})
          </button>
        ))}
      </div>
      <div className="space-y-4">
        {filtered.length === 0 && <p className="ia-text-faint text-sm">Nenhum cadastro nesta categoria.</p>}
        {filtered.map((p) => {
          const v = p.professional_verifications;
          return (
            <div key={p.id} className="ia-card p-6">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <img src={avatarSrc(p)} alt={p.name} className="ia-ring w-12 h-12 rounded-full" />
                  <div>
                    <h3 className="ia-display text-lg font-bold">{p.name}</h3>
                    <p className="ia-text-soft text-sm">{p.profession} • {(p.categories || []).join(", ")}</p>
                  </div>
                </div>
                <span className={`text-xs px-3 py-1 font-medium ${p.status === "aprovado" ? "ia-badge-success" : p.status === "rejeitado" ? "ia-badge-danger" : "ia-badge-warm"}`}>{p.status}</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm mb-4" style={{ color: "var(--text)" }}>
                <p><span className="ia-text-faint">Telefone: </span>{v?.telefone || "-"}</p>
                <p><span className="ia-text-faint">RG: </span>{v?.rg || "-"}</p>
                <p className="sm:col-span-2"><span className="ia-text-faint">Endereco: </span>{p.address}</p>
              </div>
              <p className="text-sm mb-4" style={{ color: "var(--text)" }}>{p.description}</p>
              {(v?.rg_frente_path || v?.rg_verso_path) && (
                <div className="flex gap-2 mb-4">
                  {v.rg_frente_path && <button onClick={() => verDocumento(v.rg_frente_path)} className="ia-btn-ghost text-xs px-3 py-1.5">Ver documento (frente)</button>}
                  {v.rg_verso_path && <button onClick={() => verDocumento(v.rg_verso_path)} className="ia-btn-ghost text-xs px-3 py-1.5">Ver documento (verso)</button>}
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                {p.status !== "aprovado" && <button onClick={() => updateStatus(p.id, "aprovado")} className="ia-btn-primary text-sm px-4 py-2">Aprovar</button>}
                {p.status !== "rejeitado" && <button onClick={() => updateStatus(p.id, "rejeitado")} className="ia-btn-ghost text-sm px-4 py-2" style={{ borderColor: "var(--danger)", color: "var(--danger)" }}>Rejeitar</button>}
                {p.status !== "pendente" && <button onClick={() => updateStatus(p.id, "pendente")} className="ia-btn-ghost text-sm px-4 py-2">Voltar para analise</button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Aptura() {
  const [page, setPage] = useState("home");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [booting, setBooting] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [myProfessionalExists, setMyProfessionalExists] = useState(null); // null = ainda nao sabemos
  const [myCompanyExists, setMyCompanyExists] = useState(null);
  const [professionals, setProfessionals] = useState([]);
  const [vagas, setVagas] = useState([]);
  const [toast, setToast] = useState("");
  const [theme, setThemeState] = useState("dark");

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3600);
  };

  const loadPublicData = () => {
    db.fetchApprovedProfessionals().then(setProfessionals).catch(() => {});
    db.fetchVagas().then(setVagas).catch(() => {});
  };

  const loadSessionProfile = async (session) => {
    if (!session) {
      setCurrentUser(null);
      setMyProfessionalExists(null);
      setMyCompanyExists(null);
      return;
    }
    try {
      const profile = await fetchFullProfile(session.user.id);
      setCurrentUser({ id: profile.id, name: profile.name, email: profile.email, tipo: profile.tipo, isModerator: profile.is_moderator });
      if (profile.tipo === "prestador") {
        const mine = await db.fetchMyProfessional(profile.id);
        setMyProfessionalExists(!!mine);
      } else {
        const mine = await db.fetchMyCompany(profile.id);
        setMyCompanyExists(!!mine);
      }
    } catch {
      setCurrentUser(null);
    }
  };

  useEffect(() => {
    setThemeState(loadTheme());
    loadPublicData();
    getCurrentSession().then(async (session) => {
      await loadSessionProfile(session);
      setBooting(false);
    });
    const unsubscribe = onAuthStateChange((session) => {
      loadSessionProfile(session);
    });
    return unsubscribe;
  }, []);

  const setTheme = (t) => {
    setThemeState(t);
    saveTheme(t);
  };

  const logout = async () => {
    await signOutUser();
    setPage("home");
  };

  const pageName = typeof page === "string" ? page : page.name;
  const pageId = typeof page === "object" ? page.id : null;

  let content = null;
  if (booting) {
    content = <div className="flex items-center justify-center py-40 ia-text-faint text-sm">Carregando {BRAND}...</div>;
  } else if (pageName === "home") {
    content = <Home setPage={setPage} professionals={professionals} vagas={vagas} />;
  } else if (pageName === "sobre") {
    content = <SobreNos />;
  } else if (pageName === "cadastro") {
    if (currentUser && currentUser.tipo === "prestador" && myProfessionalExists === false) {
      content = <CompletarPrestador currentUser={currentUser} notify={notify} onDone={() => { setMyProfessionalExists(true); setPage("pendente"); }} />;
    } else if (currentUser && currentUser.tipo === "empresa" && myCompanyExists === false) {
      content = <CompletarEmpresa currentUser={currentUser} notify={notify} onDone={() => { setMyCompanyExists(true); setPage("vagas"); }} />;
    } else if (currentUser) {
      content = <Home setPage={setPage} professionals={professionals} vagas={vagas} />;
    } else {
      content = (
        <Cadastro
          notify={notify}
          setPage={setPage}
          onSignedUp={() => {}}
        />
      );
    }
  } else if (pageName === "login") {
    content = <Login notify={notify} setPage={setPage} />;
  } else if (pageName === "vagas") {
    content = <Vagas vagas={vagas} notify={notify} currentUser={currentUser} onPosted={loadPublicData} />;
  } else if (pageName === "minhas-vagas") {
    content = currentUser && currentUser.tipo === "empresa"
      ? (myCompanyExists === false
          ? <CompletarEmpresa currentUser={currentUser} notify={notify} onDone={() => { setMyCompanyExists(true); }} />
          : <MinhasVagas currentUser={currentUser} setPage={setPage} />)
      : <Login notify={notify} setPage={setPage} />;
  } else if (pageName === "profissionais") {
    content = <Profissionais professionals={professionals} setPage={setPage} notify={notify} />;
  } else if (pageName === "perfil") {
    content = <PerfilProfissional id={pageId} setPage={setPage} notify={notify} currentUser={currentUser} />;
  } else if (pageName === "meu-perfil") {
    content = currentUser && currentUser.tipo === "prestador"
      ? (myProfessionalExists === false
          ? <CompletarPrestador currentUser={currentUser} notify={notify} onDone={() => { setMyProfessionalExists(true); }} />
          : <MeuPerfil currentUser={currentUser} setPage={setPage} notify={notify} />)
      : <Login notify={notify} setPage={setPage} />;
  } else if (pageName === "pendente") {
    content = <PaginaPendente name={currentUser?.name} setPage={setPage} />;
  } else if (pageName === "painel-moderador") {
    content = currentUser?.isModerator ? <PainelModerador notify={notify} setPage={setPage} /> : <Home setPage={setPage} professionals={professionals} vagas={vagas} />;
  }

  return (
    <div className="ia" data-theme={theme}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');`}</style>
      <style>{THEME_CSS}</style>
      <Toast message={toast} />
      <Navbar page={pageName} setPage={setPage} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} theme={theme} setTheme={setTheme} currentUser={currentUser} onLogout={logout} />
      {content}
      <footer className="ia-border" style={{ borderTopWidth: 1 }}>
        <div className="flex flex-col items-center gap-2 py-8 text-center px-6">
          <p className="ia-text-soft text-sm font-medium">{FOOTER_LINE}</p>
          <div className="flex items-center gap-4 mt-1">
            <a
              href="https://www.instagram.com/aptura.co/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram do aptura.co"
              className="ia-text-soft hover:text-[var(--accent)] transition-colors"
            >
              <Instagram size={18} />
            </a>
            <a
              href="mailto:aptura.coo@gmail.com"
              aria-label="Enviar email para aptura.co"
              className="ia-text-soft hover:text-[var(--accent)] transition-colors flex items-center gap-1.5 text-xs"
            >
              <Mail size={16} /> aptura.coo@gmail.com
            </a>
          </div>
          <p className="ia-text-faint text-xs">© 2026 {BRAND}. Todos os direitos reservados.</p>
          {currentUser?.isModerator && (
            <button onClick={() => setPage("painel-moderador")} className="ia-text-faint text-xs underline mt-1">Painel do moderador</button>
          )}
        </div>
      </footer>
    </div>
  );
}
