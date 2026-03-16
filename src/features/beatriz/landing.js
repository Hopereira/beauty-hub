/**
 * Landing Institucional — Ana Beatriz Xavier
 * biaxavier.com.br
 *
 * Página pessoal e institucional — independente do SaaS BeautyHub.
 * Não usa autenticação, tenant resolver nem billing.
 *
 * Assets: adicionar fotos em src/assets/images/ quando disponíveis.
 * Ver comentários TODO abaixo para pontos de substituição.
 */

import './landing.css';

// ─── Contatos e redes ──────────────────────────────────────────────────────
const WHATSAPP_NUMBER = '5524988243174';
const WHATSAPP_URL    = `https://wa.me/${WHATSAPP_NUMBER}`;
const INSTAGRAM_URL   = 'https://www.instagram.com/ana_trizz32iu/';
const FACEBOOK_URL    = 'https://www.facebook.com/beatriz.depiladora/';
const APP_URL         = 'https://app.biaxavier.com.br/';

// ─── Serviços ──────────────────────────────────────────────────────────────
// TODO: confirmar lista completa de serviços com Ana Beatriz
const SERVICES = [
    {
        icon: 'fa-eye',
        title: 'Extensão de Cílios',
        description: 'Volume e naturalidade para realçar seu olhar com técnica apurada e os melhores materiais do mercado.',
    },
    {
        icon: 'fa-star',
        title: 'Design de Sobrancelhas',
        description: 'Sobrancelhas moldadas para harmonizar com seu rosto e expressar a sua personalidade única.',
    },
    {
        icon: 'fa-spa',
        title: 'Depilação',
        description: 'Tratamento completo com conforto, higiene e produtos selecionados para o cuidado da sua pele.',
    },
];

// ─── Render ────────────────────────────────────────────────────────────────

