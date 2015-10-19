"use strict";
var Promise = require("bluebird");
var AppServiceRegistration = require("matrix-appservice-bridge").AppServiceRegistration;
var Cli = require("matrix-appservice-bridge").Cli;
var Bridge = require("matrix-appservice-bridge").Bridge;
var RemoteUser = require("matrix-appservice-bridge").RemoteUser;
var MatrixRoom = require("matrix-appservice-bridge").MatrixRoom;
var socketIo = require("socket.io");
var uuid = require("uuid");
var Sdp = require("./lib/sdp");
var express = require('express'); // needed for socket.io 0.9

var REGISTRATION_FILE = "config/respoke-registration.yaml";
var CONFIG_SCHEMA_FILE = "config/respoke-config-schema.yaml";
var USER_PREFIX = "ast_";
var CANDIDATE_TIMEOUT_MS = 1000 * 3; // 3s

var respoke, bridgeInst;
var calls = {}; // room_id+call_id: CallStruct
var callsByMatrixCallId = {}; // call_id: room_id
var callsByRespokeSessionId = {}; // sessionId: room_id

var connectionIdsByEndpointId = {}; // respoke endpoint: connection id

function runBridge(port, config) {
    // Create a respoke instance then listen on the bridge.

    respoke = new RespokeEndpoint(
    function(obj, ack, connection) { // handle the incoming respoke request
        console.log("Received: " + JSON.stringify(obj));
        if (obj.url) {
            // TODO: handle multiple asterisk endpoints registering with the bridge
            var match = obj.url.match(/^\/v1\/endpoints\/(.*?)\/connections/);
            if (match) {
                var endpointId = match[1];
                connectionIdsByEndpointId[endpointId] = connection.id;
                ack(JSON.stringify(
                    {
                      "appId": "15a8d3c0-558b-44ea-93f0-3d51e4ea0f6d",
                      "accountId": "C6CA4306-739C-488F-B903-4D4624D3C0E6",
                      "endpointId": endpointId,
                      "ipAddress": connection.ip,
                      "clientType": obj.data.clientType.toUpperCase(),
                      "roleId": null,
                      "id": connection.id,
                      "trickleIce": false,
                      "iceFinalCandidates": false,
                      "type": "websocket"
                    }
                ));
            }
            else if (obj.url === "/v1/signaling") {
                var signal = JSON.parse(obj.data.signal);
                switch (signal.signalType) {
                    case "answer":
                        if (!signal.parsedSDP || !signal.sessionId) {
                            console.error("Missing SDP and/or session ID");
                            return;
                        }
                        var callStruct = callsByRespokeSessionId[signal.sessionId];
                        if (!callStruct) {
                            console.error("No call with ID '%s' exists.", signal.sessionId);
                            return;
                        }

                        // find out which user should be sending the answer
                        bridgeInst.getRoomStore().getMatrixRoom(callStruct.roomId).then(
                        function(room) {
                            if (!room) {
                                throw new Error("Unknown room ID: " + callStruct.roomId);
                            }
                            var sender = room.get("ast_user");
                            if (!sender) {
                                throw new Error("Room " + callStruct.roomId + " has no ast_user");
                            }
                            var intent = bridgeInst.getIntent(sender);
                            return intent.sendEvent(callStruct.roomId, "m.call.answer", {
                                call_id: callStruct.matrixCallId,
                                version: 0,
                                answer: {
                                    sdp: new Sdp().compileSdp(signal.parsedSDP),
                                    type: "answer"
                                }
                            });
                        }).then(function() {
                            ack(JSON.stringify(
                                {
                                    "message": "Success"
                                }
                            ));
                            return respoke.sendConnected(callStruct);
                        }).done(function() {
                            console.log("Forwarded answer.");
                        }, function(err) {
                            console.error("Failed to send m.call.answer: %s", err);
                            console.log(err.stack);
                            // TODO send respoke error response?
                        });
                        break;
                    case "connected":
                        console.log("received connected: " + JSON.stringify(obj));
                        break;
                    case "bye":
                        // TODO: handle hangups from the Asterisk side of the bridge!!
                        console.log("received bye: " + JSON.stringify(obj));
                        break;                
                    default:
                        console.log("Unhandled signalType: %s", msg.data.signal.signalType);
                        break;
                }
            }
            else {
                console.error("Unrecognised REST-over-WS url: " + url);
                return;
            }
        }
    });

    bridgeInst = new Bridge({
        homeserverUrl: config.homeserver.url,
        domain: config.homeserver.domain,
        registration: REGISTRATION_FILE,
        queue: {
            type: "per_room",
            perRequest: true
        },

        controller: {
            onUserQuery: function(queriedUser) {
                // auto-create "users" when queried. @ast_#matrix:foo -> "#matrix (Room)"
                return {
                    name: queriedUser.localpart.replace(USER_PREFIX, "") + " (Room)"
                };
            },

            onEvent: function(request, context) {
                var promise = handleEvent(request, context);
                if (!promise) {
                    promise = Promise.resolve("unhandled event");
                }
                else {
                    console.log("[%s] Handling request", request.getId());
                }
                request.outcomeFrom(promise);
            },

            onLog: function(text, isError) {
                console.log(text);
            }
        }
    });

    respoke.listen()
    .done(function() {
        bridgeInst.run(port, config);
        console.log("Running bridge on port %s", port);
        bridgeInst.getRequestFactory().addDefaultTimeoutCallback(function(req) {
            console.error("DELAYED: %s", req.getId());
        }, 5000);

    }, function(err) {
        console.error("Failed to login to respoke: %s", JSON.stringify(err));
        process.exit(1);
    });
}

