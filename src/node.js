module.exports = {
  Server: require('./server'),
  Encoders: {
    Json: require('./common/encoders/json'),
    Protobuf: require('./common/encoders/protobuf'),
  }
}