export function render() {
    const app = document.getElementById('app');
    if (!app) return;

    document.title = 'Ana Beatriz Xavier — Extensão de Cílios & Beleza';

    app.innerHTML = `
        <div class="bx-landing">

            <!-- ── NAVEGAÇÃO ── -->
            <nav class="bx-nav">
                <a href="#inicio" class="bx-nav__brand">
                    <img src="/assets/logos/logo.png" alt="Beatriz Xavier" class="bx-nav__logo">
                </a>
                <ul class="bx-nav__links">
                    <li><a href="#inicio">Home</a></li>
                    <li><a href="#servicos">Serviços</a></li>
                    <li><a href="#galeria">Galeria</a></li>
                    <li><a href="#sobre">Sobre</a></li>
                    <li><a href="#contato">Contato</a></li>
                    <li><a href="${APP_URL}" target="_blank" rel="noopener noreferrer">Sistema</a></li>
                    <li><a href="/curso">Curso <span class="bx-badge bx-badge--nav">Em breve</span></a></li>
                </ul>
                <a href="${WHATSAPP_URL}" target="_blank" rel="noopener noreferrer"
                   class="bx-nav__cta">
                    <i class="fab fa-whatsapp"></i> Agendar
                </a>
                <button class="bx-nav__hamburger" id="bxHamburger" aria-label="Abrir menu" aria-expanded="false">
                    <span></span><span></span><span></span>
                </button>
            </nav>

            <!-- ── DRAWER MOBILE ── -->
            <div class="bx-drawer__overlay" id="bxOverlay"></div>
            <aside class="bx-drawer" id="bxDrawer" aria-label="Menu">
                <div class="bx-drawer__header">
                    <img src="/assets/logos/logo.png" alt="Beatriz Xavier" class="bx-drawer__logo">
                    <button class="bx-drawer__close" id="bxDrawerClose" aria-label="Fechar menu">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <ul class="bx-drawer__links">
                    <li><a href="#inicio"><i class="fas fa-home"></i> Home</a></li>
                    <li><a href="#servicos"><i class="fas fa-spa"></i> Serviços</a></li>
                    <li><a href="#galeria"><i class="fas fa-images"></i> Galeria</a></li>
                    <li><a href="#sobre"><i class="fas fa-user"></i> Sobre</a></li>
                    <li><a href="#contato"><i class="fas fa-envelope"></i> Contato</a></li>
                    <li class="bx-drawer__divider"></li>
                    <li><a href="${APP_URL}" target="_blank" rel="noopener noreferrer" class="bx-drawer__highlight">
                        <i class="fas fa-calendar-check"></i> Sistema
                    </a></li>
                    <li><a href="/curso" class="bx-drawer__highlight bx-drawer__highlight--curso">
                        <i class="fas fa-graduation-cap"></i> Curso <span class="bx-badge">Em breve</span>
                    </a></li>
                </ul>
                <a href="${WHATSAPP_URL}" target="_blank" rel="noopener noreferrer"
                   class="bx-btn bx-btn--primary bx-drawer__cta">
                    <i class="fab fa-whatsapp"></i> Agendar pelo WhatsApp
                </a>
            </aside>

            <!-- ── HERO: SPLIT 3 COLUNAS ── -->
            <section id="inicio" class="bx-hero">
                <div class="bx-hero__photo-wrap bx-hero__photo-wrap--left">
                    <img src="/assets/images/beatriz.jpg"
                         alt="Ana Beatriz Xavier"
                         onerror="this.parentElement.style.background='#b2e4e2'">
                </div>

                <div class="bx-hero__center">
                    <span class="bx-hero__pretitle">Especialista em Beleza</span>
                    <h1 class="bx-hero__title">Beatriz Xavier:<br>O Olhar que<br>Você Sempre Sonhou.</h1>
                    <p class="bx-hero__desc">
                        Realce sua beleza natural com extensões de cílios personalizadas
                        e outros serviços de embelezamento.
                    </p>
                    <div class="bx-hero__actions">
                        <a href="${WHATSAPP_URL}" target="_blank" rel="noopener noreferrer"
                           class="bx-btn bx-btn--primary">
                            <i class="fab fa-whatsapp"></i> Agendar pelo WhatsApp
                        </a>
                        <a href="#servicos" class="bx-hero__scroll">
                            Ver serviços <i class="fas fa-chevron-down"></i>
                        </a>
                    </div>
                </div>

                <div class="bx-hero__photo-wrap bx-hero__photo-wrap--right">
                    <img src="/assets/images/beatriz3.jpg"
                         alt="Trabalho de Ana Beatriz Xavier"
                         onerror="this.parentElement.style.background='#a8dbd9'">
                </div>
            </section>

            <!-- ── SERVIÇOS ── -->
            <section id="servicos" class="bx-services">
                <span class="bx-section-tag">O que faço</span>
                <h2>Meus Serviços</h2>
                <p class="bx-services__subtitle">
                    Cuidado personalizado para realçar a sua beleza natural
                </p>
                <div class="bx-services__grid">
                    ${SERVICES.map(s => `
                        <div class="bx-service-card">
                            <div class="bx-service-card__icon">
                                <i class="fas ${s.icon}"></i>
                            </div>
                            <h3>${s.title}</h3>
                            <p>${s.description}</p>
                        </div>
                    `).join('')}
                </div>
                <a href="${WHATSAPP_URL}" target="_blank" rel="noopener noreferrer"
                   class="bx-btn bx-btn--secondary">
                    <i class="fab fa-whatsapp"></i> Ver disponibilidade
                </a>
            </section>

            <!-- ── SOBRE: DARK SECTION ── -->
            <div id="sobre" class="bx-about-section">
                <div class="bx-about">
                    <div class="bx-about__photo">
                        <img src="/assets/images/trabalho2.png"
                             alt="Espaço de atendimento de Ana Beatriz Xavier"
                             onerror="this.parentElement.style.display='none'">
                    </div>
                    <div class="bx-about__text">
                        <span class="bx-section-tag">Sobre mim</span>
                        <h2>Transformo cuidado<br>em experiência.</h2>
                        <p>
                            Entre pinças, espelhos e muita dedicação, meu espaço de atendimento revela
                            muito mais do que técnica: revela carinho, presença e propósito em cada detalhe.
                        </p>
                        <p>
                            Teve maquiagem, luz, câmera e um making of especial que mostrou um pouco dos
                            bastidores do meu trabalho — daquilo que existe por trás de cada atendimento,
                            de cada olhar valorizado e de cada mulher que sai daqui se sentindo ainda mais
                            bonita e confiante.
                        </p>
                        <p>
                            Mais do que cílios e depilação, esse espaço foi criado para realçar a beleza
                            e fortalecer a autoestima de cada mulher que passa por aqui.
                        </p>
                        <div class="bx-about__actions">
                            <a href="${INSTAGRAM_URL}" target="_blank" rel="noopener noreferrer"
                               class="bx-btn bx-btn--secondary">
                                <i class="fab fa-instagram"></i> Instagram
                            </a>
                            <a href="${FACEBOOK_URL}" target="_blank" rel="noopener noreferrer"
                               class="bx-btn bx-btn--ghost">
                                <i class="fab fa-facebook"></i> Facebook
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ── GALERIA ── -->
            <section id="galeria" class="bx-gallery">
                <span class="bx-section-tag">Portfólio</span>
                <h2>Meus Trabalhos</h2>
                <p class="bx-gallery__subtitle">Cada atendimento é único — veja um pouco do que já realizei</p>
                <div class="bx-gallery__grid">
                    <div class="bx-gallery__item" role="button" tabindex="0" data-src="/assets/images/beatriz.jpg" data-alt="Ana Beatriz Xavier">
                        <img src="/assets/images/beatriz.jpg" alt="Ana Beatriz Xavier" loading="lazy">
                        <div class="bx-gallery__overlay"><i class="fas fa-search-plus"></i></div>
                    </div>
                    <div class="bx-gallery__item" role="button" tabindex="0" data-src="/assets/images/trabalho1.png" data-alt="Trabalho de Ana Beatriz">
                        <img src="/assets/images/trabalho1.png" alt="Trabalho de Ana Beatriz" loading="lazy">
                        <div class="bx-gallery__overlay"><i class="fas fa-search-plus"></i></div>
                    </div>
                    <div class="bx-gallery__item" role="button" tabindex="0" data-src="/assets/images/trabalho2.png" data-alt="Trabalho de Ana Beatriz">
                        <img src="/assets/images/trabalho2.png" alt="Trabalho de Ana Beatriz" loading="lazy">
                        <div class="bx-gallery__overlay"><i class="fas fa-search-plus"></i></div>
                    </div>
                    <div class="bx-gallery__item" role="button" tabindex="0" data-src="/assets/images/beatriz3.jpg" data-alt="Trabalho de Ana Beatriz">
                        <img src="/assets/images/beatriz3.jpg" alt="Trabalho de Ana Beatriz" loading="lazy">
                        <div class="bx-gallery__overlay"><i class="fas fa-search-plus"></i></div>
                    </div>
                    <div class="bx-gallery__item" role="button" tabindex="0" data-src="/assets/images/trabalho3.png" data-alt="Trabalho de Ana Beatriz">
                        <img src="/assets/images/trabalho3.png" alt="Trabalho de Ana Beatriz" loading="lazy">
                        <div class="bx-gallery__overlay"><i class="fas fa-search-plus"></i></div>
                    </div>
                </div>
                <a href="${INSTAGRAM_URL}" target="_blank" rel="noopener noreferrer"
                   class="bx-btn bx-btn--secondary">
                    <i class="fab fa-instagram"></i> Ver mais no Instagram
                </a>
            </section>

            <!-- ── CONTATO ── -->
            <section id="contato" class="bx-contact">
                <span class="bx-section-tag">Fale comigo</span>
                <h2>Me encontre aqui</h2>
                <p class="bx-contact__sub">
                    Agende, me siga ou entre em contato pelos canais abaixo
                </p>
                <div class="bx-social-grid">
                    <a href="${WHATSAPP_URL}" target="_blank" rel="noopener noreferrer"
                       class="bx-social-card bx-social-card--whatsapp">
                        <i class="fab fa-whatsapp bx-social-card__icon"></i>
                        <span class="bx-social-card__name">WhatsApp</span>
                        <span class="bx-social-card__handle">Agende sua visita</span>
                    </a>
                    <a href="${INSTAGRAM_URL}" target="_blank" rel="noopener noreferrer"
                       class="bx-social-card bx-social-card--instagram">
                        <i class="fab fa-instagram bx-social-card__icon"></i>
                        <span class="bx-social-card__name">Instagram</span>
                        <span class="bx-social-card__handle">@ana_trizz32iu</span>
                    </a>
                    <a href="${FACEBOOK_URL}" target="_blank" rel="noopener noreferrer"
                       class="bx-social-card bx-social-card--facebook">
                        <i class="fab fa-facebook bx-social-card__icon"></i>
                        <span class="bx-social-card__name">Facebook</span>
                        <span class="bx-social-card__handle">beatriz.depiladora</span>
                    </a>
                </div>
            </section>

            <!-- ── FOOTER ── -->
            <footer class="bx-footer">
                <p>© ${new Date().getFullYear()} Ana Beatriz Xavier · Todos os direitos reservados</p>
            </footer>

        </div>

        <!-- ── MODAL FOTO ── -->
        <div class="bx-photo-modal" id="bxPhotoModal" role="dialog" aria-modal="true" aria-label="Foto ampliada">
            <div class="bx-photo-modal__backdrop" id="bxModalBackdrop"></div>
            <div class="bx-photo-modal__box">
                <button class="bx-photo-modal__close" id="bxModalClose" aria-label="Fechar foto">
                    <i class="fas fa-times"></i>
                </button>
                <img class="bx-photo-modal__img" id="bxModalImg" src="" alt="">
            </div>
        </div>
    `;
}

