const CACHE='my-training-v57-hip-thrust-cache-bust';

const FILES=[

  './',
  './index.html',
  './assets/gym-background.svg',
  './workouts.json',
  './manifest.webmanifest',
  './assets/luxury-gym-bg.png',
  './assets/evolution-abstract.svg',
  './assets/evolution-figure.svg',
  './assets/evolution-portrait.webp',
  ...Array.from({length:40},(_,i)=>
    './assets/exercise-'+String(i+1).padStart(2,'0')+'.webp'+(i+1===22?'?v=hip-thrust-2':'')
  ),
  './assets/01-segunda-costas-biceps.png',
  './assets/02-terca-peito-ombros.png',
  './assets/03-quarta-pernas.png',
  './assets/04-quinta-costas-regiao-media.png',
  './assets/05-sexta-superiores.png',
  './assets/06-sabado-core-recuperacao.png'
];

self.addEventListener('install',e=>{
  e.waitUntil(
    caches.open(CACHE)
      .then(c=>c.addAll(FILES))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(
        keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))
      ))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',e=>{
  if(e.request.mode==='navigate'){
    e.respondWith(
      fetch(e.request).then(response=>{
        const copy=response.clone();
        caches.open(CACHE).then(cache=>cache.put(e.request,copy));
        return response;
      }).catch(()=>caches.match(e.request))
    );
    return;
  }
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