function handleEvent(request, context) {
    var event = request.getData();
    var callStruct;
    console.log(
        "[%s] %s: from=%s in %s: %s\n",
        request.getId(), event.type, event.user_id, event.room_id,
        JSON.stringify(event.content)
    );
    console.log("context=" + JSON.stringify(context));
    // auto-accept invites directed to @ast_ users
    if (event.type === "m.room.member" && event.content.membership === "invite" &&
            context.targets.matrix.localpart.indexOf(USER_PREFIX) === 0) {

        // XXX: for now, track assume each matrix user maps to a single respoke connection ID.
        // better would be to do it per room and persist it across restarts, but hey.
        if (connectionIdsByEndpointId[event.user_id] === undefined) {
            connectionIdsByEndpointId[event.user_id] = uuid.v4();
        }

        var intent = bridgeInst.getIntent(context.targets.matrix.getId());
        return intent.join(event.room_id).then(function() {
            // pair this user with this room ID
            var room = new MatrixRoom(event.room_id);
            room.set("ast_user", context.targets.matrix.getId());
            room.set("inviter", event.user_id);
            return bridgeInst.getRoomStore().setMatrixRoom(room);
        });
    }
    else if (event.type === "m.call.invite") {
        // XXX: for now, track assume each matrix user maps to a single respoke connection ID.
        // better would be to do it per room and persist it across restarts, but hey.
        if (connectionIdsByEndpointId[event.user_id] === undefined) {
            connectionIdsByEndpointId[event.user_id] = uuid.v4();
        }

        // find out who we're calling (XXX: why it his not in context.targets!?)
        var to;
        bridgeInst.getRoomStore().getMatrixRoom(event.room_id).then(
        function(room) {
            if (!room) {
                throw new Error("Unknown room ID: " + room_id);
            }
            to = room.get("ast_user");
            if (!to) {
                throw new Error("Room " + callStruct.roomId + " has no ast_user");
            }
        }).then(
        function() {
            callStruct = {
                matrixCallId: event.content.call_id,
                respokeSessionId: uuid.v4(),
                roomId: event.room_id,
                offer: event.content.offer.sdp,
                candidates: [],
                timer: null,
                sentInvite: false,
                from: event.user_id,
                to: to.replace('@' + USER_PREFIX, '').replace(/:.*$/, ''),
            };
            calls[event.room_id + event.content.call_id] = callStruct;
            callsByMatrixCallId[callStruct.matrixCallId] = callStruct;
            callsByRespokeSessionId[callStruct.respokeSessionId] = callStruct;
            return respoke.attemptInvite(callStruct, false);
        });
    }
    else if (event.type === "m.call.candidates") {
        callStruct = calls[event.room_id + event.content.call_id];
        if (!callStruct) {
            return Promise.reject("Received candidates for unknown call");
        }
        event.content.candidates.forEach(function(cand) {
            callStruct.candidates.push(cand);
        });
        return respoke.attemptInvite(callStruct, false);
    }
    else if (event.type === "m.call.hangup") {
        // send respoke.bye
        callStruct = calls[event.room_id + event.content.call_id];
        if (!callStruct) {
            return Promise.reject("Received hangup for unknown call");
        }
        promise = respoke.sendBye(callStruct);
        delete calls[event.room_id + event.content.call_id];
        return promise;
    }    
}

