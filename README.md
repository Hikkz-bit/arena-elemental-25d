# Arena Elemental — Fronteira 3D

Protótipo independente em primeira pessoa ou sobre o ombro, com personagens 3D esculpidos, animação por esqueleto e cenários 3D. Usa as mesmas três classes, quatro arenas e regras de parry do jogo original. O jogo original não é alterado.

## Jogar

`npm ci` e `npm start`. Abra `http://localhost:4182/`. Clique em **Treinar com alvos** para jogar sozinho ou crie uma sala PvP e envie o convite a até dois amigos. O criador inicia quando houver pelo menos dois jogadores.

WASD: mover. Mouse: mirar. Clique ou 1: ataque. 2 e 3: habilidades. Espaço: pular. Ctrl: parry, com recarga zerada ao bloquear. Shift: passo de esquiva na direção em que você anda (para a frente se estiver parado), com um instante de invulnerabilidade e 1 s de recarga, para todas as classes. V: alternar câmera sobre o ombro (padrão) e primeira pessoa. Esc: soltar o mouse. Se a captura do mouse não estiver disponível, arraste sobre a arena; as setas esquerda/direita também giram a câmera. Há controles de toque para celular.

## Personagens e assets

Escolha Masculino ou Feminino antes da partida; as duas aparências têm os mesmos atributos. Os seis personagens são malhas esculpidas (cerca de 29 mil triângulos), com textura, esqueleto de 24 ossos e pele. São originais: as referências enviadas serviram só de direção para cabelo, paleta e silhueta.

| Classe | Feminino | Masculino |
|---|---|---|
| Cavaleiro | Guardiã da Aurora: loira, prata e azul, ombreiras de penas | Lâmina Carmesim: cabelo laranja, gibão negro e carmesim |
| Mago | Feiticeira de Ametista: cabelo preto com mecha branca, violeta | Arquimago do Véu: sobretudo branco de gola alta, runas azuis |
| Assassino | Víbora de Prata: cabelo prateado, couro negro e jade | Sombra de Jade: cabelo preto-azulado, colete, faixas e lenço |

Cada GLB em `public/assets/glb/` traz 12 animações: Idle, Run, Jump, Slash, Thrust, Slam, CastPush, CastFling, CastSky, Roll, Parry e Death. No jogo o esqueleto é dividido em duas camadas (pernas e tronco), então o personagem corre enquanto ataca ou defende; as pernas viram para o lado em que ele anda e correm de costas no recuo; o tronco acompanha a mira vertical. As trocas de animação são suavizadas. O acabamento é de anime: luz em três faixas, brilho de contorno e traço escuro em volta do modelo. Espada, escudo, cajado e adagas continuam procedurais (`models.js`) e são presos aos ossos das mãos.

Arquivos: `public/assets/rig.js` carrega os modelos e anima; `anim-state.js` decide qual animação toca a partir do estado do jogador (testado em Node); `toon.js` tem o sombreado e o contorno; `magic.js` contém círculos rúnicos, plasma, trilhas e relâmpagos. A galeria `/assets.html` gira o personagem, toca cada animação (inclusive em câmera lenta) e baixa o GLB. Ela aceita parâmetros no link, por exemplo `/assets.html?classe=knight&corpo=female&anim=attack2&velocidade=0.25&girar=0`.

Como os modelos foram feitos: conceito em imagem (pose A, punhos fechados) → malha texturizada (Tripo H3.1) → malha girada para olhar para +Z → esqueleto e clipes da biblioteca de combate (Meshy). `npm run prepare:assets` lê os arquivos brutos em `.local/rig/` (fora do Git), leva cada clipe para os seis esqueletos por diferença de rotação em relação à pose de repouso, reduz a textura para 1024 px e grava os GLBs e o `manifest.json`. `npm run test:assets` confere as regras de animação e os seis arquivos (ossos, pele, clipes, corrida sem deslocamento).

Quarta classe: **Elfa** (lanceira; estocada de alcance longo, salto lunar e flecha de luz), com um único modelo.

