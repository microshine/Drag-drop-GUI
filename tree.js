function isString(v) {
    return typeof v == "string"
}

function isNumber(v) {
    return typeof v == "number"
}

function isBoolean(v) {
    return typeof v == "boolean"
}

function isObject(v) {
    return typeof v == "object"
}

function isFunction(v) {
    return typeof v == "function"
}

function isArray(v) {
    return Array.isArray(v)
}

function isUndefined(v) {
    return v === undefined
}

function isNull(v) {
    return v === null
}

function isEmpty(v) {
    return isUndefined(v) || isNull(v)
}

function isType(v, t) {
    if (isString(t))
        return typeof v == t
    return v instanceof t
}

function extend(a, b) {
    a.__proto__ = new b();
    a.type = arguments.callee.caller.name;
}

function instanceOf(el, s) {
    if (el.type) {
        if (el.type == s)
            return true;
        return instanceOf(el.__proto__, s);
    }
    return false
}

function query(s, t) {
    var p = t || document;
    if (instanceOf(p, "Element"))
        p = p.node();
    return p.querySelector(s)
}

function queryAll(s, t) {
    var p = t || document;
    if (instanceOf(p, "Element"))
        p = p.node();
    return p.querySelectorAll(s);
}

//Create Node from html string
function createNode(html) {
    var div = document.createElement("div");
    div.innerHTML = html;
    return div.childNodes[0];
}

function BaseObject() {
    var that = this;
    this.type = "BaseObject"

    var _data = {};
    this.defineProperty = function (n, value, readOnly) {
        _data[n] = value;
        this[n] = function (v) {
            if (!isEmpty(v) && !readOnly) {
                var e = {
                    name: n,
                    value: v,
                    cancel: false
                };
                that.trigger("beforeChange", [e]);
                if (!e.cancel) {
                    _data[n] = e.value;
                    that.trigger("change", [{ name: n, value: e.value }]);
                }
            }
            return _data[n]
        }
    }

    var _events = {};
    this.on = function (n, cb) {
        if (!isString(n))
            throw new TypeError("Parameter 1 must be String");
        if (!isFunction(cb))
            throw new TypeError("Parameter 2 must be Function");
        if (!(n in _events)) {
            _events[n] = []
        }
        _events[n].push(cb);
    }

    this.trigger = function (n, args) {
        if (n in _events) {
            for (var i in _events[n])
                _events[n][i].apply(this, args);
        }
    }

    this.off = function (n) {
        delete _events[n]
        return true;
    }

    this.applyOptions = function (options) {
        if (!isEmpty(options)) {
            if (!isObject(options))
                throw new TypeError("Parameter 1 must be Object");
            for (var i in options) {
                var prop = this[i];
                if (prop) {
                    if (isFunction(prop))
                        prop.call(this, options[i]);
                }

            }
        }
    }
}

//Collection
function Collection() {
    extend(this, BaseObject);

    var _items = {};
    this.items = function (index) {
        return _items[index];
    }

    this.length = function () {
        var res = Object.keys(_items).length;
        return res;
    }

    this.add = function (item) {
        var e = {
            value: item,
            cancel: false
        }
        this.trigger("beforeAdd", [e])
        if (!e.cancel) {
            var len = this.length();
            _items[len] = e.value;
            this.trigger("add", [{ value: e.value, index: this.length() }])
        }
    }

    function refreshIndexes(val) {
        var j = 0;
        for (var i in val) {
            var v = val[i];
            delete val[i];
            val[j] = v;
            j++;
        }
    }

    this.removeAt = function (index) {
        var e = {
            value: this.items(index),
            cancel: false
        }
        this.trigger("beforeRemove", [e])
        if (!e.cancel) {
            delete _items[index];
            refreshIndexes(_items);
            this.trigger("remove", [e])
        }
    }
    function compareBase(el, val) {
        if (el.type) {
            if (el.type == val.type)
                return el == val;
            return compareBase(el.__proto__, val);
        }
        return false;
    }
    this.indexOf = function (val) {
        var res = -1;
        for (var i in _items)
            if (compareBase(_items[i], val)) {
                res = +i;
                break;
            }
        return res;
    }

    function init() {

    }
    init.apply(this, arguments);
}