// ─── Init ──────────────────────────────────────────────────────────────────

export function init() {
    // ── Smooth scroll ──
    document.querySelectorAll('.bx-landing a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', e => {
            const targetId = anchor.getAttribute('href');
            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // ── Hamburger / Drawer ──
    const hamburger = document.getElementById('bxHamburger');
    const drawer    = document.getElementById('bxDrawer');
    const overlay   = document.getElementById('bxOverlay');
    const drawerClose = document.getElementById('bxDrawerClose');

    function openDrawer() {
        drawer.classList.add('bx-drawer--open');
        overlay.classList.add('bx-drawer__overlay--visible');
        hamburger.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
        drawer.classList.remove('bx-drawer--open');
        overlay.classList.remove('bx-drawer__overlay--visible');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
    }

    if (hamburger)   hamburger.addEventListener('click', openDrawer);
    if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
    if (overlay)     overlay.addEventListener('click', closeDrawer);

    document.querySelectorAll('.bx-drawer__links a[href^="#"]').forEach(link => {
        link.addEventListener('click', () => { closeDrawer(); });
    });

    // ── Photo Modal ──
    const modal         = document.getElementById('bxPhotoModal');
    const modalImg      = document.getElementById('bxModalImg');
    const modalClose    = document.getElementById('bxModalClose');
    const modalBackdrop = document.getElementById('bxModalBackdrop');

    function openPhotoModal(src, alt) {
        modalImg.src = src;
        modalImg.alt = alt || '';
        modal.classList.add('bx-photo-modal--open');
        document.body.style.overflow = 'hidden';
        modalClose.focus();
    }

    function closePhotoModal() {
        modal.classList.remove('bx-photo-modal--open');
        document.body.style.overflow = '';
        setTimeout(() => { if (modalImg) modalImg.src = ''; }, 300);
    }

    document.querySelectorAll('.bx-gallery__item').forEach(item => {
        item.addEventListener('click', () => {
            const src = item.dataset.src;
            const alt = item.dataset.alt;
            if (src) openPhotoModal(src, alt);
        });
        item.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const src = item.dataset.src;
                const alt = item.dataset.alt;
                if (src) openPhotoModal(src, alt);
            }
        });
    });

    if (modalClose)    modalClose.addEventListener('click', closePhotoModal);
    if (modalBackdrop) modalBackdrop.addEventListener('click', closePhotoModal);

    const onKeyEsc = e => { if (e.key === 'Escape') closePhotoModal(); };
    document.addEventListener('keydown', onKeyEsc);

    return () => { document.removeEventListener('keydown', onKeyEsc); };
}
