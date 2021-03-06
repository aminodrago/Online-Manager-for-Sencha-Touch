Ext.define("Ext.draw.path.Path", {
    requires: ['Ext.draw.Draw'],
    pathRe: /,?([achlmqrstvxz]),?/gi,
    pathSplitRe: /\s|,/g,
    svgString: '',
    /**
     * Create a path from pathString
     * @constructor
     * @param pathString
     */
    constructor: function (pathString) {
        this.coords = [];
        this.types = [];
        this.cursor = null;
        this.startX = 0;
        this.startY = 0;
        if (pathString) {
            this.fromSvgString(pathString);
        }
    },

    /**
     * Clear path
     */
    clear: function () {
        this.coords.length = 0;
        this.types.length = 0;
        this.cursor = null;
        this.startX = 0;
        this.startY = 0;
        this.svgString = '';
    },

    dirt: function () {
        this.svgString = '';
    },

    moveTo: function (x, y) {
        if (!this.cursor) {
            this.cursor = [x, y];
        }
        this.coords.push(x, y);
        this.types.push('M');
        this.startX = x;
        this.startY = y;
        this.cursor[0] = x;
        this.cursor[1] = y;
        this.dirt();

    },

    lineTo: function (x, y) {
        if (!this.cursor) {
            this.cursor = [x, y];
            this.coords.push(x, y);
            this.types.push('M');
        } else {
            this.coords.push(x, y);
            this.types.push('L');
        }
        this.cursor[0] = x;
        this.cursor[1] = y;
        this.dirt();
    },

    bezierCurveTo: function (cx1, cy1, cx2, cy2, x, y) {
        if (!this.cursor) {
            this.moveTo(cx1, cy1);
        }
        this.coords.push(cx1, cy1, cx2, cy2, x, y);
        this.types.push('C');
        this.cursor[0] = x;
        this.cursor[1] = y;
        this.dirt();
    },

    quadraticCurveTo: function (cx, cy, x, y) {
        if (!this.cursor) {
            this.moveTo(cx, cy);
        }
        this.bezierCurveTo(
            (this.cursor[0] * 2 + cx) / 3, (this.cursor[1] * 2 + cy) / 3,
            (x * 2 + cx) / 3, (y * 2 + cy) / 3,
            x, y
        );
    },

    closePath: function () {
        if (this.cursor) {
            this.types.push('Z');
            this.dirt();
        }
    },

    arcTo: function (x1, y1, x2, y2, rx, ry, rotation) {
        if (ry === undefined) {
            ry = rx;
        }

        if (rotation === undefined) {
            rotation = 0;
        }

        if (!this.cursor) {
            this.moveTo(x1, y1);
            return;
        }

        if (rx === 0 || ry === 0) {
            this.lineTo(x1, y1);
            return;
        }

        x2 -= x1;
        y2 -= y1;

        var x0 = this.cursor[0] - x1,
            y0 = this.cursor[1] - y1,
            area = x2 * y0 - y2 * x0,
            cos, sin, xx, yx, xy, yy,
            l0 = Math.sqrt(x0 * x0 + y0 * y0),
            l2 = Math.sqrt(x2 * x2 + y2 * y2),
            dist, cx, cy;
        // cos rx, -sin ry , x1 - cos rx x1 + ry sin y1 
        // sin rx, cos ry, -rx sin x1 + y1 - cos ry y1
        if (area === 0) {
            this.lineTo(x1, y1);
            return;
        }


        if (ry !== rx) {
            cos = Math.cos(rotation);
            sin = Math.sin(rotation);
            xx = cos / rx;
            yx = sin / ry;
            xy = -sin / rx;
            yy = cos / ry;
            var temp = xx * x0 + yx * y0;
            y0 = xy * x0 + yy * y0;
            x0 = temp;
            temp = xx * x2 + yx * y2;
            y2 = xy * x2 + yy * y2;
            x2 = temp;
        } else {
            x0 /= rx;
            y0 /= ry;
            x2 /= rx;
            y2 /= ry;
        }

        cx = x0 * l2 + x2 * l0;
        cy = y0 * l2 + y2 * l0;
        dist = 1 / (Math.sin(Math.asin(Math.abs(area) / (l0 * l2)) * 0.5) * Math.sqrt(cx * cx + cy * cy));
        cx *= dist;
        cy *= dist;

        var k0 = (cx * x0 + cy * y0) / (x0 * x0 + y0 * y0),
            k2 = (cx * x2 + cy * y2) / (x2 * x2 + y2 * y2);
        var cosStart = x0 * k0 - cx,
            sinStart = y0 * k0 - cy,
            cosEnd = x2 * k2 - cx,
            sinEnd = y2 * k2 - cy,
            startAngle = Math.atan2(sinStart, cosStart),
            endAngle = Math.atan2(sinEnd, cosEnd);
        if (area > 0) {
            if (endAngle < startAngle) {
                endAngle += Math.PI * 2;
            }
        } else {
            if (startAngle < endAngle) {
                startAngle += Math.PI * 2;
            }
        }
        if (ry !== rx) {
            cx = cos * cx * rx - sin * cy * ry + x1;
            cy = sin * cy * ry + cos * cy * ry + y1;
            this.lineTo(cos * rx * cosStart - sin * ry * sinStart + cx,
                sin * rx * cosStart + cos * ry * sinStart + cy);
            this.ellipse(cx, cy, rx, ry, rotation, startAngle, endAngle, area < 0);
        } else {
            cx = cx * rx + x1;
            cy = cy * ry + y1;
            this.lineTo(rx * cosStart + cx, ry * sinStart + cy);
            this.ellipse(cx, cy, rx, ry, rotation, startAngle, endAngle, area < 0);
        }
    },

    ellipse: function (cx, cy, radiusX, radiusY, rotation, startAngle, endAngle, anticlockwise) {
        var coords = this.coords,
            start = coords.length, count,
            i, j;
        if (endAngle - startAngle >= Math.PI * 2) {
            this.ellipse(cx, cy, radiusX, radiusY, rotation, startAngle, startAngle + Math.PI, anticlockwise);
            this.ellipse(cx, cy, radiusX, radiusY, rotation, startAngle + Math.PI, endAngle, anticlockwise);
            return;
        }
        if (!anticlockwise) {
            if (endAngle < startAngle) {
                endAngle += Math.PI * 2;
            }
            count = this.approximateArc(coords, cx, cy, radiusX, radiusY, rotation, startAngle, endAngle);
        } else {
            if (startAngle < endAngle) {
                startAngle += Math.PI * 2;
            }
            count = this.approximateArc(coords, cx, cy, radiusX, radiusY, rotation, endAngle, startAngle);
            for (i = start, j = coords.length - 2; i < j; i += 2, j -= 2) {
                var temp = coords[i];
                coords[i] = coords[j];
                coords[j] = temp;
                temp = coords[i + 1];
                coords[i + 1] = coords[j + 1];
                coords[j + 1] = temp;
            }
        }

        if (!this.cursor) {
            this.cursor = [coords[coords.length - 2], coords[coords.length - 1]];
            this.types.push('M');
        } else {
            this.cursor[0] = coords[coords.length - 2];
            this.cursor[1] = coords[coords.length - 1];
            this.types.push('L');
        }

        for (i = 2; i < count; i += 6) {
            this.types.push('C');
        }
        this.dirt();
    },

    arc: function (x, y, radius, startAngle, endAngle, anticlockwise) {
        return this.ellipse(x, y, radius, radius, 0, startAngle, endAngle, anticlockwise);
    },

    rect: function (x, y, width, height) {
        this.moveTo(x, y);
        this.lineTo(x + width, y);
        this.lineTo(x + width, y + height);
        this.lineTo(x, y + height);
        this.closePath();
    },

    approximateArcKernel: function (result, x1, y1, x2, y2, cx, cy, rx, ry, cosPhi, sinPhi, theta1, theta2, cosTheta1, sinTheta1, cosTheta2, sinTheta2) {
        if (theta2 - theta1 < Math.PI / 2) {
            var diff = theta2 - theta1,
                alpha = (0.3294738052815987 + 0.012120855841304373 * diff) * diff,
            // with 0.6% average error with 1/3 Sin[a] (-1 + Sqrt[4 + 3 Tan[a/2]^2])
                xp1 = -cosPhi * rx * sinTheta1 - sinPhi * ry * cosTheta1,
                yp1 = -sinPhi * rx * sinTheta1 + cosPhi * ry * cosTheta1,
                xp2 = -cosPhi * rx * sinTheta2 - sinPhi * ry * cosTheta2,
                yp2 = -sinPhi * rx * sinTheta2 + cosPhi * ry * cosTheta2;
            result.push(x1 + alpha * xp1, y1 + alpha * yp1, x2 - alpha * xp2, y2 - alpha * yp2, x2, y2);
            return 6;
        }
        var thetaMid = (theta1 + theta2) / 2,
            cosTheta = Math.cos(thetaMid),
            sinTheta = Math.sin(thetaMid),
            x = cx + cosPhi * rx * cosTheta - sinPhi * ry * sinTheta,
            y = cy + sinPhi * rx * cosTheta + cosPhi * ry * sinTheta;
        return this.approximateArcKernel(result, x1, y1, x, y, cx, cy, rx, ry, cosPhi, sinPhi, theta1, thetaMid, cosTheta1, sinTheta1, cosTheta, sinTheta) +
            this.approximateArcKernel(result, x, y, x2, y2, cx, cy, rx, ry, cosPhi, sinPhi, thetaMid, theta2, cosTheta, sinTheta, cosTheta2, sinTheta2);
    },

    approximateArcBySubdivide: function (result, cx, cy, rx, ry, phi, theta1, theta2) {
        while (theta2 < theta1) {
            theta2 += Math.PI * 2;
        }
        var cosPhi = Math.cos(phi),
            sinPhi = Math.sin(phi),
            cosTheta1 = Math.cos(theta1),
            sinTheta1 = Math.sin(theta1),
            cosTheta2 = Math.cos(theta2),
            sinTheta2 = Math.sin(theta2),
            x1 = cx + cosPhi * rx * cosTheta1 - sinPhi * ry * sinTheta1,
            y1 = cy + sinPhi * rx * cosTheta1 + cosPhi * ry * sinTheta1;
        result.push(x1, y1);
        return 2 + this.approximateArcKernel(
            result,
            x1, y1,
            cx + cosPhi * rx * cosTheta2 - sinPhi * ry * sinTheta2,
            cy + sinPhi * rx * cosTheta2 + cosPhi * ry * sinTheta2,
            cx, cy, rx, ry,
            cosPhi, sinPhi, theta1, theta2,
            cosTheta1, sinTheta1,
            cosTheta2, sinTheta2
        );
    },

    /**
     * @private
     * @param result
     * @param cx
     * @param cy
     * @param rx
     * @param ry
     * @param phi
     * @param theta1
     * @param theta2
     * @return {Number}
     */
    approximateArc: function (result, cx, cy, rx, ry, phi, theta1, theta2) {
        var cosPhi = Math.cos(phi),
            sinPhi = Math.sin(phi),
            cosTheta1 = Math.cos(theta1),
            sinTheta1 = Math.sin(theta1),
            xx = cosPhi * cosTheta1 * rx - sinPhi * sinTheta1 * ry,
            yx = -cosPhi * sinTheta1 * rx - sinPhi * cosTheta1 * ry,
            xy = sinPhi * cosTheta1 * rx + cosPhi * sinTheta1 * ry,
            yy = -sinPhi * sinTheta1 * rx + cosPhi * cosTheta1 * ry,
            rect = Math.PI / 2,
            count = 2,
            exx = xx,
            eyx = yx,
            exy = xy,
            eyy = yy,
            rho = 0.547443256150549,
            temp, y1, x3, y3, x2, y2;

        theta2 -= theta1;
        if (theta2 < 0) {
            theta2 += Math.PI * 2;
        }
        result.push(xx + cx, xy + cy);
        while (theta2 >= rect) {
            result.push(
                exx + eyx * rho + cx, exy + eyy * rho + cy,
                exx * rho + eyx + cx, exy * rho + eyy + cy,
                eyx + cx, eyy + cy
            );
            count += 6;
            theta2 -= rect;
            temp = exx;
            exx = eyx;
            eyx = -temp;
            temp = exy;
            exy = eyy;
            eyy = -temp;
        }
        if (theta2) {
            y1 = (0.3294738052815987 + 0.012120855841304373 * theta2) * theta2;
            x3 = Math.cos(theta2);
            y3 = Math.sin(theta2);
            x2 = x3 + y1 * y3;
            y2 = y3 - y1 * x3;
            result.push(
                exx + eyx * y1 + cx, exy + eyy * y1 + cy,
                exx * x2 + eyx * y2 + cx, exy * x2 + eyy * y2 + cy,
                exx * x3 + eyx * y3 + cx, exy * x3 + eyy * y3 + cy
            );
            count += 6;
        }
        return count;
    },

    /**
     * http://www.w3.org/TR/SVG/implnote.html#ArcImplementationNotes
     * @param rx
     * @param ry
     * @param rotation Differ from svg spec, this is radian.
     * @param fA
     * @param fS
     * @param x2
     * @param y2
     */
    arcSvg: function (rx, ry, rotation, fA, fS, x2, y2) {
        if (rx < 0) {
            rx = -rx;
        }
        if (ry < 0) {
            ry = -ry;
        }
        var x1 = this.cursor[0],
            y1 = this.cursor[1],
            hdx = (x1 - x2) / 2,
            hdy = (y1 - y2) / 2,
            cosPhi = Math.cos(rotation),
            sinPhi = Math.sin(rotation),
            xp = hdx * cosPhi + hdy * sinPhi,
            yp = -hdx * sinPhi + hdy * cosPhi,
            ratX = xp / rx,
            ratY = yp / ry,
            lambda = ratX * ratX + ratY * ratY,
            cx = (x1 + x2) * 0.5, cy = (y1 + y2) * 0.5,
            cpx = 0, cpy = 0;
        if (lambda >= 1) {
            lambda = Math.sqrt(lambda);
            rx *= lambda;
            ry *= lambda;
            // this gives lambda == cpx == cpy == 0;
        } else {
            lambda = Math.sqrt(1 / lambda - 1);
            if (fA === fS) {
                lambda = -lambda;
            }
            cpx = lambda * rx * ratY;
            cpy = -lambda * ry * ratX;
            cx += cosPhi * cpx - sinPhi * cpy;
            cy += sinPhi * cpx + cosPhi * cpy;
        }


        var theta1 = Math.atan2((yp - cpy) / ry, (xp - cpx) / rx),
            deltaTheta = Math.atan2((-yp - cpy) / ry, (-xp - cpx) / rx) - theta1;

        if (fS) {
            if (deltaTheta <= 0) {
                deltaTheta += Math.PI * 2;
            }
        } else {
            if (deltaTheta >= 0) {
                deltaTheta -= Math.PI * 2;
            }
        }
        this.ellipse(cx, cy, rx, ry, rotation, theta1, theta1 + deltaTheta, 1 - fS);
    },

    fromSvgString: function (pathString) {
        if (!pathString) {
            return null;
        }
        var parts,
            paramCounts = {
                a: 7, c: 6, h: 1, l: 2, m: 2, q: 4, s: 4, t: 2, v: 1, z: 0,
                A: 7, C: 6, H: 1, L: 2, M: 2, Q: 4, S: 4, T: 2, V: 1, Z: 0
            },
            lastCommand,
            qx, qy,
            cx = 0, cy = 0,
            part = false, i, partLength, relative;
        if (Ext.isString(pathString)) {
            parts = pathString.replace(Ext.draw.Draw.pathRe, " $1 ").split(Ext.draw.Draw.pathSplitRe);
        } else if (Ext.isArray(pathString)) {
            pathString = pathString.join(',');
            parts = pathString.replace(Ext.draw.Draw.pathRe, " $1 ").split(Ext.draw.Draw.pathSplitRe);
        }

        this.clear();
        for (i = 0, partLength = 0; i < parts.length; i++) {
            if (parts[i] !== '') {
                parts[partLength++] = parts[i];
            }
        }
        parts.length = partLength;
        for (i = 0; i < parts.length;) {
            lastCommand = part;
            part = parts[i];
            relative = (part.toUpperCase() !== part);
            i++;
            switch (part) {
                case 'M':
                    this.moveTo(cx = +parts[i], cy = +parts[i + 1]);
                    i += 2;
                    while (i < partLength && !paramCounts.hasOwnProperty(parts[i])) {
                        this.lineTo(cx = +parts[i], cy = +parts[i + 1]);
                        i += 2;
                    }
                    break;
                case 'L':
                    this.lineTo(cx = +parts[i], cy = +parts[i + 1]);
                    i += 2;
                    while (i < partLength && !paramCounts.hasOwnProperty(parts[i])) {
                        this.lineTo(cx = +parts[i], cy = +parts[i + 1]);
                        i += 2;
                    }
                    break;
                case 'A':
                    while (i < partLength && !paramCounts.hasOwnProperty(parts[i])) {
                        this.arcSvg(
                            +parts[i], +parts[i + 1],
                            +parts[i + 2] * Math.PI / 180,
                            +parts[i + 3], +parts[i + 4],
                            cx = +parts[i + 5], cy = +parts[i + 6]);
                        i += 7;
                    }
                    break;
                case 'C':
                    while (i < partLength && !paramCounts.hasOwnProperty(parts[i])) {
                        this.bezierCurveTo(
                            +parts[i ], +parts[i + 1],
                            qx = +parts[i + 2], qy = +parts[i + 3],
                            cx = +parts[i + 4], cy = +parts[i + 5]);
                        i += 6;
                    }
                    break;
                case 'Z':
                    this.closePath();
                    break;
                case 'm':
                    this.moveTo(cx += +parts[i], cy += +parts[i + 1]);
                    i += 2;
                    while (i < partLength && !paramCounts.hasOwnProperty(parts[i])) {
                        this.lineTo(cx += +parts[i], cy += +parts[i + 1]);
                        i += 2;
                    }
                    break;
                case 'l':
                    this.lineTo(cx += +parts[i], cy += +parts[i + 1]);
                    i += 2;
                    while (i < partLength && !paramCounts.hasOwnProperty(parts[i])) {
                        this.lineTo(cx += +parts[i], cy += +parts[i + 1]);
                        i += 2;
                    }
                    break;
                case 'a':
                    while (i < partLength && !paramCounts.hasOwnProperty(parts[i])) {
                        this.arcSvg(
                            +parts[i], +parts[i + 1],
                            +parts[i + 2] * Math.PI / 180,
                            +parts[i + 3], +parts[i + 4],
                            cx += +parts[i + 5], cy += +parts[i + 6]);
                        i += 7;
                    }
                    break;
                case 'c':
                    while (i < partLength && !paramCounts.hasOwnProperty(parts[i])) {
                        this.bezierCurveTo(
                            cx + parts[i ], cy + parts[i + 1],
                            qx = cx + parts[i + 2], qy = cy + parts[i + 3],
                            cx += +parts[i + 4], cy += +parts[i + 5]);
                        i += 6;
                    }
                    break;
                case 'z':
                    this.closePath();
                    break;
                case 's':
                    if (!(lastCommand === 'c' || lastCommand === 'C' || lastCommand === 's' || lastCommand === 'S')) {
                        qx = cx;
                        qy = cy;
                    }
                    while (i < partLength && !paramCounts.hasOwnProperty(parts[i])) {
                        this.bezierCurveTo(
                            cx + cx - qx, cy + cy - qy,
                            qx = cx + parts[i], qy = cy + parts[i + 1],
                            cx += +parts[i + 2], cy += +parts[i + 3]);
                        i += 4;
                    }
                    break;
                case 'S':
                    if (!(lastCommand === 'c' || lastCommand === 'C' || lastCommand === 's' || lastCommand === 'S')) {
                        qx = cx;
                        qy = cy;
                    }
                    while (i < partLength && !paramCounts.hasOwnProperty(parts[i])) {
                        this.bezierCurveTo(
                            cx + cx - qx, cy + cy - qy,
                            qx = +parts[i], qy = +parts[i + 1],
                            cx + (+parts[i + 2]), cy + (+parts[i + 3]));
                        i += 4;
                    }
                    break;
                case 'q':
                    while (i < partLength && !paramCounts.hasOwnProperty(parts[i])) {
                        this.quadraticCurveTo(
                            qx = cx + parts[i], qy = cy + parts[i + 1],
                            cx += +parts[i + 2], cy += +parts[i + 3]);
                        i += 4;
                    }
                    break;
                case 'Q':
                    while (i < partLength && !paramCounts.hasOwnProperty(parts[i])) {
                        this.quadraticCurveTo(
                            qx = +parts[i], qy = +parts[i + 1],
                            cx = +parts[i + 2], cy = +parts[i + 3]);
                        i += 4;
                    }
                    break;
                case 't':
                    if (!(lastCommand === 'q' || lastCommand === 'Q' || lastCommand === 't' || lastCommand === 'T')) {
                        qx = cx;
                        qy = cy;
                    }
                    while (i < partLength && !paramCounts.hasOwnProperty(parts[i])) {
                        this.quadraticCurveTo(
                            qx = cx + cx - qx, qy = cy + cy - qy,
                            cx += +parts[i + 1], cy += +parts[i + 2]);
                        i += 2;
                    }
                    break;
                case 'T':
                    if (!(lastCommand === 'q' || lastCommand === 'Q' || lastCommand === 't' || lastCommand === 'T')) {
                        qx = cx;
                        qy = cy;
                    }
                    while (i < partLength && !paramCounts.hasOwnProperty(parts[i])) {
                        this.quadraticCurveTo(
                            qx = cx + cx - qx, qy = cy + cy - qy,
                            cx + (+parts[i + 1]), cy + (+parts[i + 2]));
                        i += 2;
                    }
                    break;
                case 'h':
                    while (i < partLength && !paramCounts.hasOwnProperty(parts[i])) {
                        this.lineTo(cx += +parts[i], cy);
                        i++;
                    }
                    break;
                case 'H':
                    while (i < partLength && !paramCounts.hasOwnProperty(parts[i])) {
                        this.lineTo(cx = +parts[i], cy);
                        i++;
                    }
                    break;
                case 'v':
                    while (i < partLength && !paramCounts.hasOwnProperty(parts[i])) {
                        this.lineTo(cx, cy += +parts[i]);
                        i++;
                    }
                    break;
                case 'V':
                    while (i < partLength && !paramCounts.hasOwnProperty(parts[i])) {
                        this.lineTo(cx, cy = +parts[i]);
                        i++;
                    }
                    break;
            }
        }
        this.dirt();
    },

    clone: function () {
        var path = new this.self();
        path.coords = this.coords.slice(0);
        path.types = this.types.slice(0);
        path.cursor = this.cursor.slice(0);
        path.startX = this.startX;
        path.startY = this.startY;
        path.svgString = this.svgString;
        return path;
    },

    transform: function (matrix) {
        if (matrix.isIdentity()) {
            return;
        }
        var xx = matrix.getXX(), yx = matrix.getYX(), dx = matrix.getDX(),
            xy = matrix.getXY(), yy = matrix.getYY(), dy = matrix.getDY(),
            i = 0, coords = this.coords, ln = coords.length,
            x, y;

        for (; i < ln; i += 2) {
            x = coords[i];
            y = coords[i + 1];
            coords[i] = x * xx + y * yx + dx;
            coords[i + 1] = x * xy + y * yy + dy;
        }
        this.dirt();
    },

    getDimension: function () {
        if (!this.types || !this.types.length) {
            return {x: 0, y: 0, width: 0, height: 0};
        }

        var rect = [Infinity, Infinity, -Infinity, -Infinity],
            i = 0, j = 0, types = this.types, coords = this.coords,
            ln = types.length, x, y;
        for (; i < ln; i++) {
            switch (types[i]) {
                case 'M':
                case 'L':
                    x = coords[j];
                    y = coords[j + 1];
                    if (rect[0] > x) {
                        rect[0] = x;
                    }
                    if (rect[1] > y) {
                        rect[1] = y;
                    }
                    if (rect[2] < x) {
                        rect[2] = x;
                    }
                    if (rect[3] < y) {
                        rect[3] = y;
                    }
                    j += 2;
                    break;
                case 'C':
                    this.expandDim(rect, x, y,
                        coords[j], coords[j + 1],
                        coords[j + 2], coords[j + 3],
                        x = coords[j + 4], y = coords[j + 5]);
                    j += 6;
                    break;
            }
        }
        return {
            x: rect[0],
            y: rect[1],
            width: rect[2] - rect[0],
            height: rect[3] - rect[1]
        };
    },

    getDimensionWithTransform: function (matrix) {
        if (!this.types || !this.types.length) {
            return {x: 0, y: 0, width: 0, height: 0};
        }

        var xx = matrix.getXX(), yx = matrix.getYX(), dx = matrix.getDX(),
            xy = matrix.getXY(), yy = matrix.getYY(), dy = matrix.getDY(),
            rect = [Infinity, Infinity, -Infinity, -Infinity],
            i = 0, j = 0, types = this.types, coords = this.coords,
            ln = types.length, x, y;
        for (; i < ln; i++) {
            switch (types[i]) {
                case 'M':
                case 'L':
                    x = coords[j] * xx + coords[j + 1] * yx + dx;
                    y = coords[j] * xy + coords[j + 1] * yy + dy;
                    if (rect[0] > x) {
                        rect[0] = x;
                    }
                    if (rect[1] > y) {
                        rect[1] = y;
                    }
                    if (rect[2] < x) {
                        rect[2] = x;
                    }
                    if (rect[3] < y) {
                        rect[3] = y;
                    }
                    j += 2;
                    break;
                case 'C':
                    this.expandDim(rect,
                        x, y,
                        coords[j] * xx + coords[j + 1] * yx + dx, coords[j] * xy + coords[j + 1] * yy + dy,
                        coords[j + 2] * xx + coords[j + 3] * yx + dx, coords[j + 2] * xy + coords[j + 3] * yy + dy,
                        x = coords[j + 4] * xx + coords[j + 5] * yx + dx, y = coords[j + 4] * xy + coords[j + 5] * yy + dy);
                    j += 6;
                    break;
            }
        }
        return {
            x: rect[0],
            y: rect[1],
            width: rect[2] - rect[0],
            height: rect[3] - rect[1]
        };
    },

    /**
     * @private
     * Expand the rect by a bezier curve.
     * @param rect
     * @param x1
     * @param y1
     */
    expandDim: function (rect, x1, y1, cx1, cy1, cx2, cy2, x2, y2) {
        var l = rect[0], r = rect[2], t = rect[1] , b = rect[3], dim;
        if (Math.min(x1, cx1, cx2, x2) < l ||
            Math.max(x1, cx1, cx2, x2) > r) {
            dim = this.curveDim(x1, cx1, cx2, x2);
            if (dim[0] < l) {
                rect[0] = dim[0];
            }
            if (dim[1] > r) {
                rect[2] = dim[1];
            }
        }

        if (Math.min(y1, cy1, cy2, y2) < t ||
            Math.max(y1, cy1, cy2, y2) > b
            ) {
            dim = this.curveDim(y1, cy1, cy2, y2);
            if (dim[0] < t) {
                rect[1] = dim[0];
            }
            if (dim[1] > b) {
                rect[3] = dim[1];
            }
        }
    },

    curveDim: function (a, b, c, d) {
        var qa = a - d - 3 * (b - c),
            qb = -2 * (a - 2 * b + c),
            qc = a - b, x, y,
            min = Math.min(a, d),
            max = Math.max(a, d), delta;
        if (qa === 0) {
            if (qb === 0) {
                return [min, max];
            } else {
                y = (d * (4 * b + d) - c * (3 * c + 2 * d)) / (4 * (b - 2 * c + d));
                min = Math.min(y);
                max = Math.max(y);
            }
        } else {
            delta = qb * qb - 4 * qa * qc;
            if (delta >= 0) {
                delta = Math.sqrt(delta);
                x = (qb + delta) / 2 / qa;
                y = this.interpolate(a, b, c, d, x);
                min = Math.min(y);
                max = Math.max(y);
                if (delta > 0) {
                    x -= delta / qa;
                    y = this.interpolate(a, b, c, d, x);
                    min = Math.min(y);
                    max = Math.max(y);
                }
            }
        }
        return [min, max];
    },

    interpolate: function (a, b, c, d, t) {
        if (t === 0) {
            return a;
        }
        if (t === 1) {
            return d;
        }
        var t1, rate;

        if (t < 0.5) {
            t1 = 1 - t;
            rate = t / t1;
            return t1 * t1 * t1 * (a + rate * (b + rate * (c + rate * d)));
        } else {
            rate = (1 - t) / t;
            return t * t * t * (d + rate * (c + rate * (b + rate * a)));
        }
    },

    fromStripes: function (stripes) {
        var me = this,
            i = 0, ln = stripes.length,
            j, ln2, stripe;
        me.clear();
        for (; i < ln; i++) {
            stripe = stripes[i];
            me.coords.push.apply(me.coords, stripe);
            me.types.push('M');
            for (j = 2, ln2 = stripe.length; j < ln2; j += 6) {
                me.types.push('C');
            }
        }
        me.cursor[0] = me.coords[me.coords.length - 2];
        me.cursor[1] = me.coords[me.coords.length - 1];
        me.dirt();
    },

    toStripes: function () {
        var stripes = [], curr,
            x, y, lastX, lastY, startX, startY,
            i, j,
            types = this.types,
            coords = this.coords,
            ln = types.length;
        for (i = 0, j = 0; i < ln; i++) {
            switch (types[i]) {
                case 'M':
                    curr = [startX = lastX = coords[j++], startY = lastY = coords[j++]];
                    stripes.push(curr);
                    break;
                case 'L':
                    x = coords[j++];
                    y = coords[j++];
                    curr.push((lastX + lastX + x) / 3, (lastY + lastY + y) / 3, (lastX + x + x) / 3, (lastY + y + y) / 3, lastX = x, lastY = y);
                    break;
                case 'C':
                    curr.push(coords[j++], coords[j++], coords[j++], coords[j++], lastX = coords[j++], lastY = coords[j++]);
                    break;
                case 'Z':
                    x = startX;
                    y = startY;
                    curr.push((lastX + lastX + x) / 3, (lastY + lastY + y) / 3, (lastX + x + x) / 3, (lastY + y + y) / 3, lastX = x, lastY = y);
                    break;
            }
        }
        return stripes;
    },

    refreshSvgString: function () {
        var result = [],
            types = this.types,
            coords = this.coords,
            ln = types.length,
            i = 0, j = 0;
        for (; i < ln; i++) {
            switch (types[i]) {
                case 'M':
                    result.push(' M ' + coords[j] + ',' + coords[j + 1]);
                    j += 2;
                    break;
                case 'L':
                    result.push(' L ' + coords[j] + ',' + coords[j + 1]);
                    j += 2;
                    break;
                case 'C':
                    result.push(' C ' + coords[j] + ',' + coords[j + 1] + ' ' +
                        coords[j + 2] + ',' + coords[j + 3] + ' ' +
                        coords[j + 4] + ',' + coords[j + 5]);
                    j += 6;
                    break;
                case 'Z':
                    result.push(' Z ');
                    break;
            }
        }
        this.svgString = result.join(',');
    },

    toString: function () {
        if (!this.svgString) {
            this.refreshSvgString();
        }
        return this.svgString;
    }
});