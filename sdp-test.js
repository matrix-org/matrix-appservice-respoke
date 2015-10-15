var Sdp = require('./lib/sdp');
console.error("sdp is " + Sdp);

var s = "v=0\r\n\
o=- 3003820365034690523 2 IN IP4 127.0.0.1\r\n\
s=-\r\n\
t=0 0\r\n\
a=group:BUNDLE audio\r\n\
a=msid-semantic: WMS m6Cn38lGbk6RLBkjVnQ4w9iHDolie9SvwNeT\r\n\
m=audio 9 RTP/SAVPF 111 103 104 9 0 8 106 105 13 126\r\n\
c=IN IP4 0.0.0.0\r\n\
a=rtcp:9 IN IP4 0.0.0.0\r\n\
a=ice-ufrag:o0PkNdIMDHBsocvf\r\n\
a=ice-pwd:CZzpJTedzlWx6/jeqe1H7Tdq\r\n\
a=fingerprint:sha-256 C3:05:96:21:D4:58:25:AA:5F:BF:E1:3C:BE:2B:FB:7B:51:02:5D:72:83:9C:18:60:D9:38:BE:CD:18:99:24:19\r\n\
a=setup:actpass\r\n\
a=mid:audio\r\n\
a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\r\n\
a=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\n\
a=sendrecv\r\n\
a=rtcp-mux\r\n\
a=rtpmap:111 opus/48000/2\r\n\
a=fmtp:111 minptime=10; useinbandfec=1\r\n\
a=rtpmap:103 ISAC/16000\r\n\
a=rtpmap:104 ISAC/32000\r\n\
a=rtpmap:9 G722/8000\r\n\
a=rtpmap:0 PCMU/8000\r\n\
a=rtpmap:8 PCMA/8000\r\n\
a=rtpmap:106 CN/32000\r\n\
a=rtpmap:105 CN/16000\r\n\
a=rtpmap:13 CN/8000\r\n\
a=rtpmap:126 telephone-event/8000\r\n\
a=maxptime:60\r\n\
a=ssrc:3328692482 cname:gmuy3UxoZJ8tfMEd\r\n\
a=ssrc:3328692482 msid:m6Cn38lGbk6RLBkjVnQ4w9iHDolie9SvwNeT 2a76a199-15c0-4957-9c50-8be3a8a093dc\r\n\
a=ssrc:3328692482 mslabel:m6Cn38lGbk6RLBkjVnQ4w9iHDolie9SvwNeT\r\n\
a=ssrc:3328692482 label:2a76a199-15c0-4957-9c50-8be3a8a093dc\r\n\
a=candidate:3676977799 1 udp 2122260223 192.168.100.130 53742 typ host generation 0\r\n\
a=candidate:3676977799 2 udp 2122260222 192.168.100.130 54067 typ host generation 0\r\n\
a=candidate:2510931575 1 tcp 1518280447 192.168.100.130 0 typ host tcptype active generation 0\r\n\
a=candidate:2510931575 2 tcp 1518280446 192.168.100.130 0 typ host tcptype active generation 0\r\n\
a=candidate:3001054534 1 udp 1686052607 190.255.39.202 53742 typ srflx raddr 192.168.100.130 rport 53742 generation 0\r\n\
a=candidate:3001054534 2 udp 1686052606 190.255.39.202 54067 typ srflx raddr 192.168.100.130 rport 54067 generation 0\r\n\
a=candidate:3423060084 1 udp 41885439 54.93.114.194 53814 typ relay raddr 190.255.39.202 rport 53742 generation 0\r\n\
a=candidate:3423060084 2 udp 41885438 54.93.114.194 54750 typ relay raddr 190.255.39.202 rport 54067 generation 0\r\n\
a=candidate:3423060084 1 udp 25108223 54.93.114.194 56474 typ relay raddr 190.255.39.202 rport 58696 generation 0\r\n\
a=candidate:3423060084 2 udp 25108222 54.93.114.194 53756 typ relay raddr 190.255.39.202 rport 58697 generation 0";

