// Always wrap a plug-in in '(function($) { // Plug-in goes here }) (jQuery);'
// 항상 플러그인을 '(function($) { // Plug-in goes here }) (jQuery);' 형태로 감싼다.
(function ($) {
    $.imageCrop = function (object, customOptions) {
        // Rather than requiring a lengthy amount of arguments, pass the
        // plug-in options in an object literal that can be extended over
        // the plug-in's defaults.
        // 많은 양의 파라미터를 요구하기 보다, 객체 플로그인의 기본 옵션을 확장하는 플로그인 옵션을 넘길 수 있도록 한다.
        var defaultOptions = {
            allowMove: true,
            allowResize: true,
            allowSelect: true,
            minSelect: [0, 0],
            outlineOpacity: 0.5,
            overlayOpacity: 0.5,
            selectionPosition: [0, 0],
            selectionWidth: 0,
            selectionHeight: 0
        };

        // Set options to default
        // 옵션을 기본값으로 설정
        var options = defaultOptions;

        // And merge the with the custom options
        // 그리고 사용자 옵션과 병합
        setOptions(customOptions);

        // Merge current options with the custom option
        // 현재 옵션과 사용자 옵션을 병합
        function setOptions(customOptions) {
            options = $.extend(options, customOptions);
        }

        // Initialize the image layer
        // 이미지 레이어 초기화
        var $image = $(object);

        // Initialize an image holder
        // 이미지 홀더 초기화
        var $holder = $('<div />').css({
            position: 'relative'
        }).width($image.width()).height($image.height());

        // Wrap the holder around the image
        // 이미지를 홀더로 감싸기
        $image.wrap($holder).css({
            position: 'absolute'
        });

        // Initialize an overlay layer and place it above the image
        // overlay lay 초기화와 이미지 위에 위치하기
        var $overlay = $('<div id="image-crop-overlay" />').css({
            opacity: options.overlayOpacity,
            position: 'absolute'
        }).width($image.width()).height($image.height()).insertAfter($image);

        // Initialize a trigger layer and place it above the overlay layer
        // 트리거 레이어 초기화 및 오버레이 레이어 위에 위치하기
        var $trigger = $('<div />').css({
            backgroundColor: '#000000',
            opacity: 0,
            position: 'absolute'
        }).width($image.width()).height($image.height()).insertAfter($overlay);

        // Initialize an outline layer and place it above the trigger layer
        // 아웃라인 레이어 초기화 및 트리거 레이어 위에 위치하기
        var $outline = $('<div id="image-crop-outline" />').css({
            opacity: options.outlineOpacity,
            position: 'absolute'
        }).insertAfter($trigger);

        // Initialize a selective layer and place it above the outline layer
        // 선택 레이어 초기화 및 아웃라인 위에 위치하기
        var $selection = $('<div />').css({
            background: 'url(' + $image.attr('src') + ') no-repeat',
            position: 'absolute'
        }).insertAfter($outline);

        // Initialize global variables
        var selectionExists,
            selectionOffset = [0, 0],
            selectionOrigin = [0, 0];

        // Verify if the selection size is bigger than the minimum accepted
        // and set the selection existence accordingly
        // 선택된 크기가 허용된 최소 크기보다 큰지 확인하고 이에 따라 선택이 존재하는지 설정한다.
        if (options.selectionWidth > options.minSelect[0] && options.selectionHeight > options.minSelect[1]) {
            selectionExists = true;
        } else {
            selectionExists = false;
        }

        // Call the 'updateInterface' function for the first time to initialize the plug-in interface
        // 플러그인 인터페이스의 초기화를 위해서 최초에 'updateInterface' 함수를 호출
        updateInterface();

        if (options.allowSelect) {
            // Bind an event handler to the 'mousedown' event of the trigger layer
            // 트리거 레이어의 'mousedown' 이벤트를 핸들러와 연결
            $trigger.mousedown(setSelection);
        }

        // Get the current offset of an element
        // 요서의 현재 오프셋을 반환
        function getElementOffset(object) {
            var offset = $(object).offset();

            return [offset.left, offset.top];
        };

        // Get the current mouse position relative to the image position
        // 현재 마우스 위치 정보를 이미지 위치에 상대값을 반환
        function getMousePosition(event) {
            var imageOffset = getElementOffset($image);

            var x = event.pageX - imageOffset[0],
                y = event.pageY - imageOffset[1];

            x = (x < 0) ? 0 : (x > $image.width()) ? $image.width() : x;
            y = (y < 0) ? 0 : (y > $image.height()) ? $image.height() : y;

            return [x, y];
        };

        // Update the overlay layer
        // 오버레이 레이어 갱신
        function updateOverlayLayer() {
            $overlay.css({
                display: selectionExists ? 'block' : 'none'
            });
        };

        // Update the trigger Layer
        // 트리거 레이어 갱신
        function updateTriggerLayer() {
            $trigger.css({
                cursor: options.allowSelect ? 'crosshair' : 'default'
            });
        };

        // Update the selection
        // 선택 갱신
        function updateSelection() {
            // Update the outline layer
            // 아웃라인 레이어 갱신
            $outline.css({
                cursor: 'default',
                display: selectionExists ? 'block' : 'none',
                left: options.selectionPosition[0],
                top: options.selectionPosition[1]
            }).width(options.selectionWidth).height(options.selectionHeight);

            // Update the selection layer
            // 선택 레이어 갱신
            $selection.css({
                backgroundPosition: (-options.selectionPosition[0] - 1) + 'px ' + (-options.selectionPosition[1] - 1) + 'px',
                cursor: options.allowMove ? 'move' : 'default',
                display: selectionExists ? 'block' : 'none',
                left: options.selectionPosition[0] + 1,
                top: options.selectionPosition[1] + 1
            }).width((options.selectionWidth - 2 > 0) ? (options.selectionWidth - 2) : 0).height((options.selectionHeight - 2 > 0) ? (options.selectionHeight - 2) : 0);
        }

        // Update the cursor type
        // 커서 타입 갱신
        function updateCursor(cursorType) {
            $trigger.css({
                cursor: cursorType
            });

            $outline.css({
                cursor: cursorType
            });

            $selection.css({
                cursor: cursorType
            })
        }

        // Update the plug-in's interface
        // 플러그인 인터페이스 갱신
        function updateInterface(sender) {
            switch (sender) {
                case 'setSelection' :
                    updateOverlayLayer();
                    updateSelection();

                    break;
                case 'resizeSelection' :
                    updateSelection();
                    updateCursor('crosshair');

                    break;
                default:
                    updateTriggerLayer();
                    updateOverlayLayer();
                    updateSelection();
            }
        }

        // Set a new selection
        // 새로운 선택 설정
        function setSelection(event) {
            // Prevent the default action of the event
            // 이벤트의 기본 액션을 막음
            event.preventDefault();

            // Prevent the event from being notified
            // 이벤트 알림 방지
            event.stopPropagation();

            // Bind an event handler to the 'mousemove' and 'mouseup' events
            // 'mousemove' 이벤트와 'mouseup' 이벤트를 이벤트 핸들러와 연결
            $(document).mousemove(resizeSelection).mouseup(releaseSelection);

            // Notify that  selection exists
            // 선택이 있음을 알림
            selectionExists = true;

            // Reset the selection size
            // 선택의 크기를 다시 설정
            options.selectionWidth = 0;
            options.selectionHeight = 0;

            // Get the selection origin
            // 선택의 출처 얻기
            selectionOrigin = getMousePosition(event);

            // And set its position
            // 그리고 그것의 위치를 설정
            options.selectionPosition[0] = selectionOrigin[0];
            options.selectionPosition[1] = selectionOrigin[1];
            console.log(options.selectionPosition);

            // Update only the needed elements of the plug-in interface by specifying the sender of the current call
            // 현재 호출한 호출자를 명시하여 플러그인 인터페이스의 요소에서 필요한 부분 갱신
            updateInterface('setSelection');
        }

        // Resize the current selection
        // 현재 선택의 크기 재설정
        function resizeSelection(event) {
            // Prevent the default action of the event
            // 이벤트의 기본 액션 정지
            event.preventDefault();

            // Prevent the event from being notified
            // 이벤트 알림 방지
            event.stopPropagation();

            var mousePosition = getMousePosition(event);

            // GetThe selection size
            options.selectionWidth = mousePosition[0] - selectionOrigin[0];
            options.selectionHeight = mousePosition[1] - selectionOrigin[1];

            if (options.selectionWidth < 0) {
                options.selectionWidth = Math.abs(options.selectionWidth);
                options.selectionPosition[0] = selectionOrigin[0] - options.selectionWidth;
            } else {
                options.selectionPosition[0] = selectionOrigin[0];
            }

            if (options.selectionHeight < 0) {
                options.selectionHeight = Math.abs(options.selectionHeight);
                options.selectionPosition[1] = selectionOrigin[1] - options.selectionHeight;
            } else {
                options.selectionPosition[1] = selectionOrigin[1];
            }

            // Update only the needed elements of the plug-in interface by specifying the sender of the current call
            // 현재 호출한 호출자를 명시하여 플러그인 인터페이스의 요소에서 필요한 부분 갱신
            updateInterface('resizeSelection');
        }

        // Release the current selection
        // 현재 선택 릴리즈
        function releaseSelection(event) {
            // Prevent the default action of the event
            // 이벤트의 기본 액션 정지
            event.preventDefault();

            // Prevent the event from being notified
            // 이벤트 알림 방지
            event.stopPropagation();

            // Unbind the event handler to the 'mousemove' event
            // 'mousemove' 이벤트와 이벤트 핸들러 끊기
            $(document).unbind('mousemove');

            // Unbind the event handler to the 'mouseup' event
            // 'mouseup' 이벤트와 이벤트 핸들러 끊기
            $(document).unbind('mouseup');

            // Update the selection origin
            selectionOrigin[0] = options.selectionPosition[0];
            selectionOrigin[1] = options.selectionPosition[1];

            // Verify if the selection size is bigger than minimum accepted and set the selection existence accordingly
            // 선택의 크기가 허용된 최소 크기보다 큰지 판단하고 이에 따라서 선택의 존재를 설정한다.
            if (options.selectionWidth > options.minSelect[0] && options.selectionHeight > options.minSelect[1]) {
                selectionExists = true;
            } else {
                selectionExists = false;
            }

            // Update only the needed elements of the plug-in interface by specify the sender of the current call
            // 현재 호출한 호출자를 명시하여 플러그인 인터페이스의 요소에서 필요한 부분 갱신
            updateInterface('releaseSelection');
        }
    };

    $.fn.imageCrop = function (customOptions) {
        // Iterate over each object
        // 각 객체에 대해 반복 수행
        this.each(function () {
            var currentObject = this,
                image = new Image();

            // And attach imageCrop when the object is loaded
            // 그리고 객체가 로드될 때 imageCrop 붙이기
            image.onload = function () {
                $.imageCrop(currentObject, customOptions);
            };

            // Reset the src because cached images don't fire load sometimes
            // 캐시된 이미지가 때때로 로드되지 않기 때문에 src를 재설정
            image.src = currentObject.src;
        });

        // Unless the plug-in is returning an intrinsic value, always have the
        // function return the 'this' keyword to maintain chainability
        // 플러그인이 본질적인 값을 반환하지 않는 한, 체인이 가능하도록 유지하기 위해서 항상 'always' 키워드를 반환.
        return this;
    };
})(jQuery);