// === Respoke Endpoint ===
function RespokeEndpoint(callback) {
    this.server = null;
    this.callback = callback;
    this.requestId = 0;
    this.requests = {};
    this.socketsByConnectionId = {};
 }

RespokeEndpoint.prototype.listen = function() {
    var self = this;
    var defer = Promise.defer();

    // have to use express3 with socket.io 0.9 for
    // compatibility with respoke.io
    var app = express();
    var server = require('http').createServer(app)
    var io = socketIo.listen(server);

    io.sockets.on('connection', function(socket) {
        var connection = {
            id: uuid.v4(),
            ip: socket.handshake.address.address,
        };
        self.socketsByConnectionId[connection.id] = socket;

        console.log("[%s]: OPENED", connection.ip);

        socket.on('post', function(message, ack) {
            console.log("[%s]: EVENT %s\n", self.url, message);
            var jsonMessage;
            try {
                jsonMessage = JSON.parse(message);
            }
            catch(e) {
                console.error("Failed to parse %s: %s", message, e);
                return;
            }
            self.callback(jsonMessage, ack, connection);
        });
        socket.on('disconnect', function(){
            console.warn("[%s]: disconnected\n");
        });
    });

    server.listen(3000);
    defer.resolve(); // TODO: um, error handling?
    return defer.promise;
};

RespokeEndpoint.prototype.attemptInvite = function(callStruct, force) {
    if (callStruct.candidates.length === 0) {
        return Promise.resolve();
    }
    var self = this;

    var enoughCandidates = false;
    for (var i = 0; i < callStruct.candidates.length; i++) {
        var c = callStruct.candidates[i];
        if (!c.candidate) { continue; }
        // got enough candidates when SDP has a srflx or relay candidate
        if (c.candidate.indexOf("typ srflx") !== -1 ||
                c.candidate.indexOf("typ relay") !== -1) {
            enoughCandidates = true;
            console.log("Gathered enough candidates for %s", callStruct.matrixCallId);
            break; // bail early
        }
    };

    if (!enoughCandidates && !force) { // don't send the invite just yet
        if (!callStruct.timer) {
            callStruct.timer = setTimeout(function() {
                console.log("Timed out. Forcing invite for %s", callStruct.matrixCallId);
                self.attemptInvite(callStruct, true);
            }, CANDIDATE_TIMEOUT_MS);
            console.log("Call %s is waiting for candidates...", callStruct.matrixCallId);
            return Promise.resolve("Waiting for candidates");
        }
    }

    if (callStruct.timer) {  // cancel pending timers
        clearTimeout(callStruct.timer);
    }
    if (callStruct.sentInvite) {  // e.g. timed out and then got more candidates
        return Promise.resolve("Invite already sent");
    }

    // de-trickle candidates - insert the candidates in the right m= block.
    // Insert the candidate line at the *END* of the media block
    // (RFC 4566 Section 5; order is m,i,c,b,k,a) - we'll just insert at the
    // start of the a= lines for parsing simplicity)
    var mIndex = -1;
    var mType = "";
    var parsedUpToIndex = -1;
    callStruct.offer = callStruct.offer.split("\r\n").map(function(line) {
        if (line.indexOf("m=") === 0) { // m=audio 48202 RTP/SAVPF 111 103
            mIndex += 1;
            mType = line.split(" ")[0].replace("m=", ""); // 'audio'
            console.log("index=%s - %s", mIndex, line);
        }
        if (mIndex === -1) { return line; } // ignore session-level keys
        if (line.indexOf("a=") !== 0) { return line; } // ignore keys before a=
        if (parsedUpToIndex === mIndex) { return line; } // don't insert cands f.e a=

        callStruct.candidates.forEach(function(cand) {
            // m-line index is more precise than the type (which can be multiple)
            // so prefer that when inserting
            if (typeof(cand.sdpMLineIndex) === "number") {
                if (cand.sdpMLineIndex !== mIndex) {
                    return;
                }
                line = "a=" + cand.candidate + "\r\n" + line;
                console.log(
                    "Inserted candidate %s at m= index %s",
                    cand.candidate, cand.sdpMLineIndex
                );
            }
            else if (cand.sdpMid !== undefined && cand.sdpMid === mType) {
                // insert candidate f.e. m= type (e.g. audio)
                // This will repeatedly insert the candidate for m= blocks with
                // the same type (unconfirmed if this is the 'right' thing to do)
                line = "a=" + cand.candidate + "\r\n" + line;
                console.log(
                    "Inserted candidate %s at m= type %s",
                    cand.candidate, cand.sdpMid
                );
            }
        });
        parsedUpToIndex = mIndex;
        return line;
    }).join("\r\n");

    callStruct.sentInvite = true;
    return this.sendRequest({
        "header": {
            "type": "signal",
            "timestamp": Date.now(),
            "fromConnection": connectionIdsByEndpointId[callStruct.from],
            "to": callStruct.to,
            "from": callStruct.from,
            "fromType": "web",
            "toType": "web",
            "requestId": uuid.v4(),
        },
        "body": {
            "signalType": "offer",
            "sessionId": callStruct.respokeSessionId,
            "sessionDescription": {
                "type": "offer",
                "sdp": callStruct.offer,
            },
            "target": "call",
            "signalId": uuid.v4(),
            "version": "1.0",
            "capabilities": {
                "trickleIce": true,
                "iceFinalCandidates": true,
                "iceMerged": true
            },
            "parsedSDP": new Sdp().parseSdp(callStruct.offer),      
        }
    }, callStruct.to);
};

