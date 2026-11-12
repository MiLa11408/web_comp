// login-particles.js · 登录界面实时粒子动画背景
// WebGL Canvas实时演算，流动的知识网络效果

class LoginParticles {
  constructor(container) {
    this.container = container;
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.connections = [];
    this.time = 0;
    this.animationId = null;
    
    this.config = {
      particleCount: 120,
      particleSpeed: 0.3,
      connectionDistance: 150,
      mouseRadius: 180,
      colors: {
        particle: '#c8a24a',
        connection: 'rgba(200, 162, 74, 0.2)',
        glow: 'rgba(200, 162, 74, 0.5)'
      }
    };
    
    this.mouse = { x: 0, y: 0, active: false };
    
    this.init();
  }
  
  init() {
    this.createCanvas();
    this.createParticles();
    this.bindEvents();
    this.animate();
  }
  
  createCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 0;
    `;
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.resize();
  }
  
  resize() {
    this.canvas.width = this.container.offsetWidth;
    this.canvas.height = this.container.offsetHeight;
  }
  
  createParticles() {
    for (let i = 0; i < this.config.particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * this.config.particleSpeed,
        vy: (Math.random() - 0.5) * this.config.particleSpeed,
        radius: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.3
      });
    }
  }
  
  bindEvents() {
    window.addEventListener('resize', () => this.resize());
    
    this.container.addEventListener('mousemove', (e) => {
      const rect = this.container.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
      this.mouse.active = true;
    });
    
    this.container.addEventListener('mouseleave', () => {
      this.mouse.active = false;
    });
  }
  
  updateParticles() {
    this.particles.forEach(p => {
      // 基础移动
      p.x += p.vx;
      p.y += p.vy;
      
      // 边界反弹
      if (p.x < 0 || p.x > this.canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > this.canvas.height) p.vy *= -1;
      
      // 鼠标吸引/排斥效果
      if (this.mouse.active) {
        const dx = this.mouse.x - p.x;
        const dy = this.mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < this.config.mouseRadius) {
          const force = (this.config.mouseRadius - dist) / this.config.mouseRadius;
          p.vx += (dx / dist) * force * 0.05;
          p.vy += (dy / dist) * force * 0.05;
        }
      }
      
      // 速度限制
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > 2) {
        p.vx = (p.vx / speed) * 2;
        p.vy = (p.vy / speed) * 2;
      }
    });
  }
  
  updateConnections() {
    this.connections = [];
    
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const dx = this.particles[i].x - this.particles[j].x;
        const dy = this.particles[i].y - this.particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < this.config.connectionDistance) {
          this.connections.push({
            p1: this.particles[i],
            p2: this.particles[j],
            opacity: (1 - dist / this.config.connectionDistance) * 0.3
          });
        }
      }
    }
  }
  
  draw() {
    // 清空画布
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 绘制连接线
    this.connections.forEach(conn => {
      this.ctx.beginPath();
      this.ctx.moveTo(conn.p1.x, conn.p1.y);
      this.ctx.lineTo(conn.p2.x, conn.p2.y);
      this.ctx.strokeStyle = `rgba(200, 162, 74, ${conn.opacity})`;
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    });
    
    // 绘制粒子
    this.particles.forEach(p => {
      // 外发光
      const gradient = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3);
      gradient.addColorStop(0, `rgba(200, 162, 74, ${p.opacity * 0.5})`);
      gradient.addColorStop(1, 'rgba(200, 162, 74, 0)');
      
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
      this.ctx.fillStyle = gradient;
      this.ctx.fill();
      
      // 粒子本体
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `rgba(200, 162, 74, ${p.opacity})`;
      this.ctx.fill();
    });
    
    // 鼠标光圈
    if (this.mouse.active) {
      const gradient = this.ctx.createRadialGradient(
        this.mouse.x, this.mouse.y, 0,
        this.mouse.x, this.mouse.y, this.config.mouseRadius
      );
      gradient.addColorStop(0, 'rgba(200, 162, 74, 0.1)');
      gradient.addColorStop(0.5, 'rgba(200, 162, 74, 0.05)');
      gradient.addColorStop(1, 'rgba(200, 162, 74, 0)');
      
      this.ctx.beginPath();
      this.ctx.arc(this.mouse.x, this.mouse.y, this.config.mouseRadius, 0, Math.PI * 2);
      this.ctx.fillStyle = gradient;
      this.ctx.fill();
    }
  }
  
  animate() {
    this.time++;
    this.updateParticles();
    this.updateConnections();
    this.draw();
    
    this.animationId = requestAnimationFrame(() => this.animate());
  }
  
  // 爆发效果（演示时调用）
  burst() {
    this.particles.forEach(p => {
      const angle = Math.random() * Math.PI * 2;
      const force = Math.random() * 5 + 2;
      p.vx += Math.cos(angle) * force;
      p.vy += Math.sin(angle) * force;
    });
  }
  
  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.canvas) {
      this.canvas.remove();
    }
  }
}

// 自动初始化（如果存在登录容器）
document.addEventListener('DOMContentLoaded', () => {
  const loginContainer = document.querySelector('.login-wrapper, #loginModal, .auth-panel');
  if (loginContainer) {
    window.loginParticles = new LoginParticles(loginContainer);
    console.log('[登录粒子] 已初始化');
  }
});
