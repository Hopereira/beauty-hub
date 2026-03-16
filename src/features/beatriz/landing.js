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

    app.innerHTML = `
        <div class="bx-landing">

            <!-- ── NAVEGAÇÃO ── -->
            <nav class="bx-nav">
                <div class="bx-nav__brand">Ana Beatriz Xavier</div>
                <div class="bx-nav__links">
                    <a href="#servicos">Serviços</a>
                    <a href="#sobre">Sobre</a>
                    <a href="#contato">Contato</a>
                    <a href="${WHATSAPP_URL}" target="_blank" rel="noopener noreferrer"
                       class="bx-btn bx-btn--primary bx-btn--whatsapp-nav">
                        <i class="fab fa-whatsapp"></i> Agendar
                    </a>
                </div>
                <!-- Ícone WhatsApp visível apenas em mobile (nav links ocultos) -->
                <a href="${WHATSAPP_URL}" target="_blank" rel="noopener noreferrer"
                   class="bx-nav__mobile-cta" aria-label="Agendar pelo WhatsApp">
                    <i class="fab fa-whatsapp"></i>
                </a>
            </nav>

            <!-- ── HERO ── -->
            <section class="bx-hero">
                <div class="bx-hero__text">
                    <span class="bx-hero__tag">Especialista em Beleza</span>
                    <h1>Ana Beatriz<br>Xavier</h1>
                    <p class="bx-hero__sub">Beleza, cuidado e autoestima em cada detalhe.</p>
                    <p class="bx-hero__desc">
                        Entre pinças, espelhos e muita dedicação, nasceu um espaço pensado
                        para valorizar a beleza de cada mulher com leveza, cuidado e propósito.
                    </p>
                    <div class="bx-hero__cta">
                        <a href="${WHATSAPP_URL}" target="_blank" rel="noopener noreferrer"
                           class="bx-btn bx-btn--primary">
                            <i class="fab fa-whatsapp"></i> Agendar pelo WhatsApp
                        </a>
                        <a href="#sobre" class="bx-btn bx-btn--ghost">Conheça meu trabalho</a>
                    </div>
                </div>

                <div class="bx-hero__photo">
                    <img src="/src/assets/images/beatriz.jpg"
                         alt="Ana Beatriz Xavier — Especialista em Beleza"
                         class="bx-hero__photo-img"
                         onerror="this.style.display='none';this.parentElement.innerHTML+='<div class=\'bx-hero__photo-placeholder\' aria-hidden=\'true\'><i class=\'fas fa-user-circle\'></i><span>Foto da Beatriz</span></div>'">
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

            <!-- ── SOBRE ── -->
            <section id="sobre" class="bx-about">
                <div class="bx-about__photo-wrapper">
                    <img src="/src/assets/images/trabalho2.png"
                         alt="Espaço de atendimento de Ana Beatriz Xavier"
                         class="bx-about__photo-img"
                         onerror="this.style.display='none';this.parentElement.innerHTML+='<div class=\'bx-about__photo-placeholder\' aria-hidden=\'true\'><i class=\'fas fa-images\'></i><span>Foto do espaço</span></div>'">
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
            </section>

            <!-- ── GALERIA ── -->
            <section class="bx-gallery">
                <span class="bx-section-tag">Portfólio</span>
                <h2>Meus Trabalhos</h2>
                <p class="bx-gallery__subtitle">Cada atendimento é único — veja um pouco do que já realizei</p>
                <div class="bx-gallery__grid">
                    <div class="bx-gallery__item">
                        <img src="/src/assets/images/beatriz.jpg"
                             alt="Ana Beatriz Xavier" loading="lazy"
                             onerror="this.parentElement.style.display='none'">
                    </div>
                    <div class="bx-gallery__item">
                        <img src="/src/assets/images/beatriz 3.jpg"
                             alt="Trabalho de Ana Beatriz" loading="lazy"
                             onerror="this.parentElement.style.display='none'">
                    </div>
                    <div class="bx-gallery__item">
                        <img src="/src/assets/images/trabalho 1.png"
                             alt="Trabalho de Ana Beatriz" loading="lazy"
                             onerror="this.parentElement.style.display='none'">
                    </div>
                    <div class="bx-gallery__item">
                        <img src="/src/assets/images/trabalho2.png"
                             alt="Trabalho de Ana Beatriz" loading="lazy"
                             onerror="this.parentElement.style.display='none'">
                    </div>
                    <div class="bx-gallery__item">
                        <img src="/src/assets/images/trabalho3 .png"
                             alt="Trabalho de Ana Beatriz" loading="lazy"
                             onerror="this.parentElement.style.display='none'">
                    </div>
                </div>
                <a href="${INSTAGRAM_URL}" target="_blank" rel="noopener noreferrer"
                   class="bx-btn bx-btn--secondary">
                    <i class="fab fa-instagram"></i> Ver mais no Instagram
                </a>
            </section>

            <!-- ── CONTATO / REDES SOCIAIS ── -->
            <section id="contato" class="bx-contact">
                <h2>Me encontre aqui</h2>
                <p class="bx-contact__sub">
                    Agende, me siga ou entre em contato pelos canais abaixo
                </p>
                <div class="bx-social-links">
                    <a href="${WHATSAPP_URL}" target="_blank" rel="noopener noreferrer"
                       class="bx-social-link">
                        <i class="fab fa-whatsapp"></i>
                        <div>
                            <strong>WhatsApp</strong>
                            <span>Agende sua visita</span>
                        </div>
                    </a>
                    <a href="${INSTAGRAM_URL}" target="_blank" rel="noopener noreferrer"
                       class="bx-social-link">
                        <i class="fab fa-instagram"></i>
                        <div>
                            <strong>Instagram</strong>
                            <span>@ana_trizz32iu</span>
                        </div>
                    </a>
                    <a href="${FACEBOOK_URL}" target="_blank" rel="noopener noreferrer"
                       class="bx-social-link">
                        <i class="fab fa-facebook"></i>
                        <div>
                            <strong>Facebook</strong>
                            <span>beatriz.depiladora</span>
                        </div>
                    </a>
                </div>
            </section>

            <!-- ── FOOTER ── -->
            <footer class="bx-footer">
                <p>© ${new Date().getFullYear()} Ana Beatriz Xavier · Todos os direitos reservados</p>
            </footer>

        </div>
    `;
}

// ─── Init ──────────────────────────────────────────────────────────────────

export function init() {
    // Smooth scroll para links de âncora internos
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

    return null;
}
