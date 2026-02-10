/**
 * Landing Page Module
 */

export function render() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="landing-page" style="
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            height: 100vh; text-align: center;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        ">
            <div class="hero" style="
                background: white; padding: 3rem; border-radius: 20px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.08); max-width: 600px;
            ">
                <h2 style="font-size: 2rem; font-weight: 700; color: #20B2AA; margin-bottom: 1rem;">
                    BEAUTY HUB
                </h2>
                <h1 style="font-size: 2.5rem; color: #20B2AA; margin-bottom: 1rem;">Bem-vindo ao Beauty Hub</h1>
                <p style="color: #666; margin-bottom: 2rem;">A solução definitiva para a gestão do seu salão de beleza e estética.</p>
                <a href="/login" class="cta-button" style="
                    display: inline-block; padding: 1rem 2rem;
                    background-color: #20B2AA; color: white; border-radius: 50px;
                    font-weight: 700; text-transform: uppercase; letter-spacing: 1px;
                    transition: 0.3s; text-decoration: none;
                ">Ir para o Sistema</a>
            </div>
        </div>
    `;
}

export function init() {
    return null;
}
