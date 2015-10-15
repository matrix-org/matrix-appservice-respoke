"use strict";

function Sdp() {
};

Sdp.prototype.parseSdp = function(s) {
    var lines = s.split(/[\r\n]+/);
    var sdp = {};
    var media;
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var r = line.match(/^(.+?)=(.+)$/);
        if (!r) {
            console.error("Couldn't parse sdp line: " + line);
            continue;
        }
        var key = r[1], value = r[2];
        switch (key) {
        case 'v':
            sdp.version = value | 0; 
            break;
        case 'o':
            var r = value.match(/^(.*?) (.*?) (.*?) (.*?) IP(.*) (.*?)$/);
            if (r) {
                sdp.origin = {
                    username: r[1],
                    sessionId: r[2],
                    sessionVersion: r[3] | 0,
                    netType: r[4],
                    ipVer: r[5] | 0,
                    address: r[6]
                };
            }
            else {
                console.error("Couldn't parse o= line: " + line);
            }
            break;
        case 's':
            sdp.name = value;
            break;
        case 't':
            var r = value.match(/^(.*?) (.*?)$/);
            if (r) {
                sdp.timing = {
                    start: r[1] | 0,
                    stop: r[2] | 0
                };
            }
            else {
                console.error("Couldn't parse t= line: " + line);
            }
            break;
        case 'a':
            var r = value.match(/^(.*?)(:(.*))?$/);
            if (r) {
                var attr = r[1], args = r[3];
                //console.log("a= line: r=" + JSON.stringify(r) + " attr:" + attr + " args:" + args);
                switch (attr) {
                case 'group':
                    var r = args.match(/^(.*?) (.*)$/);
                    if (r) {
                        if (sdp.groups === undefined) sdp.groups = [];
                        sdp.groups.push({
                            type: r[1],
                            mids: r[2]
                        });
                    }
                    else {
                        console.error("Couldn't parse group line: " + line);
                    }
                    break;
                case 'msid-semantic':
                    var r = args.match(/^ *(.*?) (.*)$/);
                    if (r) {
                        sdp.msidSemantic = {
                            semantic: r[1],
                            token: r[2]
                        };
                    }
                    else {
                        console.error("Couldn't parse msid-semantic line: " + line);
                    }
                    break;
                case 'rtcp':
                    var r = args.match(/^(.*?) (.*?) IP(.*?) (.*?)$/);
                    if (r) {
                        media.rtcp = {
                            port: r[1] | 0,
                            netType: r[2],
                            ipVer: r[3] | 0,
                            address: r[4]
                        };
                    }
                    else {
                        console.error("Couldn't parse rtcp line: " + line);
                    }
                    break;
                case 'ice-ufrag':
                    media.iceUfrag = args;
                    break;
                case 'ice-pwd':
                    media.icePwd = args;
                    break;
                case 'fingerprint':
                    var r = args.match(/^(.*?) (.*)$/);
                    if (r) {
                        media.fingerprint = {
                            type: r[1],
                            hash: r[2]
                        };
                    }
                    else {
                        console.error("Couldn't parse fingerprint line: " + line);
                    }
                    break;
                case 'setup':
                    media.setup = args;
                    break;
                case 'mid':
                    media.mid = args;
                    break;
                case 'extmap':
                    var r = args.match(/^(.*?) (.*)$/);
                    if (r) {
                        if (media.ext === undefined) media.ext = [];
                        media.ext.push({
                            value: r[1] | 0,
                            uri: r[2]
                        });
                    }
                    else {
                        console.error("Couldn't parse extmap line: " + line);
                    }
                    break;
                case 'sendrecv':
                case 'sendonly':
                case 'recvonly':
                case 'inactive':
                    media.direction = attr;
                    break;
                case 'rtcp-mux':
                    media.rtcpMux = attr;
                    break;
                case 'rtpmap':
                    var r = args.match(/^(.*?) (.*?)\/(.*?)(\/(.*?))?$/);
                    if (r) {
                        if (media.rtp === undefined) media.rtp = [];
                        var rtp = {
                            payload: r[1] | 0,
                            codec: r[2],
                            rate: r[3] | 0,
                        };
                        if (r[5] !== undefined) rtp.encoding = r[5] | 0;
                        media.rtp.push(rtp);
                    }
                    else {
                        console.error("Couldn't parse rtpmap line: " + line);
                    }
                    break;
                case 'fmtp':
                    // XXX: bug for bug compatibility with respoke
                    // as we discard multiple fmtp params
                    var r = args.match(/^(.*?) (.+?)(;|$)/);
                    if (r) {
                        if (media.fmtp === undefined) media.fmtp = [];
                        media.fmtp.push({
                            payload: r[1] | 0,
                            config: r[2]
                        });
                    }
                    else {
                        console.error("Couldn't parse fmtp line: " + line);
                    }
                    break;
                case 'maxptime':
                    media.maxptime = args;
                    break;
                case 'ssrc':
                    var r = args.match(/^(.*?) (.*?):(.*)/);
                    if (r) {
                        if (media.ssrcs === undefined) media.ssrcs = [];
                        media.ssrcs.push({
                            id: r[1],
                            attribute: r[2],
                            value: r[3],
                        });
                    }
                    else {
                        console.error("Couldn't parse ssrc line: " + line);
                    }
                    break;
                case 'candidate':
                    var r = args.match(/^(.*?) (.*?) (.*?) (.*?) (.*?) (.*?) typ (.*?) (.*? |)generation (.*)$/);
                    
                    if (r) {
                        if (media.candidates === undefined) media.candidates = [];
                        var candidate = {
                            foundation: parseInt(r[1]),
                            component: r[2] | 0,
                            transport: r[3],
                            priority: parseInt(r[4]),
                            ip: r[5],
                            port: r[6] | 0,
                            type: r[7],
                            generation: r[9] | 0,
                        };
                        var r2 = r[8].match(/^raddr (.*?) rport (.*?) $/);
                        if (r2) {
                            candidate.raddr = r2[1];
                            candidate.rport = r2[2] | 0;
                        }
                        media.candidates.push(candidate);
                    }
                    else {
                        console.error("Couldn't parse candidate line: " + line);
                    }
                    break;
                }    
            }
            else {
                console.error("Couldn't parse a= line: " + line);
            }
            break;
        case 'm':
            var r = value.match(/^(.*?) (.*?) (.*?) (.*)$/);
            if (r) {
                media = {
                    type: r[1],
                    port: r[2] | 0,
                    protocol: r[3],
                    payloads: r[4],
                };
                if (sdp.media === undefined) sdp.media = [];
                sdp.media.push(media);
            }
            else {
                console.error("Couldn't parse m= line: " + line);
            }
            break;
        case 'c':
            var r = value.match(/^IN IP(.*?) (.*?)$/);
            if (r) {
                media.connection = {
                    version: r[1] | 0,
                    ip: r[2],
                }
            }
            else {
                console.error("Couldn't parse c= line: " + line);
            }
            break;            
        }
    }
    
    return sdp;
}

