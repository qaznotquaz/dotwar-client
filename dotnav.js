const E = 1.6e7
const D = 1.12e7
let EDGE = 10000000000
let factor
let lastScan
let lastSummary

window.onload = function registerEventHandlersAndLoad() {
    let submit_btn = document.getElementById("submit_btn");
    submit_btn.addEventListener("click", handle_input);

    document.addEventListener('wheel', function(e){
        let zoomInc = E * 1000;

        if (e.ctrlKey) {

            zoomInc = E * 50;
        }

        let delta = (e.deltaY > 0) ? zoomInc : -zoomInc;
        EDGE = (EDGE + delta > 0) ? EDGE + delta : EDGE;

        redrawLastScan();
        redrawLastSummary();
        console.log(EDGE);
        e.preventDefault();
    }, {passive: false})
}

function handle_input(params) {
    let command = document.getElementById("command").value;
    handle(parse(command));
}

function drawScan(scan) {
    const origin = document.getElementById('origin');
    origin.innerHTML = '';

    factor = document.getElementById('navbox').clientWidth / EDGE
    document.querySelector(':root').style.setProperty('--E', `${E * factor}px`)
    document.querySelector(':root').style.setProperty('--D', `${D * factor}px`)

    draw_line([0, 0, 0], [EDGE, 0, 0], 'red 2px solid')
    draw_line([0, 0, 0], [0, EDGE, 0], 'green 2px solid')
    draw_line([0, 0, 0], [0, 0, EDGE], 'blue 2px solid')

    draw_line([0, 0, 0], [-EDGE, 0, 0], 'red 1px dashed')
    draw_line([0, 0, 0], [0, -EDGE, 0], 'green 1px dashed')
    draw_line([0, 0, 0], [0, 0, -EDGE], 'blue 1px dashed')


    JSON.parse(scan)['entities'].forEach(draw_vessel)

    lastScan = scan
}

function redrawLastScan() {
    if (lastScan) {
        drawScan(lastScan)
    }
}

function drawSummary(summary) {
    console.log(summary)

    let paths = {}

    JSON.parse(summary)['events'].forEach(function (item) {
        if(item['type'] === 'burn') {
            let vessel = item['args']['vessel']
            let pos = item['args']['position']

            console.log(vessel + ' at ' + pos)

            if(!paths[vessel]) {
                paths[vessel] = []
            }

            paths[vessel].push(pos)
        }
    })

    for(let [key, value] of Object.entries(paths)) {
        drawPath(value)
    }

    lastSummary = summary
}

function redrawLastSummary() {
    if (lastSummary) {
        drawSummary(lastSummary)
    }
}

function drawPath(nodes, style = 'white 1px solid') {
    nodes.forEach(function (item, index) {
        if(index < nodes.length - 1) {
            draw_line(item, nodes[index + 1], style)
        }
    })
}

function draw_vessel(vessel) {
    const origin = document.getElementById('origin');
    let craftDot = document.createElement('div')
    origin.appendChild(craftDot);
    let style;

    craftDot.classList.add('dot')
    craftDot.classList.add(vessel['type'])

    let team
    switch (vessel['team']) {
        case 0:
            team = 'defender'
            style = 'lightblue 2px double'
            break
        case 1:
            team = 'attacker'
            style = 'maroon 2px double'
            break
        case -1:
        default:
            team = 'unaligned'
    }

    craftDot.classList.add(team)

    craftDot.setAttribute('data-name', vessel['name'])
    craftDot.setAttribute('data-captain', vessel['captain'])

    let panelXY = document.createElement('div')
    panelXY.classList.add('panel')
    panelXY.classList.add('panelXY')

    let panelYZ = document.createElement('div')
    panelYZ.classList.add('panel')
    panelYZ.classList.add('panelYZ')

    let panelXZ = document.createElement('div')
    panelXZ.classList.add('panel')
    panelXZ.classList.add('panelXZ')

    craftDot.appendChild(panelXY);
    craftDot.appendChild(panelYZ);
    craftDot.appendChild(panelXZ);

    const coords = transformVectorToDrawingSpace(vessel['r'])
    const spherical = cartesianToSpherical(vessel['a'])

    panelYZ.style.borderColor = `rgba(255, 127, 0, ${spherical[0]/E})`

    craftDot.style.transform = `translate3d(${coords[0]}px, ${coords[1]}px, ${coords[2]}px)`
    rotateToSpherical(craftDot, spherical)

    if(vessel['type'] === 'craft') {
        drawProjection(vessel, 18, 2, style)
    }
}

