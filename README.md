#### 这是一个音乐播放器工具
![image](https://github.com/user-attachments/assets/0468ae68-894d-4189-83ed-38ae8e72bae9)

- [CodePen 在线示例](https://codepen.io/backpackerxl/full/RNwPBqj)
- 他可以帮你快速构建一个带歌词联动效果和自定义播放进度的开发工具，只需要简单的配置就可实现负载歌词同步，支持单个歌词动效和单行歌词动效等联动，点击歌词跳转播放等功能，支持原生播放控件的点击进度条播放、拖拽进度条播放等功能。
#### js使用方式
- 引入js代码
```javascript
<script src="https://backpackerxl.netlify.app/dist/music-kit.min.js"></script>
```
- 使用示例
```javascript
        // 准备dom元素
        const oPlayBtn = document.getElementById('playBtn'),
            oTranslation = document.getElementById('translation'),
            oAudio = document.querySelector('audio'),
            oProgressBox = document.querySelector('.progress-box'),
            oProgressBoxVolume = document.querySelector('.progress-box.volume'),
            oSliderVolumeSVG = oProgressBoxVolume.querySelector('.icon'),
            oSliderVolumeVol = oSliderVolumeSVG.querySelector('.vol'),
            oSliderVolumeNoVol = oSliderVolumeSVG.querySelector('.no-vol'),
            oCircle = oPlayBtn.querySelector('.circle'),
            oPlay = oPlayBtn.querySelector('.play'),
            oPause = oPlayBtn.querySelector('.pause'),
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

        /**
         * 
         * 注意：此次更新CSS将不再此配置了，
         *      将采用CSS变数的形式配置
        <div id="lrc">
            <!--  歌词容器 -->
        </div>
        <!--  定位歌词dom, 样式自行准备 -->
        <div id="startPlay" class="start" style="--start-height: 30px;">
            <span class="time">00:00</span>
            <p class="line"></p>
            <svg t="1737093853203" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"
            p-id="4662">
                <path
                    d="M755.552 495.36l-384-296.672a31.936 31.936 0 0 0-51.552 25.28v593.504a32 32 0 0 0 51.552 25.28l384-296.704a32 32 0 0 0 0-50.656"
                    fill="#ffffff" p-id="4663"></path>
            </svg>
        </div>
        #lrc {
            --baseColor: rgb(255, 255, 255, .6);
            --hilightColor: rgb(0, 255, 127);
            --fontSize: 1.3rem;
            --lineHeight: 1.8rem;
            --tlyricSize: 1rem;
            --tlyricLineHeight: 1.6rem;
            --pMargin: 1rem;
            ....
        }
         **/

        const options = {
            el: document.getElementById('lrc'),
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
                    if (navigator.vibrate && clickTrige) {
                        navigator.vibrate(16);
                    }
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

        // 初始化逐字歌词容器
        LrcOrLyrcKit.init(options);
        // 渲染歌词
        LrcOrLyrcKit.renderLrc({
            lyric_data: data.yrc.lyric,
            tlyric_lyric: data.ytlrc.lyric,
            splitLetter: false, // 是否分割英文歌词的每一个字母
            func: LrcOrLyrcKit.doYrcLyric,
        });

          /**
         * 
         * 注意：此次更新CSS将不再此配置了，
         *      将采用CSS变数的形式配置
        <div class="progress">
            <!--  进度条容器 -->
        </div>
        
        .progress {
            --pg-height: 2rem;
            --bar-height: .3rem;
            --bar-under-bg: rgb(255, 255, 255, .3);
            --bar-mid-bg: rgb(255, 255, 255, .5);
            --bar-top-bg: rgb(255, 255, 255);
            --slider-size: .6rem;
            --slider-bg: rgb(255, 255, 255);
            ....
        }
         **/
        
        // 初始化音量调节器
        oAudio.volume = 0.5; // 初始化音量
        MusicBarControl.init({
            oProgress: oProgressBoxVolume.querySelector('.progress'),
            initWidth: '50%',
            vibrate: 15,
            progressBarCallBack: function (progress) {
                if (progress < 0.1 && progress > 0.009) {
                    oAudio.volume = Math.ceil(progress * 10) / 10;
                } else {
                    oAudio.volume = Math.round(progress * 10) / 10;
                }
                if (oAudio.volume === 0) {
                    oSliderVolumeVol.classList.remove('show');
                    oSliderVolumeNoVol.classList.add('show');
                } else {
                    oSliderVolumeVol.classList.add('show');
                    oSliderVolumeNoVol.classList.remove('show');
                }
            }
        });

        // 初始化音乐进度条
        MusicBarControl.init({
            el: oAudio,
            oTotal: oProgressBox.querySelector('.time .total'),
            oNowTime: oProgressBox.querySelector('.time .now'),
            oProgress: oProgressBox.querySelector('.progress'),
            oShowLyrc: document.getElementById('showLyrc'),
            vibrate: 15, // 开启震动
            progressBarCallBack: function (progress) {
                if (Math.floor(progress * 100) !== 0) {
                    oCircle.style.strokeDashoffset = oCLen - progress * oCLen;
                } else {
                    oCircle.style.strokeDashoffset = oCLen + 1;
                }
            }
        });

        oTranslation.addEventListener('click', function () {
            // 显示或隐藏翻译，默认显示
            LrcOrLyrcKit.translation();
            if (navigator.vibrate) {
                navigator.vibrate(10);
            }
        });

        // 绑定控件常规事件
        oPlayBtn.addEventListener('click', function () {
            clickTrige = true;
            oPlay.classList.toggle('show');
            oPause.classList.toggle('show');
            if (navigator.vibrate) {
                navigator.vibrate(10);
            }
            if (oAudio.paused) {
                oAudio.play();
            } else {
                oAudio.pause();
            }
        });

        oAudio.addEventListener('ended', function () {
            oPlay.classList.add('show');
            oPause.classList.remove('show');
        });

        oAudio.addEventListener('pause', function () {
            oPlay.classList.add('show');
            oPause.classList.remove('show');
        });

        oAudio.addEventListener('play', function () {
            oPlay.classList.remove('show');
            oPause.classList.add('show');
        });
```
