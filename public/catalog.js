export const CLASSES = {
 mage: {name:'Mago',role:'Controle à distância',hp:100,speed:115,color:'#9fc7ff',description:'Combina explosões, lentidão e um raio que mira o rival mais próximo.',abilities:[
  {name:'Bola de fogo',hint:'EXPLOSÃO',cooldown:1.3,kind:'fire',damage:23},
  {name:'Lança de gelo',hint:'LENTIDÃO',cooldown:1.5,kind:'ice',damage:17},
  {name:'Relâmpago',hint:'ÁREA',cooldown:4,kind:'bolt',damage:38}]},
 knight: {name:'Cavaleiro',role:'Resistência e combate próximo',hp:130,speed:95,color:'#f3cc8d',description:'Mais vida. Aproxime-se com a investida e acerte espada e impacto no chão.',abilities:[
  {name:'Corte de aço',hint:'NÃO BLOQUEÁVEL',cooldown:2.4,kind:'slash',damage:26,range:57},
  {name:'Investida',hint:'AVANÇO + GOLPE',cooldown:2.2,kind:'charge',damage:25,range:78,duration:.32},
  {name:'Abalo sísmico',hint:'ÁREA PRÓXIMA',cooldown:4.5,kind:'quake',damage:39,range:82}]},
 rogue: {name:'Assassino',role:'Velocidade e precisão',hp:80,speed:145,color:'#8dedcc',description:'Menos vida, mais velocidade. Lance adagas, esquive e finalize pelas costas.',abilities:[
  {name:'Adaga voadora',hint:'PROJÉTIL RÁPIDO',cooldown:1.1,kind:'dagger',damage:24},
  {name:'Passo sombrio',hint:'ESQUIVA · SEM DANO',cooldown:2,kind:'dash',damage:0,range:105,duration:.26},
  {name:'Golpe furtivo',hint:'BÔNUS PELAS COSTAS',cooldown:3,kind:'backstab',damage:42,range:62}]},
 elf: {name:'Elfa',body:'female',role:'Alcance e mobilidade',hp:95,speed:130,color:'#ffe9a8',description:'Lança de longo alcance, um salto que atravessa a arena e uma flecha de luz veloz.',abilities:[
  {name:'Estocada de lança',hint:'NÃO BLOQUEÁVEL',cooldown:2.2,kind:'pierce',damage:26,range:74},
  {name:'Salto lunar',hint:'AVANÇO + GOLPE',cooldown:2.4,kind:'charge',damage:24,range:96,duration:.3},
  {name:'Flecha de luz',hint:'PROJÉTIL VELOZ',cooldown:3.2,kind:'light',damage:38}]},
 archer: {name:'Arqueiro',role:'Precisão à distância',hp:85,speed:135,color:'#c9e88f',description:'Flechas rápidas, uma rajada em leque e um tiro que atravessa quem estiver na linha.',abilities:[
  {name:'Flecha',hint:'PROJÉTIL RÁPIDO',cooldown:.9,kind:'arrow',damage:18},
  {name:'Rajada tripla',hint:'LEQUE DE 3',cooldown:3.2,kind:'volley',damage:12},
  {name:'Tiro perfurante',hint:'ATRAVESSA',cooldown:5,kind:'snipe',damage:36}]},
 druid: {name:'Druida',body:'female',role:'Controle e cura',hp:105,speed:110,color:'#f5a9c9',description:'Espinhos que atrasam, raízes que prendem o rival no lugar e uma flor que cura você e o seu time.',abilities:[
  {name:'Espinho',hint:'LENTIDÃO LEVE',cooldown:1.2,kind:'thorn',damage:17},
  {name:'Raízes',hint:'PRENDE NA ÁREA',cooldown:5,kind:'roots',damage:14},
  {name:'Florescer',hint:'CURA EM ÁREA',cooldown:9,kind:'bloom',damage:0,heal:30,range:90}]}
};
export const MODES={ffa:{name:'Todos contra todos',goal:5},teams:{name:'2 contra 2',goal:8}};
export const TEAMS=[{name:'Azul',color:'#9fc7ff'},{name:'Dourado',color:'#f3cc8d'}];
export const MAPS = {
 abbey:{name:'Abadia da Lua',description:'Arcos em ruínas, névoa e tochas sob a lua.',color:'#9fbabc'},
 volcano:{name:'Forja Vulcânica',description:'Lava, correntes e brasas na fortaleza de obsidiana.',color:'#ffaf75'},
 forest:{name:'Floresta das Runas',description:'Árvores antigas, cristais e vaga-lumes encantados.',color:'#96ebba'},
 glacier:{name:'Cidadela Glacial',description:'Torres de gelo, aurora e neve sobre a ponte.',color:'#a1ddff'}
};
export const classOf=id=>CLASSES[Object.hasOwn(CLASSES,id)?id:'mage'];
// Some classes have a single model.
export const bodyOf=(classId,bodyType)=>classOf(classId).body||(bodyType==='female'?'female':'male');

export function motionAt(burst,elapsed=burst.elapsed){const t=Math.max(0,Math.min(1,elapsed/burst.duration));const eased=t*t*(3-2*t);return burst.from+(burst.to-burst.from)*eased;}