//Element
function Element() {
    extend(this, BaseObject);
    var that = this;

    this.defineProperty("node");
    this.defineProperty("class");
    this.on("beforeChange", function (e) {
        switch (e.name) {
            case "class":
                if (!isString(e.value))
                    throw new TypeError("Value must be String");
                that.node().classList.remove(that.class());
                that.node().classList.add(e.value);
                break;
        }
    })

    this.create = function (s) {
        s = s || "div";
        var html = "<" + s + "/>";
        this.node(createNode(html));

        var that = this;
        this.node().addEventListener("click", function () {
            that.trigger("click", arguments);
        })
        this.node().addEventListener("mousedown", function () {
            that.trigger("mousedown", arguments);
        })
    }

    this.instanceOf = function (s) {
        return instanceOf(this, s);
    }

    this.text = function (s) {
        if (!isEmpty(s))
            this.node().innerText = s;
        return this.node().innerText;
    }

    this.html = function (s) {
        if (!isEmpty(s))
            this.node().innerHTML = s;
        return this.node().innerHTML;
    }

    this.query = function (s) {
        return query(s, this);
    }

    this.queryAll = function (s, t) {
        return queryAll(s, this);
    }

    this.appendTo = function (node) {
        if (instanceOf(node, "Element"))
            node.node().appendChild(this.node());
        else {
            var _node = node;
            if (isString(node))
                _node = query(node);
            _node.appendChild(this.node());
        }
    }

    this.remove = function (node) {
        if (isEmpty(node)) {
            this.node().parentNode.removeChild(this.node());
        }
        else {
            if (instanceOf(node, "Element"))
                node = node.node();
            this.node().removeChild(node);
        }
    }

    this.addClass = function (s) {
        this.node().classList.add(s);
    }

    this.removeClass = function (s) {
        this.node().classList.remove(s);
    }

    this.hasClass = function (s) {
        return this.node().classList.contains(s);
    }

    this.attr = function (n, val) {
        if (isNull(val))
            this.node().removeAttribute(n);
        else if (isUndefined(val)) {
            return this.node().getAttribute(n);
        }
        else {
            this.node().setAttribute(n, val);
            return val;
        }
    }

    this.show = function () {
        this.node().classList.remove("hidden");
    }

    this.hide = function () {
        this.node().classList.add("hidden");
    }

    this.append = function (node) {
        if (instanceOf(node, "Element"))
            node = node.node();
        this.node().appendChild(node);
    }

    this.width = function (n) {
        if (n !== undefined)
            this.node().style.width = n;
        return this.node().clientWidth;
    }

    this.height = function (n) {
        if (n !== undefined)
            this.node().style.height = n;
        return this.node().clientHeight;
    }

    this.size = function (h, w) {
        if (arguments.length = 2) {
            this.width(w);
            this.height(h);
        }
        return { height: this.height(), width: this.width() }
    }

    this.x = this.left = function (n) {
        if (n !== undefined) {
            this.node().style.left = n;
            this.trigger("move");
        }
        return this.node().offsetLeft;
    }

    this.y = this.top = function (n) {
        if (n !== undefined) {
            this.node().style.top = n;
            this.trigger("move");
        }
        return this.node().offsetTop;
    }

    this.position = function (o) {
        if (o) {
            this.node().style.left = o.x || o.left;
            this.node().style.top = o.y || o.top;
            this.trigger("move");
        }
        return { x: this.x(), y: this.y() }
    }

    function init() {
        this.applyOptions(arguments[0]);
    }

    init.apply(this, arguments);
}

function Button() {
    extend(this, Element);
    var that = this

    function init() {
        this.create();
        this.class("el-button");

        this.applyOptions(arguments[0]);
    }

    init.apply(this, arguments);
}

