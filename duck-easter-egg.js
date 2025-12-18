// Duck Easter Eggs & Interactions
(function() {
    'use strict';
    
    // Duck Party - Triple Click Logo
    let logoClickCount = 0;
    let logoClickTimer = null;
    
    const logo = document.querySelector('.app-logo');
    if (logo) {
        logo.addEventListener('click', function() {
            logoClickCount++;
            
            if (logoClickTimer) clearTimeout(logoClickTimer);
            
            if (logoClickCount === 3) {
                // Duck Party Mode!
                this.classList.add('duck-party');
                createDuckConfetti();
                playDuckSound();
                
                setTimeout(() => {
                    this.classList.remove('duck-party');
                }, 2000);
                
                logoClickCount = 0;
            }
            
            logoClickTimer = setTimeout(() => {
                logoClickCount = 0;
            }, 500);
        });
    }
    
    // Duck Confetti
    function createDuckConfetti() {
        const ducks = ['🦆', '🐥', '🐤', '🦢', '🪿'];
        const colors = ['#FFD700', '#FFA500', '#FF69B4', '#87CEEB', '#98FB98'];
        
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                const confetti = document.createElement('div');
                confetti.className = 'duck-confetti';
                confetti.textContent = ducks[Math.floor(Math.random() * ducks.length)];
                confetti.style.left = Math.random() * 100 + '%';
                confetti.style.color = colors[Math.floor(Math.random() * colors.length)];
                confetti.style.animationDelay = Math.random() * 0.5 + 's';
                document.body.appendChild(confetti);
                
                setTimeout(() => confetti.remove(), 3000);
            }, i * 100);
        }
    }
    
    // Duck Sound (Quack!)
    function playDuckSound() {
        // Create audio context for duck sound
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 400;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    }
    
    // Duck Cursor Trail (Optional - can be disabled)
    let duckTrailEnabled = false;
    
    if (duckTrailEnabled) {
        document.addEventListener('mousemove', function(e) {
            if (Math.random() > 0.95) { // 5% chance
                const trail = document.createElement('div');
                trail.className = 'duck-cursor-trail';
                trail.textContent = '🦆';
                trail.style.left = e.pageX + 'px';
                trail.style.top = e.pageY + 'px';
                document.body.appendChild(trail);
                
                setTimeout(() => trail.remove(), 1000);
            }
        });
    }
    
    // Duck Button Click Effect
    document.addEventListener('click', function(e) {
        if (e.target.tagName === 'BUTTON') {
            e.target.classList.add('button-clicked');
            setTimeout(() => {
                e.target.classList.remove('button-clicked');
            }, 500);
        }
    });
    
    // Random Duck Appearance
    function randomDuckAppearance() {
        if (Math.random() > 0.98) { // 2% chance every 5 seconds
            const duck = document.createElement('div');
            duck.textContent = '🦆';
            duck.style.position = 'fixed';
            duck.style.fontSize = '3em';
            duck.style.zIndex = '9999';
            duck.style.pointerEvents = 'none';
            duck.style.left = Math.random() * (window.innerWidth - 100) + 'px';
            duck.style.top = '-100px';
            duck.style.transition = 'all 3s ease-in-out';
            
            document.body.appendChild(duck);
            
            setTimeout(() => {
                duck.style.top = window.innerHeight + 'px';
                duck.style.transform = 'rotate(360deg)';
            }, 100);
            
            setTimeout(() => duck.remove(), 3100);
        }
    }
    
    // Check for random duck every 5 seconds
    setInterval(randomDuckAppearance, 5000);
    
    // Konami Code for Duck Mode
    const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    let konamiIndex = 0;
    
    document.addEventListener('keydown', function(e) {
        if (e.key === konamiCode[konamiIndex]) {
            konamiIndex++;
            if (konamiIndex === konamiCode.length) {
                activateDuckMode();
                konamiIndex = 0;
            }
        } else {
            konamiIndex = 0;
        }
    });
    
    function activateDuckMode() {
        alert('🦆 DUCK MODE ACTIVATED! 🦆');
        duckTrailEnabled = true;
        
        // Make everything duck-themed for 10 seconds
        document.body.style.cursor = 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'48\' viewport=\'0 0 100 100\' style=\'fill:black;font-size:24px;\'><text y=\'50%\'>🦆</text></svg>") 16 0, auto';
        
        setTimeout(() => {
            document.body.style.cursor = '';
            duckTrailEnabled = false;
        }, 10000);
    }
    
    // Console Easter Egg
    console.log('%c🦆 Pawtonomous Feeder 🦆', 'font-size: 20px; color: #BB86FC; font-weight: bold;');
    console.log('%cQuack! You found the duck! 🦆', 'font-size: 14px; color: #03DAC6;');
    console.log('%cTry triple-clicking the logo! 🎉', 'font-size: 12px; color: #FFC107;');
    
})();
