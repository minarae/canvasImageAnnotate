(function ($) {
    $.fn.canvasSelectArea = function (customOptions) {
        var defaultOptions = {
            allowMove: true,
            allowResize: true,
            allowSelect: true,
            allowGapSize: 2
        }

        var oPointStruct = function (sId) {
            this.id = sId;
            this.color = '#ff961e';
            this.isActive = true;
            this.location = [];

            this.getLength = function () {
                return this.location.length;
            }

            this.getColor = function () {
                return this.color;
            }

            this.setColor = function (color) {
                this.color = color;
            }
        };
        var oThis = $(this);

        // 좌표를 저장하는 배열
        var aBlocks = [];
        var iBlockIdx = 0;

        // 활성화된 좌표
        var aSelectedPoint = [];
        var oOriginPosition = null;

        var iActiveBlock = null;

        // 캔버스
        var canvas = $(this)[0];
        var ctx = canvas.getContext('2d');

        // 이미지 객체 생성
        var image = new Image();

        // 옵션을 기본값으로 설정
        var options = defaultOptions;

        // 상태값
        var status = 'ready';

        // 키보드값 체크
        var keyCode = null;

        init();

        var setOptions = function (customOptions) {
            options = $.extend(options, customOptions);
        }

        function init() {
            // 사용자 옵션과 병합
            setOptions(customOptions);

            image.src = oThis.attr('data-image-url');
            image.onload = function () {
                canvas.width = image.width;
                canvas.height = image.height;
                $(canvas).css({background: 'url(' + image.src + ')'});
            }

            canvas.addEventListener('mousedown', mouseDown);
            canvas.addEventListener('contextmenu', rightDown);
            canvas.addEventListener('mouseup', stopDrag);
            window.addEventListener('keydown', setKeyDown);
            window.addEventListener('keyup', unsetKeyDown);
        }

        function stopDrag() {
            canvas.removeEventListener('mousemove', movePoint);
            canvas.removeEventListener('mousemove', moveRegion);

            aSelectedPoint = [];
            oOriginPosition = null;
            iActiveBlock = null;

            $(canvas).css('cursor', 'default');
        }

        function setKeyDown(e)
        {
            keyCode = e.keyCode;
        }

        function unsetKeyDown(e)
        {
            keyCode = null;
        }

        function movePoint(e) {
            if (options.allowResize === false) {
                canvas.removeEventListener('mousemove', movePoint);
                aSelectedPoint = [];
                return false;
            }
            var x = e.x - canvas.offsetLeft;
            var y = e.y - canvas.offsetTop;

            if (aSelectedPoint.length === 0) {
                return;
            }

            // 이미지 영역이 삭제되었을 경우를 대비
            if (isObject(aBlocks[aSelectedPoint[0]]) === false) {
                aSelectedPoint = [];
                return;
            }
            var iLength = aBlocks[aSelectedPoint[0]].getLength();

            if (keyCode === 17 && checkSquare(aBlocks[aSelectedPoint[0]].location) === true) {
                aBlocks[aSelectedPoint[0]].location[aSelectedPoint[1]].x = x;
                aBlocks[aSelectedPoint[0]].location[aSelectedPoint[1]].y = y;
                switch (aSelectedPoint[1]) {
                    case 0:
                        aBlocks[aSelectedPoint[0]].location[4].x = x;
                        aBlocks[aSelectedPoint[0]].location[4].y = y;
                        aBlocks[aSelectedPoint[0]].location[1].x = x;
                        aBlocks[aSelectedPoint[0]].location[3].y = y;
                        break;
                    case 1:
                        aBlocks[aSelectedPoint[0]].location[0].x = x;
                        aBlocks[aSelectedPoint[0]].location[4].x = x;
                        aBlocks[aSelectedPoint[0]].location[2].y = y;
                    case 2:
                        aBlocks[aSelectedPoint[0]].location[3].x = x;
                        aBlocks[aSelectedPoint[0]].location[1].y = y;
                        break;
                    case 3:
                        aBlocks[aSelectedPoint[0]].location[0].y = y;
                        aBlocks[aSelectedPoint[0]].location[4].y = y;
                        aBlocks[aSelectedPoint[0]].location[2].x = x;
                    case 4:
                        aBlocks[aSelectedPoint[0]].location[0].x = x;
                        aBlocks[aSelectedPoint[0]].location[0].y = y;
                        aBlocks[aSelectedPoint[0]].location[1].x = x;
                        aBlocks[aSelectedPoint[0]].location[3].y = y;
                        break;
                }
            } else {
                if (iLength !== 1 && (aSelectedPoint[1] === 0 || aSelectedPoint[1] === iLength - 1)) {
                    if (aBlocks[aSelectedPoint[0]].location[0].x === aBlocks[aSelectedPoint[0]].location[iLength - 1].x
                        && aBlocks[aSelectedPoint[0]].location[0].y === aBlocks[aSelectedPoint[0]].location[iLength - 1].y) {
                        aBlocks[aSelectedPoint[0]].location[0].x = x;
                        aBlocks[aSelectedPoint[0]].location[0].y = y;
                        aBlocks[aSelectedPoint[0]].location[iLength - 1].x = x;
                        aBlocks[aSelectedPoint[0]].location[iLength - 1].y = y;
                    } else {
                        aBlocks[aSelectedPoint[0]].location[aSelectedPoint[1]].x = x;
                        aBlocks[aSelectedPoint[0]].location[aSelectedPoint[1]].y = y;
                    }
                } else {
                    aBlocks[aSelectedPoint[0]].location[aSelectedPoint[1]].x = x;
                    aBlocks[aSelectedPoint[0]].location[aSelectedPoint[1]].y = y;
                }
            }
            aBlocks[aSelectedPoint[0]].isActive = true;

            draw();
        }

        function checkSquare(aLocation) {
            if (aLocation.length !== 5) {
                return false;
            }

            for (var iIdx = 1; iIdx < 5; iIdx++) {
                if (aLocation[iIdx].x !== aLocation[iIdx - 1].x && aLocation[iIdx].y !== aLocation[iIdx - 1].y) {
                    return false;
                }
            }

            if (aLocation[0].x !== aLocation[4].x || aLocation[0].y !== aLocation[4].y) {
                return false;
            } else {
                return true;
            }
        }

        // 좌표를 마우스 우클릭시 해당 좌표를 삭제
        function rightDown(e) {
            e.preventDefault();

            if (Array.isArray(aBlocks) === false || aBlocks.length === 0) {
                return false;
            }

            var x = e.x - canvas.offsetLeft;
            var y = e.y - canvas.offsetTop;

            for (var iIdx = 0; iIdx <= iBlockIdx; iIdx++) {
                if (isObject(aBlocks[iIdx]) === false) {
                    continue;
                }
                var iLength = aBlocks[iIdx].getLength();

                for (var iIdx2 = 0; iIdx2 < iLength; iIdx2++) {
                    var flagX = Math.abs(x - aBlocks[iIdx].location[iIdx2].x);
                    var flagY = Math.abs(y - aBlocks[iIdx].location[iIdx2].y);

                    if (flagX <= options.allowGapSize && flagY <= options.allowGapSize) {
                        var iEndIdx = aBlocks[iIdx].getLength() - 1;
                        var oCurPoint = aBlocks[iIdx].location[iIdx2];
                        var oEndPoint = aBlocks[iIdx].location[iEndIdx];

                        if (iIdx2 === 0 && iEndIdx !== iIdx2 && oCurPoint.x === oEndPoint.x && oCurPoint.y === oEndPoint.y) {
                            if (iEndIdx === 1) {
                                aBlocks[iIdx].location.splice(1, 1);
                            } else {
                                aBlocks[iIdx].location[iEndIdx].x = aBlocks[iIdx].location[iIdx2 + 1].x;
                                aBlocks[iIdx].location[iEndIdx].y = aBlocks[iIdx].location[iIdx2 + 1].y;
                            }
                        }
                        aBlocks[iIdx].location.splice(iIdx2, 1);

                        if (aBlocks[iIdx].getLength() === 0) {
                            aBlocks.splice(iIdx, 1);
                        }
                        draw();
                        return false;
                    }
                }
            }

            return false;
        }

        function moveRegion(e)
        {
            e.preventDefault();

            canvas.removeEventListener('mousemove', movePoint);
            aSelectedPoint = [];

            $(canvas).css('cursor', 'move');
            // 좌표 구하기
            var oTarget = {
                x: e.x - canvas.offsetLeft,
                y: e.y - canvas.offsetTop
            };

            var iMovingX = oTarget.x - oOriginPosition.x;
            var iMovingY = oTarget.y - oOriginPosition.y;

            var iLength = aBlocks[iActiveBlock].getLength();

            if (checkSquare(aBlocks[iActiveBlock].location) === true) {
                for (var iIdx = 0; iIdx < iLength - 1; iIdx++) {
                    aBlocks[iActiveBlock].location[iIdx].x += iMovingX;
                    aBlocks[iActiveBlock].location[iIdx].y += iMovingY;
                }
            } else {
                for (var iIdx = 0; iIdx < iLength; iIdx++) {
                    aBlocks[iActiveBlock].location[iIdx].x += iMovingX;
                    aBlocks[iActiveBlock].location[iIdx].y += iMovingY;
                }
            }
            oOriginPosition = oTarget;

            draw();
        }

        function mouseDown(e) {
            if (e.which === 3) {
                return false;
            }

            e.preventDefault();
            // 좌표 구하기
            var oTarget = {
                x: e.x - canvas.offsetLeft,
                y: e.y - canvas.offsetTop
            };

            for (var iIdx = 0; iIdx <= iBlockIdx; iIdx++) {
                if (isObject(aBlocks[iIdx]) === false) {
                    continue;
                }
                aBlocks[iIdx].isActive = false;
            }

            // 선택한 좌표가 이미 선택된 좌표인지 검사해서 이미 선택된 좌표이면 드래그 활성화
            var findFlag = false;
            for (var iIdx = 0; iIdx <= iBlockIdx; iIdx++) {
                if (isObject(aBlocks[iIdx]) === false) {
                    continue;
                }

                // 클릭한 좌표가 이미 선택된 좌표이면 드래그
                aBlocks[iIdx].location.forEach(function (value, key, array) {
                    var gapX = Math.abs(oTarget.x - value.x);
                    var gapY = Math.abs(oTarget.y - value.y);

                    if (gapX <= options.allowGapSize && gapY <= options.allowGapSize) {
                        if (key !== 0 || status === 'ready') {
                            aSelectedPoint = [iIdx, key];
                            canvas.addEventListener('mousemove', movePoint);
                            findFlag = true;
                            return false;
                        }
                    }
                });

                if (findFlag === true) {
                    return false;
                }

                if (status === 'ready') {
                    // 블록이 완성된 상태에서 선 위를 클릭하면 해당 블록에 좌표 추가
                    var iLength = aBlocks[iIdx].getLength();
                    for (var iIdx2 = 1; iIdx2 < iLength; iIdx2++) {
                        if (checkPointOnLine(oTarget, aBlocks[iIdx].location[iIdx2 - 1], aBlocks[iIdx].location[iIdx2]) === true) {
                            aBlocks[iIdx].location.splice(iIdx2, 0, oTarget);
                            aBlocks[iIdx].isActive = true;

                            draw();
                            return false;
                        }
                    }

                    if (checkInside(oTarget, aBlocks[iIdx].location) === true) {
                        aBlocks[iIdx].isActive = true;
                        oOriginPosition = oTarget;

                        iActiveBlock = iIdx;
                        canvas.addEventListener('mousemove', moveRegion);

                        draw();
                        return false;
                    }
                }
            }

            if (status === 'ready') {
                for (var iIdx = iBlockIdx; isObject(aBlocks[iIdx]) === true; iIdx++) {
                    // empty
                }
                aBlocks[iBlockIdx] = new oPointStruct(iBlockIdx);
                if (keyCode === 17) { // Control 키를 누른 상태에서 좌표를 찍으면 사각형을 만든다.
                    oOriginPosition = oTarget;

                    // 사각형을 만든다.
                    aBlocks[iBlockIdx].location.push(oTarget);
                    aBlocks[iBlockIdx].location.push({x: oTarget.x, y: oTarget.y + 10});
                    aBlocks[iBlockIdx].location.push({x: oTarget.x + 10, y: oTarget.y + 10});
                    aBlocks[iBlockIdx].location.push({x: oTarget.x + 10, y: oTarget.y});
                    aBlocks[iBlockIdx].location.push(oTarget);

                    aSelectedPoint = [iBlockIdx, 2];
                    iBlockIdx++;
                    canvas.addEventListener('mousemove', movePoint);

                    draw();
                    return false;
                }
            } else if (aBlocks[iBlockIdx].getLength() > 1) {
                var flagX = Math.abs(oTarget.x - aBlocks[iBlockIdx].location[0].x);
                var flagY = Math.abs(oTarget.y - aBlocks[iBlockIdx].location[0].y);

                // 선택한 좌표가 첫 좌표와 동일하면 블록이 완성된 것으로 간주
                if (flagX <= options.allowGapSize && flagY <= options.allowGapSize) {
                    aBlocks[iBlockIdx].location.push({
                        x: aBlocks[iBlockIdx].location[0].x,
                        y: aBlocks[iBlockIdx].location[0].y
                    });

                    aBlocks[iBlockIdx].isActive = true;
                    // 대기 상태로 상태값 변경
                    status = 'ready';
                    iBlockIdx++;

                    draw();
                    return false;
                }
            }

            status = 'drawing';
            aBlocks[iBlockIdx].isActive = true;
            aBlocks[iBlockIdx].location.push(oTarget);

            aSelectedPoint = [iBlockIdx, aBlocks[iBlockIdx].getLength() - 1];
            canvas.addEventListener('mousemove', movePoint);

            draw();
            return false;
        }

        var draw = function () {
            ctx.canvas.width = ctx.canvas.width;

            ctx.globalCompositeOperation = 'destination-over';
            ctx.fillStyle = 'rgb(255,255,255)'
            ctx.strokeStyle = 'rgb(255,20,20)';
            ctx.lineWidth = 1;

            for (var iIdx = 0; iIdx < aBlocks.length; iIdx++) {
                var oCurBlocks = aBlocks[iIdx];
                if (isObject(oCurBlocks) === false) {
                    continue;
                }

                if (Array.isArray(oCurBlocks.location) === false) {
                    continue;
                }

                ctx.beginPath();
                ctx.moveTo(oCurBlocks.location[0].x, oCurBlocks.location[0].y);
                ctx.fillStyle = 'rgb(255,255,255)'
                ctx.strokeStyle = rgba(oCurBlocks.getColor());

                var iLength = oCurBlocks.getLength();
                var aLocations = oCurBlocks.location;
                for (var i = 0; i < iLength; i++) {
                    if (oCurBlocks.isActive === true) {
                        ctx.setLineDash([]);
                        ctx.fillRect(aLocations[i].x - 2, aLocations[i].y - 2, 4, 4);
                        ctx.strokeRect(aLocations[i].x - 2, aLocations[i].y - 2, 4, 4);
                    }

                    if (i > 0) {
                        ctx.setLineDash([5, 5]);
                        ctx.lineTo(aLocations[i].x, aLocations[i].y);
                    }
                }
                ctx.stroke();

                if (iLength > 2 && aLocations[0].x === aLocations[iLength - 1].x && aLocations[0].y === aLocations[iLength - 1].y) {
                    ctx.fillStyle = rgba(oCurBlocks.getColor(), 0.2);
                    ctx.fill();
                    ctx.stroke();

                    drawTrash(ctx, aLocations, iIdx);
                }

                if (oCurBlocks.isActive === false) {
                    $('#trash-' + iIdx).css('display', 'none');
                } else {
                    $('#trash-' + iIdx).css('display', 'block');
                }
            }
        }

        var drawTrash = function (ctx, aTargetPoints, iIndex) {
            var iMaxX, iFindIdx;
            var iAllowBandwidth = 30;

            // 최우측 좌표를 찾음.
            iMaxX = 0;
            for (var iIdx = 0; iIdx < aTargetPoints.length; iIdx++) {
                if (iMaxX < aTargetPoints[iIdx].x) {
                    iMaxX = aTargetPoints[iIdx].x;
                }
            }

            var aIndexY = [];
            // 최우측 좌표에서 allowSize 안에 있는 좌표들을 찾음.
            for (var iIdx = 0; iIdx < aTargetPoints.length; iIdx++) {
                if (aTargetPoints[iIdx].x > iMaxX - iAllowBandwidth) {
                    aIndexY.push(iIdx);
                }
            }

            // 우측 좌표에서 가장 y가 작은 값은 찾음.
            var iMinY = ctx.canvas.width;
            for (var iIdx = 0; iIdx < aIndexY.length; iIdx++) {
                if (aTargetPoints[aIndexY[iIdx]].y < iMinY) {
                    iMinY = aTargetPoints[aIndexY[iIdx]].y;
                    iFindIdx = aIndexY[iIdx];
                }
            }

            var iLeft = aTargetPoints[iFindIdx].x + ctx.canvas.offsetLeft + 4;
            var iTop = aTargetPoints[iFindIdx].y + ctx.canvas.offsetTop - 28;

            var div = $('#trash-' + iIndex);
            if (div.length === 0) {
                var div = $('<div>').addClass('delete-area').append(
                    $('<div>').addClass('select-areas-delete-area')
                ).css('left', iLeft).css('top', iTop).css('z-index', 1).attr('id', 'trash-' + iIndex).click(function () {
                    var aElementId = $(this).attr('id').split('-');

                    aBlocks.splice(aElementId[1], 1);
                    $(this).remove();
                    draw();
                });

                $('#main').append(div);
            } else {
                div.css('left', iLeft).css('top', iTop).css('z-index', 1);
            }
        }

        function checkInside(oTarget, aLocation)
        {
            var iLeftX, iRightX = 0, iTopY, iBottomY = 0;
            var iAllowGapSize = options.allowGapSize;

            iLeftX = aLocation[0].x;
            iTopY = aLocation[0].y;
            // 우선 상하좌우 최대값을 구해서 사각형을 그리고 그 사각형 밖에 있으면 false
            for (var iIdx = 0; iIdx < aLocation.length; iIdx++) {
                if (iLeftX > aLocation[iIdx].x) {
                    iLeftX = aLocation[iIdx].x;
                }

                if (iRightX < aLocation[iIdx].x) {
                    iRightX = aLocation[iIdx].x;
                }

                if (iTopY > aLocation[iIdx].y) {
                    iTopY = aLocation[iIdx].y;
                }

                if (iBottomY < aLocation[iIdx].y) {
                    iBottomY = aLocation[iIdx].y;
                }
            }

            if (oTarget.x < iLeftX - iAllowGapSize || oTarget.x > iRightX + iAllowGapSize || oTarget.y < iTopY - iAllowGapSize || oTarget.y > iBottomY + iAllowGapSize) {
                return false;
            }

            return true;
        }

        function checkPointOnLine(oTarget, oPoint1, oPoint2)
        {
            var iAllowGapSize = options.allowGapSize;

            // 해당 좌표가 사이에 있는 값인지 확인
            if (oPoint1.x < oPoint2.x) {
                if (oTarget.x < oPoint1.x - iAllowGapSize || oTarget.x > oPoint2.x + iAllowGapSize) {
                    return false;
                }
            } else {
                if (oTarget.x > oPoint1.x + iAllowGapSize || oTarget.x < oPoint2.x - iAllowGapSize) {
                    return false;
                }
            }

            if (oPoint1.y < oPoint2.y) {
                if (oTarget.y < oPoint1.y - iAllowGapSize || oTarget.y > oPoint2.y + iAllowGapSize) {
                    return false;
                }
            } else {
                if (oTarget.y > oPoint1.y + iAllowGapSize || oTarget.y < oPoint2.y - iAllowGapSize) {
                    return false;
                }
            }
            var fInclination = (oPoint2.y - oPoint1.y) / (oPoint2.x - oPoint1.x);
            var fIntercept = oPoint2.y - (fInclination * oPoint2.x);

            var fResultY = fInclination * oTarget.x + fIntercept;
            var fResultX = (oTarget.y - fIntercept) / fInclination;

            if (Math.abs(oTarget.x - fResultX) <= iAllowGapSize || Math.abs(oTarget.y - fResultY) <= iAllowGapSize) {
                return true;
            } else {
                return false;
            }
        }

        var setColor = function (iIdx, sColor) {
            aBlocks[iIdx].setColor(sColor);
        }

        var setBlock = function (aBlock) {
            if (Array.isArray(aBlock) === false) {
                return false;
            }

            console.log(aBlock);
        }

        return {
            setBlock: setBlock,
            setColor: setColor
        };
    }

    function isObject(target)
    {
        if (target === null) { return false;}
        return ((typeof target === 'function') || (typeof target === 'object'));
    }

    var rgba = function (hex, opacity) {
        hex = parseInt(hex.substr(1), 16);
        var r = hex >> 16;
        var g = hex >> 8 & 0xFF;
        var b = hex & 0xFF;

        if (opacity === undefined) {
            return 'rgb(' + r + ',' + g + ',' + b + ')';
        } else {
            return 'rgba(' + r + ',' + g + ',' + b + ', ' + opacity + ')';
        }
    }
})(jQuery);
