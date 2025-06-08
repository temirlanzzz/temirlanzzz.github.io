// Simple JavaScript for potential interactive features
document.addEventListener('DOMContentLoaded', function() {
    // Add smooth scrolling for any anchor links
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Add fade-in animation on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe all sections and items for animation
    const animatedElements = document.querySelectorAll('.section, .experience-item, .education-item, .publication-item');
    
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });

    // Add print functionality
    function addPrintButton() {
        const printButton = document.createElement('button');
        printButton.textContent = 'Print Resume';
        printButton.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #2563eb;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-family: inherit;
            font-size: 14px;
            box-shadow: 0 2px 10px rgba(37, 99, 235, 0.3);
            transition: all 0.3s ease;
            z-index: 1000;
        `;
        
        printButton.addEventListener('mouseenter', function() {
            this.style.background = '#1d4ed8';
            this.style.transform = 'translateY(-2px)';
        });
        
        printButton.addEventListener('mouseleave', function() {
            this.style.background = '#2563eb';
            this.style.transform = 'translateY(0)';
        });
        
        printButton.addEventListener('click', function() {
            window.print();
        });
        
        document.body.appendChild(printButton);
    }

    // Add print button
    addPrintButton();

    // Add theme toggle functionality
    function addThemeToggle() {
        const themeToggle = document.createElement('button');
        themeToggle.textContent = '🌙';
        themeToggle.style.cssText = `
            position: fixed;
            top: 20px;
            right: 180px;
            background: #f1f5f9;
            border: none;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            transition: all 0.3s ease;
            z-index: 1000;
        `;
        
        let isDark = false;
        
        themeToggle.addEventListener('click', function() {
            isDark = !isDark;
            
            if (isDark) {
                document.body.style.background = 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)';
                document.body.style.color = '#e2e8f0';
                this.textContent = '☀️';
                
                // Update card backgrounds
                const cards = document.querySelectorAll('.experience-item, .education-item, .publication-item');
                cards.forEach(card => {
                    card.style.background = '#334155';
                    card.style.color = '#e2e8f0';
                });
                
                // Update section titles
                const titles = document.querySelectorAll('.section-title');
                titles.forEach(title => {
                    title.style.color = '#60a5fa';
                });
                
                // Update links
                const links = document.querySelectorAll('a');
                links.forEach(link => {
                    link.style.color = '#60a5fa';
                });
                
            } else {
                document.body.style.background = 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)';
                document.body.style.color = '#1a1a1a';
                this.textContent = '🌙';
                
                // Reset card backgrounds
                const cards = document.querySelectorAll('.experience-item, .education-item, .publication-item');
                cards.forEach(card => {
                    card.style.background = 'white';
                    card.style.color = '#1a1a1a';
                });
                
                // Reset section titles
                const titles = document.querySelectorAll('.section-title');
                titles.forEach(title => {
                    title.style.color = '#2563eb';
                });
                
                // Reset links
                const links = document.querySelectorAll('a');
                links.forEach(link => {
                    link.style.color = '';
                });
            }
        });
        
        document.body.appendChild(themeToggle);
    }

    // Add theme toggle
    addThemeToggle();

    console.log('Resume website loaded successfully!');
});