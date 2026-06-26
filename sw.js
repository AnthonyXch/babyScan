/**
 * BabyHeadScan - Service Worker
 * 提供离线缓存支持，使App可作为PWA使用
 */

const CACHE_NAME = 'babyheadscan-v1.0.0';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './css/style.css',
    './js/camera.js',
    './js/head-analysis.js',
    './js/report.js',
    './js/app.js',
    './manifest.json'
];

// 安装事件 - 缓存核心资源
self.addEventListener('install', (event) => {
    console.log('[SW] 安装中...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] 缓存核心资源');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => {
                console.log('[SW] 安装完成');
                return self.skipWaiting();
            })
    );
});

// 激活事件 - 清理旧缓存
self.addEventListener('activate', (event) => {
    console.log('[SW] 激活中...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => {
                        console.log('[SW] 删除旧缓存:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => {
            console.log('[SW] 激活完成');
            return self.clients.claim();
        })
    );
});

// 请求拦截 - 缓存优先策略
self.addEventListener('fetch', (event) => {
    // 跳过非GET请求和chrome-extension请求
    if (event.request.method !== 'GET') return;
    
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // 命中缓存，直接返回
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                // 未命中，发起网络请求
                return fetch(event.request)
                    .then(response => {
                        // 只缓存成功的响应
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // 克隆响应（响应只能使用一次）
                        const responseToCache = response.clone();
                        
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, responseToCache);
                        });
                        
                        return response;
                    })
                    .catch(error => {
                        // 网络请求失败，返回离线页面（如果有的话）
                        console.warn('[SW] 网络请求失败:', event.request.url, error);
                        
                        // 对于导航请求，返回缓存的index.html
                        if (event.request.mode === 'navigate') {
                            return caches.match('./index.html');
                        }
                        
                        throw error;
                    });
            })
    );
});

console.log('[SW] Service Worker 已加载');