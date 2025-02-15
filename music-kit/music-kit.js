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
        _normal = true,
        _moveTag = true,
        _animationId = null,
        _targetY = 0,
        _oldNode = null,
        _firstMp = 0,
        _halfContainerH = 0,
        _audio = null;

    // baseColor -> #979797 hilightColor -> #ff5724 fontSize -> 1.2rem -> lineHeight 4rem（不建议修改这个数值）
    function doStyleCss(options, id) {
        const {
            baseColor,
            poshilightColor,
            hilightColor,
            fontSize,
            lineHeight,
            tlyricSize,
            tlyricLineHeight,
            pMargin
        } = options;
        return `:root{--${id}-pMargin:${pMargin};--${id}-poshilightColor:${poshilightColor};--${id}-baseColor:${baseColor};--${id}-fontSize:${fontSize};--${id}-hilightColor:${hilightColor};--${id}-lineHeight:${lineHeight};--${id}-tlyricSize:${tlyricSize};--${id}-tlyricLineHeight:${tlyricLineHeight};}.hide-tlyric p.tly_word{display:none;}#${id} p.now,#${id} p.now .tly_word{transform: scale(1.05);transition: transform .3s ease-in-out; color:var(--${id}-poshilightColor);}#${id} p{color:var(--${id}-baseColor);margin:var(--${id}-pMargin) 0;padding:0;font-size:var(--${id}-fontSize);text-align:center;line-height:var(--${id}-lineHeight)}#${id} p span{padding-right:6px;}#${id} p.tly_word{margin:0 !important;font-size: var(--${id}-tlyricSize);line-height: var(--${id}-tlyricLineHeight);}#${id} p.color{color:var(--${id}-hilightColor);transition:all.1s ease-in-out}#${id} p span.now{color:transparent;background-image:linear-gradient(to left,var(--${id}-poshilightColor) calc(100% - calc(var(--${id}-progress) * 100%)),var(--${id}-hilightColor) calc(100% - calc(var(--${id}-progress) * 100%)));background-clip:text;-webkit-background-clip:text;transition: all .5s;}`;
    }

    // 渲染歌词，并初始化歌词数据，方便后面的歌词动效的使用
    function _renderLrc() {
        const { el, lyric_data, tlyric_lyric, lineWidth, options, func } = _initOpt;

        if (!el || !lyric_data || !func) {
            throw new Error("渲染视图的挂载点或歌词数据或歌词处理函数不能为空");
        }

        const lw = lineWidth || 300;

        let colorOptions = options || {
            baseColor: '#979797',
            hilightColor: '#ff5724',
            fontSize: '1.4rem',
            lineHeight: '1.8rem',
            tlyricSize: '1.2rem',
            tlyricLineHeight: '1.8rem',
            pMargin: '15px'
        };

        // 如果未设置定位颜色
        if (!colorOptions.poshilightColor) {
            colorOptions.poshilightColor = colorOptions.baseColor;
        }

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
                    span.innerText = word[1];
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
        // 注入样式
        const styleCss = doc.createElement('style');
        styleCss.textContent = doStyleCss(colorOptions, el.id);
        doc.documentElement.querySelector('head').appendChild(styleCss);

        el.appendChild(lrcTpl);

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

        // 计算margin值
        _mH = Number(win.getComputedStyle(_lrcNodeArr[0].target_node).marginBottom.replace('px', '')) * 2;
        _halfContainerH = el.getBoundingClientRect().height / 2;
        _firstMp = window.getComputedStyle(_lrcNodeArr[0].target_node).getPropertyValue('margin-top').replace('px', '') * 1;
        // 保存歌词容器
        _lrcContainer = el;
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
        // 初始化歌词
        _renderLrc();
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

        if (!(opt.el instanceof Audio)) {
            throw new Error('el不是一个html播放器');
        }

        _audio = opt.el;
        // 监听audio的播放事件, 并实现歌词动效
        // 节约性能，停止播放后移除动画帧
        _audio.addEventListener('pause', function () {
            cancelAnimationFrame(_animationId);
        });

        let timer;

        // 监听播放事件
        _audio.addEventListener('play', () => {
            _normal = true;
            if (timer) {
                clearTimeout(timer);
            }
            _animationId = requestAnimationFrame(_timerMove);
            timer = setTimeout(() => {
                _normal = false;
            }, 600);
        });
    }

    // 执行移动动画
    function _timerMove() {
        _oldNode = _moveLyrc(_audio.currentTime, _oldNode);
        _animationId = requestAnimationFrame(_timerMove)
    }

    /**
     * 移动歌词并实时高亮
     * @param currentTime 当前audio的播放时间
     * @param oldNode 初始节点
     * @private
     */
    function _moveLyrc(currentTime, oldNode) {
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

        if (targetNode && oldNode !== targetNode) {
            const span_arr = targetNode.span_arr;
            // 清除高亮样式
            if (oldNode) {
                oldNode.target_node.className = '';
                oldNode.span_arr.forEach(el => {
                    el.span.className = '';
                    el.span.style = '';
                });
            }

            targetNode.target_node.className = 'now';
            // 判断有没有span标签
            if (span_arr.length <= 0) {
                targetNode.target_node.classList.add('color');
            }
            // 更新oldNode
            oldNode = targetNode;
            if (_moveTag) {
                // 处理歌词滚动
                if (_startPlay) {
                    _startPlay.classList.remove(_showTag);
                }
                _lrcMove(300, oldNode.target_node);
            }
        } else if (targetNode) {
            // 歌词逐字高亮文字动效
            const span_arr = targetNode.span_arr;
            if (span_arr.length > 0) {
                span_arr.forEach(el => {
                    if (el.stm <= currentTime && el.span.classList.length === 0) {
                        el.span.classList.add('now');
                        if (_normal) {
                            _animateProgress(el.span, 0);
                        } else {
                            _animateProgress(el.span, el.duration);
                        }
                    }
                });
            }
        }
        return oldNode;
    }


    /**
     * 计算progress并设置Property
     **/
    function _animateProgress(el, duration) {
        let num = 0;
        let frameDuration = 16.67; // 每帧时长 16.67ms

        const totalFrames = duration / frameDuration; // 总帧数
        let currentFrame = 0; // 当前帧数
        // 设置动画参数--progress
        function animate() {
            if (currentFrame < totalFrames) {
                num = Math.floor((currentFrame / totalFrames) * 100);
                el.style.setProperty(`--${_lrcContainer.id}-progress`, num * 0.01);
                currentFrame++;
                requestAnimationFrame(animate);
            } else {
                el.style.setProperty(`--${_lrcContainer.id}-progress`, 1);
            }
        }

        requestAnimationFrame(animate);
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
                // 清除已有样式
                oldTar.span_arr.forEach(el => {
                    el.span.className = '';
                    el.span.style = '';
                });
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
            _oldNode.span_arr.forEach(el => {
                el.span.className = '';
                el.span.style = '';
            });
        }
        let node = _lrcNodeArr.reduce((prev, curr) => {
            return Math.abs(curr.time - target) < Math.abs(prev.time - target) && curr.time < target ? curr : prev;
        });

        node.span_arr.forEach((spanNode) => {
            if (spanNode.stm < target) {
                spanNode.span.classList.add('now');
                spanNode.span.style.setProperty(`--${_lrcContainer.id}-progress`, 1);
            }
        });

        _audio.currentTime = target;
        node.target_node.classList.add('now');
        _lrcMove(350, node.target_node);
        _oldNode = node;
    }
    /** 结束跳转 */

    /** 显示缩略图 */
    function _showThumLryc(target, oNode, highlight) {
        if (Number.isNaN(target)) {
            return;
        }
        let node = _song_word.reduce((prev, curr) => {
            return Math.abs(curr.current_time - target) < Math.abs(prev.current_time - target) && curr.current_time < target ? curr : prev;
        });

        let idx = node.idx,
            lastIdx = _song_word.length - 1;

        let nodeArr = [_song_word[Math.max(0, idx - 2)], _song_word[Math.max(0, idx - 1)], { ...node, flag: true }, _song_word[Math.min(lastIdx, idx + 1)], _song_word[Math.min(lastIdx, idx + 2)]];
        nodeArr = [...new Set(nodeArr)];
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
        showThumLryc(currentTime, oNode, highlight) {
            _showThumLryc(currentTime, oNode, highlight);
        },
        doLrcLyric: _doLrcLyric,
        doYrcLyric: _doYrcLyric,
        lrcNodeArr: _lrcNodeArr,
        songWord: _song_word
    };
})(window, document);