function draw_line(vectorA, vectorB, style = 'white 1px solid') {
    const origin = document.getElementById('origin');
    let line = document.createElement('div')
    let gimbal = document.createElement('div')
    line.classList.add('line')
    gimbal.classList.add('dot')

    gimbal.appendChild(line)
    origin.appendChild(gimbal);

    const scaledA = transformVectorToDrawingSpace(vectorA)
    const scaledB = transformVectorToDrawingSpace(vectorB)

    if(Math.sqrt((vectorA[0]*vectorA[0]) + (vectorA[1]*vectorA[1]) + (vectorA[2]*vectorA[2])) < E) {
        console.log('POINT IN EARTH: ' + vectorA)
    }

    console.log('line from ' + vectorA + ' to ' + vectorB)

    const difference = subVectors(scaledB, scaledA)
    const spherical = cartesianToSpherical(difference)

    const length = spherical[0]

    line.style.height = `${length}px`
    line.style.borderLeft = style
    line.style.borderRight = style

    gimbal.style.transform += `translate3d(${scaledA[0]}px, ${scaledA[1]}px, ${scaledA[2]}px)`

    rotateToSpherical(line, spherical)
}

function drawProjection(vessel, steps, stepSize, style = 'white 1px solid') {
    let time = 0.0
    let path = []

    for(let i = 0; i < steps; i++) {
        path.push(pointAlongCurveAtTime(
            vessel['r'],
            vessel['v'],
            vessel['a'],
            time
        ))

        time += stepSize
    }

    drawPath(path, style)
}

function pointAlongCurveAtTime(r, v, a, t) {
    return [
        r[0] + (v[0]*t) + (a[0]*t*t*0.5),
        r[1] + (v[1]*t) + (a[1]*t*t*0.5),
        r[2] + (v[2]*t) + (a[2]*t*t*0.5)
    ]
}

function scaleVector(vector, scalar) {
    return [
        vector[0] * scalar,
        vector[1] * scalar,
        vector[2] * scalar
    ]
}

function transformVectorToDrawingSpace(vector) {
    let transformed = scaleVector(vector, factor)
    return [
        -transformed[0],
        -transformed[1],
        transformed[2]
    ]
}

function addVectors(a, b) {
    return [
        a[0] + b[0],
        a[1] + b[1],
        a[2] + b[2]
    ]
}

function subVectors(a, b) {
    return [
        a[0] - b[0],
        a[1] - b[1],
        a[2] - b[2]
    ]
}

function cartesianToSpherical(vector) {
    // i know i'm scrambling the coordinates here.
    // this is because CSS coordinates are oriented differently to the cartesian space this formula expects.
    // it expects XY to be the horizontal plane, and Z to be vertical.
    // this is fine, except that CSS considers ZX to be horizontal and Y to be vertical.
    const y = vector[0] // "X"
    const z = vector[1] // "Y"
    const x = vector[2] // "Z"

    const magnitude = Math.sqrt((x*x) + (y*y) + (z*z))

    let theta = 0

    if(z !== 0) {
        const numerator = Math.sqrt((x*x) + (y*y))
        theta = Math.atan(numerator/z)

        if(z < 0) {
            theta += Math.PI
        }
    } else if(x !== 0 || y !== 0) {
        theta = Math.PI/2.0
    }

    let phi = 0

    if(x !== 0) {
        phi = Math.atan(y/x)

        if(x < 0) {
            if(y >= 0) {
                phi += Math.PI
            } else {
                phi += -Math.PI
            }
        }
    } else if(y > 0) {
        phi = Math.PI/2.0
    } else if(y < 0) {
        phi = -Math.PI/2.0
    }

    return [magnitude, theta, phi]
}

function rotateToSpherical(DOMElement, vector) {
    const rotation = `rotateY(${vector[2]}rad) rotateX(${vector[1]}rad)`
    //console.log(rotation)
    DOMElement.style.transform += rotation
}

function get_vessel() {
    return document.getElementById("vessel").value;
}

function get_authcode() {
    return document.getElementById("authcode").value;
}

function get_system() {
    return document.getElementById("system").value;
}

function parse(str) {
    let m;
    // what a readable one-liner amirite
    let match = ((m = /\b(?:burn|cancel|scan|summary|agenda)\b/.exec(str)) ? m[0] : null)

    switch (match) {
        case "burn":
            return {
                "match": match, "command": str, "parsed": parse_burn(str)
            };
            break
        case "cancel":
            console.log("cancel")
            return {
                "match": match, "command": str, "parsed": parse_cancel(str)
            };
            break
        case "scan":
            console.log("scan")
            return {
                "match": match, "command": str, "parsed": parse_scan(str)
            };
            break
        case "summary":
            console.log("summary")
            return {
                "match": match, "command": str, "parsed": parse_summary(str)
            };
            break
        case "agenda":
            console.log("agenda")
            return {
                "match": match, "command": str, "parsed": parse_agenda(str)
            };
            break
        default:
            console.log("match fail");
    }
}