var sdp = {
  "version": 0,
  "origin": {
    "username": "-",
    "sessionId": "3003820365034690523",
    "sessionVersion": 2,
    "netType": "IN",
    "ipVer": 4,
    "address": "127.0.0.1"
  },
  "name": "-",
  "timing": {
    "start": 0,
    "stop": 0
  },
  "groups": [
    {
      "type": "BUNDLE",
      "mids": "audio"
    }
  ],
  "msidSemantic": {
    "semantic": "WMS",
    "token": "m6Cn38lGbk6RLBkjVnQ4w9iHDolie9SvwNeT"
  },
  "media": [
    {
      "rtp": [
        {
          "payload": 111,
          "codec": "opus",
          "rate": 48000,
          "encoding": 2
        },
        {
          "payload": 103,
          "codec": "ISAC",
          "rate": 16000
        },
        {
          "payload": 104,
          "codec": "ISAC",
          "rate": 32000
        },
        {
          "payload": 9,
          "codec": "G722",
          "rate": 8000
        },
        {
          "payload": 0,
          "codec": "PCMU",
          "rate": 8000
        },
        {
          "payload": 8,
          "codec": "PCMA",
          "rate": 8000
        },
        {
          "payload": 106,
          "codec": "CN",
          "rate": 32000
        },
        {
          "payload": 105,
          "codec": "CN",
          "rate": 16000
        },
        {
          "payload": 13,
          "codec": "CN",
          "rate": 8000
        },
        {
          "payload": 126,
          "codec": "telephone-event",
          "rate": 8000
        }
      ],
      "fmtp": [
        {
          "payload": 111,
          "config": "minptime=10;"
        }
      ],
      "type": "audio",
      "port": 9,
      "protocol": "RTP/SAVPF",
      "payloads": "111 103 104 9 0 8 106 105 13 126",
      "connection": {
        "version": 4,
        "ip": "0.0.0.0"
      },
      "rtcp": {
        "port": 9,
        "netType": "IN",
        "ipVer": 4,
        "address": "0.0.0.0"
      },
      "iceUfrag": "o0PkNdIMDHBsocvf",
      "icePwd": "CZzpJTedzlWx6/jeqe1H7Tdq",
      "fingerprint": {
        "type": "sha-256",
        "hash": "C3:05:96:21:D4:58:25:AA:5F:BF:E1:3C:BE:2B:FB:7B:51:02:5D:72:83:9C:18:60:D9:38:BE:CD:18:99:24:19"
      },
      "setup": "actpass",
      "mid": "audio",
      "ext": [
        {
          "value": 1,
          "uri": "urn:ietf:params:rtp-hdrext:ssrc-audio-level"
        },
        {
          "value": 3,
          "uri": "http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time"
        }
      ],
      "direction": "sendrecv",
      "rtcpMux": "rtcp-mux",
      "maxptime": 60,
      "ssrcs": [
        {
          "id": 3328692482,
          "attribute": "cname",
          "value": "gmuy3UxoZJ8tfMEd"
        },
        {
          "id": 3328692482,
          "attribute": "msid",
          "value": "m6Cn38lGbk6RLBkjVnQ4w9iHDolie9SvwNeT 2a76a199-15c0-4957-9c50-8be3a8a093dc"
        },
        {
          "id": 3328692482,
          "attribute": "mslabel",
          "value": "m6Cn38lGbk6RLBkjVnQ4w9iHDolie9SvwNeT"
        },
        {
          "id": 3328692482,
          "attribute": "label",
          "value": "2a76a199-15c0-4957-9c50-8be3a8a093dc"
        }
      ],
      "candidates": [
        {
          "foundation": 3676977799,
          "component": 1,
          "transport": "udp",
          "priority": 2122260223,
          "ip": "192.168.100.130",
          "port": 53742,
          "type": "host",
          "generation": 0
        },
        {
          "foundation": 3676977799,
          "component": 2,
          "transport": "udp",
          "priority": 2122260222,
          "ip": "192.168.100.130",
          "port": 54067,
          "type": "host",
          "generation": 0
        },
        {
          "foundation": 2510931575,
          "component": 1,
          "transport": "tcp",
          "priority": 1518280447,
          "ip": "192.168.100.130",
          "port": 0,
          "type": "host"
        },
        {
          "foundation": 2510931575,
          "component": 2,
          "transport": "tcp",
          "priority": 1518280446,
          "ip": "192.168.100.130",
          "port": 0,
          "type": "host"
        },
        {
          "foundation": 3001054534,
          "component": 1,
          "transport": "udp",
          "priority": 1686052607,
          "ip": "190.255.39.202",
          "port": 53742,
          "type": "srflx",
          "raddr": "192.168.100.130",
          "rport": 53742,
          "generation": 0
        },
        {
          "foundation": 3001054534,
          "component": 2,
          "transport": "udp",
          "priority": 1686052606,
          "ip": "190.255.39.202",
          "port": 54067,
          "type": "srflx",
          "raddr": "192.168.100.130",
          "rport": 54067,
          "generation": 0
        },
        {
          "foundation": 3423060084,
          "component": 1,
          "transport": "udp",
          "priority": 41885439,
          "ip": "54.93.114.194",
          "port": 53814,
          "type": "relay",
          "raddr": "190.255.39.202",
          "rport": 53742,
          "generation": 0
        },
        {
          "foundation": 3423060084,
          "component": 2,
          "transport": "udp",
          "priority": 41885438,
          "ip": "54.93.114.194",
          "port": 54750,
          "type": "relay",
          "raddr": "190.255.39.202",
          "rport": 54067,
          "generation": 0
        },
        {
          "foundation": 3423060084,
          "component": 1,
          "transport": "udp",
          "priority": 25108223,
          "ip": "54.93.114.194",
          "port": 56474,
          "type": "relay",
          "raddr": "190.255.39.202",
          "rport": 58696,
          "generation": 0
        },
        {
          "foundation": 3423060084,
          "component": 2,
          "transport": "udp",
          "priority": 25108222,
          "ip": "54.93.114.194",
          "port": 53756,
          "type": "relay",
          "raddr": "190.255.39.202",
          "rport": 58697,
          "generation": 0
        }
      ]
    }
  ]
};

//console.log(new Sdp().compileSdp(sdp));
console.log(JSON.stringify(new Sdp().parseSdp(s)));
