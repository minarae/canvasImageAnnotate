(function ($) {
    $.canvasAreasDraw = function () { };

    var AreaStruct = function (sId) {
        this.id = sId;
        this.color = '#ff961e';
        this.name = 'test Label';
        this.isActive = true;
        this.locations = [];

        this.getLength = function () {
            return this.locations.length;
        }

        this.getColor = function () {
            return this.color;
        }

        this.setColor = function (color) {
            this.color = color;
        }
    };

    $.canvasAreasDraw.prototype.init = function (oObj, oCustomOptions) {
        var oThis = this;
        var oDefaultOptions = {
            allowMove: true,
            allowResize: true,
            allowSelect: true,
            allowGapSize: 2,
            defaultColor: '#ff961e',
            onCreated: null,
            onSelected: null,
            onDeleted: null,
            zoomLayer: null,
            areas: []
        }

        this.options = $.extend(oDefaultOptions, oCustomOptions);

        // 좌표를 저장하는 배열
        this._aAreas = [];
        this._iAreaIdx = 0;

        // 활성화된 좌표
        this._aSelectedPosition = [];
        this.oOriginPosition = null;

        this._iActiveBlock = null;

        // 캔버스
        this.canvas = $(oObj)[0];
        this.ctx = this.canvas.getContext('2d');

        // 이미지 객체 생성
        this.oImage = new Image();

        // 상태값
        this.status = 'ready';

        // 키보드값 체크
        this.keyCode = [];

        this.oImage.src = $(oObj).attr('data-image-url');
        this.oImage.onload = function () {
            oThis.canvas.width = oThis.oImage.width;
            oThis.canvas.height = oThis.oImage.height;

            oThis.options.areas.forEach(function (value, index, array) {
                var oArea = new AreaStruct(value.id);
                if (value.color) {
                    oArea.setColor(value.color);
                }

                for (var iIdx = 0; iIdx < value.locations.length; iIdx++) {
                    oArea.locations.push({
                        x: value.locations[iIdx][0],
                        y: value.locations[iIdx][1],
                    });
                }
                oArea.locations.push({
                    x: value.locations[0][0],
                    y: value.locations[0][1],
                });

                oThis._aAreas.push(oArea);
            });

            oThis.draw();
        }

        oThis.canvas.addEventListener('mousedown', _mouseDown);
        oThis.canvas.addEventListener('contextmenu', _rightDown);
        oThis.canvas.addEventListener('mouseup', _stopDrag);
        window.addEventListener('keydown', _setKeyDown);
        window.addEventListener('keyup', _unsetKeyDown);

        if (this.options.zoomLayer !== null) {
            var zoomCanvas = document.getElementById(this.options.zoomLayer);

            if (zoomCanvas !== null) {
                oThis.canvas.addEventListener('mousemove', zoom);
            }
        }

        function _setKeyDown(e) {
            var keyCode = e.keyCode;

            if (oThis.keyCode.indexOf(keyCode) < 0) {
                oThis.keyCode.push(keyCode);
                oThis.keyCode.sort();
            }

            if (_keyCheck() === 'completing' && oThis.status === 'drawing' && isObject(oThis._aAreas[oThis._iAreaIdx]) === true && oThis._aAreas[oThis._iAreaIdx].getLength() >= 3) {
                oThis._aAreas[oThis._iAreaIdx].locations.push({
                    x: oThis._aAreas[oThis._iAreaIdx].locations[0].x,
                    y: oThis._aAreas[oThis._iAreaIdx].locations[0].y
                });

                oThis._aAreas[oThis._iAreaIdx].isActive = true;
                // 대기 상태로 상태값 변경
                oThis.status = 'ready';
                oThis._iAreaIdx++;

                oThis.draw();

                _callOnCreated();

                return false;
            }
        }

        function _unsetKeyDown(e) {
            var iIdx = oThis.keyCode.indexOf(e.keyCode);

            if (iIdx >= 0) {
                oThis.keyCode.splice(iIdx, 1);
                oThis.keyCode.sort();
            }
        }

        function _stopDrag() {
            oThis.canvas.removeEventListener('mousemove', _movePoint);
            oThis.canvas.removeEventListener('mousemove', _moveRegion);

            /*if (oThis._iActiveBlock !== null) {
                console.log(oThis._aAreas[oThis._iActiveBlock].locations);
            }*/

            oThis.aSelectedPoint = [];
            oThis.oOriginPosition = null;
            oThis._iActiveBlock = null;

            $(oThis.canvas).css('cursor', 'default');
        }

        // 좌표를 마우스 우클릭시 해당 좌표를 삭제
        function _rightDown(e) {
            e.preventDefault();

            if (Array.isArray(oThis._aAreas) === false || oThis._aAreas.length === 0) {
                return false;
            }

            var options = oThis.options;
            var oTarget = _getMousePosition(e);

            for (var iIdx = 0; iIdx <= oThis._iAreaIdx; iIdx++) {
                if (isObject(oThis._aAreas[iIdx]) === false) {
                    continue;
                }
                var iLength = oThis._aAreas[iIdx].getLength();

                for (var iIdx2 = 0; iIdx2 < iLength; iIdx2++) {
                    var flagX = Math.abs(oTarget.x - oThis._aAreas[iIdx].locations[iIdx2].x);
                    var flagY = Math.abs(oTarget.y - oThis._aAreas[iIdx].locations[iIdx2].y);

                    if (flagX <= options.allowGapSize && flagY <= options.allowGapSize) {
                        var iEndIdx = oThis._aAreas[iIdx].getLength() - 1;
                        var oCurPoint = oThis._aAreas[iIdx].locations[iIdx2];
                        var oEndPoint = oThis._aAreas[iIdx].locations[iEndIdx];

                        if (iIdx2 === 0 && iEndIdx !== iIdx2 && oCurPoint.x === oEndPoint.x && oCurPoint.y === oEndPoint.y) {
                            if (iEndIdx === 1) {
                                oThis._aAreas[iIdx].locations.splice(1, 1);
                            } else {
                                oThis._aAreas[iIdx].locations[iEndIdx].x = oThis._aAreas[iIdx].locations[iIdx2 + 1].x;
                                oThis._aAreas[iIdx].locations[iEndIdx].y = oThis._aAreas[iIdx].locations[iIdx2 + 1].y;
                            }
                        }
                        oThis._aAreas[iIdx].locations.splice(iIdx2, 1);

                        if (oThis._aAreas[iIdx].getLength() === 0) {
                            oThis._aAreas.splice(iIdx, 1);
                            $('#trash-' + iIdx).remove();

                            if (iIdx === oThis._iAreaIdx) {
                                oThis.status = 'ready';
                            }
                        }
                        oThis.draw();
                        return false;
                    }
                }
            }

            return false;
        }

        function _movePoint(e) {
            if (oThis.options.allowResize === false) {
                oThis.canvas.removeEventListener('mousemove', movePoint);
                oThis._aSelectedPosition = [];
                return false;
            }

            var oTarget = _getMousePosition(e);
            var aSelectedPoint = oThis._aSelectedPosition;

            if (aSelectedPoint.length === 0) {
                return;
            }

            // 이미지 영역이 삭제되었을 경우를 대비
            if (isObject(oThis._aAreas[aSelectedPoint[0]]) === false) {
                aSelectedPoint = [];
                return;
            }
            var iLength = oThis._aAreas[aSelectedPoint[0]].getLength();

            if (_keyCheck() === 'square' && _checkSquare(oThis._aAreas[aSelectedPoint[0]].locations) === true) {
                oThis._aAreas[aSelectedPoint[0]].locations[aSelectedPoint[1]] = oTarget;
                switch (aSelectedPoint[1]) {
                    case 0:
                        oThis._aAreas[aSelectedPoint[0]].locations[4] = oTarget;
                        oThis._aAreas[aSelectedPoint[0]].locations[1].x = oTarget.x;
                        oThis._aAreas[aSelectedPoint[0]].locations[3].y = oTarget.y;
                        break;
                    case 1:
                        oThis._aAreas[aSelectedPoint[0]].locations[0].x = oTarget.x;
                        oThis._aAreas[aSelectedPoint[0]].locations[4].x = oTarget.x;
                        oThis._aAreas[aSelectedPoint[0]].locations[2].y = oTarget.y;
                        break;
                    case 2:
                        oThis._aAreas[aSelectedPoint[0]].locations[3].x = oTarget.x;
                        oThis._aAreas[aSelectedPoint[0]].locations[1].y = oTarget.y;
                        break;
                    case 3:
                        oThis._aAreas[aSelectedPoint[0]].locations[0].y = oTarget.y;
                        oThis._aAreas[aSelectedPoint[0]].locations[4].y = oTarget.y;
                        oThis._aAreas[aSelectedPoint[0]].locations[2].x = oTarget.x;
                        break;
                    case 4:
                        oThis._aAreas[aSelectedPoint[0]].locations[0] = oTarget;
                        oThis._aAreas[aSelectedPoint[0]].locations[1].x = oTarget.x;
                        oThis._aAreas[aSelectedPoint[0]].locations[3].y = oTarget.y;
                        break;
                }
            } else {
                if (iLength !== 1 && (aSelectedPoint[1] === 0 || aSelectedPoint[1] === iLength - 1)) {
                    if (oThis._aAreas[aSelectedPoint[0]].locations[0].x === oThis._aAreas[aSelectedPoint[0]].locations[iLength - 1].x
                        && oThis._aAreas[aSelectedPoint[0]].locations[0].y === oThis._aAreas[aSelectedPoint[0]].locations[iLength - 1].y) {
                        oThis._aAreas[aSelectedPoint[0]].locations[0] = oTarget;
                        oThis._aAreas[aSelectedPoint[0]].locations[iLength - 1] = oTarget;
                    } else {
                        oThis._aAreas[aSelectedPoint[0]].locations[aSelectedPoint[1]] = oTarget;
                    }
                } else {
                    oThis._aAreas[aSelectedPoint[0]].locations[aSelectedPoint[1]] = oTarget;
                }
            }
            oThis._aAreas[aSelectedPoint[0]].isActive = true;

            oThis.draw();
        }

        function _moveRegion(e) {
            e.preventDefault();

            oThis.canvas.removeEventListener('mousemove', oThis.movePoint);
            oThis._aSelectedPositionaSelectedPoint = [];

            $(oThis.canvas).css('cursor', 'move');
            // 좌표 구하기
            var oTarget = _getMousePosition(e);

            var iMovingX = oTarget.x - oThis.oOriginPosition.x;
            var iMovingY = oTarget.y - oThis.oOriginPosition.y;
            var iLength = oThis._aAreas[oThis._iActiveBlock].getLength();

            for (var iIdx = 0; iIdx < iLength; iIdx++) {
                oThis._aAreas[oThis._iActiveBlock].locations[iIdx].x += iMovingX;
                oThis._aAreas[oThis._iActiveBlock].locations[iIdx].y += iMovingY;
            }
            oThis.oOriginPosition = oTarget;

            oThis.draw();
        }

        function _mouseDown(e) {
            if (e.which === 3) {
                return false;
            }

            var canvas = $(oThis.canvas)[0];
            var options = oThis.options;

            if (e.which === 3) {
                return false;
            }

            e.preventDefault();
            // 좌표 구하기
            var oTarget = _getMousePosition(e);

            // 모든 영역은 비활성화
            for (var iIdx = 0; iIdx <= oThis._iAreaIdx; iIdx++) {
                if (isObject(oThis._aAreas[iIdx]) === false) {
                    continue;
                }
                oThis._aAreas[iIdx].isActive = false;
            }

            // 선택한 좌표가 이미 선택된 좌표인지 검사해서 이미 선택된 좌표이면 드래그 활성화
            var findFlag = false;
            for (var iIdx = 0; iIdx <= oThis._iAreaIdx; iIdx++) {
                if (isObject(oThis._aAreas[iIdx]) === false) {
                    continue;
                }

                oThis._aAreas[iIdx].locations.forEach(function (value, key, array) {
                    var gapX = Math.abs(oTarget.x - value.x);
                    var gapY = Math.abs(oTarget.y - value.y);

                    if (gapX <= options.allowGapSize && gapY <= options.allowGapSize) {
                        if (key !== 0 || status === 'ready') {
                            oThis._aSelectedPosition = [iIdx, key];
                            canvas.addEventListener('mousemove', _movePoint);
                            findFlag = true;
                            return false;
                        }
                    }
                });

                if (findFlag === true) {
                    return false;
                }

                if (oThis.status === 'ready') {
                    // 블록이 완성된 상태에서 선 위를 클릭하면 해당 블록에 좌표 추가
                    var iLength = oThis._aAreas[iIdx].getLength();
                    for (var iIdx2 = 1; iIdx2 < iLength; iIdx2++) {
                        if (_checkPointOnLine(oTarget, oThis._aAreas[iIdx].locations[iIdx2 - 1], oThis._aAreas[iIdx].locations[iIdx2]) === true) {
                            oThis._aAreas[iIdx].locations.splice(iIdx2, 0, oTarget);
                            oThis._aAreas[iIdx].isActive = true;

                            oThis.draw();
                            return false;
                        }
                    }

                    if (_checkInside(oTarget, oThis._aAreas[iIdx].locations) === true) {
                        oThis._aAreas[iIdx].isActive = true;
                        oThis.oOriginPosition = oTarget;
                        oThis._iActiveBlock = iIdx;

                        _callOnSelected()
                        canvas.addEventListener('mousemove', _moveRegion);
                        oThis.draw();

                        return false;
                    }
                }
            }

            if (oThis.status === 'ready') {
                for (; isObject(oThis._aAreas[oThis._iAreaIdx]) === true; oThis._iAreaIdx++) { }
                oThis._aAreas[oThis._iAreaIdx] = new AreaStruct(oThis._iAreaIdx);
                oThis._aAreas[oThis._iAreaIdx].setColor(oThis.options.defaultColor);

                if (_keyCheck() === 'square') { // Control 키를 누른 상태에서 좌표를 찍으면 사각형을 만든다.
                    oThis.oOriginPosition = oTarget;

                    // 사각형을 만든다.
                    oThis._aAreas[oThis._iAreaIdx].locations.push({x: oTarget.x, y: oTarget.y});
                    oThis._aAreas[oThis._iAreaIdx].locations.push({x: oTarget.x, y: oTarget.y + 10});
                    oThis._aAreas[oThis._iAreaIdx].locations.push({x: oTarget.x + 10, y: oTarget.y + 10});
                    oThis._aAreas[oThis._iAreaIdx].locations.push({x: oTarget.x + 10, y: oTarget.y});
                    oThis._aAreas[oThis._iAreaIdx].locations.push({x: oTarget.x, y: oTarget.y});

                    oThis._aSelectedPosition = [oThis._iAreaIdx, 2];
                    oThis._iAreaIdx++;
                    canvas.addEventListener('mousemove', _movePoint);

                    oThis.draw();

                    _callOnCreated();

                    return false;
                }
            } else if (oThis._aAreas[oThis._iAreaIdx].getLength() > 1) {
                var flagX = Math.abs(oTarget.x - oThis._aAreas[oThis._iAreaIdx].locations[0].x);
                var flagY = Math.abs(oTarget.y - oThis._aAreas[oThis._iAreaIdx].locations[0].y);

                // 선택한 좌표가 첫 좌표와 동일하면 블록이 완성된 것으로 간주
                if (flagX <= options.allowGapSize && flagY <= options.allowGapSize) {
                    oThis._aAreas[oThis._iAreaIdx].locations.push({
                        x: oThis._aAreas[oThis._iAreaIdx].locations[0].x,
                        y: oThis._aAreas[oThis._iAreaIdx].locations[0].y
                    });

                    oThis._aAreas[oThis._iAreaIdx].isActive = true;
                    // 대기 상태로 상태값 변경
                    oThis.status = 'ready';
                    oThis._iAreaIdx++;

                    oThis.draw();

                    _callOnCreated();

                    return false;
                }
            }

            oThis.status = 'drawing';
            oThis._aAreas[oThis._iAreaIdx].isActive = true;
            oThis._aAreas[oThis._iAreaIdx].locations.push(oTarget);

            oThis._aSelectedPosition = [oThis._iAreaIdx, oThis._aAreas[oThis._iAreaIdx].getLength() - 1];
            canvas.addEventListener('mousemove', _movePoint);

            oThis.draw();

            return false;
        }

        function _getMousePosition(e) {
            return {
                x: Math.round(e.pageX - $(e.target).offset().left),
                y: Math.round(e.pageY - $(e.target).offset().top)
            }
        }

        function _keyCheck() {
            var squareMode = JSON.stringify([17]);
            var separatingMode = JSON.stringify([17, 18]);
            var completeDraw = JSON.stringify([13]);

            var checkValue = JSON.stringify(oThis.keyCode);

            if (oThis.keyCode.length === 0) {
                return '';
            } else if (checkValue === squareMode) {
                return 'square';
            } else if (checkValue === separatingMode) {
                return 'separating';
            } else if (checkValue === completeDraw) {
                return 'completing';
            }
        }

        function _checkPointOnLine(oTarget, oPoint1, oPoint2) {
            var iAllowGapSize = oThis.options.allowGapSize;

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

            if (oPoint1.x === oPoint2.x && Math.abs(oPoint1.x - oTarget.x) <= iAllowGapSize) {
                if ((oPoint1.y < oTarget.y && oTarget.y < oPoint2.y) || (oPoint1.y > oTarget.y && oTarget.y > oPoint2.y)) {
                    return true;
                }
            }

            if (oPoint1.y === oPoint2.y && Math.abs(oPoint1.y - oTarget.y) <= iAllowGapSize) {
                if ((oPoint1.x < oTarget.x && oTarget.x < oPoint2.x) || (oPoint1.x > oTarget.x && oTarget.x > oPoint2.x)) {
                    return true;
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

        function _checkInside(oTarget, aLocation) {
            var iLeftX, iRightX = 0, iTopY, iBottomY = 0;
            var iAllowGapSize = oThis.options.allowGapSize;

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

        function _checkSquare(aLocation) {
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

        function _callOnCreated() {
            if (oThis.options.onCreated !== null) {
                oThis.options.onCreated.call(oThis, oThis._iAreaIdx - 1);
            }
        }

        function _callOnSelected() {
            if (oThis.options.onSelected !== null) {
                oThis.options.onSelected.call(oThis, oThis.options);
            }
        }

        function zoom(event) {
            var x = event.layerX;
            var y = event.layerY;
            var zoomCanvas = document.getElementById(oThis.options.zoomLayer);
            var zoomCtx = zoomCanvas.getContext('2d');

            var width = zoomCanvas.width;
            var height = zoomCanvas.height;

            zoomCtx.drawImage(oThis.canvas,
                Math.min(Math.max(0, x - 30), oThis.oImage.width - 60),
                Math.min(Math.max(0, y - 30), oThis.oImage.height - 60),
                60, 60,
                0, 0,
                width, height);

            var splitWidth = Math.round(width / 2);
            var splitHeight = Math.round(height / 2);

            zoomCtx.beginPath();
            zoomCtx.moveTo(splitWidth, 0);
            zoomCtx.lineTo(splitWidth, height);
            zoomCtx.moveTo(0, splitHeight);
            zoomCtx.lineTo(width, splitHeight);
            zoomCtx.stroke();
        }
    }

    $.canvasAreasDraw.prototype.draw = function () {
        var aAreas = this._aAreas;
        var ctx = this.ctx;
        var oThis = this;
        drawAction();

        var _callOnDeleted = function (iDeleteKey) {
            if (oThis.options.onDeleted !== null) {
                oThis.options.onDeleted.call(this, iDeleteKey);
            }
        };

        function drawAction() {
            // 캔버스 초기화
            ctx.canvas.width = ctx.canvas.width;

            ctx.globalCompositeOperation = 'destination-over';
            ctx.fillStyle = 'rgb(255,255,255)'
            ctx.strokeStyle = 'rgb(255,20,20)';
            ctx.lineWidth = 1;

            for (var iIdx = 0; iIdx < aAreas.length; iIdx++) {
                var oCurBlocks = aAreas[iIdx];
                if (isObject(oCurBlocks) === false) {
                    continue;
                }

                if (Array.isArray(oCurBlocks.locations) === false) {
                    continue;
                }

                ctx.beginPath();
                ctx.moveTo(oCurBlocks.locations[0].x, oCurBlocks.locations[0].y);
                ctx.fillStyle = 'rgb(255,255,255)';
                ctx.strokeStyle = rgba(oCurBlocks.getColor());

                var iLength = oCurBlocks.getLength();
                var aLocations = oCurBlocks.locations;
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

                    _drawTrash(ctx, aLocations, oCurBlocks.id);
                }

                if (oCurBlocks.isActive === false) {
                    $('#trash-' + oCurBlocks.id).css('display', 'none');
                } else {
                    $('#trash-' + oCurBlocks.id).css('display', 'block');
                }
            }
            ctx.drawImage(oThis.oImage, 0, 0);
        }

        function _drawTrash(ctx, aTargetPoints, iIndex) {
            var iMaxX, iFindIdx = 2;
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

                    _callOnDeleted(aElementId[1]);
                    for (var iIdx = 0; iIdx < aAreas.length; iIdx++) {
                        if (isObject(aAreas[iIdx]) === false) {
                            continue;
                        }
                        if (aAreas[iIdx].id.toString() === aElementId[1].toString()) {
                            aAreas.splice(iIdx, 1);
                            break;
                        }
                    }
                    $(this).remove();
                    drawAction();
                });

                $(oThis.canvas).parent().append(div);
            } else {
                div.css('left', iLeft).css('top', iTop).css('z-index', 1);
            }
        }
    }

    $.canvasAreasDraw.prototype.setColor = function (options) {
        if (isObject(this._aAreas[options.id]) === false) {
            return false;
        }

        this._aAreas[options.id].setColor(options.color);
        this.draw();

        return true;
    }

    $.canvasAreasDraw.prototype.focusArea = function (id) {
        for (var iIdx = 0; iIdx <= this._iAreaIdx; iIdx++) {
            if (isObject(this._aAreas[iIdx]) === false) {
                continue;
            }
            this._aAreas[iIdx].isActive = false;
        }

        if (isObject(this._aAreas[id]) === false) {
            return false;
        }

        this._aAreas[id].isActive = true;
        this.draw();

        return true;
    }

    $.canvasAreasDraw.prototype.areas = function () {
        var result = [];

        this._aAreas.forEach(function (value, index, array) {
            var locations = [];

            value.locations.forEach(function (position, idx, arr) {
                locations.push([position.x, position.y]);
            });
            // 마지막 좌표는 삭제
            locations.pop();

            result.push({
                id: value.id,
                locations: locations
            });
        });

        return result;
    }

    $.canvasAreas = function (object, options) {
        var oObj = $(object);
        if (oObj.data('mainCanvasAreasDraw') === undefined) {
            var mainCanvasAreasDraw = new $.canvasAreasDraw();
            mainCanvasAreasDraw.init(oObj, options);

            oObj.data('mainCanvasAreasDraw', mainCanvasAreasDraw);
            oObj.trigger('loaded');
        }

        return oObj.data('mainCanvasAreasDraw');
    }

    $.fn.canvasAreas = function (customOptions) {
        if ($.canvasAreasDraw.prototype[customOptions]) { // Method call
            var ret = $.canvasAreasDraw.prototype[customOptions].apply($.canvasAreas(this), Array.prototype.slice.call(arguments, 1));
            return typeof ret === "undefined" ? this : ret;
        } else if (typeof customOptions === 'object' || !customOptions) {
            this.each(function () {
                var oCurObj = this;
                $.canvasAreas(oCurObj, customOptions);
            });

            return this;
        } else {
            $.error("Method " + customOptions + " does not exist on jQuery.canvasAreas");
        }
    }

    var isObject = function (target) {
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