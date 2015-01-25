/**
 * ZoomPort.js
 * Create independently zoomable viewports for scaling HTML elements
 * Copyright (C) Ken Sugiura (Jan 25, 2015)
 *
 * Based on zoom.js 0.3
 * http://lab.hakim.se/zoom-js
 * Copyright (C) 2011-2014 Hakim El Hattab, http://hakim.se
 *
 * MIT license
 */

;(function (window, document, undefined) {

	// Settings
	var TRANSITION_FUNCTION = 'ms linear',
		TRANSITION_DURATION = 800,
		PAN_RANGE           = 0.12,
		PAN_DISTANCE        = 14;

	// Timeout before pan is activated
	var panEngageTimeout  = -1,
		panUpdateInterval = -1;

	// Timeout for callback function
	var callbackTimeout = -1;

	// Browser support
	var supportsTransforms;

	// The current mouse position, used for panning
	var mouseX = 0,
		mouseY = 0;

	//
	// Init
	//

	// Wait until DOM is loaded before initializing
	document.addEventListener('DOMContentLoaded', function () {

		// Check for transform support so that we can fallback otherwise
		supportsTransforms = 'WebkitTransform' in document.body.style ||
			'MozTransform'    in document.body.style ||
			'msTransform'     in document.body.style ||
			'OTransform'      in document.body.style ||
			'transform'       in document.body.style;

	});

	//
	// Constructors
	//

	/**
	 * ZoomData
	 * private class of ZoomPort
	 *
	 * @private
	 * @param {Element} elem
	 * @constructor
	 */
	function ZoomData (elem) {

		//
		// Settings
		//

		this._level     = 1;
		this._isFixed   = false;
		this._easingsOn = false;
		this._panningOn = false;
		this._innerElem = null;
		this._outerElem = null;

		// Set innerElem and outerElem
		this._setElem((elem instanceof window.Element)? elem : document.body);

		// Add events
		this._innerElem.addEventListener('click',     toEvent.bind(this));
		this._innerElem.addEventListener('keyup',     escEvent.bind(this));
		this._innerElem.addEventListener('mousemove', panEvent.bind(this));

	}

	//
	// Private Methods
	//

	/**
	 * Specify the HTML element that is enlarged
	 * default is document.body
	 *
	 * @private
	 * @param {Element} elem
	 */
	ZoomData.prototype._setElem = function (elem) {
		var innerElem, outerElem;
		if (elem instanceof window.Element) {
			innerElem = elem;
			if (innerElem.parentNode instanceof window.Element && innerElem !== document.body) {
				outerElem = document.createElement('div');
				outerElem.style.overflow = 'auto';
				innerElem.parentNode.insertBefore(outerElem, innerElem);
				outerElem.appendChild(innerElem);
			}
			else {
				outerElem = window;
			}
			this._innerElem = innerElem;
			this._outerElem = outerElem;
		}
	};

	/**
	 * Applies the CSS required to zoom in, prefers the use of CSS3
	 * transforms but falls back on zoom for IE.
	 *
	 * @private
	 * @param {number} scale
	 * @param {Object} viewFrame
	 *   @param {number} viewFrame.x
	 *   @param {number} viewFrame.y      - coordinates in non-transformed space to zoom in on
	 *   @param {number} viewFrame.width
	 *   @param {number} viewFrame.height - the portion of the screen to zoom in on
	 */
	ZoomData.prototype._magnify = function (scale, viewFrame) {

		var innerElemStyle = this._innerElem.style,
			outerElem      = this._outerElem,
			rect           = getRect(outerElem),
			scrollPos      = getScrollPos(outerElem),
			centerX        = viewFrame.x + (viewFrame.width)  / 2,
			centerY        = viewFrame.y + (viewFrame.height) / 2,
			offsetX        = centerX * scale - rect.width  / 2,
			offsetY        = centerY * scale - rect.height / 2,
			transform,
			origin,
			translateX,
			translateY;

		if (supportsTransforms) {
			if (scale === 1) {
				// Reset
				innerElemStyle.transform       = '';
				innerElemStyle.OTransform      = '';
				innerElemStyle.msTransform     = '';
				innerElemStyle.MozTransform    = '';
				innerElemStyle.WebkitTransform = '';
			}
			else {
				// Scale
				origin    = '0 0';
				transform = 'scale(' + scale + ')';

				if (this._isFixed) {
					translateX = (viewFrame.x - scrollPos.x) * scale - (rect.width  - viewFrame.width  * scale) / 2;
					translateY = (viewFrame.y - scrollPos.y) * scale - (rect.height - viewFrame.height * scale) / 2;
					origin = scrollPos.x + 'px ' + scrollPos.y + 'px';
					transform += ' translate(' +
						-(translateX / scale) + 'px, ' +
						-(translateY / scale) + 'px)';
				}

				innerElemStyle.transformOrigin       = origin;
				innerElemStyle.OTransformOrigin      = origin;
				innerElemStyle.msTransformOrigin     = origin;
				innerElemStyle.MozTransformOrigin    = origin;
				innerElemStyle.WebkitTransformOrigin = origin;

				innerElemStyle.transform       = transform;
				innerElemStyle.OTransform      = transform;
				innerElemStyle.msTransform     = transform;
				innerElemStyle.MozTransform    = transform;
				innerElemStyle.WebkitTransform = transform;
			}
		}

		else {
			if (scale === 1) {
				// Reset
				innerElemStyle.position = '';
				innerElemStyle.left     = '';
				innerElemStyle.top      = '';
				innerElemStyle.width    = '';
				innerElemStyle.height   = '';
				innerElemStyle.zoom     = '';
			}
			else {
				// Scale
				//(-(oY + centerY) / scale)
				innerElemStyle.position = 'relative';
				if (isFixed) {
					innerElemStyle.left = -offsetX + 'px';
					innerElemStyle.top  = -offsetY + 'px';
				}
				innerElemStyle.width    = (scale * 100) + '%';
				innerElemStyle.height   = (scale * 100) + '%';
				innerElemStyle.zoom     = scale;
			}
		}

		if (!this._isFixed) {
			//setSmoothScrollPos2(outerElem, centerX, centerY, scale);
			setScrollPos(outerElem, offsetX, offsetY);
		}

		this._level = scale;

	};

	/**
	 * Pan the document when the mouse cursor approaches the edges
	 * of the viewport.
	 *
	 * @private
	 */
	ZoomData.prototype._pan = function () {

		var level        = this._level,
			outerElem    = this._outerElem,
			rect         = getRect(outerElem),
			scrollPos    = getScrollPos(outerElem),
			rangeX       = rect.width  * PAN_RANGE,
			rangeY       = rect.height * PAN_RANGE,
			mouseOffsetX = mouseX - rect.left,
			mouseOffsetY = mouseY - rect.top;

		// Up
		if (mouseOffsetY < rangeY && mouseOffsetY > 0) {
			setScrollPos(
				outerElem,
				scrollPos.x,
				scrollPos.y - (1 - (mouseOffsetY / rangeY)) * (PAN_DISTANCE / level)
			);
		}
		// Down
		else if (mouseOffsetY > rect.height - rangeY && mouseOffsetY < rect.height) {
			setScrollPos(
				outerElem,
				scrollPos.x,
				scrollPos.y + (1 - (rect.height - mouseOffsetY) / rangeY) * (PAN_DISTANCE / level)
			);
		}

		// Left
		if (mouseOffsetX < rangeX && mouseOffsetX > 0) {
			setScrollPos(
				outerElem,
				scrollPos.x - (1 - (mouseOffsetX / rangeX)) * (PAN_DISTANCE / level),
				scrollPos.y
			);
		}
		// Right
		else if (mouseOffsetX > rect.width - rangeX && mouseOffsetX < rect.width) {
			setScrollPos(
				outerElem,
				scrollPos.x + (1 - (rect.width - mouseOffsetX) / rangeX) * (PAN_DISTANCE / level),
				scrollPos.y
			);
		}
	};

	//
	// Public Methods
	//

	/**
	 * Zooms in on either a rectangle or HTML element.
	 *
	 * @param {Object} options
	 *   @param {Element}  [options.element]  - HTML element to zoom in on
	 *   @param {number}   [options.padding]  - spacing around the zoomed in element
	 *   @param {number}   [options.x]
	 *   @param {number}   [options.y]        - coordinates in non-transformed space to zoom in on
	 *   @param {number}   [options.width]
	 *   @param {number}   [options.height]   - the portion of the screen to zoom in on
	 *   @param {number}   [options.scale]    - can be used instead of width/height to explicitly set scale
	 *   @param {Function} [options.callback] - call back when zooming in ends
	 *   @param {boolean}  [options.pan]      - disable panning
	 */
	ZoomData.prototype.to = function (options) {

		var level     = this._level,
			outerElem = this._outerElem,
			rect      = getRect(outerElem),
			scrollPos = getScrollPos(outerElem),
			viewFrame = {
				x      : (scrollPos.x + rect.width  / 2) / level - rect.width  / 2,
				y      : (scrollPos.y + rect.height / 2) / level - rect.height / 2,
				width  : rect.width,
				height : rect.height
			},
			scale,
			coords,
			bounds,
			padding;

		// Calculate x/y/width/height values
		if (options.element instanceof window.Element) {

			// If an element is set, that takes precedence
			coords  = getAbsolutePos(options.element, outerElem);
			bounds  = options.element.getBoundingClientRect();

			// Space around the zoomed in element to leave on screen
			padding = (!window.isNaN(options.padding)) ? options.padding : 20;

			viewFrame.x       = coords.x - padding;
			viewFrame.y       = coords.y - padding;
			viewFrame.width   = bounds.width  / level + padding * 2;
			viewFrame.height  = bounds.height / level + padding * 2;

		}
		else {

			// Copy x/y values from options
			if (!window.isNaN(options.x)) {
				viewFrame.x = options.x;
			}
			if (!window.isNaN(options.y)) {
				viewFrame.y = options.y;
			}

			// Copy width/height values from options
			if (!window.isNaN(options.width) && !window.isNaN(options.height)) {
				viewFrame.width  = options.width;
				viewFrame.height = options.height;
			}

		}

		// Ensure scale is set
		if (!window.isNaN(options.scale)) {
			scale = options.scale;
		}
		else {
			scale = window.Math.max(
				window.Math.min(
					rect.width  / viewFrame.width,
					rect.height / viewFrame.height
				),
				1
			);
		}

		// Magnify
		if (scale > 0) {

			// Magnify
			this._magnify(scale, viewFrame);

			// Wait with engaging panning as it may conflict with the
			// zoom transition
			if (options.pan !== undefined) {
				this._panningOn = !!options.pan;
			}
			if (this._panningOn) {
				(function (pan) {
					panEngageTimeout = window.setTimeout(
						function () {
							panUpdateInterval = window.setInterval(pan, 1000 / 60);
						},
						TRANSITION_DURATION
					);
				})(this._pan.bind(this));
			}

			if (options.callback instanceof window.Function) {
				callbackTimeout = window.setTimeout(
					options.callback,
					TRANSITION_DURATION
				);
			}

		}

	};

	/**
	 * Resets the document zoom state to its default.
	 *
	 * @param {Object} options
	 *   @param {Function} [options.callback] - call back when zooming out ends
	 */
	ZoomData.prototype.out = function (options) {
		window.clearTimeout  (panEngageTimeout);
		window.clearInterval (panUpdateInterval);
		window.clearTimeout  (callbackTimeout);

		this.to({scale : 1});

		if (options && options.callback instanceof Function) {
			window.setTimeout(
				options.callback,
				TRANSITION_DURATION
			);
		}

	};

	/**
	 * Set scale
	 *
	 * @param {number} num
	 * @returns {number} scale
	 */
	ZoomData.prototype.scale = function (num) {
		if (!window.isNaN(num)) {
			this.to({scale : num});
		}
		return this._level;
		};

	/**
	 * Enable or disable fixed zoom mode
	 *
	 * @param {boolean} bool
	 * @returns {boolean} isFixed
	 */
	ZoomData.prototype.fixed = function (bool) {
		if (bool !== undefined) {
			this._isFixed = !!bool;
			// easings are disabled when isFixed is false
			this.easings(this._isFixed);
		}
		return this._isFixed;
	};

	/**
	 * Enable or disable easing transitions
	 *
	 * @param {boolean} bool
	 * @returns {boolean} easingsOn
	 */
	ZoomData.prototype.easings = function (bool) {
		var innerElemStyle = this._innerElem.style;
		if (bool !== undefined) {
			this._easingsOn = !!bool;
			if (supportsTransforms && this._isFixed && this._easingsOn) {
				// The easing that will be applied when we zoom in/out
				// NOTE: easings only work in fixed mode
				// easings are disabled when isFixed is false
				innerElemStyle.transition       = 'transform '         + TRANSITION_DURATION + TRANSITION_FUNCTION;
				innerElemStyle.OTransition      = '-o-transform '      + TRANSITION_DURATION + TRANSITION_FUNCTION;
				innerElemStyle.msTransition     = '-ms-transform '     + TRANSITION_DURATION + TRANSITION_FUNCTION;
				innerElemStyle.MozTransition    = '-moz-transform '    + TRANSITION_DURATION + TRANSITION_FUNCTION;
				innerElemStyle.WebkitTransition = '-webkit-transform ' + TRANSITION_DURATION + TRANSITION_FUNCTION;
			}
			else {
				innerElemStyle.transition       = '';
				innerElemStyle.OTransition      = '';
				innerElemStyle.msTransition     = '';
				innerElemStyle.MozTransition    = '';
				innerElemStyle.WebkitTransition = '';
			}
		}
		return this._easingsOn;
	};

	/**
	 * Enable or disable panning
	 *
	 * @param {boolean} bool
	 * @returns {boolean} panningOn
	 */
	ZoomData.prototype.panning = function (bool) {
		if (bool !== undefined) {
			this._panningOn = !!bool;
		}
		return this._panningOn;
	};

	/**
	 * Reset
	 */
	ZoomData.prototype.reset = function () {this.out();};

	//
	// Public Class
	//

	/**
	 * ZoomPort
	 * public class of ZoomPort
	 *
	 * @param {Element} elem
	 * @constructor
	 */
	function ZoomPort (elem) {
		var zoomData = new ZoomData(elem);
		this.to      = zoomData.to     .bind(zoomData);
		this.out     = zoomData.out    .bind(zoomData);
		this.scale   = zoomData.scale  .bind(zoomData);
		this.fixed   = zoomData.fixed  .bind(zoomData);
		this.easings = zoomData.easings.bind(zoomData);
		this.panning = zoomData.panning.bind(zoomData);
		this.reset   = zoomData.reset  .bind(zoomData);
	}

	//
	// Event Handlers
	//

	// Zoom in to clicked element
	function toEvent  (e) {
		e.preventDefault();
		this.to({element : e.target});
	}

	// Zoom out if the user hits escape
	function escEvent (e) {
		if (this.scale() !== 1 && e.keyCode === 27) {
			this.out();
		}
	}

	// Monitor mouse movement for panning
	function panEvent (e) {
		if (this.scale() !== 1) {
			mouseX = e.clientX;
			mouseY = e.clientY;
		}
	}

	//
	// Utilities
	//

	/**
	 * Get absolute position of frame within outerFrame
	 *
	 * @private
	 * @param {Element} frame
	 * @param {Element|Window} outerFrame
	 * @returns {Object} pos
	 */
	function getAbsolutePos (frame, outerFrame) {
		var x = 0,
			y = 0;
		if (frame instanceof window.Element) {
			x = frame.offsetLeft;
			y = frame.offsetTop;
			while (frame.offsetParent && frame !== document.body && frame !== outerFrame) {
				frame = frame.offsetParent;
				x += frame.offsetLeft;
				y += frame.offsetTop;
			}
		}
		return {x : x, y : y};
	}

	/**
	 * Get bounding rectangle of frame
	 *
	 * @private
	 * @param {Element|Window} frame
	 * @returns {Object} rect
	 */
	function getRect (frame) {
		if (frame === window) {
			return {
				top    : 0,
				left   : 0,
				bottom : window.innerHeight,
				right  : window.innerWidth,
				width  : window.innerWidth,
				height : window.innerHeight
			};
		}
		else if (frame instanceof window.Element) {
			return frame.getBoundingClientRect();
		}
	}

	/**
	 * Get scroll offset position of frame
	 *
	 * @private
	 * @param {Element|Window} frame
	 * @returns {Object} pos
	 */
	function getScrollPos (frame) {
		if (frame === window) {
			return {
				x : (window.scrollX !== undefined) ? window.scrollX : window.pageXOffset,
				y : (window.scrollY !== undefined) ? window.scrollY : window.pageYOffset
			};
		}
		else if (frame instanceof window.Element) {
			return {
				x : frame.scrollLeft,
				y : frame.scrollTop
			};
		}
	}

	/**
	 * Set scroll offset position of frame
	 *
	 * @private
	 * @param {Element|Window} frame
	 * @param {number} x
	 * @param {number} y
	 */
	function setScrollPos (frame, x, y) {
		if (frame === window) {
			window.scroll(x, y);
		}
		else if (frame instanceof window.Element) {
			frame.scrollLeft = x;
			frame.scrollTop  = y;
		}
	}

	function setSmoothScrollPos1 (frame, centerX, centerY, scale) {

		var rect       = getRect(frame),
			scrollPos  = getScrollPos(frame),
			startPosX  = scrollPos.x,
			startPosY  = scrollPos.y,
			offsetX    = centerX * scale - rect.width  / 2,
			offsetY    = centerY * scale - rect.height / 2,
			scrollDX   = offsetX - startPosX,
			scrollDY   = offsetY - startPosY,
			resolution = TRANSITION_DURATION * 10,
			gapDX      = scrollDX / resolution,
			gapDY      = scrollDY / resolution,
			gapT       = TRANSITION_DURATION / resolution;

		for (var i = 0; i < resolution; i++) {
			(function (i) {
				window.setTimeout(
					function () {
						setScrollPos(
							frame,
							startPosX + (gapDX * i),
							startPosY + (gapDY * i)
						);
					},
					gapT * i
				);
			})(i + 1);
		}
	}

	function setSmoothScrollPos2 (frame, centerX, centerY, scale) {

		var rect       = getRect(frame),
			scrollPos  = getScrollPos(frame),
			startPosX  = scrollPos.x,
			startPosY  = scrollPos.y,
			offsetX    = centerX * scale - rect.width  / 2,
			offsetY    = centerY * scale - rect.height / 2,
			scrollDX   = offsetX - startPosX,
			scrollDY   = offsetY - startPosY,
			resolution = TRANSITION_DURATION * 10;

		var EASE = getBezier(.25, .1, .25, 1);

		for (var i = 0; i < resolution; i++) {
			(function (i) {
				var p = EASE(i / resolution);
				window.setTimeout(
					function () {
						setScrollPos(
							frame,
							startPosX + (scrollDX * p.y),
							startPosY + (scrollDY * p.y)
						);
					},
					TRANSITION_DURATION * p.x
				);
			})(i + 1);
		}
	}

	/**
	 * Generates a cubic bezier function that returns a point for t
	 * Adapted from http://13thparallel.com/archive/bezier-curves/
	 *
	 * @param {number} x1
	 * @param {number} y1
	 * @param {number} x2
	 * @param {number} y2
	 * @returns {Function} bezier - cubic bezier function
	 */
	function getBezier (x1, y1, x2, y2) {

		return function (t) {
			var t  = 1 - t,
				b1 = t * t * t,
				b2 = 3 * t * t * (1 - t),
				b3 = 3 * t * (1 - t) * (1 - t),
				b4 = (1 - t) * (1 - t) * (1 - t);
			return {
				x : (x1 * b2) + (x2 * b3) + b4,
				y : (y1 * b2) + (y2 * b3) + b4
			};  
		}

	}

	//
	// Export
	//

	/**
	 * Creates ZoomPort object
	 *
	 * @param {Element|Window} frame
	 * @returns {ZoomPort} zoom
	 */
	window.ZoomPort = function (frame) {return new ZoomPort(frame);};

})(window, document);
