/**
 * @author: backpackerxl 2025/1/19
 * @description: 这是一个歌词渲染工具
 */
const LrcOrLyrcKit = (function (win, doc) {
    /** 歌词渲染开始 */
    // 原始歌词处理后的歌词数据容器
    let _song_word = [],
        _lrcNodeArr = [], // 歌词容器
        _lrcContainer = null,
        _initOpt = null,
        _startPlay = null,
        _showTag = 'show',
        _moveTag = true,
        _animationId = null,
        _oldNode = null,
        _oNowSpan = null,
        _nowDuration = 0,
        _textMoveAnId = null,
        _splitLetter = false,
        _circleAnimateArr = [],
        _pAnimateArr = [],
        _halfContainerH = 0,
        _lyricJump = false,
        _uniqueAttribute = `data-lrc-${Math.random().toString(36).substring(2, 8)}`,
        _audio = null;

    function _doStyleCss() {
        const baseCSS = `p[${_uniqueAttribute}]:first-child{margin-top:calc(var(--lrcHeight) / 3);}p[${_uniqueAttribute}]:last-child{margin-bottom:var(--lrcHeight);}.hide-tlyric p[${_uniqueAttribute}].tly_word{display:none;}p[${_uniqueAttribute}]{color:var(--baseColor);transition: all .2s;margin:var(--pMargin) 0;padding:0;font-size:var(--fontSize);text-align:var(--textAlign);line-height:var(--lineHeight)}p[${_uniqueAttribute}] span{padding-right:.5rem;}p[${_uniqueAttribute}].tly_word{margin:0 !important;font-size: var(--tlyricSize);line-height:var(--tlyricLineHeight)}p[${_uniqueAttribute}].color{color:var(--hilightColor);}p[${_uniqueAttribute}] span.circle{display: none;}p[${_uniqueAttribute}].now span.circle{display: inline-block;width: var(--circleSize);height: var(--circleSize);border-radius: 50%;background-color: var(--baseColor);margin: 0 .4rem;padding: 0 !important;animation: lrc-bounce 500ms infinite alternate;animation-delay: calc(var(--delay) * 1ms);}@keyframes lrc-bounce {to{opacity: .1;transform: translateY(-.5rem) scale(1.2);}}`;
        const nCSS = `p[${_uniqueAttribute}] span.color{color:var(--hilightColor) !important}p[${_uniqueAttribute}] span.now {--progress:100;color: transparent;background-clip: text;-webkit-background-clip: text;background-image:linear-gradient(to left, var(--baseColor) calc(var(--progress) * 1%),var(--hilightColor)  0%);}`;
        const styleCss = doc.createElement('style');
        styleCss.textContent = baseCSS + nCSS;
        doc.documentElement.querySelector('head').appendChild(styleCss);
    }

    _doStyleCss(); // 初始化样式

    // 渲染歌词，并初始化歌词数据，方便后面的歌词动效的使用
    function _renderLrc(opt) {
        // 清空容器
        _lrcNodeArr = [];
        _song_word = [];
        const { el } = _initOpt;
        const { lyric_data, tlyric_lyric, func, splitLetter } = opt;

        if (!el || !lyric_data || !func) {
            throw new Error("The mount el or lyric data or lyric processing func for rendering views cannot be empty.");
        }

        _splitLetter = splitLetter || false;
        if (!(el instanceof Node)) {
            throw new Error('el not an element node.');
        }
        // 清空歌词
        el.innerText = '';

        if (!(func instanceof Function)) {
            throw new Error('func not a function.');
        }

        // 处理lyrc歌词数据
        func(lyric_data, tlyric_lyric);
        // 歌词文档碎片容器
        const lrcTpl = doc.createDocumentFragment();
        let son_len = _song_word.length - 1;
        _song_word.forEach((item, idx) => {
            let objTemp = {};
            let spanArr = [];
            let last_time = item.current_time;
            const p = doc.createElement('p');
            p.setAttribute(_uniqueAttribute, '');
            p.dataset.time = item.current_time;
            if (item.word_arr.length > 0) {
                let wd = item.word_arr[item.word_arr.length - 1];
                last_time = (wd[0][0] + wd[0][1]) / 1000;
                const spanTpl = doc.createDocumentFragment();
                item.word_arr.forEach(word => {
                    const span = doc.createElement('span');
                    if (_splitLetter) {
                        span.innerHTML = word[1].replace(/\S/g, '<b>$&</b>');
                        let startDelay = 0,
                            longTime = word[0][1];
                        const bC = span.querySelectorAll('b');
                        if (bC.length > 0) {
                            longTime = Math.floor(longTime / bC.length); // 单个字母的持续时间
                            bC[0].style.setProperty('--delay', 0 + 'ms'); // 设置第一个
                            bC[0].style.setProperty('--duration', longTime + 'ms'); // 设置第一个
                            for (let i = 1; i < bC.length; i++) {
                                bC[i].style.setProperty('--delay', `${startDelay += longTime}ms`);
                                bC[i].style.setProperty('--duration', longTime + 'ms');
                            }
                        }
                    } else {
                        span.innerText = word[1];
                    }
                    spanTpl.appendChild(span);
                    spanArr.push({
                        span: span,
                        stm: word[0][0] / 1000,
                        duration: word[0][1]
                    });
                });
                p.appendChild(spanTpl);
            } else {
                p.innerText = item.word;
            }
            lrcTpl.appendChild(p);
            if (item.tly_word) {
                const pTly = doc.createElement('p');
                pTly.setAttribute(_uniqueAttribute, '');
                pTly.innerText = item.tly_word;
                pTly.className = 'tly_word';
                objTemp.tlyric_node = pTly;
                p.appendChild(pTly);
            }
            objTemp.idx = idx;
            objTemp.target_node = p;
            objTemp.span_arr = spanArr;
            objTemp.time = item.current_time;
            _lrcNodeArr.push(objTemp);

            let diff = _song_word[Math.min(son_len, idx + 1)].current_time - last_time;
            if (diff > 6) {
                const oP = doc.createElement('p');
                for (let k = 0; k < 3; k++) {
                    const oSpan = doc.createElement('span');
                    oSpan.classList.add("circle");
                    oSpan.style.setProperty("--delay", 180 * k);
                    oP.appendChild(oSpan);
                }
                oP.dataset.time = last_time + 1;
                oP.dataset.duration = diff.toFixed(2);
                oP.setAttribute(_uniqueAttribute, '');
                lrcTpl.appendChild(oP);
                _lrcNodeArr.push({
                    target_node: oP,
                    span_arr: [],
                    time: item.current_time + 1
                });
            }
        });

        el.appendChild(lrcTpl);
        _addBr();
        if (_audio.currentTime !== 0) {
            _toCurrentLyrc(_audio.currentTime); // 调一次定位函数
        }
    }

    function _addBr() {
        // 先删除
        _lrcContainer.querySelectorAll('br').forEach(oBr => {
            oBr.remove();
        });
        let lw = _initOpt.lineWidth || 300;
        // 处理每个歌词的宽度
        _lrcNodeArr.forEach(node => {
            node.span_arr.forEach(obj => {
                obj.offsetWidth = obj.span.offsetWidth;
            });
        });
        // 处理单词换行
        for (let node of _lrcNodeArr) {
            const p = node.target_node;
            node.span_arr.reduce((init, obj) => {
                let tw = init + obj.offsetWidth;
                if (tw > lw) {
                    p.insertBefore(doc.createElement('br'), obj.span);
                    tw = 0;
                }
                return tw;
            }, 0);
        }
    }


    // 处理特殊歌词
    function _doSpecialLyric(lyric) {
        // 处理头部歌词兼容问题
        if (/^\{.*\}$/.test(lyric)) {
            // {\"t\":0,\"c\":[{\"tx\":\"作词: \"},{\"tx\":\"Andy Love\"}]}
            let objJSON = JSON.parse(lyric);
            // 这里的计算只处理头部歌词的问题，其他的暂不处理
            return `[00:${objJSON.t / 1000}]${objJSON.c[0].tx}${objJSON.c[1].tx}`;
        }
        return lyric;
    }


    // 处理普通歌词
    function _doLrcLyric(lyric_data, tlyric_lyric) {
        let song_word_lyrc = lyric_data.split("\n");
        let son_tlyric = [];

        if (tlyric_lyric) {
            son_tlyric = tlyric_lyric.split("\n");
        }

        const var_reg = /\[.+?\]/;

        // 处理歌词
        song_word_lyrc = song_word_lyrc.map(item => {
            item = _doSpecialLyric(item);
            const temp = item.match(var_reg);
            // 处理歌词
            if (temp) {
                return {
                    current_time: _doLyricTime(temp[0]),
                    word: item.replace(var_reg, "").trim(),
                    word_arr: []
                };
            }
            return null;
        }).filter(item => item !== null);

        const tlyricMap = new Map();

        // 处理翻译
        son_tlyric.forEach(item => {
            item = _doSpecialLyric(item);
            const temp = item.match(var_reg);
            // 处理歌词
            if (temp) {
                tlyricMap.set(_doLyricTime(temp[0]), item.replace(var_reg, "").trim());
            }
            return null;
        });

        song_word_lyrc.forEach((item, idx) => {
            // 处理歌词为空
            if (item.word !== '') {
                _song_word.push({ ...item, tly_word: tlyricMap.get(item.current_time) || null, idx: idx });
            }
        });
    }

    // 处理逐字歌词
    function _doYrcLyric(lyric_data, tlyric_lyric) {
        let song_word_lyrc = lyric_data.split("\n");
        let son_tlyric = [];

        if (tlyric_lyric) {
            son_tlyric = tlyric_lyric.split("\n");
        }

        const var_reg = /\[.+?\]/;

        // 处理歌词
        song_word_lyrc = song_word_lyrc.map(item => {
            item = _doSpecialYLyric(item);
            const temp = item.match(var_reg);
            // 处理歌词
            if (temp) {
                let t = temp[0].replace(/^\[/, "").replace(/\]$/, "");
                let t_arr = t.split(",");
                return {
                    current_time: t_arr[0] / 1000,
                    word: item.replace(var_reg, "").replaceAll(/\(.+?\)/g, '').trim(),
                    word_arr: _handleOneYrc(item)
                };
            }
            return null;
        }).filter(item => item !== null);

        const tlyricMap = new Map();

        // 处理翻译
        son_tlyric.forEach(item => {
            item = _doSpecialYLyric(item);
            const temp = item.match(var_reg);
            // 处理歌词
            if (temp) {
                tlyricMap.set(_doLyricTime(temp[0]), item.replace(var_reg, "").trim());
            }
            return null;
        });

        song_word_lyrc.forEach((item, idx) => {
            _song_word.push({ ...item, tly_word: tlyricMap.get(item.current_time) || null, idx: idx });
        });
    }

    // 处理单个歌词特殊歌词
    function _doSpecialYLyric(lyric) {
        // 处理头部歌词兼容问题
        if (/^\{.*\}$/.test(lyric)) {
            // {\"t\":0,\"c\":[{\"tx\":\"作词: \"},{\"tx\":\"Andy Love\"}]}
            let objJSON = JSON.parse(lyric);
            // 这里的计算只处理头部歌词的问题，其他的暂不处理
            return `[${objJSON.t},0]${objJSON.c[0].tx}${objJSON.c[1].tx}`;
        }
        return lyric;
    }

    // 处理单个歌词数据
    function _handleOneYrc(lyrc) {
        // 定义正则表达式模式，匹配歌词的结构
        let pattern = /\((\d+),(\d+),(\d+)\)([\u4e00-\u9fa5]+|[a-z|’|']+|[.,;:'"]+)/gi;
        let result = [];
        let match;
        // 循环查找匹配项
        while ((match = pattern.exec(lyrc)) !== null) {
            // 提取数字部分并转换为整数
            let numbers = [parseInt(match[1]), parseInt(match[2])];
            // 提取文字部分
            let text = match[4];
            result.push([numbers, text]);
        }
        return result;
    }

    // 处理歌词时间
    function _doLyricTime(time) {
        let t = time.replace(/^\[/, "").replace(/\]$/, "");
        let t_arr = t.split(":");
        return parseFloat((t_arr[0] * 60 + parseFloat(t_arr[1])).toFixed(3));
    }

    /** 歌词渲染结束 */

    /** 歌词工具初始化 */
    function _init(opt) {
        // 保存初始化参数
        _initOpt = opt;

        _halfContainerH = opt.el.getBoundingClientRect().height / 2;
        // 保存歌词容器
        _lrcContainer = opt.el;
        // 保存配置
        if (opt.lyricJump) {
            _lyricJump = opt.lyricJump;
        }

        if (opt.bindAudio) {
            _bindAudio({ el: opt.bindAudio })
        } else {
            console.warn("No setting audio control, so it is impossible to achieve lyrics scrolling and highlighting along with the song.")
        }
        if (opt.bindPlacePlay) {
            _bindPlacePlay(opt.bindPlacePlay);
        } else {
            console.warn("If the click to play configuration is not set, the function of scrolling to the specified lyrics and clicking to play cannot be achieved.")
        }
    }

    /** 歌词工具初始化结束 */

    /** 歌词绑定播放器 */
    function _bindAudio(opt) {
        if (!opt.el) {
            throw new Error("Not find el properties.");
        }

        if (!(opt.el instanceof HTMLAudioElement)) {
            throw new Error('el not a HTML Audio player.');
        }

        _audio = opt.el;
        // 监听audio的播放事件, 并实现歌词动效
        // 节约性能，停止播放后移除动画帧
        _audio.addEventListener('pause', function () {
            cancelAnimationFrame(_animationId);
            cancelAnimationFrame(_textMoveAnId);
        });

        let timer;

        // 监听播放事件
        _audio.addEventListener('play', function () {
            _normal = true;
            if (timer) {
                clearTimeout(timer);
            }
            if (_oNowSpan && _nowDuration) {
                const nowP = win.getComputedStyle(_oNowSpan).getPropertyValue('--progress');
                _addProgress(_oNowSpan, _nowDuration - _nowDuration * nowP / 100, nowP);
            }
            _timerMove();
            timer = setTimeout(() => {
                _normal = false;
            }, 600);
        });
    }

    // 执行移动动画
    function _timerMove() {
        _moveLyrc(_audio.currentTime);
        _animationId = requestAnimationFrame(_timerMove)
    }

    /**
     * 移动歌词并实时高亮
     * @param currentTime 当前audio的播放时间
     * @param oldNode 初始节点
     * @private
     */
    function _moveLyrc(currentTime) {
        let targetNode = null;
        // 查找高亮目标节点
        for (let i = 0; i < _lrcNodeArr.length; i++) {
            const p = _lrcNodeArr[i].target_node;
            if (i === _lrcNodeArr.length - 1 && p.dataset.time < currentTime) {
                targetNode = _lrcNodeArr[i];
                break;
            }
            if (p.dataset.time < currentTime && _lrcNodeArr[i + 1].target_node.dataset.time > currentTime) {
                targetNode = _lrcNodeArr[i];
                break;
            }
        }

        if (targetNode && _oldNode !== targetNode) {
            const span_arr = targetNode.span_arr;
            // 清除高亮样式
            if (_oldNode) {
                _oldNode.target_node.className = '';
                _oldNode.span_arr.forEach(el => {
                    el.span.className = '';
                    el.span.style.setProperty('--progress', '100');
                });
            }

            targetNode.target_node.className = 'now';
            // 判断有没有span标签
            if (span_arr.length <= 0) {
                targetNode.target_node.classList.add('color');
            }
            // 更新oldNode
            _oldNode = targetNode;
            if (_moveTag) {
                // 处理歌词滚动
                if (_startPlay) {
                    _startPlay.classList.remove(_showTag);
                }
                _lrcMove(300, _oldNode.target_node);
            }
        } else if (targetNode) {
            // 歌词逐字高亮文字动效
            const span_arr = targetNode.span_arr;
            if (span_arr.length > 0) {
                span_arr.forEach(el => {
                    if (el.stm <= currentTime && el.span.classList.length === 0) {
                        el.span.classList.add('now');
                        _addProgress(el.span, el.duration, 100);
                        // 缓存一波数据
                        _oNowSpan = el.span;
                        _nowDuration = el.duration;
                    }
                });
            }
        }
    }

    /**
     * 动态变化
     * @param {持续时间} duration 
     */
    function _addProgress(span, duration, nowP) {
        let start = null; // 记录动画开始的时间
        // 处理极端情况
        if (duration === 0) {
            span.style.setProperty(`--progress`, `0`);
            return;
        }

        function step(timestamp) {
            if (!start) start = timestamp; // 如果是第一帧，记录开始时间
            const progress = timestamp - start; // 计算已经过去的时间
            // 根据进度比例计算当前值
            let currentValue = nowP * ((duration - progress) / duration);
            // 确保currentValue不会小于0
            currentValue = Math.max(currentValue, 0);
            span.style.setProperty(`--progress`, `${currentValue}`);
            // 如果还没达到目标时间且currentValue不为0，则继续下一帧
            if (progress < duration && currentValue > 0) {
                _textMoveAnId = requestAnimationFrame(step);
            }
        }
        // 开始动画
        _textMoveAnId = requestAnimationFrame(step);
    }

    function _calcLyric() {
        let idx = 0;
        _lrcNodeArr.forEach((node) => {
            let oP = node.target_node;
            let bound = oP.getBoundingClientRect();
            if (bound.top >= _halfContainerH * -0.5 && bound.top < _halfContainerH * 3) {
                pAn = oP.animate([
                    { transform: 'translateY(-2.4rem)' },
                ], {
                    easing: "linear",
                    duration: 360,
                    fill: "forwards",
                    delay: idx * 36
                });
                _pAnimateArr.push(pAn);
                idx++;
            }
        });
    }

    /**
     * 歌词滚动
     * 滚动参数
     */
    function _lrcMove(sn, target) {
        // 清除动画
        _pAnimateArr.forEach(pAn => {
            pAn.cancel();
        });
        if (_lyricJump) {
            _calcLyric();
        }
        // 处理等待动画
        if (target.dataset.duration) {
            // 清除动画
            _circleAnimateArr.forEach(an => {
                an.cancel();
            });
            let diff = +target.dataset.duration - 1.3;
            target.querySelectorAll('span').forEach((oSpan, k) => {
                let an = oSpan.animate([
                    { opacity: 0 }
                ], {
                    easing: "ease",
                    duration: 80,
                    fill: "forwards",
                    delay: diff * 1000 - 500 * k
                })
                _circleAnimateArr.push(an);
            });
        }
        _smoothScroll(
            _lrcContainer,
            target.offsetTop - _halfContainerH,
            sn
        );
    }

    /**
     * 让滚动条匀速移动
     * @param el 操作节点
     * @param targetY 目标点的高度
     * @param duration 动画持续的时间
     */
    function _smoothScroll(el, targetY, duration) {
        const start = el.scrollTop;

        const startTime = performance.now();

        function animateScroll(currentTime) {
            // 计算已经过去的时间
            const elapsedTime = currentTime - startTime;
            // 计算当前应该滚动到的位置
            const progress = Math.min(elapsedTime / duration, 1);
            el.scrollTo(0, start + (targetY - start) * progress);

            // 如果动画没有完成，则继续调用 requestAnimationFrame
            if (progress < 1) {
                requestAnimationFrame(animateScroll);
            }
        }

        // 开始动画
        requestAnimationFrame(animateScroll);
    }

    /** 歌词绑定播放器结束 */

    /** 指定歌词播放 **/
    // 通过毫秒获取标准时间
    function _getMusicTime(total_sec) {
        if (Number.isNaN(total_sec)) {
            return '00:00';
        }
        let min = Math.floor(total_sec / 60),
            sec = Math.floor(total_sec % 60);
        min = min >= 10 ? min : `0${min}`;
        sec = sec >= 10 ? sec : `0${sec}`;
        return `${min}:${sec}`;
    }

    // 开始处理指定歌词播放问题
    function _bindPlacePlay(opt) {
        let
            _startMoveCallBack = null,
            _onMoveCallBack = null,
            _stopMoveCallBack = null,
            _clickCallBack = null,
            _unMoveCallBack = null,
            _animateId = null,
            _mH = 0,
            _movePlay = false;

        const pcT = opt.pcTimer || 1200;
        const mbT = opt.mbTimer || 800;
        const tagT = opt.timeTagTimer || 6000;

        if (opt.startMoveCallBack && opt.startMoveCallBack instanceof Function) {
            _startMoveCallBack = opt.startMoveCallBack.bind(opt);
        } else {
            console.warn('The callback function for starting the scrolling of the set lyrics has failed, and the reference object for clicking to play cannot be displayed during the scrolling of the lyrics.');
        }

        if (opt.onMoveCallBack && opt.onMoveCallBack instanceof Function) {
            _onMoveCallBack = opt.onMoveCallBack.bind(opt);
        } else {
            console.warn('The callback function executed during the set lyrics scrolling has failed, and real-time linkage between scrolling lyrics and clicking on reference objects cannot be achieved.');
        }

        if (opt.stopMoveCallBack && opt.stopMoveCallBack instanceof Function) {
            _stopMoveCallBack = opt.stopMoveCallBack.bind(opt);
        } else {
            console.warn('The callback function executed after the set lyrics scroll ends failed, and there will be no operation after the scroll ends.');
        }

        if (opt.unMoveCallBack && opt.unMoveCallBack instanceof Function) {
            _unMoveCallBack = opt.unMoveCallBack.bind(opt);
        } else {
            console.warn('The callback function executed after the set lyrics scroll is completed fails, and the scrolling reference will not be released.');
        }

        if (opt.clickCallBack && opt.clickCallBack instanceof Function) {
            _clickCallBack = opt.clickCallBack.bind(opt);
        }

        let oldTar = null,// 定义定时器
            wheel_timer,
            show_timer, moveY;
        opt.getMusicTime = _getMusicTime; // 绑定时间格式化工具

        let _startPlay = opt.startPlay;
        if (_startPlay) {
            _startPlay.addEventListener('click', function () {
                if (_oldNode) {
                    _oldNode.target_node.classList.remove('now');
                    _oldNode.span_arr.forEach(oSpan => {
                        oSpan.span.className = '';
                        oSpan.span.style.setProperty('--progress', '100');
                    });
                }
                _audio.currentTime = oldTar.target_node.dataset.time;
                _movePlay = false;
                cancelAnimationFrame(_animateId); // 取消动画
                _unMoveCallBack && _unMoveCallBack(); // 卸载参照物
                _clickCallBack && _clickCallBack(); //调用点击后的播放
                _moveTag = true;
            });
        }

        // 初始化定点的坐标信息
        const targetRect = _startPlay.getBoundingClientRect();
        const targetRectTop = targetRect.top;
        const targetRectBottom = targetRect.bottom;

        // 定位歌词
        function posLyric() {
            _moveTag = false; // 暂停歌词自动滚动
            _pAnimateArr.forEach(pAn => {
                pAn.cancel();
            });
            let nowLine, targetRectHeight;
            if (_lrcNodeArr.length > 0) {
                _mH = win.getComputedStyle(_lrcNodeArr[0].target_node).marginBottom.replace('px', '') * 2; // 计算margin值
            }

            function findPToLight() {
                for (let i = 0; i <= _lrcNodeArr.length; i++) {
                    let line = _lrcNodeArr[i];
                    if (line) {
                        if (line.target_node.dataset.duration) {
                            line = _lrcNodeArr[Math.min(_lrcNodeArr.length - 1, i + 1)];
                        }
                        const lineRect = line.target_node.getBoundingClientRect();
                        if (lineRect.top > targetRectTop && lineRect.bottom - lineRect.height < targetRectBottom) {
                            nowLine = line;
                            targetRectHeight = lineRect.height + _mH;
                            moveY = _lrcContainer.scrollTop + lineRect.top - targetRectTop + lineRect.height / 2 - targetRectHeight / 2;
                            break;
                        }
                    }
                }

                if (nowLine && nowLine !== oldTar) {
                    oldTar = nowLine;
                    opt.nowLine = nowLine;
                    opt.targetRectHeight = targetRectHeight;
                    // 执行开始滚动的回调函数
                    _onMoveCallBack && _onMoveCallBack();
                }
                if (_movePlay) {
                    _animateId = requestAnimationFrame(findPToLight);
                }
            }

            _animateId = requestAnimationFrame(findPToLight);

        }

        // 清除滚动提示
        function _clearTips() {
            _unMoveCallBack && _unMoveCallBack(); // 卸载参照物
            _moveTag = true;
            if (_oldNode) {
                let temp = _lyricJump;
                _lyricJump = false;
                _lrcMove(200, _oldNode.target_node);
                if (temp) {
                    _lyricJump = true;
                }
            }
        }

        // 监听鼠标滚轮事件，实现定点播放
        _lrcContainer.addEventListener('wheel', () => {
            // 滚动开始
            _startMoveCallBack && _startMoveCallBack();
            _movePlay = true;
            posLyric();

            // 清除滚轮事件
            if (wheel_timer) {
                clearTimeout(wheel_timer);
            }

            if (show_timer) {
                clearTimeout(show_timer);
            }

            // 延时滚动回弹
            wheel_timer = setTimeout(() => {
                // 滚动暂停
                _stopMoveCallBack && _stopMoveCallBack();
                _movePlay = false;
                cancelAnimationFrame(_animateId); // 取消动画
                // 延时关闭
                show_timer = setTimeout(_clearTips, tagT);
                if (moveY) {
                    _smoothScroll(
                        _lrcContainer,
                        moveY,
                        60
                    );
                }
            }, pcT);

        }, { passive: true });

        let startY = 0,
            offsetY = 0;
        // 监听移动端滚动事件
        _lrcContainer.addEventListener('touchstart', (e) => {
            // 清除滚轮事件
            if (wheel_timer) {
                clearTimeout(wheel_timer);
            }
            if (show_timer) {
                clearTimeout(show_timer);
            }
            // 滚动开始
            _startMoveCallBack && _startMoveCallBack();
            _movePlay = true;
            startY = e.touches[0].clientY;
        }, { passive: true });

        _lrcContainer.addEventListener('touchmove', (e) => {
            posLyric();
            offsetY = Math.abs(e.touches[0].clientY - startY);
        }, { passive: true });

        // 监听移动端滚动事件
        _lrcContainer.addEventListener('touchend', () => {
            if (offsetY > 0) {
                // 延时滚动回弹
                wheel_timer = setTimeout(() => {
                    offsetY = 0;
                    // 滚动暂停
                    _stopMoveCallBack && _stopMoveCallBack();
                    _movePlay = false;
                    cancelAnimationFrame(_animateId); // 取消动画
                    // 延时关闭
                    show_timer = setTimeout(_clearTips, tagT);
                    if (moveY) {
                        _smoothScroll(
                            _lrcContainer,
                            moveY,
                            60
                        );
                    }
                }, mbT);
            }
        }, { passive: true });
    }

    /** 指定歌词播放结束 **/

    /** 跳转到指定歌词播放位置 */
    function _toCurrentLyrc(target) {
        if (Number.isNaN(target)) {
            return;
        }
        // 清空样式
        if (_oldNode) {
            _oldNode.target_node.classList.remove('now');
            _oldNode.span_arr.forEach(oSpan => {
                oSpan.span.className = '';
                oSpan.span.style.setProperty('--progress', '100');
            });
        }
        let node = _lrcNodeArr.reduce((prev, curr) => {
            return Math.abs(curr.time - target) < Math.abs(prev.time - target) && curr.time < target && !curr.target_node.dataset.duration ? curr : prev;
        });
        node.span_arr.forEach(spanNode => {
            if (spanNode.stm < target) {
                spanNode.span.classList.add('color');
            }
        });

        _audio.currentTime = target;
        node.target_node.classList.add('now');
        let temp = _lyricJump;
        _lyricJump = false;
        _lrcMove(200, node.target_node);
        if (temp) {
            _lyricJump = true;
        }
        _oldNode = node;
    }
    /** 结束跳转 */

    /** 显示缩略图 */
    function _showThumLryc(target, oNode, highlight, num) {
        if (Number.isNaN(target)) {
            return;
        }
        let node = _song_word.reduce((prev, curr) => {
            return Math.abs(curr.current_time - target) < Math.abs(prev.current_time - target) && curr.current_time < target ? curr : prev;
        });

        let idx = node.idx,
            lastIdx = _song_word.length - 1;

        let nodeArr = [];
        if (num === 0) {
            nodeArr.push({ ...node, flag: true });
        } else {
            let prevNodeArr = new Set();
            let suffixNodeArr = new Set();
            for (let i = 0; i < num; i++) {
                if (idx > 0) {
                    prevNodeArr.add(_song_word[Math.max(idx - num + i, 0)]);
                }
                if (idx > 0 && idx !== lastIdx) {
                    suffixNodeArr.add(_song_word[Math.min(idx + i + 1, lastIdx)]);
                }
            }
            nodeArr = [...prevNodeArr, { ...node, flag: true }, ...suffixNodeArr];
        }

        const pTpl = doc.createDocumentFragment();

        nodeArr.forEach(item => {
            const p = doc.createElement('p');
            p.innerText = item.word;
            if (item.tly_word) {
                const pTly = doc.createElement('p');
                pTly.innerText = item.tly_word;
                pTly.className = 'tly_word';
                p.appendChild(pTly);
            }
            if (item.flag) {
                p.classList.add(highlight);
            }
            pTpl.appendChild(p);
        });

        oNode.innerHTML = '';
        oNode.appendChild(pTpl);
    }
    /**  End */

    return {
        init(opt) {
            _init(opt);
            return {
                renderLrc(opt) {
                    _renderLrc(opt);
                },
                addBr() {
                    _addBr();
                },
                translation() {
                    _lrcContainer.classList.toggle('hide-tlyric');
                },
                doLrcLyric: _doLrcLyric,
                doYrcLyric: _doYrcLyric
            }
        },
        toCurrentLyrc(currentTime) {
            _toCurrentLyrc(currentTime);
        },
        getMusicTime(currentTime) {
            return _getMusicTime(currentTime);
        },
        showThumLryc(currentTime, oNode, highlight, num) {
            _showThumLryc(currentTime, oNode, highlight, num);
        }
    };
})(window, document);


/**
 * @author: backpackerxl 2025/2/15
 * @description: 这是音乐播放器控件控制工具
 */
const MusicBarControl = (function (win, doc) {
    let _moveAnId = null,
        _cNow = 0,
        _width = 0,
        _uniqueAttribute = `data-bar-${Math.random().toString(36).substring(2, 8)}`;
    _showLyrc = 0;

    function _doCSS() {
        let normalCSS = `.progress-under[${_uniqueAttribute}],.progress-mid[${_uniqueAttribute}],.progress-top[${_uniqueAttribute}]{height:var(--bar-height);border-radius:calc(var(--bar-height) / 2);position:absolute;top:0;left:0;transform:translateY(calc(var(--pg-height) / 2));transition:all .3s}.progress-under.scale[${_uniqueAttribute}],.progress-mid.scale[${_uniqueAttribute}],.progress-top.scale[${_uniqueAttribute}]{height:calc(var(--bar-height) + .2rem);border-radius:calc(var(--bar-height) / 2 + .1rem)}.progress-under[${_uniqueAttribute}]{width:inherit;background-color:var(--bar-under-bg)}.progress-mid[${_uniqueAttribute}]{width:0%;background-color:var(--bar-mid-bg)}.progress-top[${_uniqueAttribute}]{width:0%;background-color:var(--bar-top-bg)}.slider[${_uniqueAttribute}]{width:var(--slider-size);height:var(--slider-size);border-radius:calc(var(--slider-size) / 2);background-color:var(--slider-bg);position:absolute;right:calc(var(--slider-size) / -2);top:calc(var(--slider-size) / -4);transition:all .3s}.slider[${_uniqueAttribute}].dragging{cursor:grabbing !important}.progress[${_uniqueAttribute}].dragging{cursor:grabbing !important}.progress-top[${_uniqueAttribute}].scale .slider[${_uniqueAttribute}],.slider[${_uniqueAttribute}]:hover{transform:scale(1.3);cursor:grab}`;

        const style = doc.createElement('style');
        style.textContent = normalCSS;
        doc.documentElement.querySelector('head').appendChild(style);
    }
    // 处理css
    _doCSS();

    function _init(opt) {
        if (!opt.oProgress) {
            throw new Error('Not find oProgress properties');
        }

        if (!(opt.oProgress instanceof Node)) {
            throw new Error(`${opt.oProgress} not a HTML node`);
        }

        if (!(opt.progressBarCallBack instanceof Function)) {
            throw new Error(`${opt.progressBarCallBack} not a function.`);
        }

        opt._bound = opt.oProgress.getBoundingClientRect();

        const oProgressUnder = doc.createElement('div'),
            oProgressMid = doc.createElement('div'),
            oProgressTop = doc.createElement('div'),
            oSlider = doc.createElement('div');

        oProgressUnder.classList.add('progress-under');
        oProgressUnder.setAttribute(_uniqueAttribute, '');
        oProgressMid.classList.add('progress-mid');
        oProgressMid.setAttribute(_uniqueAttribute, '');
        oProgressTop.classList.add('progress-top');
        oProgressTop.setAttribute(_uniqueAttribute, '');
        oSlider.classList.add('slider');
        oSlider.setAttribute(_uniqueAttribute, '');
        oProgressTop.appendChild(oSlider);

        opt.oProgress.setAttribute(_uniqueAttribute, '')
        opt.oProgress.appendChild(oProgressUnder);
        opt.oProgress.appendChild(oProgressMid);
        opt.oProgress.appendChild(oProgressTop);

        if (opt.initWidth) {
            oProgressTop.style.width = opt.initWidth; // 初始化长度
        }

        opt._moveing = false;
        opt.oSlider = oSlider;
        opt.oProgressUnder = oProgressUnder;
        opt.oProgressMid = oProgressMid;
        opt.oProgressTop = oProgressTop;


        if (opt.el instanceof HTMLAudioElement || opt.el instanceof HTMLVideoElement) {
            // 音频播放联动
            opt.el.addEventListener('loadedmetadata', function () {
                opt.oTotal.innerText = LrcOrLyrcKit.getMusicTime(opt.el.duration);
                opt.oProgressTop.style.width = '0%';
                opt.progressBarCallBack && opt.progressBarCallBack(0);
            });

            opt._loadBarPlusFunc = _loadBar.bind(win, opt);

            opt.el.addEventListener('timeupdate', opt._loadBarPlusFunc);

            opt.el.addEventListener('progress', function () {
                if (opt.el.buffered.length > 0) {
                    // 获取最后一个缓冲范围的结束时间
                    const bufferedEnd = opt.el.buffered.end(opt.el.buffered.length - 1);
                    // 计算加载进度百分比
                    const progress = (bufferedEnd / opt.el.duration) * 100;
                    // 更新进度条宽度
                    if (opt.oProgressMid) {
                        opt.oProgressMid.style.width = `${progress}%`;
                    }
                }
            });
        }



        _bindProgressBar(opt);
    }

    function _loadBar(opt) {
        _cNow = opt.el.currentTime;
        const progress = (opt.el.currentTime / opt.el.duration) * 100;
        opt.oProgressTop.style.width = `${progress}%`;
        if (opt.el && (opt.el instanceof HTMLAudioElement || opt.el instanceof HTMLVideoElement)) {
            opt.oNowTime.innerText = LrcOrLyrcKit.getMusicTime(opt.el.currentTime);
        }
        opt.progressBarCallBack && opt.progressBarCallBack((_cNow / opt.el.duration).toFixed(4));
    }

    function _change(opt, e) {
        _width = e.clientX - opt._bound.left;
        if (_width < 0) {
            _width = 0;
        } else if (_width > opt._bound.width) {
            _width = opt._bound.width;
        }
        opt.oProgressTop.style.width = _width + 'px';
        if (opt.el && (opt.el instanceof HTMLAudioElement || opt.el instanceof HTMLVideoElement)) {
            _cNow = opt.el.duration * (_width / opt._bound.width);
            opt.oNowTime.innerText = LrcOrLyrcKit.getMusicTime(_cNow);
        }
        if (opt.oShowLyrc && opt.oShowLyrc instanceof HTMLElement) {
            LrcOrLyrcKit.showThumLryc(_cNow, opt.oShowLyrc, 'highlight', 2);
        }
    }

    function _startMove(opt) {
        opt._moveing = true;
        if (_showLyrc) {
            clearTimeout(_showLyrc);
        }
        opt.oProgressUnder.classList.add('scale');
        opt.oSlider.classList.add('dragging');
        opt.oProgress.classList.add('dragging');
        if (opt.oProgressMid) {
            opt.oProgressMid.classList.add('scale');
        }
        opt.oProgressTop.classList.add('scale');
        if (opt.el && (opt.el instanceof HTMLAudioElement || opt.el instanceof HTMLVideoElement)) {
            opt.el.removeEventListener('timeupdate', opt._loadBarPlusFunc);
        }
        opt.oProgress.removeEventListener('click', opt._clickProgressFunc);
        opt.oSlider.style.transform = 'translateY(.1rem) scale(2)';
        if (opt.oShowLyrc && opt.oShowLyrc instanceof HTMLElement) {
            opt.oShowLyrc.classList.add('show');
        }
    }

    function _stopMove(opt) {
        if (!Number.isNaN(_cNow) && opt._moveing) {
            if (opt.el && (opt.el instanceof HTMLAudioElement || opt.el instanceof HTMLVideoElement)) {
                LrcOrLyrcKit.toCurrentLyrc(_cNow);
                opt.el.addEventListener('timeupdate', opt._loadBarPlusFunc);
            }
            if (opt.vibrate && (_width === 0 || _width === opt._bound.width)) {
                if (navigator.vibrate) {
                    navigator.vibrate(opt.vibrate);
                }
            }
            opt.progressBarCallBack && opt.progressBarCallBack((_width / opt._bound.width).toFixed(4));
        }
        opt.oSlider.classList.remove('dragging');
        opt.oProgress.classList.remove('dragging');
        _showLyrc = setTimeout(function () {
            if (opt.oShowLyrc && opt.oShowLyrc instanceof HTMLElement) {
                opt.oShowLyrc.classList.remove('show');
            }
            opt.oSlider.style = '';
            opt.oProgressUnder.classList.remove('scale');
            if (opt.oProgressMid) {
                opt.oProgressMid.classList.remove('scale');
            }
            opt.oProgressTop.classList.remove('scale');
            opt.oProgress.addEventListener('click', opt._clickProgressFunc);
            cancelAnimationFrame(_moveAnId);
        }, 1000);
        opt._moveing = false;
    }

    function _clickProgress(opt, e) {
        _change.call(win, opt, e);
        if (opt.vibrate) {
            if (navigator.vibrate) {
                navigator.vibrate(opt.vibrate);
            }
        }
        if (opt.el && (opt.el instanceof HTMLAudioElement || opt.el instanceof HTMLVideoElement)) {
            LrcOrLyrcKit.toCurrentLyrc(_cNow);
        }
        opt.progressBarCallBack && opt.progressBarCallBack((_width / opt._bound.width).toFixed(4));
    }


    function _bindProgressBar(opt) {
        opt._clickProgressFunc = _clickProgress.bind(win, opt);

        //处理点击事件
        opt.oProgress.addEventListener('click', opt._clickProgressFunc);

        opt.oSlider.addEventListener('mousedown', _startMove.bind(win, opt));

        doc.addEventListener('mousemove', function (e) {
            if (opt._moveing) {
                _moveAnId = requestAnimationFrame(_change.bind(win, opt, e));
            }
        });

        doc.addEventListener("mouseup", _stopMove.bind(win, opt));

        // 处理移动端进度条的拖动
        opt.oSlider.addEventListener('touchstart', _startMove.bind(win, opt), { passive: true });

        doc.addEventListener('touchmove', function (e) {
            if (opt._moveing) {
                _moveAnId = requestAnimationFrame(_change.bind(win, opt, e.touches[0]));
            }
        }, { passive: true });

        doc.addEventListener('touchend', _stopMove.bind(win, opt), { passive: true });
    }

    return {
        init(opt) {
            _init(opt);
        }
    }
})(window, document);