function handle(args) {
    console.log("overall handler called with " + JSON.stringify(args));
    switch (args.match) {
        case "burn":
            console.log("handling burn");
            return handle_burn(args.parsed);
        case "cancel":
            console.log("handling cancel")
            return handle_cancel(args.parsed);
        case "scan":
            console.log("handling scan")
            return handle_scan(args.parsed);
        case "summary":
            console.log("handling summary")
            return handle_summary(args.parsed);
        case "agenda":
            console.log("handling agenda")
            return handle_agenda(args.parsed);
        default:
            console.log("match fail");
    }
}

// ** SPECIFIC COMMAND PARSERS
function parse_burn(str) {
    let r_burn = /\bburn (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)\b/
    let r_in = /\bin (\d+(?:\.\d+)?) (second|hour|minute|day)s?\b/
    let r_at = /\bat (\d{4}-\d\d-\d\d \d\d:\d\d:\d\d)\b/

    let m_burn = r_burn.exec(str)
    let burn_coords = m_burn.slice(1, 4)

    let m_in
    let m_at
    let time_input
    let interval = false

    if (m_in = r_in.exec(str)) {
        interval = true
        switch (m_in[2]) {
            case "second":
                time_input = m_in[1]
                break
            case "minute":
                time_input = m_in[1] * 60
                break
            case "hour":
                time_input = m_in[1] * 60 * 60
                break
            case "day":
                time_input = m_in[1] * 60 * 60 * 24
                break
        }
    } else if (m_at = r_at.exec(str)) {
        time_input = m_at[1]
    } else {
        time_input = null // should be "now"?
    }

    console.log(`a: ${burn_coords}, time_input: ${time_input}, interval?: ${interval}`);
    return {
        "args": {"a": burn_coords},
        "time_input": time_input,
        "interval": interval
    };
}

function parse_cancel(str) {
    let order_id = parseInt(/\d+/.exec(str)[0]);
    return {order_id}
}

function parse_scan(str) {
    return str
}

function parse_summary(str) {
    return str
}

function parse_agenda(str) {
    return str
}

// specific command execution
// BURN
function handle_burn(args) {
    args["task"] = "burn";
    args.time = args.time_input;
    args = JSON.stringify(args);
    console.log("in burn handler, args " + args);
    let response = post_local("/game/" + get_system() + "/add_order", "html=1&authcode=" + get_authcode() + "&vessel=" + get_vessel() + "&order=" + args);
    console.log("response is " + response);
    return response;
}

// CANCEL
function handle_cancel(args) {
    let response = post_local("/game/" + get_system() + "/delete_order", "html=1&authcode=" + get_authcode() + "&vessel=" + get_vessel() + "&order_id=" + args.order_id);
    console.log("response is " + response);
    return response;
}

// SCAN
function handle_scan(args) {
    console.log("in scan handler, args " + args);
    let response = post_local("/game/" + get_system() + "/scan");
    console.log("response is " + response);
    drawScan(response)
    return response;
}

// SUMMARY
function handle_summary(args) {
    let response = post_local("/game/" + get_system() + "/summary");
    drawSummary(response)
    return response
}

// AGENDA
function handle_agenda(args) {
    return post_local("/game/" + get_system() + "/agenda", "html=1&authcode=" + get_authcode() + "&vessel=" + get_vessel());
}

//** END COMMAND-SPECIFIC HANDLERS**

function post_local(endpoint, body) {
    //create XMLHttpRequest object
    const xhr = new XMLHttpRequest()
    //open a request with the remote server URL
    const hostname = 'http://dotwar.pythonanywhere.com'
    // var urlbase = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port : '');
    const url = hostname + endpoint;
    //
    //for
    console.log("POSTing " + url);
    console.log("POST body:" + body)
    xhr.open("POST", url, false)
    xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    //send the Http request
    xhr.send(body)

    //EVENT HANDLERS

    //triggered when the response is completed
    xhr.onload = function (e) {
        if (xhr.status === 200 || xhr.status !== 404) {
            let data = xhr.responseText
            console.log("received:\n" + data)
            return data;
        } else if (xhr.status === 404) {
            console.log("received 404")
        }
    }

    //triggered when a network-level error occurs with the request
    xhr.onerror = function () {
        console.log("Network error occurred")
    }

    return xhr.responseText;
}
