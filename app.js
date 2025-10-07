const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start');
const zoro = document.getElementById('zoro');
const shanks = document.getElementById('shanks');
const zoroHealthEl = document.getElementById('zoro-health');
const shanksHealthEl = document.getElementById('shanks-health');
const timerEl = document.getElementById('timer');
const resultBox = document.getElementById('result');
const winnerText = document.getElementById('winner');
const restartBtn = document.getElementById('restart');


let zoroLeft = 50;
let shanksLeft = 50;
let zoroHealth = 100;
let shanksHealth = 100;
let gameOver = false;
let timer = 45;


startBtn.addEventListener('click', () => {
  startScreen.style.display = 'none';
});


const music = document.querySelector('#bg-music');
const ba = new Audio('assets /overtaken.mp3');
document.getElementById("start").addEventListener("click", function (event) {
  ba.volume = 0.4;
  ba.play();
});

let zoroX = 200;
let zoroY = 0;
let shanksX = 200;
let shanksY = 0;
let keys = {}

document.addEventListener("keydown", function (e) {
  keys[e.key] = true;
});


document.addEventListener("keyup", function (e) {
  keys[e.key] = false;
});


function updatePositions() {

  if (keys["a"]) {
    zoroX -= 5;
  }
  if (keys["d"]) {
    zoroX += 5;
  }
  if (keys["w"] && zoroY === 0) {
    zoroY = 250;
  }

  if (keys["ArrowLeft"]) {
    shanksX -= 5;
  }
  if (keys["ArrowRight"]) {
    shanksX += 5;
  }
  if (keys["ArrowUp"] && shanksY === 0) {
    shanksY = 250;
  }
  if (zoroY > 0) {
    zoroY -= 5;
    if (zoroY < 0) zoroY = 0;
  }
  if (shanksY > 0) {
    shanksY -= 5;
    if (shanksY < 0) shanksY = 0;
  }


  if (zoroX < 0) zoroX = 0;
  if (shanksX < 0) shanksX = 0;
  if (zoroX > window.innerWidth - 150) zoroX = window.innerWidth - 150;
  if (shanksX > window.innerWidth - 150) shanksX = window.innerWidth - 150;


  zoro.style.left = zoroX + "px";
  zoro.style.bottom = zoroY + "px";

  shanks.style.left = shanksX + "px";
  shanks.style.bottom = shanksY + "px";


  requestAnimationFrame(updatePositions);
}


requestAnimationFrame(updatePositions);





function gameLoop() {
  if (gameOver) return;

  requestAnimationFrame(gameLoop);
}
const interval = setInterval(() => {
  if (gameOver) {
    clearInterval(interval);
    return;
  }
  timer--;
  timerEl.textContent = timer;
  if (timer <= 0) {
    if (zoroHealth > shanksHealth) endGame('Zoro wins!');
    else if (shanksHealth > zoroHealth) endGame('Shanks wins!');
    else endGame('Draw!');
    clearInterval(interval);
  }
}, 1000);



function endGame(text) {
  gameOver = true;
  winnerText.textContent = text;
  resultBox.style.display = 'flex';
}


restartBtn.addEventListener('click', () => location.reload());