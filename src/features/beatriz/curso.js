/**
 * Página: Curso — Ana Beatriz Xavier
 * biaxavier.com.br/curso
 *
 * Página em construção — lançamento em breve.
 */

import './curso.css';

const WHATSAPP_NUMBER = '5524988243174';
const WHATSAPP_URL    = `https://wa.me/${WHATSAPP_NUMBER}?text=Ol%C3%A1%2C%20quero%20saber%20mais%20sobre%20o%20curso!`;

export function render() {
    const app = document.getElementById('app');
    if (!app) return;

    document.title = 'Curso — Ana Beatriz Xavier';

    app.innerHTML = `
        <div class="cx-page">

            <!-- ── NAV ── -->
            <nav class="cx-nav">
                <a href="/" class="cx-nav__brand">
                    <img src="/assets/logos/logo.png" alt="Beatriz Xavier" class="cx-nav__logo">
                </a>
                <a href="/" class="cx-nav__back">
                    <i class="fas fa-arrow-left"></i> Voltar ao início
                </a>
            </nav>

            <!-- ── HERO EM BREVE ── -->
            <main class="cx-hero">
                <div class="cx-hero__content">

                    <span class="cx-badge">
                        <i class="fas fa-tools"></i> Página em construção
                    </span>

                    <h1 class="cx-hero__title">
                        Curso de<br>
                        <span class="cx-hero__title--accent">Extensão de Cílios</span>
                    </h1>

                    <p class="cx-hero__desc">
                        Em breve vou compartilhar tudo que aprendi em anos de experiência
                        na arte das extensões de cílios. Desde a técnica até os segredos
                        para fidelizar clientes.
                    </p>

                    <div class="cx-features">
                        <div class="cx-feature">
                            <i class="fas fa-graduation-cap"></i>
                            <span>Técnica profissional</span>
                        </div>
                        <div class="cx-feature">
                            <i class="fas fa-video"></i>
                            <span>Aulas em vídeo</span>
                        </div>
                        <div class="cx-feature">
                            <i class="fas fa-certificate"></i>
                            <span>Certificado</span>
                        </div>
                        <div class="cx-feature">
                            <i class="fas fa-comments"></i>
                            <span>Suporte direto</span>
                        </div>
                    </div>

                    <div class="cx-cta-group">
                        <a href="${WHATSAPP_URL}" target="_blank" rel="noopener noreferrer"
                           class="cx-btn cx-btn--primary">
                            <i class="fab fa-whatsapp"></i>
                            Avise-me quando lançar
                        </a>
                        <a href="/" class="cx-btn cx-btn--ghost">
                            <i class="fas fa-home"></i>
                            Voltar ao site
                        </a>
                    </div>

                </div>

                <div class="cx-hero__visual">
                    <div class="cx-construction">
                        <div class="cx-construction__icon">
                            <i class="fas fa-graduation-cap"></i>
                        </div>
                        <div class="cx-construction__rings">
                            <div class="cx-ring cx-ring--1"></div>
                            <div class="cx-ring cx-ring--2"></div>
                            <div class="cx-ring cx-ring--3"></div>
                        </div>
                    </div>
                    <p class="cx-soon-label">Em breve</p>
                </div>
            </main>

            <footer class="cx-footer">
                <p>© ${new Date().getFullYear()} Ana Beatriz Xavier · Todos os direitos reservados</p>
            </footer>

        </div>
    `;
}

export function init() {
    return null;
}
