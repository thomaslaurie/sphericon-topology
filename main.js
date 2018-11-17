//L	https://www.sitepoint.com/dom-manipulation-vanilla-javascript-no-jquery/


// constants
const width = 2000;
const height = 2000;

const pointRadius = 3;

const ns = 'http://www.w3.org/2000/svg'; // svg namespace

// util
const phi = 0.61803398875;
function wrap(n, l) {
    if (n < 0) {
        n = n % l + l;
    } else if (n >= l) {
        n = n % l;
    }

    n = n === l ? 0 : n;
    return n;
}

function setAttributes(element, attributes) {
    for(let key in attributes) {
        element.setAttribute(key, attributes[key]);
    }
}
function setAttributesNS(namespace, element, attributes) {
    for(let key in attributes) {
        element.setAttributeNS(namespace, key, attributes[key]);
    }
}

function createPoint({x, y}, s) {
    let c = document.createElementNS(ns, 'circle');
    setAttributesNS(null, c, {
        // attributes inherit namespace of tag, but themselves don't have namespaces (prefixes), therefore namespace is null
        cx: x,
        cy: y,
        r: pointRadius,
        class: s,
    });
    svg.appendChild(c);
}
function rotatePoint({x, y}, a) {
    return {
        x: Math.cos(a) * x - Math.sin(a) * y,
        y: Math.sin(a) * x + Math.cos(a) * y,
    };
}
function createLine([p1, p2], s) {
    let c = document.createElementNS(ns, 'line');
    setAttributesNS(null, c, {
        x1: p1.x,
        y1: p1.y,
        x2: p2.x,
        y2: p2.y,
        class: s,
    });
    svg.appendChild(c);

    return [p1, p2];
}
function createPoly(n, center, radius) {
    let poly = {
        center: center,
        verts: [],
        radius: null,
        rotation: null,
        originalLines: [],
        rotatedLines: [],
        paths: [],
    };

    for (let i = 0; i < n; i++) {
        // angle = (full circle / number of verts) * index
        let angle = 2 * Math.PI / n * i;
        // starting from top of circle
        let point = {x: 0, y: 0 - radius};
        // rotate
        point = rotatePoint(point, angle);
        // translate to center
        point.x += poly.center.x;
        point.y += poly.center.y;

        poly.verts[i] = point;
        //createPoint(point, 'point');
    }

    return poly;
}


function createText(text, {x, y}, s) {
    let t = document.createElementNS(ns, 'text');
    setAttributesNS(null, t, {
        x: x,
        y: y,
        class: s,
    });
    t.innerHTML = text;
    svg.appendChild(t);
    t.appendChild(document.createTextNode(text));
}




// svg
let svg = document.createElementNS(ns, 'svg'); // svg requires a namespace via createElementNS(ns, ...)
document.body.appendChild(svg);

// polys
function createPolyGroups(groups, polyRadius, polySpace) {
    // normalize to 1 unit for multiplication later
    let total = groups * polyRadius * 2 + (groups + 1) * polySpace;
    polyRadius = polyRadius / total;
    polySpace = polySpace / total;

    let polyGroups = [];
    for (let i = 0; i < groups; i++) {
        // structure
        let polyGroup = [];
        polyGroups[i] = polyGroup;
    
        // number of perimeter points
        let n = 2*(i+2);
        // number of unique rotations
        let uniqueRotations = Math.ceil(n / 4);
    
        // rotation variants
        for (let rotation = 1; rotation <= uniqueRotations; rotation++) { 
            // center coordinates
            let center = { 
                x: polySpace + polyRadius + i * (polySpace + 2 * polyRadius),
                y: polySpace + polyRadius + (rotation-1) * (polySpace + 2 * polyRadius),
            };
    
            // create poly
            let poly = createPoly(n, center, polyRadius);
            poly.radius = polyRadius;
            poly.rotation = rotation;
            polyGroup[rotation-1] = poly;            
    
            // create lines
            // rotated
            for (let j = 0; j < n/2; j++) {
                let j1 = j + rotation;
                let j2 = n-1 - j + rotation;
    
                // ensure that indexes are still in bounds
                j1 = wrap(j1, n);
                j2 = wrap(j2, n);
    
                poly.rotatedLines[j] = [poly.verts[j1], poly.verts[j2]];
                //poly.rotatedLines[j] = createLine([poly.verts[j1], poly.verts[j2]], 'lineB');
            }
    
            // originals, these are essentially rotation = 0
            for (let j = 0; j < n/2; j++) {
                let j1 = j;
                let j2 = poly.verts.length-1 - j; // reflected index
    
                // ensure that indexes are still in bounds
                j1 = wrap(j1, n);
                j2 = wrap(j2, n);
    
                poly.originalLines[j] = [poly.verts[j1], poly.verts[j2]];
                //poly.originalLines[j] = createLine([poly.verts[j1], poly.verts[j2]], 'lineA');
            }

            // assign paths
            poly.paths = countPaths(poly);
        }
    }

    return polyGroups;
}
let polyGroups = createPolyGroups(12, 50, 20);


