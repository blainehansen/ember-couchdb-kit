chai = require('chai')
sinon = require('sinon')
sinonChai = require('sinon-chai')
expect = chai.expect

chai.use(sinonChai)

EmberCouchDBKitStub = {}

DBStub = {
  JSONSerializer: {
    extend: (o) -> o
  },

  Adapter: {
    extend: (o) -> o
  }
}

require("../src/attachment-adapter.coffee")(EmberCouchDBKitStub, DBStub)

describe "AttachmentSerializer", ->
  describe "API", ->
    it "has the expected API", ->
      expect(EmberCouchDBKitStub.AttachmentSerializer.materialize).to.exist
