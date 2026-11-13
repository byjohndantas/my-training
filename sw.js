const CACHE='my-training-v12';

const FILES=[

  './',
  './index.html',
  './workouts.json',
  './manifest.webmanifest',
  './assets/luxury-gym-bg.png',
  ...Array.from({length:39},(_,i)=>
    './assets/exercise-'+String(i+1).padStart(2,'0')+'.webp'
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
  e.respondWith(
    caches.match(e.request).then(r=>r||fetch(e.request))
  );
});
