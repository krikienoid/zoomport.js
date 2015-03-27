# ZoomPort.js
- - -


A JS API for creating viewports that can zoom in and enlarge their contents.

Based on [zoom.js](http://lab.hakim.se/zoom-js) by Hakim El Hattab.

[View Demo Page](http://krikienoid.github.io/zoomport/zoommap.html).




# Usage
- - -


#### ``ZoomPort ( outerFrame [, innerFrame, options] )``
Create a new ZoomPort instance:

```javascript
    var zoomPort = ZoomPort(document.getElementById('myElem'), {
        transitionsOn : true,
        panningOn     : true
    });
```

A new ZoomPort can be created by passing an existing DOM element as the ``outerFrame``.
``outerFrame`` _must_ have a child element to use as its ``innerFrame`` – if
``innerFrame`` is not specified, then the first child will be chosen by default.
The ``innerFrame`` is the element that can be zoomed in and enlarged –
it is contained within ``outerFrame``, which acts as its viewport.
Additional options can be specified in the ``options`` object.

Full list of possible options:

+ ``options.element`` – HTML element to zoom in on.
+ ``options.padding`` – spacing around the zoomed in element, default is 20.
+ ``options.scale`` – set the scale to zoom in by.
+ ``options.x`` – coordinates of the viewable rectangle to zoom in on.
+ ``options.y`` – coordinates of the viewable rectangle to zoom in on.
+ ``options.width`` – the portion of the viewable area to zoom in on.
+ ``options.height`` – the portion of the viewable area to zoom in on.
+ ``options.transitionsOn`` – enable or disable CSS transitions.
+ ``options.panningOn`` – enable or disable panning.
+ ``options.callback`` – call back function to be called when zooming ends.

#### ``zoomPort.to ( options )``
Zoom in to an area specified by ``options``.
``zoomPort.to`` can accept all options that can be passed to the ZoomPort constructor.

Examples:

Zoom in on a rectangular area:

```javascript
    zoomPort.to({
        // Scale is calculated based on given values.
        x      : 0,
        y      : 0,
        width  : 500,
        height : 500
    });
```

Zoom in to a specific scale:

```javascript
    zoomPort.to({
        scale : 2.5
    });
```

Zoom in on an HTML Element:

```javascript
    zoomPort.to({
        element       : document.getElementsByTagName('p')[0],
        padding       : 15,
		transitionsOn : false
    });
```

#### ``zoomPort.scale ( value )``
Get or set scale.

#### ``zoomPort.viewBox ()``
Get rectangle containing the area currently within the view frame.

#### ``zoomPort.transitionsOn ( value )``
Enable or disable CSS transitions.

#### ``zoomPort.panningOn ( value )``
Enable or disable automatic panning.

#### ``zoomPort.out ( options )``
Zoom out to default scale (1x).
A callback function may be specified using ``options.callback``.

#### ``zoomPort.reset ()``
Zoom out to default scale (1x).




# Limitations
- - -


!ZoomPort is still under development!
+ Creating ZoomPort instances inside of other ZoomPort instances is undefined behavior.
+ Assigning the same DOM Element to multiple ZoomPort instances is undefined behavior.
+ Current type checking doesn't work across context frames.
+ If inner frame content is smaller than outer frame, it will not transition smoothly.
+ Current panning function is buggy.




# License
- - -


MIT licensed