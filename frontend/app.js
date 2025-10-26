let clickCount = 0;

document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('clickMe');
    const counter = document.getElementById('counter');
    
    button.addEventListener('click', () => {
        clickCount++;
        counter.textContent = `Clicks: ${clickCount}`;
        
        // Add a little animation
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
            button.style.transform = 'scale(1)';
        }, 100);
    });
});