//TreeElement
function TreeItem() {
    extend(this, Element);
    var that = this;

    //elements
    var btnClose, content;

    var _items = new Collection();
    this.items = function (i) {
        if (isNumber(i) && i >= 0) {
            return _items.items(i);
        }
        return _items;
    }

    _items.on("beforeAdd", function (e) {
        if (!instanceOf(e.value, "TreeItem"))
            throw new TypeError("Valu must be instance of TreeItem");
        e.value.canvas(that.canvas());
    })

    _items.on("add", function (e) {
        var line = new TreeLine({
            itemFrom: e.value,
            itemTo: that,
            appendTo: that.node().parentNode
        })
        line.draw();
    })

    that.on("close", onClose);

    function onClose(e) {
        while(that.items().length()>0) {
            that.items(0).trigger("close");
        }
        var p = that.parentItem();
        that.node().remove();
        var lines = that.lines();
        for (var i = 0; i < lines.length() ; i++) {
            lines.removeAt(i);
        }
        if (p) {
            var i = p.items().indexOf(that);
            p.items().removeAt(i);
            if (e)
                p.canvas().order();
        }
    }

    var offsetX, offsetY;
    function mouseUp() {
        that.removeClass("el-taked");
        window.removeEventListener('mousemove', divMove, true);
    }

    function mouseDown(e) {
        e.stopPropagation();
        offsetX = e.clientX - that.node().offsetLeft;
        offsetY = e.clientY - that.node().offsetTop;
        that.addClass("el-taked");
        window.addEventListener('mousemove', divMove, true);
    }

    function divMove(e) {
        that.position({
            top: e.clientY - offsetY,
            left: e.clientX - offsetX
        });
    }

    this.defineProperty("selected", false);
    this.defineProperty("lines", new Collection(), true);

    var _canvas = null;
    this.canvas = function (v) {
        if (!isEmpty(v)) {
            if (!instanceOf(v, "Canvas"))
                throw new TypeError("TreItem.canvas: Value must be Canvas");
            if (v.items().indexOf(this) == -1) {
                v.items().add(this);
            }
            _canvas = v;
        }
        return _canvas
    }

    var _parentItem = null;
    this.parentItem = function (v) {
        if (!isEmpty(v)) {
            if (!instanceOf(v, "TreeItem"))
                throw new TypeError("TreeItem.parentItem: Value must be TreeItem");
            if (v.parentItem()) {
                var p = v.parentItem();
                var i = p.items().indexOf(that);
                if (i >= 0) {
                    p.items().removeAt(i);
                }
            }
            v.items().add(this);
            _parentItem = v;
        }
        return _parentItem;
    }

    this.on("beforeChange", function (e) {
        switch (e.name) {
        }
    })

    this.on("change", function (e) {
        switch (e.name) {
            case "selected":
                if (e.value)
                    that.addClass("selected");
                else
                    that.removeClass("selected");
                that.trigger("selected", [e.value]);
                break;
        }
    })

    this.on("click", function () {
        that.selected(true);
    })

    function onConnectorSelect(e) {
        that.canvas().trigger("connectorSelect", [e])
    }

    function init() {
        this.create();
        this.class("el-treeItem");
        this.node().addEventListener('mousedown', mouseDown, false);
        window.addEventListener('mouseup', mouseUp, false);

        //Add close button
        //this.defineProperty("btnClose", new Button(), true);
        btnClose = new Button();
        btnClose.addClass("el-close");
        btnClose.on("click", function (e) {
            console.time("Close");
            onClose(e);
            console.timeEnd("Close");
        });
        btnClose.appendTo(this.node());

        //Add content
        content = new Element();
        this.defineProperty("content", content, true);
        content.create();
        content.class("el-content");
        content.appendTo(this.node());

        //Add top connector
        this.defineProperty("connectorTop", new Connector({}), true);
        this.connectorTop().addClass("top");
        this.connectorTop().appendTo(this);
        this.connectorTop().item(this);
        this.connectorTop().type("top");
        this.connectorTop().on("select", onConnectorSelect);


        //Add bottom connector
        this.defineProperty("connectorBottom", new Connector({}), true);
        this.connectorBottom().addClass("bottom");
        this.connectorBottom().appendTo(this);
        this.connectorBottom().item(this);
        this.connectorBottom().type("bottom");
        this.connectorBottom().on("select", onConnectorSelect);

        this.on("selected", function (e) {
            if (that.canvas() && e) {
                that.canvas().trigger("itemSelected", [{ item: that }]);
            }
        })

        this.lines().on("remove", function (e) {
            if (e.value.node().parentNode)
                that.canvas().node().removeChild(e.value.node());
        })
    }

    init.apply(this, arguments);
}

//Page
function Page() {
    extend(this, TreeItem);
    var that = this;

    this.defineProperty("text");
    this.text.propertyGrid = true;

    this.canvas = this.__proto__.canvas;


    this.on("beforeChange", function (e) {
        switch (e.name) {
            case "text":
                that.content().node().innerText = e.value;
                break;
        }
    })

    function init() {
        this.addClass("el-page");
        this.applyOptions(arguments[0]);
    }

    init.apply(this, arguments)
}


