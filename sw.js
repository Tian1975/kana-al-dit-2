var PREFIX='kana-al-dit-2-';
var CACHE=PREFIX+'v5.2';
var CORE=['./','index.html','manifest.json','icon-180.png','icon-192.png','icon-512.png'];
self.addEventListener('install',function(e){ e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(CORE); }).then(function(){ return self.skipWaiting(); })); });
self.addEventListener('activate',function(e){ e.waitUntil(caches.keys().then(function(ks){ return Promise.all(ks.filter(function(k){ return k.indexOf(PREFIX)===0 && k!==CACHE; }).map(function(k){ return caches.delete(k); })); }).then(function(){ return self.clients.claim(); })); });
self.addEventListener('fetch',function(e){
  var req=e.request; if(req.method!=='GET') return;
  var url=new URL(req.url);
  var isFont=/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if(url.origin!==location.origin && !isFont) return;
  e.respondWith(caches.open(CACHE).then(function(c){
    return c.match(req, {ignoreSearch:true}).then(function(hit){
      var net=fetch(req).then(function(res){ if(res && (res.ok || res.type==='opaque')) c.put(req, res.clone()); return res; }).catch(function(){ return hit || (req.mode==='navigate' ? c.match('index.html') : undefined); });
      return hit || net;
    });
  }));
});
