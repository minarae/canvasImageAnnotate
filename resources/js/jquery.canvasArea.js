var Module = {};

(function ($) {
    $.canvasAreasDraw = function () { };

    var AreaStruct = function (sId) {
        this.id = sId;
        this.color = '#ff961e';
        this.label = [];
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

        this.setLabel = function (label) {
            // ignore empty string
            label = $.trim(label);
            if (label.length === 0) {
                return;
            }

            if (this.label.indexOf(label) < 0) {
                this.label.push($.trim(label));
            }
        }

        this.removeLabel = function(label) {
            var oThis = this;
            $.each(this.label, function(key, value) {
                if ($.trim(label) === value) {
                    oThis.label.splice(key, 1);
                }
            });
        }
    };

    const KEYCODE_CTRL = 17;
    const KEYCODE_ALT = 18;
    const KEYCODE_EQUAL = 187;
    const KEYCODE_MINUS = 189;
    const KEYCODE_KEYPAD_PLUS = 107;
    const KEYCODE_KEYPAD_MINUS = 109;
    const KEYCODE_COMPLETE = 13;
    const KEYCODE_SHIFT = 16;
    const KEYCODE_PRINT = 80;
    const KEYCODE_CANCEL = 27;
    const KEYCODE_TAB = 9;
    const KEYCODE_BACKSPACE = 8;
    const KEYCODE_DELETE = 46;

    const KEYCODE_ARROW_LEFT = 37;
    const KEYCODE_ARROW_UP = 38;
    const KEYCODE_ARROW_RIGHT = 39;
    const KEYCODE_ARROW_DOWN = 40;

    const KEYCODE_C = 67;
    const KEYCODE_G = 71;
    const KEYCODE_Y = 89;
    const KEYCODE_Z = 90;

    $.canvasAreasDraw.prototype.init = function (oObj, oCustomOptions) {
        var oThis = this;
        var oDefaultOptions = {
            allowEdit: true,
            allowSelect: true,
            allowGapSize: 2,
            allowZoom: false,
            defaultColor: '#ff961e',
            onCreated: null,
            onSelected: null,
            onDeleted: null,
            areas: []
        }

        this.oObj = oObj;

        this.options = $.extend(oDefaultOptions, oCustomOptions);

        // 좌표를 저장하는 배열
        this._aAreas = [];
        this._iAreaIdx = 0;

        // 활성화된 좌표
        this._aSelectedPosition = [];
        this.oOriginPosition = null;

        this._aActiveBlock = [];

        this._separatingPosition = [];

        this.guideLine = null;

        this.mouseClickFlag = false;
        this.keyDownFlag = false;

        // 캔버스
        this.canvas = $(oObj)[0];
        //this.ctx = this.canvas.getContext('2d');

        // 이미지 객체 생성
        if (this.oImage === undefined) {
            this.oImage = new Image();
        }

        // 상태값
        this.status = 'ready';

        // 키보드값 체크
        this.keyCode = [];

        // undo용 array
        this.undo = [];
        this.redo = [];

        if ($(oObj).data('image-url') !== undefined) {
            this.oImage.src = $(oObj).attr('data-image-url');
            this.oImage.onload = function () {
                oThis.canvas.width = oThis.oImage.width;
                oThis.canvas.height = oThis.oImage.height;

                oThis.options.areas.forEach(function (value, index, array) {
                    oThis._addAreaInfo(value);
                });

                oThis.draw();
            }
        }

        this._addAreaInfo = function (oArea) {
            _saveUndo();
            if (oThis.status === 'drawing') {
                oThis._aAreas.splice(oThis._iAreaIdx, 1);
            }

            oThis.status = 'ready';

            // 나누기 종료
            oThis._separatingPosition = [];
            oThis._aSelectedPosition = [];

            var sId = oArea.id;
            var bFocus = false;
            if (sId === null || sId === undefined) {
                sId = getAreaId();
                bFocus = true;
            }

            var oNewArea = new AreaStruct(sId);
            if (oArea.color) {
                oNewArea.setColor(oArea.color);
            } else {
                oNewArea.setColor(oThis.options.defaultColor);
            }

            if (oArea.label) {
                oNewArea.setLabel(oArea.label);
            }
            if (getArrayDepth(oArea.locations) === 3) {
                for (var iIdx = 0; iIdx < oArea.locations.length; iIdx++) {
                    var subLocations = [];
                    if (oArea.locations[iIdx].length <= 3) {
                        continue;
                    }
                    for (var iIdx2 in oArea.locations[iIdx]) {
                        subLocations.push({
                            x: oArea.locations[iIdx][iIdx2][0],
                            y: oArea.locations[iIdx][iIdx2][1],
                        });
                    }

                    subLocations.push({
                        x: subLocations[0].x,
                        y: subLocations[0].y
                    });

                    oNewArea.locations.push(subLocations);
                }
                if (oNewArea.locations.length === 0) {
                    return;
                }
            } else {
                if (oArea.locations.length <= 3) {
                    return;
                }
                for (var iIdx = 0; iIdx < oArea.locations.length; iIdx++) {
                    oNewArea.locations.push({
                        x: oArea.locations[iIdx][0],
                        y: oArea.locations[iIdx][1],
                    });
                }
                oNewArea.locations.push({
                    x: oArea.locations[0][0],
                    y: oArea.locations[0][1],
                });
            }

            if (bFocus === true) {
                for (var iIdx in oThis._aAreas) {
                    oThis._aAreas[iIdx].isActive = false;
                }
            }

            oNewArea.isActive = bFocus;
            oThis._aAreas.push(oNewArea);

            oThis._iAreaIdx = oThis._aAreas.length;
            oThis._aActiveBlock = [oThis._iAreaIdx - 1];

            oThis._iAreaIdx++;

            if (bFocus === true) {
                oThis.draw();
                _callOnCreated();
            }

            return sId;
        }

        this._setKeyDown = function (e) {
            var keyCode = e.keyCode;

            if (oThis.keyCode.indexOf(keyCode) < 0) {
                oThis.keyCode.push(keyCode);
                oThis.keyCode.sort(compare);
            }

            if (oThis.keyCode.indexOf(KEYCODE_CANCEL) !== -1) {
                for (var iIdx = 0; iIdx <= oThis._iAreaIdx; iIdx++) {
                    if (isObject(oThis._aAreas[iIdx]) === false) {
                        continue;
                    }

                    oThis._aAreas[iIdx].isActive = false;
                }

                if (oThis.status === 'drawing') {
                    oThis._aAreas[oThis._iAreaIdx].isActive = true;
                }

                oThis.draw();
            }

            if (oThis.options.allowEdit === false) {
                return;
            }

            if (oThis.keyCode.indexOf(KEYCODE_COMPLETE) !== -1 && oThis.status === 'drawing' && isObject(oThis._aAreas[oThis._iAreaIdx]) === true && oThis._aAreas[oThis._iAreaIdx].getLength() >= 3) {
                _saveUndo();
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
            } else if ((oThis.keyCode.indexOf(KEYCODE_SHIFT) !== -1 && oThis.keyCode.indexOf(KEYCODE_EQUAL) !== -1) || oThis.keyCode.indexOf(KEYCODE_KEYPAD_PLUS) !== -1) {
                _saveUndo();
                // 영역 머지
                if (oThis._aActiveBlock.length >= 2) {
                    var aLocations = [];

                    oThis._aActiveBlock.sort(compare);

                    for (var iActiveIdx = oThis._aActiveBlock.length - 1; iActiveIdx >= 0; iActiveIdx--) {
                        if (isObject(oThis._aAreas[oThis._aActiveBlock[iActiveIdx]]) === false) {
                            continue;
                        }

                        if (getArrayDepth(oThis._aAreas[oThis._aActiveBlock[iActiveIdx]].locations) === 2) {
                            aLocations = aLocations.concat(oThis._aAreas[oThis._aActiveBlock[iActiveIdx]].locations);
                        } else {
                            aLocations.push(oThis._aAreas[oThis._aActiveBlock[iActiveIdx]].locations);
                        }

                        if (iActiveIdx > 0) {
                            $('#trash-' + oThis._aAreas[oThis._aActiveBlock[iActiveIdx]].id).remove();
                            oThis._callOnDeleted(oThis._aAreas[oThis._aActiveBlock[iActiveIdx]].id);
                            oThis._aAreas.splice(oThis._aActiveBlock[iActiveIdx], 1);
                        }
                    }

                    oThis._aAreas[oThis._aActiveBlock[0]].locations = aLocations;

                    oThis._aActiveBlock = [oThis._aActiveBlock[0]];
                    oThis.draw();
                }
            } else if (oThis.keyCode.indexOf(KEYCODE_MINUS) !== -1 || oThis.keyCode.indexOf(KEYCODE_KEYPAD_MINUS) !== -1) {
                _saveUndo();
                // 영역 split
                for (var iIdx = 0; iIdx < oThis._aActiveBlock.length; iIdx++) {
                    if (isObject(oThis._aAreas[oThis._aActiveBlock[iIdx]]) === false || getArrayDepth(oThis._aAreas[oThis._aActiveBlock[iIdx]].locations) < 2) {
                        continue;
                    }
                    var oCurArea = oThis._aAreas[oThis._aActiveBlock[iIdx]];
                    var aLocations = oCurArea.locations;

                    for (var iLocationIdx = 1; iLocationIdx < aLocations.length; iLocationIdx++) {
                        for (; isObject(oThis._aAreas[oThis._iAreaIdx]) === true; oThis._iAreaIdx++) {
                            // empty
                        }
                        var oArea = new AreaStruct(oThis._iAreaIdx);

                        oArea.label = oCurArea.label;
                        oArea.color = oCurArea.color;
                        oArea.isActive = true;
                        oArea.locations = aLocations[iLocationIdx];

                        oThis._aActiveBlock.push(oThis._iAreaIdx);
                        oThis._aAreas.push(oArea);

                        oThis._iAreaIdx++;
                    }

                    oCurArea.locations = aLocations[0];
                }
            } else if (oThis.keyCode.indexOf(KEYCODE_SHIFT) !== -1 && oThis.options.allowZoom === true) {
                oThis.canvas.addEventListener('mousemove', _zoom, false);
                oThis.canvas.addEventListener('mousedown', _zoom, false);
                oThis.canvas.addEventListener('contextmenu', _zoom, false);
                oThis.canvas.addEventListener('mouseout', _mouseOut, false);

                oThis.zoomLayer.css('display', 'inline');
            } else if (oThis.keyCode.indexOf(KEYCODE_ALT) !== -1 && oThis.keyCode.indexOf(KEYCODE_CTRL) === -1) {
                if ((oThis._aSelectedPosition.length > 0 && isObject(oThis._aAreas[oThis._aSelectedPosition[0]]) && checkSquare(oThis._aAreas[oThis._aSelectedPosition[0]].locations) === true) || oThis.status === 'ready') {
                    oThis.canvas.addEventListener('mousemove', _setGuideLine);
                }
            } else if (oThis.keyCode.indexOf(KEYCODE_CTRL) !== -1 && oThis.keyCode.indexOf(KEYCODE_Z) !== -1) {
                if (oThis.keyDownFlag === true) {
                    return false;
                }
                oThis.keyDownFlag = true;
                _undoAction();
            } else if (oThis.keyCode.indexOf(KEYCODE_CTRL) !== -1 && oThis.keyCode.indexOf(KEYCODE_Y) !== -1) {
                if (oThis.keyDownFlag === true) {
                    return false;
                }
                oThis.keyDownFlag = true;
                _redoAction();
            } else if (oThis.keyCode.indexOf(KEYCODE_TAB) !== -1) {
                // FOCUS MOVE
                e.preventDefault();
                if (oThis.keyDownFlag === true) {
                    return false;
                }
                oThis.keyDownFlag = true;
                var iMaxIndex = Math.max.apply(null, oThis._aActiveBlock);
                var aIndexArray = [];
                for (var idx in oThis._aAreas) {
                    aIndexArray.push(parseInt(idx));
                }

                var iKey = aIndexArray.indexOf(iMaxIndex);
                if (iKey === aIndexArray.length - 1) {
                    iKey = 0;
                } else {
                    iKey++;
                }

                for (var idx in aIndexArray) {
                    if (iKey === parseInt(idx)) {
                        oThis._aAreas[aIndexArray[idx]].isActive = true;
                        oThis._aActiveBlock = [aIndexArray[idx]];
                    } else {
                        oThis._aAreas[aIndexArray[idx]].isActive = false;
                    }
                }
            } else if (oThis.keyCode.indexOf(KEYCODE_BACKSPACE) !== -1 || oThis.keyCode.indexOf(KEYCODE_DELETE) !== -1) {
                // DELETE ACTIVATION BLOCK
                _deleteArea();
            } else if (oThis.keyCode.indexOf(KEYCODE_C) !== -1) {
                if (oThis.keyDownFlag === true) {
                    return;
                }
                oThis.keyDownFlag = true;
                _saveUndo();
                var sColor = getRandomColor();

                for (var iIdx in oThis._aActiveBlock) {
                    oThis._aAreas[oThis._aActiveBlock[iIdx]].color = sColor;
                }

                oThis.draw();
            } else if (oThis.keyCode.indexOf(KEYCODE_G) !== -1) {
                /* if ($('.spinner').length === 0) {
                    var marginTop = oThis.canvas.height / 2 + 10;
                    var spinner = $('<div>').addClass('spinner').append(
                        $('<div>').addClass('bounce1').css('margin-top', marginTop)
                    ).append(
                        $('<div>').addClass('bounce2').css('margin-top', marginTop)
                    ).append(
                        $('<div>').addClass('bounce3').css('margin-top', marginTop)
                    ).css('width', oThis.canvas.width).css('height', oThis.canvas.height);

                    $(oThis.oObj).before(spinner);

                    while(true) {
                        if ($('.spinner').length > 0) {
                            break;
                        }
                    }
                } */
                if (oThis.keyDownFlag === true) {
                    return false;
                }
                oThis.keyDownFlag = true;
                _saveUndo();
                grabcut(oThis);
            } else if (oThis.keyCode.indexOf(KEYCODE_PRINT) !== -1) {
                if (oThis.keyDownFlag === true) {
                    return false;
                }
                console.log(oThis._aAreas);
                console.log(oThis._aActiveBlock);
                console.log(oThis._iAreaIdx);
                oThis.keyDownFlag = true;
            }

            if (moveAreaByArrowKey() === true) {
                e.preventDefault();
            }

            //console.log(oThis.keyCode);
        }

        function _undoAction() {
            if (oThis.undo.length === 0) {
                return;
            }

            var oPrevStatus = oThis.undo.pop();
            _saveRedo();

            oThis._iAreaIdx = oPrevStatus.AreaIdx;
            oThis._aActiveBlock = oPrevStatus.ActiveBlock.slice();
            oThis.status = oPrevStatus.Status;
            if (oThis.status === 'separating') {
                oThis.status = 'ready';
            }

            oThis._aAreas = oPrevStatus.Areas;

            oThis.draw();
        }

        function _redoAction() {
            if (oThis.redo.length === 0) {
                return;
            }

            var oNextStatus = oThis.redo.pop();

            oThis._iAreaIdx = oNextStatus.AreaIdx;
            oThis._aActiveBlock = oNextStatus.ActiveBlock.slice();
            oThis.status = oNextStatus.Status;

            oThis._aAreas = oNextStatus.Areas;

            oThis.draw();
        }

        function _deleteArea() {
            var iCnt = 0;
            oThis._aActiveBlock.sort(compare);
            for (var iIdx in oThis._aActiveBlock) {
                var sId = oThis._aAreas[oThis._aActiveBlock[iIdx] - iCnt].id;
                $('#trash-' + sId).remove();

                oThis._aAreas.splice(oThis._aActiveBlock[iIdx] - iCnt, 1);
                iCnt++;
            }
            oThis._aActiveBlock = [];
        }

        function moveAreaByArrowKey() {
            var moveX = 0;
            var moveY = 0;
            if (oThis.keyCode.indexOf(KEYCODE_ARROW_LEFT) !== -1) {
                moveX = -1;
            }

            if (oThis.keyCode.indexOf(KEYCODE_ARROW_RIGHT) !== -1) {
                moveX = 1;
            }

            if (oThis.keyCode.indexOf(KEYCODE_ARROW_UP) !== -1) {
                moveY = -1;
            }

            if (oThis.keyCode.indexOf(KEYCODE_ARROW_DOWN) !== -1) {
                moveY = 1;
            }

            if (moveX === 0 && moveY === 0) {
                return false;
            }

            _saveUndo();
            for (var iIdx in oThis._aActiveBlock) {
                var iActive = parseInt(oThis._aActiveBlock[iIdx]);

                if (getArrayDepth(oThis._aAreas[iActive].locations) === 2) {
                    for (var iLocationIdx = 0; iLocationIdx < oThis._aAreas[iActive].locations.length; iLocationIdx++) {
                        var iLength = oThis._aAreas[iActive].locations[iLocationIdx].length;

                        for (var iLocation = 0; iLocation < iLength; iLocation++) {
                            oThis._aAreas[iActive].locations[iLocationIdx][iLocation].x += moveX;
                            oThis._aAreas[iActive].locations[iLocationIdx][iLocation].y += moveY;
                        }
                    }
                } else {
                    var iLength = oThis._aAreas[iActive].locations.length;

                    for (var iLocation = 0; iLocation < iLength; iLocation++) {
                        oThis._aAreas[iActive].locations[iLocation].x += moveX;
                        oThis._aAreas[iActive].locations[iLocation].y += moveY;
                    }
                }
            }

            oThis.draw();
            return true;
        }

        this._unsetKeyDown = function (e) {
            var iIdx = oThis.keyCode.indexOf(e.keyCode);

            if (iIdx >= 0) {
                oThis.keyCode.splice(iIdx, 1);
                oThis.keyCode.sort(compare);
            }

            if (e.keyCode === KEYCODE_SHIFT && oThis.options.allowZoom === true) {
                oThis.canvas.removeEventListener('mousemove', _zoom);
                oThis.canvas.removeEventListener('mousedown', _zoom);
                oThis.canvas.removeEventListener('contextmenu', _zoom);
                oThis.canvas.removeEventListener('mouseout', _mouseOut);

                oThis.zoomLayer.css('display', 'none');
            }

            if (e.keyCode === KEYCODE_ALT && oThis.keyCode.indexOf(KEYCODE_CTRL) === -1) {
                oThis.canvas.removeEventListener('mousemove', _setGuideLine);
                oThis.guideLine = null;
            }

            if (oThis.keyCode.indexOf(KEYCODE_ALT) === -1 || oThis.keyCode.indexOf(KEYCODE_CTRL) === -1) {
                if (oThis.status === 'separating') { // 검사
                    var finalPosition = oThis._separatingPosition[oThis._separatingPosition.length - 1];
                    var oCurArea = oThis._aAreas[oThis._aSelectedPosition[0]];
                    var iLength = oCurArea.getLength();
                    var aLocations = oCurArea.locations;

                    var iGapX, iGapY;

                    for (var iIdx = 0; iIdx < iLength; iIdx++) {
                        if (oThis._aSelectedPosition[1] === iLength - 1) {
                            if (iIdx === 0 || iIdx === oThis._aSelectedPosition[1]) {
                                continue;
                            }
                        } else {
                            if (iIdx === oThis._aSelectedPosition[1]) {
                                continue;
                            }
                        }

                        iGapX = Math.abs(aLocations[iIdx].x - finalPosition.x);
                        iGapY = Math.abs(aLocations[iIdx].y - finalPosition.y);

                        if (iGapX <= oThis.options.allowGapSize && iGapY <= oThis.options.allowGapSize) {
                            _saveUndo();
                            oThis._separatingPosition[oThis._separatingPosition.length - 1] = aLocations[iIdx];
                            separate(iIdx);
                            break;
                        }
                    }

                    oThis.status = 'ready';
                }

                // 나누기 종료
                oThis._separatingPosition = [];
                oThis._aSelectedPosition = [];
            }

            oThis.keyDownFlag = false;

            oThis.draw();
        }

        function separate(iEndPoint) {
            var iFront = oThis._aSelectedPosition[1];
            var iEnd = iEndPoint;

            var aFront = [];
            var aEnd = [];
            var iIdx;
            var oCurArea = oThis._aAreas[oThis._aSelectedPosition[0]];
            var iLength = oCurArea.getLength();
            var aLocations = oCurArea.locations;

            for (iIdx = iEnd; ; iIdx++) {
                if (iIdx >= iLength - 1) {
                    iIdx = 0;
                }
                aFront.push({
                    x: aLocations[iIdx].x,
                    y: aLocations[iIdx].y,
                });

                if (iIdx === iFront) {
                    break;
                }

                if (aFront.length > 1 && iIdx === iEnd) {
                    return;
                }
            }

            for (iIdx = iFront; ; iIdx++) {
                if (iIdx >= iLength - 1) {
                    iIdx = 0;
                }
                aEnd.push({
                    x: aLocations[iIdx].x,
                    y: aLocations[iIdx].y,
                });

                if (iIdx === iEnd) {
                    break;
                }

                if (aEnd.length > 1 && iIdx === iFront) {
                    return;
                }
            }

            var separating = oThis._separatingPosition;
            // 처음과 마지막 제거
            for (iIdx = 1; iIdx < separating.length; iIdx++) {
                aFront.push({
                    x: separating[iIdx].x,
                    y: separating[iIdx].y
                });
                aEnd.push({
                    x: separating[separating.length - iIdx - 1].x,
                    y: separating[separating.length - iIdx - 1].y
                });
            }

            if (aFront.length <= 3 || aEnd.length <= 3) {
                return;
            }

            oThis._aAreas[oThis._aSelectedPosition[0]].locations = aFront;

            for (; isObject(oThis._aAreas[oThis._iAreaIdx]) === true; oThis._iAreaIdx++) { }
            oThis._aAreas[oThis._iAreaIdx] = new AreaStruct(getAreaId());
            //oThis._aAreas[oThis._iAreaIdx].setColor(oThis._aAreas[oThis._aSelectedPosition[0]].color);
            oThis._aAreas[oThis._iAreaIdx].setColor(getRandomColor());
            oThis._aAreas[oThis._iAreaIdx].setLabel(oThis._aAreas[oThis._aSelectedPosition[0]].label);
            oThis._aAreas[oThis._iAreaIdx].locations = aEnd;

            oThis._aAreas[oThis._aSelectedPosition[0]].isActive = false;
            oThis._aAreas[oThis._iAreaIdx].isActive = true;
            oThis._aActiveBlock = [oThis._iAreaIdx];

            oThis._iAreaIdx++;

            _callOnCreated();
        }

        function getAreaId(sId) {
            var sId = oThis._iAreaIdx;
            while(true) {
                if (oThis._aAreas.length === 0) {
                    break;
                }
                var bFlag = false;
                for (var iIdx in oThis._aAreas) {
                    if (oThis._aAreas[iIdx].id.toString() === sId.toString()) {
                        bFlag = true;
                        break;
                    }
                }

                if (bFlag === true) {
                    sId++;
                } else {
                    break;
                }
            }

            return sId;
        }

        function _setGuideLine(e) {
            if (oThis.keyCode.indexOf(KEYCODE_CTRL) !== -1 || oThis.keyCode.indexOf(KEYCODE_ALT) === -1) {
                oThis.guideLine = null;
                oThis.canvas.addEventListener('mousemove', _setGuideLine);
            } else {
                var oTarget = _getMousePosition(e);

                oThis.guideLine = {
                    x: oTarget.x,
                    y: oTarget.y
                }
            }

            oThis.draw();
        }

        this._stopDrag = function () {
            oThis.canvas.removeEventListener('mousemove', _movePoint);
            oThis.canvas.removeEventListener('mousemove', _moveRegion);

            oThis.mouseClickFlag = false;

            oThis.aSelectedPoint = [];
            oThis.oOriginPosition = null;

            oThis.guideLine = null;

            $(oThis.canvas).css('cursor', 'default');
        }

        // 좌표를 마우스 우클릭시 해당 좌표를 삭제
        this._rightDown = function (e) {
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

                if (getArrayDepth(oThis._aAreas[iIdx].locations) === 2) {
                    for (var iIdx2 in oThis._aAreas[iIdx].locations) {
                        for(var iIdx3 in oThis._aAreas[iIdx].locations[iIdx2]) {
                            var flagX = Math.abs(oTarget.x - oThis._aAreas[iIdx].locations[iIdx2][iIdx3].x);
                            var flagY = Math.abs(oTarget.y - oThis._aAreas[iIdx].locations[iIdx2][iIdx3].y);

                            if (flagX <= options.allowGapSize && flagY <= options.allowGapSize) {
                                _saveUndo();
                                var iEndIdx = oThis._aAreas[iIdx].locations[iIdx2].length - 1;
                                var oCurPoint = oThis._aAreas[iIdx].locations[iIdx2][iIdx3];
                                var oEndPoint = oThis._aAreas[iIdx].locations[iIdx2][iEndIdx];

                                if (parseInt(iIdx3) === 0 && iEndIdx !== iIdx3 && oCurPoint.x === oEndPoint.x && oCurPoint.y === oEndPoint.y) {
                                    if (iEndIdx === 1) {
                                        oThis._aAreas[iIdx].locations.splice(1, 1);
                                    } else {
                                        iIdx3 = parseInt(iIdx3);
                                        oThis._aAreas[iIdx].locations[iIdx2][iEndIdx].x = oThis._aAreas[iIdx].locations[iIdx2][iIdx3 + 1].x;
                                        oThis._aAreas[iIdx].locations[iIdx2][iEndIdx].y = oThis._aAreas[iIdx].locations[iIdx2][iIdx3 + 1].y;
                                    }
                                }
                                if (oThis._aAreas[iIdx].locations[iIdx2] !== undefined) {
                                    oThis._aAreas[iIdx].locations[iIdx2].splice(iIdx3, 1);

                                    if (oThis._aAreas[iIdx].locations[iIdx2].length === 0) {
                                        oThis._aAreas[iIdx].locations.splice(iIdx2, 1);
                                        oThis._aAreas[iIdx].locations.sort(compare);
                                    }
                                }

                                if (oThis._aAreas[iIdx].locations.length === 1) {
                                    oThis._aAreas[iIdx].locations = oThis._aAreas[iIdx].locations[0]
                                }

                                oThis.draw();
                                return false;
                            }
                        }
                    }
                } else {
                    var iLength = oThis._aAreas[iIdx].getLength();

                    for (var iIdx2 = 0; iIdx2 < iLength; iIdx2++) {
                        var flagX = Math.abs(oTarget.x - oThis._aAreas[iIdx].locations[iIdx2].x);
                        var flagY = Math.abs(oTarget.y - oThis._aAreas[iIdx].locations[iIdx2].y);

                        if (flagX <= options.allowGapSize && flagY <= options.allowGapSize) {
                            _saveUndo();
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
            }

            return false;
        }

        function _movePoint(e) {
            if (oThis.options.allowEdit === false) {
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
            var iLength = oThis._aAreas[aSelectedPoint[0]].locations.length;

            if (oThis.keyCode.indexOf(KEYCODE_ALT) !== -1 && oThis.keyCode.indexOf(KEYCODE_CTRL) === -1 && checkSquare(oThis._aAreas[aSelectedPoint[0]].locations) === true) {
                oThis._aAreas[aSelectedPoint[0]].locations[aSelectedPoint[1]].x = oTarget.x;
                oThis._aAreas[aSelectedPoint[0]].locations[aSelectedPoint[1]].y = oTarget.y;
                switch (aSelectedPoint[1]) {
                    case 0:
                        oThis._aAreas[aSelectedPoint[0]].locations[4].x = oTarget.x;
                        oThis._aAreas[aSelectedPoint[0]].locations[4].y = oTarget.y;
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
                        oThis._aAreas[aSelectedPoint[0]].locations[0].x = oTarget.x;
                        oThis._aAreas[aSelectedPoint[0]].locations[0].y = oTarget.y;
                        oThis._aAreas[aSelectedPoint[0]].locations[1].x = oTarget.x;
                        oThis._aAreas[aSelectedPoint[0]].locations[3].y = oTarget.y;
                        break;
                }
            } else {
                if (aSelectedPoint.length === 3) {
                    iLength = oThis._aAreas[aSelectedPoint[0]].locations[aSelectedPoint[1]].length;
                    if (iLength !== 1 && (aSelectedPoint[2] === 0 || aSelectedPoint[2] === iLength - 1)) {
                        if (oThis._aAreas[aSelectedPoint[0]].locations[aSelectedPoint[1]][0].x === oThis._aAreas[aSelectedPoint[0]].locations[aSelectedPoint[1]][iLength - 1].x
                            && oThis._aAreas[aSelectedPoint[0]].locations[aSelectedPoint[1]][0].y === oThis._aAreas[aSelectedPoint[0]].locations[aSelectedPoint[1]][iLength - 1].y) {
                            oThis._aAreas[aSelectedPoint[0]].locations[aSelectedPoint[1]][0].x = oTarget.x;
                            oThis._aAreas[aSelectedPoint[0]].locations[aSelectedPoint[1]][0].y = oTarget.y;
                            oThis._aAreas[aSelectedPoint[0]].locations[aSelectedPoint[1]][iLength - 1].x = oTarget.x;
                            oThis._aAreas[aSelectedPoint[0]].locations[aSelectedPoint[1]][iLength - 1].y = oTarget.y;
                        } else {
                            oThis._aAreas[aSelectedPoint[0]].locations[aSelectedPoint[1]][aSelectedPoint[2]].x = oTarget.x;
                            oThis._aAreas[aSelectedPoint[0]].locations[aSelectedPoint[1]][aSelectedPoint[2]].y = oTarget.y;
                        }
                    } else {
                        oThis._aAreas[aSelectedPoint[0]].locations[aSelectedPoint[1]][aSelectedPoint[2]].x = oTarget.x;
                        oThis._aAreas[aSelectedPoint[0]].locations[aSelectedPoint[1]][aSelectedPoint[2]].y = oTarget.y;
                    }
                } else {
                    if (iLength !== 1 && (aSelectedPoint[1] === 0 || aSelectedPoint[1] === iLength - 1)) {
                        if (oThis._aAreas[aSelectedPoint[0]].locations[0].x === oThis._aAreas[aSelectedPoint[0]].locations[iLength - 1].x
                            && oThis._aAreas[aSelectedPoint[0]].locations[0].y === oThis._aAreas[aSelectedPoint[0]].locations[iLength - 1].y) {
                            oThis._aAreas[aSelectedPoint[0]].locations[0].x = oTarget.x;
                            oThis._aAreas[aSelectedPoint[0]].locations[0].y = oTarget.y;
                            oThis._aAreas[aSelectedPoint[0]].locations[iLength - 1].x = oTarget.x;
                            oThis._aAreas[aSelectedPoint[0]].locations[iLength - 1].y = oTarget.y;
                        } else {
                            oThis._aAreas[aSelectedPoint[0]].locations[aSelectedPoint[1]].x = oTarget.x;
                            oThis._aAreas[aSelectedPoint[0]].locations[aSelectedPoint[1]].y = oTarget.y;
                        }
                    } else {
                        oThis._aAreas[aSelectedPoint[0]].locations[aSelectedPoint[1]].x = oTarget.x;
                        oThis._aAreas[aSelectedPoint[0]].locations[aSelectedPoint[1]].y = oTarget.y;
                    }
                }
            }
            oThis._aAreas[aSelectedPoint[0]].isActive = true;

            oThis.draw();
        }

        function _moveRegion(e) {
            e.preventDefault();

            oThis.canvas.removeEventListener('mousemove', oThis.movePoint);
            oThis._aSelectedPosition = [];

            $(oThis.canvas).css('cursor', 'move');
            // 좌표 구하기
            var oTarget = _getMousePosition(e);

            var iMovingX = oTarget.x - oThis.oOriginPosition.x;
            var iMovingY = oTarget.y - oThis.oOriginPosition.y;

            for (var iIdx = 0; iIdx < oThis._aActiveBlock.length; iIdx++) {
                var iActive = oThis._aActiveBlock[iIdx];
                if (getArrayDepth(oThis._aAreas[iActive].locations) === 2) {
                    for (var iLocationIdx = 0; iLocationIdx < oThis._aAreas[iActive].locations.length; iLocationIdx++) {
                        var iLength = oThis._aAreas[iActive].locations[iLocationIdx].length;

                        for (var iLocation = 0; iLocation < iLength; iLocation++) {
                            oThis._aAreas[iActive].locations[iLocationIdx][iLocation].x += iMovingX;
                            oThis._aAreas[iActive].locations[iLocationIdx][iLocation].y += iMovingY;
                        }
                    }
                } else {
                    var iLength = oThis._aAreas[iActive].locations.length;

                    for (var iLocation = 0; iLocation < iLength; iLocation++) {
                        oThis._aAreas[iActive].locations[iLocation].x += iMovingX;
                        oThis._aAreas[iActive].locations[iLocation].y += iMovingY;
                    }
                }
            }

            oThis.oOriginPosition = oTarget;

            oThis.draw();
        }

        function _multiSelect(e) {
            if (oThis.mouseClickFlag === true) {
                return;
            }
            var oTarget = _getMousePosition(e);

            for (var iIdx = 0; iIdx <= oThis._iAreaIdx; iIdx++) {
                if (isObject(oThis._aAreas[iIdx]) === false) {
                    continue;
                }

                if (_checkInside(oTarget, oThis._aAreas[iIdx]) === true) {
                    if (oThis._aAreas[iIdx].isActive === true) {
                        oThis._aAreas[iIdx].isActive = false;
                        var iKey = oThis._aActiveBlock.indexOf(iIdx);
                        oThis._aActiveBlock.splice(iKey, 1);
                    } else {
                        oThis._aAreas[iIdx].isActive = true;
                        oThis._aActiveBlock.push(iIdx);
                    }

                    break;
                }
            }
            oThis.mouseClickFlag = true;
            _callOnSelected();

            oThis.draw();
        }

        this._mouseDown = function (e) {
            if (e.which === 3) {
                return false;
            }

            var canvas = $(oThis.canvas)[0];
            var options = oThis.options;

            e.preventDefault();

            // 다중영역 선택 기능
            if (oThis.keyCode.indexOf(KEYCODE_CTRL) !== -1 && oThis.keyCode.indexOf(KEYCODE_ALT) === -1) {
                _multiSelect(e);
                return false;
            }

            // 좌표 구하기
            var oTarget = _getMousePosition(e);

            // 영역 분리 중이면 저장하고 리턴
            if (oThis.status === 'separating') {
                // 중복 좌표 방지
                for (var iIdx in oThis._separatingPosition) {
                    if (oThis._separatingPosition[iIdx].x === oTarget.x && oThis._separatingPosition[iIdx].y === oTarget.y) {
                        return false;
                    }
                }
                oThis._separatingPosition.push(oTarget);
                oThis.draw();
                return false;
            }

            // 모든 영역은 비활성화
            for (var iIdx = 0; iIdx <= oThis._iAreaIdx; iIdx++) {
                if (isObject(oThis._aAreas[iIdx]) === false) {
                    continue;
                }
                oThis._aAreas[iIdx].isActive = false;
            }

            // 선택한 좌표가 이미 선택된 좌표인지 검사해서 이미 선택된 좌표이면 드래그 활성화
            var findFlag = false;
            var aAreaIndex = [];
            if (oThis._aActiveBlock.length > 0) {
                for (var iIdx = 0; iIdx < oThis._aActiveBlock.length; iIdx++) {
                    if (isObject(oThis._aAreas[oThis._aActiveBlock[iIdx]]) === false) {
                        oThis._aActiveBlock.splice(iIdx, 1);
                    } else {
                        aAreaIndex.push(oThis._aActiveBlock[iIdx]);
                    }
                }
            }

            for (var iIdx = 0; iIdx <= oThis._iAreaIdx; iIdx++) {
                if (isObject(oThis._aAreas[iIdx]) === false || oThis._aActiveBlock.indexOf(iIdx) !== -1) {
                    continue;
                }

                aAreaIndex.push(iIdx);
            }

            for (var iIdx = 0; iIdx < aAreaIndex.length; iIdx++) {
                var iAreaIdx = aAreaIndex[iIdx];

                if (oThis.options.allowEdit === true) {
                    if (getArrayDepth(oThis._aAreas[iAreaIdx].locations) === 2) {
                        for (var iLocationIdx = 0; iLocationIdx < oThis._aAreas[iAreaIdx].locations.length; iLocationIdx++) {
                            oThis._aAreas[iAreaIdx].locations[iLocationIdx].forEach(function (value, key, array) {
                                var gapX = Math.abs(oTarget.x - value.x);
                                var gapY = Math.abs(oTarget.y - value.y);

                                if (gapX <= options.allowGapSize && gapY <= options.allowGapSize) {
                                    if (findFlag === false && (key !== 0 || oThis.status === 'ready')) {
                                        _saveUndo();
                                        canvas.addEventListener('mousemove', _movePoint, false);
                                        oThis._aSelectedPosition = [iAreaIdx, iLocationIdx, key];

                                        findFlag = true;
                                        return false;
                                    }
                                }
                            });

                            if (findFlag === true) {
                                break;
                            }
                        }
                    } else {
                        oThis._aAreas[iAreaIdx].locations.forEach(function (value, key, array) {
                            var gapX = Math.abs(oTarget.x - value.x);
                            var gapY = Math.abs(oTarget.y - value.y);

                            if (gapX <= options.allowGapSize && gapY <= options.allowGapSize) {
                                if (findFlag === false && (key !== 0 || oThis.status === 'ready')) {
                                    if (oThis.keyCode.indexOf(KEYCODE_CTRL) !== -1 && oThis.keyCode.indexOf(KEYCODE_ALT) !== -1) {
                                        oThis.status = 'separating';
                                        oThis.guideLine = null;
                                        oThis._separatingPosition = [
                                            {
                                                x: value.x,
                                                y: value.y
                                            }
                                        ];
                                        oThis._aAreas[iAreaIdx].isActive = true;

                                        oThis.draw();
                                    } else {
                                        _saveUndo();
                                        canvas.addEventListener('mousemove', _movePoint, false);
                                    }
                                    oThis._aSelectedPosition = [iAreaIdx, key];

                                    findFlag = true;
                                    return false;
                                }
                            }
                        });
                    }

                    if (findFlag === true) {
                        return false;
                    }
                }

                if (oThis.status === 'ready') {
                    if (oThis.options.allowEdit === true) {
                        // 블록이 완성된 상태에서 선 위를 클릭하면 해당 블록에 좌표 추가
                        if (getArrayDepth(oThis._aAreas[iAreaIdx].locations) === 2) {
                            for (var iLocationIdx = 0; iLocationIdx < oThis._aAreas[iAreaIdx].locations.length; iLocationIdx++) {
                                var iLength = oThis._aAreas[iAreaIdx].locations[iLocationIdx].length;
                                for (var iIdx2 = 1; iIdx2 < iLength; iIdx2++) {
                                    if (_checkPointOnLine(oTarget, oThis._aAreas[iAreaIdx].locations[iLocationIdx][iIdx2 - 1], oThis._aAreas[iAreaIdx].locations[iLocationIdx][iIdx2]) === true) {
                                        _saveUndo();
                                        oThis._aAreas[iAreaIdx].locations[iLocationIdx].splice(iIdx2, 0, oTarget);
                                        oThis._aAreas[iAreaIdx].isActive = true;

                                        oThis.draw();
                                        return false;
                                    }
                                }
                            }
                        } else {
                            var iLength = oThis._aAreas[iAreaIdx].locations.length;
                            for (var iIdx2 = 1; iIdx2 < iLength; iIdx2++) {
                                if (_checkPointOnLine(oTarget, oThis._aAreas[iAreaIdx].locations[iIdx2 - 1], oThis._aAreas[iAreaIdx].locations[iIdx2]) === true) {
                                    _saveUndo();
                                    oThis._aAreas[iAreaIdx].locations.splice(iIdx2, 0, oTarget);
                                    oThis._aAreas[iAreaIdx].isActive = true;

                                    oThis.draw();
                                    return false;
                                }
                            }
                        }
                    }

                    if (_checkInside(oTarget, oThis._aAreas[iAreaIdx]) === true) {
                        oThis._aAreas[iAreaIdx].isActive = true;
                        oThis.oOriginPosition = oTarget;
                        if (oThis._aActiveBlock.indexOf(iAreaIdx) === -1) {
                            oThis._aActiveBlock = [iAreaIdx];
                        } else {
                            for (var iActiveIdx = 0; iActiveIdx < oThis._aActiveBlock.length; iActiveIdx++) {
                                if (isObject(oThis._aAreas[oThis._aActiveBlock[iActiveIdx]]) === true) {
                                    oThis._aAreas[oThis._aActiveBlock[iActiveIdx]].isActive = true;
                                }
                            }
                        }

                        _callOnSelected()
                        if (oThis.options.allowEdit === true) {
                            _saveUndo();
                            canvas.addEventListener('mousemove', _moveRegion, false);
                        }
                        oThis.draw();

                        return false;
                    }
                }
            }

            if (oThis.options.allowEdit === false) {
                return false;
            }

            if (oThis.mouseClickFlag === true) {
                return;
            }

            _saveUndo();
            if (oThis.status === 'ready') {
                for (; isObject(oThis._aAreas[oThis._iAreaIdx]) === true; oThis._iAreaIdx++) { }
                oThis._aAreas[oThis._iAreaIdx] = new AreaStruct(oThis._iAreaIdx);
                oThis._aAreas[oThis._iAreaIdx].setColor(oThis.options.defaultColor);

                if (oThis.keyCode.indexOf(KEYCODE_ALT) !== -1 && oThis.keyCode.indexOf(KEYCODE_CTRL) === -1) { // ALT 키를 누른 상태에서 좌표를 찍으면 사각형을 만든다.
                    oThis.oOriginPosition = oTarget;

                    // 사각형을 만든다.
                    oThis._aAreas[oThis._iAreaIdx].locations.push({x: oTarget.x, y: oTarget.y});
                    oThis._aAreas[oThis._iAreaIdx].locations.push({x: oTarget.x, y: oTarget.y - 10});
                    oThis._aAreas[oThis._iAreaIdx].locations.push({x: oTarget.x - 10, y: oTarget.y - 10});
                    oThis._aAreas[oThis._iAreaIdx].locations.push({x: oTarget.x - 10, y: oTarget.y});
                    oThis._aAreas[oThis._iAreaIdx].locations.push({x: oTarget.x, y: oTarget.y});

                    oThis._aSelectedPosition = [oThis._iAreaIdx, 2];
                    oThis._aActiveBlock = [oThis._iAreaIdx];
                    oThis._iAreaIdx++;
                    canvas.addEventListener('mousemove', _movePoint, false);

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
                    oThis._aActiveBlock = [oThis._iAreaIdx];
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
            oThis.mouseClickFlag = true;

            oThis._aSelectedPosition = [oThis._iAreaIdx, oThis._aAreas[oThis._iAreaIdx].getLength() - 1];
            canvas.addEventListener('mousemove', _movePoint, false);

            oThis.draw();

            return false;
        }

        function _getMousePosition(e) {
            return {
                x: Math.round(e.pageX - $(e.target).offset().left),
                y: Math.round(e.pageY - $(e.target).offset().top)
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

        function _checkInside(oTarget, oBlock) {
            if (getArrayDepth(oBlock.locations) === 2) {
                for (var iIdx = 0; iIdx < oBlock.locations.length; iIdx++) {
                    if (__checkInsideByLocations(oTarget, oBlock.locations[iIdx]) === true) {
                        return true;
                    }
                }

                return false;
            } else {
                return __checkInsideByLocations(oTarget, oBlock.locations);
            }
        }

        function __checkInsideByLocations(oTarget, aLocation) {
            var x = oTarget.x, y = oTarget.y;
            var iCnt = 0;

            for (var iCurrent = 1, iPrev = 0; iCurrent < aLocation.length; iCurrent++, iPrev++) {
                var oCurrent = aLocation[iCurrent];
                var oPrev = aLocation[iPrev];

                if (oTarget.y >= oPrev.y && oTarget.y > oCurrent.y) {
                    continue;
                }

                if (oTarget.y <= oPrev.y && oTarget.y < oCurrent.y) {
                    continue;
                }

                var fAround;
                if (oCurrent.x === oPrev.x) {
                    fAround = oCurrent.x;
                } else {
                    var fInclination = (oCurrent.y - oPrev.y) / (oCurrent.x - oPrev.x);
                    var fIntercept = oCurrent.y - (fInclination * oCurrent.x);

                    fAround = (y - fIntercept) / fInclination;
                }

                if (x >= fAround) {
                    iCnt++;
                }
            }
            if (iCnt === 0) {
                return false;
            } else if (iCnt % 2 === 1) {
                return true;
            }
        }

        function _callOnCreated() {
            if (oThis.options.onCreated !== null) {
                if (oThis._aActiveBlock.length > 0) {
                    oThis.options.onCreated.call(oThis, [oThis._aAreas[oThis._aActiveBlock[0]]]);
                }
            }
        }

        function _callOnSelected() {
            if (oThis.options.onSelected !== null) {
                var aResult = [];
                for (var iIdx = 0; iIdx <= oThis._iAreaIdx; iIdx++) {
                    if (isObject(oThis._aAreas[iIdx]) === false) {
                        continue;
                    }

                    if (oThis._aAreas[iIdx].isActive === true) {
                        aResult.push(oThis._aAreas[iIdx]);
                    }
                }
                oThis.options.onSelected.call(oThis, aResult);
            }
        }

        function _zoom(e) {
            oThis.zoomLayer.css('display', 'inline');

            var oTarget = _getMousePosition(e);
            var elementPosition = oThis.canvas.getBoundingClientRect();

            var iTop = oThis.canvas.offsetTop;

            if (elementPosition.y <= 0) {
                iTop -= elementPosition.y;
            }

            // zoomLayer 위치 조정
            if (oTarget.x <= 220 && oTarget.y <= iTop + 220) {
                var iLeft = oThis.canvas.width - 200 + oThis.canvas.offsetLeft - 15;
                if (Math.abs(elementPosition.top) + elementPosition.bottom <= window.innerHeight) {
                    iTop = oThis.canvas.height - 200 + oThis.canvas.offsetTop - 15;
                } else {
                    iTop = (elementPosition.y * -1) + window.innerHeight - 200 + oThis.canvas.offsetTop - 15;

                    var bottomGap = document.documentElement.scrollTop + elementPosition.y;
                    if (document.documentElement.scrollTop + document.documentElement.clientHeight >= document.documentElement.scrollHeight - bottomGap) {
                        iTop -= bottomGap;
                    }
                }

                oThis.zoomLayer.css('left', iLeft);
                oThis.zoomLayer.css('top', iTop);
            } else {
                oThis.zoomLayer.css('left', oThis.canvas.offsetLeft);
                oThis.zoomLayer.css('top', iTop);
            }

            var zoomCanvas = oThis.zoomCanvas[0];
            var zoomCtx = zoomCanvas.getContext('2d');

            var width = zoomCanvas.width;
            var height = zoomCanvas.height;

            zoomCtx.drawImage(oThis.canvas,
                Math.min(Math.max(0, oTarget.x - 30), oThis.oImage.width - 60),
                Math.min(Math.max(0, oTarget.y - 30), oThis.oImage.height - 60),
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

        function _mouseOut(e) {
            oThis.zoomLayer.css('display', 'none');
        }

        function _saveUndo() {
            oThis.redo = [];

            var oCurrentStatus = _getCurrentStatus();

            if (oThis.undo.length >= 100) {
                oThis.undo.splice(0, 1);
            }
            oThis.undo.push(oCurrentStatus);
        }

        function _saveRedo() {
            var oCurrentStatus = _getCurrentStatus();

            if (oThis.redo.length >= 100) {
                oThis.redo.splice(0, 1);
            }
            oThis.redo.push(oCurrentStatus);
        }

        function _getCurrentStatus() {
            var aAreas = [];
            for (var iIdx in oThis._aAreas) {
                var aArea = new AreaStruct(oThis._aAreas[iIdx].id);
                aArea.setColor(oThis._aAreas[iIdx].color);
                aArea.label = oThis._aAreas[iIdx].label.slice();
                aArea.isActive = oThis._aAreas[iIdx].isActive;

                var locations = [];
                if (getArrayDepth(oThis._aAreas[iIdx].locations) === 2) {
                    for (var iIdx2 in oThis._aAreas[iIdx].locations) {
                        var subLocations = [];
                        for (var iIdx3 in oThis._aAreas[iIdx].locations[iIdx2]) {
                            subLocations.push({
                                x: oThis._aAreas[iIdx].locations[iIdx2][iIdx3].x,
                                y: oThis._aAreas[iIdx].locations[iIdx2][iIdx3].y
                            });
                        }
                        locations.push(subLocations);
                    }
                } else {
                    for (var iIdx2 in oThis._aAreas[iIdx].locations) {
                        locations.push({
                            x: oThis._aAreas[iIdx].locations[iIdx2].x,
                            y: oThis._aAreas[iIdx].locations[iIdx2].y
                        });
                    }
                }
                aArea.locations = locations;

                aAreas.push(aArea);
            }

            return {
                'Areas': aAreas,
                'AreaIdx': oThis._iAreaIdx,
                'ActiveBlock': oThis._aActiveBlock.slice(),
                'Status': oThis.status
            }
        }

        this._callOnDeleted = function (iDeleteKey) {
            if (oThis.options.onDeleted !== null) {
                oThis.options.onDeleted.call(this, iDeleteKey);
            }
        };

        if (this.options.allowEdit === true) {
            oThis.canvas.addEventListener('mousedown', this._mouseDown);
            oThis.canvas.addEventListener('contextmenu', this._rightDown);
            oThis.canvas.addEventListener('mouseup', this._stopDrag);
            window.addEventListener('keydown', this._setKeyDown);
            window.addEventListener('keyup', this._unsetKeyDown);
        }

        if (this.options.allowEdit === false && this.options.allowSelect === true) {
            oThis.canvas.addEventListener('mousedown', this._mouseDown);
            oThis.canvas.addEventListener('mouseup', this._stopDrag);
            window.addEventListener('keydown', this._setKeyDown);
            window.addEventListener('keyup', this._unsetKeyDown);
        }

        if ($('.zoom-area').length === 0) {
            this.zoomLayer = $('<div>').addClass('zoom-area');
            if (this.options.allowZoom === true) {
                $(oObj).parent().append(this.zoomLayer);

                this.zoomCanvas = $('<canvas>').addClass('zoom-canvas');
                this.zoomLayer.append(this.zoomCanvas);
            }
        }
    }

    $.canvasAreasDraw.prototype.draw = function () {
        var oThis = this;
        var aAreas = this._aAreas;
        var aSeparating = this._separatingPosition;
        let ctx = this.canvas.getContext('2d');
        drawAction();

        var _callOnDeleted = oThis._callOnDeleted;

        function drawAction() {
            // 캔버스 초기화
            ctx.canvas.width = ctx.canvas.width;

            var activeColor = null;

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

                if (getArrayDepth(oCurBlocks.locations) === 2) {
                    for (var iLocationIdx = 0; iLocationIdx < oCurBlocks.locations.length; iLocationIdx++) {
                        ctx.beginPath();
                        ctx.fillStyle = 'rgb(255,255,255)';
                        ctx.font = 'bold 15px arial';
                        ctx.strokeStyle = rgba(oCurBlocks.getColor());

                        if (oCurBlocks.isActive === true) {
                            activeColor = rgba(oCurBlocks.getColor());
                        }

                        var oCurLocation = oCurBlocks.locations[iLocationIdx];
                        var iLength = oCurLocation.length;

                        ctx.moveTo(oCurLocation[0].x, oCurLocation[0].y);
                        for (var i = 0; i < iLength; i++) {
                            if (oCurBlocks.isActive === true) {
                                ctx.setLineDash([]);
                                ctx.fillRect(oCurLocation[i].x - 2, oCurLocation[i].y - 2, 4, 4);
                                ctx.strokeRect(oCurLocation[i].x - 2, oCurLocation[i].y - 2, 4, 4);
                            }

                            if (i > 0) {
                                ctx.setLineDash([5, 5]);
                                ctx.lineTo(oCurLocation[i].x, oCurLocation[i].y);
                            }
                        }
                        ctx.stroke();

                        if (iLength > 2 && oCurLocation[0].x === oCurLocation[iLength - 1].x && oCurLocation[0].y === oCurLocation[iLength - 1].y) {
                            ctx.fillStyle = rgba(oCurBlocks.getColor(), 0.2);
                            ctx.fill();
                            ctx.stroke();
                        }
                    }

                    _postProcessDrawing(ctx, oCurBlocks);
                } else {
                    ctx.beginPath();
                    ctx.fillStyle = 'rgb(255,255,255)';
                    ctx.font = 'bold 15px arial';
                    ctx.strokeStyle = rgba(oCurBlocks.getColor());

                    if (oCurBlocks.isActive === true) {
                        activeColor = rgba(oCurBlocks.getColor());
                    }

                    ctx.moveTo(oCurBlocks.locations[0].x, oCurBlocks.locations[0].y);
                    var iLength = oCurBlocks.getLength();
                    var aLocations = oCurBlocks.locations;
                    for (var i = 0; i < iLength; i++) {
                        if (oCurBlocks.isActive === true) {
                            ctx.setLineDash([]);
                            ctx.fillRect(aLocations[i].x - 1, aLocations[i].y - 1, 3, 3);
                            ctx.strokeRect(aLocations[i].x - 1, aLocations[i].y - 1, 3, 3);
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

                        _postProcessDrawing(ctx, oCurBlocks);
                    }
                }

                if (oCurBlocks.isActive === false) {
                    $('#trash-' + oCurBlocks.id).css('display', 'none').css('z-index', -1);
                } else {
                    $('#trash-' + oCurBlocks.id).css('display', 'block').css('z-index', 1);
                }
            }

            if (aSeparating.length > 0) {
                ctx.beginPath();
                ctx.fillStyle = 'rgb(255,255,255)';
                ctx.font = 'bold 15px arial';
                ctx.strokeStyle = activeColor;
                ctx.moveTo(aSeparating[0].x, aSeparating[0].y);

                for (var iIdx = 0; iIdx < aSeparating.length; iIdx++) {
                    ctx.setLineDash([]);
                    ctx.fillRect(aSeparating[iIdx].x - 1, aSeparating[iIdx].y - 1, 3, 3);
                    ctx.strokeRect(aSeparating[iIdx].x - 1, aSeparating[iIdx].y - 1, 3, 3);

                    ctx.lineTo(aSeparating[iIdx].x, aSeparating[iIdx].y);

                    if (i > 0) {
                        ctx.setLineDash([5, 5]);
                        ctx.lineTo(aSeparating[iIdx].x, aSeparating[iIdx].y);
                    }
                }
                ctx.stroke();
            }

            if (oThis.guideLine !== null && oThis.keyCode.indexOf(KEYCODE_ALT) !== -1) {
                ctx.beginPath();
                ctx.setLineDash([]);
                ctx.strokeStyle = '#000000';

                ctx.moveTo(oThis.guideLine.x, 0);
                ctx.lineTo(oThis.guideLine.x, oThis.canvas.height);

                ctx.moveTo(0, oThis.guideLine.y);
                ctx.lineTo(oThis.canvas.width, oThis.guideLine.y);

                ctx.stroke();
            } else {
                oThis.guideLine = null;
            }

            ctx.drawImage(oThis.oImage, 0, 0);
            //ctx.drawImage(oImg, 0, 0);
        }

        function _postProcessDrawing(ctx, oBlock) {
            var aTargetPoints = oBlock.locations;
            var iIndex = oBlock.id;
            var iMinX, iMaxX, iFindIdx = 2;
            var iAllowBandwidth = 30;
            var iIdx;

            if (getArrayDepth(aTargetPoints) === 2) {
                var aNewPoint = [];

                for (iIdx = 0; iIdx < aTargetPoints.length; iIdx++) {
                    for (var subIdx = 0; subIdx < aTargetPoints[iIdx].length; subIdx++) {
                        aNewPoint.push(aTargetPoints[iIdx][subIdx]);
                    }
                }

                aTargetPoints = aNewPoint;
            }

            // 최우측, 최좌측 좌표를 찾음.
            iMaxX = 0;
            iMinX = ctx.canvas.width;
            for (iIdx = 0; iIdx < aTargetPoints.length; iIdx++) {
                if (iMaxX < aTargetPoints[iIdx].x) {
                    iMaxX = aTargetPoints[iIdx].x;
                }

                if (iMinX > aTargetPoints[iIdx].x) {
                    iMinX = aTargetPoints[iIdx].x;
                }
            }
            var iBlockWidth = iMaxX - iMinX;

            var aMaxY = [];
            var aMinY = [];
            // 최우측 좌표에서 allowSize 안에 있는 좌표들을 찾음.
            for (iIdx = 0; iIdx < aTargetPoints.length; iIdx++) {
                if (aTargetPoints[iIdx].x > iMaxX - iAllowBandwidth) {
                    aMaxY.push(iIdx);
                }

                if (aTargetPoints[iIdx].x < iMinX + iAllowBandwidth) {
                    aMinY.push(iIdx);
                }
            }

            /* 휴지통 그리기 */
            if (oThis.options.allowEdit === true) {
                // 우측 좌표에서 가장 y가 작은 값은 찾음.
                var iRightMinY = ctx.canvas.height;
                for (iIdx = 0; iIdx < aMaxY.length; iIdx++) {
                    if (aTargetPoints[aMaxY[iIdx]].y < iRightMinY) {
                        iRightMinY = aTargetPoints[aMaxY[iIdx]].y;
                        iFindIdx = aMaxY[iIdx];
                    }
                }

                var iLeft = aTargetPoints[iFindIdx].x + ctx.canvas.offsetLeft + 4;
                var iTop = aTargetPoints[iFindIdx].y + ctx.canvas.offsetTop - 28;

                $('.delete-area').each(function() {
                    var aElementId = $(this).attr('id').split('-');

                    var bFindFlag = false;
                    for (iIdx in oThis._aAreas) {
                        if (oThis._aAreas[iIdx].id.toString() === aElementId[1].toString()) {
                            bFindFlag = true;
                            break;
                        }
                    }

                    if (bFindFlag === false) {
                        $(this).remove();
                    }
                });

                var div = $('#trash-' + iIndex);
                if (div.length === 0) {
                    var div = $('<div>').addClass('delete-area').append(
                        $('<div>').addClass('select-areas-delete-area')
                    ).css('left', iLeft).css('top', iTop).attr('id', 'trash-' + iIndex).click(function () {
                        var aElementId = $(this).attr('id').split('-');

                        _callOnDeleted(aElementId[1]);
                        var iKey = null;
                        for (var iIdx = 0; iIdx < aAreas.length; iIdx++) {
                            if (isObject(aAreas[iIdx]) === false) {
                                continue;
                            }
                            if (aAreas[iIdx].id.toString() === aElementId[1].toString()) {
                                iKey = iIdx;
                                aAreas.splice(iIdx, 1);
                                break;
                            }
                        }

                        if (iKey !== null) {
                            var iElmt = oThis._aActiveBlock.indexOf(iKey);

                            if (iElmt >= 0) {
                                oThis._aActiveBlock.splice(iElmt, 1);
                            }
                        }

                        $(this).remove();
                        drawAction();
                    });

                    $(oThis.canvas).parent().append(div);
                } else {
                    div.css('left', iLeft).css('top', iTop);
                }
            }

            /* 텍스트 쓰기 */
            if (oBlock.label.length > 0 && oBlock.label !== null) {
                var iLeftMinY = ctx.canvas.height;
                for (iIdx = 0; iIdx < aMinY.length; iIdx++) {
                    if (aTargetPoints[aMinY[iIdx]].y < iLeftMinY) {
                        iLeftMinY = aTargetPoints[aMinY[iIdx]].y;
                        iFindIdx = aMinY[iIdx];
                    }
                }

                iLeft = aTargetPoints[iFindIdx].x + 4;
                iTop = aTargetPoints[iFindIdx].y - 10;

                var label = oBlock.label.join(', ');
                if (ctx.measureText('...').width > iBlockWidth + 30) {
                    label = '...';
                } else if (ctx.measureText(label).width > iBlockWidth + 30) {
                    while (true) {
                        label = label.substring(0, label.length - 1);
                        if (ctx.measureText(label + '...').width < iBlockWidth + 30) {
                            break;
                        }
                    }
                    label = label + '...';
                }

                ctx.fillStyle = rgba(oBlock.color);
                ctx.fillText(label, iLeft, iTop);
            }
        }
    }

    $.canvasAreasDraw.prototype.setColor = function (options) {
        for (var iIdx = 0; iIdx <= this._aAreas.length; iIdx++) {
            if (isObject(this._aAreas[iIdx]) === false) {
                continue;
            }

            if (this._aAreas[iIdx].id.toString() === options.id.toString()) {
                this._aAreas[iIdx].setColor(options.color);
                break;
            }
        }

        this.draw();

        return true;
    }

    $.canvasAreasDraw.prototype.setLabel = function (options) {
        for (var iIdx = 0; iIdx < this._aAreas.length; iIdx++) {
            if (isObject(this._aAreas[iIdx]) === false) {
                continue;
            }

            if (this._aAreas[iIdx].id.toString() === options.id.toString()) {
                this._aAreas[iIdx].setLabel(options.label);
                break;
            }
        }

        this.draw();

        return true;
    }

    $.canvasAreasDraw.prototype.addArea = function (option) {
        if (option.id !== undefined && option.id !== null) {
            option.id = null;
        }

        return this._addAreaInfo(option);
    }

    $.canvasAreasDraw.prototype.removeLabel = function (options) {
        for (var iIdx = 0; iIdx < this._aAreas.length; iIdx++) {
            if (isObject(this._aAreas[iIdx]) === false) {
                continue;
            }

            if (this._aAreas[iIdx].id.toString() === options.id.toString()) {
                this._aAreas[iIdx].removeLabel(options.label);
                break;
            }
        }

        this.draw();

        return true;
    }

    $.canvasAreasDraw.prototype.focusArea = function (id) {
        for (var iIdx = 0; iIdx <= this._aAreas.length; iIdx++) {
            if (isObject(this._aAreas[iIdx]) === false) {
                continue;
            }

            if (this._aAreas[iIdx].id.toString() === id.toString()) {
                this._aAreas[iIdx].isActive = true;
            } else {
                this._aAreas[iIdx].isActive = false;
            }
        }

        this.draw();

        return false;
    }

    $.canvasAreasDraw.prototype.areas = function () {
        var result = [];

        this._aAreas.forEach(function (value, index, array) {
            var locations = [];

            if (getArrayDepth(value.locations) === 2) {
                for (var iIdx = 0; iIdx < value.locations.length; iIdx++) {
                    var subLocation = [];

                    value.locations[iIdx].forEach(function (position, idx, arr) {
                        subLocation.push([position.x, position.y]);
                    });

                    subLocation.pop();
                    console.log(subLocation);

                    locations.push(subLocation);
                }
            } else {
                value.locations.forEach(function (position, idx, arr) {
                    locations.push([position.x, position.y]);
                });
                // 마지막 좌표는 삭제
                locations.pop();
            }

            result.push({
                id: value.id,
                locations: locations
            });
        });

        return result;
    }

    $.canvasAreasDraw.prototype.destroy = function () {
        this._aAreas = [];
        this._iAreaIdx = null;
        this._aActiveBlock = [];
        this._aSelectedPosition = null;
        this.keyCode = null;

        this.canvas.removeEventListener('mousedown', this._mouseDown);
        this.canvas.removeEventListener('contextmenu', this._rightDown);
        this.canvas.removeEventListener('mouseup', this._stopDrag);
        window.removeEventListener('keydown', this._setKeyDown);
        window.removeEventListener('keyup', this._unsetKeyDown);

        $('.delete-area').remove();
        $('.zoom-area').remove();

        this.ctx.beginPath();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.oObj.attr('data-image-url', '');
    }

    $.canvasAreasDraw.prototype.reset = function (options) {
        // 휴지통 아이콘 삭제
        $('.delete-area').remove();
        this.options = $.extend(this.options, options);
        this.init(this.oObj, this.options);
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

    var getArrayDepth = function (aArray) {
        if (Array.isArray(aArray) === false) {
            return 0;
        }

        var iMaxDepth = 1;
        for (var iIdx = 0; iIdx <= aArray.length; iIdx++) {
            var iCurDepth = 1;
            if (Array.isArray(aArray[iIdx]) === true) {
                iCurDepth += getArrayDepth(aArray[iIdx]);
            }

            if (iMaxDepth < iCurDepth) {
                iMaxDepth = iCurDepth;
            }
        }

        return iMaxDepth;
    }

    var checkSquare = function (aLocation) {
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

    var grabcut = function (oThis) {
        if (oThis._aActiveBlock.length !== 1) {
            return false;
        }

        var oBlock = oThis._aAreas[oThis._aActiveBlock[0]];
        if (isObject(oBlock) === false) {
            return false;
        }

        var locations = oBlock.locations;
        if (checkSquare(locations) === false) {
            return false;
        }

        // find start position and width, height
        var iMinX = oThis.canvas.width;
        var iMinY = oThis.canvas.height;
        var iMaxX = 0;
        var iMaxY = 0;
        for (var i in locations) {
            if (iMinX > locations[i].x) {
                iMinX = locations[i].x;
            }

            if (iMinY > locations[i].y) {
                iMinY = locations[i].y;
            }

            if (iMaxX < locations[i].x) {
                iMaxX = locations[i].x;
            }

            if (iMaxY < locations[i].y) {
                iMaxY = locations[i].y;
            }
        }

        if (iMinX < 0) {
            iMinX = 0;
        }

        if (iMinY < 0) {
            iMinY = 0;
        }

        if (iMaxX > oThis.canvas.width) {
            iMaxX = oThis.canvas.width;
        }

        if (iMaxY > oThis.canvas.height) {
            iMaxY = oThis.canvas.height;
        }

        var img = document.createElement('img');
        img.id = 'grabcut-target';
        img.src = $(oThis.oObj).attr('data-image-url');
        document.body.appendChild(img);

        var src = cv.imread('grabcut-target');
        cv.cvtColor(src, src, cv.COLOR_RGBA2RGB, 0);
        let mask = new cv.Mat();
        let bgdModel = new cv.Mat();
        let fgdModel = new cv.Mat();

        let rect = new cv.Rect(iMinX, iMinY, iMaxX - iMinX, iMaxY - iMinY);
        // let dst = new cv.Mat();

        // cv.bilateralFilter(src, dst, 9, 75, 75, cv.BORDER_DEFAULT);

        // cv.imshow('canvasOutput', src);

        // src = cv.imread('canvasOutput');
        // cv.cvtColor(src, src, cv.COLOR_RGBA2RGB, 0);
        cv.grabCut(src, mask, rect, bgdModel, fgdModel, 1, cv.GC_INIT_WITH_RECT);

        var wandMask = {
            'bounds': {
                'maxX': iMaxX,
                'maxY': iMaxY,
                'minX': iMinX,
                'minY': iMinY
            },
            'data': [],
            'height': oThis.canvas.height,
            'width': oThis.canvas.width
        };
        var frg = [];
        for (let i = 0; i < src.rows; i++) {
            for (let j = 0; j < src.cols; j++) {
                if (mask.ucharPtr(i, j)[0] == 0 || mask.ucharPtr(i, j)[0] == 2) {
                    src.ucharPtr(i, j)[0] = 0;
                    src.ucharPtr(i, j)[1] = 0;
                    src.ucharPtr(i, j)[2] = 0;

                    wandMask.data.push(0);
                } else {
                    frg.push({
                        x: j,
                        y: i
                    });

                    wandMask.data.push(1);
                }
            }
        }

        var cs = MagicWand.traceContours(wandMask);
        cs = MagicWand.simplifyContours(cs, 1, 0);

        //cv.imshow('canvasOutput', src);

        src.delete();
        mask.delete();
        bgdModel.delete();
        fgdModel.delete();

        var result = [];
        var iMaxPointLength = 0;
        var iIdx = null;
        for (let i = 0; i < cs.length; i++) {
            if (cs[i].inner === true) continue;

            if (cs[i].points.length > iMaxPointLength) {
                iMaxPointLength = cs[i].points.length;
                iIdx = i;
            }
        }

        if (iIdx !== null) {
            var ps = cs[iIdx].points;

            for (let j = 0; j < ps.length; j++) {
                result.push({
                    x: ps[j].x,
                    y: ps[j].y
                });
            }

            if (result.length > 0) {
                result.push({
                    x: result[0].x,
                    y: result[0].y,
                });

                oThis._aAreas[oThis._aActiveBlock[0]].locations = result;
                oThis.draw();
            } else {
                alert('추출할 대상이 없습니다.');
            }
        } else {
            alert('추출할 대상이 없습니다.');
        }


        // 이미지 디버깅용
        //$('#canvasOutput').css('display', 'block').css('width', img.width).css('height', img.height);

        //var output = document.getElementById('canvasOutput');
        //$('.spinner').remove();
        document.body.removeChild(document.getElementById('grabcut-target'));
    }

    var getEquation = function (iPoint1, iPoint2) {
        var gradient = (iPoint2.y - iPoint1.y) / (iPoint2.x - iPoint1.x);
        var intercept = iPoint2.y - gradient * iPoint2.x;

        return {
            'gradient': gradient,
            'intercept': intercept
        };
    }

    var getRandomColor = function() {
        var letters = '0123456789ABCDEF';
        var color = '#';
        for (var i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    }

    var compare = function (a, b) {
        if (a < b) {
            return -1;
        } else if(a > b) {
            return 1;
        } else {
            return 0;
        }
    }
})(jQuery);
