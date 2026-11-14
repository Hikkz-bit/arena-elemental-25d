# Arena Elemental — Fronteira 3D

Protótipo independente em primeira pessoa ou sobre o ombro, com personagens e cenários 3D. Usa as mesmas três classes, quatro arenas e regras de parry do jogo original. O jogo original não é alterado.

## Jogar

`npm ci` e `npm start`. Abra `http://localhost:4182/`. Clique em **Treinar com alvos** para jogar sozinho ou crie uma sala PvP e envie o convite a até dois amigos. O criador inicia quando houver pelo menos dois jogadores.

WASD: mover. Mouse: mirar. Clique ou 1: ataque. 2 e 3: habilidades. Espaço: pular. Ctrl: parry, com recarga zerada ao bloquear. V: alternar primeira pessoa e câmera sobre o ombro. Esc: soltar o mouse. Se a captura do mouse não estiver disponível, arraste sobre a arena; as setas esquerda/direita também giram a câmera. Há controles de toque para celular.

## Personagens e assets

Escolha Masculino ou Feminino antes da partida; as duas aparências têm os mesmos atributos. Os seis modelos são malhas 3D originais, com juntas articuladas, cabelo, peças de roupa e armas. O jogo anima as juntas continuamente, sem sprites. A galeria `/assets.html` permite girar, aproximar e testar sete animações, além de baixar cada personagem em GLB.

`public/assets/models.js` cria personagens e armas. `magic.js` contém círculos rúnicos, plasma, trilhas e relâmpagos ramificados. `clips.js` prepara as animações portáveis. Os GLBs em `public/assets/glb/` incluem seis personagens com sete animações cada e quatro armas independentes. `manifest.json` descreve os arquivos. Não são modelos esculpidos de alta resolução nem rigs de deformação de pele; são modelos estilizados com peças articuladas, adequados a este protótipo.

`npm run test:assets` verifica geometria, juntas, preservação da posição no mundo e os arquivos GLB. `npm run export:assets` regenera os GLBs usando o servidor local na porta 4182 e o Chrome/Playwright do estúdio. As referências fornecidas serviram de direção visual; nenhuma imagem de referência é distribuída no jogo.

Mago: fogo 28, gelo 20 e raio 46. Cavaleiro: espada, investida e abalo. Assassino: adaga, esquiva e golpe pelas costas. Primeiro a cinco eliminações, limite de três minutos. O treino usa alvos imóveis que renascem.

## Servidor

Node + WebSocket. Simulação autoritativa a 60 passos/s, atualizações a 20/s, controles a 30/s. Salas temporárias em memória; reiniciar o servidor encerra partidas. Plano Render Free, build `npm ci --omit=dev`, início `npm start`, porta automática `PORT`, saúde `/health`.

`npm test` verifica as habilidades e colisões. `scripts/test-browser.mjs` usa o Playwright do estúdio local para conferir os três clientes e o modo treino.

Three.js r160 e PixelFX são incluídos com suas licenças MIT em `public/vendor/`. Nenhuma dependência externa é carregada pelo navegador durante a partida.