/**
 * @author: backpackerxl 2025/2/15
 * @description: 这是音乐播放器控件控制工具
 */
const MusicControl = (function (doc) {

    function _init(opt) {

        if (!opt.el) {
            throw new Error("el不存在");
        }

        if (!(opt.el instanceof Audio)) {
            throw new Error('el不是一个html播放器');
        }

        if (!opt.oPlay || !opt.oPause || !opt.oTotal || !opt.oProgressTop || !opt.oNowTime || !opt.oSlider || !opt.oProgress || !opt.oProgressUnder) {
            throw new Error(`oPlay:播放控件或 oProgressTop: 进度条或 oPause:暂停控件或 oTotal:总时间显示容器或 oNowTime:当前时间显示容器或 oSlider:拖动滑块或 oProgress:总滑动条或 oProgressUnder:进度条轨道不能为空`)
        }

        if (!(opt.oPlay instanceof Node) || !(opt.oPause instanceof Node) || !(opt.oTotal instanceof Node) || !(opt.oProgressTop instanceof Node)
            || !(opt.oNowTime instanceof Node) || !(opt.oSlider instanceof Node) || !(opt.oProgress instanceof Node) || !(opt.oProgressUnder instanceof Node)) {
            throw new Error(`oPlay:播放控件或 oProgressTop: 进度条或 oPause:暂停控件或 oTotal:总时间显示容器或 oNowTime:当前时间显示容器或 oSlider:拖动滑块或 oProgress:总滑动条或 oProgressUnder:进度条轨道必须是dom元素`)
        }

        if (!(opt.progressBarCallBack && opt.progressBarCallBack instanceof Function)) {
            console.warn('设置的自定义进度条失败，自定义进度条将不会跟随音乐变化！！');
        }

        // 音频播放联动
        opt.el.addEventListener('loadedmetadata', function () {
            opt.oTotal.innerText = LrcOrLyrcKit.getMusicTime(opt.el.duration);
            opt.oProgressTop.style.width = '0%';
            opt.progressBarCallBack && opt.progressBarCallBack();
        });

        opt.el.addEventListener('timeupdate', _loadBar.bind(opt));

        opt.el.addEventListener('ended', function () {
            opt.oPlay.classList.add('show');
            opt.oPause.classList.remove('show');
        });

        opt.el.addEventListener('progress', function () {
            if (this.buffered.length > 0) {
                // 获取最后一个缓冲范围的结束时间
                const bufferedEnd = this.buffered.end(this.buffered.length - 1);
                // 计算加载进度百分比
                const progress = (bufferedEnd / this.duration) * 100;
                // 更新进度条宽度
                if (opt.oProgressMid) {
                    opt.oProgressMid.style.width = `${progress}%`;
                }
            }
        });

        _bindProgressBar(opt);
    }

    let _cNow = 0,
        _moveing = false,
        _showLyrc = 0;


    function _loadBar() {
        _cNow = this.el.currentTime;
        const progress = (this.el.currentTime / this.el.duration) * 100;
        this.oProgressTop.style.width = `${progress}%`;
        this.oNowTime.innerText = LrcOrLyrcKit.getMusicTime(this.el.currentTime);
        this.progressBarCallBack && this.progressBarCallBack();
    }

    function _change(e, totalWidth, bound) {
        let width = e.clientX - bound.left;
        if (width < 0) {
            width = 0;
        } else if (width > totalWidth) {
            width = totalWidth;
        }
        this.oProgressTop.style.width = width + 'px';
        _cNow = this.el.duration * (width / bound.width);
        this.oNowTime.innerText = LrcOrLyrcKit.getMusicTime(_cNow);
        if (this.oShowLyrc && this.oShowLyrc instanceof Node) {
            LrcOrLyrcKit.showThumLryc(_cNow, this.oShowLyrc, 'highlight');
        }
    }

    function _startMove() {
        _moveing = true;
        if (_showLyrc) {
            clearTimeout(_showLyrc);
        }
        this.oProgressUnder.classList.add('scale');
        if (this.oProgressMid) {
            this.oProgressMid.classList.add('scale');
        }
        this.oProgressTop.classList.add('scale');
        this.el.removeEventListener('timeupdate', _loadBar.bind(this));
        this.oSlider.style.transform = 'translateY(.1rem) scale(1.5)';
        if (this.oShowLyrc && this.oShowLyrc instanceof Node) {
            this.oShowLyrc.classList.add('show');
        }
    }

    function _stopMove() {
        if (!Number.isNaN(_cNow) && _moveing) {
            this.el.currentTime = _cNow;
            LrcOrLyrcKit.toCurrentLyrc(_cNow);
            this.progressBarCallBack && this.progressBarCallBack();
        }
        this.el.addEventListener('timeupdate', _loadBar.bind(this));
        _this = this;
        _showLyrc = setTimeout(function () {
            if (_this.oShowLyrc && _this.oShowLyrc instanceof Node) {
                _this.oShowLyrc.classList.remove('show');
            }
            _this.oSlider.style = '';
            _this.oProgressUnder.classList.remove('scale');
            if (_this.oProgressMid) {
                _this.oProgressMid.classList.remove('scale');
            }
            _this.oProgressTop.classList.remove('scale');
        }, 1000);
        _moveing = false;
    }


    function _bindProgressBar(opt) {
        if (!opt.oShowLyrc || !(opt.oShowLyrc instanceof Node)) {
            console.warn('歌词拖动提示不能显示，因为没有配置提示容器！！！')
        }

        const totalWidth = opt.oProgress.getBoundingClientRect().width,
            bound = opt.oProgress.getBoundingClientRect();
        //处理点击事件
        opt.oProgress.addEventListener('click', function (e) {
            _change.call(opt, e, totalWidth, bound);
            LrcOrLyrcKit.toCurrentLyrc(_cNow);
            opt.progressBarCallBack && opt.progressBarCallBack();
            opt.el.removeEventListener('timeupdate', _loadBar.bind(opt));
        });

        opt.oSlider.addEventListener('mousedown', _startMove.bind(opt));

        doc.addEventListener('mousemove', function (e) {
            if (_moveing) {
                _change.call(opt, e, totalWidth, bound);
            }
        });

        doc.addEventListener("mouseup", _stopMove.bind(opt));

        // 处理移动端进度条的拖动
        opt.oSlider.addEventListener('touchstart', _startMove.bind(opt), { passive: true });

        doc.addEventListener('touchmove', function (e) {
            if (_moveing) {
                _change.call(opt, e.touches[0], totalWidth, bound);
            }
        }, { passive: true });

        doc.addEventListener('touchend', _stopMove.bind(opt), { passive: true });
    }

    return {
        init(opt) {
            _init(opt);
        }
    }
})(document);