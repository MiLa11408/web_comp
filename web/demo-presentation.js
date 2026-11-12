// demo-presentation.js · 半自动演示系统
// 按空格或→键推进，自动执行7个演示板块

class DemoPresentation {
  constructor() {
    this.currentStep = -1; // -1=未开始
    this.steps = [
      { id: 'login', name: '登录界面动画', duration: 5000 },
      { id: 'hall-entrance', name: '3D大厅震撼入场', duration: 8000 },
      { id: 'shelf-walk', name: '书架漫游', duration: 6000 },
      { id: 'book-pick', name: '取书交互', duration: 5000 },
      { id: 'search-demo', name: '检索算法展示', duration: 7000 },
      { id: 'fragment-collect', name: '残页收集玩法', duration: 6000 },
      { id: 'whatif-door', name: 'L4暗门假如之书', duration: 8000 }
    ];
    
    this.ui = null;
    this.isPaused = false;
    this.autoTimer = null;
    
    this.init();
  }
  
  init() {
    this.createUI();
    this.bindKeys();
    console.log('[演示系统] 已加载，按 Ctrl+Shift+P 开始演示');
  }
  
  createUI() {
    const ui = document.createElement('div');
    ui.id = 'demo-presentation';
    ui.style.cssText = `
      position: fixed;
      left: 50%;
      bottom: 30px;
      transform: translateX(-50%);
      z-index: 9999;
      background: rgba(27,21,16,0.98);
      border: 2px solid #c8a24a;
      border-radius: 4px;
      padding: 16px 24px;
      min-width: 600px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.7);
      font-family: "Segoe UI", "Microsoft YaHei", sans-serif;
      display: none;
    `;
    
    ui.innerHTML = `
      <div style="display: flex; align-items: center; gap: 20px;">
        <div style="flex: 1;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="color: #c8a24a; font-size: 14px; font-weight: 600; letter-spacing: 2px;">
              演示控制器
            </span>
            <span id="demo-step-label" style="color: #9a8a6f; font-size: 12px;">
              未开始
            </span>
          </div>
          
          <div id="demo-progress-bg" style="
            width: 100%;
            height: 6px;
            background: #2c241a;
            border-radius: 3px;
            overflow: hidden;
            position: relative;
          ">
            <div id="demo-progress-bar" style="
              position: absolute;
              left: 0;
              top: 0;
              height: 100%;
              width: 0%;
              background: linear-gradient(90deg, #c8a24a, #d4b36a);
              border-radius: 3px;
              transition: width 0.3s ease;
            "></div>
          </div>
          
          <div style="margin-top: 10px; color: #8a7a5c; font-size: 11px; line-height: 1.6;">
            <span id="demo-hint">空格 或 → 下一步 | ← 上一步 | P 暂停/继续 | F9 退出</span>
          </div>
        </div>
        
        <div style="display: flex; gap: 8px;">
          <button id="demo-prev-btn" style="
            background: #2c241a;
            border: 1px solid #6b5333;
            color: #9a8a6f;
            padding: 8px 16px;
            font-size: 13px;
            cursor: pointer;
            border-radius: 2px;
          " disabled>
            ← 上一步
          </button>
          <button id="demo-next-btn" style="
            background: #c8a24a;
            border: 1px solid #c8a24a;
            color: #1d1712;
            padding: 8px 16px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            border-radius: 2px;
          ">
            开始演示
          </button>
          <button id="demo-close-btn" style="
            background: #2c241a;
            border: 1px solid #6b5333;
            color: #9a8a6f;
            padding: 8px 12px;
            font-size: 13px;
            cursor: pointer;
            border-radius: 2px;
          ">
            ✕
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(ui);
    this.ui = ui;
    
    // 按钮事件
    ui.querySelector('#demo-next-btn').addEventListener('click', () => this.next());
    ui.querySelector('#demo-prev-btn').addEventListener('click', () => this.prev());
    ui.querySelector('#demo-close-btn').addEventListener('click', () => this.hide());
  }
  
  bindKeys() {
    document.addEventListener('keydown', (e) => {
      // F9 一键启动演示模式
      if (e.key === 'F9') {
        e.preventDefault();
        this.show();
        return;
      }
      
      if (!this.ui || this.ui.style.display === 'none') return;
      
      // 演示控制快捷键
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        this.next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.prev();
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        this.togglePause();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.hide();
      }
    });
  }
  
  show() {
    this.ui.style.display = 'block';
    this.currentStep = -1;
    this.updateUI();
  }
  
  hide() {
    this.ui.style.display = 'none';
    this.stopAutoTimer();
    this.currentStep = -1;
  }
  
  next() {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.executeStep(this.currentStep);
      this.updateUI();
    }
  }
  
  prev() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.executeStep(this.currentStep);
      this.updateUI();
    }
  }
  
  togglePause() {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.stopAutoTimer();
      this.ui.querySelector('#demo-hint').textContent = '已暂停 | 按 P 继续';
    } else {
      const step = this.steps[this.currentStep];
      if (step) {
        this.startAutoTimer(step.duration);
      }
      this.ui.querySelector('#demo-hint').textContent = '空格 或 → 下一步 | ← 上一步 | P 暂停 | Esc 退出';
    }
  }
  
  updateUI() {
    const nextBtn = this.ui.querySelector('#demo-next-btn');
    const prevBtn = this.ui.querySelector('#demo-prev-btn');
    const stepLabel = this.ui.querySelector('#demo-step-label');
    const progressBar = this.ui.querySelector('#demo-progress-bar');
    
    if (this.currentStep === -1) {
      stepLabel.textContent = '未开始';
      nextBtn.textContent = '开始演示';
      prevBtn.disabled = true;
      progressBar.style.width = '0%';
    } else {
      const step = this.steps[this.currentStep];
      stepLabel.textContent = `${this.currentStep + 1}/${this.steps.length} · ${step.name}`;
      nextBtn.textContent = this.currentStep === this.steps.length - 1 ? '演示完成' : '下一步 →';
      prevBtn.disabled = this.currentStep === 0;
      
      const progress = ((this.currentStep + 1) / this.steps.length) * 100;
      progressBar.style.width = `${progress}%`;
    }
    
    nextBtn.disabled = this.currentStep === this.steps.length - 1;
  }
  
  executeStep(stepIndex) {
    const step = this.steps[stepIndex];
    console.log(`[演示] 第${stepIndex + 1}步: ${step.name}`);
    
    // 停止上一个定时器
    this.stopAutoTimer();
    
    // 执行对应的演示动作
    switch (step.id) {
      case 'login':
        this.demoLogin();
        break;
      case 'hall-entrance':
        this.demoHallEntrance();
        break;
      case 'shelf-walk':
        this.demoShelfWalk();
        break;
      case 'book-pick':
        this.demoBookPick();
        break;
      case 'search-demo':
        this.demoSearch();
        break;
      case 'fragment-collect':
        this.demoFragment();
        break;
      case 'whatif-door':
        this.demoWhatifDoor();
        break;
    }
    
    // 自动推进到下一步（可选）
    // this.startAutoTimer(step.duration);
  }
  
  startAutoTimer(duration) {
    this.autoTimer = setTimeout(() => {
      if (!this.isPaused && this.currentStep < this.steps.length - 1) {
        this.next();
      }
    }, duration);
  }
  
  stopAutoTimer() {
    if (this.autoTimer) {
      clearTimeout(this.autoTimer);
      this.autoTimer = null;
    }
  }
  
  // ========== 演示动作实现 ==========
  
  demoLogin() {
    // 触发登录界面粒子动画
    if (window.loginParticles) {
      window.loginParticles.burst();
    }
    this.showToast('展示登录界面粒子动画效果');
  }
  
  demoHallEntrance() {
    // 进入3D大厅，触发震撼入场
    if (window.mm3d) {
      window.mm3d.playEntranceAnimation();
    }
    this.showToast('相机运镜 + 书架渐显入场');
  }
  
  demoShelfWalk() {
    // 自动WASD漫游
    if (window.mm3d) {
      window.mm3d.autoWalk([
        { x: 0, z: 5 },
        { x: -4, z: 2 },
        { x: 4, z: -2 }
      ]);
    }
    this.showToast('自动漫游展示书架细节');
  }
  
  demoBookPick() {
    // 自动点击一本书，抽出并翻开
    if (window.mm3d) {
      window.mm3d.autoPickBook('b1');
    }
    this.showToast('点击书脊 → 抽到手中 → E翻开');
  }
  
  demoSearch() {
    // 打开检索，输入"神经网络"，展示四级排序
    const searchInput = document.querySelector('#searchInput');
    if (searchInput) {
      searchInput.value = '神经网络';
      searchInput.dispatchEvent(new Event('input'));
      
      setTimeout(() => {
        const firstHit = document.querySelector('.rail-hit');
        if (firstHit) {
          firstHit.click();
        }
      }, 1000);
    }
    this.showToast('检索算法：四级排序 + 命中高亮');
  }
  
  demoFragment() {
    // 走到残页位置，自动拾取
    if (window.mm3d) {
      window.mm3d.goToFragment('frag-dartmouth');
    }
    this.showToast('残页掉落 → 拾取 → 拼合界面');
  }
  
  demoWhatifDoor() {
    // 切换到L4，走到暗门，点击帷幕
    if (window.mm3d) {
      window.mm3d.switchFloor('L4');
      setTimeout(() => {
        window.mm3d.openSecretDoor();
      }, 2000);
    }
    this.showToast('L4暗门 → 帷幕拉开 → 假如之书');
  }
  
  showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      left: 50%;
      top: 80px;
      transform: translateX(-50%);
      z-index: 10000;
      background: rgba(27,21,16,0.95);
      color: #c8a24a;
      border: 1px solid #c8a24a;
      padding: 12px 24px;
      font-size: 14px;
      border-radius: 4px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      animation: demoToastIn 0.3s ease-out;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'demoToastOut 0.3s ease-in';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
@keyframes demoToastIn {
  from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
@keyframes demoToastOut {
  from { opacity: 1; transform: translateX(-50%) translateY(0); }
  to { opacity: 0; transform: translateX(-50%) translateY(-20px); }
}
`;
document.head.appendChild(style);

// 全局初始化
window.demoPresentation = new DemoPresentation();
