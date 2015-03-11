(function() {

    angular.module('bsSwitch', [])

        .controller('bsSwitchCtrl', bsSwitchCtrl)
        .controller('bsSwitchContentGalleryCtrl', bsSwitchContentGalleryCtrl)
        .controller('bsSwitchContentSliderCtrl', bsSwitchContentSliderCtrl)
        .controller('bsSwitchPanelCtrl', bsSwitchPanelCtrl)
        .controller('bsSwitchNavCtrl', bsSwitchNavCtrl)

        .directive('bsSwitch', bsSwitch)
        .directive('bsSwitchContent', bsSwitchContent)
        .directive('bsSwitchPanel', bsSwitchPanel)
        .directive('bsSwitchNav', bsSwitchNav);

    var DIRECTIONS = {
        LEFT: -1,
        RIGHT: 1
    };

    bsSwitchCtrl.$inject = '$scope, $element, $attrs'.split(', ');
    function bsSwitchCtrl($scope, $el, $attrs) {
        var el = $el[0],
            switchCtrl = this;

        angular.extend(switchCtrl, {
            $scope: $scope,

            config: $scope,

            // 是否初始化完成
            isInit: false,

            // 对应的内容控制器
            content: undefined,

            width: undefined,

            init: function() {
                $scope.$broadcast('switch.init.start');

                $el.addClass($scope.classPrefix);
                $el.addClass($scope.classPrefix + '-' + $scope.type);
                this.width = el.clientWidth;

                this.bindTouchEvent();

                $scope.$broadcast('switch.init');

                this.isInit = true;
                $scope.$broadcast('switch.init.end');
            },

            refresh: function() {
                this.width = el.clientWidth;
                $scope.$broadcast('switch.refresh');
            },

            setSwitchContent: function(switchContent) {
                this.switchContent = switchContent;
            },

            // 绑定触摸事件
            bindTouchEvent: function() {
                var self = this,
                    oX, oY, count;

                el.addEventListener('touchstart', function(e) {
                    if (self.content.panels.length > 1) {
                        oX = e.touches[0].pageX;
                        oY = e.touches[0].pageY;

                        count = 0;

                        // 判断是否为横向移动
                        el.addEventListener('touchmove', hslip);
                    }
                });


                // 水平滑动操作
                function hslip(e) {
                    var x = e.touches[0].pageX,
                        y = e.touches[0].pageY,

                        // 以上一次触摸事件的触发点为原点，计算当前触摸事件的触发点的角度
                        w = x - oX,
                        h = y - oY,
                        r = Math.abs( Math.atan2(h, w) * 180 / Math.PI ),

                        // 判断是否是横向滚动
                        hs = r <= 60 || r >= 120;

                    count++;

                    // 当连续三次触发 touch move 事件时都为横向移动时，绑定横向滑动事件
                    if (hs) {
                        if (count === 3) {
                            switchCtrl.oX = x;

                            el.addEventListener('touchmove', switchCtrl.slipHandler);
                            el.addEventListener('touchend', switchCtrl.slipEndHandler);
                            el.addEventListener('touchcancel', switchCtrl.slipEndHandler);

                            el.removeEventListener('touchmove', hslip);
                        }

                        e.preventDefault();
                        e.stopPropagation();
                    }
                    // 否则过滤掉该事件
                    else {
                        el.removeEventListener('touchmove', hslip);
                    }
                }
            },

            slipHandler: function (e) {
                var x = e.touches[0].pageX,
                    h = x - switchCtrl.oX;
                switchCtrl.oX = x;
                switchCtrl.switchContent.move(h);

                e.preventDefault();
                e.stopPropagation();
            },

            slipEndHandler: function (e) {
                el.removeEventListener('touchmove', switchCtrl.slipHandler);
                el.removeEventListener('touchend', switchCtrl.slipEndHandler);
                el.removeEventListener('touchcancel', switchCtrl.slipEndHandler);
                switchCtrl.switchContent.standstill();
            }
        });
    }

    bsSwitchContentSliderCtrl.$inject = '$scope, $element, $attrs, $q'.split(', ');
    function bsSwitchContentSliderCtrl($scope, $el, $attrs, $q) {
        var el = $el[0],
            switchContentCtrl = this;

        angular.extend(switchContentCtrl, {
            // 对应的 switch
            switch: undefined,

            // 存放所有的面板
            panels: [],

            // 当前焦点面板
            currentPanel: undefined,

            // 当前焦点面板的索引
            currentPanelIndex: undefined,

            // 内容区域宽度
            width: 0,

            // 当前面板的偏移量
            panelOffset: 0,

            // 最近一次移动时的移动方向 （1: 向右，-1: 向左）
            moveDirection: 1,

            // 动画执行器
            animate: undefined,

            // 当前面板的右面板
            rightPanel: undefined,

            // 当面面板的左面板
            leftPanel: undefined,

            init: function(switchCtrl) {
                var self = this;

                this.switch = switchCtrl;
                $el.addClass(switchCtrl.config.classPrefix + '-content');
                this.width = el.clientWidth;

                switchCtrl.$scope.$on('switch.refresh', function() {
                    self.refresh();
                });

                this.autoPlayTiming = switchCtrl.$scope.autoPlay;
                this.autoPlay();
            },

            refresh: function() {
                this.width = el.clientWidth;
            },

            autoPlay: function() {
                var self = this;

                if (!this.autoPlayTiming) {
                    return false;
                }

                this.stopAutoPlay();

                this.autoPlayTimer = setTimeout(function() {
                    var nextIndex = (self.currentPanelIndex + 1) % self.panels.length;
                    self.toggle(nextIndex, DIRECTIONS.LEFT);
                    self.autoPlay();
                }, self.autoPlayTiming);

                return true;
            },

            stopAutoPlay: function() {
                if (this.autoPlayTimer) {
                    clearTimeout(this.autoPlayTimer);
                    this.autoPlayTimer = undefined;
                }
            },

            addPanel: function(panel) {
                this.panels.push(panel);

                var index = this.panels.length - 1;
                this.switch.$scope.$broadcast('bsSwitch.panel.add', index);

                if (!this.currentPanel) {
                    this.currentPanel = panel;
                    this.currentPanelIndex = index;

                    this.currentPanel.$el.addClass('active');

                    this.switch.$scope.$broadcast('bsSwitch.panel.switch', this.currentPanelIndex);
                }
                else {
                    panel.$el.addClass('hide');
                }
            },

            removePanel: function(panel) {
                var index = this.panels.indexOf(panel);

                if (index === -1) return;

                this.panels.splice(index, 1);

                if (panel === this.leftPanel) {
                    this.leftPanel = undefined;
                }

                if (panel === this.rightPanel) {
                    this.rightPanel = undefined;
                }

                if (index === this.currentPanelIndex) {
                    if (this.panels.length) {
                        var newCurrentPanel = this.panels[index];

                        this._transform(newCurrentPanel.el, 0);
                        newCurrentPanel.$el.removeClass('hide');
                        newCurrentPanel.$el.addClass('active');

                        this.currentPanel = newCurrentPanel;
                    }
                    else {
                        this.currentPanel = undefined;
                        this.currentPanelIndex = undefined;
                    }
                }
                else if (index < this.currentPanelIndex) {
                    this.currentPanelIndex -= 1;
                }

                this.switch.$scope.$broadcast('bsSwitch.panel.remove', index, panel);
            },

            /** 移动内容区域，移动距离为正值时，向右移动，反之向左移动。 */
            move: function(length) {
                this.animate && this.animate.over();
                this.autoPlayTimer && this.stopAutoPlay();
                this._move(this.panelOffset + length);
            },

            standstill: function() {
                var index = this.currentPanelIndex;

                if (this.moveDirection === DIRECTIONS.LEFT) {
                    index += 1;
                    index %= this.panels.length;
                }
                else {
                    index -= 1;

                    if (index === -1) {
                        index = this.panels.length - 1;
                    }
                }

                this.toggle(index, this.moveDirection);
            },

            /** 切换面板 */
            toggle: function(index, direction) {
                var self = this,

                    deferred = $q.defer(),
                    promise = deferred.promise,

                    panel = this.panels[index],

                    startOffset = this.panelOffset,
                    endOffset;

                if (!panel) {
                    deferred.resolve();
                    return promise;
                }

                if (direction === DIRECTIONS.LEFT) {
                    endOffset = -(this.currentPanel.outerWidth);
                }
                else if(direction === DIRECTIONS.RIGHT) {
                    endOffset = this.currentPanel.outerWidth;
                }
                else {
                    deferred.resolve();
                    return promise;
                }

                this.switch.$scope.$broadcast('bsSwitch.panel.switch', index);

                if (this.animate) {
                    this.animate.over();
                }

                this.stopAutoPlay();
                this.animate = new Animate({
                    target: this.currentPanel.el,
                    speed: 200,
                    frame: function(target, p, e) {
                        self._move(startOffset - (startOffset - endOffset) * e);
                    },
                    over: function() {
                        self.currentPanel.$el.removeClass('active');
                        self.currentPanel.$el.addClass('hide');

                        if (direction === DIRECTIONS.LEFT) {
                            self.rightPanel = undefined;
                            self._clearLeftPanel();
                        }
                        else {
                            self.leftPanel = undefined;
                            self._clearRightPanel();
                        }

                        self.currentPanel = self.panels[index];
                        self.currentPanel.$el.addClass('active');
                        self.currentPanelIndex = index;

                        self.panelOffset = 0;

                        self.animate = undefined;
                        self.autoPlay();

                        deferred.resolve();
                    }
                });

                this.animate.run();

                return promise;
            },

            _move: function(offset) {
                var rightPanel = this.rightPanel,
                    leftPanel = this.leftPanel;

                this.moveDirection = offset >= this.panelOffset ? DIRECTIONS.RIGHT : DIRECTIONS.LEFT;
                this.panelOffset = offset;
                this._transform(this.currentPanel.el, offset);

                // 当偏移值小于 0 时，为向左移动，并露出右面板
                if (offset < 0) {
                    leftPanel && this._clearLeftPanel();

                    if (!rightPanel) {
                        rightPanel = this.rightPanel = this._getNextPanelByIndex(this.currentPanelIndex);
                        rightPanel.$el.removeClass('hide');
                    }

                    this._transform(rightPanel.el, this.panelOffset + this.width);
                }
                // 当偏移值大于 0 时，为向右移动，并露出左面板
                else if (offset > 0) {
                    rightPanel && this._clearRightPanel();

                    if (!leftPanel) {
                        leftPanel = this.leftPanel = this._getPrevPanelByIndex(this.currentPanelIndex);
                        leftPanel.$el.removeClass('hide');
                    }

                    this._transform(leftPanel.el, this.panelOffset - this.width);
                }
                else {
                    this._clearLeftPanel();
                    this._clearRightPanel();
                }
            },

            _getNextPanelByIndex: function(index) {
                var ps = this.panels;
                return ps[(index + 1) % ps.length];
            },

            _getPrevPanelByIndex: function(index) {
                var ps = this.panels;
                if (index === 0) index = ps.length;
                return ps[index - 1];
            },

            _clearLeftPanel: function() {
                if (this.leftPanel) {
                    this.leftPanel.$el.addClass('hide');
                    this.leftPanel = undefined;
                }
            },

            _clearRightPanel: function() {
                if (this.rightPanel) {
                    this.rightPanel.$el.addClass('hide');
                    this.rightPanel = undefined;
                }
            },

            _transform: function(el, x) {
                var cssValue = 'translate3D(' + x + 'px, 0, 0)';
                el.style.webkitTransform = cssValue;
                el.style.msTransform = cssValue;
                el.style.transform = cssValue;
            }
        });
    };

    bsSwitchContentGalleryCtrl.$inject = '$scope, $element, $attrs, $q'.split(', ');
    function bsSwitchContentGalleryCtrl($scope, $el, $attrs, $q) {
        var el = $el[0],
            switchContentCtrl = this;

        angular.extend(switchContentCtrl, {
            // 对应的 switch
            switch: undefined,

            // 存放所有的面板
            panels: [],

            // 内容区域宽度
            width: 0,

            // 内容区域偏移
            offset: 0,

            // 最近一次移动时的移动方向 （1: 向右，-1: 向左）
            moveDirection: 1,

            // 动画执行器
            animate: undefined,

            init: function(switchCtrl) {
                var self = this;

                this.switch = switchCtrl;
                $el.addClass(switchCtrl.config.classPrefix + '-content');
                $el.css('width', self.width);

                switchCtrl.$scope.$on('switch.refresh', function() {
                    self.refresh();
                });
            },

            refresh: function() {
                this._move(this.offset);
            },

            addPanel: function(panel) {
                this.panels.push(panel);
                this.width += panel.outerWidth;
                el.style.width = this.width + 'px';

                this.switch.$scope.$broadcast('bsSwitch.panel.add', this.panels.length - 1);
            },

            removePanel: function(panel) {
                var index = this.panels.indexOf(panel);

                if (index !== -1) {
                    this.panels.splice(index, 1);
                    this.switch.$scope.$broadcast('bsSwitch.panel.remove', index, panel);
                    this.width -= panel.outerWidth;
                    el.style.width = this.width + 'px';
                }
            },

            /** 移动内容区域，移动距离为正值时，向右移动，反之向左移动。 */
            move: function(length) {
                // 当内容宽度小于或等于控件宽度时，不应用滚动
                if (this.switch.width >= this.width) {
                    return;
                }

                if (this.animate) {
                    this.animate.over();
                    this.animate = undefined;
                }

                this._move(this.offset + length);
            },

            standstill: function() {
                // 当内容宽度小于或等于控件宽度时，将内容定位在其实位置。
                if (this.switch.width >= this.width) {
                    return;
                }

                var self = this,

                    i = 0, l = this.panels.length,
                    li = l - 1,

                    moveLength = Math.abs(this.offset),

                    panel;

                for (; i < l; i++) {
                    panel = this.panels[i];

                    if (moveLength < panel.outerWidth) {
                        break;
                    }
                    else {
                        moveLength -= panel.outerWidth;
                    }
                }

                if (i === l) {
                    i = li;
                }

                // 向左移动
                if (this.moveDirection === -1) {
                    i = Math.min(i + 1, li);
                }

                this.toggle(i);
            },

            /**
             * 切换到指定的面板
             */
            toggle: function(index) {
                var self = this,

                    deferred = $q.defer(),
                    promise = deferred.promise,

                    panel = this.panels[index];

                // 当内容宽度小于或等于控件宽度时，将内容定位在其实位置。
                if (this.switch.width >= this.width) {
                    deferred.resolve();
                    return promise;
                }

                // 如果待切换的面板不存在，则不进行切换。
                if (!panel) {
                    deferred.resolve();
                    return promise;
                }

                var startOffset = this.offset,
                    endOffset = -panel.el.offsetLeft;

                if (startOffset === endOffset) {
                    deferred.resolve();
                    return promise;
                }

                this.switch.$scope.$broadcast('bsSwitch.panel.switch', index);

                if (this.animate) {
                    this.animate.over();
                }

                this.animate = new Animate({
                    target: el,
                    speed: 100,
                    frame: function(target, p, e) {
                        self._move(startOffset - (startOffset - endOffset) * e);
                    },
                    over: function() {
                        deferred.resolve();
                    }
                });

                this.animate.run();

                return promise;
            },

            _move: function(offset) {
                offset = Math.min(0, Math.max(offset,-(this.width - this.switch.width)));

                if (offset !== this.offset) {
                    this.moveDirection = offset >= this.offset ? 1 : -1;
                    this.offset = offset;

                    var cssValue = 'translate3D(' + this.offset + 'px, 0, 0)';
                    el.style.webkitTransform = cssValue;
                    el.style.msTransform = cssValue;
                    el.style.transform = cssValue;

                    return true;
                }
                else {
                    return false;
                }
            }
        });
    }

    bsSwitchPanelCtrl.$inject = '$scope, $element, $attrs'.split(', ');
    function bsSwitchPanelCtrl($scope, $el, $attrs) {
        var el = $el[0],
            switchPanelCtrl = this;

        angular.extend(switchPanelCtrl, {
            // 对应的 switch
            switch: undefined,

            // 对应的 DOM 元素
            $el: $el,
            el: el,

            init: function(switchCtrl) {
                var self = this;

                $el.addClass(switchCtrl.config.classPrefix + '-panel');

                if ($scope.$last) {
                    $el.addClass('last');
                }

                this.outerWidth = this.getOuterWidth();

                switchCtrl.$scope.$on('switch.refresh', function() {
                    self.refresh();
                });
            },

            refresh: function() {
                this.outerWidth = this.getOuterWidth();
            },

            getOuterWidth: function() {
                var elStyles = window.getComputedStyle(el),

                    computedDisplay = elStyles.display,
                    inlineDisplay = el.style.display,

                    isHide = computedDisplay === 'none',

                    marginRight, marginLeft, offsetWidth, outerWidth;

                if (isHide) {
                    el.style.display = 'block';
                }

                marginRight = parseInt(elStyles.marginRight, 10),
                marginLeft = parseInt(elStyles.marginLeft, 10),
                offsetWidth = el.offsetWidth,

                outerWidth = marginRight + marginLeft + offsetWidth;

                if (isHide) {
                    if (inlineDisplay === 'none') {
                        el.style.display = 'none';
                    }
                    else if (!inlineDisplay) {
                        delete el.style.display;
                    }
                }

                return outerWidth;
            }
        });
    }

    bsSwitchNavCtrl.$inject = '$scope, $element, $attrs'.split(', ');
    function bsSwitchNavCtrl($scope, $el, $attrs) {
        var el = $el[0],
            switchNavCtrl = this;

        angular.extend(switchNavCtrl, {
            // 存放所有导航节点
            nodes: [],

            activeNode: undefined,
            activeNodeIndex: undefined,

            init: function(switchCtrl) {
                var self = this;

                this.switch = switchCtrl;
                $el.addClass(switchCtrl.config.classPrefix + '-nav');

                switchCtrl.$scope.$on('bsSwitch.panel.add', function($event, index) {
                    self.addNode(index);
                });

                switchCtrl.$scope.$on('bsSwitch.panel.remove', function($event, index) {
                    self.removeNode(index);
                });

                switchCtrl.$scope.$on('bsSwitch.panel.switch', function($event, index) {
                    self.change(index);
                });
            },

            change: function(index) {
                if (this.activeNode) {
                    this.activeNode.removeClass('active');
                }

                if (index < 0 || index >= this.nodes.length) {
                    index = undefined;
                }

                this.activeNodeIndex = index;
                this.activeNode = this.nodes[index];

                this.activeNode.addClass('active');
            },

            addNode: function(index) {
                var node = angular.element('<span>●</span>');

                node.addClass(this.switch.config.classPrefix + '-nav-item');
                this.nodes.push(node);

                if (index === 0) {
                    this.nodes.unshift(node);
                    $el.append(node);
                }
                else {
                    this.nodes.splice(index, 0, node);
                    this.nodes[index - 1].after(node);
                }
            },

            removeNode: function(index) {
                var node = this.nodes.splice(index, 1)[0];
                if (!node) return;

                if (this.activeNode === node) {
                    this.change(index);
                }

                node.remove();
            }
        });
    }


    function bsSwitch() {
        return {
            restrict: 'E',
            controller: 'bsSwitchCtrl',
            scope: {
                step: '=?',
                classPrefix: '@?',
                autoPlay: '=?',
                type: '@?'
            },
            link: link
        };

        function link($scope, $el, $attrs, switchCtrl) {
            if ($attrs.$attr.autoPlay && $scope.autoPlay === undefined) {
                $scope.autoPlay = 3;
            }

            $scope.autoPlay = parseInt($scope.autoPlay, 10);

            if (!$scope.type) {
                $scope.type = 'slider';
            }

            if (!$scope.step) {
                $scope.step = 1;
            }

            if (!$scope.classPrefix) {
                $scope.classPrefix = 'ui-switch';
            }

            switchCtrl.init();

            window.addEventListener('resize', refresh);

            $scope.$on('$destroy', function() {
                window.removeEventListener('resize', refresh);
            });

            function refresh(e) {
                try {
                    if (!(e instanceof CustomEvent)) {
                        switchCtrl.refresh();
                    }
                }
                catch (e) {
                    switchCtrl.refresh();
                }
            }
        }
    }

    bsSwitchContent.$inject = '$controller'.split(', ');
    function bsSwitchContent($controller) {
        return {
            restrict: 'E',
            require: ['^^bsSwitch'],
            link: link
        };

        function link($scope, $el, $attrs, ctrls) {
            var switchCtrl = ctrls[0],
                contentCtrlName = 'bsSwitchContent' + capitalize(switchCtrl.config.type) + 'Ctrl';

            var switchContentCtrl = $controller(contentCtrlName, {
                $scope: $scope,
                $element: $el,
                $attrs: $attrs
            });

            switchCtrl.content = switchContentCtrl;

            if (switchCtrl.isInit) {
                init();
            }
            else {
                switchCtrl.$scope.$on('switch.init', init);
            }

            function init() {
                switchContentCtrl.init(switchCtrl);
                switchCtrl.setSwitchContent(switchContentCtrl);
            }
        }
    }

    function bsSwitchPanel() {
        return {
            restrict: 'E',
            controller: 'bsSwitchPanelCtrl',
            require: ['^^bsSwitch', 'bsSwitchPanel'],
            scope: true,
            link: link
        };

        function link($scope, $el, $attrs, ctrls) {
            var switchCtrl = ctrls[0],
                switchPanelCtrl = ctrls[1];

            if (switchCtrl.isInit) {
                switchPanelCtrl.init(switchCtrl);
                switchCtrl.content.addPanel(switchPanelCtrl);
                addDestroyHandler();
            }
            else {
                switchCtrl.$scope.$on('switch.init', function() {
                    switchPanelCtrl.init(switchCtrl);
                });

                switchCtrl.$scope.$on('switch.init.end', function() {
                    switchCtrl.content.addPanel(switchPanelCtrl);
                    addDestroyHandler();
                });
            }

            function addDestroyHandler() {
                $scope.$on('$destroy', function() {
                    switchCtrl.content.removePanel(switchPanelCtrl);
                });
            }
        }
    }

    function bsSwitchNav() {
        return {
            restrict: 'E',
            controller: 'bsSwitchNavCtrl',
            require: ['^^bsSwitch', 'bsSwitchNav'],
            link: link
        };

        function link($scope, $el, $attrs, ctrls) {
            var switchCtrl = ctrls[0],
                switchNavCtrl = ctrls[1];

            if (switchCtrl.isInit) {
                switchNavCtrl.init(switchCtrl);
            }
            else {
                switchCtrl.$scope.$on('switch.init', function() {
                    switchNavCtrl.init(switchCtrl);
                });
            }
        }
    }


    // ---------------------------
    // tool functions
    // ---------------------------

    function capitalize(str) {
        var fc = str[0];
        return fc ? (fc.toUpperCase() + str.substring(1)) : str;
    }

    var Animate = (function AnimateInit() {

        'use strict';

        var

        // 每秒帧数
        FPS = 77,

        // 动画速度关键字
        SPEED = {
            slow : 600,
            fast : 200,
            normal : 400
        },

        // 帧间时长，由FPS计算而来。
        FS = Math.floor(1000 / FPS),

        _hasown = Object.prototype.hasOwnProperty;

        /**
         * 动画处理函数
         *
         * @params:
         *   options : {Object} :
         *     配置对象
         *
         * @options:
         *   target : {*} :
         *     应用动画的对象
         *
         *   speed : {Number, ["slow", "normal", "fast"]} :
         *     动画时长；数值类型，以毫秒为单位；另外也可以使用预定的速度关键字字符串。
         *
         *   easing : {String} : 'linear'
         *
         *   iteration : {Number, ["infinite"]} : 1
         *     动画执行次数，另外也可以使用预定关键字字符串“infinite”来设定动画无限循环。
         *
         *   into : {Function} :
         *     初始化函数；将在动画开始前（第一帧计时开始时）执行。
         *
         *   frame : {Function} :
         *     帧计算函数；将在动画每一帧计时结束后执行。
         *
         *   over : {Function} :
         *     清理函数；将在动画结束后（最后一帧完成时）执行；
         *
         *   suspend : {Function} :
         *     暂停处理函数；将在动画暂停时执行；
         */
        function Animate( options ) {
            var t = this;

            t.target = options.target;    // 动画应用目标对象
            t.isRun = false;              // 动画是否正在运行
            t.isSuspend = false;          // 动画是否暂停
            t.iterationCount = 0;         // 动画当前播放次数

            t._timeout = null;            // 动画计时器
            t._playTime = 0;              // 动画播放时长

            options.easing = options.easing || Animate.easing.def;
            options.speed = _hasown.call(SPEED, options.speed) ? SPEED[options.speed] : options.speed;
            options.iteration = options.iteration !== 'infinite' && options.iteration < 1 ? 1 : options.iteration;

            t.options = options;
        }

        Animate.prototype = {
            constructor : Animate,

            /**
             * 执行动画
             */
            run : function() {
                var t = this, lastFrameTime;

                if ( t.isRun ) {
                    return false;
                }

                if ( !t.isSuspend ) {
                    this._callFun( 'init', [t.target, t] );
                }
                else {
                    t.isSuspend = false;
                }

                t.isRun = true;
                lastFrameTime = new Date();
                t._timeout = setTimeout(step, FS);

                return true;

                function step() {
                    var now = new Date(), progress;

                    t._playTime += now - lastFrameTime;          // 播放时长
                    progress = t._playTime / t.options.speed;    // 进度百分比

                    progress = Math.min(progress, 1);  // 防止百分比数值溢出

                    t._frame(progress);  // 执行帧

                    // 继续执行动画
                    if ( progress < 1 ) {
                        lastFrameTime = now;
                        t._timeout = setTimeout( step, FS );
                    }
                    // 完成动画
                    else {
                        t.over();
                        t.iterationCount++;

                        // 重复播放
                        if ( t.options.iteration === 'infinite' || t.options.iteration > t.iterationCount ) {
                            t.run();
                        }
                        else {
                            t.iterationCount = 0;
                        }
                    }
                }
            },

            /**
             * 暂停动画
             */
            suspend : function() {
                var t = this;

                clearTimeout(t._timeout);
                t.isSuspend = true;

                t._callFun( 'suspend', [t.target, t] );
            },

            /**
             * 结束动画
             *
             * @params:
             *   toEnd : {Boolean} : false
             *     是否将动画立即完成。
             *
             *     p.s.
             *     无论动画是否立即完成，结束回调函数都会被调用。
             */
            over : function( toEnd ) {
                var t = this;

                if ( toEnd ) {
                    t._frame( 1 );
                }

                clearTimeout(t._timeout);

                t.isRun = false;
                t.isSuspend = false;
                t._playTime = 0;

                t._callFun( 'over', [t.target, t] );
            },

            /**
             * 执行动画帧
             */
            _frame : function( progress ) {
                var t = this;
                t._callFun( 'frame', [t.target, progress, Animate.easing[t.options.easing]( progress, 0, 1, 1 ), t] );
            },

            /**
             * 执行回调函数
             */
            _callFun : function( name, params ) {
                var fun = this.options[name],
                    r = true;

                if ( typeof fun === 'function' ) {
                    fun.apply( this, params );
                }
                else if ( typeof fun === 'object' && typeof fun.length === 'number' ) {  // array
                    for ( var i = 0, l = fun.lenght; i < l; i++ ) {
                        fun[i].apply( this, params );
                    }
                }
                else {
                    r = false;
                }

                return r;
            }
        };

        Animate.easing = {
            def : 'linear',

            linear : function( t, b, c, d ) {
                return t;
            }
        };

        return Animate;
    })(window);

})();
