var PREFIX='kana-al-dit-2-';
var CACHE=PREFIX+'v5.3';
var CORE=['./','index.html','manifest.json','icon-180.png','icon-192.png','icon-512.png'];
var NET_WAIT=3500;
/* Safari no accepta com a resposta d'una navegació una resposta amb redirecció: es copia sense la marca */
function clean(res){
  if(!res || !res.redirected) return Promise.resolve(res);
  return res.clone().blob().then(function(b){ return new Response(b, {status:res.status, statusText:res.statusText, headers:res.headers}); });
}
function store(c, key, res){
  if(!res || !res.ok || res.type==='opaqueredirect') return Promise.resolve();
  return clean(res).then(function(x){ return c.put(key, x); });
}
self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){
    return Promise.all(CORE.map(function(u){
      return fetch(new Request(u, {cache:'reload'})).then(function(r){ if(!r.ok) throw new Error('sw: '+u+' '+r.status); return store(c, u, r.clone()); });
    }));
  }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){ return k.indexOf(PREFIX)===0 && k!==CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
/* pàgines: primer la xarxa (amb temps màxim) i, si no hi és, la còpia; les altres coses: la còpia i s'actualitza al fons */
self.addEventListener('fetch', function(e){
  var req=e.request; if(req.method!=='GET') return;
  var url=new URL(req.url);
  var isFont=/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if(url.origin!==location.origin && !isFont) return;
  if(req.mode==='navigate'){
    e.respondWith(caches.open(CACHE).then(function(c){
      var fromCache=function(){ return c.match(req, {ignoreSearch:true}).then(function(h){ return h || c.match('index.html'); }); };
      return new Promise(function(resolve){
        var done=false;
        var finish=function(r){ if(!done && r){ done=true; resolve(r); } };
        var timer=setTimeout(function(){ fromCache().then(finish); }, NET_WAIT);
        fetch(req).then(function(res){
          if(res && res.ok){ store(c, 'index.html', res.clone()); clearTimeout(timer); clean(res).then(finish); }
          else { clearTimeout(timer); fromCache().then(function(h){ finish(h || res); }); }
        }).catch(function(){ clearTimeout(timer); fromCache().then(function(h){ finish(h || Response.error()); }); });
      });
    }));
    return;
  }
  e.respondWith(caches.open(CACHE).then(function(c){
    return c.match(req, {ignoreSearch:true}).then(function(hit){
      var net=fetch(req).then(function(res){ if(res && (res.ok || res.type==='opaque')) c.put(req, res.clone()); return res; }).catch(function(){ return hit; });
      return hit || net;
    });
  }));
});