RespokeEndpoint.prototype.sendConnected = function(callStruct) {
    return this.sendRequest({
        "header": {
            "type": "signal",
            "timestamp": Date.now(),
            "fromConnection": connectionIdsByEndpointId[callStruct.from],
            "toEndpoint": callStruct.from,
            "to": callStruct.to,
            "from": callStruct.from,
            "fromType": "web",
            "toType": "web",
            "requestId": uuid.v4(),
        },
        "body": {
            "signalType": "connected",
            "sessionId": callStruct.respokeSessionId,
            "target": "call",
            "signalId": uuid.v4(),
            "connectionId": connectionIdsByEndpointId[callStruct.to],
            "version": "1.0"
        }
    }, callStruct.to);
}

RespokeEndpoint.prototype.sendBye = function(callStruct) {
    return this.sendRequest({
        "header": {
            "type": "signal",
            "timestamp": Date.now(),
            "from": callStruct.from,
            "fromType": "web",
            "fromConnection": connectionIdsByEndpointId[callStruct.from], 
            "to": callStruct.to,
            "toType": "web"
        },
        "body": {
            "version": "1.0",
            "signalType": "bye",
            "sessionId": this.sessionId,
            "reason": "hangup"
        }
    }, callStruct.to);
}

RespokeEndpoint.prototype.sendRequest = function(object, to) {
    console.log("[%s]: SENDING: %s\n", to, JSON.stringify(object));
    var connectionId = connectionIdsByEndpointId[to];
    var socket = this.socketsByConnectionId[connectionId];
    var defer = Promise.defer();
    socket.emit(object.header.type, object, function(err) {
        if (err) {
            defer.reject(err);
            return;
        }
        defer.resolve();
    });
    return defer.promise;
};

RespokeEndpoint.prototype.sendResponse = function(object, to) {
    console.log("[%s]: SENDING: %s\n", to, JSON.stringify(object));
    var connectionId = connectionIdsByEndpointId[to];
    var socket = this.socketsByConnectionId[connectionId];
    var defer = Promise.defer();
    socket.send(JSON.stringify([ JSON.stringify(object) ]), function(err) {
        if (err) {
            defer.reject(err);
            return;
        }
        defer.resolve();
    });
    return defer.promise;
};

// === Command Line Interface ===
var c = new Cli({
    registrationPath: REGISTRATION_FILE,
    bridgeConfig: {
        schema: CONFIG_SCHEMA_FILE
    },
    generateRegistration: function(reg, callback) {
        reg.setHomeserverToken(AppServiceRegistration.generateToken());
        reg.setAppServiceToken(AppServiceRegistration.generateToken());
        reg.setSenderLocalpart("respokebot");
        reg.addRegexPattern("users", "@" + USER_PREFIX + ".*", true);
        console.log(
            "Generating registration to '%s' for the AS accessible from: %s",
            REGISTRATION_FILE, reg.url
        );
        callback(reg);
    },
    run: runBridge
});

c.run(); // check system args
