'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

var _lodash = require('lodash');

var _util = require('../util');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var rEdgeId = 0;

/**
 * RenderedEdge
 */

var RenderedEdge = function () {
  function RenderedEdge(graphEdge, forward, type, useGeographicRendering) {
    (0, _classCallCheck3.default)(this, RenderedEdge);

    this.id = rEdgeId++;
    this.graphEdge = graphEdge;
    this.forward = forward;
    this.type = type;
    this.points = [];
    this.clearOffsets();
    this.focused = true;
    this.sortableType = 'SEGMENT';
    this.useGeographicRendering = useGeographicRendering;
  }

  (0, _createClass3.default)(RenderedEdge, [{
    key: 'clearGraphData',
    value: function clearGraphData() {
      this.graphEdge = null;
      this.edgeFromOffset = 0;
      this.edgeToOffset = 0;
    }
  }, {
    key: 'addPattern',
    value: function addPattern(pattern) {
      if (!this.patterns) this.patterns = [];
      if (this.patterns.indexOf(pattern) !== -1) return;
      this.patterns.push(pattern);

      // generate the patternIds field
      this.patternIds = constuctIdListString(this.patterns);
    }
  }, {
    key: 'addPathSegment',
    value: function addPathSegment(pathSegment) {
      if (!this.pathSegments) this.pathSegments = [];
      if (this.pathSegments.indexOf(pathSegment) !== -1) return;
      this.pathSegments.push(pathSegment);

      // generate the pathSegmentIds field
      this.pathSegmentIds = constuctIdListString(this.pathSegments);
    }
  }, {
    key: 'getId',
    value: function getId() {
      return this.id;
    }
  }, {
    key: 'getType',
    value: function getType() {
      return this.type;
    }
  }, {
    key: 'setFromOffset',
    value: function setFromOffset(offset) {
      this.fromOffset = offset;
    }
  }, {
    key: 'setToOffset',
    value: function setToOffset(offset) {
      this.toOffset = offset;
    }
  }, {
    key: 'clearOffsets',
    value: function clearOffsets() {
      this.fromOffset = 0;
      this.toOffset = 0;
    }
  }, {
    key: 'getAlignmentVector',
    value: function getAlignmentVector(alignmentId) {
      if (this.graphEdge.getFromAlignmentId() === alignmentId) {
        return this.graphEdge.fromVector;
      }
      if (this.graphEdge.getToAlignmentId() === alignmentId) {
        return this.graphEdge.toVector;
      }
      return null;
    }
  }, {
    key: 'offsetAlignment',
    value: function offsetAlignment(alignmentId, offset) {
      if (this.graphEdge.getFromAlignmentId() === alignmentId) {
        this.setFromOffset((0, _util.isOutwardVector)(this.graphEdge.fromVector) ? offset : -offset);
      }
      if (this.graphEdge.getToAlignmentId() === alignmentId) {
        this.setToOffset((0, _util.isOutwardVector)(this.graphEdge.toVector) ? offset : -offset);
      }
    }
  }, {
    key: 'setFocused',
    value: function setFocused(focused) {
      this.focused = focused;
    }
  }, {
    key: 'refreshRenderData',
    value: function refreshRenderData(display) {
      var _this = this;

      if (this.graphEdge.fromVertex.x === this.graphEdge.toVertex.x && this.graphEdge.fromVertex.y === this.graphEdge.toVertex.y) {
        this.renderData = [];
        return;
      }

      this.lineWidth = this.computeLineWidth(display, true);

      var fromOffsetPx = this.fromOffset * this.lineWidth;
      var toOffsetPx = this.toOffset * this.lineWidth;

      if (this.useGeographicRendering && this.graphEdge.geomCoords) {
        this.renderData = this.graphEdge.getGeometricCoords(fromOffsetPx, toOffsetPx, display, this.forward);
      } else {
        this.renderData = this.graphEdge.getRenderCoords(fromOffsetPx, toOffsetPx, display, this.forward);
      }

      var firstRenderPoint = this.renderData[0];
      var lastRenderPoint = this.renderData[this.renderData.length - 1];

      var pt;
      if (!this.graphEdge.fromVertex.isInternal) {
        pt = this.forward ? firstRenderPoint : lastRenderPoint;
        if (pt) {
          this.graphEdge.fromVertex.point.addRenderData({
            x: pt.x,
            y: pt.y,
            rEdge: this
          });
        }
      }

      pt = this.forward ? lastRenderPoint : firstRenderPoint;
      if (pt) {
        this.graphEdge.toVertex.point.addRenderData({
          x: pt.x,
          y: pt.y,
          rEdge: this
        });
      }

      (0, _lodash.forEach)(this.graphEdge.pointArray, function (point, i) {
        if (point.getType() === 'TURN') return;
        var t = (i + 1) / (_this.graphEdge.pointArray.length + 1);
        var coord = _this.graphEdge.coordAlongEdge(_this.forward ? t : 1 - t, _this.renderData, display);
        if (coord) {
          point.addRenderData({
            x: coord.x,
            y: coord.y,
            rEdge: _this
          });
        }
      });
    }
  }, {
    key: 'computeLineWidth',
    value: function computeLineWidth(display, includeEnvelope) {
      var styler = display.styler;
      if (styler && display) {
        // compute the line width
        var env = styler.compute(styler.segments.envelope, display, this);
        if (env && includeEnvelope) {
          return parseFloat(env.substring(0, env.length - 2), 10) - 2;
        } else {
          var lw = styler.compute(styler.segments['stroke-width'], display, this);
          return parseFloat(lw.substring(0, lw.length - 2), 10) - 2;
        }
      }
    }
  }, {
    key: 'isFocused',
    value: function isFocused() {
      return this.focused === true;
    }
  }, {
    key: 'getZIndex',
    value: function getZIndex() {
      return 10000;
    }

    /**
     *  Computes the point of intersection between two adjacent, offset RenderedEdges (the
     *  edge the function is called on and a second egde passed as a parameter)
     *  by "extending" the adjacent edges and finding the point of intersection. If
     *  such a point exists, the existing renderData arrays for the edges are
     *  adjusted accordingly, as are any associated stops.
     */

  }, {
    key: 'intersect',
    value: function intersect(rEdge) {
      // do no intersect adjacent edges of unequal bundle size
      if (this.graphEdge.renderedEdges.length !== rEdge.graphEdge.renderedEdges.length) return;

      var commonVertex = this.graphEdge.commonVertex(rEdge.graphEdge);
      if (!commonVertex || commonVertex.point.isSegmentEndPoint) return;

      var thisCheck = commonVertex === this.graphEdge.fromVertex && this.forward || commonVertex === this.graphEdge.toVertex && !this.forward;
      var otherCheck = commonVertex === rEdge.graphEdge.fromVertex && rEdge.forward || commonVertex === rEdge.graphEdge.toVertex && !rEdge.forward;

      var p1 = thisCheck ? this.renderData[0] : this.renderData[this.renderData.length - 1];
      var v1 = this.graphEdge.getVector(commonVertex);

      var p2 = otherCheck ? rEdge.renderData[0] : rEdge.renderData[rEdge.renderData.length - 1];
      var v2 = rEdge.graphEdge.getVector(commonVertex);

      if (!p1 || !p2 || !v1 || !v2 || p1.x === p2.x && p1.y === p2.y) return;

      var isect = (0, _util.lineIntersection)(p1.x, p1.y, p1.x + v1.x, p1.y - v1.y, p2.x, p2.y, p2.x + v2.x, p2.y - v2.y);

      if (!isect.intersect) return;

      // adjust the endpoint of the first edge
      if (thisCheck) {
        this.renderData[0].x = isect.x;
        this.renderData[0].y = isect.y;
      } else {
        this.renderData[this.renderData.length - 1].x = isect.x;
        this.renderData[this.renderData.length - 1].y = isect.y;
      }

      // adjust the endpoint of the second edge
      if (otherCheck) {
        rEdge.renderData[0].x = isect.x;
        rEdge.renderData[0].y = isect.y;
      } else {
        rEdge.renderData[rEdge.renderData.length - 1].x = isect.x;
        rEdge.renderData[rEdge.renderData.length - 1].y = isect.y;
      }

      // update the point renderData
      commonVertex.point.addRenderData({
        x: isect.x,
        y: isect.y,
        rEdge: this
      });
    }
  }, {
    key: 'findExtension',
    value: function findExtension(vertex) {
      var incidentEdges = vertex.incidentEdges(this.graphEdge);
      var bundlerId = this.patternIds || this.pathSegmentIds;
      for (var e = 0; e < incidentEdges.length; e++) {
        var edgeSegments = incidentEdges[e].renderedEdges;
        for (var s = 0; s < edgeSegments.length; s++) {
          var segment = edgeSegments[s];
          var otherId = segment.patternIds || segment.pathSegmentIds;
          if (bundlerId === otherId) {
            return segment;
          }
        }
      }
    }
  }, {
    key: 'toString',
    value: function toString() {
      return 'RenderedEdge ' + this.id + ' type=' + this.type + ' on ' + this.graphEdge.toString() + ' w/ patterns ' + this.patternIds + ' fwd=' + this.forward;
    }
  }]);
  return RenderedEdge;
}();

/**
 * Helper method to construct a merged ID string from a list of items with
 * their own IDs
 */

exports.default = RenderedEdge;
function constuctIdListString(items) {
  var idArr = [];
  (0, _lodash.forEach)(items, function (item) {
    idArr.push(item.getId());
  });
  idArr.sort();
  return idArr.join(',');
}
module.exports = exports['default'];

//# sourceMappingURL=renderededge.js