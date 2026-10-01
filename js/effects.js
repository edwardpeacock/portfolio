/* EP / kinetic layer — progressive enhancement, no libraries */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const body = document.body;
  const root = document.documentElement;

  // Reading progress bar
  const progress = document.createElement('div');
  progress.className = 'fx-progress';
  progress.setAttribute('aria-hidden', 'true');
  body.appendChild(progress);
  let scrollTick = false;
  const updateScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
    root.style.setProperty('--scroll-y', `${scrollY}px`);
    scrollTick = false;
  };
  addEventListener('scroll', () => {
    if (!scrollTick) { requestAnimationFrame(updateScroll); scrollTick = true; }
  }, {passive:true});
  updateScroll();

  // Reveal choreography
  const revealTargets = [
    'section:not(.home-hero)', '.reel-wrap', '.reel-desc', '.section-head',
    '.card', '.split', '.prose', '.specs', '.desc-block', '.bd-head',
    '.contact-card', '.portrait'
  ];
  document.querySelectorAll(revealTargets.join(',')).forEach((el, i) => {
    if (el.closest('.bd-stage')) return;
    el.classList.add('fx-reveal');
    if (el.classList.contains('card')) el.style.setProperty('--reveal-delay', `${(i % 4) * 85}ms`);
  });
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fx-visible');
        io.unobserve(entry.target);
      }
    }), {threshold: .12, rootMargin:'0px 0px -4% 0px'});
    document.querySelectorAll('.fx-reveal').forEach(el => io.observe(el));
  } else document.querySelectorAll('.fx-reveal').forEach(el => el.classList.add('fx-visible'));

  // Ambient cursor field + cinematic particles on canvas
  if (!reduce) {
    const canvas = document.createElement('canvas');
    canvas.className = 'fx-atmosphere';
    canvas.setAttribute('aria-hidden','true');
    body.prepend(canvas);
    const ctx = canvas.getContext('2d');
    let w=0,h=0,dpr=1, mouse={x:-999,y:-999}, particles=[];
    const resize = () => {
      dpr=Math.min(devicePixelRatio||1,1.7); w=innerWidth; h=innerHeight;
      canvas.width=Math.round(w*dpr); canvas.height=Math.round(h*dpr);
      canvas.style.width=w+'px'; canvas.style.height=h+'px';
      ctx.setTransform(dpr,0,0,dpr,0,0);
      const count=Math.min(72,Math.max(26,Math.floor(w*h/21000)));
      particles=Array.from({length:count},()=>({
        x:Math.random()*w,y:Math.random()*h,
        r:Math.random()*1.4+.35, vx:(Math.random()-.5)*.22, vy:-Math.random()*.25-.04,
        a:Math.random()*.5+.12, phase:Math.random()*Math.PI*2
      }));
    };
    const draw = t => {
      ctx.clearRect(0,0,w,h);
      // subtle pointer aura
      if (mouse.x > -100) {
        const g=ctx.createRadialGradient(mouse.x,mouse.y,0,mouse.x,mouse.y,260);
        g.addColorStop(0,'rgba(215,255,63,.055)'); g.addColorStop(1,'rgba(215,255,63,0)');
        ctx.fillStyle=g;ctx.fillRect(mouse.x-260,mouse.y-260,520,520);
      }
      particles.forEach((p,i)=>{
        p.x+=p.vx;p.y+=p.vy;
        if(p.y<-8){p.y=h+8;p.x=Math.random()*w}
        if(p.x<-8)p.x=w+8;if(p.x>w+8)p.x=-8;
        const pulse=.68+.32*Math.sin(t*.0008+p.phase);
        ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(215,255,63,${p.a*pulse})`;ctx.fill();
        // nearby particles connect into a very faint technical constellation
        for(let j=i+1;j<particles.length;j++){
          const q=particles[j],dx=p.x-q.x,dy=p.y-q.y,dist=Math.hypot(dx,dy);
          if(dist<105){ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);
            ctx.strokeStyle=`rgba(215,255,63,${(1-dist/105)*.065})`;ctx.lineWidth=.6;ctx.stroke();}
        }
      });
      requestAnimationFrame(draw);
    };
    resize();addEventListener('resize',resize,{passive:true});requestAnimationFrame(draw);
    addEventListener('pointermove',e=>{mouse.x=e.clientX;mouse.y=e.clientY;},{passive:true});
  }

  if (fine && !reduce) {
    const cursor=document.createElement('div'); cursor.className='fx-cursor';
    cursor.innerHTML='<span></span>';body.appendChild(cursor);
    let mx=-100,my=-100,cx=-100,cy=-100, active=false;
    addEventListener('pointermove',e=>{mx=e.clientX;my=e.clientY;active=true;cursor.classList.add('fx-cursor-on');},{passive:true});
    const move=()=>{cx+=(mx-cx)*.22;cy+=(my-cy)*.22;cursor.style.transform=`translate3d(${cx}px,${cy}px,0)`;requestAnimationFrame(move)};move();
    document.addEventListener('pointerover',e=>{
      const hit=e.target.closest('a,button,.card,.video,.bd-stage');
      cursor.classList.toggle('fx-cursor-hot',!!hit);
      if(hit) cursor.querySelector('span').textContent=hit.matches('.video')?'PLAY':hit.matches('.card')?'OPEN':'↗';
      else cursor.querySelector('span').textContent='';
    });
    document.addEventListener('pointerdown',()=>cursor.classList.add('fx-cursor-click'));
    document.addEventListener('pointerup',()=>cursor.classList.remove('fx-cursor-click'));

    // Magnetic nudge on small calls to action
    document.querySelectorAll('.hero-cta,.section-head>a,.sound-btn,.menu-btn').forEach(el=>{
      el.addEventListener('pointermove',e=>{
        const r=el.getBoundingClientRect(), dx=e.clientX-r.left-r.width/2,dy=e.clientY-r.top-r.height/2;
        el.style.transform=`translate(${dx*.08}px,${dy*.12}px)`;
      });
      el.addEventListener('pointerleave',()=>el.style.transform='');
    });

    // Project cards have a subtle physical tilt and moving light reflection
    document.querySelectorAll('.card').forEach(card=>{
      card.addEventListener('pointermove',e=>{
        const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;
        card.style.setProperty('--mx',`${x*100}%`);card.style.setProperty('--my',`${y*100}%`);
        card.style.transform=`perspective(900px) rotateX(${(0.5-y)*3}deg) rotateY(${(x-.5)*3}deg) translateY(-3px)`;
      });
      card.addEventListener('pointerleave',()=>{card.style.transform='';});
    });
  }

  // Give buttons and project tiles a restrained expanding light burst
  document.addEventListener('click', e => {
    const el=e.target.closest('a,button');
    if(!el || reduce) return;
    const r=el.getBoundingClientRect(), ripple=document.createElement('i');
    ripple.className='fx-ripple';
    ripple.style.left=(e.clientX-r.left)+'px';ripple.style.top=(e.clientY-r.top)+'px';
    el.appendChild(ripple);setTimeout(()=>ripple.remove(),700);
  });

  // Animated number-like index and hero text entrance
  const hero=document.querySelector('.home-hero');
  if(hero && !reduce){
    hero.classList.add('fx-hero-ready');
    const h=hero.querySelector('h1');
    if(h){h.setAttribute('data-text',h.textContent.trim());}
  }
  // Add a small status pulse to the availability light
  const dot=document.querySelector('.status-dot');
  if(dot) dot.setAttribute('aria-label','Available for opportunities');
})();