//Image
function Image() {
    extend(this, TreeItem);
    var that = this;

    var $image;

    this.canvas = this.__proto__.canvas;

    this.defineProperty("image");
    this.image.propertyGrid = true;
    this.defineProperty("alt");
    this.alt.propertyGrid = true;

    this.on("change", function (e) {
        switch (e.name) {
            case "image":
                var $el = that.content().node();
                $el.style.background = "url(" + e.value + ")";
                $el.style.backgroundSize = "cover";
                break;
        }
    })

    function init() {
        this.addClass("el-image");
        this.image("images/000.png");
        this.alt("No image");

        this.applyOptions(arguments[0]);
    }
    init.apply(this, arguments);
}

//Path
function Path() {
    extend(this, Element);
    var that = this;

    this.defineProperty("strokeWidth");

    this.draw = function (d) {
        this.attr("d", d);
    }

    this.on("beforeChange", function (e) {
        switch (e.name) {
            case "strokeWidth":
                that.node().style.strokeWidth = e.value;
                break;
        }
    })

    function init() {
        this.create("path");
    }

    init.apply(this, arguments);
}

//Connector
function Connector() {
    extend(this, Element);
    var that = this;

    this.defineProperty("lines", new Collection(), true);
    this.defineProperty("type");
    this.defineProperty("item");
    this.defineProperty("selected", false);

    this.on("change", function (e) {
        switch (e.name) {
            case "selected":
                if (e.value)
                    that.addClass("selected")
                else
                    that.removeClass("selected")
                that.trigger("select", [{ target: that, value: e.value }]);
                break;
        }
    })

    function onClick(e) {
        e.preventDefault();
        e.stopPropagation();
        if (!that.selected())
            that.selected(true);
    }

    function onMouseDown(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function init() {
        this.create("div");
        this.class("el-connector");
        this.applyOptions(arguments[0]);

        this.on("click", onClick);
        this.on("mousedown", onMouseDown);
    }
    init.apply(this, arguments);
}

//Line
function Line() {
    extend(this, Element);
    var that = this;

    //elements
    var path;

    var STROKE_WIDTH = 2;

    this.draw = function (to) {
        //console.log(this.position());
        //console.log(to);
        var sw = path.strokeWidth() / 2;
        var sizeX = to.x;
        if (sizeX < 0)
            sizeX *= -1;
        sizeX += (sw * 2);
        var sizeY = to.y + (sw * 2);
        if (sizeY < 0)
            sizeY *= -1;
        sizeY += (sw * 2);
        this.size(sizeY, sizeX);

        var _x = sw;
        if (to.x < 0) {
            _x = this.width() - sw * 2;
            this.left(this.left() - _x);
            _x += sw;
        }

        var _y = sw;
        if (to.y < 0) {
            _y = this.height() - sw * 2;
            this.top(this.top() - _y);
            _y += sw;
        }
        var d = "M" + _x + " " + _y;
        d += "L" + _x + " " + (_y + to.y / 2) + ",";
        d += (_x + to.x) + " " + (_y + to.y / 2) + ",";
        d += (_x + to.x) + " " + (_y + to.y);
        //console.log(d);
        path.draw(d);
    }

    function init() {
        this.create("svg");

        this.node().innerHTML = "<path/>";
        path = new Path();
        path.node(this.node().childNodes[0]);
        path.class("el-line");
        path.strokeWidth(STROKE_WIDTH);
        this.strokeWidth = path.strokeWidth;

        this.append(path.node());
        //this.append(path);
    }

    init.apply(this, arguments);
}

//TreeLine
function TreeLine() {
    extend(this, Line);
    var that = this;

    //elements

    this.defineProperty("itemFrom");
    this.defineProperty("itemTo");


    function getFromBottom() {
        var item = that.itemFrom();
        var p = {
            x: item.x() + (item.width() / 2) - 1,
            y: item.y() + item.height()
        }
        return p;
    }

    function getToTop() {
        var item = that.itemTo();
        var p = {
            x: item.x() + (item.width() / 2),
            y: item.y()
        }
        return p;
    }

    this.draw = function () {
        var self = this.__proto__;
        var from = getFromBottom();
        var to = getToTop();
        to.x -= (from.x + 1);
        to.y -= from.y - this.strokeWidth() / 2;
        from.y -= this.strokeWidth() / 2;
        this.position(from);
        self.draw(to);
        this.itemFrom().lines().add(this);
        this.itemTo().lines().add(this);
    }

    function onItemMove() {
        that.draw();
    }

    this.on("beforeChange", function (e) {
        switch (e.name) {
            case "itemFrom":
            case "itemTo":
                e.value.on("move", onItemMove);
                break;
        }
    })

    function init() {
        this.class("el-treeLine");

        this.applyOptions(arguments[0]);
    }

    init.apply(this, arguments);
}

//Canvas
function Canvas() {
    extend(this, Element);
    var that = this;

    //elements
    var _items = new CanvasItemCollection();
    this.items = function (v) {
        if (!isEmpty(v)) {
            return _items.items(v);
        }
        return _items;
    }

    this.on("beforeChange", function (e) {
        switch (e.name) {

        }
    })

    var xStart = 50;
    var yStart = 10;
    var xStep = 150;
    var yStep = 150;

    var iCount = [];
    function orderItem(item, i, j) {
        var count = 0;
        for (var _i = 0; _i < item.items().length() ; _i++) {
            var _item = item.items(_i);
            if (instanceOf(_item, "Page"))
                count += orderItem(_item, i + 1, j + count);
            count+=1;
        }
        var c = count > 0 ? count - 1 : count;
        var _x = xStart + (xStep * j) + (xStep * (c / 2));
        item.x(_x);
        var _y = yStart + yStep * i;
        item.y(_y);
        return c;
    }


    this.order = function () {
        //get first item
        console.time("Order");
        var item = this.items(0);
        if (item) {
            orderItem(item, 0, 0);
        }
        console.timeEnd("Order");
    }

    var _selected = null;
    function onItemSelected(e) {
        if (_selected !== e.item) {
            if (!isEmpty(_selected)) {
                _selected.selected(false);
            }
            _selected = e.item;
            that.trigger("selected", [{ target: that, item: that.items().items(that.items().indexOf(_selected)) }]);
        }
    }

    var con;
    function onConnectorSelected(e) {
        if (e.value) {
            if (!con)
                con = e.target;
            else {
                //create line
                var parent = (con.type() == "top") ? e.target.item() : con.item();
                var child = (con.type() == "top") ? con.item() : e.target.item();
                if (con.type() !== e.target.type())
                    child.parentItem(parent);

                //off selection
                con.selected(false);
                e.target.selected(false);
                con = null;
            }
        }
    }

    function init() {
        this.create("div");
        this.class("canvas");

        _items.on("add", function (e) {
            e.value.canvas(that);
            that.append(e.value.node());
        })
        _items.on("beforeAdd", function (e) {

        })

        this.on("itemSelected", onItemSelected);
        this.on("connectorSelect", onConnectorSelected);
    }

    init.apply(this, arguments);
}

function CanvasItemCollection() {
    extend(this, Collection);

    function init() {
        this.on("beforeAdd", function (e) {
            if (!instanceOf(e.value, "TreeItem"))
                throw new TypeError("CanvasItemCollection.add: Item must be instance of TreeItem");
        })
    }
    init.apply(this, arguments);
}

function PropertyGrid() {
    extend(this, Element);
    var that = this;

    this.defineProperty("items", new Collection(), true);
    this.defineProperty("object");

    this.on("change", function (e) {
        switch (e.name) {
            case "object":
                //remove items
                for (var i = 0; i < that.items().length() ; i++) {
                    that.items().removeAt(i);
                }
                //add new items
                for (var i in e.value) {
                    var prop = e.value[i];
                    if (prop.propertyGrid) {
                        that.items().add(new PropertyGridItem({ text: i, name: i, value: prop() }))
                    }
                }
        }
    })

    function onAdd(e) {
        that.append(e.value);
    }

    function onRemove(e) {
        e.value.remove();
    }

    function init() {
        this.create();
        this.class("el-propertyGrid");

        this.items().on("add", onAdd);
        this.items().on("remove", onRemove);

        this.applyOptions(arguments[0]);
    }
    init.apply(this, arguments);
}

function PropertyGridItem() {
    extend(this, Element);
    var that = this;

    var $input, $text;

    this.defineProperty("text");
    this.defineProperty("name");
    this.defineProperty("value");

    this.on("change", function (e) {
        switch (e.name) {
            case "text":
                $text.text(e.value);
                break;
            case "value":
                $text.node().value = e.value;
                break;
        }
    })

    function init() {
        this.create();
        this.class("el-item");
        this.html("<div class='el-text'></div><div class='el-value'><input type='text'/></div>")
        $text = new Element({ node: this.query(".el-text") });
        $input = new Element({ node: this.query("input") });
        $input.node().addEventListener("change", function () {
            that.trigger("valueChanged", [{
                name: that.name(),
                value: that.value(),
                target: that
            }])
        })

        this.applyOptions(arguments[0]);
    }
    init.apply(this, arguments);
}