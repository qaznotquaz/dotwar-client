const E = 1.6e7
const D = 1.12e7
let EDGE = 10000000000
let factor
let lastScan

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

    JSON.parse(scan)['entities'].forEach(draw_vessel)

    lastScan = scan
}

function redrawLastScan() {
    if (lastScan) {
        drawScan(lastScan)
    }
}

function draw_vessel(vessel) {
    const origin = document.getElementById('origin');
    let craftDot = document.createElement('div')
    origin.appendChild(craftDot);

    craftDot.classList.add('dot')
    craftDot.classList.add(vessel['type'])

    let team
    switch (vessel['team']) {
        case 0:
            team = 'defender'
            break
        case 1:
            team = 'attacker'
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

    const coords = transform_coordinates(vessel['r'])
    craftDot.style.transform = `translate3d(${coords[0]}px, ${coords[1]}px, ${coords[2]}px)`
}

function transform_coordinates(coords) {
    return [
        coords[0] * factor,
        coords[1] * factor,
        coords[2] * factor
    ]
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
    return post_local("/game/" + get_system() + "/summary", "html=1");
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