Imagem e sensação de jogo: `public/fx/post.js` desenha a cena em HDR com bloom, vinheta e um leve desvio de cor nos impactos (botão **Efeitos** no topo; desliga sozinho se a máquina não segurar 30 quadros por segundo). `public/fx/audio.js` sintetiza todos os sons no navegador (golpes, magias, passos e um ambiente por arena), sem arquivos de áudio. Golpes têm rastro luminoso na arma, tremor de câmera, uma pausa curta no acerto, números de dano e barra de vida sobre os rivais. **Q** (ou Tab, ou o botão do meio do mouse) trava a mira no rival mais próximo, como num duelo.

## Combate de duelo

Duelo com guarda direcional e postura, com regras próprias (em `worker/engine.mjs`, constantes em `COMBAT`):

- **Guarda** em três direções (esquerda, cima, direita). Com a mira travada (**Q**), mover o mouse escolhe a direção; sem trava, use as setas ← ↑ →. O anel na base da tela mostra a sua guarda; o anel em volta do rival mostra a dele, já espelhado.
- **Golpe leve** (clique, ou F) e **golpe pesado** (botão direito, ou G) saem do lado da guarda. Não custam nada e emendam um no outro: apertar de novo durante a recuperação já solta o próximo.
- **Bloqueio** é automático quando a sua guarda está no lado de onde o golpe vem (o lado acende em vermelho no anel do rival). Bloquear enche a sua **postura**.
- **Deflexão**: levar a guarda para o lado certo no último instante (ou apertar Ctrl) desvia o golpe com faíscas, não custa nada a você e enche a postura de quem atacou.
- **Postura** é a barra laranja. Quando enche, a guarda desaba e o lutador fica aberto; o próximo golpe que entrar é um **golpe fatal**, com dano triplo. Ela esvazia sozinha depois de um segundo sem pressão.
- **Quebra de guarda** (E) castiga quem só defende, mas ricocheteia em quem já está atacando. **Shift** é um passo rápido de esquiva (2,8 m, 1 s de recarga) que também cancela a recuperação de um golpe.
- As habilidades 1, 2 e 3 de cada classe continuam, como especiais com recarga, e não são bloqueadas pela guarda (só por parry ou esquiva).
- No treino, o **Rival** se aproxima, ataca em sequências curtas e às vezes lê o seu golpe; o **Alvo** só defende.

Cenários: `public/world.js` monta as quatro arenas em código — céu em shader (estrelas, lua, nuvens, aurora, brasas), piso pintado com círculo rúnico luminoso, fundo próprio (catedral em ruínas, vulcão com rios de lava, floresta com lanternas, cidadela de gelo), partículas e névoa. As peças paradas são fundidas em uma malha por material para manter poucas chamadas de desenho.

O Assassino arremessa com a mão vazia (as adagas ficam embainhadas nas coxas e uma só é sacada na estocada); a adaga voa girando.

Mago: fogo 28, gelo 20 e raio 46. Cavaleiro: espada, investida e abalo. Assassino: adaga, esquiva e golpe pelas costas. Primeiro a cinco eliminações, limite de três minutos. O treino usa alvos imóveis que renascem.

## Servidor

No ar em https://arena-elemental-25d.onrender.com (Render, plano gratuito: dorme sem uso e leva cerca de um minuto para acordar; a publicação é manual, pelo botão Manual Deploy do painel). `node scripts/test-online.mjs https://arena-elemental-25d.onrender.com` abre uma sala com dois clientes de verdade e confere início, movimento e dash.

Publicar no Render (plano gratuito, usa o `render.yaml` deste repositório): [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Hikkz-bit/arena-elemental-25d). O jogo e o servidor de salas sobem no mesmo endereço; basta enviar o link da sala aos amigos.

Node + WebSocket. Simulação autoritativa a 60 passos/s, atualizações a 20/s, controles a 30/s. Salas temporárias em memória; reiniciar o servidor encerra partidas. Plano Render Free, build `npm ci --omit=dev`, início `npm start`, porta automática `PORT`, saúde `/health`.

`npm test` verifica as habilidades, o dash e as colisões. `scripts/test-browser.mjs` usa o Playwright do estúdio local para conferir os três clientes e o modo treino.

Three.js r160 e PixelFX são incluídos com suas licenças MIT em `public/vendor/`. Nenhuma dependência externa é carregada pelo navegador durante a partida.
