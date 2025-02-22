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
        _mH = 0,
        _startPlay = null,
        _showTag = 'show',
        _moveTag = true,
        _animationId = null,
        _targetY = 0,
        _oldNode = null,
        _firstMp = 0,
        _oNowSpan = null,
        _nowDuration = 0,
        _textMoveAnId = null,
        _splitLetter = false,
        _halfContainerH = 0,
        _audio = null;

    function _doStyleCss(options, id) {
        // 初始化
        options = options || {
            baseColor: 'rgb(255, 255, 255, .6)',
            hilightColor: '#fff',
            fontSize: '1.2rem',
            lineHeight: '1.8rem',
            tlyricSize: '1rem',
            tlyricLineHeight: '1.6rem',
            pMargin: '1rem'
        };
        const {
            baseColor,
            hilightColor,
            fontSize,
            lineHeight,
            tlyricSize,
            tlyricLineHeight,
            pMargin
        } = options;

        let baseCSS = `:root{--${id}-pMargin:${pMargin};--${id}-baseColor:${baseColor};--${id}-fontSize:${fontSize};--${id}-hilightColor:${hilightColor};--${id}-lineHeight:${lineHeight};--${id}-tlyricSize:${tlyricSize};--${id}-tlyricLineHeight:${tlyricLineHeight};}.hide-tlyric p.tly_word{display:none;}#${id} p{color: var(--${id}-baseColor);transition: all .2s;margin:var(--${id}-pMargin) 0;padding:0;font-size:var(--${id}-fontSize);text-align:center;line-height:var(--${id}-lineHeight)}#${id} p span{padding-right:.5rem;}#${id} p.tly_word{margin:0 !important;font-size: var(--${id}-tlyricSize);line-height: var(--${id}-tlyricLineHeight);}#${id} p.color{color:var(--${id}-hilightColor);}`;


        let nCSS = `#${id} p span.color{color:var(--${id}-hilightColor) !important}#${id} p span.now {--progress:100;color: transparent;background-clip: text;-webkit-background-clip: text;background-image:linear-gradient(to left, var(--${id}-baseColor) calc(var(--progress) * 1%),var(--${id}-hilightColor)  0%);}`;

        const styleCss = doc.createElement('style');
        styleCss.textContent = baseCSS + nCSS
        doc.documentElement.querySelector('head').appendChild(styleCss);
    }

    // 渲染歌词，并初始化歌词数据，方便后面的歌词动效的使用
    function _renderLrc(opt) {
        // 清空容器
        _lrcNodeArr = [];
        _song_word = [];
        const { el } = _initOpt;
        const { lyric_data, tlyric_lyric, func, splitLetter } = opt;

        if (!el || !lyric_data || !func) {
            throw new Error("渲染视图的挂载点或歌词数据或歌词处理函数不能为空");
        }

        _splitLetter = splitLetter || false;

        if (!(el instanceof Node)) {
            throw new Error('el不是一个元素节点');
        }
        // 清空歌词
        el.innerText = '';

        if (!(func instanceof Function)) {
            throw new Error('func不是一个可执行函数');
        }

        // 处理lyrc歌词数据
        func(lyric_data, tlyric_lyric);
        // 歌词文档碎片容器
        const lrcTpl = doc.createDocumentFragment();
        _song_word.forEach(item => {
            let objTemp = {};
            let spanArr = [];
            const p = doc.createElement('p');
            p.dataset.time = item.current_time;
            if (item.word_arr.length > 0) {
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
                pTly.innerText = item.tly_word;
                pTly.className = 'tly_word';
                objTemp.tlyric_node = pTly;
                p.appendChild(pTly);
            }
            objTemp.target_node = p;
            objTemp.span_arr = spanArr;
            objTemp.time = item.current_time;
            _lrcNodeArr.push(objTemp);
        });

        el.appendChild(lrcTpl);
        // 计算margin值
        _mH = win.getComputedStyle(_lrcNodeArr[0].target_node).marginBottom.replace('px', '') * 2;
        _firstMp = win.getComputedStyle(_lrcNodeArr[0].target_node).getPropertyValue('margin-top').replace('px', '') * 1;
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

        _doStyleCss(opt.options, opt.el.id);

        _halfContainerH = opt.el.getBoundingClientRect().height / 2;
        // 保存歌词容器
        _lrcContainer = opt.el;

        if (opt.bindAudio) {
            _bindAudio({ el: opt.bindAudio })
        } else {
            console.warn("未设置audio控件无法实现歌词随歌曲滚动高亮！！！")
        }
        if (opt.bindPlacePlay) {
            _bindPlacePlay(opt.bindPlacePlay);
        } else {
            console.warn("未设置点击播放的配置将无法实现滚动到指定歌词点击播放的功能！！！")
        }
    }

    /** 歌词工具初始化结束 */

    /** 歌词绑定播放器 */
    function _bindAudio(opt) {
        if (!opt.el) {
            throw new Error("el不存在");
        }

        if (!(opt.el instanceof HTMLAudioElement)) {
            throw new Error('el不是一个html Audio播放器');
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


    /**
     * 歌词滚动
     * 滚动参数
     */
    function _lrcMove(sn, target) {
        const bound = target.getBoundingClientRect();
        _targetY += bound.top - _halfContainerH + bound.height;
        _smoothScroll(
            _lrcContainer,
            _targetY,
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
            _unMoveCallBack = null;

        const pcT = opt.pcTimer || 1200;
        const mbT = opt.mbTimer || 800;
        const tagT = opt.timeTagTimer || 6000;

        if (opt.startMoveCallBack && opt.startMoveCallBack instanceof Function) {
            _startMoveCallBack = opt.startMoveCallBack.bind(opt);
        } else {
            console.warn('设置的歌词滚动开始执行的回调函数失败，将无法在滚动歌词的过程中显示点击播放的参照物！！！');
        }

        if (opt.onMoveCallBack && opt.onMoveCallBack instanceof Function) {
            _onMoveCallBack = opt.onMoveCallBack.bind(opt);
        } else {
            console.warn('设置的歌词滚动中执行的回调函数失败，将无法实现滚动歌词与点击参照物的实时联动！！！');
        }

        if (opt.stopMoveCallBack && opt.stopMoveCallBack instanceof Function) {
            _stopMoveCallBack = opt.stopMoveCallBack.bind(opt);
        } else {
            console.warn('设置的歌词滚动结束后执行的回调函数失败，滚动结束后不会有任何操作！！！');
        }

        if (opt.unMoveCallBack && opt.unMoveCallBack instanceof Function) {
            _unMoveCallBack = opt.unMoveCallBack.bind(opt);
        } else {
            console.warn('设置的歌词滚动完成后执行的回调函数失败，滚动参照物将不会被释放！！！');
        }

        if (opt.clickCallBack && opt.clickCallBack instanceof Function) {
            _clickCallBack = opt.clickCallBack.bind(opt);
        }

        let oldTar = null,// 定义定时器
            wheel_timer,
            show_timer, moveY, animateId;
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
                cancelAnimationFrame(animateId); // 取消动画
                _unMoveCallBack && _unMoveCallBack(); // 卸载参照物
                _clickCallBack && _clickCallBack(); //调用点击后的回放
                _targetY = _lrcContainer.scrollTop + _firstMp;
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
            let nowLine, targetRectHeight;

            function findPToLight() {
                for (const line of _lrcNodeArr) {
                    const lineRect = line.target_node.getBoundingClientRect();
                    if (lineRect.top > targetRectTop && lineRect.bottom - lineRect.height < targetRectBottom) {
                        nowLine = line;
                        targetRectHeight = lineRect.height + _mH;
                        moveY = _lrcContainer.scrollTop + lineRect.top - targetRectTop + lineRect.height / 2 - targetRectHeight / 2;
                        break;
                    }
                }

                if (nowLine && nowLine !== oldTar) {
                    oldTar = nowLine;
                    opt.nowLine = nowLine;
                    opt.targetRectHeight = targetRectHeight;
                    // 执行开始滚动的回调函数
                    _onMoveCallBack && _onMoveCallBack();
                }
                animateId = requestAnimationFrame(findPToLight);
            }

            animateId = requestAnimationFrame(findPToLight);

        }

        // 清除滚动提示
        function _clearTips() {
            cancelAnimationFrame(animateId); // 取消动画
            _unMoveCallBack && _unMoveCallBack(); // 卸载参照物
            _moveTag = true;
            _smoothScroll(
                _lrcContainer,
                _targetY,
                100
            );
        }

        // 监听鼠标滚轮事件，实现定点播放
        _lrcContainer.addEventListener('wheel', () => {
            // 滚动开始
            _startMoveCallBack && _startMoveCallBack();
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
            startY = e.touches[0].clientY;
        }, { passive: true });

        _lrcContainer.addEventListener('touchmove', (e) => {
            offsetY = Math.abs(e.touches[0].clientY - startY);
        }, { passive: true });

        // 监听移动端滚动事件
        _lrcContainer.addEventListener('touchend', () => {
            if (offsetY > 0) {
                // 滚动开始
                _startMoveCallBack && _startMoveCallBack();
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
                    offsetY = 0;
                    // 滚动暂停
                    _stopMoveCallBack && _stopMoveCallBack();
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
            return Math.abs(curr.time - target) < Math.abs(prev.time - target) && curr.time < target ? curr : prev;
        });

        node.span_arr.forEach(spanNode => {
            if (spanNode.stm < target) {
                spanNode.span.classList.add('color');
            }
        });

        _audio.currentTime = target;
        node.target_node.classList.add('now');
        _lrcMove(350, node.target_node);
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

        console.log(nodeArr)
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
        },
        translation() {
            _lrcContainer.classList.toggle('hide-tlyric');
        },
        toCurrentLyrc(currentTime) {
            _toCurrentLyrc(currentTime);
        },
        getMusicTime(currentTime) {
            return _getMusicTime(currentTime);
        },
        renderLrc(opt) {
            _renderLrc(opt);
        },
        addBr() {
            _addBr();
        },
        showThumLryc(currentTime, oNode, highlight, num) {
            _showThumLryc(currentTime, oNode, highlight, num);
        },
        doLrcLyric: _doLrcLyric,
        doYrcLyric: _doYrcLyric
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
        _showLyrc = 0;

    function _init(opt) {
        if (!opt.oProgressTop || !opt.oSlider || !opt.oProgress || !opt.oProgressUnder) {
            throw new Error(`oProgressTop: 进度条或 oSlider:拖动滑块或 oProgress:总滑动条或 oProgressUnder:进度条轨道不能为空`);
        }

        if (!(opt.oProgressTop instanceof Node) || !(opt.oSlider instanceof Node) || !(opt.oProgress instanceof Node) || !(opt.oProgressUnder instanceof Node)) {
            throw new Error(`oProgressTop: 进度条或 oSlider:拖动滑块或 oProgress:总滑动条或 oProgressUnder:进度条轨道必须是dom元素`);
        }

        if (!(opt.progressBarCallBack instanceof Function)) {
            throw new Error(`progressBarCallBack: ${opt.progressBarCallBack}不是个函数`);
        }

        opt._bound = opt.oProgress.getBoundingClientRect();

        opt._moveing = false;

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