/* UNI · Service Worker
   Guarda a "casca" do app para abrir mesmo offline, sem nunca
   interferir nas chamadas ao Supabase (que precisam ir à rede). */

const CACHE = "uni-cache-v1";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); }).then(function(){ return self.skipWaiting(); }));
});

self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(e){
  var req = e.request;
  if(req.method !== "GET") return;                 // não mexe em gravações
  var url = new URL(req.url);
  if(url.origin !== self.location.origin) return;  // Supabase e fontes passam direto

  // Conteúdo do próprio app: rede primeiro (pega sempre a versão nova),
  // com o cache servindo de reserva quando estiver offline.
  e.respondWith(
    fetch(req).then(function(resp){
      var copy = resp.clone();
      caches.open(CACHE).then(function(c){ c.put(req, copy); }).catch(function(){});
      return resp;
    }).catch(function(){
      return caches.match(req).then(function(m){ return m || caches.match("./index.html"); });
    })
  );
});
