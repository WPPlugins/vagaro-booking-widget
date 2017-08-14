/* ==============================================================================
 * Interframe v1.0.0
 * Copyright (c) 2011-Present Vagaro, Inc
 * ============================================================================== */

+function (w, d) {
    'use strict';

    if (typeof (w.$Interframe) !== 'undefined') {
        return;
    }

    var err = new Error('Interframe requires jQuery version 1.9.1 or higher, but lower than version 3.'),
        $ = typeof jQuery === 'undefined' ? undefined : jQuery;
    if (typeof $ === 'undefined') {
        throw err;
    }
    var ver = $.fn.jquery.split(' ')[0].split('.');
    if ((ver[0] < 2 && ver[1] < 9) || (ver[0] == 1 && ver[1] == 9 && ver[2] < 1) || (ver[0] > 2)) {
        throw err;
    }

    var pollingInterval = 500,
        FBPollingInterval = 250, isFBParent = undefined,
        isChrome = /Chrome/.test(navigator.userAgent), isSafari = isChrome === false && /Safari/.test(navigator.userAgent), isFirefox = /firefox/i.test(navigator.userAgent),
        debug = 0, isIniting = false, isRegistered = false,
        getOrigin = function (src) {
            var match = /^(https?:\/\/[^\/]*).*$/i.exec(src);
            return match ? match[1] : '*';
        },
        myParent = (w.parent != w && d.referrer != null) ? w.parent : null, parentOrigin = '*',
        childFrames = [],
        addChild = function (window, origin) {
            var children = $('iframe');
            for (var i = children.length - 1; i >= 0; --i) {
                if (children[i].contentWindow === window) {
                    for (var j = childFrames.length - 1; j >= 0; --j) {
                        if (childFrames[j].window === window) {
                            childFrames.splice(j, 1);
                        }
                    }
                    childFrames.push({ window: window, origin: origin, frame: children[i] });
                    return childFrames[childFrames.length - 1];
                }
            }
            return null;
        },
        findChild = function (window, origin) {
            for (var i = childFrames.length - 1; i >= 0; --i) {
                if (childFrames[i].window === window && childFrames[i].origin === origin) {
                    return childFrames[i];
                }
            }
            return null;
        },
        autoSize = true, sizeRequestThreshold = 5, sizeUpdateRequestQ = [], sizeUpdatingQ = [], curHeight = 0, curMinHeight = Number.MIN_VALUE, curMaxHeight = Number.MAX_VALUE,
        viewport2Window = 0, viewportHeight = $(w).height(), viewportWidth = $(w).width(),
        element2String = function (element) {
            return '<' + element.localName + ' id="' + element.id + '" class="' + element.className + '">';
        },
        log = (typeof console !== 'object' || typeof console.log !== 'function') ? function() {} : function (level, data) {
            typeof level === 'number' && debug >= level && console.log('[' + w.location.href.replace(/#.*$/, '') + ']\n' + data);
        },
        postMsg = function (target, origin, msg) {
            if (typeof target === 'object' && target !== null) {
                var msgJSON = JSON.stringify(typeof msg === 'object' ? msg : {});
                log(3, 'Send ' + msgJSON + ' to ' + origin);
                target.postMessage(msgJSON, origin);
            }
        },
        returnMsg = function (evt, msg) {
            postMsg(evt.originalEvent.source, evt.originalEvent.origin, msg);
        },
        getDocHeight = function () {
            return isChrome ? $('html')[0].scrollHeight : isFirefox ? $('body')[0].scrollHeight : isSafari ? $('html')[0].scrollHeight : $('body')[0].scrollHeight;
        },
        getFBInfo = function () {
            if (typeof w.FB === 'object') {
                if (typeof isFBParent === 'undefined') {
                    isFBParent = null;
                    setTimeout(function () {
                        if (isFBParent === null) {
                            isFBParent = false;
                        }
                    }, 5000);
                }
                if (isFBParent === null || isFBParent) {
                    FB.Canvas.getPageInfo(function (page) {
                        if (isFBParent === null) {
                            isFBParent = true;
                            isRegistered = true;
                            myParent = null;
                            $('html,body').css('height', 'auto');
                            log(0, 'Facebook canvas detected');
                            setInterval(getFBInfo, FBPollingInterval);
                        }
                        postMsg(w, w.location.origin, { object: 'updateViewport2Window', top: page.scrollTop - page.offsetTop, height: page.clientHeight, width: page.clientWidth });
                    });
                }
            }
        },
        requestSizeUpdate = function (height, callback) {
            isRegistered === false && getFBInfo();

            var orgH = getDocHeight();
            if (typeof height === 'undefined') {
                height = orgH;
                if (Math.abs(curHeight - height) < sizeRequestThreshold || (Math.abs(curHeight - curMinHeight) < sizeRequestThreshold && height + sizeRequestThreshold < curMinHeight) || (Math.abs(curHeight - curMaxHeight) < sizeRequestThreshold && height - sizeRequestThreshold > curMaxHeight)) {
                    typeof callback === 'function' && callback(height, orgH);
                    return;
                }
            }

            if (isRegistered === false) {
                typeof callback === 'function' && callback(height, orgH);
                return;
            }

            var evt = $.Event('changing.interframe', { height: height });
            $(w).trigger(evt);
            if (evt.isDefaultPrevented()) {
                typeof callback === 'function' && callback(height, orgH);
                return;
            }

            if (isFBParent) {
                FB.Canvas.setSize({ height: height });
                log(1, 'FB.Canvas.setSize({ height: ' + height + ' })');
                typeof callback === 'function' && callback(height, orgH);
                setTimeout(function () {
                    postMsg(w, w.location.origin, { object: 'updateSize', reqHeight: height, actHeight: height, orgHeight: orgH });
                }, 100);
            } else {
                sizeUpdateRequestQ.push({ height: height, callback: callback });
                if (sizeUpdatingQ.length === 0 && sizeUpdateRequestQ.length > 0) {
                    var req = sizeUpdateRequestQ.shift();
                    sizeUpdatingQ.push(req.callback);
                    while (sizeUpdateRequestQ.length > 0) {
                        if (sizeUpdateRequestQ[0].height === req.height) {
                            sizeUpdatingQ.push(sizeUpdateRequestQ.shift().callback);
                        } else {
                            break;
                        }
                    }
                    postMsg(myParent, parentOrigin, { object: 'requestSize', height: req.height });
                }
            }
        };

    w.$Interframe = {
        inspect: function () {
            return {
                mutationObserver: (w.MutationObserver || w.WebKitMutationObserver || undefined) ? true : false,
                pollingInterval: pollingInterval,
                userAgent: navigator.userAgent,
                isChrome: isChrome,
                isSafari: isSafari,
                isFirefox: isFirefox,
                debug: debug,
                isIniting: isIniting,
                isRegistered: isRegistered,
                isFBParent: isFBParent,
                FBPollingInterval: FBPollingInterval,
                myParent: myParent,
                parentOrigin: parentOrigin,
                childFrames: childFrames,
                autoSize: autoSize,
                sizeRequestThreshold: sizeRequestThreshold,
                sizeUpdateRequestQ: sizeUpdateRequestQ,
                sizeUpdatingQ: sizeUpdatingQ,
                curHeight: curHeight,
                curMinHeight: curMinHeight,
                curMaxHeight: curMaxHeight,
                viewport2Window: viewport2Window,
                viewportTop: viewport2Window + $(w).scrollTop(),
                viewportHeight: viewportHeight,
                viewportWidth: viewportWidth,
                setPollingInterval: function (interval) {
                    if (typeof interval === 'number' && interval > 100) {
                        pollingInterval = interval;
                    }
                    return pollingInterval;
                },
                setFBPollingInterval: function (interval) {
                    if (typeof interval === 'number' && interval > 100) {
                        FBPollingInterval = interval;
                    }
                    return FBPollingInterval;
                },
                setDebug: function (level) {
                    if (typeof level === 'number') {
                        debug = Math.min(Math.max(level, 0), 3);
                    }
                    return debug;
                }
            };
        },

        getJQuery: function () {
            return $;
        },

        init: function (enableAutoSize, debugLevel) {
            if (isIniting) {
                log(2, '$Interframe.init() skipped.');
                return;
            }
            log(2, '$Interframe.init() started.');
            isIniting = true;
            if (typeof enableAutoSize === 'boolean') {
                autoSize = enableAutoSize;
            }
            if (typeof debugLevel === 'number') {
                debug = debugLevel;
            }

            var msgHandlers = {
                // Receives registration invitation from my parent.
                // Sends registration request.
                'register?': function (evt, msg) {
                    if (parentOrigin !== '*') {
                        log(0, 'Received "register?".');
                    } else {
                        log(0, 'Received "register?". Send "register".')
                        returnMsg(evt, { object: 'register' });
                    }
                },

                // Receives registration request from a child.
                // Acknowledges the child OK to register.
                'register': function (evt, msg) {
                    log(0, 'Received "register". Send "registerACK".')
                    returnMsg(evt, { object: 'registerACK' });
                },

                // Receives registration acknowledgement from my parent.
                // Records the parent information.
                'registerACK': function (evt, msg) {
                    if (parentOrigin !== '*') {
                        log(0, 'Received "registerACK".');
                    } else {
                        log(0, 'Received "registerACK". Send "registerDone".')
                        parentOrigin = evt.originalEvent.origin;
                        returnMsg(evt, { object: 'registerDone' });
                    }
                },

                // Receives registration done from a child.
                // Records the child information.
                // It is now OK to send messages to the child.
                'registerDone': function (evt, msg) {
                    log(0, 'Received "registerDone". Send "registerDoneACK".')
                    var child = addChild(evt.originalEvent.source, evt.originalEvent.origin);
                    returnMsg(evt, { object: 'registerDoneACK' });
                    var viewport = w.$Interframe.getViewport2Doc();
                    (myParent === null || isRegistered) && postMsg(child.window, child.origin, { object: 'updateViewport2Window', top: viewport.top - $(child.frame).offset().top, height: viewport.height, width: viewport.width });
                },

                // Receives registration done from my parent.
                // It is now OK to send messages to my parent.
                'registerDoneACK': function (evt, msg) {
                    log(0, 'Received "registerDoneACK".')
                    isRegistered = true;
                    $('html,body').css('height', 'auto');
                    $(w).trigger($.Event('registered.interframe'));
                },

                // Receives resize request from a child.
                // 1. Changes the iframe size; and
                // 2a. Notifies my parent to change my size; or
                // 2b. Notifies my children viewport change.
                'requestSize': function (evt, msg) {
                    var child = findChild(evt.originalEvent.source, evt.originalEvent.origin);
                    if (child !== null) {
                        var orgH = $(child.frame).height(),
                            reqH = isNaN(msg.height) ? orgH : msg.height,
                            maxH = parseFloat($(child.frame).css('max-height')),
                            minH = parseFloat($(child.frame).css('min-height')),
                            actH = Math.max(Math.min(isNaN(maxH) ? reqH : maxH, reqH), isNaN(minH) ? reqH : minH);
                        log(1, 'Received "requestSize". orgH=' + orgH + ' reqH=' + reqH + ' actH=' + actH + ' minH=' + minH + ' maxH=' + maxH);
                        $(child.frame).attr('height', actH).attr('scrolling', (actH >= reqH) ? 'no' : 'auto').css('overflow', (actH >= reqH)?  'none' : 'auto');
                        postMsg(child.window, child.origin, { object: 'updateSize', reqHeight: reqH, actHeight: actH, orgHeight: orgH, minHeight: minH, maxHeight: maxH });
                        if (myParent || isFBParent) {
                            requestSizeUpdate($(w).height() + actH - orgH);
                        } else {
                            var viewport = w.$Interframe.getViewport2Doc();
                            $.each(childFrames, function () {
                                postMsg(this.window, this.origin, { object: 'updateViewport2Window', top: viewport.top - $(this.frame).offset().top, height: viewport.height, width: viewport.width });
                            });
                        }
                    }
                },

                // Receives resize response from my parent.
                // Executes callbacks.
                'updateSize': function (evt, msg) {
                    curHeight = msg.actHeight;
                    typeof msg.minHeight !== 'undefined' && (curMinHeight = msg.minHeight);
                    typeof msg.maxHeight !== 'undefined' && (curMaxHeight = msg.maxHeight);
                    log(1, 'Received "updateSize". curHeight=' + curHeight + ' curMinHeight=' + curMinHeight + ' curMaxHeight=' + curMaxHeight);
                    $.each(sizeUpdatingQ, function () {
                        typeof this === 'function' && this(msg.reqHeight, msg.actHeight, msg.minHeight, msg.maxHeight);
                    });
                    sizeUpdatingQ = [];
                    $(w).trigger($.Event('changed.interframe', { reqHeight: msg.reqHeight, actHeight: msg.actHeight, minHeight: msg.minHeight, maxHeight: msg.maxHeight }));
                    setTimeout(requestSizeUpdate, pollingInterval);
                },

                // Receives size check from my parent.
                // Sends request size.
                'checkSize': function (evt, msg) {
                    log(1, 'Received "checkSize".');
                    curHeight = 0;
                    requestSizeUpdate();
                },

                // Receives viewport change from my parent.
                // Notifies my children viewport change.
                'updateViewport2Window': function (evt, msg) {
                    viewport2Window = msg.top;
                    viewportHeight = msg.height;
                    viewportWidth = msg.width;
                    log(1, 'Received "updateViewport2Window". viewport2Window=' + viewport2Window + ' viewportHeight=' + viewportHeight + ' viewportWidth=' + viewportWidth);
                    var viewport = w.$Interframe.getViewport2Doc();
                    $(w).trigger($.Event('viewport.interframe', { top: viewport.top, height: viewport.height }))
                    $.each(childFrames, function () {
                        postMsg(this.window, this.origin, { object: 'updateViewport2Window', top: viewport.top - $(this.frame).offset().top, height: viewport.height, width: viewport.width });
                    });
                },
            };

            $(w).on('message', function (evt) {
                try {
                    log(3, 'Received: "' + evt.originalEvent.data + '"');
                    var msg = JSON.parse(evt.originalEvent.data);
                    if (msg.hasOwnProperty('object')) {
                        if (msg.object.indexOf('register') >= 0 || (evt.originalEvent.origin === parentOrigin && isRegistered) || evt.originalEvent.source === w ) {
                            msgHandlers[msg.object](evt, msg);
                            return;
                        } else {
                            if (findChild(evt.originalEvent.source, evt.originalEvent.origin) !== null) {
                                msgHandlers[msg.object](evt, msg);
                                return;
                            }
                        }
                    }
                    log(1, 'Ignored: "' + evt.originalEvent.data + '" from ' + evt.originalEvent.origin);
                } catch (err) {
                    log(0, 'Error processing "' + evt.originalEvent.data, '": ' + err.message);
                    return;
                }
            });

            // Register with my parent.
            if (w.parent != w && typeof d.referrer === 'string' && d.referrer.length > 0) {
                postMsg(w.parent, parentOrigin, { object: 'register' });
            }

            // Invites child frames to register.
            $('iframe').each(function () {
                postMsg(this.contentWindow, '*', { object: 'register?' });
            });

            // Monitors change in body size and scroll events.
            $(w).on('resize', function () {
                if (myParent === null && isFBParent !== true) {
                    viewportHeight = $(w).height();
                    viewportWidth = $(w).width();
                }
                var viewport = w.$Interframe.getViewport2Doc();
                $.each(childFrames, function () {
                    postMsg(this.window, this.origin, { object: 'updateViewport2Window', top: viewport.top - $(this.frame).offset().top, height: viewport.height, width: viewport.width });
                });
            }).on('scroll', function () {
                var viewport = w.$Interframe.getViewport2Doc();
                $.each(childFrames, function () {
                    postMsg(this.window, this.origin, { object: 'updateViewport2Window', top: viewport.top - $(this.frame).offset().top, height: viewport.height, width: viewport.width });
                });
            });

            var MutationObserver = w.MutationObserver || w.WebKitMutationObserver;
            if (typeof MutationObserver === 'undefined') {
                setInterval(function () {
                    autoSize && requestSizeUpdate();
                }, pollingInterval);
            } else {
                new MutationObserver(function (mutations) {
                    autoSize && requestSizeUpdate();
                }).observe(d.body, {
                    attributes: true,
                    childList: true,
                    characterData: true,
                    subtree: true
                });
            }

            log(2, '$Interframe.init() done.');
            $(w).trigger($.Event('init.interframe'));
        },
        
        // Gets the browser window position w.r.t the frame's window coordinates.
        getViewport2Window: function () {
            var visibleTop = Math.max(viewport2Window, 0),
                visibleBottom = Math.min(viewport2Window + viewportHeight, $(w).height()),
                ret = {
                    top: viewport2Window,
                    height: viewportHeight,
                    width: viewportWidth,
                    visibleTop: visibleTop,
                    visibleHeight: Math.max(visibleBottom - visibleTop, 0)
                };
            log(2, '$Interframe.getViewport2Window() = ' + JSON.stringify(ret));
            return ret;
        },

        // Gets the browser window position w.r.t the frame's document coordinates.
        getViewport2Doc: function () {
            var V2W = w.$Interframe.getViewport2Window(),
                ret = {
                    top: V2W.top + $(w).scrollTop(),
                    height: V2W.height,
                    width: V2W.width,
                    visibleTop: V2W.visibleTop + $(w).scrollTop(),
                    visibleHeight: V2W.visibleHeight
                };
            log(2, '$Interframe.getViewport2Doc() = ' + JSON.stringify(ret));
            return ret;
        },

        // Gets the browser window position w.r.t. the element's coordinates.
        getViewport2Element: function (element) {
            element = $(element);
            var ret;
            if (element.length > 0) {
                var ret = {};
                if (element[0] === $(d)[0] || element[0] === $('html')[0]) {
                    ret = w.$Interframe.getViewport2Doc();
                } else if (element[0] === $(w)[0]) {
                    ret = w.$Interframe.getViewport2Window();
                } else {
                    var oldDisplay = element.css('display'), oldVisibility = element.css('visibility');
                    oldDisplay === 'none' && element.css('visibility', 'hidden').css('display', 'block');
                    var V2D = w.$Interframe.getViewport2Doc(),
                        visibleTop = Math.max(V2D.top - element.offset().top, 0) + element.scrollTop(),
                        visibleBottom = Math.min(V2D.top - element.offset().top + V2D.height, element.height()) + element.scrollTop(),
                        ret = {
                            top: V2D.top - element.offset().top + element.scrollTop(),
                            height: V2D.height,
                            width: V2D.width,
                            visibleTop: visibleTop,
                            visibleHeight: Math.max(visibleBottom - visibleTop, 0)
                        };
                    element.css('display', oldDisplay).css('visibility', (oldVisibility === 'visible') ? '' : oldVisibility);
                }
            } else {
                ret = w.$Interframe.getViewport2Doc();
            }
            log(2, '$Interframe.getViewport2Element(' + element2String(element[0]) + ') = ' + JSON.stringify(ret));
            return ret;
        },

        centerPopup: function (popup, height) {
            popup = $(popup);
            if (popup.length > 0) {
                var oldDisplay = popup.css('display'), oldVisibility = popup.css('visibility');
                oldDisplay === 'none' && popup.css('visibility', 'hidden').css('display', 'block');
                height = typeof height === 'number' ? height : popup.outerHeight();
                switch (popup.css('position')) {
                    case 'fixed':
                        var V2W = w.$Interframe.getViewport2Window(),
                            top = V2W.visibleTop + Math.max((V2W.visibleHeight - height) / 2, 0);
                        V2W.visibleHeight > 0 && popup.css('top', top + 'px').css('bottom', $(w).height() - top - height + 'px').css('margin-top', '0px').css('margin-bottom', '0px');
                        break;
                    case 'absolute':
                        var parent = popup.parent();
                        while (true) {
                            if (parent.css('position') !== 'static') {
                                break;
                            } else if (parent[0] === $('html')[0]) {
                                break;
                            } else {
                                parent = parent.parent();
                            }
                        }
                        var V2P = w.$Interframe.getViewport2Element(parent[0]),
                            top = V2P.visibleTop + Math.max((V2P.visibleHeight - height) / 2, 0);
                        V2P.visibleHeight > 0 && popup.css('top', top + 'px').css('bottom', parent.scrollHeight - top - height + 'px').css('margin-top', '0px').css('margin-bottom', '0px');
                        break;
                    case 'relative':
                        var parent = popup.parent(),
                            V2P = w.$Interframe.getViewport2Element(parent[0]),
                            top = V2P.visibleTop + Math.max((V2P.visibleHeight - height) / 2, 0);
                        V2P.visibleHeight > 0 && popup.css('margin-top', top + 'px').css('margin-bottom', parent.scrollHeight - top - height + 'px').css('top', '0px').css('bottom', '0px');
                        break;
                    case 'static':
                        var parent = popup.parent(),
                            V2P = w.$Interframe.getViewport2Element(parent[0]),
                            top = V2P.visibleTop + Math.max((V2P.visibleHeight - height) / 2, 0);
                        V2P.visibleHeight > 0 && popup.css('margin-top', top + 'px').css('margin-bottom', parent.scrollHeight - top - height + 'px');
                        break;
                    default:
                        break;
                }
                popup.css('display', oldDisplay).css('visibility', (oldVisibility === 'visible') ? '' : oldVisibility);
                log(2, '$Interframe.centerPopup(' + element2String(popup[0]) + ', ' + height + ')');
            }
        },

        autoSize: function (enable) {
            autoSize = (enable) ? true : false;
            if (autoSize === false) {
                sizeUpdateRequestQ = [];
            }
            log(2, '$Interframe.autoSize(' + enable + ')');
        },

        setSize: function (height) {
            requestSizeUpdate(height);
            log(2, '$Interframe.setSize(' + height + ')');
        },

        checkSize: function () {
            $.each(childFrames, function () {
                postMsg(this.window, this.origin, { object: 'checkSize' });
            });
            log(2, '$Interframe.checkSize()');
        }
    };

    $(w).on('load', function (evt) {
        w.$Interframe.init();
    });
}(window, document);

