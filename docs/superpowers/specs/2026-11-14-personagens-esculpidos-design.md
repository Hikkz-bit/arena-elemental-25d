# Personagens esculpidos e animação por esqueleto — design e plano

Aprovado pelo dono do projeto em 2026-11-14 ("Sim, pode ir"). Execução nativa, nesta sessão.

## Por quê
Os seis personagens de `public/assets/models.js` são peças geométricas (esferas, cilindros, chapas) com 13 juntas giradas por senos, sem pele e sem transição entre movimentos. O pedido é ter personagens 3D melhores e animações melhores, nas três classes, em versão masculina e feminina, seguindo as referências enviadas.

## Metas
- Seis modelos esculpidos, texturizados, com esqueleto e pele (GLB).
- Animações por esqueleto com transição suave: parado, corrida, pulo, três habilidades por classe, parry, levar golpe, morrer.
- Acabamento de anime: sombreado em degraus e contorno.
- Jogo, galeria (`assets.html`) e PvP continuam funcionando; regras e servidor não mudam.

## Não-metas
- Mudar regras, dano, mapas, rede ou HUD.
- Refazer a arma em primeira pessoa (continua a atual).

## Anti-metas
- Copiar personagem existente. As referências são de personagens de terceiros; servem só de direção (cabelo, paleta, silhueta). Os seis são originais.
- Carregar qualquer coisa de fora durante a partida (tudo fica em `public/`).

## Abordagens
1. **Modelos gerados (escolhida):** conceito em imagem → malha texturizada (Tripo H3.1) → esqueleto e clipes (Meshy, biblioteca de combate). Custo estimado ~175–200 créditos Higgsfield. Dá o maior salto visual.
2. **Tudo em código:** custo zero, mas continuam peças geométricas. Rejeitada pelo dono.
3. **Meshy 7 direto da imagem com esqueleto:** 44 créditos por personagem (264 no total), sem folga para refazer. Fica como reserva se o Tripo falhar, e só com novo ok por causa do custo.

## Personagens
| Classe | Feminino | Masculino |
|---|---|---|
| Cavaleiro | loira, armadura prata e azul, ombreiras de penas | cabelo laranja espetado, gibão preto e carmesim |
| Mago | cabelo preto com mecha branca, roxo, cristais | cabelo castanho, sobretudo branco de gola alta |
| Assassino | cabelo prateado, batom escuro, gargantilha, couro preto | cabelo preto-azulado espetado, colete, faixas |

## Arquitetura
- `public/assets/glb/<classe>-<corpo>.glb`: malha + esqueleto + textura (≤ ~3 MB cada, textura 1024 WebP).
- Os 12 clipes ficam dentro de cada GLB, já adaptados ao esqueleto daquele personagem (decisão tomada na execução: arquivo padrão, sem código de adaptação no navegador).
- `public/vendor/GLTFLoader.js`, `SkeletonUtils.js`, `BufferGeometryUtils.js`: three r160, import apontando para `./three.js`.
- `public/assets/rig.js` (novo): `preloadCharacters()`, `createCharacter(classId, bodyType)`, `animateCharacter(a, p, time, dt)`, `disposeModel`. Mesma assinatura que o jogo já usa; por dentro, `AnimationMixer` com máquina de estados e `crossFadeTo`.
- `public/assets/toon.js` (novo): troca materiais por `MeshToonMaterial` com rampa de 3 tons e cria o contorno (casca invertida).
- `public/assets/models.js`: mantém `createWeapon` e `createViewWeapon`; armas são presas aos ossos das mãos.
- `public/game.js`, `public/assets/showroom.js`, `assets.html`: passam a importar de `rig.js`; morte toca o clipe em vez de sumir.

## Estados de animação (entrada = estado do jogador que o servidor já envia)
| Condição | Clipe |
|---|---|
| `hp<=0` | Death (uma vez, segura o fim) |
| `burst` (investida/passo sombrio) | Charge (cavaleiro) / Dodge (assassino) |
| `cast>0` | habilidade `element` 0–2 da classe |
| `parry>0` ou `parryFlash>0` | Parry |
| `y>0.1` | Jump |
| `moving` | Run |
| senão | Idle |
Levar golpe é aditivo e procedural (coluna e cabeça), para funcionar em qualquer estado.

## Plano
1. Conceitos: 6 imagens em pose A, corpo inteiro, mãos vazias, fundo liso. Conferir uma a uma.
2. Malhas: Tripo H3.1 com `face_limit` 30000 e textura. Primeiro uma só, como teste; se falhar, parar e avisar (abordagem 3).
3. Esqueleto: `meshy_rigging` em cada malha; no primeiro personagem, um job por clipe.
4. Preparo: script `scripts/prepare-assets.mjs` reduz textura, separa clipes e grava `manifest.json`.
5. Código: vendor do loader, `rig.js`, `toon.js`, armas nos ossos, jogo e galeria.
6. Testes: `scripts/test-assets.mjs` passa a conferir pele, ossos e clipes dos GLBs; `npm test` continua passando; conferência visual no navegador (galeria e treino, as seis variações).
7. README e commit.

## Riscos
- Clipes de um esqueleto aplicados em outro: só rotações são transferidas (posição só do quadril, escalada pela altura). Conferir visualmente em cada um.
- Cabelo e casaco longos podem deformar mal; por isso os conceitos usam cabelo até o ombro e casacos abertos.

## Como ficou (2026-11-14)
- Custo real: cerca de 220 créditos (7 malhas Tripo a 12, 13 jobs de esqueleto com clipe a 8, 5 esqueletos a 5, imagens a 0,25). Uma malha de teste e um esqueleto foram descartados: o Tripo entrega o modelo olhando para +X e o esqueleto da Meshy só sai certo com o modelo olhando para +Z.
- Pedido extra durante a execução: dash universal no Shift (motor, servidor, HUD, animação Roll).
- Também entrou: câmera sobre o ombro mais alta e afastada, câmera em terceira pessoa ao morrer, personagem escolhido em destaque no menu, câmera lenta na galeria.
