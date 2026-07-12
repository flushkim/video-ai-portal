import "./styles.css";

const startBtn          = document.getElementById("startBtn");
const homeContent       = document.getElementById("homeContent");
const vhsTransition     = document.getElementById("vhsTransition");
const companyContent    = document.getElementById("companyContent");
const transNoiseCanvas  = document.getElementById("transNoiseCanvas");
const vhsNoiseCanvas    = document.getElementById("vhsNoiseCanvas");
const mediaNoiseCanvas  = document.getElementById("mediaNoiseCanvas");
const cassetteContainer = document.getElementById("cassetteContainer");
const reel1             = document.getElementById("reel1");
const reel2             = document.getElementById("reel2");
const transColorBar     = vhsTransition.querySelector(".color-bars-bg");

function showPage(el) {
  document.querySelectorAll(".tv-page").forEach(p => p.classList.remove("active"));
  el.classList.add("active");
}

function drawStaticNoise(canvas) {
  const ctx = canvas.getContext("2d");
  const w = Math.floor(window.innerWidth / 2.5);
  const h = Math.floor(window.innerHeight / 2.5);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w; canvas.height = h;
  }
  
  const id = ctx.createImageData(w, h);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.random() * 255;
    d[i] = v; d[i+1] = v; d[i+2] = v;
    d[i+3] = Math.random() > 0.3 ? 140 : 20; 
  }
  ctx.putImageData(id, 0, 0);

  if (Math.random() > 0.5) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.4})`;
    ctx.fillRect(0, Math.random() * h, w, Math.random() * 15 + 2);
  }
}

let frameCount = 0;
let baseTime = new Date("2026-07-07T00:00:00").getTime();

function drawCamcorder(canvas) {
  const ctx = canvas.getContext("2d");
  const parent = canvas.parentElement;
  const w = parent.clientWidth;
  const h = parent.clientHeight;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w; canvas.height = h;
  }

  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, w, h);
  
  for(let i=0; i<300; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? "#fff" : "#333";
    ctx.globalAlpha = Math.random() * 0.3;
    ctx.fillRect(Math.random()*w, Math.random()*h, 2, 2);
  }
  ctx.globalAlpha = 1.0;

  for(let y=0; y<h; y+=4) {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, y, w, 1);
  }

  ctx.fillStyle = "#fff";
  ctx.font = "16px 'VT323', monospace";
  ctx.textAlign = "center";
  
  let curTime = new Date(baseTime + frameCount * (1000 / 60));
  const yyyy = curTime.getFullYear();
  const mm = String(curTime.getMonth() + 1).padStart(2, '0');
  const dd = String(curTime.getDate()).padStart(2, '0');
  const hh = String(curTime.getHours()).padStart(2, '0');
  const min = String(curTime.getMinutes()).padStart(2, '0');
  const ss = String(curTime.getSeconds()).padStart(2, '0');

  const dateStr = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
  ctx.fillText(dateStr, w / 2, h - 15);

  ctx.font = "bold 42px 'VT323', monospace";
  ctx.textBaseline = "middle";
  
  const text = "MEDIA";
  const x = w/2;
  const y = h/2;
  const glitchX = Math.random() > 0.85 ? (Math.random() - 0.5) * 15 : 0;
  const glitchY = Math.random() > 0.95 ? (Math.random() - 0.5) * 5 : 0;

  ctx.fillStyle = "rgba(255,0,0,0.85)";
  ctx.fillText(text, x - 4 + glitchX, y + glitchY);
  ctx.fillStyle = "rgba(0,255,255,0.85)";
  ctx.fillText(text, x + 4 - glitchX, y - glitchY);
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.fillText(text, x + glitchX/2, y);

  if (Math.random() > 0.8) {
    const tearY = Math.random() * h;
    const tearH = Math.random() * 15;
    const imgData = ctx.getImageData(0, tearY, w, tearH);
    ctx.putImageData(imgData, (Math.random()-0.5)*30, tearY);
  }

  frameCount++;
}

let isTransRunning = false;
let isVhsRunning = false;
let isMediaRunning = false;

function transLoop() {
  if (isTransRunning) {
    drawStaticNoise(transNoiseCanvas);
    requestAnimationFrame(transLoop);
  }
}

function vhsLoop() {
  if (isVhsRunning) {
    drawStaticNoise(vhsNoiseCanvas);
    requestAnimationFrame(vhsLoop);
  }
}

function mediaLoop() {
  if (isMediaRunning) {
    drawCamcorder(mediaNoiseCanvas);
    requestAnimationFrame(mediaLoop);
  }
}

startBtn.addEventListener("click", () => {
  startBtn.disabled = true;

  homeContent.classList.add("tv-turn-off-crt");

  setTimeout(() => {
    homeContent.classList.remove("active", "tv-turn-off-crt");
    vhsTransition.classList.add("active");
    
    isTransRunning = true;
    transLoop();

    if (transColorBar) {
      transColorBar.classList.add("grayscale-anim");
    }

    cassetteContainer.style.display = "block";

    setTimeout(() => {
      cassetteContainer.classList.add("inserting");
      reel1.classList.add("spinning");
      reel2.classList.add("spinning");
    }, 100);

    setTimeout(() => {
      isTransRunning = false;
      vhsTransition.classList.remove("active");
      companyContent.classList.add("active");
      isVhsRunning = true;
      isMediaRunning = true;
      vhsLoop();
      mediaLoop();
      cassetteContainer.style.display = "none";
    }, 2800);

  }, 600);
});

// Windows 95 Navigation Logic
const win95Window = document.getElementById("win95Window");
const win95Title = document.getElementById("win95Title");
const views = document.querySelectorAll(".view-section");
const desktopIcons = document.querySelectorAll(".desktop-icon");
const backBtns = document.querySelectorAll(".back-btn");

function switchView(targetId, titleText) {
  // 1. Play Turn Off Animation
  win95Window.classList.remove("element-turn-on");
  win95Window.classList.add("element-turn-off");
  
  setTimeout(() => {
    // 2. Hide all views and show the target view
    views.forEach(v => v.classList.remove("active"));
    document.getElementById(targetId).classList.add("active");
    win95Title.innerText = titleText;
    
    // 3. Toggle maximized class for folder contents
    if (targetId === "viewDesktop") {
      win95Window.classList.remove("maximized");
    } else {
      win95Window.classList.add("maximized");
    }
    
    // 4. Play Turn On Animation (scales up to the new dimensions)
    win95Window.classList.remove("element-turn-off");
    win95Window.classList.add("element-turn-on");
  }, 400); 
}

desktopIcons.forEach(icon => {
  icon.addEventListener("click", (e) => {
    e.preventDefault();
    const targetId = icon.getAttribute("data-target");
    const title = icon.getAttribute("data-title");
    switchView(targetId, title);
  });
});

backBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    switchView("viewDesktop", "DCPG_SYSTEM_OVERRIDE.EXE");
  });
});