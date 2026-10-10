// Fonte oficial da rotina. IDs estáveis preservam comparações no histórico.
const ex = (id, name, sets, target, rest, cue, extra = {}) => ({ id, name, sets, target, rest, cue, ...extra });
export const VERSION = '2026-10-v2';
export const DEFAULTS = { theme:'default', start: '05:10', deadline: '06:30', vibration: true, vibrationMode:'long', wakeLock: true, transition: 45, circuitRest: 10, roundRest: 60, rests: {} };
export const WORKOUTS = {
  superiorA: { name: 'Superior A', mode: 'straight_sets', exercises: [
    ex('push', 'Flexão com mochila', 3, '6–12', 90, 'Mantenha o tronco alinhado. Prenda bem a mochila como carga.', { image: 'push-up', imageNote: 'Movimento base sem carga; use a mochila bem presa.' }),
    ex('row-one', 'Remada unilateral com mochila', 4, '8–15 por lado', 90, 'Apoie o tronco, puxe a mochila em direção ao quadril sem girar.', { unilateral: true }),
    ex('pike', 'Pike Push-Up', 2, '6–12', 90, 'Quadril alto; flexione os cotovelos e aproxime a cabeça do chão.', { image: 'pike-push-up' }),
    ex('close-push', 'Flexão fechada', 2, '8–15', 75, 'Mãos próximas, cotovelos junto ao corpo e tronco firme.'),
    ex('curl', 'Rosca bíceps com mochila', 2, '10–15', 60, 'Cotovelos fixos; eleve a mochila sem embalar o tronco.') ] },
  inferiorA: { name: 'Inferior A', mode: 'straight_sets', exercises: [
    ex('bulgarian', 'Agachamento búlgaro com mochila', 3, '8–12 por perna', 90, 'Pé de trás em apoio estável. Desça com controle, mantendo o joelho alinhado.', { unilateral: true }),
    ex('rdl-one', 'RDL unilateral com mochila', 3, '8–12 por perna', 90, 'Leve o quadril para trás, coluna neutra e joelho de apoio levemente flexionado.', { unilateral: true }),
    ex('lateral-lunge', 'Passada lateral com mochila', 3, '8–12 por perna', 90, 'Dê um passo lateral; leve o quadril para trás sobre a perna flexionada.', { unilateral: true }),
    ex('calf-one', 'Panturrilha unilateral com peso', 3, '12–20', 60, 'Suba o calcanhar com controle. Use um apoio para equilíbrio.', { unilateral: true }),
    ex('tibialis', 'Tibialis Raise', 2, '15–25', 45, 'Com os calcanhares apoiados e costas na parede, eleve a ponta dos pés.') ] },
  superiorB: { name: 'Superior B', mode: 'straight_sets', exercises: [
    ex('decline', 'Flexão declinada', 3, '8–15', 90, 'Pés elevados em apoio firme; mantenha o tronco alinhado.', { image: 'decline-push-up' }),
    ex('bent-row', 'Remada curvada com mochila', 4, '10–20', 90, 'Incline o tronco pelo quadril, coluna neutra; puxe a mochila ao abdômen.'),
    ex('archer', 'Flexão arqueiro', 2, '12–20', 90, 'Desloque o peito para um lado enquanto estende o outro braço.', { sideNote: true }),
    ex('high-row', 'Remada alta com mochila', 2, '10–15', 75, 'Eleve a mochila junto ao corpo, sem forçar amplitude desconfortável.'),
    ex('hammer', 'Rosca martelo com mochila', 2, '10–15', 60, 'Pegada neutra, cotovelos estáveis; suba sem impulso.') ] },
  inferiorB: { name: 'Inferior B', mode: 'straight_sets', exercises: [
    ex('squat', 'Agachamento com mochila', 3, '12–20', 90, 'Segure a mochila junto ao corpo, desça com controle e joelhos alinhados.', { image: 'bodyweight-squat', imageNote: 'Movimento base sem carga; adicione a mochila junto ao corpo.' }),
    ex('thrust-one', 'Hip Thrust unilateral com mochila', 3, '10–15 por perna', 90, 'Apoie as costas em superfície firme; estenda o quadril sem arquear a lombar.', { unilateral: true }),
    ex('reverse-lunge', 'Avanço reverso com mochila', 2, '8–12 por perna', 90, 'Dê um passo para trás e flexione as pernas mantendo equilíbrio.', { unilateral: true }),
    ex('leg-curl', 'Leg Curl deslizante', 3, '8–15', 75, 'Deitado, mantenha o quadril elevado e deslize os calcanhares com controle.'),
    ex('calf', 'Panturrilha com peso', 2, '15–25', 60, 'Eleve e abaixe os calcanhares sem saltar, segurando a carga.') ] },
  coreA: { name: 'Core A', mode: 'circuit', rounds: 3, exercises: [
    ex('shoulder-tap', 'Prancha com toque no ombro', 3, '20–30 totais', 10, 'Alterne os toques mantendo o quadril estável.', { image: 'plank-shoulder-tap' }),
    ex('reverse-crunch', 'Abdominal infra', 3, '12–20', 10, 'Eleve o quadril com controle, sem impulso das pernas.'),
    ex('bicycle', 'Abdominal bicicleta controlado', 3, '20–30 totais', 10, 'Alterne cotovelo e joelho opostos devagar, sem puxar o pescoço.', { image: 'bicycle-crunch' }),
    ex('boxing', 'Boxe sombra sem saltitar', 3, '60 segundos', 10, 'Alterne golpes controlados, pés no chão, sem saltitar.', { seconds: 60 }) ] },
  coreB: { name: 'Core B', mode: 'circuit', rounds: 3, exercises: [
    ex('walkout', 'Walkout', 3, '8–12', 10, 'Caminhe com as mãos até a prancha e volte com controle.'),
    ex('jackknife', 'Abdominal canivete alternado', 3, '10–16 totais', 10, 'Aproxime mão e pé opostos alternadamente, sem impulso.'),
    ex('side-rotation', 'Prancha lateral com rotação', 3, '8–10 por lado', 10, 'Sustente o quadril; gire o tronco com controle. Faça os dois lados.', { unilateral: true }),
    ex('dead-bug', 'Dead Bug lento com carga', 3, '10–12', 10, 'Lombar apoiada; estenda braço e perna opostos lentamente. Carga leve ou zero.', { image:'dead-bug', imageNote:'Movimento base sem carga. Use carga leve ou zero, com execução lenta.' }) ] }
};
export const WEEK = [
  { day: 'Domingo', workout: null, cardio: 'Corrida', minutes: 60 },
  { day: 'Segunda-feira', workout: 'superiorA', cardio: 'Pedal', minutes: 25 },
  { day: 'Terça-feira', workout: 'inferiorA', cardio: 'Corrida', minutes: 30 },
  { day: 'Quarta-feira', workout: 'coreA', cardio: 'Pedal', minutes: 45 },
  { day: 'Quinta-feira', workout: 'superiorB', cardio: 'Pedal', minutes: 25 },
  { day: 'Sexta-feira', workout: 'inferiorB', cardio: 'Corrida', minutes: 30 },
  { day: 'Sábado', workout: 'coreB', cardio: 'Pedal', minutes: 45 }
];
