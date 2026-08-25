
(function () {
    var SPARK_COLOR    = '#ffffff';
    var SPARK_SIZE     = 10;
    var SPARK_RADIUS   = 15;
    var SPARK_COUNT    = 8;
    var SPARK_DURATION = 400;
    var AUDIO_DIR  = '../audio/';
    var BG_VOLUME  = 0.7;   
    var CLICK_VOL  = 0.26;  
    var WOOD_VOL   = 0.36;  
    var FLIP_VOL   = 0.3;   
    var bgMusic          = null;
    var clickSound       = null;
    var audioBuilt       = false;   
    var bgStartedOnce    = false;   
    var K_BG_TIME  = '__bgm_time';
    var K_BG_UNLOCK = '__bgm_unlocked';
    var retryTimer       = null;
    var retryCount       = 0;
    var MAX_RETRY        = 20;

    function clickSpark(x, y) {
        for (var i = 0; i < SPARK_COUNT; i++) {
            var spark = document.createElement('div');
            var angle = (Math.PI * 2 * i) / SPARK_COUNT + (Math.random() - 0.5) * 0.4;
            var dist = SPARK_RADIUS * 6 * (0.8 + Math.random() * 0.4);
            spark.style.cssText =
                'position:fixed;left:' + x + 'px;top:' + y + 'px;' +
                'width:' + SPARK_SIZE + 'px;height:' + SPARK_SIZE + 'px;' +
                'background:' + SPARK_COLOR + ';border-radius:50%;' +
                'pointer-events:none;z-index:99999;' +
                'box-shadow:0 0 6px ' + SPARK_COLOR + ';' +
                'transition:transform ' + SPARK_DURATION + 'ms cubic-bezier(.2,.7,.2,1),' +
                'opacity ' + SPARK_DURATION + 'ms ease;';
            document.body.appendChild(spark);
            (function (sp, dx, dy) {
                requestAnimationFrame(function () {
                    sp.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(0)';
                    sp.style.opacity = '0';
                });
            })(spark, Math.cos(angle) * dist, Math.sin(angle) * dist);
            (function (sp) {
                setTimeout(function () { sp.remove(); }, SPARK_DURATION);
            })(spark);
        }
    }

    function clearRetryTimer() {
        if (retryTimer) {
            clearInterval(retryTimer);
            retryTimer = null;
        }
    }

    function buildAudio() {
        if (audioBuilt) return;
        audioBuilt = true;
        bgMusic = new Audio(AUDIO_DIR + '5.mp3');
        bgMusic.loop = true;
        bgMusic.volume = BG_VOLUME;
        bgMusic.preload = 'auto';
        try {
            var saved = localStorage.getItem(K_BG_TIME);
            if (saved) {
                var t = parseFloat(saved);
                if (!isNaN(t) && t > 0) {
                    var applyTime = function () {
                        try {
                            if (!isFinite(bgMusic.duration) || t < bgMusic.duration) {
                                bgMusic.currentTime = t;
                            }
                        } catch (e) {}
                    };
                    if (bgMusic.readyState >= 1) applyTime();
                    else bgMusic.addEventListener('loadedmetadata', applyTime, { once: true });
                }
            }
        } catch (e) {}
        clickSound = new Audio(AUDIO_DIR + '2.wav');
        clickSound.volume = CLICK_VOL;
        clickSound.preload = 'auto';
    }

    function tryStartBg() {
        if (!bgMusic) return;
        if (bgStartedOnce) return;
        // 如果视频正在播放，绝不启动背景音乐
        if (window.__videoPlaying) return;
        var pm = bgMusic.play();
        if (pm && typeof pm.then === 'function') {
            pm.then(function () {
                bgStartedOnce = true;
                clearRetryTimer();
                try { localStorage.setItem(K_BG_UNLOCK, '1'); } catch (e) {}
            }).catch(function () {
                // 播放失败，稍后重试
            });
        } else {
            // 旧浏览器兼容
            bgStartedOnce = true;
            clearRetryTimer();
            try { localStorage.setItem(K_BG_UNLOCK, '1'); } catch (e) {}
        }
    }

    function startRetryLoop() {
        if (retryTimer) return;
        retryTimer = setInterval(function () {
            retryCount++;
            if (bgStartedOnce || retryCount > MAX_RETRY) {
                clearRetryTimer();
                return;
            }
            // 视频播放期间不尝试启动
            if (window.__videoPlaying) return;
            tryStartBg();
        }, 800);
    }

    buildAudio();

    // 立即尝试
    tryStartBg();

    // 如已解锁标记，再尝试
    try {
        if (localStorage.getItem(K_BG_UNLOCK) === '1') {
            tryStartBg();
        }
    } catch (e) {}

    // DOMContentLoaded 后再尝试
    document.addEventListener('DOMContentLoaded', function () {
        tryStartBg();
    });

    // window load 后再尝试
    window.addEventListener('load', function () {
        tryStartBg();
        // 如果还没成功，启动轮询重试
        if (!bgStartedOnce) startRetryLoop();
    });

    // 页面可见性变化时尝试（切回标签页）
    document.addEventListener('visibilitychange', function () {
        if (!document.hidden) {
            tryStartBg();
        }
    });

    function playClick() {
        if (!clickSound) return;
        try {
            clickSound.currentTime = 0;
            clickSound.play().catch(function () {});
        } catch (e) {}
    }

    // 全局用户交互事件：只要发生任何交互就尝试解锁BGM
    function onUserGesture(e) {
        if (!audioBuilt) buildAudio();
        if (!bgStartedOnce && !window.__videoPlaying) tryStartBg();
    }
    document.addEventListener('click', function (e) {
        if (!audioBuilt) buildAudio();
        clickSpark(e.clientX, e.clientY);
        playClick();
        if (!bgStartedOnce && !window.__videoPlaying) tryStartBg();
    }, true);
    document.addEventListener('touchstart', onUserGesture, { once: true, passive: true });
    document.addEventListener('keydown', onUserGesture, { once: true });
    document.addEventListener('scroll', onUserGesture, { once: true, passive: true });

    function saveBgTime() {
        if (bgMusic && !isNaN(bgMusic.currentTime)) {
            try {
                localStorage.setItem(K_BG_TIME, bgMusic.currentTime);
            } catch (e) {}
        }
    }
    window.addEventListener('beforeunload', saveBgTime);
    window.addEventListener('pagehide', saveBgTime);
  
    setInterval(saveBgTime, 3000);

    window.__playWood = function () {
        var s = new Audio(AUDIO_DIR + '木块.wav');
        s.volume = WOOD_VOL;
        s.play().catch(function () {});
    };
   
    window.__playFlip = function () {
        var s = new Audio(AUDIO_DIR + '翻.wav');
        s.volume = FLIP_VOL;
        s.play().catch(function () {});
    };

    // 暂停 / 恢复背景音乐（供视频播放时调用）
    window.__pauseBg = function () {
        if (bgMusic && !bgMusic.paused) bgMusic.pause();
    };
    window.__resumeBg = function () {
        // 视频还在播放时不恢复
        if (window.__videoPlaying) return;
        if (bgMusic && bgMusic.paused) {
            var pm = bgMusic.play();
            if (pm && typeof pm.then === 'function') {
                pm.then(function () {
                    bgStartedOnce = true;
                    clearRetryTimer();
                }).catch(function () {});
            } else {
                bgStartedOnce = true;
                clearRetryTimer();
            }
        }
    };
})();
