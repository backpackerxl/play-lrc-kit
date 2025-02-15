#### 这是一个音乐播放器工具
- 他可以帮你快速构建一个带歌词联动效果和自定义播放进度的开发工具，只需要简单的配置就可实现负载歌词同步，支持单个歌词动效和单行歌词动效等联动，点击歌词跳转播放等功能，支持原生播放控件的点击进度条播放、拖拽进度条播放等功能。
#### js使用方式
- 引入js代码
```javascript
<script src="https://backpackerxl.netlify.app/music-kit/music-kit.min.js"></script>
```
- 使用示例
```javascript
        // 准备dom元素
        const oPlayBtn = document.querySelector('#playBtn'),
            oShowLyrc = document.querySelector('#showLyrc'),
            oAudio = document.querySelector('audio'),
            oProgressBox = document.querySelector('.progress-box'),
            oCircle = oPlayBtn.querySelector('.circle'),
            oPlay = oPlayBtn.querySelector('.play'),
            oPause = oPlayBtn.querySelector('.pause'),
            oProgress = oProgressBox.querySelector('.progress'),
            oNowTime = oProgressBox.querySelector('.time .now'),
            oTotal = oProgressBox.querySelector('.time .total'),
            oProgressUnder = oProgress.querySelector('.progress-under'),
            oProgressMid = oProgress.querySelector('.progress-mid'),
            oProgressTop = oProgress.querySelector('.progress-top'),
            oSlider = oProgressTop.querySelector('.slider'),
            oCLen = oCircle.getTotalLength();
        // 设置动态参数
        oAudio.src = `music/go-beyond.mp3?t=${Date.now()}`;

        // 初始化歌词
        // 假数据
        function getMusicData() {
            return {}; // 歌词数据
        }

        console.log(LrcOrLyrcKit);

        const data = getMusicData();

        // 初始化普通歌词
        // LrcOrLyrcKit.init(
        //     {
        //         el: document.getElementById('lrc'),
        //         lyric_data: data.lrc.lyric,
        //         tlyric_lyric: data.tlyric.lyric,
        //         func: LrcOrLyrcKit.doLrcLyric,
        // 其他配置都一样参考逐字歌词
        //     }
        // );

        if (window.screen.width > 768) {
            // 这里以 768 像素为界限，可根据实际情况调整
            lineWidth = 400
        } else {
            lineWidth = 650
        }

        // 初始化逐字歌词
        LrcOrLyrcKit.init(
            {
                el: document.getElementById('lrc'),
                lyric_data: data.yrc.lyric,
                tlyric_lyric: data.ytlrc.lyric,
                func: LrcOrLyrcKit.doYrcLyric,
                options: {
                    baseColor: 'rgb(233, 235, 235, .5)',
                    poshilightColor: 'rgb(233, 235, 235, .5)',
                    hilightColor: '#fff',
                    fontSize: '1.2rem',
                    lineHeight: '1.8rem',
                    tlyricSize: '1rem',
                    tlyricLineHeight: '1.6rem',
                    hilightBgColor: 'rgb(204, 204, 204, .2)',
                    pMargin: '1rem'
                },
                lineWidth: lineWidth,
                bindAudio: oAudio,
                bindPlacePlay: {
                    startPlay: document.getElementById('startPlay'),
                    timeTag: document.querySelector('#startPlay .time'),
                    playTag: document.querySelector('#startPlay svg'),
                    lineDiv: document.querySelector('#startPlay .line'),
                    pcTimer: 1200, // PC端延迟回弹ms
                    mbTimer: 1200, // 移动端延迟回弹ms
                    timeTagTimer: 6000, // 点击播放的样式停留时长ms
                    startMoveCallBack: function () {
                        this.startPlay.classList.remove('show'); // 隐藏背景
                        this.playTag.classList.add('show'); // 显示播放图标
                        this.timeTag.classList.add('show'); // 显示时间
                        this.lineDiv.classList.add('show'); // 设置基准线显示
                    },
                    onMoveCallBack: function () {
                        this.timeTag.innerText = this.getMusicTime(this.nowLine.target_node.dataset.time); // 设置播放开始时间
                    },
                    stopMoveCallBack: function () {
                        this.lineDiv.classList.remove('show'); // 隐藏基准线
                        this.startPlay.classList.add('show'); // 显示背景
                        this.startPlay.style.setProperty('--start-height', `${this.targetRectHeight}px`); // 动态设置高度
                    },
                    unMoveCallBack: function () {
                        this.startPlay.classList.remove('show'); // 隐藏背景
                        this.playTag.classList.remove('show'); // 隐藏播放按钮
                        this.timeTag.classList.remove('show'); // 隐藏时间
                    },
                    clickCallBack: function () {
                        oPlay.classList.remove('show');
                        oPause.classList.add('show');
                        if (oAudio.paused) {
                            oAudio.play();
                        }
                    }
                }
            }
        );
        // 显示或隐藏翻译，默认显示
        // LrcOrLyrcKit.translation();

        // 绑定控件进度条控件
        MusicControl.init({
            el: oAudio,
            oPlay: oPlay,
            oPause: oPause,
            oTotal: oTotal,
            oNowTime: oNowTime,
            oSlider: oSlider,
            oProgress: oProgress,
            oProgressMid: oProgressMid,
            oProgressUnder: oProgressUnder,
            oProgressTop: oProgressTop,
            oShowLyrc: oShowLyrc,
            progressBarCallBack: function () {
                if (oAudio.currentTime > 0) {
                    oCircle.style.strokeDashoffset = oCLen - (oAudio.currentTime / oAudio.duration) * oCLen;
                } else {
                    oCircle.style.strokeDashoffset = oCLen + 1;
                }
            }
        });
```

- !(CodePen 在线示例)[https://codepen.io/backpackerxl/pen/RNwPBqj]
