// 服务工作线程版本
const CACHE_NAME = 'medical-pump-calculator-v1.0.0';

// 需要缓存的资源列表
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/assets/icons/icon-192x192.png',
  '/assets/splash/splash.png',
  'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// 安装事件 - 预缓存核心资源
self.addEventListener('install', event => {
  console.log('Service Worker: 安装中');
  
  // 等待直到缓存完成
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: 缓存资源');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', event => {
  console.log('Service Worker: 激活中');
  
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: 删除旧缓存', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// fetch事件 - 拦截网络请求
self.addEventListener('fetch', event => {
  console.log('Service Worker: 拦截请求', event.request.url);
  
  event.respondWith(
    // 尝试从缓存中获取响应
    caches.match(event.request)
      .then(response => {
        // 如果找到缓存的响应，则返回它
        if (response) {
          console.log('Service Worker: 从缓存返回', event.request.url);
          return response;
        }
        
        // 否则发起网络请求
        console.log('Service Worker: 发起网络请求', event.request.url);
        return fetch(event.request)
          .then(response => {
            // 检查响应是否有效
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // 克隆响应，因为响应是流，只能使用一次
            const responseToCache = response.clone();
            
            // 将新的响应添加到缓存中
            caches.open(CACHE_NAME)
              .then(cache => {
                console.log('Service Worker: 缓存新资源', event.request.url);
                cache.put(event.request, responseToCache);
              })
              .catch(error => {
                console.error('Service Worker: 缓存失败', error);
              });
            
            return response;
          })
          .catch(error => {
            console.error('Service Worker: 网络请求失败', error);
            
            // 如果是导航请求，返回缓存的首页
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// 后台同步事件
self.addEventListener('sync', event => {
  if (event.tag === 'sync-history') {
    console.log('Service Worker: 执行后台同步');
    event.waitUntil(syncHistory());
  }
});

// 推送通知事件
self.addEventListener('push', event => {
  console.log('Service Worker: 收到推送通知', event.data);
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/icon-192x192.png',
    data: {
      url: data.url
    }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// 点击通知事件
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: 通知被点击');
  
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({type: 'window'})
      .then(windowClients => {
        // 如果已经有打开的窗口，则聚焦到该窗口
        for (let client of windowClients) {
          if (client.url === event.notification.data.url && 'focus' in client) {
            return client.focus();
          }
        }
        
        // 否则打开新窗口
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url);
        }
      })
  );
});

// 同步历史记录的函数（示例）
function syncHistory() {
  return new Promise((resolve, reject) => {
    // 这里可以实现与服务器同步历史记录的逻辑
    console.log('Service Worker: 同步历史记录');
    resolve();
  });
}