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
let timer = 60;


startBtn.addEventListener('click', () => {
    startScreen.style.display = 'none';
});


const music = document.querySelector('#bg-music');
const ba = new Audio('assets /overtaken.mp3');
document.getElementById("start").addEventListener("click", function (event) {
    ba.volume = 0.4;
    ba.play();
});

let zoroX = 0;
let zoroY = 0;
let shanksX = arena.clientWidth - shanks.offsetWidth - 50;
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
        zoroX -= 10;
    }
    if (keys["d"]) {
        zoroX += 10;
    }
    if (keys["w"] && zoroY === 0) {
        zoroY = 150;
    }

    if (keys["ArrowLeft"]) {
        shanksX -= 10;
    }
    if (keys["ArrowRight"]) {
        shanksX += 10;
    }
    if (keys["ArrowUp"] && shanksY === 0) {
        shanksY = 150;
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


let zoroAttackCooldown = false;
let shanksAttackCooldown = false;


document.addEventListener("keydown", function (e) {
    keys[e.key] = true;

    if (e.key === " " && !zoroAttackCooldown && !gameOver) {
        zoroAttack();
    }

    if (e.key === "Enter" && !shanksAttackCooldown && !gameOver) {
        shanksAttack();
    }
});

// function zoroAttack() {
//     zoroAttackCooldown = true;

//     const distance = Math.abs(zoroX - shanksX);
//     if (distance < 150 && shanksHealth > 0) {
//         shanksHealth -= 30;
//         if (shanksHealth < 0) shanksHealth = 0;
//         shanksHealthEl.style.width = shanksHealth + '%';
//     }


//     if (shanksHealth <= 0) {
//         endGame('Zoro wins!');
//     }


//     setTimeout(() => {
//         zoroAttackCooldown = false;
//     }, 500);
// }

// zoro.classList.add('hit');
// setTimeout(() => zoro.classList.remove('hit'), 500);


// function shanksAttack() {
//     shanksAttackCooldown = true;

//     const distance = Math.abs(shanksX - zoroX);
//     if (distance < 150 && zoroHealth > 0) {
//         zoroHealth -= 30;
//         if (zoroHealth < 0) zoroHealth = 0;
//         zoroHealthEl.style.width = zoroHealth + '%';
//     }

//     if (zoroHealth <= 0) {
//         endGame('Shanks wins!');
//     }

//     setTimeout(() => {
//         shanksAttackCooldown = false;
//     }, 500);
// }

// shanks.classList.add('hit');
// setTimeout(() => shanks.classList.remove('hit'), 500);


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


function showSlash(character) {
    const slash = document.getElementById(`${character}-slash`);
    const charEl = document.getElementById(character);
    const rect = charEl.getBoundingClientRect();


    slash.style.left = rect.left + rect.width / 5 + 'px';
    slash.style.bottom = (parseFloat(charEl.style.bottom) || 0) + 60 + 'px';
    slash.style.display = 'block';



    slash.style.backgroundImage = `url('assets/${character}-slash.gif')`;


    setTimeout(() => {
        slash.style.display = 'none';
    }, 500);
}



function zoroAttack() {
    zoroAttackCooldown = true;
    showSlash('zoro');

    const distance = Math.abs(zoroX - shanksX);
    if (distance < 180 && shanksHealth > 0) {
        shanksHealth -= 30;
        if (shanksHealth < 0) shanksHealth = 0;
        shanksHealthEl.style.width = shanksHealth + '%';
    }

    if (shanksHealth <= 0) {
        endGame('Zoro wins!');
    }

    setTimeout(() => {
        zoroAttackCooldown = false;
    }, 500);
}


function shanksAttack() {
    shanksAttackCooldown = true;
    showSlash('shanks');

    const distance = Math.abs(shanksX - zoroX);
    if (distance < 180 && zoroHealth > 0) {
        zoroHealth -= 30;
        if (zoroHealth < 0) zoroHealth = 0;
        zoroHealthEl.style.width = zoroHealth + '%';
    }

    if (zoroHealth <= 0) {
        endGame('Shanks wins!');
    }

    setTimeout(() => {
        shanksAttackCooldown = false;
    }, 500);
}