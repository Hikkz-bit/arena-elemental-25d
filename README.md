# Arena Elemental — Fronteira 2.5D

Protótipo independente em primeira pessoa. Cenários em 3D e rivais em sprites, usando as mesmas três classes, quatro arenas e regras de parry do jogo original. O jogo original não é alterado.

## Jogar

`npm ci` e `npm start`. Abra `http://localhost:4182/`. Clique em **Treinar com alvos** para jogar sozinho ou crie uma sala PvP e envie o convite a até dois amigos. O criador inicia quando houver pelo menos dois jogadores.

WASD: mover. Mouse: mirar. Clique ou 1: ataque. 2 e 3: habilidades. Espaço: pular. Ctrl: parry, com recarga zerada ao bloquear. Esc: soltar o mouse. Se a captura do mouse não estiver disponível, arraste sobre a arena; as setas esquerda/direita também giram a câmera. Há controles de toque para celular.

Mago: fogo 28, gelo 20 e raio 46. Cavaleiro: espada, investida e abalo. Assassino: adaga, esquiva e golpe pelas costas. Primeiro a cinco eliminações, limite de três minutos. O treino usa alvos imóveis que renascem.

## Servidor

Node + WebSocket. Simulação autoritativa a 60 passos/s, atualizações a 20/s, controles a 30/s. Salas temporárias em memória; reiniciar o servidor encerra partidas. Plano Render Free, build `npm ci --omit=dev`, início `npm start`, porta automática `PORT`, saúde `/health`.

`npm test` verifica as habilidades e colisões. `scripts/test-browser.mjs` usa o Playwright do estúdio local para conferir os três clientes e o modo treino.

Three.js r160 e PixelFX são incluídos com suas licenças MIT em `public/vendor/`. Nenhuma dependência externa é carregada pelo navegador durante a partida.
