# matrix-appservice-respoke

An incredibly hacky Matrix --> Asterisk bridge via chan_respoke.

The initial version of this is hacked from a (very) early version of matrix-appservice-verto,
before that bridge became all about conferencing.  The implementation is independent of any
existing documentation or code for respoke other than chan_respoke, mainly because it was
hacked together on VS27 which has no in-flight wifi.  Did I mention that it's hacky?

## Usage

### Installing
```
$ git clone git@github.com:matrix-org/matrix-appservice-respoke.git
$ cd matrix-appservice-respoke
$ npm install
```

### Registering
```
$ node app -r -u "http://appservice-url-here"
Generating registration to 'config/respoke-registration.yaml' for the AS accessible from: http://appservice-url-here
```
Add `respoke-registration.yaml` to Synapse's `homeserver.yaml` config file:
```
# homeserver.yaml
app_service_config_files: ["/path/to/matrix-appservice-respoke/config/respoke-registration.yaml"]
```

### Configuring
```
$ cp config/config.sample.yaml config/config.yaml
```

```yaml
# config/config.yaml
homeserver:
  url: http://localhost:8008
  domain: localhost
```

### Configuring Asterisk

Just set up chan_respoke as normal, but point chan_respoke at this bridge rather than api.respoke.io - e.g.
```
[transport_t](!)
uri=http://localhost:3000
```

### Limitations

 * There is *NO AUTH* of chan_respoke at all yet - the bridge ignores your app ID and secret ID
 * Calls are one-way from matrix to asterisk only
 * Matrix clients currently are considered as a single respoke endpoint
 * The code is a bodgy mess
 * It barely works at all

### Running
```
$ node app -c config/config.yaml
Loading config file /path/matrix-appservice-respoke/config/config.yaml
   info  - socket.io started
   Running bridge on port 8090
```

You can supply `-p PORT` to set a custom port for the appservice to listen on.