// paths
function pathFind(poly, startingIndex) {
    function findNext([line, point]) {
        let foundLine;
        let foundPoint;
    
        // if currently on an original line
        if (poly.originalLines.includes(line)) {
            // loop through all rotated lines
            poly.rotatedLines.forEach(nextLine => {
                // and their points
                nextLine.forEach((nextPoint, i) => {
                    // and find the desired point
                    if (nextPoint === point) {
                        // then grab the other point
                        let io = wrap(i+1, nextLine.length);
                        foundPoint = nextLine[io];
                        foundLine = nextLine;
                    }
                });
            });
        // if currently on a rotated line
        } else if (poly.rotatedLines.includes(line)) {
            // loop through all original lines
            poly.originalLines.forEach(nextLine => {
                // and their points
                nextLine.forEach((nextPoint, i) => {
                    // and find the desired point
                    if (nextPoint === point) {
                        // then grab the other point
                        let io = wrap(i+1, nextLine.length);
                        foundPoint = nextLine[io];
                        foundLine = nextLine;
                    }
                });
            });
        } else {
            console.error('line isnt in either array');
        }
    
        if (foundPoint !== undefined) {
            return [foundLine, foundPoint];
        } else {
            console.error('couldnt find next point, found is:', foundPoint);
            return [startingLine, startingPoint];
        }
    }

    let startingLine = poly.originalLines[startingIndex];
    let startingPoint = startingLine[0];

    let currentLine;
    let currentPoint;

    let visitedLines = [];
    let visitedPoints = [];

    visitedLines.push(startingLine);
    visitedPoints.push(startingPoint);
    [currentLine, currentPoint] = findNext([startingLine, startingPoint]);

    while(currentPoint !== startingPoint) {
        visitedLines.push(currentLine);
        visitedPoints.push(currentPoint);
        [currentLine, currentPoint] = findNext([currentLine, currentPoint]);
    }

    return [visitedLines, visitedPoints];
}
function countPaths(poly) {
    let visitedLines = [];
    let visitedPoints = [];
    let paths = [];

    let startingIndex = 0;
    while(visitedPoints.length < poly.verts.length) {

        //! paths should either be unique or identical, no overlaps - therefore simply checking if any of the points in the new path have already been visited should suffice

        // get the path using the startingIndex
        let [lines, points] = pathFind(poly, startingIndex);
        let found = false;

        // for each point in this path
        for(let i = 0; i < points.length; i++) {
            // see if it has already been visited
            for (let j = 0; j < visitedPoints.length; j++) {
                if (points[i] === visitedPoints[j]) {
                    found = true;
                    break;
                }
            }
            if (found) break;
        }

        // if they haven't been visited
        if (!found) {
            // add them
            lines.forEach(line => {
                visitedLines.push(line);
            });
            points.forEach(point => {
                visitedPoints.push(point);
            });
            
            // also add individual paths
            paths.push({
                lines: lines,
                points: points,
            });
        }
        
        startingIndex++;
    }

    return paths;
}


// draw
polyGroups.forEach(polyGroup => {
    polyGroup.forEach(poly => {
        // draw numbers
        //poly.verts.length
        //poly.rotation
        //poly.paths.length

        //var text = document.createElementNS(ns, 'text');

        let t = document.createElementNS(ns, 'text');
        setAttributesNS(null, t, {
            x: `${(poly.center.x - poly.radius) * 100}%`,
            y: `${(poly.center.y - poly.radius) * 100}%`,
            class: 'labels',
        });
        t.innerHTML = `${poly.verts.length}-${poly.rotation}`;
        svg.appendChild(t);

        let t2 = document.createElementNS(ns, 'text');
        setAttributesNS(null, t2, {
            x: `${(poly.center.x - poly.radius) * 100}%`,
            y: `${(poly.center.y - (poly.radius * 0.7)) * 100}%`,
            class: 'labels',
        });
        t2.innerHTML = `${poly.paths.length}`;
        svg.appendChild(t2);

        // draw verts
        poly.verts.forEach(point => {
            let c = document.createElementNS(ns, 'circle');
            setAttributesNS(null, c, {
                cx: `${point.x * 100}%`,
                cy: `${point.y * 100}%`,
                r: pointRadius,
                class: 'point',
            });
            svg.appendChild(c);
        });

        // draw paths
        poly.paths.forEach((path, i) => {
            path.lines.forEach(line => {
                let l = document.createElementNS(ns, 'line');
                setAttributesNS(null, l, {
                    x1: `${line[0].x * 100}%`,
                    y1: `${line[0].y * 100}%`,
                    x2: `${line[1].x * 100}%`,
                    y2: `${line[1].y * 100}%`,
                    style: `stroke: hsl(${wrap(i * phi * 360, 360)}, 100%, 50%);
                            stroke-width: 2;`,
                });
                svg.appendChild(l);
            });
        });
    })
});