Sdp.prototype.compileSdp = function(sdp) {
    // compiles respoke 'parsed SDP' into real SDP for use
    // with WebRTC 1.0 (and thus Matrix)

    var s = '';
    if (sdp.version !== undefined) {
        s += "v=" + sdp.version + "\r\n";
    }
    if (sdp.origin !== undefined) {
        s += "o=" + sdp.origin.username + " " +
                     sdp.origin.sessionId + " " +
                    sdp.origin.sessionVersion + " " +
                    sdp.origin.netType + " " +
                    "IP" + sdp.origin.ipVer + " " +
                    sdp.origin.address + "\r\n";
    }
    if (sdp.name !== undefined) {
        s += "s=" + sdp.name + "\r\n";
    }
    if (sdp.timing !== undefined) {
        s += "t=" + sdp.timing.start + " " +
                    sdp.timing.stop + "\r\n";
    }
    if (sdp.groups !== undefined) {
        for (var i = 0; i < sdp.groups.length; i++) {
            var group = sdp.groups[i];
            s += "a=group:" + group.type + " " + group.mids + "\r\n";
        }
    }
    if (sdp.msidSemantic !== undefined) {
        s += "a=msid-semantic: " + sdp.msidSemantic.semantic + " " + 
                                   sdp.msidSemantic.token + "\r\n";
    }
    if (sdp.media !== undefined) {
        for (var i = 0; i < sdp.media.length; i++) {
            var media = sdp.media[i];
            s += "m=" + media.type + " " +
                        media.port + " " +
                        media.protocol + " " +
                        media.payloads + "\r\n";
            if (media.connection !== undefined) {
                s += "c=IN IP" + media.connection.version + " " +
                                 media.connection.ip + "\r\n";
            }
            if (media.rtcp !== undefined) {
                s += "a=rtcp:" + media.rtcp.port + " " +
                                 media.rtcp.netType + " " +
                                 "IP" + media.rtcp.ipVer + " " +
                                 media.rtcp.address + "\r\n";
            }
            if (media.iceUfrag !== undefined) {
                s += "a=ice-ufrag:" + media.iceUfrag + "\r\n";
            }
            if (media.icePwd !== undefined) {
                s += "a=ice-pwd:" + media.icePwd + "\r\n";
            }
            if (media.fingerprint !== undefined) {
                s += "a=fingerprint:" + media.fingerprint.type + " "
                                      + media.fingerprint.hash + "\r\n";
            }
            if (media.setup !== undefined) {
                s += "a=setup:" + media.setup + "\r\n";
            }
            if (media.mid !== undefined) {
                s += "a=mid:" + media.mid + "\r\n";
            }
            if (media.ext !== undefined) {
                for (var j = 0; j < media.ext.length; j++) {
                    var ext = media.ext[j];
                    s += "a=extmap:" + ext.value + " " +
                                        ext.uri + "\r\n";
                }
            }
            if (media.direction !== undefined) {
                s += "a=" + media.direction + "\r\n";
            }
            if (media.rtcpMux !== undefined) {
                s += "a=" + media.rtcpMux + "\r\n";
            }
            if (media.rtp !== undefined) {
                for (var j = 0; j < media.rtp.length; j++) {
                    var rtp = media.rtp[j];
                    s += "a=rtpmap:" + rtp.payload + " " +
                                       rtp.codec + "/" +
                                       rtp.rate;
                    if (rtp.encoding !== undefined) {
                        s += "/" + rtp.encoding;
                    }
                    s += "\r\n";

                    if (media.fmtp !== undefined) {
                        for (var k = 0; k < media.fmtp.length; k++) {
                            var fmtp = media.fmtp[k];
                            if (fmtp.payload === rtp.payload) {
                                // XXX: respoke.io looks to get the parsing wrong
                                // and drops additional semi-colon separated fmtp params like
                                // useinbandfec=1
                                s += "a=fmtp:" + fmtp.payload + " " + 
                                                 fmtp.config + "\r\n";
                            }
                        }
                    }
                }
            }
            if (media.maxptime !== undefined) {
                s += "a=maxptime:" + media.maxptime + "\r\n";
            }
            if (media.ssrcs !== undefined ) {
                for (var j = 0; j < media.ssrcs.length; j++) {
                    var ssrc = media.ssrcs[j];
                    s += "a=ssrc:" + ssrc.id + " " +
                                      ssrc.attribute + ":" + ssrc.value + "\r\n";
                }
            }
            if (media.candidates !== undefined ) {
                for (var j = 0; j < media.candidates.length; j++) {
                    var candidate = media.candidates[j];
                    s += "a=candidate:" + candidate.foundation + " " +
                                          candidate.component + " " +
                                          candidate.transport + " " +
                                          candidate.priority + " " +
                                          candidate.ip + " " +
                                          candidate.port + " " +
                                          "typ " + candidate.type + " ";

                    if (candidate.transport === "tcp") {
                        s += "tcptype active ";
                    }
                    if (candidate.raddr != undefined) {
                        s += "raddr " + candidate.raddr + " ";
                    }
                    if (candidate.rport != undefined) {
                        s += "rport " + candidate.rport + " ";
                    }
                    // XXX: respoke loses the generation param for TCP canditates
                    s += "generation " + (candidate.generation ? candidate.generation : 0);
                    s += "\r\n";
                }
            }
        }    
    }
    return s;
}

module.exports = Sdp;
