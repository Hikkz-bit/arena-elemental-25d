# Arena Elemental — Fronteira 3D

Protótipo independente em primeira pessoa ou sobre o ombro, com personagens 3D esculpidos, animação por esqueleto e cenários 3D. Seis classes, quatro arenas, duelo de postura e dois modos (todos contra todos e 2 contra 2). O jogo original não é alterado.

## Jogar

`npm ci` e `npm start`. Abra `http://localhost:4182/`. Clique em **Treinar com alvos** para jogar sozinho ou crie uma sala PvP e envie o convite a até três amigos (a sala comporta quatro jogadores). O criador escolhe o cenário e o modo — **Todos contra todos** (primeiro a 5 eliminações) ou **2 contra 2** (primeiro time a 8; sem dano entre aliados; os times são azul e dourado e cada jogador pode pedir para trocar) — e inicia quando houver pelo menos dois jogadores.

WASD: mover. Mouse: mirar. Clique ou 1: ataque. 2 e 3: habilidades. Espaço: pular. Botão direito do mouse ou Ctrl: parry (segure para bloquear, aperte na hora do golpe para defletir). Shift: passo de esquiva na direção em que você anda (para a frente se estiver parado), com um instante de invulnerabilidade e 1 s de recarga, para todas as classes. V: alternar câmera sobre o ombro (padrão) e primeira pessoa. Esc: soltar o mouse. Se a captura do mouse não estiver disponível, arraste sobre a arena; as setas esquerda/direita também giram a câmera. Há controles de toque para celular.

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

Quinta e sexta classes: **Arqueiro** (masculino e feminino; flecha rápida, rajada tripla em leque e tiro que atravessa quem estiver na linha; arco na mão esquerda, aljava nas costas e uma faca para o corpo a corpo) e **Druida** (um modelo; espinho que atrasa, raízes que prendem o rival na área e uma flor que cura a druida e os aliados próximos). O clipe de tiro com arco (`Bow`) foi comprado no esqueleto do arqueiro e levado aos outros como os demais.

Imagem e sensação de jogo: `public/fx/post.js` desenha a cena em HDR com bloom, vinheta e um leve desvio de cor nos impactos (botão **Efeitos** no topo; desliga sozinho se a máquina não segurar 30 quadros por segundo). `public/fx/audio.js` sintetiza todos os sons no navegador (golpes, magias, passos e um ambiente por arena), sem arquivos de áudio. Golpes têm rastro luminoso na arma, tremor de câmera, uma pausa curta no acerto, números de dano e barra de vida sobre os rivais. **Q** (ou Tab, ou o botão do meio do mouse) trava a mira no rival mais próximo, como num duelo.

## Combate de duelo

Duelo de postura, com regras próprias (em `worker/engine.mjs`, constantes em `COMBAT`):

- **Golpe leve** (clique, ou F) e **golpe pesado** (G) não custam nada e emendam um no outro: apertar de novo durante a recuperação já solta o próximo. A direção da guarda (mouse com a mira travada em **Q**, ou setas ← ↑ →) só escolhe de que lado o golpe sai.
- **Parry** (botão direito ou Ctrl) está sempre disponível, sem recarga, e funciona assim:
  - **segurar** bloqueia os golpes que vêm de frente: você não perde vida, mas a sua **postura** enche;
  - **apertar na hora** em que o golpe chega (janela de 0,2 s) é uma **deflexão**: a sua postura **diminui**, a do rival **aumenta** e ele fica aberto por um instante. Vale também contra habilidades;
  - **apertar e não defletir nada** é um erro e enche a sua própria postura. Errar várias vezes seguidas quebra a sua postura sozinho.
- **Postura** é a barra laranja. Quando enche, a guarda desaba e o lutador fica aberto; o próximo golpe que entrar é um **golpe fatal**, com dano triplo. Ela esvazia sozinha depois de um segundo sem pressão.
- **Quebra de guarda** (E) castiga quem só defende, mas ricocheteia em quem já está atacando. **Shift** é um passo rápido de esquiva (2,8 m, 1 s de recarga) que também cancela a recuperação de um golpe.
- As habilidades 1, 2 e 3 de cada classe são especiais com recarga e não são paradas pelo bloqueio segurado, só pela deflexão ou pela esquiva.
- No treino, o **Rival** se aproxima, ataca em sequências curtas e às vezes bloqueia ou deflete o seu golpe; o **Alvo** só defende.

Cenários: `public/world.js` monta as quatro arenas em código — céu em shader (estrelas, lua, nuvens, aurora, brasas), piso pintado com círculo rúnico luminoso, fundo próprio (catedral em ruínas, vulcão com rios de lava, floresta com lanternas, cidadela de gelo), partículas e névoa. As peças paradas são fundidas em uma malha por material para manter poucas chamadas de desenho.

O Assassino arremessa com a mão vazia (as adagas ficam embainhadas nas coxas e uma só é sacada na estocada); a adaga voa girando.

Mago: fogo 23, gelo 17 e raio 38. Cavaleiro: espada 26, investida 25 e abalo 39 (os dois foram enfraquecidos em cerca de 20%). Assassino: adaga, esquiva e golpe pelas costas. Limite de três minutos por partida. A área de jogo tem 30 × 25 m (era 23 × 19 m); o cenário inteiro é esticado junto em `public/world.js`.

## Servidor

No ar em https://arena-elemental-25d.onrender.com (Render, plano gratuito: dorme sem uso e leva cerca de um minuto para acordar; a publicação é manual, pelo botão Manual Deploy do painel). `node scripts/test-online.mjs https://arena-elemental-25d.onrender.com` abre uma sala com clientes de verdade e confere a lotação (quatro entram, o quinto é recusado), o modo 2v2, a troca de time, início, movimento e dash.

Publicar no Render (plano gratuito, usa o `render.yaml` deste repositório): [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Hikkz-bit/arena-elemental-25d). O jogo e o servidor de salas sobem no mesmo endereço; basta enviar o link da sala aos amigos.

Node + WebSocket. Simulação autoritativa a 60 passos/s, atualizações a 20/s, controles a 30/s. Salas temporárias em memória; reiniciar o servidor encerra partidas. Plano Render Free, build `npm ci --omit=dev`, início `npm start`, porta automática `PORT`, saúde `/health`.

`npm test` verifica as habilidades, o dash e as colisões. `scripts/test-browser.mjs` usa o Playwright do estúdio local para conferir os três clientes e o modo treino.

Three.js r160 e PixelFX são incluídos com suas licenças MIT em `public/vendor/`. Nenhuma dependência externa é carregada pelo navegador durante a partida.
